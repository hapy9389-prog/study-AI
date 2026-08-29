// Mock data for the UI prototype. No real AI/DB — the character info and
// feeling-related copy here are all static; study subject/time now come
// from the user (see lib/types.ts StudySession), fed into the template
// functions below.

import type { ReactionData, MemoryResult } from "./types";

export const moodBadges: string[] = ["호기심 많음", "오늘도 배우고 싶음", "나를 믿고 있음"];

export const reactionData: ReactionData = {
  choices: [
    { id: "proud", label: "뿌듯해" },
    { id: "tired", label: "조금 힘들었어" },
    { id: "fun", label: "재밌었어" },
  ],
};

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

// 캐릭터별 회고/반응 fallback 대사는 lib/characterVoice.ts 로 옮겼다
// (getCharacterVoice(id)). API 실패 시 CharacterReaction 이 그걸 쓴다.
