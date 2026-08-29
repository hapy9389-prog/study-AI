import CharacterFace from "@/components/character/CharacterFace";
import ScreenShell from "@/components/layout/ScreenShell";
import { getCharacter, type CharacterId } from "@/lib/characters";
import { CHARACTER_ACCESSORIES } from "@/lib/characterCustomization";
import type {
  CharacterAccessoryId,
  CharacterCustomizationState,
} from "@/lib/types";

interface CharacterCustomizationProps {
  characterId: CharacterId;
  coins: number;
  customization: CharacterCustomizationState;
  onPurchase: (id: CharacterAccessoryId) => void;
  onEquip: (id: CharacterAccessoryId) => void;
  onUnequip: () => void;
  onOpenCharacterSelect: () => void;
  onBack: () => void;
}

// "내 공부 친구" 화면. 상단은 현재 동반자(외형/이름/소개 + 다른 친구 선택하기),
// 아래는 공부로 번 coin 으로 액세서리를 사고 장착하는 기존 기능. SocialCheckInScreen 과
// 같은 자체 센터드 셸(바텀 네비 없음). 상태 계산/저장은 app/page.tsx 가 하고
// 여기서는 표시 + 콜백만 한다. 구매 확인 모달 없음 — 클릭 즉시 처리.

// 카드용 소형 아이콘. CharacterFace 오버레이와 목적은 같지만 얼굴 기준 위치가
// 아니라 독립 아이콘이라 따로 그린다(작은 중복 허용).
function AccessoryPreview({ id }: { id: CharacterAccessoryId }) {
  if (id === "glasses") {
    return (
      <span className="relative inline-block h-8 w-10">
        <span className="absolute left-0 top-1 h-4 w-4 rounded-full border-2 border-cocoa/80" />
        <span className="absolute right-0 top-1 h-4 w-4 rounded-full border-2 border-cocoa/80" />
        <span className="absolute left-1/2 top-[10px] h-[2px] w-2 -translate-x-1/2 bg-cocoa/80" />
      </span>
    );
  }
  if (id === "hat") {
    return (
      <span className="relative inline-block h-8 w-10">
        <span className="absolute bottom-1 left-1/2 h-1.5 w-10 -translate-x-1/2 rounded-full bg-cocoa/80" />
        <span className="absolute bottom-[10px] left-1/2 h-5 w-6 -translate-x-1/2 rounded-t-xl bg-cocoa/80" />
      </span>
    );
  }
  if (id === "headphones") {
    return (
      <span className="relative inline-block h-8 w-10">
        <span className="absolute left-1/2 top-0 h-5 w-8 -translate-x-1/2 rounded-t-full border-[3px] border-b-0 border-lavender-deep" />
        <span className="absolute bottom-1 left-1 h-4 w-2.5 rounded bg-lavender-deep" />
        <span className="absolute bottom-1 right-1 h-4 w-2.5 rounded bg-lavender-deep" />
      </span>
    );
  }
  // star-pin
  return (
    <span className="inline-flex h-8 w-10 items-center justify-center text-2xl leading-none text-peach-deep">
      ★
    </span>
  );
}

export default function CharacterCustomization({
  characterId,
  coins,
  customization,
  onPurchase,
  onEquip,
  onUnequip,
  onOpenCharacterSelect,
  onBack,
}: CharacterCustomizationProps) {
  const { ownedAccessoryIds, equippedAccessoryId } = customization;
  const character = getCharacter(characterId);

  return (
    <ScreenShell onBack={onBack} title="내 공부 친구">
      {/* 현재 친구 — 카드로 감싸지 않는다(카드 안에 카드 금지). cream 위에 바로. */}
      <div className="relative flex flex-col items-center gap-2 pt-2">
        <span
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-6 h-32 w-32 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,var(--color-peach)_0%,transparent_70%)] opacity-50 blur-2xl"
        />
        <div className="relative">
          <CharacterFace
            expression="happy"
            accessoryId={equippedAccessoryId}
            characterId={characterId}
          />
        </div>
        <p className="relative mt-1 text-base font-medium text-cocoa">
          {character.name}
        </p>
        <p className="relative max-w-[260px] text-center text-xs leading-relaxed text-warm-gray">
          {character.tagline}
        </p>
        <button
          type="button"
          onClick={onOpenCharacterSelect}
          className="btn-secondary relative mt-2"
        >
          다른 친구 선택하기
        </button>
      </div>

      <div className="border-t border-warm-line pt-4">
        <div className="flex items-baseline justify-between">
          <p className="text-xs font-medium text-warm-gray">꾸미기</p>
          <p className="text-xs text-warm-gray">
            보유 코인 <span className="font-semibold text-cocoa">{coins}</span>
          </p>
        </div>
        <ul className="mt-2 flex flex-col gap-2">
        {CHARACTER_ACCESSORIES.map((accessory) => {
          const owned = ownedAccessoryIds.includes(accessory.id);
          const equipped = equippedAccessoryId === accessory.id;
          const affordable = coins >= accessory.price;

          const statusText = equipped
            ? "장착 중"
            : owned
              ? "보유 중"
              : `${accessory.price} 코인`;

          return (
            <li
              key={accessory.id}
              className={`list-row ${
                equipped ? "ring-1 ring-peach-deep" : ""
              }`}
            >
              <AccessoryPreview id={accessory.id} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-cocoa">{accessory.name}</p>
                <p
                  className={`text-xs ${
                    equipped ? "text-peach-deep" : "text-warm-gray"
                  }`}
                >
                  {statusText}
                </p>
              </div>

              {!owned && affordable && (
                <button
                  type="button"
                  onClick={() => onPurchase(accessory.id)}
                  className="shrink-0 rounded-full bg-peach-deep px-4 py-2.5 text-sm font-medium text-cocoa transition hover:brightness-95"
                >
                  구매
                </button>
              )}
              {!owned && !affordable && (
                <button
                  type="button"
                  disabled
                  className="shrink-0 rounded-full bg-warm-gray/15 px-4 py-2.5 text-sm font-medium text-warm-gray"
                >
                  코인 부족
                </button>
              )}
              {owned && !equipped && (
                <button
                  type="button"
                  onClick={() => onEquip(accessory.id)}
                  className="shrink-0 rounded-full border border-peach-deep bg-white px-4 py-2.5 text-sm font-medium text-cocoa transition-colors hover:bg-peach/30"
                >
                  장착
                </button>
              )}
              {owned && equipped && (
                <button
                  type="button"
                  onClick={onUnequip}
                  className="shrink-0 rounded-full border border-warm-gray/30 bg-white px-4 py-2.5 text-sm font-medium text-warm-gray transition-colors hover:bg-cream-deep"
                >
                  장착 해제
                </button>
              )}
            </li>
          );
        })}
        </ul>
      </div>
    </ScreenShell>
  );
}
