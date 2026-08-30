"use client";

import { useState } from "react";
import CharacterScene, { type SceneKind } from "./CharacterScene";
import HomeHeroRoom from "@/components/room/HomeHeroRoom";
import {
  characterSubject,
  DEFAULT_CHARACTER_ID,
  type CharacterId,
} from "@/lib/characters";
import { loadStudyRecords } from "@/lib/studyRecords";
import { getDailyPlanProgress, loadDailyPlan } from "@/lib/dailyStudyPlan";
import {
  buildDailyPlanBubbleText,
  classifyDailyPlanBubbleState,
} from "@/lib/dailyPlanBubble";
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

// idle Hero 방 + 말풍선. CharacterArea 밖으로 분리한 이유는 훅(useState)을
// 조건부(phase === "idle" 브랜치) 안에서 호출하지 않기 위해서다(rules-of-hooks) —
// 이 컴포넌트는 idle일 때만 마운트되므로 훅을 최상위에서 그대로 호출해도 안전하다.
//
// 말풍선 문구는 오늘 계획(Daily Study Plan) 진척과 연결된다 — LLM 호출 없이
// 코드가 상태를 판정하고 캐릭터 목소리로 표현만 바꾼다(lib/dailyPlanBubble.ts).
// 이 컴포넌트는 phase가 idle을 벗어나면 완전히 unmount되므로(app/page.tsx의
// 조건부 렌더), 아래 useState 초기화는 "idle로 돌아올 때마다" 새로 실행된다 —
// 계획 생성/수정, 공부 완료 후 RESET, 날짜 변경 전부 이 재마운트를 통해 자연히
// 반영된다(MyRoom.tsx/DailyPlanHomeSection.tsx와 같은 "마운트 시점 스냅샷" 패턴).
function IdleCharacterHero({
  characterId,
  roomStage,
  equippedAccessoryId,
}: {
  characterId: CharacterId;
  roomStage: RoomStage;
  equippedAccessoryId: CharacterAccessoryId | null;
}) {
  const [dailyPlan] = useState(() => loadDailyPlan());
  const [dailyRecords] = useState(() => loadStudyRecords());
  const [dailyNow] = useState(() => Date.now());
  const dailyProgress = getDailyPlanProgress(dailyPlan, dailyRecords, dailyNow);
  const bubbleState = classifyDailyPlanBubbleState(dailyProgress);
  const speech = buildDailyPlanBubbleText(characterId, bubbleState, dailyProgress);

  return (
    <HomeHeroRoom
      characterId={characterId}
      roomStage={roomStage}
      equippedAccessoryId={equippedAccessoryId}
      speech={speech}
    />
  );
}

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
      <IdleCharacterHero
        characterId={characterId}
        roomStage={roomStage}
        equippedAccessoryId={equippedAccessoryId ?? null}
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
