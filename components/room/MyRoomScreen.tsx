import RoomScene from "@/components/room/RoomScene";
import { MyRoomCharacter } from "@/components/room/MyRoom";
import { formatTotalStudyTime } from "@/lib/mockData";
import type { CharacterAccessoryId, StudyRewardState } from "@/lib/types";

interface MyRoomScreenProps {
  rewardState: StudyRewardState;
  equippedAccessoryId: CharacterAccessoryId | null;
  /** 오늘 공부한 분(app/page.tsx 가 StudyRecord 에서 계산). 아직 없으면 null. */
  todayStudyMinutes: number | null;
  onBack: () => void;
}

// "내 공간" 전체 화면. 친구 방(FriendRoomScreen)과 대응되는, 내 공개 Study Space.
// 실제 현재 상태(roomStage / 누적 공부시간 / 장착한 다온 액세서리)를 그대로 쓴다.
//
// 공개 정보만 보여준다 — 캐릭터·방·공부시간. coin(개인 재화)·회고 답변·evidence·
// AI 대화·CharacterGrowth 관심도는 넣지 않는다.
export default function MyRoomScreen({
  rewardState,
  equippedAccessoryId,
  todayStudyMinutes,
  onBack,
}: MyRoomScreenProps) {
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

        <h1 className="mt-2 text-xl font-semibold text-cocoa">내 공간</h1>
        <p className="mt-1 text-xs text-warm-gray">
          친구에게는 이렇게 보여요 · 공부한 만큼 방과 다온이가 자라요
        </p>

        <RoomScene
          stage={rewardState.roomStage}
          character={
            <MyRoomCharacter equippedAccessoryId={equippedAccessoryId} />
          }
        />

        <dl className="mt-4 flex flex-col gap-2">
          {todayStudyMinutes !== null && (
            <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 shadow-sm">
              <dt className="text-xs text-warm-gray">오늘 공부</dt>
              <dd className="text-sm font-medium text-cocoa">
                {todayStudyMinutes}분
              </dd>
            </div>
          )}
          <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 shadow-sm">
            <dt className="text-xs text-warm-gray">지금까지 공부</dt>
            <dd className="text-sm font-medium text-cocoa">
              {formatTotalStudyTime(rewardState.totalStudyMinutes)}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
