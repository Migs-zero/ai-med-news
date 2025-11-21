import './globals.css'
import { Noto_Sans_TC } from 'next/font/google'
import Script from 'next/script'

const notoSans = Noto_Sans_TC({ subsets: ['latin'] })

export const metadata = {
  title: 'AI MedNews | 最新醫學科普快訊',
  description: '由 AI 驅動的雙語醫學新聞網，彙整 PubMed 最新文獻。',
}

export default function RootLayout({ children }) {
  return (
    <html lang="zh-TW">
      <head>
        {/* Google AdSense 代碼 */}
        <Script
          id="adsbygoogle-init"
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8019615509879896"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </head>
      <body className={notoSans.className}>
        {children}
      </body>
    </html>
  )
}