import type { CharacterAccessoryId, Expression } from "@/lib/types";
import {
  DEFAULT_CHARACTER_ID,
  getCharacter,
  type BodyShape,
  type CharacterId,
  type EyeOpenness,
  type SignatureFeatureId,
} from "@/lib/characters";

interface CharacterFaceProps {
  expression: Expression;
  /**
   * 장착된 액세서리. 생략/ null 이면 기본 얼굴. 오버레이는 얼굴 루트 안에
   * 절대배치되므로 조상의 scale-* (예: MyRoom scale-[0.55]) 와 함께 축소된다.
   * 지금은 CSS placeholder — 나중에 실제 asset 으로 교체할 때 이 파일만 바꾸면 된다.
   */
  accessoryId?: CharacterAccessoryId | null;
  /**
   * 어느 동반자의 얼굴인지. 생략 시 다온. 캐릭터 정체성은 characterId 를 직접
   * 분기하지 않고 getCharacter(id).visual 의 bodyShape/eyeOpenness/signature 값만
   * 읽어서 렌더한다(Visual Grammar) — 새 캐릭터가 늘어나도 이 컴포넌트의 분기는
   * 늘어나지 않는다.
   */
  characterId?: CharacterId;
}

// No image assets — the face is drawn purely with CSS + a small inline SVG
// mouth curve so it swaps cleanly per expression with zero dependencies.

// bodyShape 앵커별 얼굴/몸 wrapper. 실루엣 차별화는 색이 아니라 이 형태 차이가
// 담당한다(그레이스케일로도 구분 가능해야 한다).
const bodyShapeClasses: Record<BodyShape, string> = {
  round: "h-32 w-32 rounded-full",
  boxy: "h-32 w-32 rounded-[28px]",
  slender: "h-36 w-28 rounded-full",
};

// 표정별 기본 눈/입 — 캐릭터 무관, 공용 표정 시스템.
const eyeStyles: Record<Expression, Record<EyeOpenness, string>> = {
  curious: {
    narrow: "h-2 w-3 rounded-full bg-cocoa",
    normal: "h-3 w-3 rounded-full bg-cocoa",
    wide: "h-3.5 w-3.5 rounded-full bg-cocoa",
  },
  quiet: {
    narrow: "h-1 w-3 rounded-full bg-cocoa/60",
    normal: "h-1.5 w-3 rounded-full bg-cocoa/60",
    wide: "h-2 w-3 rounded-full bg-cocoa/60",
  },
  happy: {
    narrow: "h-2 w-2.5 rounded-full bg-cocoa",
    normal: "h-2.5 w-2.5 rounded-full bg-cocoa",
    wide: "h-3 w-3 rounded-full bg-cocoa",
  },
  excited: {
    narrow: "h-2 w-3 rounded-full bg-cocoa",
    normal: "h-3 w-3 rounded-full bg-cocoa",
    wide: "h-3.5 w-3.5 rounded-full bg-cocoa",
  },
};

const mouthPaths: Record<Expression, string> = {
  curious: "M6 3 Q12 8 18 3",
  quiet: "M8 4 Q12 4 16 4",
  happy: "M5 2 Q12 12 19 2",
  excited: "M4 1 Q12 14 20 1",
};

// 캐릭터별 정적 구조 특징(Signature) — 모든 scene/scale 에서 항상 그려진다. signature
// id 로 조회하는 작은 레지스트리라 새 캐릭터(Phase 2 친구 포함) 추가 시 이 컴포넌트의
// 분기 로직은 늘어나지 않고 이 레지스트리에 키 하나만 늘리면 된다. 착탈 가능한 소품
// (안경/모자/헤드폰/별핀)은 여기 두지 않는다 — 그건 AccessoryOverlay 의 역할이다.
function SignatureOverlay({ signature }: { signature: SignatureFeatureId }) {
  if (signature === "asymmetric-cowlick") {
    // 다온 — 정수리 왼쪽에 위로 톡 솟은 비대칭 삐침머리 1가닥.
    return (
      <span className="absolute -top-3 left-9 h-6 w-3 -rotate-12 rounded-full bg-peach-deep/70" />
    );
  }

  if (signature === "folded-hood-ear") {
    // 결 — 후드 한쪽 귀가 늘 접혀 있음(고쳐도 다시 접힌다).
    return (
      <span className="absolute -top-1 left-2 h-5 w-4 -rotate-6 rounded-b-xl bg-cocoa/70" />
    );
  }

  // trailing-sleeves — 소복. 소매가 길어 손이 거의 안 보이는 정적 디테일.
  return (
    <>
      <span className="absolute bottom-2 left-3 h-8 w-6 rounded-t-xl bg-[#c8a88e]/50" />
      <span className="absolute bottom-2 right-3 h-8 w-6 rounded-t-xl bg-[#c8a88e]/50" />
    </>
  );
}

// 다온 얼굴 위에 얹는 액세서리 오버레이. signature 와 개념적으로 완전히 분리된
// layer다 — 코인으로 사고 장착/해제하는 대상은 오직 이 4종 accessory 뿐이다.
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
  characterId = DEFAULT_CHARACTER_ID,
}: CharacterFaceProps) {
  const showBlush = expression === "happy" || expression === "excited";
  const { face, hair, blush, bodyShape, eyeOpenness, signature } =
    getCharacter(characterId).visual;

  return (
    <div
      className={`relative flex items-center justify-center ${bodyShapeClasses[bodyShape]} ${face} shadow-[0_8px_24px_-6px_rgb(90_74_63/0.18)]`}
    >
      {/* 머리 캡 — 다온(hair: null)은 그리지 않아 기존 렌더와 동일. */}
      {hair && (
        <span
          className={`absolute -top-2 left-1/2 h-10 w-32 -translate-x-1/2 rounded-t-full ${hair}`}
        />
      )}
      {showBlush && (
        <>
          <span
            className={`absolute left-4 top-[68px] h-3 w-4 rounded-full ${blush}`}
          />
          <span
            className={`absolute right-4 top-[68px] h-3 w-4 rounded-full ${blush}`}
          />
        </>
      )}
      <div className="relative flex flex-col items-center gap-3">
        <div className="flex gap-5">
          <span className={eyeStyles[expression][eyeOpenness]} />
          <span className={eyeStyles[expression][eyeOpenness]} />
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
      <SignatureOverlay signature={signature} />
      <AccessoryOverlay accessoryId={accessoryId} />
    </div>
  );
}
