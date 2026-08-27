// Mock data for the Phase 1 UI prototype. No real AI/DB — every value here is static.

import type { Character, StudyInfo, ReactionData, MemoryResult } from "./types";

export const daon: Character = {
  name: "다온",
  age: 8,
  mood: "호기심 가득",
  currentInterest: "아직 없음",
};

export const moodBadges: string[] = ["호기심 많음", "오늘도 배우고 싶음", "나를 믿고 있음"];

export const todayStudy: StudyInfo = {
  subject: "영어 회화 기초 표현",
  durationMinutes: 45,
};

export const reactionData: ReactionData = {
  characterLine: "오늘 영어 공부하는 거 옆에서 봤어! 어땠어?",
  choices: [
    { id: "proud", label: "뿌듯해" },
    { id: "tired", label: "조금 힘들었어" },
    { id: "fun", label: "재밌었어" },
  ],
};

export const memoryResult: MemoryResult = {
  rememberedTopic: "영어 회화 기초 표현",
  memoryMessage: "다온이가 오늘의 공부를 기억했어요.",
  nextStudyNudge: "내일도 같이 공부해볼까?",
  responseLines: {
    proud: "그치! 나도 옆에서 보면서 뿌듯했어.",
    tired: "힘들었지만 그래도 끝까지 했네, 대단해!",
    fun: "재밌었다니 다행이다! 나도 같이 즐거웠어.",
  },
};
