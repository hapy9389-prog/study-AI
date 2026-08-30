// Mock-data-only shared types for the Phase 1/2 UI prototype.
// No real API/DB shapes here — everything mirrors lib/mockData.ts.

import type { CharacterId } from "./characters";

export type Expression = "curious" | "quiet" | "happy" | "excited";

// A user-entered study session. `targetMinutes` is a goal the user set.
// `startedAt`/`elapsedSeconds` are stamped by the reducer (Phase 3) — never
// set by StudyCard directly, so components only ever read them.
export interface StudySession {
  subject: string;
  targetMinutes: number;
  /** Date.now() ms timestamp, stamped by the reducer on START_STUDY. */
  startedAt?: number;
  /** Final measured elapsed seconds, stamped by the reducer on COMPLETE_STUDY. */
  elapsedSeconds?: number;
}

// 공부 후 감정 3단계 축. 내부 semantic 의미는 positive/neutral/negative 로 통일한다
// (UI 에 "긍정/중립/부정" 이라고 직접 표기하지 않는다 — 사용자에겐 감성 copy 만 보인다).
// 구 기록의 legacy id("proud"/"tired"/"fun")는 저장/마이그레이션하지 않고, 읽을 때
// normalizeFeelingId() 로 흡수한다(lib/mockData.ts). 표시는 원래 라벨을 유지한다.
export type FeelingSemantic = "positive" | "neutral" | "negative";

export interface FeelingChoice {
  id: FeelingSemantic;
  label: string;
}

// 완료되어 localStorage에 저장된 과거 공부 1건. 진행 중인 StudySession과
// 다른 개념이다 — StudyRecord는 불변 스냅샷이고, id/완료 시각과 그때 실제로
// 화면에 쓰인 다온의 최종 문장(characterReaction)을 그대로 담는다.
// 최근 일부는 StudyMemoryContext로 추려 Claude prompt에 전달된다(characterReaction 제외).
export interface StudyRecord {
  id: string;
  subject: string;
  /** 사용자가 설정했던 목표 시간(분). 실제 공부 시간과 혼동 금지. */
  targetMinutes: number;
  /** 측정된 실제 공부 시간(초). */
  elapsedSeconds: number;
  feelingId: FeelingChoice["id"];
  /** done 화면에서 실제로 쓰인 최종 문장(AI 성공 시 AI 문장, 실패 시 Mock fallback). */
  characterReaction: string;
  /** new Date().toISOString() */
  completedAt: string;
  /**
   * 이 공부를 함께한 동반자. 캐릭터 선택 기능 이전 기록엔 없다 —
   * 없으면 DEFAULT_CHARACTER_ID(다온)으로 간주한다. 전체 목록/통계는 캐릭터
   * 무관하게 다 쓰고, LLM 에 넘기는 최근 기억만 이 값으로 필터한다.
   */
  characterId?: CharacterId;
  /**
   * 회고 대화에서 최종적으로 도달한 판정(첫 답변 + follow-up 답변까지 반영).
   * 없으면(구 기록 · assessment 미수행/실패) clarity 표현 없이 기존과 동일하게 렌더한다.
   * "정답/실패"가 아니라 "이 공부가 얼마나 선명한 기억으로 남았는가"만 나타낸다.
   * reward/stats/growth 계산에는 절대 들어가지 않는다.
   */
  reflectionClarity?: ReflectionEvidence;
}

// Claude 프롬프트에 넘기는 최소 과거 기억. StudyRecord에서 필요한 사실만 추린다.
// characterReaction(과거 AI 문장)은 넣지 않는다 — AI가 자기 문장을 따라 쓰는 것을
// 막고, 프롬프트/비용을 작게 유지하기 위함. targetMinutes도 이번 기억 반응에는
// 불필요해서 뺀다(실제 공부 시간이 더 중요).
export interface StudyMemoryContext {
  subject: string;
  elapsedSeconds: number;
  feelingId: FeelingChoice["id"];
  completedAt: string;
  /**
   * 그 공부가 얼마나 선명한 기억으로 남았는지. partial/unclear 일 때만 채워 LLM
   * 프롬프트에 넘긴다(clear/미지정은 생략 — 기본값이라 노이즈만 늘린다).
   */
  reflectionClarity?: ReflectionEvidence;
}

export interface ReactionData {
  choices: FeelingChoice[];
}

// 다온의 관심 단계. 내부 상태다 — 사용자 UI/Claude 프롬프트에 아직 노출하지 않는다.
export type InterestStage = "new" | "familiar" | "interested";

// 반복된 공부 경험이 다온에게 만든 익숙함/관심. StudyRecord("무슨 공부를 했나")와
// 역할이 다르다 — 이쪽은 "같은 경험을 몇 번 함께했나"라는 반복성만 본다.
export interface CharacterInterest {
  /** normalizeSubject() 결과 — 같은 주제인지 비교하는 데만 쓴다. */
  subjectKey: string;
  /** 사용자가 최근 입력한 원래 주제명(trim). 나중에 자연스러운 문구 생성용. */
  displayName: string;
  /** 해당 주제를 완료한 세션 수. 한 세션당 정확히 +1(공부 시간과 무관). */
  exposureCount: number;
  /** 처음 경험한 시점. new Date().toISOString() */
  firstSeenAt: string;
  /** 최근 경험한 시점. new Date().toISOString() */
  lastSeenAt: string;
  interestStage: InterestStage;
}

export interface CharacterGrowthState {
  interests: CharacterInterest[];
}

// 공부 완료로 누적되는 장기 보상. StudyRecord("무슨 공부를 했나") ·
// CharacterGrowthState("몇 번 함께했나")와 별도 저장소다 — 이쪽은 "공부한 만큼
// 쌓이는 코인/누적시간/방 단계"만 본다. 벌점·퇴화·streak 없음(공부한 만큼 누적).
export type RoomStage = 1 | 2 | 3;

export interface StudyRewardState {
  coins: number;
  totalStudyMinutes: number;
  roomStage: RoomStage;
}

// calculateStudyReward() 결과 — 이번 세션 1건의 보상 계산값(누적 아님).
export interface StudyRewardCalculation {
  /** 실제 공부 분 = Math.floor(elapsedSeconds / 60) */
  baseCoins: number;
  /** 목표 시간 달성 시 +10, 아니면 0 */
  goalBonus: number;
  /** baseCoins + goalBonus */
  earnedCoins: number;
  /** 누적 totalStudyMinutes에 더해질 분 */
  earnedMinutes: number;
}

// done 화면 보상 카드에 넘기는 이번 세션 결과 — 계산값 + 방 단계 변화.
export interface StudyRewardResult extends StudyRewardCalculation {
  previousRoomStage: RoomStage;
  roomStage: RoomStage;
}

// 회고 답변에 이번 공부 주제와 관련된 내용의 흔적이 얼마나 드러나는지에 대한
// 내부 분류. "정답 여부"나 "실제로 공부했는지"를 인증하는 값이 아니다 —
// clear 도 "공부했음이 확인됨"이 아니라 "답변에 구체적 흔적이 있음"일 뿐이다.
// StudyRecord.reflectionClarity 로 선택적으로 저장되어 "기억이 얼마나 선명하게
// 남았는가"의 표현(done 문구·Memory 카드·캐릭터 반응)에만 쓰인다. raw enum 자체는
// 사용자 UI에 노출하지 않고, reward/stats/growth 계산에는 들어가지 않는다.
export type ReflectionEvidence = "clear" | "partial" | "unclear";

export interface MemoryResult {
  nextStudyNudge: string;
}

// 공부로 얻은 coin(StudyRewardState.coins)을 소비해 다온에게 장착하는 순수 외형
// 아이템. 능력치·세트효과·희귀도·뽑기 없음. coin 은 StudyRewardState 하나만
// source of truth 이므로 여기서 coin 을 따로 갖지 않는다(lib/characterCustomization.ts).
export type CharacterAccessoryId = "glasses" | "hat" | "headphones" | "star-pin";

export interface CharacterAccessory {
  id: CharacterAccessoryId;
  name: string;
  price: number;
}

export interface CharacterCustomizationState {
  ownedAccessoryIds: CharacterAccessoryId[];
  /** 한 번에 하나만 장착. null 이면 아무것도 장착하지 않은 기본 모습. */
  equippedAccessoryId: CharacterAccessoryId | null;
}

// Mock 친구 상태. 데이터는 데모용(실제 친구/DB/Auth 아님, lib/mockFriends.ts)이지만
// 이 상태를 쓰는 Social Check-in 진입 화면은 production 에서도 렌더된다.
export type FriendStudyStatusType = "studying" | "completed" | "idle";

// 친구별 캐릭터 외형 식별자. 지금은 CSS 일러스트로 렌더하고, 나중에
// avatarId → /characters/<id>.webp 같은 실제 이미지로 교체하기 쉽게 union 으로 둔다.
export type FriendAvatarId =
  | "minsu"
  | "seoyeon"
  | "jihun"
  | "yujin"
  | "harin"
  | "doyun";

export interface FriendStudyStatus {
  id: string;
  nickname: string;
  avatarId: FriendAvatarId;
  status: FriendStudyStatusType;
  /** studying / completed 일 때 표시할 과목. idle 이면 없음. */
  subject?: string;
  /**
   * studying 상태에서만 사용. Date.now() 기준 ms 타임스탬프.
   * 경과 시간은 화면에서 now - startedAt 으로 계산한다(누적 +1 아님).
   */
  startedAt?: number;
  /** 오늘 누적 공부 시간(분). completed 카드에서 사용. */
  todayStudyMinutes: number;
}

// RoomScene 안에 놓이는 작은 소품 하나. "누구의 방이냐"와 무관한 일반 개념이라
// FriendRoomProfile 전용이 아니다 — 지금은 친구 mock 데이터에서만 값을 채우지만,
// 나중에 플레이어 자신의 방 꾸미기가 생기면 그대로 재사용한다(components/room/RoomDecoration.tsx).
// RoomScene 이 stage 2/3 에서 자동으로 그리는 러그/스탠드/식물/책장/벽장식과는
// 겹치지 않는, 완전히 다른 소품만 이 union 에 넣는다(중복 렌더 방지).
export type RoomDecorationId = "cushion" | "poster" | "fairy-lights" | "photo-frame";

// 친구에게 공개되는 Study Space 프로필. My Study Space(실제 localStorage)와 같은
// "공개 정보" 개념 — 캐릭터·방 성장·공부시간까지만. coin·회고 답변·evidence·
// CharacterGrowth 관심도 같은 개인 정보는 절대 넣지 않는다. 향후 실제 서버가
// 붙으면 이 구조를 GET /users/:id/study-space 응답으로 교체할 수 있다.
// todayStudyMinutes 는 FriendStudyStatus 에 이미 있으므로 중복 정의하지 않는다.
export interface FriendRoomProfile {
  /** FriendStudyStatus.id 와 매칭 */
  friendId: string;
  roomStage: RoomStage;
  totalStudyMinutes: number;
  /**
   * stage 와 별개로 이 친구만의 방 개성을 준다. 같은 roomStage 친구끼리도
   * 서로 다른 값을 가져야 "다 같은 stage 템플릿"처럼 보이지 않는다.
   */
  decorations: RoomDecorationId[];
}

// idle: 오늘 공부할 내용/목표 시간 입력
// studying: 공부 중 (캐릭터는 조용히 함께 있을 뿐, 새 대사/이벤트 없음)
// reaction: 공부 완료 직후 다온의 짧은 반응 + 감상 선택
// done: 다온의 호응 + "오늘의 공부를 기억했어요" + 오늘의 학습 기록
export type ViewState = "idle" | "studying" | "reaction" | "done";

export interface AppState {
  phase: ViewState;
  studySession?: StudySession;
  selectedFeelingId?: FeelingChoice["id"];
  // 감상 선택 후 /api/reaction 이 생성한 다온의 한마디. API 실패 시 undefined로
  // 남고, 화면에서는 mockData.responseLines fallback을 쓴다.
  aiReaction?: string;
  // 이번 세션 완료로 지급된 보상(코인/누적시간/방 단계 변화). done 화면 보상
  // 카드용. 완료 처리가 1회 가드를 통과한 경우에만 채워진다.
  reward?: StudyRewardResult;
  // 회고에서 최종 도달한 판정. done 화면 기억 표현용(aiReaction·reward 와 같은
  // SELECT_FEELING 경로). 실제 판정이 없었으면(구 기록 없음/assessment 실패) undefined.
  reflectionClarity?: ReflectionEvidence;
}

export type Action =
  | { type: "START_STUDY"; studySession: StudySession }
  | { type: "COMPLETE_STUDY" }
  | {
      type: "SELECT_FEELING";
      feelingId: FeelingChoice["id"];
      aiReaction?: string;
      reward?: StudyRewardResult;
      reflectionClarity?: ReflectionEvidence;
    }
  // done 화면에서 "새 공부 시작하기" — 처음 상태로 되돌린다.
  | { type: "RESET" }
  // 개발 전용 — startedAt을 과거로 옮겨 경과 시간을 시뮬레이션한다.
  // production reducer에서는 무시된다(app/page.tsx).
  | { type: "DEBUG_SET_ELAPSED"; elapsedSeconds: number }
  // 개발 전용 — preset으로 만든 실제 StudySession으로 곧바로 reaction phase에
  // 진입시킨다(회고 흐름 반복 테스트용). production reducer에서는 무시된다.
  | { type: "DEBUG_ENTER_REACTION"; studySession: StudySession };
