"use client";

import type { StudySession } from "@/lib/types";

// 개발자 모드 전용. 실제 공부 타이머를 거치지 않고 preset 하나로 곧바로
// reaction phase(회고 흐름)에 진입시켜 반복 테스트한다. 진입 이후는 실제
// 사용자 경로와 완전히 동일하다 — 여기서는 StudySession 을 만들어 넘기기만 한다.
//
// app/page.tsx 에서 process.env.NODE_ENV === "development" 로 렌더를 막고,
// reducer 의 DEBUG_ENTER_REACTION 도 production 에서는 무시된다(이중 방어).

const PRESETS: Array<{ subject: string; targetMinutes: number; elapsedSeconds: number }> = [
  { subject: "미적분", targetMinutes: 30, elapsedSeconds: 1800 },
  { subject: "영어 회화", targetMinutes: 20, elapsedSeconds: 1200 },
  { subject: "SQLD", targetMinutes: 40, elapsedSeconds: 2400 },
];

export default function ReflectionTestPanel({
  onEnterReaction,
}: {
  onEnterReaction: (session: StudySession) => void;
}) {
  return (
    <section className="mx-6 rounded-3xl bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-warm-gray">회고 테스트</p>
        <span className="rounded-full bg-warm-gray/10 px-2 py-0.5 text-[10px] text-warm-gray">
          Dev
        </span>
      </div>
      <div className="mt-3 flex flex-col gap-1.5">
        {PRESETS.map((preset) => (
          <button
            key={preset.subject}
            type="button"
            onClick={() =>
              onEnterReaction({
                subject: preset.subject,
                targetMinutes: preset.targetMinutes,
                elapsedSeconds: preset.elapsedSeconds,
                startedAt: Date.now() - preset.elapsedSeconds * 1000,
              })
            }
            className="rounded-xl bg-warm-gray/10 px-3 py-2 text-left text-xs font-medium text-warm-gray transition-colors hover:bg-warm-gray/20"
          >
            {preset.subject} · 목표 {preset.targetMinutes}분 · 실제{" "}
            {preset.elapsedSeconds / 60}분
          </button>
        ))}
      </div>
    </section>
  );
}
