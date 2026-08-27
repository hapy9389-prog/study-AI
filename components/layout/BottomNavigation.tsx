// Placeholder bottom nav for Phase 1 — only 홈 is a real (active) view.
// 공부/다온이/기억 are non-interactive placeholders, no routing.

interface NavItem {
  label: string;
  icon: string;
  active: boolean;
}

const navItems: NavItem[] = [
  { label: "홈", icon: "🏠", active: true },
  { label: "공부", icon: "📚", active: false },
  { label: "다온이", icon: "🐣", active: false },
  { label: "기억", icon: "🧠", active: false },
];

export default function BottomNavigation() {
  return (
    <nav className="flex w-full items-center justify-around border-t border-peach/40 bg-cream/95 py-2">
      {navItems.map((item) => (
        <button
          key={item.label}
          type="button"
          disabled={!item.active}
          aria-current={item.active ? "page" : undefined}
          className={`flex flex-col items-center gap-0.5 rounded-xl px-3 py-1 text-xs transition-colors ${
            item.active
              ? "bg-lavender/60 font-semibold text-cocoa"
              : "text-warm-gray/70"
          }`}
        >
          <span className="text-lg leading-none">{item.icon}</span>
          {item.label}
        </button>
      ))}
    </nav>
  );
}
