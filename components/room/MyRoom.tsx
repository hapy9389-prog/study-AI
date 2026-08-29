"use client";

import { useState } from "react";
import CharacterFace from "@/components/character/CharacterFace";
import { formatTotalStudyTime } from "@/lib/mockData";
import { loadStudyRewardState } from "@/lib/studyRewards";
import type { CharacterAccessoryId, StudyRewardState } from "@/lib/types";

// 홈 idle 화면의 "내 공간" 요약. 공부를 완료할수록 코인/누적 공부시간이 쌓인다.
// 방 그림 자체는 상단 Hero(HomeHeroRoom)와 전체화면(MyRoomScreen)에서 보여주므로
// 여기서는 성장 정보 + 진입 버튼만 담는다(중복 방지).
//
// 이 컴포넌트는 idle 에서만 렌더되므로 매 공부 세션(→ RESET) 후 새로 마운트되고,
// 그때 loadStudyRewardState() 로 최신 상태를 읽는다(StudyMemoryList 와 같은 패턴).

// 방 안의 다온. HomeHeroRoom / MyRoomScreen 둘 다 이 형태로 RoomScene 에 넘긴다.
export function MyRoomCharacter({
  equippedAccessoryId,
  size = "default",
}: {
  equippedAccessoryId: CharacterAccessoryId | null;
  size?: "default" | "hero";
}) {
  const scale = size === "hero" ? "scale-[0.7]" : "scale-[0.55]";
  return (
    <div
      className={`absolute bottom-3 left-1/2 -translate-x-1/2 ${scale} origin-bottom`}
    >
      <CharacterFace expression="happy" accessoryId={equippedAccessoryId} />
    </div>
  );
}

interface MyRoomProps {
  onOpenRoom: () => void;
  onOpenCustomization: () => void;
}

export default function MyRoom({ onOpenRoom, onOpenCustomization }: MyRoomProps) {
  const [state] = useState<StudyRewardState>(() => loadStudyRewardState());

  return (
    <section className="px-6">
      <p className="text-xs font-medium text-warm-gray">내 공간</p>

      <dl className="mt-2 flex flex-col gap-1.5">
        <div className="flex justify-between gap-4 text-sm">
          <dt className="shrink-0 text-warm-gray">지금까지 함께 공부한 시간</dt>
          <dd className="text-right text-cocoa">
            {formatTotalStudyTime(state.totalStudyMinutes)}
          </dd>
        </div>
        <div className="flex justify-between gap-4 text-sm">
          <dt className="shrink-0 text-warm-gray">보유 코인</dt>
          <dd className="text-right text-cocoa">{state.coins}</dd>
        </div>
      </dl>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onOpenRoom}
          className="btn-secondary flex-1"
        >
          내 방 크게 보기
        </button>
        <button
          type="button"
          onClick={onOpenCustomization}
          className="btn-secondary flex-1"
        >
          다온 꾸미기
        </button>
      </div>
    </section>
  );
}
