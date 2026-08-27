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
    <nav className="flex w-full items-center justify-around border-t border-peach/40 bg-cream/95 py-2">
      {navItems.map((item) => {
        const isActive = item.tab === activeTab;
        const isEnabled = item.tab !== undefined && !navLocked;

        return (
          <button
            key={item.label}
            type="button"
            disabled={!isEnabled}
            aria-current={isActive ? "page" : undefined}
            onClick={item.tab ? () => onTabChange(item.tab!) : undefined}
            className={`flex flex-col items-center gap-0.5 rounded-xl px-3 py-1 text-xs transition-colors ${
              isActive
                ? "bg-lavender/60 font-semibold text-cocoa"
                : "text-warm-gray/70"
            } ${isEnabled && !isActive ? "hover:text-cocoa" : ""}`}
          >
            <span className="text-lg leading-none">{item.icon}</span>
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
