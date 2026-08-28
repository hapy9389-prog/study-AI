import CharacterFace from "./CharacterFace";
import type { CharacterAccessoryId, Expression } from "@/lib/types";

export type SceneKind = "resting" | "studying";

interface CharacterSceneProps {
  scene: SceneKind;
  expression: Expression;
  /** 장착된 액세서리(있으면). 다온을 그리는 모든 씬에서 일관되게 전달된다. */
  accessoryId?: CharacterAccessoryId | null;
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
}: CharacterSceneProps) {
  return (
    <div className="relative flex h-40 w-full max-w-[280px] items-end justify-center">
      {scene === "studying" ? (
        <>
          {/* 스탠드: 기둥 + 갓 불빛 */}
          <span className="absolute right-7 top-3 h-16 w-px bg-warm-gray/40" />
          <span className="absolute right-4 top-2 h-3 w-9 rounded-full bg-peach-deep/70" />
          {/* 책상 상판 */}
          <span className="absolute bottom-0 h-4 w-full rounded-full bg-cocoa/15" />
          {/* 펼친 책 (가운데 접힘선) */}
          <span className="absolute bottom-3 left-1/2 h-6 w-28 -translate-x-1/2 rounded-sm bg-lavender/70" />
          <span className="absolute bottom-3 left-1/2 h-6 w-px -translate-x-1/2 bg-warm-gray/40" />
          {/* 연필 */}
          <span className="absolute bottom-4 left-6 h-1 w-10 -rotate-12 rounded-full bg-peach-deep/80" />
        </>
      ) : (
        <>
          {/* 소파 / 쿠션 */}
          <span className="absolute bottom-0 h-10 w-60 rounded-[28px] bg-lavender/55" />
          <span className="absolute bottom-6 h-16 w-44 rounded-[28px] bg-lavender/35" />
        </>
      )}
      <div className="relative z-10 pb-2">
        <CharacterFace expression={expression} accessoryId={accessoryId} />
      </div>
    </div>
  );
}
