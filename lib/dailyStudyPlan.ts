// "오늘 계획"(DailyStudyPlan)의 localStorage 영속화 + 진척 계산.
// 사용자가 "오늘 이 과목을 몇 분 하겠다"고 정한 목표만 다룬다 — 실제 진척
// (studiedSeconds)은 저장하지 않고 항상 StudyRecord에서 derive한다
// (getDailyPlanProgress). 저장된 카운터와 실제 기록이 어긋나는 구조를 피한다.
//
// 계획은 사용자에게 귀속된다(캐릭터 무관) — characterId 필드 자체가 없다.

import { dayBoundaries } from "./studyStats";
import type {
  DailyPlanProgress,
  DailyStudyPlan,
  DailyStudyPlanItem,
  StudyRecord,
} from "./types";

const DAILY_STUDY_PLAN_STORAGE_KEY = "study-ai:daily-study-plan:v1";

// 오늘 + 최근 두 달 가까이 보존한다. Calendar 탭("날짜별 공부 기억")이 과거
// 계획을 조회하므로 그 범위를 커버할 만큼은 필요하다 — 다만 서버/DB 없이
// localStorage 상한만 늘리는 것으로 충분하다(60일치 plan은 문자 기준 20KB
// 안팎이라 quota 부담이 없다). StudyRecord의 MAX_STORED_RECORDS와 같은
// "작고 저렴한 cap" 선례를 그대로 따른다.
const MAX_STORED_PLAN_DAYS = 60;

export const MIN_PLAN_TARGET_MINUTES = 10;
export const MAX_PLAN_TARGET_MINUTES = 3000;

function isValidTargetMinutes(value: number): boolean {
  return (
    Number.isFinite(value) &&
    Number.isInteger(value) &&
    value >= MIN_PLAN_TARGET_MINUTES &&
    value <= MAX_PLAN_TARGET_MINUTES
  );
}

function generatePlanItemId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `plan-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// trim + 연속 공백 1개로 축약 + 소문자 비교만 한다. 의미 기반/유사어 매칭은
// 하지 않는다("네트워크" ≠ "컴퓨터 네트워크") — 사용자가 계획과 정확히 같은
// 표기로 공부해야 매칭된다. StudyRecord.subject 원본은 절대 건드리지 않고,
// 비교할 때만 이 함수를 통과시킨다.
export function normalizeSubjectForPlanMatch(subject: string): string {
  return subject.trim().replace(/\s+/g, " ").toLowerCase();
}

function isDailyStudyPlanItem(value: unknown): value is DailyStudyPlanItem {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    typeof item.subject === "string" &&
    typeof item.targetMinutes === "number" &&
    isValidTargetMinutes(item.targetMinutes)
  );
}

function isDailyStudyPlan(value: unknown): value is DailyStudyPlan {
  if (typeof value !== "object" || value === null) return false;
  const plan = value as Record<string, unknown>;
  return (
    typeof plan.dayStart === "number" &&
    Number.isFinite(plan.dayStart) &&
    Array.isArray(plan.items) &&
    plan.items.every(isDailyStudyPlanItem)
  );
}

// 저장된 계획 전체(최신순, 최대 MAX_STORED_PLAN_DAYS개). Calendar 탭이 과거
// 날짜의 계획을 조회할 때 쓴다 — 여기서 계획을 만들거나 수정하지 않는다
// (편집은 여전히 loadDailyPlan/saveDailyPlan을 통해 Home "오늘 계획"에서만).
export function loadDailyPlanHistory(): DailyStudyPlan[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(DAILY_STUDY_PLAN_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return [];
    const plans = (parsed as Record<string, unknown>).plans;
    if (!Array.isArray(plans)) return [];
    return plans.filter(isDailyStudyPlan);
  } catch {
    return [];
  }
}

// 오늘(now 기준) 계획. 없으면 null — "아직 오늘 계획을 안 세움"과
// "items가 빈 계획"은 다른 상태다(전자는 null, 후자는 items: []).
export function loadDailyPlan(now: number = Date.now()): DailyStudyPlan | null {
  const dayStart = dayBoundaries(now)[0];
  return loadDailyPlanHistory().find((plan) => plan.dayStart === dayStart) ?? null;
}

// dayStart 기준 upsert 후 최신순으로 MAX_STORED_PLAN_DAYS개만 남긴다.
export function saveDailyPlan(plan: DailyStudyPlan): void {
  if (typeof window === "undefined") return;
  const rest = loadDailyPlanHistory().filter((p) => p.dayStart !== plan.dayStart);
  const next = [plan, ...rest]
    .sort((a, b) => b.dayStart - a.dayStart)
    .slice(0, MAX_STORED_PLAN_DAYS);
  try {
    window.localStorage.setItem(
      DAILY_STUDY_PLAN_STORAGE_KEY,
      JSON.stringify({ plans: next }),
    );
  } catch {
    // 용량 초과 / 저장 차단 등 — 계획 저장 실패가 핵심 공부 흐름을 막지 않는다.
  }
}

// CRUD 화면 진입용. 빈 계획은 실제 아이템이 추가되기 전까지 저장하지 않는다
// (빈 계획으로 스토리지를 오염시키지 않는다).
export function loadOrCreateDailyPlan(now: number = Date.now()): DailyStudyPlan {
  return loadDailyPlan(now) ?? { dayStart: dayBoundaries(now)[0], items: [] };
}

export interface AddPlanItemResult {
  plan: DailyStudyPlan;
  success: boolean;
  reason?: "invalid_subject" | "invalid_target" | "duplicate_subject";
}

// 순수 함수 — 저장은 호출부(CRUD 화면)가 saveDailyPlan()으로 한다
// (lib/characterCustomization.ts의 purchaseAccessory와 같은 패턴).
export function addPlanItem(
  plan: DailyStudyPlan,
  subject: string,
  targetMinutes: number,
): AddPlanItemResult {
  const trimmed = subject.trim();
  if (trimmed === "") {
    return { plan, success: false, reason: "invalid_subject" };
  }
  if (!isValidTargetMinutes(targetMinutes)) {
    return { plan, success: false, reason: "invalid_target" };
  }
  const key = normalizeSubjectForPlanMatch(trimmed);
  const isDuplicate = plan.items.some(
    (item) => normalizeSubjectForPlanMatch(item.subject) === key,
  );
  if (isDuplicate) {
    return { plan, success: false, reason: "duplicate_subject" };
  }
  const nextItem: DailyStudyPlanItem = {
    id: generatePlanItemId(),
    subject: trimmed,
    targetMinutes,
  };
  return { plan: { ...plan, items: [...plan.items, nextItem] }, success: true };
}

// 유효하지 않은 targetMinutes면 아무것도 바꾸지 않고 그대로 돌려준다(호출부가
// 이미 입력을 검증했다는 전제지만, 방어적으로 한 번 더 확인한다).
export function updatePlanItemTarget(
  plan: DailyStudyPlan,
  itemId: string,
  targetMinutes: number,
): DailyStudyPlan {
  if (!isValidTargetMinutes(targetMinutes)) return plan;
  return {
    ...plan,
    items: plan.items.map((item) =>
      item.id === itemId ? { ...item, targetMinutes } : item,
    ),
  };
}

// 계획 항목만 지운다 — StudyRecord는 절대 건드리지 않는다. 그 subject의
// 공부 기록/통계/Memory는 삭제 후에도 그대로 남는다.
export function removePlanItem(plan: DailyStudyPlan, itemId: string): DailyStudyPlan {
  return { ...plan, items: plan.items.filter((item) => item.id !== itemId) };
}

// plan.items 각각에 대해 오늘 진척을 계산한다. 레코드 개수를 세지 않고
// elapsedSeconds를 합산한다 — "초 단위로 먼저 합산, 마지막에 한 번만 분으로
// 내림"(floor) 원칙을 따른다(세션마다 나눠 floor하면 초 단위 손실이 누적된다).
//
// plan.dayStart가 실제 오늘인지는 이 함수가 검사하지 않는다 — 호출부가
// loadDailyPlan(now)로 이미 올바른 날의 계획을 넘긴다는 계약이다(순수 derivation).
export function getDailyPlanProgress(
  plan: DailyStudyPlan | null,
  records: StudyRecord[],
  now: number = Date.now(),
): DailyPlanProgress[] {
  if (!plan || plan.items.length === 0) return [];

  const [dayStart, dayEnd] = dayBoundaries(now);
  const today = records.filter((record) => {
    const at = new Date(record.completedAt).getTime();
    return !Number.isNaN(at) && at >= dayStart && at < dayEnd;
  });

  return plan.items.map((item) => {
    const key = normalizeSubjectForPlanMatch(item.subject);
    const studiedSeconds = today
      .filter((record) => normalizeSubjectForPlanMatch(record.subject) === key)
      .reduce((sum, record) => sum + Math.max(0, record.elapsedSeconds), 0);
    const targetSeconds = item.targetMinutes * 60;
    const remainingSeconds = Math.max(0, targetSeconds - studiedSeconds);
    return {
      subject: item.subject,
      targetMinutes: item.targetMinutes,
      studiedSeconds,
      studiedMinutes: Math.floor(studiedSeconds / 60),
      // ceil — 다 안 끝났는데 반올림 때문에 "0분 남음"으로 보이지 않게.
      remainingMinutes: Math.ceil(remainingSeconds / 60),
      isCompleted: studiedSeconds >= targetSeconds,
    };
  });
}

// 계획 전체가 완료됐는지. 빈 계획(progress.length === 0 — 계획이 없거나
// items가 비어있는 경우 둘 다)은 항상 false로 처리한다 — [].every(...)가 true를
// 반환하는 함정 때문에 "계획을 아예 안 세운 사용자"가 "계획을 다 채운 사용자"로
// 오판되는 일을 원천 차단한다.
export function isDailyPlanFullyCompleted(progress: DailyPlanProgress[]): boolean {
  if (progress.length === 0) return false;
  return progress.every((p) => p.isCompleted);
}

// 이번 세션(아직 StudyRecord로 저장되기 전)이 "오늘 계획 전체를 방금 막
// 완료시켰는지" 판정한다. before(이 세션 반영 전)가 이미 완료 상태였다면
// 무조건 false — 이미 끝난 계획에 세션을 더 쌓아도 "막 완료"로 재판정되지
// 않는다(캐릭터의 반복 축하, reward의 중복 보너스 지급을 막는 핵심 안전장치).
// 계획이 없거나 빈 계획이면 당연히 false(위 가드로 처리).
export function didCompleteDailyPlanWithSession(
  plan: DailyStudyPlan | null,
  records: StudyRecord[],
  subject: string,
  elapsedSeconds: number,
  now: number = Date.now(),
): boolean {
  if (!plan || plan.items.length === 0) return false;
  const progressBefore = getDailyPlanProgress(plan, records, now);
  if (isDailyPlanFullyCompleted(progressBefore)) return false;

  const key = normalizeSubjectForPlanMatch(subject);
  return progressBefore.every((p) => {
    if (normalizeSubjectForPlanMatch(p.subject) !== key) return p.isCompleted;
    return p.studiedSeconds + elapsedSeconds >= p.targetMinutes * 60;
  });
}

// 오늘 계획 항목들의 targetMinutes 합. 계획이 없으면 0.
// Daily Plan 전체 완료 보너스의 최소 계획량 게이트(lib/studyRewards.ts)에서 쓴다.
export function getDailyPlanTotalTargetMinutes(plan: DailyStudyPlan | null): number {
  if (!plan) return 0;
  return plan.items.reduce((sum, item) => sum + item.targetMinutes, 0);
}
