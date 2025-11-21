import './globals.css'
import { Noto_Sans_TC } from 'next/font/google'

const notoSans = Noto_Sans_TC({ subsets: ['latin'] })

export const metadata = {
  title: 'AI MedNews | 最新醫學科普快訊',
  description: '由 AI 驅動的雙語醫學新聞網，彙整 PubMed 最新文獻。',
}

export default function RootLayout({ children }) {
  return (
    <html lang="zh-TW">
      <body className={notoSans.className}>{children}</body>
    </html>
  )
}