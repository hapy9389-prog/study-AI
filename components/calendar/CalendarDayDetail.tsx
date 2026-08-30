"use client";

import { useState } from "react";
import { getDailyPlanProgress } from "@/lib/dailyStudyPlan";
import { getDailyStudyTotalSeconds } from "@/lib/calendarMemory";
import { formatTotalStudyTime } from "@/lib/mockData";
import type { DailyStudyPlan, StudyRecord } from "@/lib/types";
import MemoryRecordCard from "@/components/memory/MemoryRecordCard";

type RecordUpdateHandler = (id: string, patch: Partial<StudyRecord>) => void;

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
  /** 복습 제안/복습 질문 생성 후 CalendarScreen의 records state를 patch한다. */
  onRecordUpdate: RecordUpdateHandler;
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
  onRecordUpdate,
}: CalendarDayDetailProps) {
  // dayRecords는 이미 그 날짜로만 필터된 배열이라, getDailyPlanProgress가
  // 내부에서 selectedDayStart 기준으로 다시 필터해도 결과는 그대로다.
  const progress = getDailyPlanProgress(planForDay, dayRecords, selectedDayStart);
  const totalSeconds = getDailyStudyTotalSeconds(dayRecords);
  const hasPlan = progress.length > 0;
  const hasRecords = dayRecords.length > 0;

  // 한 번에 하나의 기록만 펼친다. 날짜를 바꾸면 CalendarScreen이 이 컴포넌트를
  // key={selectedDayStart}로 리마운트해서, 이전 날짜에서 열려 있던 기록이
  // 그대로 남지 않고 항상 닫힌 상태로 시작한다.
  const [expandedRecordId, setExpandedRecordId] = useState<string | null>(null);

  function handleToggleRecord(recordId: string) {
    setExpandedRecordId((current) => (current === recordId ? null : recordId));
  }

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

      {hasPlan && hasRecords && <div className="border-t border-warm-line pt-4" />}

      {hasRecords && (
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium text-warm-gray">그날 공부</p>
          <ul className="flex flex-col">
            {dayRecords.map((record) => (
              <MemoryRecordCard
                key={record.id}
                record={record}
                isExpanded={expandedRecordId === record.id}
                onToggle={handleToggleRecord}
                onRecordUpdate={onRecordUpdate}
              />
            ))}
          </ul>
        </div>
      )}

      {!hasPlan && !hasRecords && (
        <p className="card text-center text-sm leading-relaxed text-warm-gray">
          이 날은 기록이 없어요.
        </p>
      )}
    </section>
  );
}
