// 캐릭터별 정적 대사 — API 실패 시 클라이언트 fallback + feeling 단계 말풍선처럼
// LLM 을 아예 안 타는 자리. 클라이언트에서 import 되므로 프롬프트 prose 는 넣지
// 않는다(그건 서버 전용 lib/characterPersonas.ts).

import { DEFAULT_CHARACTER_ID, type CharacterId } from "./characters";

interface CharacterVoice {
  /** 감상 선택 단계 말풍선. "오늘 {subject} 공부했구나! {together} 같이 있었네. 어땠어?" */
  reactionLine: (subject: string, together: string) => string;
  /** /api/reflection 실패 시 회고 질문. */
  reflectionQuestion: string;
  /** 추가 질문 fallback. */
  followUpQuestion: string;
  /** /api/reaction 실패 시 마무리 한마디. */
  closingLine: (subject: string) => string;
  /** aiReaction 이 없을 때 done 화면 말풍선(감상별). */
  responseLines: { proud: string; tired: string; fun: string };
}

const VOICES: Record<CharacterId, CharacterVoice> = {
  daon: {
    reactionLine: (subject, together) =>
      `오늘 ${subject} 공부했구나! ${together} 같이 있었네. 어땠어?`,
    reflectionQuestion: "오늘 공부한 것 중에 제일 기억나는 건 뭐야?",
    followUpQuestion: "오늘 본 것 중에 이름이라도 기억나는 게 하나 있어?",
    closingLine: (subject) => `오늘 ${subject} 이야기는 여기까지 같이 기억해둘게.`,
    responseLines: {
      proud: "그치, 나도 옆에서 보면서 뿌듯했어.",
      tired: "오늘은 좀 힘들었구나. 여기까지 같이 있었던 것만으로도 괜찮아.",
      fun: "재밌었다니, 나도 옆에서 괜히 궁금해졌어.",
    },
  },
  character_b: {
    reactionLine: (subject, together) =>
      `오늘 ${subject} 했구나. ${together} 곁에 있었어. 어땠어?`,
    reflectionQuestion: "오늘 공부한 것 중에 하나만 짚어보면 뭐가 남아?",
    followUpQuestion: "떠오르는 말이나 개념 하나만 있어?",
    closingLine: (subject) => `오늘 ${subject}, 여기까지 기억해둘게.`,
    responseLines: {
      proud: "그럴 만해. 옆에서 봤어.",
      tired: "힘든 날이었네. 여기까지 온 것만으로 됐어.",
      fun: "재밌었구나. 그런 날이 있으면 좋지.",
    },
  },
  character_c: {
    reactionLine: (subject, together) =>
      `오늘 ${subject} 공부했구나. ${together} 같이 있었어. 어땠어?`,
    reflectionQuestion: "오늘 공부한 것 중에 제일 오래 남는 건 뭐야?",
    followUpQuestion: "오늘 본 것 중에 하나만 떠올려볼래?",
    closingLine: (subject) => `오늘 ${subject} 이야기, 여기 잘 넣어둘게.`,
    responseLines: {
      proud: "응, 나도 옆에서 그 마음이 보였어.",
      tired: "오늘은 좀 무거웠구나. 여기까지 같이 있었으면 됐어.",
      fun: "재밌었다니 다행이야. 그런 날은 오래 남더라.",
    },
  },
};

export function getCharacterVoice(id: CharacterId): CharacterVoice {
  return VOICES[id] ?? VOICES[DEFAULT_CHARACTER_ID];
}
