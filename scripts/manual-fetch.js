const fs = require('fs');
const path = require('path');
const readline = require('readline');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { GoogleGenerativeAI } = require("@google/generative-ai");
const https = require('https');
const xml2js = require('xml2js');

// --- 設定 ---
// ⚠️⚠️⚠️ 請填入你的 API Key ⚠️⚠️⚠️
const API_KEY = process.env.GEMINI_API_KEY; 

if (!API_KEY) {
    console.error("❌ 錯誤: 找不到 API Key。請確認 .env 檔案已建立並填入 GEMINI_API_KEY");
    process.exit(1);
}

const PROJECT_ROOT = path.join(__dirname, '..');
const NEWS_FILE = path.join(PROJECT_ROOT, 'public', 'data', 'news.json');

const genAI = new GoogleGenerativeAI(API_KEY);
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

// 工具函數 (與主程式相同)
function fetchUrl(url) {
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

async function fetchPaperDetails(id) {
    const baseUrl = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi';
    const query = `db=pubmed&id=${id}&retmode=xml`;
    const result = await parseXml(await fetchUrl(`${baseUrl}?${query}`));
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
    } catch (e) { return null; }
}

async function writeNews(paper, categoryInfo) {
    console.log(`\n🤖 AI 正在為您撰寫專題報導: ${paper.title.substring(0, 30)}...`);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" }); 
    const prompt = `
    你是一位專業醫學記者。請針對這篇指定的論文撰寫新聞報導。
    標題: ${paper.title}
    摘要: ${paper.abstract}
    分類: ${categoryInfo.category_zh}
    【要求】
    1. 字數 600-800 字 (繁體中文)。
    2. 結構：引言、背景、發現、結論。
    3. 語氣：專業但易懂。
    4. 回傳 JSON 格式，包含 title_zh, title_en, summary, key_points, content_zh, content_en, disclaimer, image_prompt。
    5. 不要 markdown 標記。
    `;
    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(text);
    } catch (e) { console.error("AI Error:", e); return null; }
}

async function main() {
    console.log("🕵️  歡迎使用「指定論文」特派員系統");
    
    rl.question('\n👉 請輸入論文的 PubMed ID (例如 38294512): ', async (pmid) => {
        const id = pmid.trim();
        if (!id) { console.log("❌ ID 不能為空"); process.exit(0); }

        console.log(`\n🔍 正在查詢論文 ID: ${id}...`);
        const paper = await fetchPaperDetails(id);
        
        if (!paper) {
            console.log("❌ 找不到該論文，請確認 PubMed ID 正確。");
            process.exit(0);
        }
        console.log(`✅ 找到論文: ${paper.title}`);

        console.log("\n請選擇這篇新聞的分類：");
        console.log("1. 睡眠科學 (Sleep Science)");
        console.log("2. 抗衰老 (Longevity)");
        console.log("3. 心理健康 (Mental Health)");
        console.log("4. 其他/綜合 (General)");
        
        rl.question('👉 請輸入選項 (1-4): ', async (opt) => {
            let cat = { term: '', category: 'General', category_zh: '綜合醫學' };
            if (opt === '1') cat = { category: 'Sleep Science', category_zh: '睡眠科學' };
            if (opt === '2') cat = { category: 'Longevity', category_zh: '抗衰老' };
            if (opt === '3') cat = { category: 'Mental Health', category_zh: '心理健康' };

            const aiContent = await writeNews(paper, cat);
            
            if (aiContent) {
                let existingNews = [];
                if (fs.existsSync(NEWS_FILE)) existingNews = JSON.parse(fs.readFileSync(NEWS_FILE, 'utf8'));
                
                const newsItem = {
                    id: Date.now().toString(),
                    pubmed_id: id,
                    ...aiContent,
                    category: cat.category,
                    category_zh: cat.category_zh,
                    source: { journal: paper.journal, year: paper.date, url: `https://pubmed.ncbi.nlm.nih.gov/${id}/` },
                    created_at: new Date().toISOString()
                };

                existingNews.unshift(newsItem);
                fs.writeFileSync(NEWS_FILE, JSON.stringify(existingNews, null, 2));
                console.log(`\n🎉 報導已完成並加入資料庫！標題：${aiContent.title_zh}`);
            } else {
                console.log("❌ AI 寫作失敗，請稍後再試。");
            }
            rl.close();
        });
    });
}

main();