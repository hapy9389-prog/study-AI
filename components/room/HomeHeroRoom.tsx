"use client";

import { useState } from "react";
import RoomScene from "@/components/room/RoomScene";
import { MyRoomCharacter } from "@/components/room/MyRoom";
import type { CharacterAccessoryId, RoomStage } from "@/lib/types";

interface HomeHeroRoomProps {
  /** 현재 방 단계. app/page.tsx 의 rewardState 가 source. */
  roomStage: RoomStage;
  /** 장착된 액세서리. app/page.tsx 의 customization 이 source. */
  equippedAccessoryId: CharacterAccessoryId | null;
}

const STAGE_PREVIEWS: RoomStage[] = [1, 2, 3];

// 홈 idle 최상단 — "다온이 실제 내 공부방 안에 있는 모습". 표현 전용:
// 데이터는 전부 props 로 받고, 여기서 상태 소스를 새로 만들지 않는다.
export default function HomeHeroRoom({
  roomStage,
  equippedAccessoryId,
}: HomeHeroRoomProps) {
  // dev 전용 미리보기. localStorage/앱 상태를 바꾸지 않는 순수 화면 토글.
  const [previewStage, setPreviewStage] = useState<RoomStage | null>(null);
  const stage = previewStage ?? roomStage;

  return (
    <div className="px-6">
      <RoomScene
        size="hero"
        stage={stage}
        character={
          <MyRoomCharacter
            equippedAccessoryId={equippedAccessoryId}
            size="hero"
          />
        }
      />

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
