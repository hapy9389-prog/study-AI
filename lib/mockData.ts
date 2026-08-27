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
    proud: "그치! 나도 옆에서 보면서 뿌듯했어.",
    tired: "힘들었지만 그래도 끝까지 했네, 대단해!",
    fun: "재밌었다니 다행이다! 나도 같이 즐거웠어.",
  },
};

// targetMinutes is a goal the user set, not a measured elapsed time (no
// timer yet — Phase 3) — so this line never implies "집중했다", only that
// the goal was that many minutes.
export function buildReactionLine(subject: string, targetMinutes: number): string {
  return `오늘 ${subject} 공부했구나! 목표는 ${targetMinutes}분이었지! 어땠어?`;
}

export function buildMemoryLine(subject: string): string {
  return `오늘 공부한 주제: ${subject}`;
}
