import { formatTotalStudyTime } from "@/lib/mockData";
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
      <p className="text-xs text-warm-gray">{reward.earnedMinutes}분 공부</p>
      {/* earnedCoins가 0이면(오늘 새 milestone을 못 넘김) 이 줄 자체를 생략한다 —
          "+0 코인"처럼 실패로 읽히는 표현을 피한다. */}
      {reward.earnedCoins > 0 && (
        <p className="mt-1 text-base font-semibold text-cocoa">
          +{reward.earnedCoins} 코인
        </p>
      )}
      {reward.reachedMilestoneMinutes !== undefined && (
        <p className="milestone mt-2 text-xs font-medium text-cocoa">
          오늘 누적 {formatTotalStudyTime(reward.reachedMilestoneMinutes)} 달성
        </p>
      )}
      {reward.dailyPlanCompletedNow && (
        <p className="milestone mt-2 text-xs font-medium text-cocoa">
          오늘 계획한 공부를 모두 채웠어요
        </p>
      )}
      {unlockMessage && (
        <p className="milestone mt-2 text-xs font-medium text-cocoa">
          {unlockMessage}
        </p>
      )}
    </section>
  );
}
