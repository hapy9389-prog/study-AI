// 공부 완료로 누적되는 장기 보상(StudyRewardState)의 localStorage 영속화 + 계산 유틸.
// StudyRecord(lib/studyRecords.ts) · CharacterGrowthState(lib/characterGrowth.ts)와
// 완전히 분리된 저장소다 — 이쪽은 "공부한 만큼 쌓이는 코인 / 누적 공부시간 /
// 그에 따른 방 단계"만 본다.
//
// 원칙(CLAUDE.md): 벌점·코인 손실·streak 패널티·방 퇴화 없음. 공부한 만큼 계속
// 누적된다. 보상은 공부 완료 시 자동 지급이며 evidence(clear/partial/unclear)와
// 분리한다. 이번 단계에서는 상점·자유 배치·아이템 같은 확장을 하지 않는다.

import type {
  RoomStage,
  StudyRewardCalculation,
  StudyRewardState,
} from "./types";

// 기존 study-ai:study-records 와 분리된 새 key. 구조가 처음 생기는 것이라 v1을 붙인다.
const STUDY_REWARD_STORAGE_KEY = "study-ai:study-reward:v1";

// 목표 시간 달성 보너스. 이번 단계 보상 공식은 "실제 공부 분 + 목표 달성 보너스"
// 딱 두 항목뿐이다(첫 공부/주간/시즌/시간대/과목/친구 보너스 전부 없음).
const GOAL_BONUS_COINS = 10;

// 누적 공부시간(분)에 따른 방 단계 경계. 데모용으로 단순하게 간다.
const ROOM_STAGE_2_MIN_MINUTES = 60;
const ROOM_STAGE_3_MIN_MINUTES = 180;

const DEFAULT_STATE: StudyRewardState = {
  coins: 0,
  totalStudyMinutes: 0,
  roomStage: 1,
};

// 누적 공부시간 → 방 단계. 0~59분 Stage 1, 60~179분 Stage 2, 180분 이상 Stage 3.
export function getRoomStage(totalStudyMinutes: number): RoomStage {
  if (totalStudyMinutes >= ROOM_STAGE_3_MIN_MINUTES) return 3;
  if (totalStudyMinutes >= ROOM_STAGE_2_MIN_MINUTES) return 2;
  return 1;
}

// 이번 세션 1건의 보상 계산. 누적 상태를 건드리지 않는 순수 함수.
// baseCoins = 실제 공부 분(1분 = 1 coin). 1분 미만 세션은 0 coin — 이상한
// 소수 보상이 생기지 않게 항상 floor 한다.
export function calculateStudyReward(session: {
  targetMinutes: number;
  elapsedSeconds?: number;
}): StudyRewardCalculation {
  const elapsedSeconds = Math.max(0, Math.floor(session.elapsedSeconds ?? 0));
  const earnedMinutes = Math.floor(elapsedSeconds / 60);
  const baseCoins = earnedMinutes;
  const goalBonus =
    earnedMinutes >= session.targetMinutes ? GOAL_BONUS_COINS : 0;
  return {
    baseCoins,
    goalBonus,
    earnedCoins: baseCoins + goalBonus,
    earnedMinutes,
  };
}

// 공부 완료 1건이 누적 보상 상태에 미치는 변화를 계산하는 순수 함수.
// localStorage에 직접 접근하지 않는다(테스트/재사용을 쉽게 하기 위해).
// 한 번의 호출(= 한 세션 완료)은 코인/누적시간을 정확히 1회만 더한다.
export function updateStudyRewardAfterStudy(
  previous: StudyRewardState,
  session: { targetMinutes: number; elapsedSeconds?: number },
): StudyRewardState {
  const { earnedCoins, earnedMinutes } = calculateStudyReward(session);
  const totalStudyMinutes = previous.totalStudyMinutes + earnedMinutes;
  return {
    coins: previous.coins + earnedCoins,
    totalStudyMinutes,
    roomStage: getRoomStage(totalStudyMinutes),
  };
}

function isNonNegativeFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

// 저장된 보상 상태를 읽는다. 없음 / 깨진 JSON / 잘못된 구조 / 음수·비정상 값
// 어느 경우에도 앱을 깨뜨리지 않고 초기값을 반환한다. roomStage는 신뢰하지 않고
// 항상 totalStudyMinutes 기준으로 재계산해 자기수정한다.
export function loadStudyRewardState(): StudyRewardState {
  if (typeof window === "undefined") return { ...DEFAULT_STATE };
  try {
    const raw = window.localStorage.getItem(STUDY_REWARD_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_STATE };
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) {
      return { ...DEFAULT_STATE };
    }
    const candidate = parsed as Record<string, unknown>;
    if (
      !isNonNegativeFiniteNumber(candidate.coins) ||
      !isNonNegativeFiniteNumber(candidate.totalStudyMinutes)
    ) {
      return { ...DEFAULT_STATE };
    }
    const totalStudyMinutes = candidate.totalStudyMinutes;
    return {
      coins: candidate.coins,
      totalStudyMinutes,
      roomStage: getRoomStage(totalStudyMinutes),
    };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

// 보상 상태를 저장한다. 용량 초과 / 저장 차단 등은 조용히 무시한다 —
// 보상 기록이 핵심 공부 흐름을 막지 않는다.
export function saveStudyRewardState(state: StudyRewardState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      STUDY_REWARD_STORAGE_KEY,
      JSON.stringify(state),
    );
  } catch {
    // no-op
  }
}
