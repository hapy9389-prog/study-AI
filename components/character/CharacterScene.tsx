import type { ReactNode } from "react";
import CharacterFace from "./CharacterFace";
import type { CharacterAccessoryId, Expression } from "@/lib/types";
import {
  DEFAULT_CHARACTER_ID,
  getCharacter,
  type CharacterId,
  type SceneTraitId,
} from "@/lib/characters";

export type SceneKind = "resting" | "studying";

// 장면 한정 포즈(sceneTrait) 레지스트리 — resting scene에서만 조회한다. signature와
// 달리 실루엣 식별 대상이 아니라 보너스 표현이라, characterId가 아니라 sceneTrait id로
// 판단한다(Phase 2에서 다른 캐릭터가 같은 sceneTrait을 가져도 자동으로 같은 연출을
// 받는다). 지금은 1개뿐이지만 늘어나도 이 컴포넌트의 분기는 늘지 않는다.
const SCENE_TRAITS: Partial<Record<SceneTraitId, ReactNode>> = {
  "book-on-lap": (
    <span className="absolute bottom-2 left-1/2 z-20 h-3 w-14 -translate-x-1/2 rounded-sm bg-warm-gray/30" />
  ),
};

interface CharacterSceneProps {
  scene: SceneKind;
  expression: Expression;
  /** 장착된 액세서리(있으면). 캐릭터를 그리는 모든 씬에서 일관되게 전달된다. */
  accessoryId?: CharacterAccessoryId | null;
  /** 현재 선택된 동반자. 생략 시 다온. */
  characterId?: CharacterId;
}

// Placeholder scenery — 실제 캐릭터 아트 asset이 아직 없어서, 기존 순수 CSS/SVG
// 얼굴(CharacterFace) 주위에 단순한 CSS 블록으로 배경 소품만 그린다. 이미지
// 생성/파이프라인 없음. 나중에 실제 일러스트로 교체할 때 이 파일만 바꾸면 된다.
//
// scene 매핑은 CharacterArea 가 phase 로부터 계산한다:
//   idle / reaction / done → resting,  studying → studying
export default function CharacterScene({
  scene,
  expression,
  accessoryId,
  characterId,
}: CharacterSceneProps) {
  // 시그니처 "함께 있는 불빛" — 다온 뒤 따뜻한 빛 번짐. scene 에 따라 크기/세기가
  // 달라진다. 공부 중에만 아주 느리게 호흡한다(prefers-reduced-motion 이면 정지).
  const lampClass =
    scene === "studying"
      ? "h-40 w-40 opacity-90 motion-safe:animate-lamp-breathe"
      : "h-28 w-28 opacity-55";

  // resting scene 에서만 캐릭터의 sceneTrait(장면 한정 포즈)을 얹는다. 실루엣 식별
  // 대상이 아니라 보너스 표현이라 studying 에는 그리지 않는다.
  const sceneTrait = getCharacter(characterId ?? DEFAULT_CHARACTER_ID).visual
    .sceneTrait;
  const sceneTraitNode =
    scene === "resting" && sceneTrait ? SCENE_TRAITS[sceneTrait] : null;

  return (
    <div className="relative flex h-40 w-full max-w-[280px] items-end justify-center">
      <span
        className={`lamp-glow bottom-4 left-1/2 -translate-x-1/2 ${lampClass}`}
      />
      {scene === "studying" ? (
        <>
          {/* 스탠드: 기둥 + 갓 불빛 */}
          <span className="absolute right-7 top-3 h-16 w-px bg-warm-gray/40" />
          <span className="absolute right-4 top-2 h-3 w-9 rounded-full bg-peach-deep/70" />
          {/* 책상 상판 */}
          <span className="absolute bottom-0 h-4 w-full rounded-full bg-cocoa/15" />
          {/* 펼친 책 (가운데 접힘선) */}
          <span className="absolute bottom-3 left-1/2 h-6 w-28 -translate-x-1/2 rounded-sm bg-warm-gray/20" />
          <span className="absolute bottom-3 left-1/2 h-6 w-px -translate-x-1/2 bg-warm-gray/40" />
          {/* 연필 */}
          <span className="absolute bottom-4 left-6 h-1 w-10 -rotate-12 rounded-full bg-peach-deep/80" />
        </>
      ) : (
        <>
          {/* 소파 / 쿠션 */}
          <span className="absolute bottom-0 h-10 w-60 rounded-[28px] bg-cream-deep" />
          <span className="absolute bottom-6 h-16 w-44 rounded-[28px] bg-peach/25" />
          {sceneTraitNode}
        </>
      )}
      <div className="relative z-10 pb-2">
        <CharacterFace
          expression={expression}
          accessoryId={accessoryId}
          characterId={characterId}
        />
      </div>
    </div>
  );
}
