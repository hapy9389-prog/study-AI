import type { ReactNode } from "react";
import BottomNavigation from "./BottomNavigation";

interface MobileLayoutProps {
  children: ReactNode;
}

// Mobile-first shell: full-bleed on phones, centered as an app-like column on
// wider (PC) viewports via max-width + centering — no hardcoded fixed width.
export default function MobileLayout({ children }: MobileLayoutProps) {
  return (
    <div className="flex min-h-screen w-full justify-center bg-warm-gray/10">
      <div className="flex min-h-screen w-full max-w-[430px] flex-col bg-cream shadow-xl">
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto py-6">
          {children}
        </div>
        <BottomNavigation />
      </div>
    </div>
  );
}
