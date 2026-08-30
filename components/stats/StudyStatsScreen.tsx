"use client";

import { useState } from "react";
import { loadStudyRecords } from "@/lib/studyRecords";
import { formatTotalStudyTime } from "@/lib/mockData";
import {
  WEEKDAY_LABELS,
  getSubjectMinutesThisWeek,
  getTodayIndex,
  getWeekTotalMinutes,
  getWeeklyStudyMinutes,
} from "@/lib/studyStats";

// "통계" 탭 화면. 이번 주 요일별 공부시간을 단순 막대로 보여준다 — 분석 dashboard 가
// 아니라 "이번 주에 내가 어떻게 공부했는지 한눈에". CalendarScreen 과 같은 패턴:
// 탭을 눌렀을 때만 mount 되므로 lazy useState 로 localStorage 를 바로 읽어도
// hydration mismatch 가 없다(loadStudyRecords 는 서버에서 []).
//
// Calendar 탭("언제 무엇을 공부했나 = 질적 기록")과 역할이 다르다 — 여기는 "얼마나
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
  // 이번 주 과목별 공부시간. 화면이 길어지지 않게 상위 5개만.
  const subjectMinutes = getSubjectMinutesThisWeek(records, now);
  const topSubjects = subjectMinutes.slice(0, 5);
  const maxSubjectMinutes = Math.max(...topSubjects.map((s) => s.minutes), 1);
  // 0 나누기 방지 + 한 건만 있어도 막대가 납작해지지 않게 최소 1.
  const max = Math.max(...weekly, 1);
  // 오늘이 가장 긴 날일 때 위의 peach 점(+gap)이 h-20 를 넘지 않도록 여유를 둔다
  // (막대 위 숫자 라벨은 없앴다).
  const barScale = 0.87;
  // 이번 주 가장 오래 공부한 요일. total > 0 일 때만 표시하므로 항상 유효하다.
  // 동점이면 앞 요일(결정적). weekly 파생값이라 studyStats 헬퍼는 건드리지 않는다.
  const busiestIndex = weekly.indexOf(Math.max(...weekly));

  return (
    <section className="mx-6 flex flex-col gap-6">
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
          {/* 주간 리듬 — 카드·baseline·y축 없이 배경 위 직접. 막대 폭은 고정 px 가
              아니라 칸의 비율(w-[56%])이라 320~430px에서 같은 "기둥" 비례를 유지한다
              (고정 12px 는 좁은 칸에서 이쑤시개처럼 보였다). 막대 위 raw 분 숫자는
              없앴다(total + 아래 한 줄로 대신). */}
          <div>
            <div className="flex h-20 gap-1.5">
              {weekly.map((minutes, i) => {
                const isToday = i === todayIndex;
                const isFuture = i > todayIndex;
                const heightPct = (minutes / max) * 100 * barScale;
                return (
                  <div
                    key={i}
                    className="flex h-full flex-1 flex-col items-center justify-end gap-1"
                  >
                    {isToday && minutes > 0 && (
                      <span
                        aria-hidden
                        className="h-1.5 w-1.5 shrink-0 rounded-full bg-peach-deep"
                      />
                    )}
                    {minutes > 0 ? (
                      <span
                        className={`w-[56%] max-w-[26px] rounded-t-full ${
                          isToday ? "bg-cocoa/25" : "bg-cocoa/15"
                        }`}
                        style={{ height: `${heightPct}%` }}
                      />
                    ) : (
                      <span
                        className={`h-1.5 w-[56%] max-w-[26px] rounded-full ${
                          isFuture ? "bg-cocoa/6" : "bg-cocoa/10"
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-2 flex gap-1.5">
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

          {/* 요약 — 카드·divider 없이 spacing 으로만 구분. narrative 는 막대에서
              사라진 "가장 오래 공부한 요일"을 조용히 보완한다(LLM 호출 없음). */}
          <div>
            <p className="text-xs text-warm-gray">이번 주</p>
            <p className="font-serif text-lg text-cocoa">
              {formatTotalStudyTime(total)}
            </p>
            <p className="mt-1.5 text-xs text-warm-gray">
              이번 주는 {WEEKDAY_LABELS[busiestIndex]}요일에 가장 오래 공부했어요.
            </p>
          </div>

          {/* 과목별 공부 — 화면 유일한 divider. "목표 달성 progress" 가 아니라 과목 간
              상대 공부시간 비교라서 bar 는 aria-hidden, 값은 텍스트로. track(빈 레일)을
              없애 "0→100% 목표"로 읽히지 않게 하고, 채운 선 하나만 남긴다 — 아래위
              과목끼리 길이로 비교(공통 스케일 maxSubjectMinutes). 색은 cocoa 1계열. */}
          {topSubjects.length > 0 && (
            <div className="flex flex-col gap-3 border-t border-warm-line pt-5">
              <p className="text-xs text-warm-gray">과목별 공부</p>
              <ul className="flex flex-col gap-3.5">
                {topSubjects.map(({ subject, minutes }, i) => (
                  <li key={subject} className="flex flex-col gap-2">
                    <div className="flex items-baseline justify-between gap-3">
                      <span
                        className="min-w-0 truncate text-sm text-cocoa"
                        title={subject}
                      >
                        {subject}
                      </span>
                      <span className="shrink-0 text-xs tabular-nums text-warm-gray">
                        {formatTotalStudyTime(minutes)}
                      </span>
                    </div>
                    <span
                      aria-hidden
                      className={`block h-1 rounded-full ${
                        i === 0 ? "bg-cocoa/45" : "bg-cocoa/22"
                      }`}
                      style={{
                        // 1위도 화면 끝까지 닿지 않게 90% 로 눌러 "구분선"이 아니라
                        // "흔적"으로 읽히게 한다. 상대 비교는 그대로.
                        width: `${(minutes / maxSubjectMinutes) * 90}%`,
                        minWidth: "8px",
                      }}
                    />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  );
}
