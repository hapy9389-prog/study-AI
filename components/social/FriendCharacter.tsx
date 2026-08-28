import type { FriendAvatarId, FriendStudyStatusType } from "@/lib/types";

interface FriendCharacterProps {
  avatarId: FriendAvatarId;
  status: FriendStudyStatusType;
}

// 친구별 캐릭터 placeholder. CharacterScene / CharacterFace 와 같은 기법(순수
// Tailwind <span> + 소량 인라인 SVG, 이미지 asset 없음)이지만, 다온 전용
// CharacterFace 를 재사용하지 않고 친구용 소형 얼굴을 자체 구현한다.
//
// 목표는 완성형 일러스트가 아니라
//   (1) 민수 / 서연 / 지훈이 색 + 액세서리로 한눈에 구분되고
//   (2) studying / idle / completed 장면이 달라 보이는 것.
// 나중에 avatarId → /characters/<id>.webp 로 교체할 때 이 파일만 바꾸면 된다.

type Accessory = "glasses" | "ribbon" | "headphones";

const AVATAR: Record<
  FriendAvatarId,
  { face: string; hair: string; body: string; accessory: Accessory }
> = {
  // 민수: 차분한 색 + 안경 + 짧은 머리
  minsu: {
    face: "bg-peach",
    hair: "bg-cocoa",
    body: "bg-lavender-deep",
    accessory: "glasses",
  },
  // 서연: 밝고 따뜻한 색 + 머리 리본
  seoyeon: {
    face: "bg-peach",
    hair: "bg-[#b98a63]",
    body: "bg-peach-deep",
    accessory: "ribbon",
  },
  // 지훈: 활발한 색 + 헤드폰
  jihun: {
    face: "bg-peach",
    hair: "bg-cocoa/80",
    body: "bg-cocoa/55",
    accessory: "headphones",
  },
};

function StatusScene({ status }: { status: FriendStudyStatusType }) {
  if (status === "studying") {
    return (
      <>
        {/* 책상 상판 */}
        <span className="absolute bottom-0 h-1.5 w-full rounded-full bg-cocoa/15" />
        {/* 펼친 책 */}
        <span className="absolute bottom-1.5 left-1 h-3 w-5 -rotate-6 rounded-sm bg-warm-gray/25" />
        {/* 연필 */}
        <span className="absolute bottom-2.5 right-1 h-0.5 w-4 rotate-45 rounded-full bg-peach-deep/80" />
      </>
    );
  }
  if (status === "completed") {
    // 덮은 책 한두 권 정도 — 트로피/폭죽 없음.
    return (
      <>
        <span className="absolute bottom-0 h-1.5 w-9 rounded-sm bg-peach-deep/50" />
        <span className="absolute bottom-1.5 h-1.5 w-7 rounded-sm bg-warm-gray/30" />
      </>
    );
  }
  // idle: 쿠션
  return (
    <span className="absolute bottom-0 h-4 w-14 rounded-2xl bg-cream-deep" />
  );
}

function Accessory({ kind }: { kind: Accessory }) {
  if (kind === "glasses") {
    return (
      <>
        <span className="absolute left-0.5 top-3 h-2 w-2 rounded-full border border-cocoa/70" />
        <span className="absolute right-0.5 top-3 h-2 w-2 rounded-full border border-cocoa/70" />
        <span className="absolute left-1/2 top-[15px] h-px w-1 -translate-x-1/2 bg-cocoa/70" />
      </>
    );
  }
  if (kind === "ribbon") {
    return (
      <>
        <span className="absolute -top-1 left-1 h-2 w-2 rounded-full bg-peach-deep" />
        <span className="absolute -top-1 right-1 h-2 w-2 rounded-full bg-peach-deep" />
        <span className="absolute -top-0.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-peach-deep" />
      </>
    );
  }
  // headphones
  return (
    <>
      <span className="absolute -top-1.5 left-1/2 h-3 w-9 -translate-x-1/2 rounded-t-full border-2 border-cocoa/50" />
      <span className="absolute top-2 -left-1 h-3 w-2 rounded-full bg-cocoa/60" />
      <span className="absolute top-2 -right-1 h-3 w-2 rounded-full bg-cocoa/60" />
    </>
  );
}

export default function FriendCharacter({
  avatarId,
  status,
}: FriendCharacterProps) {
  const look = AVATAR[avatarId];
  // studying 은 집중한 가는 눈, 나머지는 동그란 눈.
  const eye =
    status === "studying"
      ? "h-0.5 w-1.5 rounded-full bg-cocoa/70"
      : "h-1 w-1 rounded-full bg-cocoa";

  return (
    <div className="relative flex h-16 w-16 shrink-0 items-end justify-center">
      <StatusScene status={status} />

      <div className="relative z-10 flex flex-col items-center pb-1">
        {/* 머리 */}
        <div className={`relative h-8 w-8 rounded-full ${look.face} shadow-sm`}>
          {/* 헤어 캡 */}
          <span
            className={`absolute -top-1 left-1/2 h-3.5 w-8 -translate-x-1/2 rounded-t-full ${look.hair}`}
          />
          {/* 눈 */}
          <span className={`absolute left-[7px] top-4 ${eye}`} />
          <span className={`absolute right-[7px] top-4 ${eye}`} />
          {/* completed 는 살짝 웃는 입 */}
          {status === "completed" && (
            <span className="absolute bottom-1.5 left-1/2 h-1 w-2 -translate-x-1/2 rounded-b-full border-b border-cocoa/60" />
          )}
          <Accessory kind={look.accessory} />
        </div>
        {/* 몸(옷 색으로 친구 구분 강화) */}
        <div className={`-mt-1 h-3.5 w-9 rounded-t-2xl ${look.body}`} />
      </div>
    </div>
  );
}
