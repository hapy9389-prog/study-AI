// 공부 완료로 누적되는 장기 보상(StudyRewardState)의 localStorage 영속화 + 계산 유틸.
// StudyRecord(lib/studyRecords.ts) · CharacterGrowthState(lib/characterGrowth.ts) ·
// DailyStudyPlan(lib/dailyStudyPlan.ts)와 완전히 분리된 저장소다 — 이쪽은 "공부한
// 만큼 쌓이는 코인 / 누적 공부시간 / 그에 따른 방 단계"만 본다.
//
// 원칙(CLAUDE.md): 벌점·코인 손실·streak 패널티·방 퇴화 없음. 공부한 만큼 계속
// 누적된다. 보상은 공부 완료 시 자동 지급이며 evidence(clear/partial/unclear)와
// 분리한다.
//
// 보상은 두 종류로 나뉜다(세션 단위 targetMinutes/goalBonus는 더 이상 없음):
//   ① time milestone  — 오늘 누적 "실제 공부시간"이 정해진 구간을 넘을 때마다 지급.
//   ② daily plan bonus — 오늘 Daily Study Plan 전체를 실제 공부시간으로 채우면
//                          하루 1회만 지급. "목표 달성 보상"이라는 개념은 이제 여기에만 쓰인다.

import { dayBoundaries } from "./studyStats";
import type {
  RoomStage,
  StudyRewardCalculation,
  StudyRewardState,
} from "./types";

const STUDY_REWARD_STORAGE_KEY = "study-ai:study-reward:v1";

// 누적 공부시간(분)에 따른 방 단계 경계. 데모용으로 단순하게 간다. (변경 없음)
const ROOM_STAGE_2_MIN_MINUTES = 60;
const ROOM_STAGE_3_MIN_MINUTES = 180;

const DEFAULT_STATE: StudyRewardState = {
  coins: 0,
  totalStudyMinutes: 0,
  roomStage: 1,
};

// 누적 공부시간 → 방 단계. 0~59분 Stage 1, 60~179분 Stage 2, 180분 이상 Stage 3.
export function getRoomStage(totalStudyMinutes: number): RoomStage {
  if (totalStudyMinutes >= ROOM_STAGE_3_MIN_MINUTES) return 3;
  if (totalStudyMinutes >= ROOM_STAGE_2_MIN_MINUTES) return 2;
  return 1;
}

// ── ① time milestone ──────────────────────────────────────────────
// 오늘 누적 "실제 공부시간"이 이 구간을 넘을 때마다 총 보상이 이 값으로 올라간다
// (세션별 지급이 아니라 "지금까지 오늘 총 얼마를 받았어야 하는가"의 계단 함수).
const DAILY_MILESTONES: { minutes: number; totalCoins: number }[] = [
  { minutes: 30, totalCoins: 10 },
  { minutes: 60, totalCoins: 20 },
  { minutes: 120, totalCoins: 35 },
  { minutes: 180, totalCoins: 50 },
  { minutes: 300, totalCoins: 80 },
  { minutes: 600, totalCoins: 150 },
];

// 이 누적 초에서 "지금까지 받았어야 할" 총 코인. 마지막으로 넘은 milestone의
// totalCoins, 아직 아무 것도 못 넘었으면 0.
function milestoneTotalCoinsForSeconds(seconds: number): number {
  let total = 0;
  for (const m of DAILY_MILESTONES) {
    if (seconds >= m.minutes * 60) total = m.totalCoins;
  }
  return total;
}

// 이번 세션으로 새로 넘은 가장 높은 milestone(분). 한 세션이 여러 milestone을
// 한 번에 넘어도(예: 첫 세션이 3시간) 최고값 하나만 알린다(roomStage unlock과 같은 패턴).
function highestNewlyReachedMilestone(
  beforeSeconds: number,
  afterSeconds: number,
): number | undefined {
  let reached: number | undefined;
  for (const m of DAILY_MILESTONES) {
    const thresholdSeconds = m.minutes * 60;
    if (afterSeconds >= thresholdSeconds && beforeSeconds < thresholdSeconds) {
      reached = m.minutes;
    }
  }
  return reached;
}

// ── ② daily plan completion bonus ─────────────────────────────────
// time milestone과 달리 순수 derive만으로는 안전하지 않다 — "오늘 계획 전체 완료"는
// 계획을 수정/삭제/재추가하면 완료→미완료→완료로 다시 뒤집힐 수 있어(단조증가가
// 아니라 delta 트릭이 성립하지 않는다), "오늘 이미 지급했는지"를 별도로 기록해야 한다.
const DAILY_PLAN_BONUS_STORAGE_KEY = "study-ai:daily-plan-bonus-claim:v1";

// 조정 가능한 상수. 1시간(20)~2시간(35) time milestone 사이 값으로 배치.
const DAILY_PLAN_COMPLETION_BONUS_COINS = 30;

// 계획 총 목표시간이 이보다 작으면(예: 항목 하나 10분) 완료가 지나치게 쉬워
// 보너스가 헐거워지므로, completion bonus 지급에만 최소 계획량 조건을 둔다.
// 진척/isCompleted/버블/LLM allPlanItemsCompletedNow는 이 조건과 무관하게 그대로 동작한다.
const MIN_DAILY_PLAN_TARGET_MINUTES_FOR_BONUS = 30;

function loadDailyPlanBonusClaimDayStart(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DAILY_PLAN_BONUS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return typeof parsed?.dayStart === "number" && Number.isFinite(parsed.dayStart)
      ? parsed.dayStart
      : null;
  } catch {
    return null;
  }
}

export function saveDailyPlanBonusClaimDayStart(dayStart: number): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      DAILY_PLAN_BONUS_STORAGE_KEY,
      JSON.stringify({ dayStart }),
    );
  } catch {
    // 용량 초과 / 저장 차단 — claim 저장 실패는 핵심 흐름을 막지 않는다
    // (다만 이 경우 같은 날 재지급될 수 있음 — 드문 엣지케이스로 감수).
  }
}

// 오늘 이미 daily plan completion bonus를 받았는지. 날짜가 바뀌면 dayBoundaries가
// 자동으로 달라지므로 별도 초기화 코드 없이 자연히 false가 된다.
export function hasClaimedDailyPlanBonus(now: number = Date.now()): boolean {
  const claimed = loadDailyPlanBonusClaimDayStart();
  return claimed !== null && claimed === dayBoundaries(now)[0];
}

// ── 계산 통합 ──────────────────────────────────────────────────────
// 이번 세션 1건의 보상 계산. 누적 상태를 건드리지 않는 순수 함수 —
// localStorage 접근도 하지 않는다(테스트/재사용을 쉽게 하기 위해).
export function calculateStudyReward(args: {
  elapsedSeconds: number;
  /** 오늘(이번 세션 반영 전) 누적 실제 공부 초. getTodayStudySeconds()로 계산. */
  todaySecondsBeforeThisSession: number;
  /** didCompleteDailyPlanWithSession(...) 결과 그대로 — before/after 전이 + 빈 계획 가드가 이미 반영됨. */
  didCompleteDailyPlanWithThisSession: boolean;
  /** hasClaimedDailyPlanBonus(now) 결과 그대로. */
  dailyPlanBonusAlreadyClaimedToday: boolean;
  /** getDailyPlanTotalTargetMinutes(plan) — 계획이 없으면 0. */
  dailyPlanTotalTargetMinutes: number;
}): StudyRewardCalculation {
  const elapsedSeconds = Math.max(0, Math.floor(args.elapsedSeconds));
  const earnedMinutes = Math.floor(elapsedSeconds / 60);

  const beforeSeconds = Math.max(0, args.todaySecondsBeforeThisSession);
  const afterSeconds = beforeSeconds + elapsedSeconds;
  const timeMilestoneCoins =
    milestoneTotalCoinsForSeconds(afterSeconds) -
    milestoneTotalCoinsForSeconds(beforeSeconds);
  const reachedMilestoneMinutes = highestNewlyReachedMilestone(
    beforeSeconds,
    afterSeconds,
  );

  // 세 게이트는 각각 다른 이유로 필요하다: ①플랜 레벨 전이(당장 이 계획 기준
  // 처음 완료) ②코인 claim(오늘 이미 지급됐는지 — 계획을 완료→편집→재완료해도
  // 재지급 방지) ③계획 총량이 너무 작지 않은지(reward balance).
  const dailyPlanCompletedNow =
    args.didCompleteDailyPlanWithThisSession &&
    !args.dailyPlanBonusAlreadyClaimedToday &&
    args.dailyPlanTotalTargetMinutes >= MIN_DAILY_PLAN_TARGET_MINUTES_FOR_BONUS;
  const dailyPlanBonusCoins = dailyPlanCompletedNow
    ? DAILY_PLAN_COMPLETION_BONUS_COINS
    : 0;

  return {
    earnedCoins: timeMilestoneCoins + dailyPlanBonusCoins,
    earnedMinutes,
    timeMilestoneCoins,
    reachedMilestoneMinutes,
    dailyPlanBonusCoins,
    dailyPlanCompletedNow,
  };
}

// 공부 완료 1건이 누적 보상 상태에 미치는 변화를 계산하는 순수 함수.
// localStorage에 직접 접근하지 않는다. roomStage/totalStudyMinutes 로직은
// 기존 그대로 — earnedMinutes만 사용(milestone/보너스와 무관하게 항상 누적).
export function updateStudyRewardAfterStudy(
  previous: StudyRewardState,
  calc: StudyRewardCalculation,
): StudyRewardState {
  const totalStudyMinutes = previous.totalStudyMinutes + calc.earnedMinutes;
  return {
    coins: previous.coins + calc.earnedCoins,
    totalStudyMinutes,
    roomStage: getRoomStage(totalStudyMinutes),
  };
}

function isNonNegativeFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

// 저장된 보상 상태를 읽는다. 없음 / 깨진 JSON / 잘못된 구조 / 음수·비정상 값
// 어느 경우에도 앱을 깨뜨리지 않고 초기값을 반환한다. roomStage는 신뢰하지 않고
// 항상 totalStudyMinutes 기준으로 재계산해 자기수정한다.
export function loadStudyRewardState(): StudyRewardState {
  if (typeof window === "undefined") return { ...DEFAULT_STATE };
  try {
    const raw = window.localStorage.getItem(STUDY_REWARD_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_STATE };
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) {
      return { ...DEFAULT_STATE };
    }
    const candidate = parsed as Record<string, unknown>;
    if (
      !isNonNegativeFiniteNumber(candidate.coins) ||
      !isNonNegativeFiniteNumber(candidate.totalStudyMinutes)
    ) {
      return { ...DEFAULT_STATE };
    }
    const totalStudyMinutes = candidate.totalStudyMinutes;
    return {
      coins: candidate.coins,
      totalStudyMinutes,
      roomStage: getRoomStage(totalStudyMinutes),
    };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

// 보상 상태를 저장한다. 용량 초과 / 저장 차단 등은 조용히 무시한다 —
// 보상 기록이 핵심 공부 흐름을 막지 않는다.
export function saveStudyRewardState(state: StudyRewardState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      STUDY_REWARD_STORAGE_KEY,
      JSON.stringify(state),
    );
  } catch {
    // no-op
  }
}
