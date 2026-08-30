"use client";

import { getDailyPlanProgress } from "@/lib/dailyStudyPlan";
import { getDailyStudyTotalSeconds } from "@/lib/calendarMemory";
import { formatTotalStudyTime } from "@/lib/mockData";
import type { DailyStudyPlan, StudyRecord } from "@/lib/types";
import MemoryRecordCard from "@/components/memory/MemoryRecordCard";

const WEEKDAY_FULL = ["일", "월", "화", "수", "목", "금", "토"];

function formatDayLabel(dayStart: number, isToday: boolean): string {
  const date = new Date(dayStart);
  const base = `${date.getMonth() + 1}월 ${date.getDate()}일 ${WEEKDAY_FULL[date.getDay()]}요일`;
  return isToday ? `오늘 · ${base}` : base;
}

interface CalendarDayDetailProps {
  selectedDayStart: number;
  isToday: boolean;
  planForDay: DailyStudyPlan | null;
  dayRecords: StudyRecord[];
}

// 선택한 날짜의 상세. 과거 계획/기록을 "조회"만 한다 — 여기서 계획을 만들거나
// 수정하지 않는다(편집은 Home의 "오늘 계획"에서만). 캐릭터 반응은 저장된
// characterReaction을 그대로 보여줄 뿐 Claude API를 다시 부르지 않는다
// (MemoryRecordCard가 이미 그렇게 동작한다).
export default function CalendarDayDetail({
  selectedDayStart,
  isToday,
  planForDay,
  dayRecords,
}: CalendarDayDetailProps) {
  // dayRecords는 이미 그 날짜로만 필터된 배열이라, getDailyPlanProgress가
  // 내부에서 selectedDayStart 기준으로 다시 필터해도 결과는 그대로다.
  const progress = getDailyPlanProgress(planForDay, dayRecords, selectedDayStart);
  const totalSeconds = getDailyStudyTotalSeconds(dayRecords);
  const hasPlan = progress.length > 0;
  const hasRecords = dayRecords.length > 0;

  return (
    <section className="flex flex-col gap-4">
      <header>
        <p className="text-sm font-semibold text-cocoa">
          {formatDayLabel(selectedDayStart, isToday)}
        </p>
        {hasRecords && (
          <p className="mt-0.5 text-xs text-warm-gray">
            이 날 공부 {formatTotalStudyTime(Math.floor(totalSeconds / 60))}
          </p>
        )}
      </header>

      {hasPlan && (
        <div className="flex flex-col gap-2.5">
          <p className="text-xs font-medium text-warm-gray">그날 계획</p>
          <dl className="flex flex-col gap-2.5">
            {progress.map((item) => (
              <div key={item.subject} className="flex flex-col gap-0.5">
                <div className="flex justify-between gap-4 text-sm">
                  <dt className="min-w-0 truncate text-cocoa">{item.subject}</dt>
                  <dd className="shrink-0 text-right text-cocoa">
                    {formatTotalStudyTime(item.studiedMinutes)} /{" "}
                    {formatTotalStudyTime(item.targetMinutes)}
                  </dd>
                </div>
                <p className="text-xs text-warm-gray">
                  {item.isCompleted
                    ? "이번 목표를 채웠어요"
                    : `${formatTotalStudyTime(item.remainingMinutes)} 남았던 계획`}
                </p>
              </div>
            ))}
          </dl>
        </div>
      )}

      {hasRecords && (
        <ul className="flex flex-col gap-3">
          {dayRecords.map((record) => (
            <MemoryRecordCard key={record.id} record={record} />
          ))}
        </ul>
      )}

      {!hasPlan && !hasRecords && (
        <p className="card text-center text-sm leading-relaxed text-warm-gray">
          이 날은 기록이 없어요.
        </p>
      )}
    </section>
  );
}
