"use client";

// 개발 전용 — 최근 공부 감정 패턴 감지(lib/studyMood.ts) 디버그.
// production 빌드에서는 app/page.tsx 의 NODE_ENV 가드로 렌더 자체가 제거된다.
// 감성 UI 를 적용하지 않는다 — 작은 neutral 패널 + 기본 sans + 버튼 몇 개.
//
// 데이터 전략: 실제 StudyRecord / 통계 / Memory / reward 를 건드리지 않는다.
// Preset 은 detector 입력만 바꾸는 dev override(__setDevMoodOverride). cooldown 만
// 자기 소유 key(study-ai:study-mood-check:v1)를 쓰고, 초기화 버튼을 제공한다.

import { useEffect, useReducer, useState } from "react";
import type { FeelingSemantic } from "@/lib/types";
import { normalizeFeelingId } from "@/lib/mockData";
import { loadStudyRecords } from "@/lib/studyRecords";
import { STRAIN_REASON_CHOICES } from "@/lib/studySupport";
import {
  __getDevMoodOverride,
  __setDevMoodCheckState,
  __setDevMoodOverride,
  analyzeRecentStudyMood,
  loadMoodCheckState,
  MOOD_CHECK_COOLDOWN_MS,
  shouldPromptMoodCheck,
} from "@/lib/studyMood";

const PRESETS: { label: string; feelings: FeelingSemantic[] | null }[] = [
  { label: "모두 긍정", feelings: ["positive", "positive", "neutral", "positive", "positive"] },
  { label: "섞인 패턴 (미발동)", feelings: ["negative", "negative", "positive", "positive", "neutral"] },
  { label: "최근 5중 부정 3", feelings: ["negative", "neutral", "negative", "positive", "negative"] },
  { label: "부정 3연속", feelings: ["negative", "negative", "negative", "positive", "positive"] },
  { label: "기록 3개·3연속", feelings: ["negative", "negative", "negative"] },
  { label: "기록 4개·미발동", feelings: ["negative", "negative", "positive", "negative"] },
  { label: "해제 (실제 기록)", feelings: null },
];

const SHORT: Record<FeelingSemantic, string> = {
  positive: "P",
  neutral: "N",
  negative: "✕",
};

export default function StudyMoodDebugPanel() {
  // now 는 state — render 중 Date.now() 를 호출하지 않는다(react-hooks/purity).
  // 인터벌로 갱신해 cooldown 카운트다운이 살아 움직이고, 버튼 클릭은 refresh() 로
  // 강제 리렌더(override / localStorage 를 다시 읽는다).
  const [now, setNow] = useState(() => Date.now());
  const [, refresh] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 2000);
    return () => clearInterval(id);
  }, []);

  const override = __getDevMoodOverride();
  // 미리보기: override 가 있으면 그대로. 없으면 실제 기록만(완료 시엔 현재 감정이
  // 맨 앞에 prepend 되므로 이 미리보기는 근사값이다).
  const feelings: FeelingSemantic[] =
    override ?? loadStudyRecords().map((r) => normalizeFeelingId(r.feelingId));
  const signal = analyzeRecentStudyMood(feelings);
  const cooldown = loadMoodCheckState();
  const shouldPrompt = shouldPromptMoodCheck({ signal, state: cooldown, now });

  const cooldownText = (() => {
    if (!cooldown) return "없음 (다음 감지 시 바로 뜸)";
    const elapsed = now - Date.parse(cooldown.lastPromptedAt);
    const remain = MOOD_CHECK_COOLDOWN_MS - elapsed;
    const days = (ms: number) => (ms / 86_400_000).toFixed(1);
    return remain > 0
      ? `active · ${days(remain)}일 남음 · last=${cooldown.lastOutcome}`
      : `expired (${days(-remain)}일 전 만료) · last=${cooldown.lastOutcome}`;
  })();

  return (
    <div className="mt-6 border border-dashed border-warm-line p-3 font-mono text-[11px] leading-relaxed text-warm-gray">
      <p className="font-bold text-cocoa">Study Mood Debug (dev only)</p>

      <p className="mt-2">
        입력(newest→): {feelings.length === 0 ? "(없음)" : feelings.map((f) => SHORT[f]).join(" ")}
        {override ? "  [override]" : "  [실제 기록 근사]"}
      </p>
      <p>
        signal: {signal.triggered ? `TRIGGERED (${signal.reason})` : "정상"} · neg
        {signal.negativeCount}/{signal.recentCount} · streak {signal.consecutiveNegative}
      </p>
      <p>cooldown: {cooldownText}</p>
      <p className="font-bold">
        → 다음 공부 완료 시 mood check: {shouldPrompt ? "YES" : "NO"}
      </p>

      <p className="mt-2 text-cocoa">Preset</p>
      <div className="mt-1 flex flex-wrap gap-1">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => {
              __setDevMoodOverride(p.feelings);
              refresh();
            }}
            className="border border-warm-line px-2 py-1 hover:bg-warm-line/40"
          >
            {p.label}
          </button>
        ))}
      </div>

      <p className="mt-2 text-cocoa">Cooldown</p>
      <div className="mt-1 flex flex-wrap gap-1">
        <button
          type="button"
          onClick={() => {
            __setDevMoodCheckState({
              lastPromptedAt: new Date().toISOString(),
              lastOutcome: "ok",
            });
            refresh();
          }}
          className="border border-warm-line px-2 py-1 hover:bg-warm-line/40"
        >
          지금으로 설정 (active)
        </button>
        <button
          type="button"
          onClick={() => {
            __setDevMoodCheckState({
              lastPromptedAt: new Date(now - 6 * 86_400_000).toISOString(),
              lastOutcome: "hard",
            });
            refresh();
          }}
          className="border border-warm-line px-2 py-1 hover:bg-warm-line/40"
        >
          6일 전으로 (expired)
        </button>
        <button
          type="button"
          onClick={() => {
            __setDevMoodCheckState(null);
            refresh();
          }}
          className="border border-warm-line px-2 py-1 hover:bg-warm-line/40"
        >
          초기화
        </button>
      </div>

      <p className="mt-2 text-cocoa">Support reason (조금 힘들어 → 선택)</p>
      <p>
        {STRAIN_REASON_CHOICES.map((c) => `${c.id}=${c.label}`).join(" · ")}
      </p>

      <p className="mt-2 text-warm-gray/70">
        [부정 3연속] + [6일 전으로] → mood check YES → 20초 공부 → 회고 → 조금 힘들어
        → reason → support(LLM). 실패 시 reason별 fallback.
      </p>
    </div>
  );
}
