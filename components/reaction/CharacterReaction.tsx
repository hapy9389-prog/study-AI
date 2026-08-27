"use client";

import { useState } from "react";
import { reactionData, buildReactionLine } from "@/lib/mockData";
import type { FeelingChoice, StudySession } from "@/lib/types";

interface CharacterReactionProps {
  studySession: StudySession;
  onSelectFeeling: (feelingId: FeelingChoice["id"], aiReaction?: string) => void;
}

// Shown only right after [공부 완료] — a single short line + one round of
// feeling chips. No open-ended chat, no repeated turns.
//
// 감상 선택 시 /api/reaction 을 호출해 다온의 한마디를 생성한다. 실패/타임아웃이면
// aiReaction 없이 진행하고, done 화면이 mockData fallback을 쓴다 — AI 호출 때문에
// 공부 결과 화면이 막히지 않는다.
export default function CharacterReaction({ studySession, onSelectFeeling }: CharacterReactionProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const characterLine = buildReactionLine(studySession.subject, studySession.elapsedSeconds ?? 0);

  const handleSelectFeeling = async (feelingId: FeelingChoice["id"]) => {
    if (isGenerating) return;
    setIsGenerating(true);

    // try/catch/finally 어디서든 안전하게 읽을 수 있도록 바깥 스코프에 선언.
    let aiReaction: string | undefined;

    try {
      const response = await fetch("/api/reaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: studySession.subject,
          targetMinutes: studySession.targetMinutes,
          elapsedSeconds: studySession.elapsedSeconds ?? 0,
          feelingId,
        }),
      });

      if (response.ok) {
        const data = (await response.json()) as { reaction?: unknown };
        if (typeof data.reaction === "string" && data.reaction.trim() !== "") {
          aiReaction = data.reaction.trim();
        } else {
          console.error("[CharacterReaction] 예상치 못한 응답 형식:", data);
        }
      } else {
        console.error("[CharacterReaction] /api/reaction 실패:", response.status);
      }
    } catch (error) {
      console.error("[CharacterReaction] /api/reaction 호출 오류:", error);
    } finally {
      // phase가 done으로 바뀌며 이 컴포넌트는 unmount → setIsGenerating(false) 불필요.
      onSelectFeeling(feelingId, aiReaction);
    }
  };

  if (isGenerating) {
    return (
      <section className="mx-6 rounded-3xl bg-white p-5 shadow-sm">
        <p className="flex items-center justify-center gap-2 py-4 text-sm text-warm-gray">
          <span className="h-2 w-2 animate-pulse rounded-full bg-lavender-deep" />
          다온이가 오늘 공부를 떠올리고 있어요...
        </p>
      </section>
    );
  }

  return (
    <section className="mx-6 rounded-3xl bg-white p-5 shadow-sm">
      <div className="rounded-2xl bg-lavender/50 px-4 py-3 text-sm text-cocoa">{characterLine}</div>

      <div className="mt-4 flex flex-wrap gap-2">
        {reactionData.choices.map((choice) => (
          <button
            key={choice.id}
            type="button"
            onClick={() => handleSelectFeeling(choice.id)}
            className="rounded-full bg-peach px-4 py-2 text-sm font-medium text-cocoa transition-colors hover:bg-peach-deep"
          >
            {choice.label}
          </button>
        ))}
      </div>
    </section>
  );
}
