// 현재 선택된 공부 동반자 id 의 localStorage 영속화. 값은 CharacterId 문자열
// 하나뿐이다(이름·성격 등은 저장하지 않는다). 다른 store 들과 같은 패턴 —
// SSR 안전, 깨진 값이면 조용히 무시.

import {
  isCharacterId,
  type CharacterId,
} from "./characters";

const SELECTED_CHARACTER_STORAGE_KEY = "study-ai:selected-character:v1";

// 기존 사용자(캐릭터 선택 기능 이전부터 쓰던 사람) 판정용 — 이 중 하나라도
// 있으면 "이미 다온과 공부해온 사용자"로 보고 선택 화면을 건너뛴다.
const EXISTING_DATA_KEYS = [
  "study-ai:study-reward:v1",
  "study-ai:study-records",
  "study-ai:character-customization:v1",
  "study-ai:character-growth:v1",
];

// 저장된 선택 캐릭터 id. 고른 적 없으면 null(→ 선택 화면). 깨진 값도 null.
export function loadSelectedCharacterId(): CharacterId | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SELECTED_CHARACTER_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const candidate = (parsed as Record<string, unknown>).selectedCharacterId;
    return isCharacterId(candidate) ? candidate : null;
  } catch {
    return null;
  }
}

export function saveSelectedCharacterId(id: CharacterId): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      SELECTED_CHARACTER_STORAGE_KEY,
      JSON.stringify({ selectedCharacterId: id }),
    );
  } catch {
    // no-op — 선택 저장 실패가 앱을 막지 않는다(다음 실행에 다시 물어볼 뿐).
  }
}

// 이전 버전에서 공부 데이터를 남긴 사용자인가? (선택 화면 강제 노출 방지용)
export function hasExistingStudyData(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return EXISTING_DATA_KEYS.some(
      (key) => window.localStorage.getItem(key) !== null,
    );
  } catch {
    return false;
  }
}
