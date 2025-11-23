'use client';
import { useState, useEffect } from 'react';
import { BookOpen, Activity, Moon, Brain, ArrowRight, ExternalLink, Search, X, Stethoscope } from 'lucide-react';


 import Link from 'next/link';

 import newsData from '../public/data/news.json';



// --- 新增：Google AdSense 廣告組件 ---
const AdBanner = () => {
  useEffect(() => {
    try {
      // 嘗試推送廣告請求 (這會讓 Google 知道這裡有空位要填)
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (err) {
      console.error("AdSense load error:", err);
    }
  }, []);

  return (
    <div className="flex justify-center my-4 overflow-hidden rounded-lg">
      {/* Google 廣告代碼 (300x250) */}
      <ins className="adsbygoogle"
           style={{ display: 'inline-block', width: '300px', height: '250px' }}
           data-ad-client="ca-pub-8019615509879896" // 你的發布商 ID (已填好)
           data-ad-slot="請填入你在AdSense申請的廣告插槽編號" // <--- ⚠️ 這裡請填入你的 Slot ID
      ></ins>
    </div>
  );
};

export default function Home() {
  const [news, setNews] = useState([]);
  const [filter, setFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setNews(newsData || []);
  }, []);

  const categories = [
    { name: 'All', icon: BookOpen, label: '最新快訊' },
    { name: 'Sleep Science', icon: Moon, label: '睡眠科學' },
    { name: 'Longevity', icon: Activity, label: '抗衰老' },
    { name: 'Mental Health', icon: Brain, label: '心理健康' },
    { name: 'General', icon: Stethoscope, label: '綜合醫學' },
  ];

  const filteredNews = news.filter(item => {
    const matchesCategory = filter === 'All' || item.category === filter;
    const query = searchQuery.toLowerCase();
    const matchesSearch = searchQuery === '' || 
      item.title_zh.toLowerCase().includes(query) || 
      item.summary.toLowerCase().includes(query);

    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 頂部導覽列 */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div 
            className="flex items-center gap-2 text-med-600 font-bold text-xl cursor-pointer"
            onClick={() => {setFilter('All'); setSearchQuery('');}}
          >
            <Activity />
            <span>AI MedNews</span>
          </div>
          <nav className="hidden md:flex gap-6 text-sm font-medium text-slate-600">
            {categories.map(c => (
              <button 
                key={c.name}
                onClick={() => setFilter(c.name)}
                className={`hover:text-med-600 transition ${filter === c.name ? 'text-med-600' : ''}`}
              >
                {c.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* 主要內容區 */}
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-8">
          
          {/* 左側：新聞列表區 */}
          <div className="md:w-2/3 space-y-6">
            
            {/* 搜尋與標題區 */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-800">
                  {categories.find(c => c.name === filter)?.label || '搜尋結果'}
                </h1>
                <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                  {filteredNews.length} 篇
                </span>
              </div>

              <div className="relative w-full sm:w-64 group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-med-500 transition" size={18} />
                <input 
                    type="text" 
                    placeholder="搜尋關鍵字..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-8 py-2 bg-slate-50 border-none rounded-full text-sm focus:ring-2 focus:ring-med-500 transition outline-none placeholder:text-slate-400"
                />
                {searchQuery && (
                    <button 
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                        <X size={14} />
                    </button>
                )}
              </div>
            </div>

            {/* 手機版分類選單 */}
            <div className="md:hidden flex gap-2 overflow-x-auto pb-2">
                {categories.map(c => (
                  <button 
                    key={c.name}
                    onClick={() => setFilter(c.name)}
                    className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap border transition ${filter === c.name ? 'bg-med-600 text-white border-med-600' : 'bg-white text-slate-600 border-slate-200'}`}
                  >
                    {c.label}
                  </button>
                ))}
            </div>

            {/* 查無資料狀態 */}
            {filteredNews.length === 0 && (
              <div className="p-8 text-center text-slate-400 bg-white rounded-lg border border-dashed">
                {searchQuery ? '找不到符合的報導，試試其他關鍵字？' : '目前尚未生成新聞，請執行 "npm run news:fetch"'}
              </div>
            )}

            {/* 文章列表 */}
            {filteredNews.map((item) => (
              <article key={item.id} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition duration-300">
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-2 py-1 bg-med-50 text-med-600 text-xs font-bold rounded uppercase tracking-wider">
                      {item.category_zh}
                    </span>
                    <span className="text-xs text-slate-400">{new Date(item.created_at).toLocaleDateString()}</span>
                  </div>
                  
                  <Link href={`/news/${item.id}`} className="group">
                    <h2 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-med-600 transition">
                      {item.title_zh}
                    </h2>
                  </Link>
                  <p className="text-slate-600 text-sm mb-4 leading-relaxed">
                    {item.summary}
                  </p>
                  
                  <div className="bg-slate-50 p-3 rounded-lg mb-4">
                    <ul className="space-y-1">
                      {item.key_points.map((kp, i) => (
                        <li key={i} className="text-xs text-slate-700 flex items-start gap-2">
                          <span className="text-med-500 mt-0.5">•</span> {kp}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                     <Link href={`/news/${item.id}`} className="text-sm font-bold text-med-600 flex items-center gap-1 hover:gap-2 transition-all">
                       閱讀完整報導 <ArrowRight size={16}/>
                     </Link>
                     <a href={item.source.url} target="_blank" rel="noreferrer" className="text-xs text-slate-400 flex items-center gap-1 hover:text-med-600">
                       原始論文 <ExternalLink size={12}/>
                     </a>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {/* 右側欄：網站介紹 + 廣告 */}
          <div className="md:w-1/3 space-y-6">
             {/* 網站介紹卡片 */}
             <div className="bg-gradient-to-br from-med-600 to-med-800 p-6 rounded-xl shadow-lg text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                <h3 className="font-bold text-lg mb-2 flex items-center gap-2 relative z-10">
                    <Brain size={20} /> 關於本站
                </h3>
                <p className="text-med-50 text-sm leading-relaxed relative z-10">
                    本站由 AI 全自動驅動，每日掃描 PubMed 最新醫學文獻，並轉譯為通俗易懂的科普新聞。
                </p>
             </div>

             {/* 廣告區域 (這裡我們放入了 AdBanner) */}
             <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 sticky top-24">
                <div className="text-xs font-bold text-slate-400 uppercase mb-2 text-center tracking-widest">Sponsor</div>
                
                {/* 👇 廣告組件在這裡 👇 */}
                <AdBanner />
                
             </div>
          </div>

        </div>
      </main>
    </div>
  );
}