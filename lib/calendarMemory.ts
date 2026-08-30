// "캘린더" 탭 전용 날짜별 집계. StudyRecord/DailyStudyPlan 저장소(lib/studyRecords.ts,
// lib/dailyStudyPlan.ts)의 책임("저장 + 조회만")은 그대로 두고, 그 위에 "하루 단위로
// 묶기"만 얇게 얹는다. 새 저장소를 만들지 않는다 — localStorage 접근이 없는 순수
// 파생 계산뿐이다.

import type { DailyStudyPlan, ReflectionEvidence, StudyRecord } from "./types";
import { dayBoundaries } from "./studyStats";

// dayStart는 이미 그날의 로컬 자정(dayBoundaries와 동일 정의)이므로 그대로
// dayBoundaries()에 넣어도 정확한 [start, end)가 나온다 — 새 날짜 정의를 만들지 않는다.
export function getRecordsForDay(records: StudyRecord[], dayStart: number): StudyRecord[] {
  const [start, end] = dayBoundaries(dayStart);
  return records.filter((record) => {
    const at = new Date(record.completedAt).getTime();
    return !Number.isNaN(at) && at >= start && at < end;
  });
}

export function getDailyStudyTotalSeconds(dayRecords: StudyRecord[]): number {
  return dayRecords.reduce((sum, record) => sum + Math.max(0, record.elapsedSeconds), 0);
}

// unclear > partial > clear 우선순위 — 캘린더의 목적은 "가장 잘한 날"을 보여주는
// 게 아니라 "다시 볼 필요가 있는 기억"을 발견하는 것이다(reflectionClarity 자체의
// "정답 인증 아님" 의미와 충돌하지 않는다 — lib/types.ts 참고). reflectionClarity가
// 없는(legacy) 기록은 "선명함"으로 임의 해석하지 않고 대표값 계산에서 제외한다.
const CLARITY_PRIORITY: ReflectionEvidence[] = ["unclear", "partial", "clear"];

export function getDayMemoryClarity(dayRecords: StudyRecord[]): ReflectionEvidence | null {
  let result: ReflectionEvidence | null = null;
  for (const record of dayRecords) {
    if (record.reflectionClarity === undefined) continue;
    if (
      result === null ||
      CLARITY_PRIORITY.indexOf(record.reflectionClarity) < CLARITY_PRIORITY.indexOf(result)
    ) {
      result = record.reflectionClarity;
    }
  }
  return result;
}

export interface CalendarDaySummary {
  dayStart: number;
  hasRecords: boolean;
  /** 그날 items가 1개 이상인 DailyStudyPlan이 존재하는지. */
  hasPlan: boolean;
  clarity: ReflectionEvidence | null;
  totalSeconds: number;
}

// 그리드에 표시할 날짜들(dayStarts)에 대해서만 한 번에 집계한다. 레코드 최대
// 200개 × 그리드 42칸 정도라 memoization/인덱싱 없이 이중 루프로 충분하다.
export function buildCalendarDaySummaries(
  records: StudyRecord[],
  plans: DailyStudyPlan[],
  dayStarts: number[],
): Map<number, CalendarDaySummary> {
  const planDayStarts = new Set(
    plans.filter((plan) => plan.items.length > 0).map((plan) => plan.dayStart),
  );
  const summaries = new Map<number, CalendarDaySummary>();
  for (const dayStart of dayStarts) {
    const dayRecords = getRecordsForDay(records, dayStart);
    summaries.set(dayStart, {
      dayStart,
      hasRecords: dayRecords.length > 0,
      hasPlan: planDayStarts.has(dayStart),
      clarity: getDayMemoryClarity(dayRecords),
      totalSeconds: getDailyStudyTotalSeconds(dayRecords),
    });
  }
  return summaries;
}
