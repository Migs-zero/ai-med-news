'use client';
import { useState, useEffect } from 'react';
import { Activity, RefreshCw, Trash2, UploadCloud, Terminal, BarChart3, ShieldAlert, Play } from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ total: 0, categories: {}, news: [] });
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]); // 顯示執行結果
  const [isAuth, setIsAuth] = useState(false); // 簡單的登入檢查
  const [password, setPassword] = useState('');

  // 載入數據
  const fetchStats = async () => {
    const res = await fetch('/api/admin');
    const data = await res.json();
    setStats(data);
  };

  useEffect(() => {
    if (isAuth) fetchStats();
  }, [isAuth]);

  // 執行動作
  const handleAction = async (action, payload = {}) => {
    setLoading(true);
    addLog(`🚀 開始執行: ${action}...`);
    
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...payload }),
      });
      const data = await res.json();
      
      if (data.success) {
        addLog(`✅ 成功: ${data.message}`);
        if (data.output) addLog(data.output); // 顯示終端機輸出
        fetchStats(); // 重新整理數據
      } else {
        addLog(`❌ 錯誤: ${data.error || data.message}`);
        if (data.details) addLog(data.details);
      }
    } catch (e) {
      addLog(`❌ 系統錯誤: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const addLog = (msg) => {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [`[${time}] ${msg}`, ...prev]);
  };

  // 簡單登入介面
  if (!isAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="bg-slate-800 p-8 rounded-xl shadow-2xl border border-slate-700 w-96">
          <div className="flex justify-center mb-6 text-med-500"><ShieldAlert size={48}/></div>
          <h1 className="text-2xl font-bold text-center mb-4">戰情室登入</h1>
          <input 
            type="password" 
            placeholder="輸入權限密碼 (預設1234)"
            className="w-full p-3 rounded bg-slate-900 border border-slate-600 mb-4 text-center tracking-widest"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button 
            onClick={() => password === '1234' ? setIsAuth(true) : alert('密碼錯誤')}
            className="w-full bg-blue-600 hover:bg-blue-500 py-3 rounded font-bold transition"
          >
            解鎖系統
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans flex">
      
      {/* 左側側邊欄 */}
      <aside className="w-64 bg-slate-900 text-white p-6 flex flex-col hidden md:flex">
        <div className="flex items-center gap-2 text-2xl font-bold mb-10 text-blue-400">
          <Activity /> AI MedNews
        </div>
        <nav className="space-y-4 flex-1">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Dashboard</div>
          <button className="flex items-center gap-3 w-full p-3 bg-slate-800 rounded text-blue-300"><BarChart3 size={18}/> 總覽數據</button>
          <a href="/" target="_blank" className="flex items-center gap-3 w-full p-3 hover:bg-slate-800 rounded text-slate-400 transition"><UploadCloud size={18}/> 前往網站</a>
        </nav>
        <div className="text-xs text-slate-600 text-center">v1.0.0 Dashboard</div>
      </aside>

      {/* 主要內容 */}
      <main className="flex-1 p-8 overflow-y-auto h-screen">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800">總編輯控制台</h1>
          <div className="flex gap-3">
             <button 
                onClick={() => handleAction('deploy')}
                disabled={loading}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-lg shadow transition disabled:opacity-50"
             >
               {loading ? <RefreshCw className="animate-spin"/> : <UploadCloud size={18}/>}
               發布更新到雲端
             </button>
          </div>
        </header>

        {/* 數據卡片區 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="text-slate-500 text-sm font-medium mb-1">文章總數</div>
            <div className="text-4xl font-bold text-slate-800">{stats.total}</div>
          </div>
          {Object.entries(stats.categories).map(([cat, count]) => (
            <div key={cat} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <div className="text-slate-500 text-sm font-medium mb-1">{cat}</div>
              <div className="text-4xl font-bold text-blue-600">{count}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* 左邊：操作區與文章列表 */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* 操作面板 */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Terminal size={20}/> AI 記者操作</h3>
              <div className="flex gap-4">
                <button 
                  onClick={() => handleAction('fetch_auto')}
                  disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-lg font-bold flex flex-col items-center justify-center gap-2 transition disabled:opacity-50"
                >
                  {loading ? <RefreshCw className="animate-spin"/> : <Play size={24}/>}
                  啟動全自動採集
                </button>
                
                {/* 這裡保留擴充空間，目前仍建議用 .bat 執行指定採集 */}
                <div className="flex-1 bg-slate-100 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center text-slate-400">
                   <span className="text-sm">指定採集 (請用桌面 .bat)</span>
                </div>
              </div>
            </div>

            {/* 文章列表 */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-bold text-lg">文章管理</h3>
                <button onClick={fetchStats} className="text-sm text-blue-600 hover:underline">重新整理</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 uppercase">
                    <tr>
                      <th className="px-6 py-3">日期</th>
                      <th className="px-6 py-3">分類</th>
                      <th className="px-6 py-3">標題</th>
                      <th className="px-6 py-3 text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {stats.news.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 whitespace-nowrap text-slate-500">
                          {new Date(item.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-bold">
                            {item.category_zh}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-800 line-clamp-1 max-w-xs">
                          {item.title_zh}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => {
                              if(confirm(`確定要刪除「${item.title_zh}」嗎？`)) {
                                handleAction('delete', { id: item.id });
                              }
                            }}
                            disabled={loading}
                            className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded transition"
                          >
                            <Trash2 size={16}/>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* 右邊：系統日誌 (Terminal Output) */}
          <div className="lg:col-span-1">
            <div className="bg-slate-900 text-green-400 p-6 rounded-xl shadow-lg h-[600px] overflow-y-auto font-mono text-xs leading-relaxed border border-slate-700">
              <div className="sticky top-0 bg-slate-900/90 backdrop-blur pb-2 mb-2 border-b border-slate-700 text-slate-400 font-bold flex justify-between">
                {/* 修正處：將 > 轉義為 {'>'} */}
                <span>{'>'}_ SYSTEM LOGS</span>
                <button onClick={() => setLogs([])} className="hover:text-white">CLEAR</button>
              </div>
              {logs.length === 0 && <div className="text-slate-600 italic">等待指令中...</div>}
              {logs.map((log, i) => (
                <div key={i} className="mb-1 break-all">
                  {log}
                </div>
              ))}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}