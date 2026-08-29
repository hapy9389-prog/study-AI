"use client";

// 홈 / 통계 / 기억 세 탭이 실제로 동작한다. 캐릭터 는 아직 placeholder(비활성).
// navLocked(공부 중 · 감상 선택 중)이면 탭 전환 자체를 막아 공부에 집중하게 한다.

import type { ReactNode } from "react";

export type NavTab = "home" | "stats" | "memory";

interface NavItem {
  label: string;
  icon: ReactNode;
  tab?: NavTab;
}

// 이모지 대신 일관된 라인 아이콘. 24x24, stroke=currentColor 로 활성/비활성 색을 따라간다.
const iconProps = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

const navItems: NavItem[] = [
  {
    label: "홈",
    tab: "home",
    icon: (
      <svg {...iconProps}>
        <path d="M4 11.5 12 4l8 7.5" />
        <path d="M6 10v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9" />
      </svg>
    ),
  },
  {
    label: "통계",
    tab: "stats",
    icon: (
      <svg {...iconProps}>
        <path d="M4 20V4" />
        <path d="M4 20h16" />
        <path d="M8 20v-6" />
        <path d="M13 20V9" />
        <path d="M18 20v-9" />
      </svg>
    ),
  },
  {
    label: "캐릭터",
    icon: (
      <svg {...iconProps}>
        <path d="M12 4c1.5 2 1.5 3.5 0 5.5" />
        <path d="M7 20c0-4 2.2-6.5 5-6.5s5 2.5 5 6.5" />
        <circle cx="12" cy="12" r="2.2" />
      </svg>
    ),
  },
  {
    label: "기억",
    tab: "memory",
    icon: (
      <svg {...iconProps}>
        <path d="M7 4h10a1 1 0 0 1 1 1v14l-6-3.2L6 19V5a1 1 0 0 1 1-1Z" />
      </svg>
    ),
  },
];

interface BottomNavigationProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  navLocked: boolean;
}

export default function BottomNavigation({
  activeTab,
  onTabChange,
  navLocked,
}: BottomNavigationProps) {
  return (
    <nav className="flex w-full items-center justify-around border-t border-warm-line bg-white pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
      {navItems.map((item) => {
        const isActive = item.tab === activeTab;
        const isEnabled = item.tab !== undefined && !navLocked;
        // 아직 안 만든 탭(캐릭터)은 눌리는 것처럼 보이지 않게 더 흐리게.
        const isPlaceholder = item.tab === undefined;

        return (
          <button
            key={item.label}
            type="button"
            disabled={!isEnabled}
            aria-current={isActive ? "page" : undefined}
            onClick={item.tab ? () => onTabChange(item.tab!) : undefined}
            className={`relative flex flex-col items-center gap-1 rounded-xl px-3 pb-1 pt-2.5 text-[11px] transition-colors ${
              isActive
                ? "font-semibold text-cocoa"
                : isPlaceholder
                  ? "text-warm-gray/35"
                  : "text-warm-gray"
            } ${isEnabled && !isActive ? "hover:text-cocoa" : ""}`}
          >
            <span
              aria-hidden
              className={`absolute top-0 h-0.5 w-6 rounded-full transition-colors ${
                isActive ? "bg-peach-deep" : "bg-transparent"
              }`}
            />
            {item.icon}
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
