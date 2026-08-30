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

// 오늘 로컬 00:00 ~ 다음 날 00:00 경계 2개. weekBoundaries와 같은 원칙(로컬 calendar
// date, 고정 86_400_000ms 간격에 의존하지 않음) — 여기선 하루뿐이라 [start, end] 형태.
// Daily Study Plan 진척, 오늘 공부시간(lib/studyRecords.ts), reward milestone 판정이
// 모두 이 함수를 공유해 "오늘"의 정의가 어긋나지 않게 한다.
export function dayBoundaries(now: number): [number, number] {
  const t = new Date(now);
  const start = localMidnight(t.getFullYear(), t.getMonth(), t.getDate());
  return [start, start + 86_400_000];
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

// StudyRecord[] → 이번 주(월→일) 실제 공부시간 총합(분). Home "내 공간" 표시용.
// 요일별 floor 후 합산이 아니라 — 이번 주 record 의 elapsedSeconds 를 전부 더한 뒤
// 마지막에 한 번만 분으로 내린다(요일마다 버려지는 초 단위 손실 방지).
// getWeeklyStudyMinutes 기반 주간 bar 계산과는 별개 경로다.
export function getWeekTotalStudyMinutes(
  records: StudyRecord[],
  now: number = Date.now(),
): number {
  const boundaries = weekBoundaries(now);
  let seconds = 0;
  for (const record of thisWeekRecords(records, boundaries)) {
    seconds += Math.max(0, record.elapsedSeconds);
  }
  return Math.floor(seconds / 60);
}

export interface SubjectMinutes {
  subject: string;
  minutes: number;
}

// 이번 주 과목별 실제 공부시간(분), 내림차순. subject 문자열 그대로 그룹(정규화 안 함 —
// record 에 저장된 형태 그대로 보여준다). elapsedSeconds 를 먼저 합산하고 마지막에
// 분으로 floor 한다. 0분 결과는 제외. 동일 시간이면 subject 한글 정렬로 순서를 고정한다.
//
// 주의: StudyRecord 는 최대 50개(MAX_STORED_RECORDS)만 저장되지만, 이 함수는 이번 주
// 범위로 먼저 필터하므로 50개 cap 이 이번 주 집계를 잘라낼 가능성은 낮다.
export function getSubjectMinutesThisWeek(
  records: StudyRecord[],
  now: number = Date.now(),
): SubjectMinutes[] {
  const boundaries = weekBoundaries(now);
  const secondsBySubject = new Map<string, number>();

  for (const record of thisWeekRecords(records, boundaries)) {
    const prev = secondsBySubject.get(record.subject) ?? 0;
    secondsBySubject.set(record.subject, prev + Math.max(0, record.elapsedSeconds));
  }

  return [...secondsBySubject.entries()]
    .map(([subject, seconds]) => ({ subject, minutes: Math.floor(seconds / 60) }))
    .filter((entry) => entry.minutes > 0)
    .sort((a, b) => b.minutes - a.minutes || a.subject.localeCompare(b.subject, "ko"));
}

// 이번 주에 가장 오래 공부한 과목 1개. 이번 주 기록이 없으면 null.
// (getSubjectMinutesThisWeek 의 1위 항목 — < 60초 과목은 양쪽 다 제외되어 결과 동일.)
export function getTopSubjectThisWeek(
  records: StudyRecord[],
  now: number = Date.now(),
): SubjectMinutes | null {
  return getSubjectMinutesThisWeek(records, now)[0] ?? null;
}
