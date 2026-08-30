"use client";

import { useState } from "react";
import ScreenShell from "@/components/layout/ScreenShell";
import { formatTotalStudyTime } from "@/lib/mockData";
import {
  addPlanItem,
  loadOrCreateDailyPlan,
  MAX_PLAN_TARGET_MINUTES,
  MIN_PLAN_TARGET_MINUTES,
  removePlanItem,
  saveDailyPlan,
  updatePlanItemTarget,
} from "@/lib/dailyStudyPlan";
import type { DailyStudyPlan, DailyStudyPlanItem } from "@/lib/types";

interface DailyStudyPlanScreenProps {
  onBack: () => void;
}

// StudyCard의 목표 시간 quick chip([30,45,60]분) 관례를 그대로 본떠 하루 목표용으로
// 확장한 값 — 1시간/2시간/3시간/5시간.
const QUICK_TARGET_MINUTES = [60, 120, 180, 300];

const ADD_ERROR_MESSAGES: Record<string, string> = {
  invalid_subject: "과목을 입력해주세요.",
  invalid_target: `목표 시간은 ${MIN_PLAN_TARGET_MINUTES}분~${MAX_PLAN_TARGET_MINUTES}분 사이로 입력해주세요.`,
  duplicate_subject: "이미 같은 과목이 계획에 있어요.",
};

// 계획 항목 1건 — 목표 시간(분) 수정 + 삭제. 목표 입력은 로컬 draft로 들고
// 있다가 blur 시점에만 커밋한다(다른 행을 편집할 때 이 행이 리렌더로 흔들리지
// 않게). 범위를 벗어나면 되돌리고 행 안에서만 짧게 안내한다.
function PlanItemRow({
  item,
  onChangeTarget,
  onRemove,
}: {
  item: DailyStudyPlanItem;
  onChangeTarget: (itemId: string, minutes: number) => boolean;
  onRemove: (itemId: string) => void;
}) {
  const [draft, setDraft] = useState(String(item.targetMinutes));
  const [rowError, setRowError] = useState(false);

  const commit = () => {
    const minutes = Math.trunc(Number(draft));
    const ok = onChangeTarget(item.id, minutes);
    if (!ok) {
      setDraft(String(item.targetMinutes));
      setRowError(true);
      return;
    }
    setRowError(false);
  };

  return (
    <li className="list-row">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-cocoa">{item.subject}</p>
        <p className={`text-xs ${rowError ? "text-peach-deep" : "text-warm-gray"}`}>
          {rowError
            ? `${MIN_PLAN_TARGET_MINUTES}~${MAX_PLAN_TARGET_MINUTES}분 사이로 입력해주세요.`
            : "오늘 목표"}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <input
          type="number"
          inputMode="numeric"
          min={MIN_PLAN_TARGET_MINUTES}
          max={MAX_PLAN_TARGET_MINUTES}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          className="w-16 rounded-2xl border border-warm-gray/30 bg-white px-2 py-2 text-center text-sm text-cocoa outline-none focus:border-peach-deep"
        />
        <span className="text-xs text-warm-gray">분</span>
      </div>
      <button
        type="button"
        onClick={() => onRemove(item.id)}
        className="shrink-0 text-sm text-warm-gray transition-colors hover:text-cocoa"
      >
        삭제
      </button>
    </li>
  );
}

export default function DailyStudyPlanScreen({ onBack }: DailyStudyPlanScreenProps) {
  const [plan, setPlan] = useState<DailyStudyPlan>(() => loadOrCreateDailyPlan());
  const [subject, setSubject] = useState("");
  const [targetMinutes, setTargetMinutes] = useState<number | null>(60);
  const [customMinutes, setCustomMinutes] = useState("");
  const [error, setError] = useState("");

  const effectiveMinutes =
    customMinutes.trim() !== "" ? Number(customMinutes) : targetMinutes;

  const handleAdd = () => {
    if (effectiveMinutes === null || !Number.isFinite(effectiveMinutes)) {
      setError(ADD_ERROR_MESSAGES.invalid_target);
      return;
    }
    const result = addPlanItem(plan, subject, Math.trunc(effectiveMinutes));
    if (!result.success) {
      setError(ADD_ERROR_MESSAGES[result.reason ?? "invalid_target"]);
      return;
    }
    saveDailyPlan(result.plan);
    setPlan(result.plan);
    setSubject("");
    setTargetMinutes(60);
    setCustomMinutes("");
    setError("");
  };

  const handleTargetChange = (itemId: string, minutes: number): boolean => {
    if (
      !Number.isFinite(minutes) ||
      minutes < MIN_PLAN_TARGET_MINUTES ||
      minutes > MAX_PLAN_TARGET_MINUTES
    ) {
      return false;
    }
    const next = updatePlanItemTarget(plan, itemId, minutes);
    saveDailyPlan(next);
    setPlan(next);
    return true;
  };

  const handleRemove = (itemId: string) => {
    const next = removePlanItem(plan, itemId);
    saveDailyPlan(next);
    setPlan(next);
  };

  return (
    <ScreenShell
      onBack={onBack}
      title="오늘 계획"
      subtitle="오늘 해볼 공부를 정해두면, 공부를 마칠 때마다 진척을 알려줄게요."
    >
      <section className="rounded-2xl bg-white p-5">
        <p className="text-xs font-medium text-warm-gray">과목</p>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="예: SQLD"
          className="field mt-2"
        />

        <p className="mt-4 text-xs font-medium text-warm-gray">오늘 목표 시간</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {QUICK_TARGET_MINUTES.map((minutes) => {
            const selected = targetMinutes === minutes && customMinutes.trim() === "";
            return (
              <button
                key={minutes}
                type="button"
                onClick={() => {
                  setTargetMinutes(minutes);
                  setCustomMinutes("");
                }}
                className={selected ? "chip-active" : "chip"}
              >
                {formatTotalStudyTime(minutes)}
              </button>
            );
          })}
          <input
            type="number"
            inputMode="numeric"
            min={MIN_PLAN_TARGET_MINUTES}
            max={MAX_PLAN_TARGET_MINUTES}
            value={customMinutes}
            onChange={(e) => {
              setCustomMinutes(e.target.value);
              setTargetMinutes(null);
            }}
            placeholder="직접 입력(분)"
            className="w-28 rounded-2xl border border-peach/60 bg-cream px-3 py-2 text-sm text-cocoa outline-none transition-colors focus:border-peach-deep"
          />
        </div>

        {error && <p className="mt-2 text-xs text-peach-deep">{error}</p>}

        <button type="button" onClick={handleAdd} className="btn-secondary mt-4 w-full">
          + 계획 추가
        </button>
      </section>

      {plan.items.length > 0 && (
        <ul className="flex flex-col gap-2">
          {plan.items.map((item) => (
            <PlanItemRow
              key={item.id}
              item={item}
              onChangeTarget={handleTargetChange}
              onRemove={handleRemove}
            />
          ))}
        </ul>
      )}
    </ScreenShell>
  );
}
