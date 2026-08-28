import type { RoomStage, StudyRewardResult } from "@/lib/types";

// done 화면 하단의 작은 보상 요약 카드. 공부 완료 시 자동 지급된 이번 세션
// 보상을 조용히 보여준다 — 수령 버튼·상자·애니메이션 없음. 숫자를 크게
// 강조하지 않는다.

interface RewardResultCardProps {
  reward: StudyRewardResult;
}

// 방 단계가 새로 올라갔을 때만 done 화면에 한 줄. 복잡한 unlock 연출은 없다.
const STAGE_UNLOCK_MESSAGE: Record<RoomStage, string> = {
  1: "",
  2: "방에 작은 스탠드와 러그가 생겼어요.",
  3: "방에 책장이 생기고 조명이 더 따뜻해졌어요.",
};

export default function RewardResultCard({ reward }: RewardResultCardProps) {
  const stageChanged = reward.previousRoomStage !== reward.roomStage;
  const unlockMessage = stageChanged ? STAGE_UNLOCK_MESSAGE[reward.roomStage] : "";

  return (
    <section className="card mx-6">
      <p className="text-lg font-semibold text-cocoa">+{reward.earnedCoins} 코인</p>
      <p className="mt-1 text-xs text-warm-gray">
        {reward.earnedMinutes}분 공부
        {reward.goalBonus > 0 && " · 목표 달성 보너스 +10"}
      </p>
      {unlockMessage && (
        <p className="milestone mt-2 text-xs font-medium text-cocoa">
          {unlockMessage}
        </p>
      )}
    </section>
  );
}
