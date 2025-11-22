const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { GoogleGenerativeAI } = require("@google/generative-ai");
const https = require('https');
const xml2js = require('xml2js');

// --- 設定 ---
// ⚠️⚠️⚠️ 請再次填入你的 API Key ⚠️⚠️⚠️
const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
    console.error("❌ 錯誤: 找不到 API Key。請確認 .env 檔案已建立並填入 GEMINI_API_KEY");
    process.exit(1);
}
const PROJECT_ROOT = path.join(__dirname, '..'); 
const DATA_DIR = path.join(PROJECT_ROOT, 'public', 'data');
const NEWS_FILE = path.join(DATA_DIR, 'news.json');

// 關鍵字策略 (維持放寬模式，確保找得到文章)
const TOPICS = [
    { term: 'sleep disorder therapy', category: 'Sleep Science', category_zh: '睡眠科學' },
    { term: 'longevity aging', category: 'Longevity', category_zh: '抗衰老' },
    { term: 'anxiety depression', category: 'Mental Health', category_zh: '心理健康' }
];

const genAI = new GoogleGenerativeAI(API_KEY);

// 工具：簡易 Fetch
function fetchUrl(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', (err) => reject(err));
    });
}

async function parseXml(xml) {
    const parser = new xml2js.Parser();
    return parser.parseStringPromise(xml);
}

// 1. 從 PubMed 抓取 ID (搜尋範圍：最近1年)
async function fetchPubMedIds(term) {
    const baseUrl = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi';
    const encodedTerm = encodeURIComponent(`${term} AND "last 1 year"[dp]`);
    // 抓 10 篇候選
    const query = `db=pubmed&term=${encodedTerm}&retmax=10&sort=date`;
    
    const xml = await fetchUrl(`${baseUrl}?${query}`);
    const result = await parseXml(xml);
    return result.eSearchResult.IdList?.[0]?.Id || [];
}

// 2. 從 PubMed 抓取摘要
async function fetchPaperDetails(id) {
    const baseUrl = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi';
    const query = `db=pubmed&id=${id}&retmode=xml`;
    const xml = await fetchUrl(`${baseUrl}?${query}`);
    const result = await parseXml(xml);
    
    try {
        const article = result.PubmedArticleSet.PubmedArticle[0].MedlineCitation[0].Article[0];
        const title = article.ArticleTitle[0];
        
        let abstractText = "No abstract available.";
        if (article.Abstract && article.Abstract[0].AbstractText) {
            const abs = article.Abstract[0].AbstractText;
            abstractText = Array.isArray(abs) ? abs.map(t => t._ || t).join(' ') : (abs._ || abs);
        }

        const date = article.Journal[0].JournalIssue[0].PubDate[0].Year[0];
        const journal = article.Journal[0].Title[0];
        return { id, title, abstract: abstractText, date, journal };
    } catch (e) {
        console.error(`Error parsing paper ${id}`, e);
        return null;
    }
}

// 3. 呼叫 Gemini 寫新聞 (精準控字版)
async function writeNews(paper, categoryInfo) {
    console.log(`🤖 AI 正在撰寫 (目標 600-800字): ${paper.title.substring(0, 30)}...`);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" }); 

    const prompt = `
    你是一位專業的醫學新聞記者。請將以下論文摘要改寫為新聞報導。
    
    【論文資訊】
    標題: ${paper.title}
    摘要: ${paper.abstract}
    
    【寫作嚴格規範】
    1. **字數限制**：正文長度必須嚴格控制在 **600 至 800 字 (繁體中文)** 之間。不要低於 600，也**絕對不要**超過 900 字。
    2. **寫作風格**：精簡、直接、不囉唆。每一句話都要有資訊量，避免重複闡述同一個觀點。
    3. **段落分配 (參考)**：
       - **引言 (約 100 字)**：直接切入痛點，為什麼讀者要在乎？
       - **背景與原理 (約 150 字)**：用比喻解釋機制，不要長篇大論。
       - **研究發現 (約 250 字)**：數據與實驗結果的核心。
       - **結論與建議 (約 150 字)**：對生活的實際應用。

    【輸出要求】
    回傳 **JSON** 格式，不要 markdown。
    {
        "title_zh": "繁體中文標題 (新聞感)",
        "title_en": "English Headline",
        "summary": "50字以內的精簡摘要",
        "key_points": ["重點1", "重點2", "重點3"],
        "content_zh": "中文正文 (600-800字，使用 markdown 分段)",
        "content_en": "English Body Text (Same length constraint)",
        "disclaimer": "本報導僅供參考，非醫療建議。",
        "image_prompt": "medical illustration style, minimalist, (英文關鍵字)"
    }
    `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(text);
    } catch (e) {
        console.error("AI Generation Error:", e);
        return null;
    }
}

// --- 主程式 ---
async function main() {
    if (!API_KEY || API_KEY.includes("填在這裡")) {
        console.error("❌ 錯誤: 請在 scripts/ai-reporter.js 第 9 行填入你的 Gemini API Key");
        process.exit(1);
    }

    let existingNews = [];
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(NEWS_FILE)) {
        try {
            const fileContent = fs.readFileSync(NEWS_FILE, 'utf8');
            existingNews = fileContent ? JSON.parse(fileContent) : [];
        } catch (e) {
            existingNews = [];
        }
    }

    console.log("🔍 開始搜尋 (精準控字模式)...");

    for (const topic of TOPICS) {
        console.log(`\n📂 分類: ${topic.category} (${topic.term})`);
        try {
            const ids = await fetchPubMedIds(topic.term);
            console.log(`Found ${ids.length} papers.`);

            let fetchedCount = 0;

            for (const id of ids) {
                // 每個分類最多寫 2 篇新文章，避免跑太久
                if (fetchedCount >= 2) break; 

                if (existingNews.find(n => n.pubmed_id === id)) {
                    console.log(`⏭️  Paper ${id} already exists. Skipping.`);
                    continue;
                }

                const paper = await fetchPaperDetails(id);
                if (!paper) continue;

                const aiContent = await writeNews(paper, topic);
                if (aiContent) {
                    const newsItem = {
                        id: Date.now().toString(),
                        pubmed_id: id,
                        ...aiContent,
                        category: topic.category,
                        category_zh: topic.category_zh,
                        source: {
                            journal: paper.journal,
                            year: paper.date,
                            url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`
                        },
                        created_at: new Date().toISOString()
                    };

                    existingNews.unshift(newsItem);
                    fs.writeFileSync(NEWS_FILE, JSON.stringify(existingNews, null, 2));
                    console.log(`✅ 新聞已發布 (600-800字): ${aiContent.title_zh}`);
                    fetchedCount++;
                    
                    await new Promise(r => setTimeout(r, 2000)); 
                }
            }
        } catch (error) {
            console.error(`❌ Error processing topic ${topic.term}:`, error.message);
        }
    }
    console.log("\n🎉 採集完成！");
}

main();