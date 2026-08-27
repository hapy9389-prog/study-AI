import { memoryResult, buildMemoryLine, formatTogetherMinutes } from "@/lib/mockData";
import type { FeelingChoice, StudySession } from "@/lib/types";

interface StudyMemoryCardProps {
  studySession: StudySession;
  feelingId: FeelingChoice["id"];
}

// No "EXP +10" — growth is expressed as a single remembered-topic message
// plus one plain sentence nudging toward the next study session (never a
// mini-game or notification-style hook, just a calm line).
export default function StudyMemoryCard({ studySession, feelingId }: StudyMemoryCardProps) {
  return (
    <section className="mx-6 rounded-3xl bg-white p-5 shadow-sm">
      <div className="rounded-2xl bg-lavender/50 px-4 py-3 text-sm text-cocoa">
        {memoryResult.responseLines[feelingId]}
      </div>

      <div className="mt-4 rounded-2xl bg-mint/60 px-4 py-4 text-center">
        <p className="text-sm font-semibold text-cocoa">{memoryResult.memoryMessage}</p>
        <p className="mt-1 text-xs text-warm-gray">{buildMemoryLine(studySession.subject)}</p>
        <p className="mt-1 text-xs text-warm-gray">
          함께한 시간: {formatTogetherMinutes(studySession.elapsedSeconds ?? 0)}
        </p>
      </div>

      <p className="mt-3 text-center text-sm text-cocoa">{memoryResult.nextStudyNudge}</p>
    </section>
  );
}
