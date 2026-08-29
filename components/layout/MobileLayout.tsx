import type { ReactNode } from "react";
import BottomNavigation, { type NavTab } from "./BottomNavigation";
import PhoneFrame from "./PhoneFrame";

interface MobileLayoutProps {
  children: ReactNode;
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  navLocked: boolean;
}

// Mobile-first shell: 데스크톱에서는 PhoneFrame(스마트폰 프레임) 안, 모바일에서는
// full-bleed. 내부 스크롤 영역(min-h-0 flex-1 overflow-y-auto)만 스크롤되고
// BottomNavigation 은 프레임 하단에 항상 고정된다(shrink-0).
export default function MobileLayout({
  children,
  activeTab,
  onTabChange,
  navLocked,
}: MobileLayoutProps) {
  return (
    <PhoneFrame>
      <div className="motion-safe:animate-screen-enter flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto scrollbar-hidden py-6">
        {children}
      </div>
      <div className="shrink-0">
        <BottomNavigation
          activeTab={activeTab}
          onTabChange={onTabChange}
          navLocked={navLocked}
        />
      </div>
    </PhoneFrame>
  );
}
