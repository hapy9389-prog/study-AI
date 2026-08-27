"use client";

import { useState } from "react";
import type { StudyRecord } from "@/lib/types";
import { formatMinutesAndSeconds } from "@/lib/mockData";
import {
  RECENT_RECORDS_LIMIT,
  feelingLabel,
  formatCompletedAt,
  loadStudyRecords,
} from "@/lib/studyRecords";

// "기억" 탭 화면. 저장된 최근 공부 기록을 보여준다.
// - 이 컴포넌트는 사용자가 "기억" 탭을 누른 뒤에만 마운트된다(초기 렌더/hydration
//   시점에는 존재하지 않음) → lazy useState 이니셜라이저에서 바로 localStorage를
//   읽어도 SSR 오류나 hydration mismatch가 없다. loadStudyRecords()는 서버에서
//   []를 반환하므로 그 자체로도 안전하다.
// - 탭 전환마다 이 컴포넌트가 새로 마운트되므로 방금 저장한 기록도 즉시 반영된다.
// - 저장된 다온 문장을 그대로 표시한다. Claude API를 재호출하지 않는다.
export default function StudyMemoryList() {
  const [records] = useState<StudyRecord[]>(() =>
    loadStudyRecords().slice(0, RECENT_RECORDS_LIMIT),
  );

  return (
    <section className="mx-6 flex flex-col gap-3">
      <header>
        <h2 className="text-base font-semibold text-cocoa">기억</h2>
        <p className="mt-0.5 text-xs text-warm-gray">최근 공부</p>
      </header>

      {records.length === 0 ? (
        <p className="rounded-3xl bg-white px-4 py-6 text-center text-sm text-warm-gray shadow-sm">
          아직 같이 공부한 기억이 없어요.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {records.map((record) => (
            <li
              key={record.id}
              className="rounded-3xl bg-white p-4 shadow-sm"
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-semibold text-cocoa">
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

              <div className="mt-3 rounded-2xl bg-lavender/50 px-3 py-2 text-sm text-cocoa">
                <span className="mr-1 text-xs font-medium text-lavender-deep">
                  다온
                </span>
                {record.characterReaction}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
