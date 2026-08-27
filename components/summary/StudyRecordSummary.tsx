import { memoryResult, reactionData } from "@/lib/mockData";
import type { FeelingChoice, StudySession } from "@/lib/types";

interface StudyRecordSummaryProps {
  studySession: StudySession;
  feelingId: FeelingChoice["id"];
}

export default function StudyRecordSummary({ studySession, feelingId }: StudyRecordSummaryProps) {
  const feelingLabel =
    reactionData.choices.find((choice) => choice.id === feelingId)?.label ?? "";

  // "목표 공부 시간" — not "공부 시간": there is no timer yet, so this is the
  // goal the user set, not a measured elapsed duration (Phase 3 will add that).
  const rows: { label: string; value: string }[] = [
    { label: "오늘 공부", value: studySession.subject },
    { label: "목표 공부 시간", value: `${studySession.targetMinutes}분` },
    { label: "오늘의 감상", value: feelingLabel },
    { label: "다온이의 한마디", value: memoryResult.responseLines[feelingId] },
  ];

  return (
    <section className="mx-6 rounded-3xl bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-cocoa">오늘의 학습 기록</h3>
      <dl className="mt-3 flex flex-col gap-2">
        {rows.map((row) => (
          <div key={row.label} className="flex justify-between gap-4 text-sm">
            <dt className="shrink-0 text-warm-gray">{row.label}</dt>
            <dd className="text-right text-cocoa">{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
