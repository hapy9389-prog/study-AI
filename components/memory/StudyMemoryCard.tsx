import {
  memoryResult,
  buildMemoryLine,
  buildMemoryMessage,
  formatTogetherMinutes,
} from "@/lib/mockData";
import { characterNickname, type CharacterId } from "@/lib/characters";
import { getCharacterVoice } from "@/lib/characterVoice";
import type { FeelingChoice, StudySession } from "@/lib/types";

interface StudyMemoryCardProps {
  characterId: CharacterId;
  studySession: StudySession;
  feelingId: FeelingChoice["id"];
  // /api/reaction 이 생성한 동반자의 한마디. 없으면 Mock responseLines fallback.
  aiReaction?: string;
}

// No "EXP +10" — growth is expressed as a single remembered-topic message
// plus one plain sentence nudging toward the next study session (never a
// mini-game or notification-style hook, just a calm line).
export default function StudyMemoryCard({
  characterId,
  studySession,
  feelingId,
  aiReaction,
}: StudyMemoryCardProps) {
  return (
    <section className="card mx-6">
      <div className="daon-bubble">
        {aiReaction ?? getCharacterVoice(characterId).responseLines[feelingId]}
      </div>

      <div className="milestone mt-4 text-center">
        <p className="font-serif text-sm font-bold text-cocoa">
          {buildMemoryMessage(characterNickname(characterId))}
        </p>
        <p className="mt-1 text-xs text-warm-gray">
          {buildMemoryLine(studySession.subject)}
        </p>
        <p className="mt-1 text-xs text-warm-gray">
          함께한 시간: {formatTogetherMinutes(studySession.elapsedSeconds ?? 0)}
        </p>
      </div>

      <p className="mt-3 text-center text-sm text-cocoa">{memoryResult.nextStudyNudge}</p>
    </section>
  );
}
