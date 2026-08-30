"use client";

import type { ReflectionEvidence, StudyRecord } from "@/lib/types";
import { clarityNote, formatMinutesAndSeconds } from "@/lib/mockData";
import { characterNickname } from "@/lib/characters";
import { feelingLabel, formatCompletedAt, recordCharacterId } from "@/lib/studyRecords";

// clarity 가 partial/unclear 인 카드의 흐릿한 decorative 레이어.
// 콘텐츠와 분리된 presentation 전용 — blur/opacity 는 여기(단색 반투명 shape)에만
// 걸고 텍스트에는 절대 걸지 않는다. clear/미지정은 아무것도 그리지 않는다.
// gradient/glassmorphism 아님. 정적(애니메이션 없음). aria-hidden.
//
//   partial  콘텐츠 뒤 코너 blob 1개 (가장자리만 살짝 흐림)
//   unclear  콘텐츠 뒤 blob 3개(코너 2 + 중앙 넓게) + 콘텐츠 위 cream veil
//            → "불균일한 배경 흐림 + 균일한 veil = 안개 낀 카드"
//
// veil 은 z-20 이라 콘텐츠(z-10) 위에 페인트된다. flat(블러 없음) — 불균일함은 뒤쪽
// blob 이 담당. cream veil = 회색 아닌 따뜻한 안개. unclear 는 "확실히 희미함"이 목표라
// veil /30 까지 올린다.
function MemoryHaze({ clarity }: { clarity?: ReflectionEvidence }) {
  if (clarity !== "partial" && clarity !== "unclear") return null;
  const hazy = clarity === "unclear";
  return (
    <>
      <span aria-hidden="true" className="pointer-events-none absolute inset-0">
        <span
          className={
            hazy
              ? "absolute -bottom-10 -right-8 h-32 w-36 rounded-full bg-cocoa/16 blur-lg"
              : "absolute -bottom-6 -right-4 h-24 w-28 rounded-full bg-cocoa/8 blur-md"
          }
        />
        {hazy && (
          <>
            <span className="absolute -top-7 -left-7 h-24 w-28 rounded-full bg-cocoa/10 blur-lg" />
            {/* 중앙까지 덮는 아주 넓고 약한 흐림 — 카드 안쪽도 균일하지 않게. */}
            <span className="absolute left-1/2 top-1/2 h-[55%] w-[70%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cocoa/6 blur-2xl" />
          </>
        )}
      </span>
      {hazy && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-20 bg-cream/30"
        />
      )}
    </>
  );
}

interface MemoryRecordCardProps {
  record: StudyRecord;
}

// 공부 기록 1건 카드. 원래 "기억" 탭(StudyMemoryList)의 카드 렌더 로직을
// 그대로 옮긴 것 — Calendar 날짜 상세(CalendarDayDetail)에서 재사용한다.
// 저장된 다온 문장을 그대로 표시한다. Claude API를 재호출하지 않는다.
export default function MemoryRecordCard({ record }: MemoryRecordCardProps) {
  // "흐릿함"은 라벨 + 왼쪽 tick 대비 + 카드 뒤 haze 로만 표현한다.
  // 콘텐츠 텍스트는 손대지 않는다 — 과거 공부 내용은 항상 또렷하게 읽혀야 한다.
  const note = clarityNote(record.reflectionClarity);
  const tickClass =
    record.reflectionClarity === "unclear"
      ? "border-peach-deep/20"
      : record.reflectionClarity === "partial"
        ? "border-peach-deep/35"
        : "border-peach-deep/50";

  return (
    <li className={`card border-l-2 ${tickClass} relative overflow-hidden`}>
      <MemoryHaze clarity={record.reflectionClarity} />
      <div className="relative z-10">
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-serif text-base font-bold text-cocoa">
            {record.subject}
          </span>
          <span className="shrink-0 text-xs text-warm-gray">
            {formatCompletedAt(record.completedAt)}
          </span>
        </div>

        <p className="mt-1 text-xs text-warm-gray">
          실제 공부 {formatMinutesAndSeconds(record.elapsedSeconds)} ·{" "}
          {feelingLabel(record.feelingId)}
        </p>

        {note && <p className="mt-0.5 text-[11px] text-warm-gray/70">{note}</p>}

        <div className="daon-bubble mt-3">
          <span className="mr-1 text-xs font-medium text-lavender-deep">
            {characterNickname(recordCharacterId(record))}
          </span>
          {record.characterReaction}
        </div>
      </div>
    </li>
  );
}
