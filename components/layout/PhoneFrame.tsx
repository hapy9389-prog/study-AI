import type { ReactNode } from "react";

// 앱 외곽 셸. 데스크톱(md+)에서는 화면 중앙에 실제 스마트폰처럼 읽히는 프레임
// (어두운 warm bezel = 두꺼운 border + 큰 radius + 깊은 soft shadow) 안에서 앱이
// 렌더된다. 모바일/좁은 화면(<md)에서는 bezel 이 사라지고 기존 full-screen 앱 그대로.
//
// MobileLayout / ScreenShell / app/page.tsx 의 BootSplash 가 공통으로 이걸로 감싼다.
// 내부 스크롤 영역과 BottomNavigation 배치는 children 몫 — 여기서는 고정 높이 +
// overflow-hidden + flex column 만 책임진다(§ study-ai-3-breezy-cook 계획).
//
// 바깥은 모바일에서 block(<md), 데스크톱에서 flex-center(md:) — 좁은 화면에서
// flex 자식의 width:100% 해석 문제로 콘텐츠가 가로로 넘치는 걸 피한다. screen 은
// mx-auto 로 중앙 정렬하고, overflow-hidden 이 넘치는 자식을 잘라 준다.
export default function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[100dvh] w-full bg-warm-gray/10 md:flex md:items-center md:justify-center md:py-7">
      <div className="mx-auto flex h-[100dvh] min-h-0 w-full max-w-[430px] flex-col overflow-hidden bg-cream md:h-[calc(100dvh_-_3.5rem)] md:max-h-[880px] md:rounded-[2.6rem] md:border-[7px] md:border-[#2b2320] md:shadow-[0_28px_70px_-18px_rgb(43_35_32/0.5)]">
        {children}
      </div>
    </div>
  );
}
