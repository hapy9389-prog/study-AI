import CharacterScene, { type SceneKind } from "./CharacterScene";
import HomeHeroRoom from "@/components/room/HomeHeroRoom";
import {
  characterSubject,
  DEFAULT_CHARACTER_ID,
  type CharacterId,
} from "@/lib/characters";
import type {
  CharacterAccessoryId,
  Expression,
  RoomStage,
  ViewState,
} from "@/lib/types";

interface CharacterAreaProps {
  phase: ViewState;
  /** 현재 선택된 동반자. 생략 시 다온. */
  characterId?: CharacterId;
  /** idle 상단 Hero 방 단계. app/page.tsx rewardState 가 source. idle 에서만 쓴다. */
  roomStage?: RoomStage;
  /** 캐릭터에 장착된 액세서리. 모든 phase 에서 유지된다. */
  equippedAccessoryId?: CharacterAccessoryId | null;
}

// 홈 idle Hero 말풍선의 기본 문구. 지금은 캐릭터 공통 — 향후 이 자리를
// characterId 기반 조회로 바꾸면 캐릭터별 home voice 가 연결된다.
const HOME_GREETING = {
  primary: "오늘은 뭐 공부할까?",
  secondary: "끝나면 나도 알고 싶어!",
};

const expressionByPhase: Record<ViewState, Expression> = {
  idle: "curious",
  studying: "quiet",
  reaction: "curious",
  done: "happy",
};

// phase → 장면. 공부 중에만 책상 장면, 나머지는 쉬는/대기 장면.
const sceneByPhase: Record<ViewState, SceneKind> = {
  idle: "resting",
  studying: "studying",
  reaction: "resting",
  done: "resting",
};

// Core product rule: during `studying`, 다온 never speaks or throws an event —
// only a static, calm "함께 있어요" label is shown. The reaction dialogue for
// `reaction`/`done` lives in CharacterReaction/StudyMemoryCard, not here, so
// there's never a duplicate speech bubble on screen.
export default function CharacterArea({
  phase,
  characterId = DEFAULT_CHARACTER_ID,
  roomStage = 1,
  equippedAccessoryId,
}: CharacterAreaProps) {
  // idle: 동반자가 "실제 내 방 안에" 있는 모습이 먼저 보이고, 말풍선도 그 방
  // 장면 안에 얹힌다 — 캐릭터가 방에서 말을 거는 하나의 장면. 그 아래 공부 입력이
  // 화면의 주인공이 된다.
  if (phase === "idle") {
    return (
      <HomeHeroRoom
        characterId={characterId}
        roomStage={roomStage}
        equippedAccessoryId={equippedAccessoryId ?? null}
        speech={HOME_GREETING}
      />
    );
  }

  return (
    <section className="flex flex-col items-center gap-3 px-6">
      <CharacterScene
        scene={sceneByPhase[phase]}
        expression={expressionByPhase[phase]}
        accessoryId={equippedAccessoryId}
        characterId={characterId}
      />

      {phase === "studying" && (
        <p className="font-serif text-sm text-warm-gray">
          {characterSubject(characterId)} 조용히 함께 있어요
        </p>
      )}
    </section>
  );
}
