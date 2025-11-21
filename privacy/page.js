export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-white py-12 px-4 sm:px-6 lg:px-8 font-sans text-slate-900">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">隱私權政策 (Privacy Policy)</h1>
        <div className="prose prose-slate">
          <p className="mb-4">生效日期：2025年1月1日</p>
          <p className="mb-4">歡迎您使用 AI MedNews（以下簡稱「本網站」）。我們非常重視您的隱私權，本隱私權政策將說明我們如何收集、使用及保護您的個人資訊。</p>
          
          <h2 className="text-xl font-bold mt-6 mb-4">1. Google AdSense 廣告</h2>
          <p className="mb-4">
            本網站使用 Google AdSense 服務來顯示廣告。Google 作為第三方供應商，會使用 Cookie 來根據使用者過往造訪本網站或其他網站的紀錄來投遞廣告。
            Google 使用的廣告 Cookie 可讓 Google 及其合作夥伴根據使用者造訪本網站及/或網際網路上其他網站的紀錄，向使用者投遞廣告。
          </p>
          <p className="mb-4">
            您可以前往 <a href="https://adssettings.google.com" target="_blank" className="text-blue-600 hover:underline">Google 廣告設定</a> 選擇停用個人化廣告。
          </p>

          <h2 className="text-xl font-bold mt-6 mb-4">2. 資訊收集與使用</h2>
          <p className="mb-4">
            本網站主要提供醫學科普資訊，我們不會主動要求您註冊帳號或提供真實姓名、電話等敏感個資。我們可能會收集非個人識別資訊（如瀏覽器類型、語言設定、造訪時間等）以優化網站體驗。
          </p>

          <h2 className="text-xl font-bold mt-6 mb-4">3. 免責聲明</h2>
          <p className="mb-4">
            本網站內容由 AI 輔助生成並彙整自 PubMed 等公開文獻，僅供科普參考，並非醫療建議。如有身體不適，請務必諮詢專業醫師。
          </p>
        </div>
      </div>
    </div>
  );
}