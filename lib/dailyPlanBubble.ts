// Home 상단 캐릭터 말풍선을 오늘 계획(DailyStudyPlan) 진척과 연결한다. LLM 호출 없음 —
// 상태 판정과 문장 조립은 전부 코드가 결정하고(deterministic), 캐릭터별 어휘만
// lib/characterVoice.ts의 dailyPlan voice에서 가져다 채운다("판단은 코드, 표현은
// 캐릭터 목소리" — app/api/reaction/route.ts의 DAILY_PLAN_BLOCK과 같은 철학).

import { getCharacterVoice } from "./characterVoice";
import { formatTotalStudyTime } from "./mockData";
import type { CharacterId } from "./characters";
import type { DailyPlanProgress } from "./types";

export type DailyPlanBubbleState =
  | "no-plan"
  | "not-started"
  | "in-progress"
  | "partially-completed"
  | "all-completed";

export function classifyDailyPlanBubbleState(
  progress: DailyPlanProgress[],
): DailyPlanBubbleState {
  if (progress.length === 0) return "no-plan";
  if (progress.every((p) => p.isCompleted)) return "all-completed";
  if (progress.some((p) => p.isCompleted)) return "partially-completed";
  if (progress.every((p) => p.studiedSeconds === 0)) return "not-started";
  return "in-progress";
}

// "A" / "A랑 B" / "A, B 외 N개" — 항목이 3개 이상일 때 문장이 길어지지 않게 자른다.
export function describeSubjects(names: string[]): string {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]}랑 ${names[1]}`;
  return `${names[0]}, ${names[1]} 외 ${names.length - 2}개`;
}

// 2~6을 한글 수 관형사로("두 과목" 쪽이 "2과목"보다 자연스럽다). 그 이상은 숫자로.
const KOREAN_COUNT_WORDS: Record<number, string> = {
  2: "두",
  3: "세",
  4: "네",
  5: "다섯",
  6: "여섯",
};
function describeRemainingCount(count: number): string {
  return KOREAN_COUNT_WORDS[count] ? `${KOREAN_COUNT_WORDS[count]} 과목` : `${count}과목`;
}

// in-progress 상태에서 언급할 항목 하나를 고른다: 이미 조금이라도 진행 중인
// 미완료 항목을 우선하고, 없으면(이론상 not-started로 분류돼 여기 오지 않지만
// 방어적으로) 첫 미완료 항목.
function pickInProgressFocus(progress: DailyPlanProgress[]): DailyPlanProgress {
  const incomplete = progress.filter((p) => !p.isCompleted);
  return incomplete.find((p) => p.studiedSeconds > 0) ?? incomplete[0];
}

export function buildDailyPlanBubbleText(
  characterId: CharacterId,
  state: DailyPlanBubbleState,
  progress: DailyPlanProgress[],
): string {
  const voice = getCharacterVoice(characterId).dailyPlan;

  switch (state) {
    case "no-plan":
      return voice.noPlan;
    case "all-completed":
      return voice.allCompleted;
    case "not-started":
      return voice.notStarted(describeSubjects(progress.map((p) => p.subject)));
    case "in-progress": {
      const focus = pickInProgressFocus(progress);
      return voice.inProgress(focus.subject, formatTotalStudyTime(focus.remainingMinutes));
    }
    case "partially-completed": {
      const completed = progress.filter((p) => p.isCompleted);
      const remaining = progress.filter((p) => !p.isCompleted);
      const doneSubject = completed[0].subject;
      const rest =
        remaining.length === 1
          ? remaining[0].subject
          : describeRemainingCount(remaining.length);
      return voice.partiallyCompleted(doneSubject, rest);
    }
  }
}
