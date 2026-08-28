import type { ReactNode } from "react";
import type { RoomStage } from "@/lib/types";

interface RoomSceneProps {
  stage: RoomStage;
  /**
   * 방 안에 세울 캐릭터 노드. 위치/스케일은 호출부가 직접 넣는다 —
   * 내 방은 CharacterFace(scale-[0.55]), 친구 방은 FriendCharacter(scale-[1.4])로
   * 크기가 달라서, 슬롯만 비워 둔다.
   */
  character: ReactNode;
}

// 내 방(MyRoom / MyRoomScreen)과 친구 방(FriendRoomScreen)이 같은 방 그림을
// 쓰도록 뽑아낸 공용 씬. 아직 실제 일러스트가 아니다 — CharacterScene 과 같은
// "절대배치 span" CSS placeholder. Stage 1/2/3 차이가 알아볼 수 있는 최소 수준만
// 그린다. 전체 UI polish 단계에서 실제 방 아트로 교체할 때 이 파일만 바꾸면 된다.
//
// Stage visual language:
//   1: 책상 + 의자
//   2: + 스탠드 + 러그 + 식물
//   3: + 책장 + 벽 장식 + 따뜻한 조명
export default function RoomScene({ stage, character }: RoomSceneProps) {
  return (
    <div
      className={`relative mt-3 h-44 w-full overflow-hidden rounded-2xl border border-warm-line ${
        stage >= 3 ? "bg-peach/25" : "bg-cream"
      }`}
    >
      {/* Stage 3: 더 따뜻한 조명 — 은은한 빛 번짐 (lamplight 와 같은 톤) */}
      {stage >= 3 && (
        <span className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-peach-deep/25 blur-2xl" />
      )}

      {/* 바닥 */}
      <span className="absolute bottom-0 left-0 h-10 w-full bg-cocoa/10" />

      {/* Stage 2: 러그 */}
      {stage >= 2 && (
        <span className="absolute bottom-2 left-1/2 h-6 w-40 -translate-x-1/2 rounded-full bg-peach/35" />
      )}

      {/* 책상 + 의자 (Stage 1) */}
      <span className="absolute bottom-9 left-6 h-2.5 w-24 rounded-sm bg-cocoa/25" />
      <span className="absolute bottom-1 left-8 h-8 w-1.5 bg-cocoa/20" />
      <span className="absolute bottom-1 right-24 h-6 w-1.5 bg-warm-gray/40" />
      <span className="absolute bottom-6 right-[92px] h-1.5 w-6 rounded-sm bg-warm-gray/40" />

      {/* Stage 2: 스탠드 */}
      {stage >= 2 && (
        <>
          <span className="absolute bottom-9 left-10 h-12 w-px bg-warm-gray/50" />
          <span className="absolute bottom-[76px] left-8 h-3 w-6 rounded-full bg-peach-deep/70" />
        </>
      )}

      {/* Stage 2: 작은 식물 */}
      {stage >= 2 && (
        <>
          <span className="absolute bottom-10 right-8 h-3 w-4 rounded-sm bg-cocoa/25" />
          <span className="absolute bottom-[52px] right-[34px] h-4 w-4 rounded-full bg-mint/70" />
        </>
      )}

      {/* Stage 3: 책장 */}
      {stage >= 3 && (
        <>
          <span className="absolute bottom-10 right-6 h-20 w-10 rounded-sm bg-cocoa/15" />
          <span className="absolute bottom-[68px] right-6 h-px w-10 bg-cocoa/20" />
          <span className="absolute bottom-[52px] right-6 h-px w-10 bg-cocoa/20" />
          <span className="absolute bottom-9 right-6 h-px w-10 bg-cocoa/20" />
        </>
      )}

      {/* Stage 3: 작은 벽 장식 */}
      {stage >= 3 && (
        <span className="absolute left-6 top-4 h-6 w-8 rounded-sm border border-cocoa/20" />
      )}

      {/* 캐릭터 — 항상 방 안에 있다 */}
      {character}
    </div>
  );
}
