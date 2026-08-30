"use client";

import type { ReflectionEvidence, StudyRecord } from "@/lib/types";
import { clarityNote, formatMinutesAndSeconds } from "@/lib/mockData";
import { characterNickname } from "@/lib/characters";
import { feelingLabel, recordCharacterId } from "@/lib/studyRecords";

// 접힌 행 오른쪽의 펼침 표시. BottomNavigation과 같은 line-icon 스타일
// (stroke=currentColor, round cap/join) — 아이콘 라이브러리를 새로 쓰지 않는다.
// 펼쳐지면 180도 회전만 시켜 위쪽을 가리키게 한다(별도 path 없음).
function ChevronIcon({ isExpanded }: { isExpanded: boolean }) {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`shrink-0 text-warm-gray transition-transform ${isExpanded ? "rotate-180" : ""}`}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

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
  isExpanded: boolean;
  onToggle: (id: string) => void;
}

// 공부 기록 1건. 기본은 subject + 공부시간만 보이는 compact 행이고, 누르면
// 그 자리에서 다온 반응/기분/clarity 상세가 펼쳐진다(한 번에 하나만 —
// expandedRecordId는 CalendarDayDetail이 들고 있다). 저장된 다온 문장을
// 그대로 표시할 뿐 Claude API를 재호출하지 않는다.
export default function MemoryRecordCard({ record, isExpanded, onToggle }: MemoryRecordCardProps) {
  // "흐릿함"은 라벨 + 왼쪽 tick 대비 + haze 로만 표현한다.
  // 콘텐츠 텍스트는 손대지 않는다 — 과거 공부 내용은 항상 또렷하게 읽혀야 한다.
  const note = clarityNote(record.reflectionClarity);
  const tickClass =
    record.reflectionClarity === "unclear"
      ? "border-peach-deep/20"
      : record.reflectionClarity === "partial"
        ? "border-peach-deep/35"
        : "border-peach-deep/50";

  return (
    <li>
      <button
        type="button"
        onClick={() => onToggle(record.id)}
        aria-expanded={isExpanded}
        className="flex w-full items-center justify-between gap-3 py-2 text-left"
      >
        <span className="min-w-0 truncate text-sm text-cocoa">{record.subject}</span>
        <span className="flex shrink-0 items-center gap-1 text-xs text-warm-gray">
          {formatMinutesAndSeconds(record.elapsedSeconds)}
          <ChevronIcon isExpanded={isExpanded} />
        </span>
      </button>

      {isExpanded && (
        <div className={`relative overflow-hidden border-l-2 ${tickClass} py-2 pl-3`}>
          <MemoryHaze clarity={record.reflectionClarity} />
          <div className="relative z-10">
            <p className="text-xs text-warm-gray">
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
        </div>
      )}
    </li>
  );
}
