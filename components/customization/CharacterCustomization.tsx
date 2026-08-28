import CharacterFace from "@/components/character/CharacterFace";
import { CHARACTER_ACCESSORIES } from "@/lib/characterCustomization";
import type {
  CharacterAccessoryId,
  CharacterCustomizationState,
} from "@/lib/types";

interface CharacterCustomizationProps {
  coins: number;
  customization: CharacterCustomizationState;
  onPurchase: (id: CharacterAccessoryId) => void;
  onEquip: (id: CharacterAccessoryId) => void;
  onUnequip: () => void;
  onBack: () => void;
}

// 공부로 번 coin 으로 다온 액세서리를 사고 장착하는 화면. SocialCheckInScreen 과
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
  coins,
  customization,
  onPurchase,
  onEquip,
  onUnequip,
  onBack,
}: CharacterCustomizationProps) {
  const { ownedAccessoryIds, equippedAccessoryId } = customization;

  return (
    <div className="flex min-h-screen w-full justify-center bg-warm-gray/10">
      <div className="flex min-h-screen w-full max-w-[430px] flex-col bg-cream px-6 py-8 shadow-xl">
        <button
          type="button"
          onClick={onBack}
          className="self-start rounded-full px-2 py-1 text-sm text-warm-gray transition-colors hover:text-cocoa"
        >
          ← 돌아가기
        </button>

        <h1 className="mt-2 text-xl font-semibold text-cocoa">다온 꾸미기</h1>

        <div className="mt-5 flex justify-center">
          <CharacterFace
            expression="happy"
            accessoryId={equippedAccessoryId}
          />
        </div>

        <p className="mt-5 text-sm font-medium text-cocoa">
          보유 코인 {coins}
        </p>

        <ul className="mt-3 flex flex-col gap-2">
          {CHARACTER_ACCESSORIES.map((accessory) => {
            const owned = ownedAccessoryIds.includes(accessory.id);
            const equipped = equippedAccessoryId === accessory.id;
            const affordable = coins >= accessory.price;

            return (
              <li
                key={accessory.id}
                className="flex items-center gap-3 rounded-2xl bg-white px-3 py-3 shadow-sm"
              >
                <AccessoryPreview id={accessory.id} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-cocoa">
                    {accessory.name}
                  </p>
                  <p className="text-xs text-warm-gray">
                    {accessory.price} coin
                  </p>
                </div>

                {!owned && affordable && (
                  <button
                    type="button"
                    onClick={() => onPurchase(accessory.id)}
                    className="shrink-0 rounded-full bg-peach px-4 py-2 text-xs font-medium text-cocoa transition-colors hover:bg-peach-deep"
                  >
                    구매
                  </button>
                )}
                {!owned && !affordable && (
                  <button
                    type="button"
                    disabled
                    className="shrink-0 rounded-full bg-warm-gray/15 px-4 py-2 text-xs font-medium text-warm-gray"
                  >
                    코인 부족
                  </button>
                )}
                {owned && !equipped && (
                  <button
                    type="button"
                    onClick={() => onEquip(accessory.id)}
                    className="shrink-0 rounded-full bg-lavender px-4 py-2 text-xs font-medium text-cocoa transition-colors hover:bg-lavender-deep hover:text-white"
                  >
                    장착
                  </button>
                )}
                {owned && equipped && (
                  <button
                    type="button"
                    onClick={onUnequip}
                    className="shrink-0 rounded-full bg-lavender-deep px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-cocoa"
                  >
                    장착 해제
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
