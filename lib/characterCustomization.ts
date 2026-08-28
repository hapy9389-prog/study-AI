// 다온 액세서리(순수 외형)의 catalog + localStorage 영속화 + 구매/장착 유틸.
// StudyReward(lib/studyRewards.ts) 와 분리된 도메인이지만 재화는 공유한다 —
// coin 의 source of truth 는 StudyRewardState.coins 하나뿐이고, 구매는 그 값을
// 감소시킬 뿐 별도 coin 을 만들지 않는다.
//
// 원칙(CLAUDE.md): 상점/인벤토리 확장 없음. 능력치·세트효과·희귀도·뽑기·강화
// 없음. 이번 단계는 "공부로 번 coin 으로 액세서리 하나를 사서 장착한다"만 한다.
// 보상 계산(calculateStudyReward 등)은 건드리지 않는다.

import type {
  CharacterAccessory,
  CharacterAccessoryId,
  CharacterCustomizationState,
  StudyRewardState,
} from "./types";

// 처음 생기는 구조라 v1. 기존 study-ai:* key 들과 분리된 새 저장소.
const CHARACTER_CUSTOMIZATION_STORAGE_KEY = "study-ai:character-customization:v1";

// 순수 외형 아이템 4개. 30분 목표달성 세션 = 40 coin 이므로 1~3세션에 하나씩
// 살 수 있는 가격대로 잡는다. 이름/가격은 데모 톤에 맞춘 값.
export const CHARACTER_ACCESSORIES: CharacterAccessory[] = [
  { id: "glasses", name: "둥근 안경", price: 30 },
  { id: "hat", name: "작은 모자", price: 50 },
  { id: "headphones", name: "헤드폰", price: 80 },
  { id: "star-pin", name: "별 머리핀", price: 100 },
];

const ACCESSORY_IDS = new Set<CharacterAccessoryId>(
  CHARACTER_ACCESSORIES.map((a) => a.id),
);

const DEFAULT_STATE: CharacterCustomizationState = {
  ownedAccessoryIds: [],
  equippedAccessoryId: null,
};

export function isAccessoryId(value: unknown): value is CharacterAccessoryId {
  return (
    typeof value === "string" &&
    ACCESSORY_IDS.has(value as CharacterAccessoryId)
  );
}

export function getAccessory(
  id: CharacterAccessoryId,
): CharacterAccessory | undefined {
  return CHARACTER_ACCESSORIES.find((a) => a.id === id);
}

// 저장된 꾸미기 상태를 읽는다. 없음 / 깨진 JSON / 잘못된 구조 / 존재하지 않는 id /
// 중복 id / owned 에 없는 equipped 어느 경우에도 앱을 깨뜨리지 않고 안전하게
// 정제한다(characterGrowth.ts 의 loadCharacterGrowth 와 동형).
export function loadCharacterCustomizationState(): CharacterCustomizationState {
  if (typeof window === "undefined") return { ...DEFAULT_STATE };
  try {
    const raw = window.localStorage.getItem(
      CHARACTER_CUSTOMIZATION_STORAGE_KEY,
    );
    if (!raw) return { ...DEFAULT_STATE };
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) {
      return { ...DEFAULT_STATE };
    }
    const candidate = parsed as Record<string, unknown>;

    // catalog 에 있는 id 만 남기고 중복 제거.
    const ownedAccessoryIds = Array.isArray(candidate.ownedAccessoryIds)
      ? Array.from(
          new Set(candidate.ownedAccessoryIds.filter(isAccessoryId)),
        )
      : [];

    // equipped 는 유효한 id 이고 owned 안에 있을 때만 유지, 아니면 null.
    const equippedAccessoryId =
      isAccessoryId(candidate.equippedAccessoryId) &&
      ownedAccessoryIds.includes(candidate.equippedAccessoryId)
        ? candidate.equippedAccessoryId
        : null;

    return { ownedAccessoryIds, equippedAccessoryId };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

// 꾸미기 상태를 저장한다. 용량 초과 / 저장 차단 등은 조용히 무시한다 —
// 꾸미기가 핵심 공부 흐름을 막지 않는다.
export function saveCharacterCustomizationState(
  state: CharacterCustomizationState,
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      CHARACTER_CUSTOMIZATION_STORAGE_KEY,
      JSON.stringify(state),
    );
  } catch {
    // no-op
  }
}

export interface PurchaseResult {
  rewardState: StudyRewardState;
  customizationState: CharacterCustomizationState;
  success: boolean;
  reason?: "already_owned" | "not_enough_coins" | "invalid_item";
}

// 액세서리 1개 구매. localStorage 에 접근하지 않는 순수 함수 — 메모리에서 다음
// 상태를 계산해 반환하고, 저장은 호출부가 한다. 실패 시 입력 상태를 그대로 돌려준다
// (coin/owned 변화 없음). 성공 시 coin 만 차감하고 나머지 reward 필드는 불변.
export function purchaseAccessory(
  rewardState: StudyRewardState,
  customizationState: CharacterCustomizationState,
  accessoryId: CharacterAccessoryId,
): PurchaseResult {
  const accessory = getAccessory(accessoryId);
  if (!accessory) {
    return {
      rewardState,
      customizationState,
      success: false,
      reason: "invalid_item",
    };
  }
  if (customizationState.ownedAccessoryIds.includes(accessoryId)) {
    return {
      rewardState,
      customizationState,
      success: false,
      reason: "already_owned",
    };
  }
  if (rewardState.coins < accessory.price) {
    return {
      rewardState,
      customizationState,
      success: false,
      reason: "not_enough_coins",
    };
  }
  return {
    rewardState: {
      ...rewardState,
      coins: rewardState.coins - accessory.price,
    },
    customizationState: {
      ownedAccessoryIds: [
        ...customizationState.ownedAccessoryIds,
        accessoryId,
      ],
      // 구매 직후 자동 장착 — 바로 외형 변화를 볼 수 있게.
      equippedAccessoryId: accessoryId,
    },
    success: true,
  };
}

// 보유한 액세서리로 장착 교체. 보유하지 않은 id 면 아무 변화 없이 반환.
export function equipAccessory(
  state: CharacterCustomizationState,
  accessoryId: CharacterAccessoryId,
): CharacterCustomizationState {
  if (!state.ownedAccessoryIds.includes(accessoryId)) return state;
  return { ...state, equippedAccessoryId: accessoryId };
}

// 장착 해제. owned 는 그대로 두고 equipped 만 null 로 — 기본 모습 복귀.
// 새 slot 시스템 없이 기존 null 상태만 활용한다.
export function unequipAccessory(
  state: CharacterCustomizationState,
): CharacterCustomizationState {
  return { ...state, equippedAccessoryId: null };
}
