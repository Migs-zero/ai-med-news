// ==========================================
// 每日新聞自動採集腳本 (雙軌核心引擎版)
// 功能：整合 PubMed (最新) 與 Semantic Scholar (最熱) -> 資料去重 -> AI 總編篩選 -> AI 記者撰寫 -> 存檔
// ==========================================
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { GoogleGenerativeAI } = require("@google/generative-ai");
const https = require('https');
const xml2js = require('xml2js');

// --- 設定檢查 ---
const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
    console.error("❌ 錯誤: 找不到 API Key。請確認 .env 檔案已建立並填入 GEMINI_API_KEY");
    process.exit(1);
}

const PROJECT_ROOT = path.join(__dirname, '..');
const NEWS_FILE = path.join(PROJECT_ROOT, 'public', 'data', 'news.json');
const genAI = new GoogleGenerativeAI(API_KEY);

// --- 工具函數：通用 HTTPS GET (回傳 JSON) ---
function fetchJson(url) {
    return new Promise((resolve, reject) => {
        https.get(url, { headers: { 'User-Agent': 'AI-MedNews-Bot/1.0' } }, (res) => {
            let data = '';
            res.on('data', (c) => data += c);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
            });
        }).on('error', reject);
    });
}

// --- 工具函數：通用 HTTPS GET (回傳純文字/XML) ---
function fetchText(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', (c) => data += c);
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
}

async function parseXml(xml) {
    const parser = new xml2js.Parser();
    return parser.parseStringPromise(xml);
}

// --- 資料源 A：PubMed (鎖定最新鮮) ---
async function getPapersFromPubMed() {
    console.log("🔍 [PubMed] 正在掃描最近 5 天發表的文獻...");
    try {
        const searchUrl = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term="last 5 days"[dp]+AND+hasabstract[text]&retmax=20&sort=date&retmode=json';
        const searchData = await fetchJson(searchUrl);
        const ids = searchData.esearchresult.idlist;

        if (!ids || ids.length === 0) return [];

        const fetchBaseUrl = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi';
        const fetchQuery = `db=pubmed&id=${ids.join(',')}&retmode=xml`;
        const result = await parseXml(await fetchText(`${fetchBaseUrl}?${fetchQuery}`));
        
        const papers = [];
        const articles = result.PubmedArticleSet.PubmedArticle;
        for (const article of articles) {
            try {
                const medline = article.MedlineCitation[0].Article[0];
                const pmid = article.MedlineCitation[0].PMID[0]._;
                // 嘗試找出 DOI
                let doi = null;
                if (article.PubmedData && article.PubmedData[0].ArticleIdList) {
                    const doiObj = article.PubmedData[0].ArticleIdList[0].ArticleId.find(id => id.$.IdType === 'doi');
                    if (doiObj) doi = doiObj._;
                }

                const title = medline.ArticleTitle[0];
                let abstractText = "";
                if (medline.Abstract && medline.Abstract[0].AbstractText) {
                    const abs = medline.Abstract[0].AbstractText;
                    abstractText = Array.isArray(abs) ? abs.map(t => t._ || t).join(' ') : (abs._ || abs);
                }

                if (abstractText.length > 200) {
                    // 標準化資料結構
                    papers.push({
                        source: 'PubMed',
                        id: pmid, // 這裡暫用 PMID 當內部 ID
                        pmid: pmid,
                        doi: doi,
                        title: title,
                        abstract: abstractText,
                        citations: 'N/A', // PubMed API 不提供引用數
                        year: new Date().getFullYear().toString(),
                        url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`
                    });
                }
            } catch (e) { /* 忽略解析錯誤 */ }
        }
        console.log(`✅ [PubMed] 取得 ${papers.length} 篇候選文章。`);
        return papers;
    } catch (error) {
        console.error("❌ [PubMed] API Error:", error.message);
        return [];
    }
}

// --- 資料源 B：Semantic Scholar (鎖定高影響力) ---
async function getPapersFromSemanticScholar() {
    console.log("🔍 [Semantic Scholar] 正在掃描過去一年高引用文獻...");
    try {
        // 搜尋醫學、生物學領域，過去一年，按引用數排序的高影響力論文
        const query = "medicine biology health longevity neuroscience";
        const fields = "paperId,title,abstract,year,citationCount,externalIds,url,journal";
        const apiUrl = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&fields=${fields}&sort=citationCount:desc&limit=20&publicationDateOrYear=past-1-year`;

        const data = await fetchJson(apiUrl);
        if (!data.data) return [];

        const papers = data.data.map(p => ({
            source: 'Semantic Scholar',
            id: p.paperId,
            pmid: p.externalIds?.PubMed || null,
            doi: p.externalIds?.DOI || null,
            title: p.title,
            abstract: p.abstract || "",
            citations: p.citationCount || 0,
            year: p.year ? p.year.toString() : new Date().getFullYear().toString(),
            url: p.url || (p.externalIds?.DOI ? `https://doi.org/${p.externalIds.DOI}` : null)
        })).filter(p => p.abstract && p.abstract.length > 200); // 過濾沒摘要或摘要太短的

        console.log(`✅ [Semantic Scholar] 取得 ${papers.length} 篇高引用候選文章。`);
        return papers;
    } catch (error) {
        console.error("❌ [Semantic Scholar] API Error (可能是速率限制):", error.message);
        return [];
    }
}

// --- 階段二：AI 總編選題 (升級版：考量引用影響力) ---
async function selectInterestingPapers(papers) {
    console.log(`\n🤖 AI 總編輯正在審閱 ${papers.length} 篇來自不同來源的摘要，挑選最吸睛的主題...`);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `
    你是一位頂尖的科普網站總編輯，你的目標是找出能引爆網路討論的醫學新知。
    請從以下論文候選清單中，挑選出【最有趣、最貼近生活、最具話題性】的 3 篇。

    【資料來源說明】
    清單中包含了來自 PubMed (最新發表) 和 Semantic Scholar (高引用/高影響力) 的論文。
    **請特別留意那些「引用次數 (Citations)」較高的論文，這代表它們在學界已經引起重視，通常更具報導價值。**

    【篩選標準 (黃金法則)】
    1. **生活關聯性 (High)**：解決讀者痛點 (睡眠、抗老、情緒、飲食)。
    2. **影響力與新奇性**：優先考慮高引用數的重磅發現，或是顛覆常識的新觀點。
    3. **避開**：過於艱深、純機制研究的主題。

    【論文候選清單】
    ${papers.map((p, index) => `[編號: ${index}] [來源: ${p.source}] [引用數: ${p.citations}] Title: ${p.title}\nAbstract: ${p.abstract.substring(0, 300)}...`).join('\n\n')}

    請嚴格遵守標準，只回傳最符合的 3 篇論文的「編號」的 JSON 陣列格式，例如：[0, 5, 12]。不要有其他文字。
    `;

    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        const selectedIndices = JSON.parse(text);
        console.log(`✅ AI 選定了 ${selectedIndices.length} 篇熱門潛力文章。`);
        // 根據 AI 回傳的索引編號找出對應的論文物件
        return selectedIndices.map(index => papers[index]).filter(p => p);
    } catch (e) {
        console.error("AI 選題失敗:", e);
        return papers.slice(0, 3); // 備案
    }
}

// --- 階段三：AI 記者寫作 (維持不變，已是暢銷作家模式) ---
async function writeNewsReport(paper) {
    console.log(`✍️ 正在撰寫報導 [來源: ${paper.source}]: ${paper.title.substring(0, 30)}...`);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `
    你是一位擅長將複雜醫學研究轉化為引人入勝故事的科普作家。請根據以下論文資訊，撰寫一篇精彩的新聞報導。

    【論文資訊】
    來源: ${paper.source}
    引用次數: ${paper.citations}
    標題: ${paper.title}
    摘要: ${paper.abstract}

    【寫作要求 (黃金法則)】
    1. **標題 (title_zh)**：拒絕學術腔！要吸睛，使用問句、強烈對比或點出驚人發現。
    2. **摘要 (summary)**：2-3 句話簡述核心，像電影預告片。
    3. **重點整理 (key_points)**：3-4 個實用結論 bullet points。
    4. **內文 (content_zh)**：
       - 結構：生活痛點切入 -> 研究發現 -> 核心結論 -> 未來展望。
       - 語氣：專業但親切。
       - **【關鍵要求】使用粗體強調**：務必在內文使用 Markdown 粗體 (**文字**) 標示重點。
    5. **分類**：從 [Sleep Science/睡眠科學, Longevity/抗衰老, Mental Health/心理健康, General/綜合醫學] 中選一個。

    請回傳嚴格的 JSON 格式，包含：title_zh, summary, key_points (陣列), content_zh (Markdown), category, category_zh, disclaimer。
    `;

    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(text);
    } catch (e) {
        console.error(`❌ 報導撰寫失敗:`, e.message);
        return null;
    }
}

// --- 主流程 ---
async function main() {
    console.log("🚀 每日醫學新聞採集任務開始 (雙軌引擎啟動)...");
    
    // 1. 讀取現有新聞 (用於去重)
    let existingNews = [];
    if (fs.existsSync(NEWS_FILE)) {
        existingNews = JSON.parse(fs.readFileSync(NEWS_FILE, 'utf8'));
    }
    // 建立已存在論文的快速查找表 (用 PMID 和 DOI)
    const existingMap = new Set();
    existingNews.forEach(n => {
        if (n.pubmed_id) existingMap.add(`pmid:${n.pubmed_id}`);
        if (n.doi) existingMap.add(`doi:${n.doi}`);
    });

    // 2. 平行抓取兩個來源的資料
    const [pubmedPapers, s2Papers] = await Promise.all([
        getPapersFromPubMed(),
        getPapersFromSemanticScholar()
    ]);

    // 3. 資料合併與去重
    console.log("🔄 正在合併資料並去除重複...");
    const combinedPapers = [...pubmedPapers, ...s2Papers];
    const uniqueMap = new Map();
    
    for (const p of combinedPapers) {
        // 產生唯一鍵值：優先用 DOI，沒有就用 PMID，再沒有就用標題簡化版
        let key = p.doi ? `doi:${p.doi}` : (p.pmid ? `pmid:${p.pmid}` : `title:${p.title.toLowerCase().replace(/[^a-z0-9]/g, '')}`);
        
        // 如果資料庫已經有了，就跳過
        if (existingMap.has(key)) continue;

        if (!uniqueMap.has(key)) {
            uniqueMap.set(key, p);
        } else {
            // 如果重複，優先保留 Semantic Scholar 的版本 (因為有引用數資料)
            if (p.source === 'Semantic Scholar') {
                uniqueMap.set(key, p);
            }
        }
    }
    
    const freshCandidates = Array.from(uniqueMap.values());

    if (freshCandidates.length === 0) {
        console.log("😴 沒有新的論文需要處理。");
        return;
    }
    console.log(`📄 經去重後，共有 ${freshCandidates.length} 篇候選文章進入決選名單。`);

    // 4. AI 總編選題
    const selectedPapers = await selectInterestingPapers(freshCandidates);

    // 5. AI 記者寫作並存檔
    let newCount = 0;
    for (const paper of selectedPapers) {
        const aiContent = await writeNewsReport(paper);
        if (aiContent) {
            const newsItem = {
                id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                pubmed_id: paper.pmid, // 可能為 null
                doi: paper.doi,       // 可能為 null
                ...aiContent,
                source: { 
                    journal: paper.source === 'PubMed' ? "PubMed Indexed Journal" : "Semantic Scholar Indexed", 
                    year: paper.year, 
                    url: paper.url || `https://pubmed.ncbi.nlm.nih.gov/${paper.pmid}/`
                },
                created_at: new Date().toISOString()
            };
            existingNews.unshift(newsItem);
            newCount++;
            await new Promise(r => setTimeout(r, 2000)); // 避免 API速率限制
        }
    }

    // 6. 寫入資料庫
    if (newCount > 0) {
        const finalNews = existingNews.slice(0, 50);
        fs.writeFileSync(NEWS_FILE, JSON.stringify(finalNews, null, 2));
        console.log(`\n🎉 任務完成！成功從雙軌來源新增 ${newCount} 篇精彩報導。`);
        console.log(`💡 提醒：請執行發布操作將新內容推送到雲端。`);
    } else {
        console.log("\n⚠️ 任務結束，但沒有新增任何報導。");
    }
}

main();