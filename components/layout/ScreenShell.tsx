import type { ReactNode } from "react";

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
// 내 공간 / 친구 방)의 공통 셸. 이전에는 각 파일이 letterbox + cream 컬럼 +
// 돌아가기 버튼 + h1 을 손으로 복붙했다 — 그 결과 px/py, 제목 스타일이 조금씩
// 어긋났다. 이 컴포넌트로 단일화한다. MobileLayout(홈/기억 탭)은 그대로 둔다.
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
    <div className="flex min-h-screen w-full justify-center bg-warm-gray/10">
      <div
        className="motion-safe:animate-screen-enter flex min-h-screen w-full max-w-[430px] flex-col bg-cream px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-8 shadow-[var(--shadow-lift)]"
      >
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
    </div>
  );
}
