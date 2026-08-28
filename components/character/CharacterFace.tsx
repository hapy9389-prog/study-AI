import type { CharacterAccessoryId, Expression } from "@/lib/types";

interface CharacterFaceProps {
  expression: Expression;
  /**
   * 장착된 액세서리. 생략/ null 이면 기본 얼굴. 오버레이는 얼굴 루트(h-32 w-32)
   * 안에 절대배치되므로 조상의 scale-* (예: MyRoom scale-[0.55]) 와 함께 축소된다.
   * 지금은 CSS placeholder — 나중에 실제 asset 으로 교체할 때 이 파일만 바꾸면 된다.
   */
  accessoryId?: CharacterAccessoryId | null;
}

// No image assets — the face is drawn purely with CSS + a small inline SVG
// mouth curve so it swaps cleanly per expression with zero dependencies.
const eyeStyles: Record<Expression, string> = {
  curious: "h-3 w-3 rounded-full bg-cocoa",
  quiet: "h-1.5 w-3 rounded-full bg-cocoa/60",
  happy: "h-2.5 w-2.5 rounded-full bg-cocoa",
  excited: "h-3 w-3 rounded-full bg-cocoa",
};

const mouthPaths: Record<Expression, string> = {
  curious: "M6 3 Q12 8 18 3",
  quiet: "M8 4 Q12 4 16 4",
  happy: "M5 2 Q12 12 19 2",
  excited: "M4 1 Q12 14 20 1",
};

// 다온 얼굴 위에 얹는 액세서리 오버레이. FriendCharacter 의 Accessory 와 목적은
// 같지만 다온 얼굴(peach 원형) 기준 위치라 공유하지 않는다(작은 중복 허용).
function AccessoryOverlay({
  accessoryId,
}: {
  accessoryId: CharacterAccessoryId | null | undefined;
}) {
  if (!accessoryId) return null;

  if (accessoryId === "glasses") {
    return (
      <>
        <span className="absolute left-[30px] top-[52px] h-6 w-6 rounded-full border-[3px] border-cocoa/80" />
        <span className="absolute right-[30px] top-[52px] h-6 w-6 rounded-full border-[3px] border-cocoa/80" />
        <span className="absolute left-1/2 top-[62px] h-[3px] w-3 -translate-x-1/2 rounded-full bg-cocoa/80" />
      </>
    );
  }

  if (accessoryId === "hat") {
    return (
      <>
        {/* 챙 */}
        <span className="absolute -top-1 left-1/2 h-2 w-28 -translate-x-1/2 rounded-full bg-cocoa/80" />
        {/* 모자 몸통 */}
        <span className="absolute -top-6 left-1/2 h-8 w-16 -translate-x-1/2 rounded-t-2xl bg-cocoa/80" />
        <span className="absolute -top-[18px] left-1/2 h-2 w-16 -translate-x-1/2 bg-peach-deep/70" />
      </>
    );
  }

  if (accessoryId === "headphones") {
    return (
      <>
        {/* 밴드 아치 */}
        <span className="absolute -top-2 left-1/2 h-10 w-32 -translate-x-1/2 rounded-t-full border-[5px] border-b-0 border-lavender-deep" />
        {/* 이어컵 */}
        <span className="absolute left-[-4px] top-[54px] h-9 w-5 rounded-xl bg-lavender-deep" />
        <span className="absolute right-[-4px] top-[54px] h-9 w-5 rounded-xl bg-lavender-deep" />
      </>
    );
  }

  // star-pin
  return (
    <span className="absolute right-3 top-1 text-2xl leading-none text-peach-deep">
      ★
    </span>
  );
}

export default function CharacterFace({
  expression,
  accessoryId,
}: CharacterFaceProps) {
  const showBlush = expression === "happy" || expression === "excited";

  return (
    <div className="relative flex h-32 w-32 items-center justify-center rounded-full bg-peach shadow-[0_8px_24px_-6px_rgb(90_74_63/0.18)]">
      {showBlush && (
        <>
          <span className="absolute left-4 top-[68px] h-3 w-4 rounded-full bg-peach-deep/70" />
          <span className="absolute right-4 top-[68px] h-3 w-4 rounded-full bg-peach-deep/70" />
        </>
      )}
      <div className="flex flex-col items-center gap-3">
        <div className="flex gap-5">
          <span className={eyeStyles[expression]} />
          <span className={eyeStyles[expression]} />
        </div>
        <svg width="24" height="14" viewBox="0 0 24 14" fill="none" aria-hidden="true">
          <path
            d={mouthPaths[expression]}
            stroke="#5A4A3F"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      </div>
      <AccessoryOverlay accessoryId={accessoryId} />
    </div>
  );
}
