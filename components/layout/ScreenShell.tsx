import type { ReactNode } from "react";
import PhoneFrame from "./PhoneFrame";

interface ScreenShellProps {
  /** 있으면 상단에 "← 돌아가기" 고스트 버튼을 그린다. */
  onBack?: () => void;
  eyebrow?: string;
  title?: ReactNode;
  subtitle?: string;
  /** 하단에 고정되는 영역 (예: Social Check-in 의 CTA). */
  footer?: ReactNode;
  children: ReactNode;
}

// 바텀 네비 없이 홈을 대체하는 풀스크린들(Social Check-in / 다온 꾸미기 /
// 내 공간 / 친구 방)의 공통 셸. 데스크톱에서는 PhoneFrame(스마트폰 프레임) 안,
// 모바일에서는 full-bleed. 스크롤은 내부 컨테이너(min-h-0 flex-1 overflow-y-auto)
// 에서만 일어난다 — 브라우저 body 는 스크롤되지 않는다.
export default function ScreenShell({
  onBack,
  eyebrow,
  title,
  subtitle,
  footer,
  children,
}: ScreenShellProps) {
  // 헤더 첫 요소에만 위쪽 여백을 준다(돌아가기 버튼이 있으면 그 아래로 띄운다).
  const firstHeaderSpacing = onBack ? "mt-2" : "";

  return (
    <PhoneFrame>
      <div className="motion-safe:animate-screen-enter flex min-h-0 flex-1 flex-col overflow-y-auto px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-8">
        {onBack && (
          <button type="button" onClick={onBack} className="btn-ghost">
            ← 돌아가기
          </button>
        )}

        {eyebrow && (
          <p className={`text-xs font-medium text-warm-gray ${firstHeaderSpacing}`}>
            {eyebrow}
          </p>
        )}

        {title && (
          <h1 className={`screen-title ${eyebrow ? "mt-1" : firstHeaderSpacing}`}>
            {title}
          </h1>
        )}

        {subtitle && (
          <p className="mt-1.5 text-xs leading-relaxed text-warm-gray">{subtitle}</p>
        )}

        <div className="mt-6 flex flex-1 flex-col gap-4">{children}</div>

        {footer && <div className="mt-6">{footer}</div>}
      </div>
    </PhoneFrame>
  );
}
