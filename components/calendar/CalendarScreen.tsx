"use client";

import { useState } from "react";
import {
  buildMonthGrid,
  formatMonthLabel,
  getMonthStart,
  shiftMonth,
} from "@/lib/calendarMonth";
import {
  buildCalendarDaySummaries,
  getRecordsForDay,
} from "@/lib/calendarMemory";
import { dayBoundaries } from "@/lib/studyStats";
import { loadStudyRecords } from "@/lib/studyRecords";
import { loadDailyPlanHistory } from "@/lib/dailyStudyPlan";
import type { StudyRecord } from "@/lib/types";
import CalendarGrid from "./CalendarGrid";
import CalendarDayDetail from "./CalendarDayDetail";

const chevronIconProps = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

// "캘린더" 탭 화면. 일정관리 캘린더가 아니라 "날짜별 공부 기억" 조회 화면이다 —
// 여기서 미래 계획을 만들거나 과거 계획을 수정하지 않는다(편집은 Home의
// "오늘 계획"에서만). 탭을 누른 뒤에만 마운트되므로(기존 StudyMemoryList와
// 같은 패턴) lazy useState 초기값에서 바로 localStorage를 읽어도 SSR/hydration
// 문제가 없다.
export default function CalendarScreen() {
  // setter가 필요하다 — 기능 2/3(복습 제안·복습 질문)이 Calendar를 연 채로
  // updateStudyRecord()로 기록을 사후에 patch하면, 그 결과를 화면에도 즉시
  // 반영해야 한다(handleRecordUpdate). localStorage 재조회(loadStudyRecords()
  // 재호출)는 쓰지 않는다 — CalendarDayDetail이 key={selectedDayStart}로
  // 리마운트되는 구조라, 그 트리거로 재로드하면 방금 펼친 카드가 다시 닫혀버린다.
  const [records, setRecords] = useState(() => loadStudyRecords());
  const [plans] = useState(() => loadDailyPlanHistory());
  const [today] = useState(() => Date.now());

  const todayDayStart = dayBoundaries(today)[0];
  const currentMonthStart = getMonthStart(today);

  const [viewMonth, setViewMonth] = useState(currentMonthStart);
  const [selectedDayStart, setSelectedDayStart] = useState(todayDayStart);

  // 월 이동 시 상세도 함께 그 달의 1일로 옮긴다 — viewMonth와 selectedDayStart가
  // 서로 다른 달을 가리키는 상태(캘린더는 7월인데 상세는 8월 30일)를 만들지
  // 않는다. "기록이 있는 가장 가까운 날짜"를 찾는 로직은 두지 않는다.
  const goToMonth = (nextMonthStart: number) => {
    setViewMonth(nextMonthStart);
    setSelectedDayStart(nextMonthStart);
  };

  const goToToday = () => {
    setViewMonth(currentMonthStart);
    setSelectedDayStart(todayDayStart);
  };

  const cells = buildMonthGrid(viewMonth);
  const summaries = buildCalendarDaySummaries(
    records,
    plans,
    cells.map((cell) => cell.dayStart),
  );

  const planForDay =
    plans.find((plan) => plan.dayStart === selectedDayStart && plan.items.length > 0) ??
    null;
  const dayRecords = getRecordsForDay(records, selectedDayStart);

  const isViewingCurrentMonth = viewMonth === currentMonthStart;

  // updateStudyRecord()로 storage에 이미 저장된 patch를 화면 state에도 반영한다
  // (storage 쓰기 자체는 MemoryRecordCard가 이미 끝낸 뒤 호출한다 — 여기선 로컬
  // state만 맞춘다).
  function handleRecordUpdate(id: string, patch: Partial<StudyRecord>) {
    setRecords((prev) =>
      prev.map((record) => (record.id === id ? { ...record, ...patch } : record)),
    );
  }

  return (
    <section className="mx-6 flex flex-col gap-4">
      <header>
        <h2 className="screen-title">캘린더</h2>
        <p className="mt-0.5 text-xs text-warm-gray">날짜별 공부 기억</p>
      </header>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => goToMonth(shiftMonth(viewMonth, -1))}
          aria-label="이전 달"
          className="rounded-full p-1.5 text-warm-gray transition-colors hover:text-cocoa"
        >
          <svg {...chevronIconProps}>
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </button>

        <div className="flex items-baseline gap-2">
          <p className="text-sm font-semibold text-cocoa">{formatMonthLabel(viewMonth)}</p>
          {!isViewingCurrentMonth && (
            <button
              type="button"
              onClick={goToToday}
              className="text-xs text-warm-gray transition-colors hover:text-cocoa"
            >
              오늘로
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => goToMonth(shiftMonth(viewMonth, 1))}
          disabled={isViewingCurrentMonth}
          aria-label="다음 달"
          className="rounded-full p-1.5 text-warm-gray transition-colors hover:text-cocoa disabled:opacity-30 disabled:hover:text-warm-gray"
        >
          <svg {...chevronIconProps}>
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
      </div>

      <CalendarGrid
        cells={cells}
        summaries={summaries}
        selectedDayStart={selectedDayStart}
        todayDayStart={todayDayStart}
        onSelectDay={setSelectedDayStart}
      />

      <CalendarDayDetail
        // 날짜가 바뀌면 CalendarDayDetail의 펼침(expandedRecordId) 상태를
        // 새로 시작한다 — useEffect로 리셋하는 대신 key로 리마운트한다.
        key={selectedDayStart}
        selectedDayStart={selectedDayStart}
        isToday={selectedDayStart === todayDayStart}
        planForDay={planForDay}
        dayRecords={dayRecords}
        onRecordUpdate={handleRecordUpdate}
      />
    </section>
  );
}
