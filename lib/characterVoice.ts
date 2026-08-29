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
  },
};

export function getCharacterVoice(id: CharacterId): CharacterVoice {
  return VOICES[id] ?? VOICES[DEFAULT_CHARACTER_ID];
}
