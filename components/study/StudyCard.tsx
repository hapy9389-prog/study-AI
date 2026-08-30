"use client";

import { useEffect, useState } from "react";
import { formatClock } from "@/lib/mockData";
import type { StudySession } from "@/lib/types";

interface StudyCardProps {
  phase: "idle" | "studying";
  studySession?: StudySession;
  onStartStudy: (session: StudySession) => void;
  onCompleteStudy: () => void;
  // 개발 전용: 경과 시간을 즉시 시뮬레이션(startedAt 조정). production에서는 호출되지 않는다.
  onDebugSetElapsed: (elapsedSeconds: number) => void;
}

// 개발 테스트용 경과 시간 프리셋 — 실제로 기다리지 않고 흐름을 확인하기 위한 값.
const DEBUG_ELAPSED_PRESETS = [
  { label: "20초", seconds: 20 },
  { label: "30분", seconds: 1800 },
  { label: "60분", seconds: 3600 },
];

// [공부 시작] is the single most prominent CTA in the whole app — studying
// itself is the core action, not talking to the character. [공부 완료]
// transitions straight into the reaction phase, no extra confirmation step.
export default function StudyCard({
  phase,
  studySession,
  onStartStudy,
  onCompleteStudy,
  onDebugSetElapsed,
}: StudyCardProps) {
  const [subject, setSubject] = useState("");
  const [liveElapsedSeconds, setLiveElapsedSeconds] = useState(0);

  // 매초 Date.now() - startedAt을 다시 계산해서 state에 반영한다(단순 += 1이
  // 아님) — 브라우저가 잠시 느려지거나 탭이 백그라운드였다 돌아와도 drift가
  // 쌓이지 않는다. Date.now() 호출은 이 effect(인터벌 콜백) 안에서만 하고
  // 렌더 본문에서는 호출하지 않는다(React purity 규칙). phase가 studying을
  // 벗어나면 StudyCard가 unmount되어 cleanup이 자동으로 interval을 정리한다.
  useEffect(() => {
    if (phase !== "studying" || !studySession?.startedAt) return;
    const startedAt = studySession.startedAt;
    const tick = () => setLiveElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [phase, studySession?.startedAt]);

  const trimmedSubject = subject.trim();
  const isFormValid = trimmedSubject.length > 0;

  const handleStart = () => {
    if (!isFormValid) return;
    onStartStudy({ subject: trimmedSubject });
  };

  // 세션마다 목표 시간을 따로 정하지 않는다 — 하루 전체 목표는 오늘 계획
  // (DailyStudyPlan)이 담당하고, 여기서는 무엇을 공부할지만 정하고 바로 시작한다.
  // 원하는 만큼 공부하고 자유롭게 끝내면 된다.
  if (phase === "idle") {
    return (
      <section className="mx-6 rounded-2xl bg-white p-5">
        <p className="text-xs font-medium text-warm-gray">무엇을 공부할까?</p>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="예: 영어 회화, 미분, SQLD"
          className="field mt-2"
        />

        <button
          type="button"
          disabled={!isFormValid}
          onClick={handleStart}
          className="btn-primary mt-4"
        >
          공부 시작
        </button>
      </section>
    );
  }

  if (phase === "studying" && studySession) {
    // 카드 없이 위 CharacterScene 과 이어지는 하나의 장면. 빛은 CharacterScene 의
    // lamp-glow 하나로 통일하고 여기서 별도 glow 를 겹치지 않는다.
    return (
      <div className="flex w-full flex-col items-center gap-3">
        <p className="font-serif text-base text-cocoa">
          {studySession.subject} 공부 중
        </p>
        <p className="text-6xl font-light tabular-nums tracking-tight text-cocoa">
          {formatClock(liveElapsedSeconds)}
        </p>
        <button
          type="button"
          onClick={onCompleteStudy}
          className="btn-primary mt-2 max-w-[300px]"
        >
          공부 완료
        </button>

        {process.env.NODE_ENV === "development" && (
          <div className="mt-3 w-full max-w-[300px] border-t border-warm-line pt-3">
            <p className="text-[11px] text-warm-gray">개발 테스트</p>
            <div className="mt-1.5 flex gap-1.5">
              {DEBUG_ELAPSED_PRESETS.map(({ label, seconds }) => (
                <button
                  key={seconds}
                  type="button"
                  onClick={() => onDebugSetElapsed(seconds)}
                  className="rounded-md bg-warm-gray/10 px-2 py-1 text-[11px] font-medium text-warm-gray transition-colors hover:bg-warm-gray/20"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}
