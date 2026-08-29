// 통계(통계 탭)용 파생 계산. StudyRecord[] 를 읽어 "이번 주 요일별 공부시간"을
// 계산만 한다 — 새 저장소를 만들지 않는다. localStorage 접근/쓰기 없음.
// 기존 record(lib/studyRecords.ts)가 source of truth 다.
//
// 날짜 경계는 고정 86_400_000ms 간격에 의존하지 않고 로컬 calendar date 로 만든다
// (`new Date(y, m, d + i)` 는 넘침/음수 날짜를 정규화하고 로컬 자정을 준다) —
// DST/타임존이 있어도 깨지지 않는다. 새 date 라이브러리는 쓰지 않는다.

import type { StudyRecord } from "./types";

// 월요일 시작. 차트 x축 라벨.
export const WEEKDAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"] as const;

function localMidnight(year: number, month: number, day: number): number {
  return new Date(year, month, day).getTime();
}

// 이번 주 월요일 00:00 부터 다음 주 월요일 00:00 까지 8개 경계(로컬).
// boundaries[i] ~ boundaries[i+1] 이 i 번째 요일(0=월 … 6=일)의 하루다.
export function weekBoundaries(now: number): number[] {
  const t = new Date(now);
  const daysSinceMonday = (t.getDay() + 6) % 7; // Sun=0 → 6, Mon=1 → 0, …
  const year = t.getFullYear();
  const month = t.getMonth();
  const day = t.getDate() - daysSinceMonday;
  return Array.from({ length: 8 }, (_, i) => localMidnight(year, month, day + i));
}

// 오늘이 이번 주 몇 번째 요일인지(0=월 … 6=일). 차트에서 "오늘" 막대만 살짝 강조.
export function getTodayIndex(now: number = Date.now()): number {
  return (new Date(now).getDay() + 6) % 7;
}

// 이번 주 record 만 남기고 (completedAt 이 이번 주 경계 안).
function thisWeekRecords(records: StudyRecord[], boundaries: number[]): StudyRecord[] {
  const weekStart = boundaries[0];
  const weekEnd = boundaries[7];
  return records.filter((record) => {
    const at = new Date(record.completedAt).getTime();
    return !Number.isNaN(at) && at >= weekStart && at < weekEnd;
  });
}

// 이번 주 요일별(월→일) 실제 공부시간(분). 길이 7. 하드코딩 아님 — record 합산.
export function getWeeklyStudyMinutes(
  records: StudyRecord[],
  now: number = Date.now(),
): number[] {
  const boundaries = weekBoundaries(now);
  const seconds = new Array(7).fill(0);

  for (const record of records) {
    const at = new Date(record.completedAt).getTime();
    if (Number.isNaN(at) || at < boundaries[0] || at >= boundaries[7]) continue;
    // 어느 요일 칸에 속하는지 — 경계 비교(고정 간격 나눗셈 아님).
    let day = 0;
    while (day < 6 && at >= boundaries[day + 1]) day += 1;
    seconds[day] += Math.max(0, record.elapsedSeconds);
  }

  return seconds.map((s) => Math.floor(s / 60));
}

export function getWeekTotalMinutes(weeklyMinutes: number[]): number {
  return weeklyMinutes.reduce((sum, m) => sum + m, 0);
}

// 이번 주에 가장 오래 공부한 과목 1개. subject 문자열 그대로 그룹(정규화 안 함 —
// record 에 저장된 형태 그대로 보여준다). 이번 주 기록이 없으면 null.
export function getTopSubjectThisWeek(
  records: StudyRecord[],
  now: number = Date.now(),
): { subject: string; minutes: number } | null {
  const boundaries = weekBoundaries(now);
  const bySubject = new Map<string, number>();

  for (const record of thisWeekRecords(records, boundaries)) {
    const prev = bySubject.get(record.subject) ?? 0;
    bySubject.set(record.subject, prev + Math.max(0, record.elapsedSeconds));
  }

  let top: { subject: string; seconds: number } | null = null;
  for (const [subject, seconds] of bySubject) {
    if (!top || seconds > top.seconds) top = { subject, seconds };
  }

  if (!top || top.seconds < 60) return null;
  return { subject: top.subject, minutes: Math.floor(top.seconds / 60) };
}
