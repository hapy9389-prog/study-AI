"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import MobileLayout from "@/components/layout/MobileLayout";
import type { NavTab } from "@/components/layout/BottomNavigation";
import CharacterArea from "@/components/character/CharacterArea";
import StudyCard from "@/components/study/StudyCard";
import CharacterReaction from "@/components/reaction/CharacterReaction";
import StudyMemoryCard from "@/components/memory/StudyMemoryCard";
import StudyMemoryList from "@/components/memory/StudyMemoryList";
import StudyRecordSummary from "@/components/summary/StudyRecordSummary";
import FriendStudySection from "@/components/friends/FriendStudySection";
import FriendRoomsSection from "@/components/friends/FriendRoomsSection";
import FriendRoomScreen from "@/components/friends/FriendRoomScreen";
import SocialCheckInScreen from "@/components/social/SocialCheckInScreen";
import ReflectionTestPanel from "@/components/study/ReflectionTestPanel";
import MyRoom from "@/components/room/MyRoom";
import MyRoomScreen from "@/components/room/MyRoomScreen";
import RewardResultCard from "@/components/room/RewardResultCard";
import CharacterCustomization from "@/components/customization/CharacterCustomization";
import CharacterSelectScreen from "@/components/character/CharacterSelectScreen";
import { DEFAULT_CHARACTER_ID, type CharacterId } from "@/lib/characters";
import { getCharacterVoice } from "@/lib/characterVoice";
import {
  hasExistingStudyData,
  loadSelectedCharacterId,
  saveSelectedCharacterId,
} from "@/lib/selectedCharacter";
import { getFriendRoomProfile, getFriendStudyStatuses } from "@/lib/mockFriends";
import {
  equipAccessory,
  loadCharacterCustomizationState,
  purchaseAccessory,
  saveCharacterCustomizationState,
  unequipAccessory,
} from "@/lib/characterCustomization";
import {
  createStudyRecord,
  getTodayStudyMinutes,
  loadStudyRecords,
  saveStudyRecord,
} from "@/lib/studyRecords";
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
  CharacterAccessoryId,
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

  // 선택된 공부 동반자. localStorage 는 클라이언트에서만 읽을 수 있어, SSR/최초
  // hydration 에서는 항상 "확인 전"(BootSplash)으로 렌더하고 useEffect 에서 해석한다
  // — early-return 트리가 서버/클라 사이에서 갈라지지 않게 하기 위함.
  //   저장된 값 있음        → 그 캐릭터
  //   없음 + 기존 공부 데이터 → 다온으로 자동 매핑(기존 사용자, 선택 화면 안 봄)
  //   없음 + 데이터 없음      → 신규 사용자, 선택 화면
  // { checked, id } 를 한 번에 갱신한다. effect 본문에서 직접 setState 하면
  // react-hooks/set-state-in-effect 에 걸리므로 setTimeout(0) 으로 미룬다
  // (SocialCheckInScreen 과 같은 패턴).
  const [characterResolution, setCharacterResolution] = useState<{
    checked: boolean;
    id: CharacterId | null;
  }>({ checked: false, id: null });

  useEffect(() => {
    const t = setTimeout(() => {
      const saved = loadSelectedCharacterId();
      if (saved) {
        setCharacterResolution({ checked: true, id: saved });
      } else if (hasExistingStudyData()) {
        saveSelectedCharacterId(DEFAULT_CHARACTER_ID);
        setCharacterResolution({ checked: true, id: DEFAULT_CHARACTER_ID });
      } else {
        setCharacterResolution({ checked: true, id: null });
      }
    }, 0);
    return () => clearTimeout(t);
  }, []);

  const { checked: characterChecked, id: selectedCharacterId } =
    characterResolution;

  const handlePickCharacter = (id: CharacterId) => {
    saveSelectedCharacterId(id);
    setCharacterResolution({ checked: true, id });
  };

  // 앱 첫 진입에서만 보여주는 Social Check-in 진입 화면. 순수 UI state 로,
  // localStorage 에 저장하지 않는다 — 새로고침하면 다시 보여도 된다. 같은 세션
  // 안에서는 reducer state 와 분리돼 있어 RESET 등으로 다시 나타나지 않는다.
  const [showSocialCheckIn, setShowSocialCheckIn] = useState(true);
  // startedAt 안정성을 위해 모듈 캐시된 Mock 친구 목록을 한 번만 읽는다.
  const [friends] = useState(() => getFriendStudyStatuses());

  // 다온 꾸미기 — page.tsx 가 customization/coin state 의 source 다. 장착 즉시
  // CharacterArea/MyRoom 외형이 바뀌도록 여기서 관리하고 props 로 내려준다.
  // showCustomization 은 순수 UI state(early-return 으로 홈을 대체).
  const [customization, setCustomization] = useState(() =>
    loadCharacterCustomizationState(),
  );
  const [rewardState, setRewardState] = useState(() => loadStudyRewardState());
  const [showCustomization, setShowCustomization] = useState(false);
  // "내 공부 친구" 화면에서 여는 캐릭터 변경 화면. idle 에서만(세션 중 변경 방지).
  const [showCharacterSelect, setShowCharacterSelect] = useState(false);

  // 친구 공간 / 내 공간 전체 화면. 새 ViewState 없이 순수 UI state 로 홈을 대체한다
  // (CharacterCustomization 와 같은 early-return). idle 에서만 진입 가능.
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
  const [showMyRoomScreen, setShowMyRoomScreen] = useState(false);
  // 내 "오늘 공부시간" — StudyRecord 에서 계산. 클릭 시점에만 채운다(SSR 안 탐).
  const [myTodayStudyMinutes, setMyTodayStudyMinutes] = useState<number | null>(
    null,
  );

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
        aiReaction ??
        getCharacterVoice(selectedCharacterId ?? DEFAULT_CHARACTER_ID)
          .responseLines[feelingId];
      const record = createStudyRecord({
        subject: session.subject,
        targetMinutes: session.targetMinutes,
        elapsedSeconds: session.elapsedSeconds ?? 0,
        feelingId,
        characterReaction: finalReaction,
        characterId: selectedCharacterId ?? DEFAULT_CHARACTER_ID,
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
      // page.tsx 가 rewardState 의 source — 저장과 함께 메모리 상태도 갱신해
      // RESET 후 idle 상단 Hero 의 roomStage 가 최신이 되게 한다.
      setRewardState(nextReward);
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

  // 꾸미기 화면을 열 때, 그 사이 공부 완료로 늘었을 수 있는 coin 을 최신값으로
  // 다시 읽는다(handleSelectFeeling 은 localStorage 에만 저장하므로).
  const openCustomization = () => {
    setRewardState(loadStudyRewardState());
    setCustomization(loadCharacterCustomizationState());
    setShowCustomization(true);
  };

  // 구매: 메모리에서 reward/customization 둘 다 계산 → 둘 다 저장 → 둘 다 setState.
  // 실패(코인 부족/이미 보유/무효)면 아무것도 바꾸지 않는다.
  const handlePurchase = (id: CharacterAccessoryId) => {
    const result = purchaseAccessory(rewardState, customization, id);
    if (!result.success) return;
    saveStudyRewardState(result.rewardState);
    saveCharacterCustomizationState(result.customizationState);
    setRewardState(result.rewardState);
    setCustomization(result.customizationState);
  };

  const handleEquip = (id: CharacterAccessoryId) => {
    const next = equipAccessory(customization, id);
    saveCharacterCustomizationState(next);
    setCustomization(next);
  };

  const handleUnequip = () => {
    const next = unequipAccessory(customization);
    saveCharacterCustomizationState(next);
    setCustomization(next);
  };

  // 내 공간을 열 때 최신 상태를 다시 읽는다 — 그 사이 공부 완료로 roomStage/누적/
  // 오늘 공부시간이 바뀌었을 수 있다(handleSelectFeeling 은 localStorage 에만 저장).
  const openMyRoomScreen = () => {
    setRewardState(loadStudyRewardState());
    setMyTodayStudyMinutes(getTodayStudyMinutes(loadStudyRecords(), Date.now()));
    setShowMyRoomScreen(true);
  };

  // SSR/최초 렌더는 항상 여기 — 캐릭터 해석이 끝나기 전. 빈 cream 컬럼(한 프레임).
  if (!characterChecked) {
    return (
      <div className="flex min-h-screen w-full justify-center bg-warm-gray/10">
        <div className="min-h-screen w-full max-w-[430px] bg-cream shadow-[var(--shadow-lift)]" />
      </div>
    );
  }

  // 아직 동반자를 고른 적 없는 신규 사용자 → 다른 어떤 화면보다 먼저 선택 화면.
  if (selectedCharacterId === null) {
    return <CharacterSelectScreen onSelect={handlePickCharacter} />;
  }

  // 캐릭터 변경 화면. idle 에서만 — studying/reaction/done 중에는 진입점
  // 자체가 없지만(아래 참고), 방어적으로 phase 도 확인한다. 세션 상태는 안 만든다.
  if (showCharacterSelect && state.phase === "idle") {
    return (
      <CharacterSelectScreen
        mode="change"
        currentCharacterId={selectedCharacterId}
        onSelect={(id) => {
          handlePickCharacter(id);
          setShowCharacterSelect(false);
        }}
        onCancel={() => setShowCharacterSelect(false)}
      />
    );
  }

  if (showCustomization) {
    return (
      <CharacterCustomization
        characterId={selectedCharacterId}
        coins={rewardState.coins}
        customization={customization}
        onPurchase={handlePurchase}
        onEquip={handleEquip}
        onUnequip={handleUnequip}
        onOpenCharacterSelect={() => setShowCharacterSelect(true)}
        onBack={() => setShowCustomization(false)}
      />
    );
  }

  if (showSocialCheckIn) {
    return (
      <SocialCheckInScreen
        friends={friends}
        onContinue={() => setShowSocialCheckIn(false)}
      />
    );
  }

  if (selectedFriendId) {
    const friend = friends.find((f) => f.id === selectedFriendId);
    const roomProfile = getFriendRoomProfile(selectedFriendId);
    if (friend && roomProfile) {
      return (
        <FriendRoomScreen
          friend={friend}
          roomProfile={roomProfile}
          onBack={() => setSelectedFriendId(null)}
        />
      );
    }
  }

  if (showMyRoomScreen) {
    return (
      <MyRoomScreen
        characterId={selectedCharacterId}
        rewardState={rewardState}
        equippedAccessoryId={customization.equippedAccessoryId}
        todayStudyMinutes={myTodayStudyMinutes}
        onBack={() => setShowMyRoomScreen(false)}
      />
    );
  }

  return (
    <MobileLayout activeTab={activeTab} onTabChange={setTab} navLocked={navLocked}>
      {activeTab === "memory" ? (
        <StudyMemoryList />
      ) : state.phase === "studying" && state.studySession ? (
        // 공부 중: 카드 스택이 아니라 하나의 조용한 장면. 캐릭터 + 타이머 +
        // [공부 완료] 를 세로 중앙에 모으고 다른 요소는 띄우지 않는다.
        <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-4">
          <CharacterArea
            phase="studying"
            characterId={selectedCharacterId}
            equippedAccessoryId={customization.equippedAccessoryId}
          />
          <StudyCard
            phase="studying"
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
        </div>
      ) : (
        <>
          <CharacterArea
            phase={state.phase}
            characterId={selectedCharacterId}
            roomStage={rewardState.roomStage}
            equippedAccessoryId={customization.equippedAccessoryId}
          />

          {state.phase === "idle" && (
            <StudyCard
              phase="idle"
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

          {/* 내 공간 요약 + 친구 공간: idle 에서만, 공부 시작 CTA 보다 아래.
              방 그림은 상단 Hero 에 이미 나오므로 여기서는 누적시간/코인/진입
              버튼만 — 홈의 가장 큰 CTA 가 되면 안 된다. */}
          {state.phase === "idle" && (
            <>
              <MyRoom
                onOpenRoom={openMyRoomScreen}
                onOpenCustomization={openCustomization}
              />
              <FriendRoomsSection
                friends={friends}
                onVisit={setSelectedFriendId}
              />
            </>
          )}

          {state.phase === "reaction" && state.studySession && (
            <CharacterReaction
              characterId={selectedCharacterId}
              studySession={state.studySession}
              onSelectFeeling={handleSelectFeeling}
            />
          )}

          {state.phase === "done" && state.studySession && state.selectedFeelingId && (
            <>
              <StudyMemoryCard
                characterId={selectedCharacterId}
                studySession={state.studySession}
                feelingId={state.selectedFeelingId}
                aiReaction={state.aiReaction}
              />
              <StudyRecordSummary
                studySession={state.studySession}
                feelingId={state.selectedFeelingId}
              />
              {state.reward && <RewardResultCard reward={state.reward} />}
              <div className="mx-6">
                <button
                  type="button"
                  onClick={() => {
                    recordSavedRef.current = false;
                    dispatch({ type: "RESET" });
                  }}
                  className="btn-primary"
                >
                  새 공부 시작하기
                </button>
              </div>
              {process.env.NODE_ENV === "development" && <FriendStudySection />}
            </>
          )}
        </>
      )}
    </MobileLayout>
  );
}
