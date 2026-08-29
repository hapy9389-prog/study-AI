"use client";

import { useState } from "react";
import RoomScene from "@/components/room/RoomScene";
import { MyRoomCharacter } from "@/components/room/MyRoom";
import type { CharacterId } from "@/lib/characters";
import type { CharacterAccessoryId, RoomStage } from "@/lib/types";

interface HomeHeroRoomProps {
  /** 현재 선택된 동반자. */
  characterId: CharacterId;
  /** 현재 방 단계. app/page.tsx 의 rewardState 가 source. */
  roomStage: RoomStage;
  /** 장착된 액세서리. app/page.tsx 의 customization 이 source. */
  equippedAccessoryId: CharacterAccessoryId | null;
  /**
   * 방 안 캐릭터가 건네는 한마디. 없으면 말풍선을 그리지 않는다.
   * 내용은 상위(CharacterArea)가 정하고, 여기서는 위치/표현만 책임진다 —
   * 향후 캐릭터별 home voice 를 연결할 때 이 prop 만 바꾸면 된다.
   */
  speech?: { primary: string; secondary?: string };
}

const STAGE_PREVIEWS: RoomStage[] = [1, 2, 3];

// 홈 idle 최상단 — "동반자가 실제 내 공부방 안에 있는 모습". 표현 전용:
// 데이터는 전부 props 로 받고, 여기서 상태 소스를 새로 만들지 않는다.
export default function HomeHeroRoom({
  characterId,
  roomStage,
  equippedAccessoryId,
  speech,
}: HomeHeroRoomProps) {
  // dev 전용 미리보기. localStorage/앱 상태를 바꾸지 않는 순수 화면 토글.
  const [previewStage, setPreviewStage] = useState<RoomStage | null>(null);
  const stage = previewStage ?? roomStage;

  return (
    <div className="px-6">
      {/* RoomScene(공용, 수정 금지)과 정확히 같은 박스 — 말풍선은 이 안에서만
          absolute 배치되어 Hero 밖으로 나가지 않는다. */}
      <div className="relative">
        <RoomScene
          size="hero"
          stage={stage}
          character={
            <MyRoomCharacter
              characterId={characterId}
              equippedAccessoryId={equippedAccessoryId}
              size="hero"
            />
          }
        />

        {/* 방 안 캐릭터의 한마디. 좌상단 빈 공간에 두고 tail 이 캐릭터(프레임
            중앙 하단)로 향한다. 얼굴·눈·입은 가리지 않고 배경 일부만 가린다. */}
        {speech && (
          <div className="daon-bubble absolute left-3 top-3 max-w-[66%] leading-snug">
            <p className="text-xs">{speech.primary}</p>
            {speech.secondary && (
              <p className="text-xs text-warm-gray">{speech.secondary}</p>
            )}
            <span
              aria-hidden
              className="absolute -bottom-2 right-7 h-0 w-0 border-x-8 border-t-8 border-x-transparent border-t-[color-mix(in_oklab,var(--color-lavender)_40%,var(--color-cream))]"
            />
          </div>
        )}
      </div>

      {process.env.NODE_ENV === "development" && (
        <div className="mt-2 flex items-center gap-1.5">
          <span className="rounded-full bg-warm-gray/10 px-2 py-0.5 text-[10px] text-warm-gray">
            Dev
          </span>
          {STAGE_PREVIEWS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setPreviewStage(s)}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors ${
                previewStage === s
                  ? "bg-lavender-deep text-white"
                  : "bg-warm-gray/10 text-warm-gray hover:bg-warm-gray/20"
              }`}
            >
              Stage {s}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPreviewStage(null)}
            className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors ${
              previewStage === null
                ? "bg-lavender-deep text-white"
                : "bg-warm-gray/10 text-warm-gray hover:bg-warm-gray/20"
            }`}
          >
            실제
          </button>
        </div>
      )}
    </div>
  );
}
