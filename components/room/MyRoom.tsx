"use client";

import { useState } from "react";
import CharacterFace from "@/components/character/CharacterFace";
import { formatTotalStudyTime } from "@/lib/mockData";
import { loadStudyRewardState } from "@/lib/studyRewards";
import type {
  CharacterAccessoryId,
  RoomStage,
  StudyRewardState,
} from "@/lib/types";

// 홈 idle 화면에서만 보이는 "내 방" 영역. 공부를 완료할수록 코인/누적 공부시간이
// 쌓이고, 누적 시간에 따라 방이 3단계로 조금씩 발전한다.
//
// 이 컴포넌트는 idle 에서만 렌더되므로 매 공부 세션(→ RESET) 후 새로 마운트되고,
// 그때 loadStudyRewardState() 로 최신 상태를 읽는다(StudyMemoryList 와 같은 패턴).
//
// 방 그림은 아직 실제 일러스트가 아니다 — 기존 CharacterScene 과 같은
// "절대배치 span" CSS placeholder다. 전체 UI polish 단계에서 실제 방 아트로
// 교체할 때 이 파일만 바꾸면 된다. 지금은 Stage 1/2/3 차이가 알아볼 수 있는
// 최소 수준만 그린다.

const STAGE_PREVIEWS: RoomStage[] = [1, 2, 3];

function RoomScene({
  stage,
  equippedAccessoryId,
}: {
  stage: RoomStage;
  equippedAccessoryId: CharacterAccessoryId | null;
}) {
  return (
    <div
      className={`relative mt-3 h-44 w-full overflow-hidden rounded-2xl ${
        stage >= 3 ? "bg-peach/25" : "bg-cream"
      }`}
    >
      {/* Stage 3: 더 따뜻한 조명 — 은은한 빛 번짐 */}
      {stage >= 3 && (
        <span className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-peach-deep/25 blur-xl" />
      )}

      {/* 바닥 */}
      <span className="absolute bottom-0 left-0 h-10 w-full bg-cocoa/10" />

      {/* Stage 2: 러그 */}
      {stage >= 2 && (
        <span className="absolute bottom-2 left-1/2 h-6 w-40 -translate-x-1/2 rounded-full bg-lavender/45" />
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

      {/* 다온 — 항상 방 안에 있다 */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 scale-[0.55] origin-bottom">
        <CharacterFace expression="happy" accessoryId={equippedAccessoryId} />
      </div>
    </div>
  );
}

interface MyRoomProps {
  /** 다온에 장착된 액세서리. app/page.tsx 가 customization state 의 source 다. */
  equippedAccessoryId?: CharacterAccessoryId | null;
}

export default function MyRoom({ equippedAccessoryId = null }: MyRoomProps) {
  const [state] = useState<StudyRewardState>(() => loadStudyRewardState());
  // 개발 전용 미리보기. localStorage 를 바꾸지 않고 방 그림만 갈아끼운다.
  const [previewStage, setPreviewStage] = useState<RoomStage | null>(null);

  const stage = previewStage ?? state.roomStage;

  return (
    <section className="mx-6 rounded-3xl bg-white p-5 shadow-sm">
      <p className="text-xs font-medium text-warm-gray">내 방</p>

      <RoomScene stage={stage} equippedAccessoryId={equippedAccessoryId} />

      <div className="mt-3 flex flex-col gap-0.5 text-xs text-warm-gray">
        <span>
          지금까지 같이 공부한 시간 {formatTotalStudyTime(state.totalStudyMinutes)}
        </span>
        <span>보유 코인 {state.coins}</span>
      </div>

      {process.env.NODE_ENV === "development" && (
        <div className="mt-4 border-t border-warm-gray/15 pt-3">
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-warm-gray">방 단계 미리보기</p>
            <span className="rounded-full bg-warm-gray/10 px-2 py-0.5 text-[10px] text-warm-gray">
              Dev
            </span>
          </div>
          <div className="mt-2 flex gap-1.5">
            {STAGE_PREVIEWS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setPreviewStage(s)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  previewStage === s
                    ? "bg-lavender-deep text-white"
                    : "bg-warm-gray/10 text-warm-gray hover:bg-warm-gray/20"
                }`}
              >
                Stage {s}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPreviewStage(null)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                previewStage === null
                  ? "bg-lavender-deep text-white"
                  : "bg-warm-gray/10 text-warm-gray hover:bg-warm-gray/20"
              }`}
            >
              실제
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
