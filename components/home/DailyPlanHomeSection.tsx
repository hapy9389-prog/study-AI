"use client";

import { useState } from "react";
import { formatTotalStudyTime } from "@/lib/mockData";
import { loadStudyRecords } from "@/lib/studyRecords";
import { getDailyPlanProgress, loadDailyPlan } from "@/lib/dailyStudyPlan";

// 홈 idle 화면의 "오늘 계획" 요약. MyRoom.tsx와 같은 패턴 — 카드로 감싸지
// 않고 spacing만으로 구분되는 작은 섹션이다. idle에서만 마운트되므로
// (page.tsx) 매 세션 완료(→ RESET) 후 새로 마운트되어 최신 상태를 읽는다.
//
// 계획이 없거나 항목이 비어 있으면 빈 상태 카드 대신 한 줄 CTA만 보여준다 —
// 계획 없는 사용자에게 새 시각적 무게를 주지 않는다.

interface DailyPlanHomeSectionProps {
  onOpenPlanScreen: () => void;
}

export default function DailyPlanHomeSection({
  onOpenPlanScreen,
}: DailyPlanHomeSectionProps) {
  const [plan] = useState(() => loadDailyPlan());
  const [records] = useState(() => loadStudyRecords());
  const [now] = useState(() => Date.now());

  const progress = getDailyPlanProgress(plan, records, now);

  if (progress.length === 0) {
    return (
      <section className="px-6">
        <button
          type="button"
          onClick={onOpenPlanScreen}
          className="text-sm font-medium text-cocoa transition-opacity hover:opacity-80"
        >
          오늘 계획 정하기
        </button>
      </section>
    );
  }

  return (
    <section className="px-6">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-semibold text-cocoa">오늘 계획</p>
        <button
          type="button"
          onClick={onOpenPlanScreen}
          className="text-xs text-warm-gray transition-colors hover:text-cocoa"
        >
          편집
        </button>
      </div>

      <dl className="mt-2 flex flex-col gap-2.5">
        {progress.map((item) => (
          <div key={item.subject} className="flex flex-col gap-0.5">
            <div className="flex justify-between gap-4 text-sm">
              <dt className="min-w-0 truncate text-cocoa">{item.subject}</dt>
              <dd className="shrink-0 text-right text-cocoa">
                {formatTotalStudyTime(item.studiedMinutes)} /{" "}
                {formatTotalStudyTime(item.targetMinutes)}
              </dd>
            </div>
            <p className="text-xs text-warm-gray">
              {item.isCompleted
                ? "이번 목표를 채웠어요"
                : `${formatTotalStudyTime(item.remainingMinutes)} 남음`}
            </p>
          </div>
        ))}
      </dl>
    </section>
  );
}
