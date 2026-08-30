// 선택 가능한 공부 동반자 3인의 정의. "표현용" 데이터만 — 이름/한 줄 소개/외형
// 파라미터. 성격·말투(persona)는 서버 전용(lib/characterPersonas.ts)이라 여기 없다.
//
// 표시 이름(다온/결/소복)은 캐릭터 리디자인 계획의 추천안이다 — 이 배열의 name만
// 고치면 전체 UI에 반영된다. 내부 id(daon/character_b/character_c)는 표시 이름과
// 무관하게 유지한다 — StudyRecord/CharacterCustomization/selectedCharacter가 이 id로
// localStorage에 저장돼 있어 id를 바꾸면 마이그레이션이 필요해진다.

export type CharacterId = "daon" | "character_b" | "character_c";

export const DEFAULT_CHARACTER_ID: CharacterId = "daon";

// ── Visual Grammar ──────────────────────────────────────────────────────
// 메인 3인 + 향후 친구 캐릭터(Phase 2)까지 공유할 최소한의 외형 데이터. 범용 avatar
// engine이 아니라, 캐릭터 리디자인 계획(Visual Grammar 절)을 그대로 필드화한 정도다.
// bodyShape(체형) / signature(정적 구조 특징) / sceneTrait(장면 한정 포즈)는 서로 다른
// 축이라 값이 겹치지 않는다 — 하나의 필드가 여러 의미를 동시에 떠안지 않게 하기 위함.

/** 체형 앵커 3종. 모든 캐릭터(메인+친구)는 이 중 하나를 고른다. */
export type BodyShape = "round" | "boxy" | "slender";

/** 표정 테이블 위에 얹는 baseline 눈 크기 modifier. 캐릭터별 "원래 눈이 가늘다/크다". */
export type EyeOpenness = "narrow" | "normal" | "wide";

// 정적 구조 특징 — 모든 scene/scale에서 항상 그려진다(CharacterFace). 실루엣 식별의
// 핵심이라 착탈 가능한 소품(accessory)과는 절대 섞지 않는다. 캐릭터당 정확히 1개.
export type SignatureFeatureId =
  | "asymmetric-cowlick" // 다온 — 정수리 오른쪽에 비대칭으로 솟은 삐침머리
  | "folded-hood-ear" // 결 — 후드 한쪽 귀가 늘 접혀 있음
  | "trailing-sleeves"; // 소복 — 소매가 길어 손이 거의 안 보임

// 장면 한정 포즈/행동 — 선택적(0~1개). resting scene에서만 CharacterScene이 그리며,
// 실루엣 식별 대상이 아니라 보너스 표현이다(그레이스케일/축소 테스트 대상 아님).
export type SceneTraitId = "book-on-lap"; // 소복 — 무릎 위에 작은 책을 안고 있는 자세

export interface CharacterVisual {
  face: string; // 얼굴 원 배경 (Tailwind class)
  hair: string | null; // 상단 머리 캡 배경, null = 없음
  blush: string; // happy/excited 볼터치 색
  bodyShape: BodyShape;
  eyeOpenness: EyeOpenness;
  signature: SignatureFeatureId;
  /** 대부분 캐릭터는 없음(null/undefined) — 소복만 사용. */
  sceneTrait?: SceneTraitId | null;
}

export interface CharacterDefinition {
  id: CharacterId;
  /** 표시명. 이 파일이 유일한 출처. */
  name: string;
  /** 캐릭터 선택 화면 한 줄 소개 — 이 캐릭터의 정서적 역할을 담는다. */
  tagline: string;
  visual: CharacterVisual;
}

export const CHARACTERS: CharacterDefinition[] = [
  {
    id: "daon",
    name: "다온",
    tagline: "혼자 하면 자꾸 딴 데로 새서, 너랑 같이 있어야 그나마 오래 붙어 있어",
    visual: {
      face: "bg-peach",
      hair: null,
      blush: "bg-peach-deep/70",
      bodyShape: "round",
      eyeOpenness: "wide",
      signature: "asymmetric-cowlick",
      sceneTrait: null,
    },
  },
  {
    id: "character_b",
    name: "결",
    tagline: "말은 적지만 작은 변화는 다 알아채는, 부담 없는 친구",
    visual: {
      face: "bg-[#f1e7d9]",
      hair: "bg-cocoa/70",
      blush: "bg-lavender-deep/45",
      bodyShape: "boxy",
      eyeOpenness: "narrow",
      signature: "folded-hood-ear",
      sceneTrait: null,
    },
  },
  {
    id: "character_c",
    name: "소복",
    tagline: "작은 공부들을 조용히 기억해두고, 가끔 꺼내 보여주는 친구",
    visual: {
      face: "bg-[#f6d4c5]",
      hair: "bg-[#c8a88e]",
      blush: "bg-peach-deep/60",
      bodyShape: "slender",
      eyeOpenness: "normal",
      signature: "trailing-sleeves",
      sceneTrait: "book-on-lap",
    },
  },
];

const CHARACTER_IDS = new Set<CharacterId>(CHARACTERS.map((c) => c.id));

export function isCharacterId(value: unknown): value is CharacterId {
  return typeof value === "string" && CHARACTER_IDS.has(value as CharacterId);
}

export function getCharacter(id: CharacterId): CharacterDefinition {
  return CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];
}

export function getCharacterName(id: CharacterId): string {
  return getCharacter(id).name;
}

// 마지막 글자에 받침이 있는지. 한글 음절만 본다(아니면 false).
function hasFinalConsonant(word: string): boolean {
  const last = word.trim().at(-1);
  if (!last) return false;
  const code = last.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return false;
  return (code - 0xac00) % 28 !== 0;
}

// "다온" → "다온이", "결" → "결이" (받침 없는 이름엔 애칭 "이"를 안 붙인다).
export function characterNickname(id: CharacterId): string {
  const name = getCharacterName(id);
  return hasFinalConsonant(name) ? `${name}이` : name;
}

// 주격: "다온이가 …", "결이가 …".
export function characterSubject(id: CharacterId): string {
  const name = getCharacterName(id);
  return hasFinalConsonant(name) ? `${name}이가` : `${name}가`;
}
