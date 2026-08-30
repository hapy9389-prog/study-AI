// 캐릭터별 정적 대사 — API 실패 시 클라이언트 fallback + feeling 단계 말풍선처럼
// LLM 을 아예 안 타는 자리. 클라이언트에서 import 되므로 프롬프트 prose 는 넣지
// 않는다(그건 서버 전용 lib/characterPersonas.ts).

import { DEFAULT_CHARACTER_ID, type CharacterId } from "./characters";
import type { FeelingSemantic, ReflectionEvidence } from "./types";

interface CharacterVoice {
  /** 감상 선택 단계 말풍선. "오늘 {subject} 공부했구나! {together} 같이 있었네. 어땠어?" */
  reactionLine: (subject: string, together: string) => string;
  /** /api/reflection 실패 시 회고 질문. */
  reflectionQuestion: string;
  /** 추가 질문 fallback. */
  followUpQuestion: string;
  /**
   * /api/reaction 실패 시 마무리 한마디. clarity(회고에서 최종 도달한 판정)가
   * partial/unclear 면 조금 더 흐릿한 결로, 그 외(clear·미지정)엔 기본 문장.
   * "실패/틀림/다시 공부" 뉘앙스나 압박은 넣지 않는다.
   */
  closingLine: (subject: string, clarity?: ReflectionEvidence) => string;
  /**
   * aiReaction 이 없을 때 done 화면 말풍선(3단계 감상별). 조회 전 반드시
   * normalizeFeelingId() 로 신규/legacy id 를 semantic 으로 바꾼 뒤 인덱싱한다.
   */
  responseLines: Record<FeelingSemantic, string>;
  /**
   * 최근 공부 감정 패턴이 감지됐을 때만(cooldown 통과) 쓰는 확인 대사.
   * ask 는 /api/reaction 실패 시 fallback — 관찰 + 조심스러운 질문, 물음표로 끝.
   *   "슬럼프/번아웃/우울" 같은 진단·조언 표현 금지. 반복해서 캐묻지 않는다.
   * acceptOk / acceptHard 는 사용자가 [괜찮아] / [조금 힘들어] 를 고른 뒤의 짧은
   *   수용 문구 — 항상 이 고정 문구를 쓴다(LLM 안 탐). 조언·계획 변경 없이 종료.
   */
  moodCheck: { ask: string; acceptOk: string; acceptHard: string };
  /** Home 상단 캐릭터 말풍선 — 오늘 계획(Daily Study Plan) 진척 상태별 대사(lib/dailyPlanBubble.ts). */
  dailyPlan: DailyPlanVoice;
}

// Home 캐릭터 말풍선의 오늘 계획 상태별 대사. 문장 "구조"(어떤 정보를 담을지)는
// lib/dailyPlanBubble.ts 하나가 결정하고, 여기서는 캐릭터별 어미/말투만 채운다.
export interface DailyPlanVoice {
  /** 오늘 계획이 없을 때 고정 문구. */
  noPlan: string;
  /** 계획은 있지만 아직 시작 전. subjects는 describeSubjects()로 이미 조립된 나열. */
  notStarted: (subjects: string) => string;
  /** 일부 진행 중(완료 항목 없음). remaining은 formatTotalStudyTime()로 이미 포맷됨. */
  inProgress: (subject: string, remaining: string) => string;
  /** 하나 이상 완료 + 남은 항목 있음. rest는 과목명 1개 또는 "N 과목". */
  partiallyCompleted: (doneSubject: string, rest: string) => string;
  /** 오늘 계획 전체 완료 고정 문구. */
  allCompleted: string;
}

// clarity 별 fallback 마무리. clear/미지정은 base 를 그대로 쓴다.
function buildClosingLine(
  base: (subject: string) => string,
  partial: (subject: string) => string,
  unclear: (subject: string) => string,
): CharacterVoice["closingLine"] {
  return (subject, clarity) => {
    if (clarity === "partial") return partial(subject);
    if (clarity === "unclear") return unclear(subject);
    return base(subject);
  };
}

// 캐릭터별 어미만 다르게 넣고 문장 구조는 공유하는 factory — buildClosingLine과 같은 패턴.
function buildDailyPlanVoice(words: {
  noPlan: string;
  notStartedEnding: string; // "오늘은 {subjects}를 " 뒤에 붙는 마무리. 예: "하기로 했구나."
  remainingEnding: string; // "{subject}는 이제 {remaining} " 뒤에 붙는 마무리. 예: "정도 남았어."
  doneEnding: string; // "{doneSubject}는 " 뒤에 붙는 마무리. 예: "다 했네."
  restRemainingEnding: string; // "이제 {rest} " 뒤에 붙는 마무리. 예: "남았어."
  allCompleted: string;
}): DailyPlanVoice {
  return {
    noPlan: words.noPlan,
    notStarted: (subjects) => `오늘은 ${subjects}를 ${words.notStartedEnding}`,
    inProgress: (subject, remaining) =>
      `${subject}는 이제 ${remaining} ${words.remainingEnding}`,
    partiallyCompleted: (doneSubject, rest) =>
      `${doneSubject}는 ${words.doneEnding} 이제 ${rest} ${words.restRemainingEnding}`,
    allCompleted: words.allCompleted,
  };
}

const VOICES: Record<CharacterId, CharacterVoice> = {
  daon: {
    reactionLine: (subject, together) =>
      `오늘 ${subject} 공부했구나! ${together} 같이 있었네. 어땠어?`,
    reflectionQuestion: "오늘 공부한 것 중에 제일 기억나는 건 뭐야?",
    followUpQuestion: "오늘 본 것 중에 이름이라도 기억나는 게 하나 있어?",
    closingLine: buildClosingLine(
      (subject) => `오늘 ${subject} 이야기는 여기까지 같이 기억해둘게.`,
      (subject) => `오늘 ${subject}는 아직 조금 흐릿하지만, 그대로 같이 기억해둘게.`,
      (subject) => `오늘 ${subject}는 희미하게 남았네. 그것도 괜찮아, 여기 같이 둘게.`,
    ),
    responseLines: {
      positive: "오늘 그 마음이 옆에서도 보였어.",
      neutral: "그런 날도 있지. 여기까지 같이 있었어.",
      negative: "오늘은 좀 힘들었구나. 여기까지 같이 있었던 것만으로도 괜찮아.",
    },
    moodCheck: {
      ask: "요즘 공부가 조금 버겁게 느껴지는 날이 많았네. 괜찮아?",
      acceptOk: "알겠어. 그럼 오늘도 여기까지 같이 기억해둘게.",
      acceptHard: "그랬구나. 요즘은 조금 힘 빼고 가도 괜찮아.",
    },
    dailyPlan: buildDailyPlanVoice({
      noPlan: "오늘은 어떤 공부를 해볼까?",
      notStartedEnding: "하기로 했구나.",
      remainingEnding: "정도 남았어.",
      doneEnding: "다 했네.",
      restRemainingEnding: "남았어.",
      allCompleted: "오늘 하기로 한 공부는 다 끝냈네.",
    }),
  },
  character_b: {
    reactionLine: (subject, together) =>
      `오늘 ${subject} 했구나. ${together} 곁에 있었어. 어땠어?`,
    reflectionQuestion: "오늘 공부한 것 중에 하나만 짚어보면 뭐가 남아?",
    followUpQuestion: "떠오르는 말이나 개념 하나만 있어?",
    closingLine: buildClosingLine(
      (subject) => `오늘 ${subject}, 여기까지 기억해둘게.`,
      (subject) => `오늘 ${subject}는 아직 좀 흐릿하네. 그대로 기억해둘게.`,
      (subject) => `오늘 ${subject}는 희미하게 남았어. 그것도 여기 둘게.`,
    ),
    responseLines: {
      positive: "그럴 만해. 옆에서 봤어.",
      neutral: "그런 날도 있지. 여기까지 온 걸로 됐어.",
      negative: "힘든 날이었네. 여기까지 온 것만으로 됐어.",
    },
    moodCheck: {
      ask: "요즘 공부가 버겁게 느껴지는 날이 잦았어. 괜찮아?",
      acceptOk: "알겠어. 오늘은 여기까지 기억해둘게.",
      acceptHard: "그랬구나. 요즘은 좀 덜어내고 가도 돼.",
    },
    dailyPlan: buildDailyPlanVoice({
      noPlan: "오늘은 뭘 공부해볼래?",
      notStartedEnding: "하기로 했네.",
      remainingEnding: "남았네.",
      doneEnding: "다 했어.",
      restRemainingEnding: "남았네.",
      allCompleted: "오늘 하기로 한 공부, 다 끝냈네.",
    }),
  },
  character_c: {
    reactionLine: (subject, together) =>
      `오늘 ${subject} 공부했구나. ${together} 같이 있었어. 어땠어?`,
    reflectionQuestion: "오늘 공부한 것 중에 제일 오래 남는 건 뭐야?",
    followUpQuestion: "오늘 본 것 중에 하나만 떠올려볼래?",
    closingLine: buildClosingLine(
      (subject) => `오늘 ${subject} 이야기, 여기 잘 넣어둘게.`,
      (subject) => `오늘 ${subject}는 아직 조금 흐릿하지만, 그대로 넣어둘게.`,
      (subject) => `오늘 ${subject}는 희미하게 남았네. 그것도 괜찮아, 여기 둘게.`,
    ),
    responseLines: {
      positive: "응, 나도 옆에서 그 마음이 보였어.",
      neutral: "그런 날도 있지. 여기까지 같이 있었으면 됐어.",
      negative: "오늘은 좀 무거웠구나. 여기까지 같이 있었으면 됐어.",
    },
    moodCheck: {
      ask: "요즘엔 힘들었다는 말이 조금 자주 들리네. 공부가 버겁게 느껴져?",
      acceptOk: "응, 알겠어. 오늘 시간도 여기 잘 넣어둘게.",
      acceptHard: "그랬구나. 요즘은 천천히, 가볍게 가도 괜찮아.",
    },
    dailyPlan: buildDailyPlanVoice({
      noPlan: "오늘은 어떤 공부를 해볼까?",
      notStartedEnding: "하기로 했구나.",
      remainingEnding: "정도만 더 하면 돼.",
      doneEnding: "다 했네.",
      restRemainingEnding: "남았어.",
      allCompleted: "오늘 하기로 한 공부는 다 끝냈네.",
    }),
  },
};

export function getCharacterVoice(id: CharacterId): CharacterVoice {
  return VOICES[id] ?? VOICES[DEFAULT_CHARACTER_ID];
}
