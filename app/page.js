'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { BookOpen, Activity, Moon, Brain, ArrowRight, ExternalLink, Search, X } from 'lucide-react';
import newsData from '../public/data/news.json';

export default function Home() {
  const [news, setNews] = useState([]);
  const [filter, setFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState(''); // 新增：搜尋狀態

  useEffect(() => {
    setNews(newsData || []);
  }, []);

  const categories = [
    { name: 'All', icon: BookOpen, label: '最新快訊' },
    { name: 'Sleep Science', icon: Moon, label: '睡眠科學' },
    { name: 'Longevity', icon: Activity, label: '抗衰老' },
    { name: 'Mental Health', icon: Brain, label: '心理健康' },
  ];

  // 修改過濾邏輯：同時篩選「分類」和「關鍵字」
  const filteredNews = news.filter(item => {
    // 1. 篩選分類
    const matchesCategory = filter === 'All' || item.category === filter;
    
    // 2. 篩選關鍵字 (標題或摘要，不分大小寫)
    const query = searchQuery.toLowerCase();
    const matchesSearch = searchQuery === '' || 
      item.title_zh.toLowerCase().includes(query) || 
      item.summary.toLowerCase().includes(query);

    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div 
            className="flex items-center gap-2 text-med-600 font-bold text-xl cursor-pointer"
            onClick={() => {setFilter('All'); setSearchQuery('');}} // 點 Logo 重置
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

      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="md:w-2/3 space-y-6">
            
            {/* --- 修改：將標題與搜尋欄整合在一起 --- */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-800">
                  {categories.find(c => c.name === filter)?.label || '搜尋結果'}
                </h1>
                <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                  {filteredNews.length} 篇
                </span>
              </div>

              {/* 搜尋輸入框 */}
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

            {/* 手機版分類滑動選單 (新增) */}
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

            {/* 查無資料顯示 */}
            {filteredNews.length === 0 && (
              <div className="p-8 text-center text-slate-400 bg-white rounded-lg border border-dashed">
                {searchQuery ? '找不到符合的報導，試試其他關鍵字？' : '目前尚未生成新聞，請執行 "npm run news:fetch"'}
              </div>
            )}

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

          <div className="md:w-1/3 space-y-6">
             <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 sticky top-24">
                <div className="text-xs font-bold text-slate-400 uppercase mb-2 text-center">Sponsor</div>
                <div className="w-full h-64 bg-slate-100 rounded flex flex-col items-center justify-center text-slate-400 text-sm">
                   <span>廣告版位 (300x250)</span>
                   <span className="text-xs mt-1">推薦放置: 助眠產品 / 保健食品</span>
                </div>
             </div>
          </div>
        </div>
      </main>
    </div>
  );
}