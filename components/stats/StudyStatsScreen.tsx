"use client";

import { useState } from "react";
import { loadStudyRecords } from "@/lib/studyRecords";
import { formatTotalStudyTime } from "@/lib/mockData";
import {
  WEEKDAY_LABELS,
  getTodayIndex,
  getTopSubjectThisWeek,
  getWeekTotalMinutes,
  getWeeklyStudyMinutes,
} from "@/lib/studyStats";

// "통계" 탭 화면. 이번 주 요일별 공부시간을 단순 막대로 보여준다 — 분석 dashboard 가
// 아니라 "이번 주에 내가 어떻게 공부했는지 한눈에". StudyMemoryList 와 같은 패턴:
// 탭을 눌렀을 때만 mount 되므로 lazy useState 로 localStorage 를 바로 읽어도
// hydration mismatch 가 없다(loadStudyRecords 는 서버에서 []).
//
// Memory 탭("무엇을 공부했나 = 질적 기록")과 역할이 다르다 — 여기는 "얼마나
// 공부했나 = 양적 성장"만 본다.

interface StudyStatsScreenProps {
  /** 이번 주 기록이 없을 때 홈으로 보내는 CTA. 기존 탭 네비를 재사용한다. */
  onGoHome: () => void;
}

export default function StudyStatsScreen({ onGoHome }: StudyStatsScreenProps) {
  const [records] = useState(() => loadStudyRecords());
  const [now] = useState(() => Date.now());

  const weekly = getWeeklyStudyMinutes(records, now);
  const total = getWeekTotalMinutes(weekly);
  const todayIndex = getTodayIndex(now);
  const topSubject = getTopSubjectThisWeek(records, now);
  // 0 나누기 방지 + 한 건만 있어도 막대가 납작해지지 않게 최소 1.
  const max = Math.max(...weekly, 1);
  // 막대 위 값 라벨 / 오늘 점이 h-28 위로 넘치지 않도록 살짝 여유를 둔다.
  const barScale = 0.92;

  return (
    <section className="mx-6 flex flex-col gap-5">
      <header>
        <h2 className="screen-title">이번 주 공부</h2>
        <p className="mt-0.5 text-xs text-warm-gray">월요일부터 오늘까지</p>
      </header>

      {total === 0 ? (
        <div className="card flex flex-col items-center gap-3 text-center">
          <p className="text-sm leading-relaxed text-warm-gray">
            아직 이번 주 공부 기록이 없어요.
            <br />
            오늘의 첫 공부를 시작해볼까요?
          </p>
          <button type="button" onClick={onGoHome} className="btn-secondary">
            홈으로
          </button>
        </div>
      ) : (
        <>
          {/* 막대 그래프 — 카드 없이 배경 위 직접. 가로 스크롤 없음(7컬럼 flex-1). */}
          <div>
            {/* 분 값 라벨: 좁은 화면에서는 숨긴다(요일/막대는 항상 유지). */}
            <div className="mb-1 hidden gap-1.5 min-[360px]:flex">
              {weekly.map((minutes, i) => (
                <span
                  key={i}
                  className="flex-1 text-center text-[9px] tabular-nums text-warm-gray"
                >
                  {minutes > 0 ? minutes : ""}
                </span>
              ))}
            </div>

            <div className="flex h-28 gap-1.5 border-b border-warm-line">
              {weekly.map((minutes, i) => {
                const isToday = i === todayIndex;
                const heightPct = (minutes / max) * 100 * barScale;
                return (
                  <div
                    key={i}
                    className="flex h-full flex-1 flex-col items-center justify-end gap-1"
                  >
                    {isToday && minutes > 0 && (
                      <span
                        aria-hidden
                        className="h-1 w-1 shrink-0 rounded-full bg-peach-deep"
                      />
                    )}
                    {minutes > 0 ? (
                      <span
                        className={`w-full rounded-t-sm ${
                          isToday ? "bg-cocoa/35" : "bg-cocoa/15"
                        }`}
                        style={{ height: `${heightPct}%` }}
                      />
                    ) : (
                      <span className="h-1 w-full rounded-full bg-cocoa/10" />
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-1.5 flex gap-1.5">
              {WEEKDAY_LABELS.map((label, i) => (
                <span
                  key={label}
                  className={`flex-1 text-center text-[11px] ${
                    i === todayIndex
                      ? "font-medium text-cocoa"
                      : "text-warm-gray"
                  }`}
                >
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* 요약 — 카드 없이 divider + 텍스트. 최대 2줄. */}
          <div className="flex flex-col gap-3 border-t border-warm-line pt-4">
            <div>
              <p className="text-xs text-warm-gray">이번 주</p>
              <p className="font-serif text-lg text-cocoa">
                {formatTotalStudyTime(total)}
              </p>
            </div>
            {topSubject && (
              <div>
                <p className="text-xs text-warm-gray">가장 많이 공부한 과목</p>
                <p className="text-sm text-cocoa">
                  {topSubject.subject} ·{" "}
                  {formatTotalStudyTime(topSubject.minutes)}
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
