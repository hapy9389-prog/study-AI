import PostStudyCharacter from "@/components/character/PostStudyCharacter";
import {
  buildMemoryMessage,
  clarityDoneLine,
  feelingDisplayLabel,
  formatTotalStudyTime,
  memoryResult,
  normalizeFeelingId,
  toMinutes,
} from "@/lib/mockData";
import { characterNickname, type CharacterId } from "@/lib/characters";
import { getCharacterVoice } from "@/lib/characterVoice";
import type {
  CharacterAccessoryId,
  FeelingChoice,
  ReflectionEvidence,
  RoomStage,
  StudyRewardResult,
} from "@/lib/types";

interface StudyCompletionSceneProps {
  characterId: CharacterId;
  subject: string;
  elapsedSeconds: number;
  feelingId: FeelingChoice["id"];
  /** /api/reaction 이 만든 마무리 한마디. 없으면 정적 fallback. */
  aiReaction?: string;
  /** 장착된 액세서리(있으면). */
  equippedAccessoryId?: CharacterAccessoryId | null;
  /** 이번 세션 보상. 완료 저장 가드를 통과한 경우에만 채워진다. */
  reward?: StudyRewardResult;
  /** 회고에서 최종 도달한 판정. 실제 판정이 없었으면 undefined(문구 표시 안 함). */
  reflectionClarity?: ReflectionEvidence;
  onStartNew: () => void;
}

// 방 단계가 새로 올라갔을 때만 한 줄. (RewardResultCard 와 같은 문구 — 작은 중복 허용)
const STAGE_UNLOCK_MESSAGE: Record<RoomStage, string> = {
  1: "",
  2: "방에 작은 스탠드와 러그가 생겼어요.",
  3: "방에 책장이 생기고 조명이 더 따뜻해졌어요.",
};

// done 화면. 카드 스택/결과 통계창이 아니라 cream 위 하나의 조용한 마무리 장면.
// 계층은 spacing + typography + 얇은 divider + 말풍선으로만 만든다.
//
// presentation 전용 — reward 계산 / StudyRecord 저장 / localStorage 는 여기서 하지
// 않는다(전부 app/page.tsx 가 이미 처리한 값을 props 로 받는다).
export default function StudyCompletionScene({
  characterId,
  subject,
  elapsedSeconds,
  feelingId,
  aiReaction,
  equippedAccessoryId,
  reward,
  reflectionClarity,
  onStartNew,
}: StudyCompletionSceneProps) {
  const closingLine =
    aiReaction ??
    getCharacterVoice(characterId).responseLines[normalizeFeelingId(feelingId)];
  const feelingText = feelingDisplayLabel(feelingId);
  const minutes = toMinutes(elapsedSeconds);
  const clarityLine = clarityDoneLine(reflectionClarity);

  const stageChanged =
    reward !== undefined && reward.previousRoomStage !== reward.roomStage;
  const unlockMessage = stageChanged ? STAGE_UNLOCK_MESSAGE[reward.roomStage] : "";

  return (
    <section className="flex flex-col gap-6 px-6 pt-2">
      {/* 1. 캐릭터의 조용한 완료 반응 */}
      <div className="flex flex-col items-center gap-3">
        <PostStudyCharacter
          characterId={characterId}
          expression="happy"
          accessoryId={equippedAccessoryId}
          size="md"
        />
        <div className="daon-bubble w-full max-w-[300px]">{closingLine}</div>
      </div>

      {/* 2. 오늘의 공부 기억 — 기억 탭 카드와 같은 왼쪽 tick motif. 시각은 표시 안 함. */}
      <div>
        <p className="text-xs font-medium text-warm-gray">
          {buildMemoryMessage(characterNickname(characterId))}
        </p>
        <div className="mt-2 border-l-2 border-peach-deep/50 pl-3">
          <p className="font-serif text-lg font-bold text-cocoa">{subject}</p>
          <p className="mt-0.5 text-xs text-warm-gray">
            {minutes}분{feelingText && ` · ${feelingText}`}
          </p>
          {clarityLine && (
            <p className="mt-1 text-xs text-warm-gray">{clarityLine}</p>
          )}
        </div>
      </div>

      {/* 3. 오늘 쌓인 것 — 작게. 보상이 화면에서 가장 큰 요소가 되지 않게. */}
      {reward && (
        <div className="border-t border-warm-line pt-4">
          <p className="text-xs font-medium text-warm-gray">오늘 쌓인 것</p>
          {/* earnedCoins가 0이면(오늘 새 milestone을 못 넘김) 코인 부분을 생략한다 —
              "+0 코인"처럼 실패로 읽히는 표현을 피한다. */}
          <p className="mt-1 text-sm text-cocoa">
            {reward.earnedMinutes}분 공부
            {reward.earnedCoins > 0 && ` · +${reward.earnedCoins} 코인`}
          </p>
          {reward.reachedMilestoneMinutes !== undefined && (
            <p className="mt-0.5 text-[11px] text-warm-gray">
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
        </div>
      )}

      {/* 4. 다음으로 이어짐 + CTA */}
      <div className="flex flex-col gap-3">
        <p className="text-sm text-warm-gray">{memoryResult.nextStudyNudge}</p>
        <button type="button" onClick={onStartNew} className="btn-primary">
          새 공부 시작하기
        </button>
      </div>
    </section>
  );
}
