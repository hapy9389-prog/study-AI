import { reactionData, buildReactionLine } from "@/lib/mockData";
import type { FeelingChoice, StudySession } from "@/lib/types";

interface CharacterReactionProps {
  studySession: StudySession;
  onSelectFeeling: (feelingId: FeelingChoice["id"]) => void;
}

// Shown only right after [공부 완료] — a single short line + one round of
// feeling chips. No open-ended chat, no repeated turns.
export default function CharacterReaction({ studySession, onSelectFeeling }: CharacterReactionProps) {
  const characterLine = buildReactionLine(studySession.subject, studySession.targetMinutes);

  return (
    <section className="mx-6 rounded-3xl bg-white p-5 shadow-sm">
      <div className="rounded-2xl bg-lavender/50 px-4 py-3 text-sm text-cocoa">{characterLine}</div>

      <div className="mt-4 flex flex-wrap gap-2">
        {reactionData.choices.map((choice) => (
          <button
            key={choice.id}
            type="button"
            onClick={() => onSelectFeeling(choice.id)}
            className="rounded-full bg-peach px-4 py-2 text-sm font-medium text-cocoa transition-colors hover:bg-peach-deep"
          >
            {choice.label}
          </button>
        ))}
      </div>
    </section>
  );
}
