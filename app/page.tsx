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
      return { ...state, phase: "studying" };
    case "COMPLETE_STUDY":
      // 공부 완료 즉시 반응 화면으로 — 별도 확인 화면이나 추가 클릭 없음.
      return { ...state, phase: "reaction" };
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
          onStartStudy={() => dispatch({ type: "START_STUDY" })}
          onCompleteStudy={() => dispatch({ type: "COMPLETE_STUDY" })}
        />
      )}

      {state.phase === "reaction" && (
        <CharacterReaction
          onSelectFeeling={(feelingId) => dispatch({ type: "SELECT_FEELING", feelingId })}
        />
      )}

      {state.phase === "done" && state.selectedFeelingId && (
        <>
          <StudyMemoryCard feelingId={state.selectedFeelingId} />
          <StudyRecordSummary feelingId={state.selectedFeelingId} />
        </>
      )}
    </MobileLayout>
  );
}
