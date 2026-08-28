import CharacterScene, { type SceneKind } from "./CharacterScene";
import { moodBadges } from "@/lib/mockData";
import type { CharacterAccessoryId, Expression, ViewState } from "@/lib/types";

interface CharacterAreaProps {
  phase: ViewState;
  /** 다온에 장착된 액세서리. 모든 phase 에서 유지된다. */
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

// Core product rule: during `studying`, 다온 never speaks or throws an event —
// only a static, calm "함께 있어요" label is shown. The reaction dialogue for
// `reaction`/`done` lives in CharacterReaction/StudyMemoryCard, not here, so
// there's never a duplicate speech bubble on screen.
export default function CharacterArea({
  phase,
  equippedAccessoryId,
}: CharacterAreaProps) {
  return (
    <section className="flex flex-col items-center gap-3 px-6">
      <CharacterScene
        scene={sceneByPhase[phase]}
        expression={expressionByPhase[phase]}
        accessoryId={equippedAccessoryId}
      />

      {phase === "idle" && (
        <div className="max-w-[260px] rounded-2xl bg-white px-4 py-3 text-center text-sm shadow-sm">
          <p>오늘은 뭐 공부할 거야?</p>
          <p className="text-warm-gray">끝나면 나도 알고 싶어!</p>
        </div>
      )}

      {phase === "studying" && (
        <p className="text-xs text-warm-gray">다온이가 조용히 함께 있어요</p>
      )}

      <div className="mt-1 flex flex-wrap justify-center gap-2">
        {moodBadges.map((badge) => (
          <span
            key={badge}
            className="rounded-full bg-lavender px-3 py-1 text-xs font-medium text-cocoa"
          >
            {badge}
          </span>
        ))}
      </div>
    </section>
  );
}
