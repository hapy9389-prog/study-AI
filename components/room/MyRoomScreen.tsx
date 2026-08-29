import RoomScene from "@/components/room/RoomScene";
import { MyRoomCharacter } from "@/components/room/MyRoom";
import ScreenShell from "@/components/layout/ScreenShell";
import { characterSubject, type CharacterId } from "@/lib/characters";
import { formatTotalStudyTime } from "@/lib/mockData";
import type { CharacterAccessoryId, StudyRewardState } from "@/lib/types";

interface MyRoomScreenProps {
  characterId: CharacterId;
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
  characterId,
  rewardState,
  equippedAccessoryId,
  todayStudyMinutes,
  onBack,
}: MyRoomScreenProps) {
  return (
    <ScreenShell
      onBack={onBack}
      title="내 공간"
      subtitle={`친구에게는 이렇게 보여요 · 공부한 만큼 방과 ${characterSubject(characterId)} 자라요`}
    >
      <RoomScene
        stage={rewardState.roomStage}
        character={
          <MyRoomCharacter
            characterId={characterId}
            equippedAccessoryId={equippedAccessoryId}
          />
        }
      />

      <dl className="flex flex-col gap-2">
        {todayStudyMinutes !== null && (
          <div className="stat-row">
            <dt className="text-xs text-warm-gray">오늘 공부</dt>
            <dd className="text-sm font-medium text-cocoa">
              {todayStudyMinutes}분
            </dd>
          </div>
        )}
        <div className="stat-row">
          <dt className="text-xs text-warm-gray">지금까지 함께 공부한 시간</dt>
          <dd className="text-sm font-medium text-cocoa">
            {formatTotalStudyTime(rewardState.totalStudyMinutes)}
          </dd>
        </div>
      </dl>
    </ScreenShell>
  );
}
