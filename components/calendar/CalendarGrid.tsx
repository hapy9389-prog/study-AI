"use client";

import type { CalendarMonthCell } from "@/lib/calendarMonth";
import type { CalendarDaySummary } from "@/lib/calendarMemory";
import type { ReflectionEvidence } from "@/lib/types";
import { WEEKDAY_LABELS } from "@/lib/studyStats";

// 날짜 셀 clarity 마커. emoji 대신 다른 탭과 같은 인라인 SVG line-icon 언어를
// 그대로 쓴다(components/layout/BottomNavigation.tsx 참고). 흐림(blur)은 항상
// decorative aria-hidden span에만 건다 — 숫자/텍스트에는 절대 걸지 않는다
// (components/memory/MemoryRecordCard.tsx의 MemoryHaze와 같은 원칙).
function ClarityMark({
  clarity,
  hasRecords,
}: {
  clarity: ReflectionEvidence | null;
  hasRecords: boolean;
}) {
  if (!hasRecords) return null;

  if (clarity === "clear") {
    return (
      <svg width="9" height="9" viewBox="0 0 10 10" aria-hidden="true" className="text-peach-deep">
        <path d="M5 0 6 4 10 5 6 6 5 10 4 6 0 5 4 4Z" fill="currentColor" />
      </svg>
    );
  }
  if (clarity === "partial") {
    return (
      <svg width="9" height="9" viewBox="0 0 10 10" aria-hidden="true" className="text-cocoa/60">
        <circle cx="5" cy="5" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
      </svg>
    );
  }
  if (clarity === "unclear") {
    return (
      <span className="relative inline-flex h-[9px] w-[9px] items-center justify-center">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -inset-1 rounded-full bg-cocoa/12 blur-sm"
        />
        <svg
          width="9"
          height="9"
          viewBox="0 0 10 10"
          aria-hidden="true"
          className="relative text-cocoa/35"
        >
          <circle cx="5" cy="5" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      </span>
    );
  }
  // clarity 판정이 없는(legacy) 기록만 있는 날 — 의미 없이 "기록 있음"만 표시.
  return <span aria-hidden="true" className="h-[5px] w-[5px] rounded-full bg-warm-gray" />;
}

interface CalendarGridProps {
  cells: CalendarMonthCell[];
  summaries: Map<number, CalendarDaySummary>;
  selectedDayStart: number;
  todayDayStart: number;
  onSelectDay: (dayStart: number) => void;
}

// 월간 날짜 그리드(7열×6행). 순수 표시 컴포넌트 — 선택 state는 CalendarScreen이
// 갖고, 여기서는 클릭을 그대로 위로 올려보낸다. 이전/다음 달에서 채운 칸은
// 클릭할 수 없다(옅은 숫자만 표시) — "지금 몇 월을 보는지" 혼동을 피하기 위함.
export default function CalendarGrid({
  cells,
  summaries,
  selectedDayStart,
  todayDayStart,
  onSelectDay,
}: CalendarGridProps) {
  return (
    <div>
      <div className="grid grid-cols-7 text-center text-[11px] text-warm-gray">
        {WEEKDAY_LABELS.map((label) => (
          <span key={label} className="py-1">
            {label}
          </span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((cell) => {
          const dayNumber = new Date(cell.dayStart).getDate();

          if (!cell.isCurrentMonth) {
            return (
              <div
                key={cell.dayStart}
                className="flex aspect-square items-center justify-center"
              >
                <span className="text-xs text-warm-gray/40">{dayNumber}</span>
              </div>
            );
          }

          const summary = summaries.get(cell.dayStart);
          const isSelected = cell.dayStart === selectedDayStart;
          const isToday = cell.dayStart === todayDayStart;

          return (
            <button
              key={cell.dayStart}
              type="button"
              onClick={() => onSelectDay(cell.dayStart)}
              aria-current={isSelected ? "date" : undefined}
              className={`flex aspect-square flex-col items-center justify-center gap-0.5 rounded-2xl transition-colors ${
                isSelected ? "bg-cream-deep" : "hover:bg-cream-deep/50"
              }`}
            >
              <span className="text-xs text-cocoa">{dayNumber}</span>
              <span
                aria-hidden="true"
                className={`h-1 w-1 rounded-full ${isToday ? "bg-peach-deep" : "bg-transparent"}`}
              />
              <ClarityMark
                clarity={summary?.clarity ?? null}
                hasRecords={summary?.hasRecords ?? false}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
