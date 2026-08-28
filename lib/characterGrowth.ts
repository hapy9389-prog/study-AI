// 다온의 내부 관심 상태(CharacterGrowthState)의 localStorage 영속화 + 갱신 유틸.
// StudyRecord와 완전히 분리된 저장소다 — StudyRecord는 "무슨 공부를 했나"라는
// 과거 경험이고, 여기는 "같은 경험을 몇 번 함께해서 얼마나 익숙해졌나"만 본다.
//
// 이번 단계에서는 내부 상태를 쌓기만 한다. 사용자 UI 표시, Claude 프롬프트 전달,
// XP/레벨/능력치, 외형·성격 변화는 다음 Phase에서 별도로 설계한다.

import type {
  CharacterGrowthState,
  CharacterInterest,
  InterestStage,
} from "./types";

// 기존 study-ai:study-records 와 분리된 새 key. 구조가 처음 생기는 것이라 v1을 붙인다.
const CHARACTER_GROWTH_STORAGE_KEY = "study-ai:character-growth:v1";

// 사용자가 subject를 자유 입력하므로 오타/변형으로 interest가 무한히 늘어날 수 있다.
// 이번 단계에서는 단순 상한만 둔다(정교한 병합/정리는 하지 않는다).
const MAX_INTERESTS = 50;

// 관심 단계 전환 기준. 이번 단계에서는 exposureCount 하나로만 판단한다.
// 시간 × 횟수 × 감정 같은 복잡한 공식은 쓰지 않는다.
const FAMILIAR_MIN_EXPOSURE = 3;
const INTERESTED_MIN_EXPOSURE = 6;

// 주제 비교용 정규화. 앞뒤 공백 제거 + 소문자화만 한다.
// 한국어엔 소문자화 영향이 거의 없지만 "Calculus"/"calculus" 같은 영어 입력을
// 하나로 본다. 형태소 분석·synonym·AI 분류는 하지 않는다.
export function normalizeSubject(subject: string): string {
  return subject.trim().toLowerCase();
}

// exposureCount만으로 관심 단계를 정한다. 1~2회 new, 3~5회 familiar, 6회 이상 interested.
export function stageForExposure(exposureCount: number): InterestStage {
  if (exposureCount >= INTERESTED_MIN_EXPOSURE) return "interested";
  if (exposureCount >= FAMILIAR_MIN_EXPOSURE) return "familiar";
  return "new";
}

const INTEREST_STAGES = new Set<InterestStage>(["new", "familiar", "interested"]);

function isValidDateString(value: unknown): boolean {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

// localStorage에서 온 알 수 없는 값을 CharacterInterest로 신뢰하기 전 가벼운 검증.
// firstSeenAt/lastSeenAt은 문자열 여부뿐 아니라 Date.parse로 실제 유효한 날짜인지
// 확인한다 — 파싱 불가능한 값이면 이 interest 자체를 정상 데이터로 쓰지 않는다.
// schema 라이브러리는 쓰지 않는다.
function isCharacterInterest(value: unknown): value is CharacterInterest {
  if (typeof value !== "object" || value === null) return false;
  const i = value as Record<string, unknown>;
  return (
    typeof i.subjectKey === "string" &&
    i.subjectKey !== "" &&
    typeof i.displayName === "string" &&
    typeof i.exposureCount === "number" &&
    Number.isInteger(i.exposureCount) &&
    i.exposureCount >= 1 &&
    isValidDateString(i.firstSeenAt) &&
    isValidDateString(i.lastSeenAt) &&
    typeof i.interestStage === "string" &&
    INTEREST_STAGES.has(i.interestStage as InterestStage)
  );
}

// 저장된 성장 상태를 읽는다. 없음 / 깨진 JSON / 잘못된 구조 어느 경우에도
// 앱을 깨뜨리지 않고 { interests: [] } 를 반환한다. 유효한 interest만 남기고,
// 남은 것의 interestStage는 exposureCount 기준으로 재계산해 자기수정한다.
export function loadCharacterGrowth(): CharacterGrowthState {
  if (typeof window === "undefined") return { interests: [] };
  try {
    const raw = window.localStorage.getItem(CHARACTER_GROWTH_STORAGE_KEY);
    if (!raw) return { interests: [] };
    const parsed = JSON.parse(raw);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !Array.isArray((parsed as { interests?: unknown }).interests)
    ) {
      return { interests: [] };
    }
    const interests = (parsed as { interests: unknown[] }).interests
      .filter(isCharacterInterest)
      .slice(0, MAX_INTERESTS)
      .map((interest) => ({
        ...interest,
        interestStage: stageForExposure(interest.exposureCount),
      }));
    return { interests };
  } catch {
    return { interests: [] };
  }
}

// 성장 상태를 저장한다. 용량 초과 / 저장 차단 등은 조용히 무시한다 —
// 성장 기록이 핵심 공부 흐름을 막지 않는다.
export function saveCharacterGrowth(state: CharacterGrowthState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      CHARACTER_GROWTH_STORAGE_KEY,
      JSON.stringify(state),
    );
  } catch {
    // no-op
  }
}

// 공부 완료 1건이 성장 상태에 미치는 변화를 계산하는 순수 함수.
// localStorage에 직접 접근하지 않는다(테스트/재사용을 쉽게 하기 위해).
//
// 규칙:
// - 한 번의 호출(= 한 세션 완료)은 exposureCount를 정확히 +1 한다. 공부 시간이
//   길다고 여러 단계 오르지 않는다.
// - 같은 정규화 주제면 기존 interest를 갱신하고, 처음 보는 주제면 새로 만든다.
// - 갱신/생성된 interest를 배열 맨 앞으로 옮긴다(최근 관심을 쉽게 가져오도록).
// - 전체 개수는 MAX_INTERESTS 로 제한한다.
export function updateCharacterGrowthAfterStudy(
  currentState: CharacterGrowthState,
  subject: string,
  completedAt?: string,
): CharacterGrowthState {
  const subjectKey = normalizeSubject(subject);
  // 정규화 결과가 비면(빈/공백뿐인 주제) 성장 상태를 건드리지 않는다.
  if (subjectKey === "") return currentState;

  const at = completedAt ?? new Date().toISOString();
  const existing = currentState.interests.find(
    (interest) => interest.subjectKey === subjectKey,
  );
  const others = currentState.interests.filter(
    (interest) => interest.subjectKey !== subjectKey,
  );

  let updated: CharacterInterest;
  if (existing) {
    const exposureCount = existing.exposureCount + 1;
    updated = {
      ...existing,
      displayName: subject.trim(),
      exposureCount,
      lastSeenAt: at,
      interestStage: stageForExposure(exposureCount),
    };
  } else {
    updated = {
      subjectKey,
      displayName: subject.trim(),
      exposureCount: 1,
      firstSeenAt: at,
      lastSeenAt: at,
      interestStage: stageForExposure(1),
    };
  }

  return {
    interests: [updated, ...others].slice(0, MAX_INTERESTS),
  };
}
