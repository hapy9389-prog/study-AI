"use client";

// 홈 / 기억 두 탭만 실제로 동작한다. 공부 / 다온이 는 아직 placeholder(비활성).
// navLocked(공부 중 · 감상 선택 중)이면 탭 전환 자체를 막아 공부에 집중하게 한다.

export type NavTab = "home" | "memory";

interface NavItem {
  label: string;
  icon: string;
  tab?: NavTab;
}

const navItems: NavItem[] = [
  { label: "홈", icon: "🏠", tab: "home" },
  { label: "공부", icon: "📚" },
  { label: "다온이", icon: "🐣" },
  { label: "기억", icon: "🧠", tab: "memory" },
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
    <nav className="flex w-full items-center justify-around border-t border-warm-gray/15 bg-white py-2">
      {navItems.map((item) => {
        const isActive = item.tab === activeTab;
        const isEnabled = item.tab !== undefined && !navLocked;
        // 아직 안 만든 탭(공부 / 다온이)은 눌리는 것처럼 보이지 않게 더 흐리게.
        const isPlaceholder = item.tab === undefined;

        return (
          <button
            key={item.label}
            type="button"
            disabled={!isEnabled}
            aria-current={isActive ? "page" : undefined}
            onClick={item.tab ? () => onTabChange(item.tab!) : undefined}
            className={`relative flex flex-col items-center gap-0.5 rounded-xl px-3 pb-1 pt-2 text-[11px] transition-colors ${
              isActive
                ? "font-semibold text-cocoa"
                : isPlaceholder
                  ? "text-warm-gray/40"
                  : "text-warm-gray"
            } ${isEnabled && !isActive ? "hover:text-cocoa" : ""}`}
          >
            <span
              aria-hidden
              className={`absolute top-0 h-1 w-1 rounded-full ${
                isActive ? "bg-lavender-deep" : "bg-transparent"
              }`}
            />
            <span className="text-base leading-none">{item.icon}</span>
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
