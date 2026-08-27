import type { Expression } from "@/lib/types";

interface CharacterFaceProps {
  expression: Expression;
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

export default function CharacterFace({ expression }: CharacterFaceProps) {
  const showBlush = expression === "happy" || expression === "excited";

  return (
    <div className="relative flex h-32 w-32 items-center justify-center rounded-full bg-peach shadow-md">
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
    </div>
  );
}
