"use client";

import { useState } from "react";
import CharacterFace from "@/components/character/CharacterFace";
import { DEFAULT_CHARACTER_ID, type CharacterId } from "@/lib/characters";
import { formatTotalStudyTime } from "@/lib/mockData";
import { loadStudyRecords } from "@/lib/studyRecords";
import { loadStudyRewardState } from "@/lib/studyRewards";
import { getWeekTotalStudyMinutes } from "@/lib/studyStats";
import type { CharacterAccessoryId, StudyRewardState } from "@/lib/types";

// 홈 idle 화면의 "내 공간" 요약. "이번 주 공부시간"(StudyRecord 기반)과 코인 status,
// 방/꾸미기 진입 버튼만 담는다. 방 그림은 상단 Hero(HomeHeroRoom)에서 보여주므로 여기선 생략.
//
// 이 컴포넌트는 idle 에서만 렌더되므로 매 공부 세션(→ RESET) 후 새로 마운트되고,
// 그때 loadStudyRewardState()/loadStudyRecords() 로 최신 상태를 읽는다
// (CalendarScreen 과 같은 패턴). 이번 주 표시는 통계 탭과 같은 주간 경계를 쓴다.

// 방 안의 동반자. HomeHeroRoom / MyRoomScreen 둘 다 이 형태로 RoomScene 에 넘긴다.
export function MyRoomCharacter({
  characterId = DEFAULT_CHARACTER_ID,
  equippedAccessoryId,
  size = "default",
}: {
  characterId?: CharacterId;
  equippedAccessoryId: CharacterAccessoryId | null;
  size?: "default" | "hero";
}) {
  const scale = size === "hero" ? "scale-[0.7]" : "scale-[0.55]";
  return (
    <div
      className={`absolute bottom-3 left-1/2 -translate-x-1/2 ${scale} origin-bottom`}
    >
      <CharacterFace
        expression="happy"
        accessoryId={equippedAccessoryId}
        characterId={characterId}
      />
    </div>
  );
}

interface MyRoomProps {
  onOpenCustomization: () => void;
}

export default function MyRoom({ onOpenCustomization }: MyRoomProps) {
  const [state] = useState<StudyRewardState>(() => loadStudyRewardState());
  const [records] = useState(() => loadStudyRecords());
  const [now] = useState(() => Date.now());

  return (
    <section className="px-6">
      <p className="text-xs font-medium text-warm-gray">내 공간</p>

      <dl className="mt-2 flex flex-col gap-1.5">
        <div className="flex justify-between gap-4 text-sm">
          <dt className="shrink-0 text-warm-gray">이번 주 누적 공부 시간</dt>
          <dd className="text-right text-cocoa">
            {formatTotalStudyTime(getWeekTotalStudyMinutes(records, now))}
          </dd>
        </div>
        <div className="flex justify-between gap-4 text-sm">
          <dt className="shrink-0 text-warm-gray">보유 코인</dt>
          <dd className="text-right text-cocoa">{state.coins}</dd>
        </div>
      </dl>

      {/* 방·캐릭터와 직접 관련된 secondary action. 공부 시작 CTA 보다 강조되지
          않는다. 방 자체는 이미 위 Hero(CharacterArea)에 크게 노출돼 있으므로
          별도의 "내 방 크게 보기" 진입점은 두지 않는다. */}
      <div className="mt-3">
        <button
          type="button"
          onClick={onOpenCustomization}
          className="btn-secondary w-full"
        >
          내 공부 친구
        </button>
      </div>
    </section>
  );
}
