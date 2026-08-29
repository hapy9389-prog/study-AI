// Mock data for the UI prototype. No real AI/DB — the character info and
// feeling-related copy here are all static; study subject/time now come
// from the user (see lib/types.ts StudySession), fed into the template
// functions below.

import type {
  FeelingSemantic,
  ReactionData,
  MemoryResult,
  ReflectionEvidence,
} from "./types";

export const moodBadges: string[] = ["호기심 많음", "오늘도 배우고 싶음", "나를 믿고 있음"];

// 공부 후 감정 3단계 축. 칩 순서 = 이 배열 순서. UI 에 "긍정/중립/부정" 이라고
// 표기하지 않는다 — 아래 라벨(감성 copy)만 보인다.
export const reactionData: ReactionData = {
  choices: [
    { id: "positive", label: "좋았어" },
    { id: "neutral", label: "그럭저럭이었어" },
    { id: "negative", label: "힘들었어" },
  ],
};

// 감정 3단계 도입 이전 기록에 저장돼 있는 legacy id → 원래 라벨.
// 마이그레이션하지 않는다 — Memory 화면에서 그때 고른 그대로 보여준다.
const LEGACY_FEELING_LABELS: Record<string, string> = {
  proud: "뿌듯해",
  tired: "조금 힘들었어",
  fun: "재밌었어",
};

// legacy id → 3단계 semantic. 패턴 감지(lib/studyMood.ts)는 이 값으로만 판단한다.
// "fun"/"proud" 는 둘 다 non-negative 라 positive 로 합친다(감지 목적상 안전).
// 표시에는 이 함수를 쓰지 않는다 — 표시는 feelingDisplayLabel() 이 legacy 라벨을 유지.
const LEGACY_FEELING_SEMANTIC: Record<string, FeelingSemantic> = {
  proud: "positive",
  fun: "positive",
  tired: "negative",
};

export function normalizeFeelingId(feelingId: string): FeelingSemantic {
  if (feelingId === "positive" || feelingId === "neutral" || feelingId === "negative") {
    return feelingId;
  }
  return LEGACY_FEELING_SEMANTIC[feelingId] ?? "neutral";
}

// id(신규 또는 legacy) → 화면에 보여줄 한글 라벨. 알 수 없는 값은 "".
export function feelingDisplayLabel(feelingId: string): string {
  const current = reactionData.choices.find((choice) => choice.id === feelingId);
  if (current) return current.label;
  return LEGACY_FEELING_LABELS[feelingId] ?? "";
}

export const memoryResult: MemoryResult = {
  nextStudyNudge: "내일도 같이 공부해볼까?",
};

// "다온이가 오늘의 공부를 기억했어요." — 동반자 애칭이 들어간다.
export function buildMemoryMessage(nickname: string): string {
  return `${nickname}가 오늘의 공부를 기억했어요.`;
}

export function toMinutes(totalSeconds: number): number {
  return Math.floor(totalSeconds / 60);
}

// MM:SS 고정 포맷 — 60분을 넘어도 시:분 전환 없이 "65:10"처럼 자연스럽게
// 자릿수만 늘어난다 (가장 단순하고 일관된 방식).
export function formatClock(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function formatMinutesAndSeconds(totalSeconds: number): string {
  const minutes = toMinutes(totalSeconds);
  const seconds = totalSeconds % 60;
  return `${minutes}분 ${seconds}초`;
}

// 목표 미달이어도 절대 부정적 표현을 쓰지 않는다 — "실패/미달성" 대신
// 중립적인 "오늘은 N분 공부했어요"만 사용.
export function buildGoalMessage(targetMinutes: number, elapsedSeconds: number): string {
  const actualMinutes = toMinutes(elapsedSeconds);
  return actualMinutes >= targetMinutes
    ? "오늘 목표를 달성했어요"
    : `오늘은 ${actualMinutes}분 공부했어요`;
}

// 60초 미만은 "0분"으로 보이지 않도록 "잠깐"으로 자연스럽게 표현한다.
export function formatTogetherMinutes(elapsedSeconds: number): string {
  return elapsedSeconds < 60 ? "잠깐" : `${toMinutes(elapsedSeconds)}분`;
}

// 누적 공부시간(분)을 사람이 읽기 좋게. 60분 이상이면 "2시간 10분",
// 미만이면 "40분", 0이면 "0분". My Room 에서 강조 없이 작게 보여준다.
export function formatTotalStudyTime(totalMinutes: number): string {
  const safeMinutes = Math.max(0, Math.floor(totalMinutes));
  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;
  if (hours === 0) return `${minutes}분`;
  if (minutes === 0) return `${hours}시간`;
  return `${hours}시간 ${minutes}분`;
}

export function buildMemoryLine(subject: string): string {
  return `오늘 공부한 주제: ${subject}`;
}

// 회고에서 최종 도달한 판정(reflectionClarity) → 감성 문구.
// raw enum(clear/partial/unclear)은 화면에 노출하지 않는다. "실패/틀림/이해 못함"
// 같은 부정 판정 문구는 쓰지 않는다 — 모두 사용자의 소중한 공부 기록이다.

// done 화면에서 오늘 공부가 어떻게 남았는지 한 줄.
// clear 도 문구를 표시한다("선명하게 남았어요"). undefined(구 기록 · assessment
// 미수행/실패)만 빈 문자열 — 이때는 아무 줄도 그리지 않는다.
export function clarityDoneLine(clarity?: ReflectionEvidence): string {
  if (clarity === "clear") return "오늘 공부가 선명하게 남았어요.";
  if (clarity === "partial") return "오늘 공부가 조금 흐릿하게 남았어요.";
  if (clarity === "unclear") return "오늘 공부가 아직 희미하게 남아 있어요.";
  return "";
}

// Memory 카드에 붙이는 짧은 상태 라벨.
// clear 와 undefined 는 빈 문자열 — 라벨 없이 기존과 동일하게 렌더한다.
export function clarityNote(clarity?: ReflectionEvidence): string {
  if (clarity === "partial") return "조금 흐릿하게 남은 기억";
  if (clarity === "unclear") return "희미하게 남은 기억";
  return "";
}

// 캐릭터별 회고/반응 fallback 대사는 lib/characterVoice.ts 로 옮겼다
// (getCharacterVoice(id)). API 실패 시 CharacterReaction 이 그걸 쓴다.
