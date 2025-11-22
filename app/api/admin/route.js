import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

// 設定檔案路徑
const PROJECT_ROOT = process.cwd();
const NEWS_FILE = path.join(PROJECT_ROOT, 'public', 'data', 'news.json');

// 讀取新聞數據
export async function GET() {
  try {
    if (!fs.existsSync(NEWS_FILE)) {
      return NextResponse.json({ total: 0, categories: {}, news: [] });
    }
    const fileContent = fs.readFileSync(NEWS_FILE, 'utf8');
    const news = JSON.parse(fileContent);

    // 計算統計數據
    const categories = {};
    news.forEach(n => {
      categories[n.category_zh] = (categories[n.category_zh] || 0) + 1;
    });

    return NextResponse.json({ 
      total: news.length, 
      categories, 
      news 
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load data' }, { status: 500 });
  }
}

// 執行指令 (POST)
export async function POST(request) {
  const body = await request.json();
  const { action, id, pmid, category } = body;

  // --- 1. 刪除文章 ---
  if (action === 'delete') {
    try {
      const fileContent = fs.readFileSync(NEWS_FILE, 'utf8');
      let news = JSON.parse(fileContent);
      const newNews = news.filter(n => n.id !== id);
      fs.writeFileSync(NEWS_FILE, JSON.stringify(newNews, null, 2));
      return NextResponse.json({ success: true, message: `文章 ID ${id} 已刪除` });
    } catch (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  // --- 2. 執行腳本 (採集/發布/指定) ---
  let command = '';
  
  if (action === 'fetch_auto') {
    // 自動採集
    command = 'npm run news:fetch';
  } 
  else if (action === 'deploy') {
    // 發布網站 (Git Push)
    // 獲取日期
    const date = new Date().toLocaleDateString().replace(/\//g, '-');
    // 組合指令：加入 -> 提交 -> 推送
    command = `git add . && git commit -m "Dashboard Update: ${date}" && git push`;
  }
  else if (action === 'fetch_manual') {
    // 指定採集 (稍微複雜，我們直接呼叫 node script 並傳參數)
    // 我們需要修改 manual-fetch.js 讓它接受參數，或者這裡簡單處理：
    // 為了簡化，我們這裡暫時不支援透過網頁輸入 prompt 給 manual-fetch，
    // 但我們可以讓 manual-fetch.js 支援環境變數或參數。
    // *這裡我們先略過複雜的互動，建議手動採集還是用 .bat 最穩，或是需要改寫 manual-fetch*
    return NextResponse.json({ success: false, message: "指定採集請暫時使用桌面 .bat (網頁版需進階改造腳本)" });
  }

  if (command) {
    return new Promise((resolve) => {
      // 執行指令
      exec(command, { cwd: PROJECT_ROOT }, (error, stdout, stderr) => {
        if (error) {
          resolve(NextResponse.json({ success: false, error: error.message, details: stderr }));
        } else {
          resolve(NextResponse.json({ success: true, message: "執行成功", output: stdout }));
        }
      });
    });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}