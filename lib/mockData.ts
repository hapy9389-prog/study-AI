// Mock data for the UI prototype. No real AI/DB — the character info and
// feeling-related copy here are all static; study subject/time now come
// from the user (see lib/types.ts StudySession), fed into the template
// functions below.

import type { Character, ReactionData, MemoryResult } from "./types";

export const daon: Character = {
  name: "다온",
  age: 8,
  mood: "호기심 가득",
  currentInterest: "아직 없음",
};

export const moodBadges: string[] = ["호기심 많음", "오늘도 배우고 싶음", "나를 믿고 있음"];

export const reactionData: ReactionData = {
  choices: [
    { id: "proud", label: "뿌듯해" },
    { id: "tired", label: "조금 힘들었어" },
    { id: "fun", label: "재밌었어" },
  ],
};

export const memoryResult: MemoryResult = {
  memoryMessage: "다온이가 오늘의 공부를 기억했어요.",
  nextStudyNudge: "내일도 같이 공부해볼까?",
  responseLines: {
    proud: "그치, 나도 옆에서 보면서 뿌듯했어.",
    tired: "오늘은 좀 힘들었구나. 여기까지 같이 있었던 것만으로도 괜찮아.",
    fun: "재밌었다니, 나도 옆에서 괜히 궁금해졌어.",
  },
};

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

// elapsedSeconds는 실제 측정 시간(Phase 3) — 목표(targetMinutes)가 아니다.
// 대사에서는 분 단위로 버림해서 자연스럽게("N분 정도"), 60초 미만은 "잠깐"으로
// 표현해 "0분 정도"처럼 어색하게 보이지 않게 한다. 정확한 초는 결과 화면
// (StudyRecordSummary)에서만 보여준다.
export function buildReactionLine(subject: string, elapsedSeconds: number): string {
  const togetherPhrase =
    elapsedSeconds < 60 ? "잠깐" : `${toMinutes(elapsedSeconds)}분 정도`;
  return `오늘 ${subject} 공부했구나! ${togetherPhrase} 같이 있었네. 어땠어?`;
}

export function buildMemoryLine(subject: string): string {
  return `오늘 공부한 주제: ${subject}`;
}

// 회고 대화(Phase 8) fallback 문구. /api/reflection · /api/reaction 이 실패해도
// 흐름이 막히지 않도록 정적으로 준비해 둔다.
export const FALLBACK_REFLECTION_QUESTION = "오늘 공부한 것 중에 제일 기억나는 건 뭐야?";

// 마무리 반응 fallback. 완전히 일반적인 문장 대신 이번 공부 주제를 넣어
// API 실패 상황에서도 오늘 공부와 연결되게 한다.
export function buildFallbackClosingLine(subject: string): string {
  return `오늘 ${subject} 이야기는 여기까지 같이 기억해둘게.`;
}
