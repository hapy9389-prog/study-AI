"use client";

import type { ReflectionEvidence, StudyRecord } from "@/lib/types";
import { formatMinutesAndSeconds } from "@/lib/mockData";
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

// 행 오른쪽의 clarity 표시. 이모지는 여기(작은 상태 표시)에만 쓴다 —
// 네비게이션/버튼 등 주요 UI 아이콘은 계속 inline SVG를 쓴다. 장식용이라
// aria-hidden — 실제 상세(실제 공부 시간·기분)는 펼쳤을 때 텍스트로 이미 있다.
function ClarityEmoji({ clarity }: { clarity?: ReflectionEvidence }) {
  if (clarity === "clear") return <span aria-hidden="true">☀️</span>;
  if (clarity === "partial") return <span aria-hidden="true">🌤️</span>;
  if (clarity === "unclear") return <span aria-hidden="true">☁️</span>;
  // 판정 없는 legacy 기록 — CalendarGrid 범례와 같은 중립 점.
  return <span aria-hidden="true" className="h-1 w-1 rounded-full bg-warm-gray" />;
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
  return (
    <li>
      <button
        type="button"
        onClick={() => onToggle(record.id)}
        aria-expanded={isExpanded}
        className="flex w-full items-center justify-between gap-3 py-2 text-left"
      >
        <span className="min-w-0 truncate text-sm text-cocoa">{record.subject}</span>
        <span className="flex shrink-0 items-center gap-1.5 text-xs text-warm-gray">
          {formatMinutesAndSeconds(record.elapsedSeconds)}
          <ClarityEmoji clarity={record.reflectionClarity} />
          <ChevronIcon isExpanded={isExpanded} />
        </span>
      </button>

      {isExpanded && (
        <div className="flex flex-col gap-2 py-2">
          <p className="text-xs text-warm-gray">
            실제 공부 {formatMinutesAndSeconds(record.elapsedSeconds)} ·{" "}
            {feelingLabel(record.feelingId)}
          </p>

          <div>
            <p className="text-xs font-medium text-lavender-deep">
              {characterNickname(recordCharacterId(record))}
            </p>
            <p className="mt-1 rounded-xl bg-lavender/15 px-3 py-2 text-sm leading-relaxed text-cocoa">
              {record.characterReaction}
            </p>
          </div>
        </div>
      )}
    </li>
  );
}
