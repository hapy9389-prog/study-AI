// "조금 힘들어" 이후 — 사용자가 직접 고른 어려움(StudyStrainReason)에 대해 최근
// 학습 기록을 참고한 짧은 학습 도움을 만드는 데 필요한 상수/헬퍼.
//
// 패턴 감지(lib/studyMood.ts)와는 별개다 — 이쪽은 signal 이 감지되고 사용자가
// "조금 힘들어"라고 확인한 뒤의 흐름만 담당한다. 상담/진단 아님.
// client(칩 렌더) + server(프롬프트 한 줄, fallback) 양쪽에서 쓴다 — side-effect 없음.

// feeling(공부를 끝낸 전체 느낌)과 다른 개념이다. 같은 enum 으로 합치지 않는다.
export type StudyStrainReason =
  | "difficulty"
  | "focus"
  | "workload"
  | "fatigue"
  | "other";

const STRAIN_REASON_IDS = new Set<string>([
  "difficulty",
  "focus",
  "workload",
  "fatigue",
  "other",
]);

export function isStudyStrainReason(value: unknown): value is StudyStrainReason {
  return typeof value === "string" && STRAIN_REASON_IDS.has(value);
}

// 사용자-facing 칩. FeelingChoice { id, label } 형태를 그대로 미러링한다.
// UI 에 "difficulty/focus..." 같은 내부 id 는 노출하지 않는다.
export const STRAIN_REASON_CHOICES: { id: StudyStrainReason; label: string }[] = [
  { id: "difficulty", label: "내용이 어려워" },
  { id: "focus", label: "집중이 잘 안 돼" },
  { id: "workload", label: "공부량이 부담돼" },
  { id: "fatigue", label: "그냥 지쳤어" },
  { id: "other", label: "직접 말할래" },
];

// reason 선택 단계 / 자유 입력 단계의 캐릭터 말풍선. persona 별로 크게 다를 필요가
// 없는 전이 문구라 공통으로 둔다.
export const STRAIN_REASON_PROMPT = "어떤 점이 제일 버거웠어?";
export const STRAIN_FREETEXT_PROMPT = "어떤 점이 힘들었는지 편하게 말해줘.";

// LLM 프롬프트에 넣는 "사용자가 직접 고른 것" 한 줄(서버 전용 사용).
// freeText 는 사용자 입력 데이터 — 호출부에서 clamp 한 값을 넘긴다.
export function strainReasonPromptLine(
  reason: StudyStrainReason,
  freeText?: string,
): string {
  switch (reason) {
    case "difficulty":
      return "사용자는 공부 내용 자체가 어렵다고 말했다.";
    case "focus":
      return "사용자는 공부하는 동안 집중이 잘 되지 않는다고 말했다.";
    case "workload":
      return "사용자는 공부량이 부담된다고 말했다.";
    case "fatigue":
      return "사용자는 그냥 지쳤다고 말했다.";
    case "other":
      return `사용자가 직접 말한 것: ${freeText && freeText.trim() !== "" ? freeText : "(내용 없음)"}`;
  }
}

// /api/reaction 실패 시 fallback. 캐릭터별 15줄을 만들지 않고 reason별 5줄만 둔다
// (실패는 드물고, 필요한 건 공감 + 작은 제안 하나뿐). 진단 표현 없음.
export const STUDY_SUPPORT_FALLBACK: Record<StudyStrainReason, string> = {
  difficulty:
    "내용이 어렵게 느껴졌구나. 다음엔 한 번에 개념 하나만 잡고, 끝나고 네 말로 한 줄 정리해보는 건 어때?",
  focus:
    "집중이 잘 안 됐구나. 다음엔 처음부터 길게 잡기보다 25분만 짧게 집중해보는 것도 괜찮아.",
  workload:
    "공부량이 부담됐구나. 다음엔 오늘 할 걸 작게 쪼개서 한 덩어리만 먼저 해보는 건 어때?",
  fatigue:
    "많이 힘들었겠다. 다음엔 5분 정도 쉬었다가, 짧게만 시작해보는 것도 괜찮아.",
  other:
    "그랬구나. 다음엔 조금 더 작은 목표 하나만 잡고 시작해보는 건 어때?",
};

export function getStudySupportFallback(reason: StudyStrainReason): string {
  return STUDY_SUPPORT_FALLBACK[reason];
}
