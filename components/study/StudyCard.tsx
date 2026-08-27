"use client";

import { useEffect, useState } from "react";
import { formatClock } from "@/lib/mockData";
import type { StudySession } from "@/lib/types";

interface StudyCardProps {
  phase: "idle" | "studying";
  studySession?: StudySession;
  onStartStudy: (session: StudySession) => void;
  onCompleteStudy: () => void;
}

const QUICK_MINUTES = [30, 45, 60];

// [공부 시작] is the single most prominent CTA in the whole app — studying
// itself is the core action, not talking to the character. [공부 완료]
// transitions straight into the reaction phase, no extra confirmation step.
export default function StudyCard({ phase, studySession, onStartStudy, onCompleteStudy }: StudyCardProps) {
  const [subject, setSubject] = useState("");
  const [targetMinutes, setTargetMinutes] = useState<number | null>(null);
  const [customMinutes, setCustomMinutes] = useState("");
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
  const isSubjectValid = trimmedSubject.length > 0;

  const effectiveMinutes = customMinutes.trim() !== "" ? Number(customMinutes) : targetMinutes;
  const isMinutesValid =
    effectiveMinutes !== null &&
    Number.isFinite(effectiveMinutes) &&
    Number.isInteger(effectiveMinutes) &&
    effectiveMinutes >= 1;

  const isFormValid = isSubjectValid && isMinutesValid;

  const handleStart = () => {
    if (!isFormValid) return;
    onStartStudy({ subject: trimmedSubject, targetMinutes: effectiveMinutes as number });
  };

  return (
    <section className="mx-6 rounded-3xl bg-white p-5 shadow-sm">
      {phase === "idle" && (
        <>
          <p className="text-xs font-medium text-warm-gray">오늘 뭐 공부할까?</p>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="예: 영어 회화, 미분, SQLD"
            className="mt-2 w-full rounded-2xl border border-peach/60 bg-cream px-4 py-3 text-sm text-cocoa outline-none focus:border-lavender-deep"
          />

          <p className="mt-4 text-xs font-medium text-warm-gray">목표 시간</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {QUICK_MINUTES.map((minutes) => (
              <button
                key={minutes}
                type="button"
                onClick={() => {
                  setTargetMinutes(minutes);
                  setCustomMinutes("");
                }}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  targetMinutes === minutes && customMinutes.trim() === ""
                    ? "bg-lavender-deep text-white"
                    : "bg-lavender text-cocoa"
                }`}
              >
                {minutes}분
              </button>
            ))}
            <input
              type="number"
              inputMode="numeric"
              min={1}
              value={customMinutes}
              onChange={(e) => {
                setCustomMinutes(e.target.value);
                setTargetMinutes(null);
              }}
              placeholder="직접 입력"
              className="w-20 rounded-xl border border-peach/60 bg-cream px-3 py-2 text-sm text-cocoa outline-none focus:border-lavender-deep"
            />
          </div>

          <button
            type="button"
            disabled={!isFormValid}
            onClick={handleStart}
            className="mt-4 w-full rounded-2xl bg-lavender-deep py-4 text-lg font-bold text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
          >
            공부 시작
          </button>
        </>
      )}

      {phase === "studying" && studySession && (
        <div className="flex flex-col items-center gap-3">
          <p className="text-base font-bold text-cocoa">{studySession.subject} 공부 중</p>
          <p className="font-mono text-5xl font-bold tabular-nums text-lavender-deep">
            {formatClock(liveElapsedSeconds)}
          </p>
          <p className="text-sm text-warm-gray">목표 {studySession.targetMinutes}분</p>
          <p className="flex items-center gap-2 text-sm text-warm-gray">
            <span className="h-2 w-2 animate-pulse rounded-full bg-peach-deep" />
            다온이는 조용히 함께 있어요
          </p>
          <button
            type="button"
            onClick={onCompleteStudy}
            className="w-full rounded-2xl bg-peach py-3 text-base font-semibold text-cocoa transition-colors hover:bg-peach-deep"
          >
            공부 완료
          </button>
        </div>
      )}
    </section>
  );
}
