const fs = require('fs');
const path = require('path');
const readline = require('readline');

const PROJECT_ROOT = path.join(__dirname, '..');
const NEWS_FILE = path.join(PROJECT_ROOT, 'public', 'data', 'news.json');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function deleteNews() {
    let news = [];
    try {
        if (fs.existsSync(NEWS_FILE)) {
            news = JSON.parse(fs.readFileSync(NEWS_FILE, 'utf8'));
        }
    } catch (e) {
        console.log("❌ 無法讀取新聞資料庫。");
        process.exit(1);
    }

    console.log(`\n📊 目前資料庫共有 ${news.length} 篇新聞。`);
    console.log("------------------------------------------------");
    
    rl.question('🗑️ 請輸入要刪除的文章 ID (請看網站該文章網址最後的數字): ', (id) => {
        const targetId = id.trim();
        const initialLength = news.length;
        const newNews = news.filter(n => n.id !== targetId);

        if (newNews.length === initialLength) {
            console.log(`\n⚠️ 找不到 ID 為 "${targetId}" 的文章，請確認輸入正確。`);
        } else {
            // 找到被刪除的文章標題，顯示出來讓你知道刪了誰
            const deletedItem = news.find(n => n.id === targetId);
            console.log(`\n✅ 已刪除: [${deletedItem.category_zh}] ${deletedItem.title_zh}`);
            
            fs.writeFileSync(NEWS_FILE, JSON.stringify(newNews, null, 2));
            console.log(`💾 資料庫已更新，剩餘 ${newNews.length} 篇。`);
            console.log(`\n💡 提醒：記得執行「發布網站」按鈕，刪除才會在雲端生效喔！`);
        }
        rl.close();
    });
}

deleteNews();