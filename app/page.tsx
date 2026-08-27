"use client";

import { useReducer } from "react";
import MobileLayout from "@/components/layout/MobileLayout";
import CharacterArea from "@/components/character/CharacterArea";
import StudyCard from "@/components/study/StudyCard";
import CharacterReaction from "@/components/reaction/CharacterReaction";
import StudyMemoryCard from "@/components/memory/StudyMemoryCard";
import StudyRecordSummary from "@/components/summary/StudyRecordSummary";
import type { AppState, Action } from "@/lib/types";

const initialState: AppState = { phase: "idle" };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "START_STUDY":
      return {
        ...state,
        phase: "studying",
        studySession: { ...action.studySession, startedAt: Date.now() },
      };
    case "COMPLETE_STUDY": {
      // 공부 완료 즉시 반응 화면으로 — 별도 확인 화면이나 추가 클릭 없음.
      if (!state.studySession) {
        return { ...state, phase: "reaction" };
      }
      const startedAt = state.studySession.startedAt ?? Date.now();
      const elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000);
      return {
        ...state,
        phase: "reaction",
        studySession: { ...state.studySession, elapsedSeconds },
      };
    }
    case "SELECT_FEELING":
      return { ...state, phase: "done", selectedFeelingId: action.feelingId };
    default:
      return state;
  }
}

export default function Home() {
  const [state, dispatch] = useReducer(reducer, initialState);

  return (
    <MobileLayout>
      <CharacterArea phase={state.phase} />

      {(state.phase === "idle" || state.phase === "studying") && (
        <StudyCard
          phase={state.phase}
          studySession={state.studySession}
          onStartStudy={(session) => dispatch({ type: "START_STUDY", studySession: session })}
          onCompleteStudy={() => dispatch({ type: "COMPLETE_STUDY" })}
        />
      )}

      {state.phase === "reaction" && state.studySession && (
        <CharacterReaction
          studySession={state.studySession}
          onSelectFeeling={(feelingId) => dispatch({ type: "SELECT_FEELING", feelingId })}
        />
      )}

      {state.phase === "done" && state.studySession && state.selectedFeelingId && (
        <>
          <StudyMemoryCard studySession={state.studySession} feelingId={state.selectedFeelingId} />
          <StudyRecordSummary studySession={state.studySession} feelingId={state.selectedFeelingId} />
        </>
      )}
    </MobileLayout>
  );
}
