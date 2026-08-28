"use client";

import { useReducer, useRef, useState } from "react";
import MobileLayout from "@/components/layout/MobileLayout";
import type { NavTab } from "@/components/layout/BottomNavigation";
import CharacterArea from "@/components/character/CharacterArea";
import StudyCard from "@/components/study/StudyCard";
import CharacterReaction from "@/components/reaction/CharacterReaction";
import StudyMemoryCard from "@/components/memory/StudyMemoryCard";
import StudyMemoryList from "@/components/memory/StudyMemoryList";
import StudyRecordSummary from "@/components/summary/StudyRecordSummary";
import FriendStudySection from "@/components/friends/FriendStudySection";
import ReflectionTestPanel from "@/components/study/ReflectionTestPanel";
import MyRoom from "@/components/room/MyRoom";
import RewardResultCard from "@/components/room/RewardResultCard";
import { memoryResult } from "@/lib/mockData";
import { createStudyRecord, saveStudyRecord } from "@/lib/studyRecords";
import {
  loadCharacterGrowth,
  saveCharacterGrowth,
  updateCharacterGrowthAfterStudy,
} from "@/lib/characterGrowth";
import {
  calculateStudyReward,
  loadStudyRewardState,
  saveStudyRewardState,
  updateStudyRewardAfterStudy,
} from "@/lib/studyRewards";
import type {
  AppState,
  Action,
  FeelingChoice,
  StudyRewardResult,
} from "@/lib/types";

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
      return {
        ...state,
        phase: "done",
        selectedFeelingId: action.feelingId,
        aiReaction: action.aiReaction,
        reward: action.reward,
      };
    case "RESET":
      // done 화면 "새 공부 시작하기" — 처음 상태로. 저장된 기록은 그대로 유지된다.
      return initialState;
    case "DEBUG_SET_ELAPSED": {
      // 개발 전용: startedAt만 과거로 옮겨 기존 타이머 계산이 원하는 경과
      // 시간을 내도록 한다. production에서는 아무 동작도 하지 않는다.
      if (process.env.NODE_ENV !== "development") return state;
      if (!state.studySession) return state;
      return {
        ...state,
        studySession: {
          ...state.studySession,
          startedAt: Date.now() - action.elapsedSeconds * 1000,
        },
      };
    }
    case "DEBUG_ENTER_REACTION": {
      // 개발 전용: preset으로 만든 StudySession으로 곧바로 reaction 진입.
      // production에서는 아무 동작도 하지 않는다.
      if (process.env.NODE_ENV !== "development") return state;
      return {
        phase: "reaction",
        studySession: action.studySession,
        selectedFeelingId: undefined,
        aiReaction: undefined,
      };
    }
    default:
      return state;
  }
}

export default function Home() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [tab, setTab] = useState<NavTab>("home");

  // 한 세션당 StudyRecord는 정확히 1개만 저장한다. 감상 선택은 이벤트 핸들러라
  // Strict Mode에서도 중복 실행되지 않지만, 연타/재진입 방어로 ref를 둔다.
  const recordSavedRef = useRef(false);

  // 공부 중 · 감상 선택 중에는 탭 전환을 막아 공부에 집중하게 한다.
  const navLocked = state.phase === "studying" || state.phase === "reaction";
  const activeTab: NavTab = navLocked ? "home" : tab;

  const handleSelectFeeling = (
    feelingId: FeelingChoice["id"],
    aiReaction?: string,
  ) => {
    const session = state.studySession;
    let rewardResult: StudyRewardResult | undefined;
    if (session && !recordSavedRef.current) {
      recordSavedRef.current = true;
      // done 화면에서 실제로 보여줄 최종 문장. Claude 성공/실패 모두 이 값을 저장한다.
      const finalReaction =
        aiReaction ?? memoryResult.responseLines[feelingId];
      const record = createStudyRecord({
        subject: session.subject,
        targetMinutes: session.targetMinutes,
        elapsedSeconds: session.elapsedSeconds ?? 0,
        feelingId,
        characterReaction: finalReaction,
      });
      saveStudyRecord(record);
      // StudyRecord 하나가 완성되는 바로 이 시점에 성장 상태도 한 번만 갱신한다.
      // recordSavedRef 가드가 한 세션 1회를 보장하므로 exposureCount는 정확히 +1.
      // Claude 성공/실패와 무관하게(같은 이벤트) 반복 경험이 누적된다.
      saveCharacterGrowth(
        updateCharacterGrowthAfterStudy(
          loadCharacterGrowth(),
          session.subject,
          record.completedAt,
        ),
      );
      // StudyRecord / CharacterGrowth 와 같은 1회 가드 안에서 보상도 1회만
      // 증가시킨다(별도 rewardSavedRef 없음). evidence 와 무관하게 계산된다.
      const previousReward = loadStudyRewardState();
      const rewardCalc = calculateStudyReward(session);
      const nextReward = updateStudyRewardAfterStudy(previousReward, session);
      saveStudyRewardState(nextReward);
      rewardResult = {
        ...rewardCalc,
        previousRoomStage: previousReward.roomStage,
        roomStage: nextReward.roomStage,
      };
      if (process.env.NODE_ENV === "development") {
        // 내부 상태다 — 아직 UI에 표시하지 않으므로 개발 중 검증용으로만 찍는다.
        console.log("[growth]", loadCharacterGrowth());
        console.log("[reward]", nextReward);
      }
    }
    dispatch({ type: "SELECT_FEELING", feelingId, aiReaction, reward: rewardResult });
  };

  return (
    <MobileLayout activeTab={activeTab} onTabChange={setTab} navLocked={navLocked}>
      {activeTab === "memory" ? (
        <StudyMemoryList />
      ) : (
        <>
          <CharacterArea phase={state.phase} />

          {(state.phase === "idle" || state.phase === "studying") && (
            <StudyCard
              phase={state.phase}
              studySession={state.studySession}
              onStartStudy={(session) => {
                recordSavedRef.current = false;
                dispatch({ type: "START_STUDY", studySession: session });
              }}
              onCompleteStudy={() => dispatch({ type: "COMPLETE_STUDY" })}
              onDebugSetElapsed={(elapsedSeconds) =>
                dispatch({ type: "DEBUG_SET_ELAPSED", elapsedSeconds })
              }
            />
          )}

          {/* 개발자 모드 데모: 친구들이 공부 중인 분위기를 보여준다. 공부 시작 전
              (idle)에만 노출해 [공부 시작] CTA 를 방해하지 않는다. studying /
              reaction 에서는 아래 조건에 걸리지 않아 자동으로 숨겨진다. */}
          {process.env.NODE_ENV === "development" && state.phase === "idle" && (
            <FriendStudySection />
          )}

          {/* 개발자 모드 전용: 타이머를 거치지 않고 preset으로 바로 reaction(회고)
              진입. idle에서만 노출되고, 클릭 즉시 phase가 바뀌며 사라진다 —
              별도 lock 없이 이 구조 자체가 연타 방어다. */}
          {process.env.NODE_ENV === "development" && state.phase === "idle" && (
            <ReflectionTestPanel
              onEnterReaction={(session) => {
                recordSavedRef.current = false;
                dispatch({ type: "DEBUG_ENTER_REACTION", studySession: session });
              }}
            />
          )}

          {/* 내 방: 누적 공부로 발전하는 장기 보상 공간. idle 에서만, 공부 시작
              CTA 보다 아래에 둔다 — 홈의 가장 큰 CTA 가 되면 안 된다. */}
          {state.phase === "idle" && <MyRoom />}

          {state.phase === "reaction" && state.studySession && (
            <CharacterReaction
              studySession={state.studySession}
              onSelectFeeling={handleSelectFeeling}
            />
          )}

          {state.phase === "done" && state.studySession && state.selectedFeelingId && (
            <>
              <StudyMemoryCard
                studySession={state.studySession}
                feelingId={state.selectedFeelingId}
                aiReaction={state.aiReaction}
              />
              <StudyRecordSummary
                studySession={state.studySession}
                feelingId={state.selectedFeelingId}
                aiReaction={state.aiReaction}
              />
              {state.reward && <RewardResultCard reward={state.reward} />}
              <button
                type="button"
                onClick={() => {
                  recordSavedRef.current = false;
                  dispatch({ type: "RESET" });
                }}
                className="mx-6 rounded-full bg-peach px-4 py-3 text-sm font-medium text-cocoa transition-colors hover:bg-peach-deep"
              >
                새 공부 시작하기
              </button>
              {process.env.NODE_ENV === "development" && <FriendStudySection />}
            </>
          )}
        </>
      )}
    </MobileLayout>
  );
}
