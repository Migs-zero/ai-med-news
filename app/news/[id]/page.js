'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Globe, ShieldAlert } from 'lucide-react';
import ReactMarkdown from 'react-markdown'; // 引入 Markdown 解析器
import newsData from '../../../public/data/news.json';

export default function ArticlePage({ params }) {
  const [article, setArticle] = useState(null);
  const [lang, setLang] = useState('zh'); 

  useEffect(() => {
    if (newsData) {
      const found = newsData.find(n => n.id === params.id);
      setArticle(found);
    }
  }, [params.id]);

  if (!article) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link href="/" className="inline-flex items-center text-slate-500 hover:text-med-600 mb-8 transition">
          <ArrowLeft size={16} className="mr-1"/> 返回首頁
        </Link>

        <div className="mb-6">
          <span className="text-med-600 text-sm font-bold tracking-wider uppercase">{article.category}</span>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mt-2 mb-4 leading-tight">
            {lang === 'zh' ? article.title_zh : article.title_en}
          </h1>
          <div className="flex items-center justify-between text-sm text-slate-500 border-b pb-6">
            <span>{new Date(article.created_at).toLocaleDateString()}</span>
            <button 
              onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
              className="flex items-center gap-1 bg-slate-100 px-3 py-1 rounded-full hover:bg-slate-200 transition text-slate-700"
            >
              <Globe size={14}/> {lang === 'zh' ? 'Switch to English' : '切換至中文'}
            </button>
          </div>
        </div>

        {/* 使用 ReactMarkdown 渲染內容，配合 prose 樣式美化 */}
        <article className="prose prose-slate lg:prose-lg max-w-none prose-headings:text-slate-800 prose-p:text-slate-700 prose-a:text-med-600 hover:prose-a:text-med-500">
            <ReactMarkdown>
                {lang === 'zh' ? article.content_zh : article.content_en}
            </ReactMarkdown>
        </article>

        <div className="mt-12 p-6 bg-slate-50 rounded-xl border border-slate-100">
          <h3 className="text-sm font-bold text-slate-900 mb-2">Reference Source</h3>
          <p className="text-sm text-slate-600 italic mb-2">{article.source.journal}, {article.source.year}</p>
          <a href={article.source.url} target="_blank" className="text-xs text-med-600 hover:underline break-all">
            {article.source.url}
          </a>
        </div>

        <div className="mt-6 flex gap-3 p-4 bg-amber-50 text-amber-800 rounded-lg text-sm items-start">
           <ShieldAlert size={20} className="shrink-0 mt-0.5"/>
           <div>
             <strong>免責聲明：</strong> 本文由 AI 輔助彙整最新醫學文獻，僅供科普參考，並非醫療建議。如有身體不適，請務必諮詢專業醫師。
           </div>
        </div>

      </div>
    </div>
  );
}