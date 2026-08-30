// "캘린더" 탭 월간 그리드 계산 — 순수 날짜 수학만 담당한다. StudyRecord/
// DailyStudyPlan에는 의존하지 않는다(데이터 집계는 lib/calendarMemory.ts가 맡는다).
// 요일 계산은 lib/studyStats.ts weekBoundaries의 (getDay()+6)%7 공식(월요일 시작)과
// 통일한다. 외부 캘린더 라이브러리는 쓰지 않는다 — new Date(y, m, d)가 오버플로/
// 음수 day를 자동 정규화하는 JS 표준 동작만으로 윤년/월말을 처리한다.

function localMidnight(year: number, month: number, day: number): number {
  return new Date(year, month, day).getTime();
}

// now가 속한 달의 1일 로컬 자정.
export function getMonthStart(now: number): number {
  const t = new Date(now);
  return localMidnight(t.getFullYear(), t.getMonth(), 1);
}

// monthStart(그 달 1일)에서 delta개월 이동한 달의 1일. new Date(y, m+delta, 1)이
// 연도 넘침(1월 -1 → 작년 12월)을 자동 정규화하므로 별도 분기가 필요 없다.
export function shiftMonth(monthStart: number, delta: number): number {
  const t = new Date(monthStart);
  return localMidnight(t.getFullYear(), t.getMonth() + delta, 1);
}

export interface CalendarMonthCell {
  dayStart: number;
  /** 이전/다음 달에서 채워 넣은 칸이면 false. */
  isCurrentMonth: boolean;
}

// 항상 42칸(6행×7열, 월요일 시작). 달마다 5행/6행이 바뀌면 월 전환마다 그리드
// 높이가 흔들리므로 6행으로 고정한다.
export function buildMonthGrid(monthStart: number): CalendarMonthCell[] {
  const t = new Date(monthStart);
  const year = t.getFullYear();
  const month = t.getMonth();
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7; // Mon=0…Sun=6
  const gridStartDay = 1 - firstWeekday;

  return Array.from({ length: 42 }, (_, i) => {
    const day = gridStartDay + i;
    const dayStart = localMidnight(year, month, day);
    return { dayStart, isCurrentMonth: new Date(dayStart).getMonth() === month };
  });
}

export function formatMonthLabel(monthStart: number): string {
  const t = new Date(monthStart);
  return `${t.getFullYear()}년 ${t.getMonth() + 1}월`;
}
