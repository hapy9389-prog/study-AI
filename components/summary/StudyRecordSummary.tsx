import { memoryResult, reactionData, formatMinutesAndSeconds, buildGoalMessage } from "@/lib/mockData";
import type { FeelingChoice, StudySession } from "@/lib/types";

interface StudyRecordSummaryProps {
  studySession: StudySession;
  feelingId: FeelingChoice["id"];
  // /api/reaction 이 생성한 다온의 한마디. 없으면 Mock responseLines fallback.
  aiReaction?: string;
}

export default function StudyRecordSummary({
  studySession,
  feelingId,
  aiReaction,
}: StudyRecordSummaryProps) {
  const feelingLabel =
    reactionData.choices.find((choice) => choice.id === feelingId)?.label ?? "";
  const elapsedSeconds = studySession.elapsedSeconds ?? 0;
  const goalMessage = buildGoalMessage(studySession.targetMinutes, elapsedSeconds);

  // "목표 공부 시간"(사용자가 설정한 목표)과 "실제 공부 시간"(측정값)을
  // 절대 같은 의미로 섞지 않는다.
  const rows: { label: string; value: string }[] = [
    { label: "오늘 공부", value: studySession.subject },
    { label: "목표 공부 시간", value: `${studySession.targetMinutes}분` },
    { label: "실제 공부 시간", value: formatMinutesAndSeconds(elapsedSeconds) },
    { label: "오늘의 감상", value: feelingLabel },
    { label: "다온이의 한마디", value: aiReaction ?? memoryResult.responseLines[feelingId] },
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
      <p className="mt-3 rounded-2xl bg-mint/60 px-4 py-2 text-center text-sm font-medium text-cocoa">
        {goalMessage}
      </p>
    </section>
  );
}
