import type { Metadata } from "next";
import { Gowun_Batang, IBM_Plex_Sans_KR } from "next/font/google";
import "./globals.css";

// 2종 페어링. IBM Plex Sans KR = 본문·UI 기본. Gowun Batang(명조) = 다온이 말하는
// 줄·화면 제목·기억 인용문 "전용" — "다온이 말하고 있다 / 남겨진 순간"이라는
// 구조적 신호로만 쓴다(globals.css 의 --font-serif 참고).
//
// 한글 웹폰트는 용량이 커서 preload 하지 않는다(preload 할 latin subset 만
// 받아오고 한글은 swap 으로 뒤따라 온다). CJK 메트릭에 자동 폴백 조정은
// 어색해질 수 있어 끈다 — fallback 스택으로 layout shift 를 줄인다.
const sans = IBM_Plex_Sans_KR({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  display: "swap",
  preload: false,
  adjustFontFallback: false,
  fallback: [
    "system-ui",
    "-apple-system",
    "BlinkMacSystemFont",
    "Apple SD Gothic Neo",
    "Malgun Gothic",
    "sans-serif",
  ],
  variable: "--font-ibm-plex-sans-kr",
});

const serif = Gowun_Batang({
  weight: ["400", "700"],
  subsets: ["latin"],
  display: "swap",
  preload: false,
  adjustFontFallback: false,
  fallback: ["Apple SD Gothic Neo", "Nanum Myeongjo", "serif"],
  variable: "--font-gowun-batang",
});

export const metadata: Metadata = {
  title: "다온 - AI 공부 성장 게임",
  description: "공부하고, 다온이와 함께 성장하는 AI 공부 게임",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`h-full ${sans.variable} ${serif.variable}`}>
      <body className="min-h-full font-sans antialiased">{children}</body>
    </html>
  );
}
