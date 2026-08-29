// 최근 공부를 마친 뒤 negative 감정 선택이 반복되는 "패턴"만 deterministic rule 로
// 감지한다. 의료적/심리적 진단이 아니다 — 캐릭터가 조심스레 한 번 상태를 확인할
// 뿐이다. reward / reflectionClarity / timer / stats / roomStage / CharacterGrowth 는
// 절대 건드리지 않는다.
//
// 데이터 소스는 기존 StudyRecord[] 하나뿐이고, 사용자 전체 기준으로 본다
// ("공부 감정은 사용자 상태"). 캐릭터별 필터는 하지 않는다 — loadRecentMemories 의
// character-scope("이 캐릭터가 함께한 공부만 기억")와는 다른 개념이다.
// 영구 저장하는 새 상태는 반복 질문을 막는 cooldown 1개(MOOD_CHECK_STORAGE_KEY)뿐이다.

import { normalizeFeelingId } from "./mockData";
import { loadStudyRecords } from "./studyRecords";
import type { FeelingSemantic } from "./types";

// 최근 몇 개를 볼지 / ratio·streak 임계값.
const RECENT_WINDOW = 5;
const RATIO_MIN_NEGATIVE = 3;
const STREAK_LEN = 3;

// 같은 확인 문구를 매 세션 반복하지 않기 위한 최소 cooldown.
const MOOD_CHECK_STORAGE_KEY = "study-ai:study-mood-check:v1";
export const MOOD_CHECK_COOLDOWN_MS = 5 * 24 * 60 * 60 * 1000; // 5일

export interface StudyMoodSignal {
  triggered: boolean;
  /** 실제로 본 최근 기록 수(0~RECENT_WINDOW). ratio rule 은 이 값이 정확히 RECENT_WINDOW 이상일 때만 평가. */
  recentCount: number;
  /** 최근 RECENT_WINDOW 개 중 negative 수. */
  negativeCount: number;
  /** feelings[0] 부터 이어지는 negative 길이. */
  consecutiveNegative: number;
  /** triggered 일 때만 채워진다. streak 우선. */
  reason?: "ratio" | "streak";
}

export interface MoodCheckState {
  /** 마지막으로 mood check 를 사용자에게 보여준 시각. new Date().toISOString() */
  lastPromptedAt: string;
  /** 그때 사용자가 고른 응답. v1 로직 분기엔 쓰지 않는다(표시/향후용). */
  lastOutcome: "ok" | "hard";
}

// feelings: newest-first 로 정렬된, 이미 normalize 된 semantic 배열.
export function analyzeRecentStudyMood(
  feelings: FeelingSemantic[],
): StudyMoodSignal {
  const windowSlice = feelings.slice(0, RECENT_WINDOW);
  const recentCount = windowSlice.length;
  const negativeCount = windowSlice.filter((f) => f === "negative").length;

  let consecutiveNegative = 0;
  for (const f of feelings) {
    if (f !== "negative") break;
    consecutiveNegative += 1;
  }

  // Rule B (streak): 기록이 STREAK_LEN 개 이상이고 최신 STREAK_LEN 개가 모두 negative.
  //   Rule A 와 독립 — 기록 3~4개뿐이어도 발동 가능하다.
  const streak =
    feelings.length >= STREAK_LEN && consecutiveNegative >= STREAK_LEN;

  // Rule A (ratio): 최근 기록이 RECENT_WINDOW 개 이상 존재할 때만 평가한다.
  //   기록이 3~4개뿐이면 ratio rule 이 조기 발동하지 않는다.
  const ratio =
    recentCount >= RECENT_WINDOW && negativeCount >= RATIO_MIN_NEGATIVE;

  const triggered = streak || ratio;
  return {
    triggered,
    recentCount,
    negativeCount,
    consecutiveNegative,
    reason: triggered ? (streak ? "streak" : "ratio") : undefined,
  };
}

// ── dev 전용 override ────────────────────────────────────────────────
// production 빌드에서 이 분기와 값은 사용되지 않는다(NODE_ENV 가드 + 호출부 가드).
// 실제 StudyRecord / 통계 / Memory / reward 를 오염시키지 않도록, seed 대신 detector
// 입력만 바꾼다.
let devFeelingOverride: FeelingSemantic[] | null = null;

export function __setDevMoodOverride(feelings: FeelingSemantic[] | null): void {
  if (process.env.NODE_ENV !== "development") return;
  devFeelingOverride = feelings;
}

export function __getDevMoodOverride(): FeelingSemantic[] | null {
  if (process.env.NODE_ENV !== "development") return null;
  return devFeelingOverride;
}

// 패턴 판단에 넣을 newest-first semantic 배열. 방금 고른 감정을 맨 앞에 붙인다
// (StudyRecord 는 onSelectFeeling 전까지 저장되지 않으므로). dev override 가 있으면
// 그 배열을 그대로 쓴다.
export function getRecentStudyFeelings(
  currentFeelingId: string,
): FeelingSemantic[] {
  if (process.env.NODE_ENV === "development" && devFeelingOverride) {
    return devFeelingOverride;
  }
  return [
    normalizeFeelingId(currentFeelingId),
    ...loadStudyRecords().map((r) => normalizeFeelingId(r.feelingId)),
  ];
}

// ── cooldown 상태 ───────────────────────────────────────────────────
export function loadMoodCheckState(): MoodCheckState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(MOOD_CHECK_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (
      typeof parsed?.lastPromptedAt !== "string" ||
      Number.isNaN(Date.parse(parsed.lastPromptedAt))
    ) {
      return null;
    }
    return {
      lastPromptedAt: parsed.lastPromptedAt,
      lastOutcome: parsed.lastOutcome === "hard" ? "hard" : "ok",
    };
  } catch {
    return null;
  }
}

export function saveMoodCheckState(state: MoodCheckState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MOOD_CHECK_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // 저장 차단 / 용량 초과 — mood check 은 핵심 흐름을 막지 않는다.
  }
}

// dev 전용: cooldown 을 특정 시점으로 강제하거나 지운다(테스트용).
// production 에서는 아무 것도 하지 않는다.
export function __setDevMoodCheckState(state: MoodCheckState | null): void {
  if (process.env.NODE_ENV !== "development") return;
  if (typeof window === "undefined") return;
  if (state === null) {
    try {
      window.localStorage.removeItem(MOOD_CHECK_STORAGE_KEY);
    } catch {
      // 무시 — dev 전용.
    }
    return;
  }
  saveMoodCheckState(state);
}

export function shouldPromptMoodCheck(args: {
  signal: StudyMoodSignal;
  state: MoodCheckState | null;
  now: number;
}): boolean {
  if (!args.signal.triggered) return false;
  if (!args.state) return true;
  return args.now - Date.parse(args.state.lastPromptedAt) >= MOOD_CHECK_COOLDOWN_MS;
}

// 편의: 방금 고른 감정으로 지금 mood check 을 띄워야 하는지 한 번에 계산한다.
export function evaluateMoodCheck(
  currentFeelingId: string,
  now: number = Date.now(),
): { signal: StudyMoodSignal; shouldPrompt: boolean } {
  const signal = analyzeRecentStudyMood(getRecentStudyFeelings(currentFeelingId));
  const shouldPrompt = shouldPromptMoodCheck({
    signal,
    state: loadMoodCheckState(),
    now,
  });
  return { signal, shouldPrompt };
}
