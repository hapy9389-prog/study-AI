// 선택 가능한 공부 동반자 3인의 정의. "표현용" 데이터만 — 이름/한 줄 소개/외형
// 파라미터. 성격·말투(persona)는 서버 전용(lib/characterPersonas.ts)이라 여기 없다.
//
// character_b / character_c 의 name 은 디자인 방향을 나타내는 **임시 표시명**이다
// (실제 이름 미확정). 이름이 정해지면 이 배열의 name 만 고치면 전체 UI 에 반영된다.
// 내부 id("character_b" 등)와 "미확정" 개념은 UI 어디에도 노출하지 않는다.
// localStorage 에 저장되는 것도 id 뿐(이름 아님).

export type CharacterId = "daon" | "character_b" | "character_c";

export const DEFAULT_CHARACTER_ID: CharacterId = "daon";

// CharacterFace 가 읽는 외형 파라미터. 아직 실제 일러스트가 아니라 CSS placeholder —
// FriendCharacter 의 AVATAR 레코드와 같은 방식이다. hair 가 null 이면 (다온) 머리
// 요소를 그리지 않는다 → 기존 다온 렌더와 100% 동일.
export interface CharacterVisual {
  face: string; // 얼굴 원 배경 (Tailwind class)
  hair: string | null; // 상단 머리 캡 배경, null = 없음
  blush: string; // happy/excited 볼터치 색
}

export interface CharacterDefinition {
  id: CharacterId;
  /** 표시명. 이 파일이 유일한 출처. b/c 는 실제 이름 확정 전 임시 표시명. */
  name: string;
  /** 캐릭터 선택 화면 한 줄 소개(디자인 방향). */
  tagline: string;
  visual: CharacterVisual;
}

export const CHARACTERS: CharacterDefinition[] = [
  {
    id: "daon",
    name: "다온",
    tagline: "작고 말랑한, 조용히 곁에 있어주는 따뜻한 친구",
    visual: {
      face: "bg-peach",
      hair: null,
      blush: "bg-peach-deep/70",
    },
  },
  {
    id: "character_b",
    name: "차분한 친구", // 임시 표시명 (미니멀 세련형)
    tagline: "감정 표현은 작고 섬세하게, 조금 더 정돈된 친구",
    visual: {
      face: "bg-[#f1e7d9]",
      hair: "bg-cocoa/70",
      blush: "bg-lavender-deep/45",
    },
  },
  {
    id: "character_c",
    name: "감성적인 친구", // 임시 표시명 (동화풍 감성형)
    tagline: "작은 방과 책, 기억과 잘 어울리는 그림책 같은 친구",
    visual: {
      face: "bg-[#f6d4c5]",
      hair: "bg-[#c8a88e]",
      blush: "bg-peach-deep/60",
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

// "다온" → "다온이", "하루" → "하루" (받침 없는 이름엔 애칭 "이"를 안 붙인다).
export function characterNickname(id: CharacterId): string {
  const name = getCharacterName(id);
  return hasFinalConsonant(name) ? `${name}이` : name;
}

// 주격: "다온이가 …", "하루가 …".
export function characterSubject(id: CharacterId): string {
  const name = getCharacterName(id);
  return hasFinalConsonant(name) ? `${name}이가` : `${name}가`;
}
