// Mock-data-only shared types for the Phase 1/2 UI prototype.
// No real API/DB shapes here — everything mirrors lib/mockData.ts.

import type { CharacterId } from "./characters";

export type Expression = "curious" | "quiet" | "happy" | "excited";

// A user-entered study session. 세션 단위 목표시간(targetMinutes)은 없다 — 하루
// 전체 목표는 DailyStudyPlan이 담당하고, 세션은 원하는 만큼 하고 자유롭게 끝낸다.
// `startedAt`/`elapsedSeconds` are stamped by the reducer (Phase 3) — never
// set by StudyCard directly, so components only ever read them.
export interface StudySession {
  subject: string;
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
// 다른 개념이다 — StudyRecord는 생성 시점 필드(id/완료 시각/그때 실제로 화면에
// 쓰인 다온의 최종 문장 등)는 불변 스냅샷이다. 다만 reviewSuggestion/reviewQuestions
// 두 필드만은 예외로, 생성된 이후 Calendar에서 사용자 행동에 따라 사후에 채워질
// 수 있다(updateStudyRecord, lib/studyRecords.ts).
// 최근 일부는 StudyMemoryContext로 추려 Claude prompt에 전달된다(characterReaction 제외).
export interface StudyRecord {
  id: string;
  subject: string;
  /**
   * legacy 필드 — 더 이상 의미 없음. 과거엔 사용자가 세션마다 설정한 목표 시간(분)
   * 이었지만, 세션 단위 목표는 없앴다(오늘 전체 목표는 DailyStudyPlan이 담당).
   * StudyRecord 스키마 변경을 피하기 위해 필드만 남기고 항상 0으로 저장한다 —
   * 어떤 화면도 이 값을 더 이상 읽지 않는다.
   */
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
  /**
   * 회고 답변 원문(첫 답변 + follow-up 답변, 있으면 이어붙임). reflectionClarity와
   * 무관하게 답변이 있으면 항상 저장한다 — 복습 제안/복습 질문 생성의 grounding
   * 재료다. 없으면(구 기록 · 회고를 안 남긴 경우) undefined.
   */
  reflectionNote?: string;
  /**
   * Calendar에서 사용자가 "복습 제안 보기"를 눌렀을 때 최초 1회 생성해 저장한다
   * (Anthropic API 호출은 세션 종료 시점이 아니라 이 시점에 일어난다). 이후 재방문
   * 시 재호출 없이 이 값을 그대로 보여준다.
   */
  reviewSuggestion?: {
    text: string;
    generatedAt: string;
  };
  /**
   * "복습 문제 만들기"로 생성한 Active Recall 질문 3개. "새 질문 만들기"를 사용자가
   * 명시적으로 누르기 전까지는 저장된 값을 그대로 재사용한다. sourceNote는 실제
   * grounding에 쓰인 텍스트(reflectionNote 또는 그 자리에서 추가로 받은 한 줄 입력).
   */
  reviewQuestions?: {
    questions: string[];
    sourceNote?: string;
    generatedAt: string;
  };
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
// 보상은 두 종류로 분리된다(§lib/studyRewards.ts): ① 오늘 누적 실제 공부시간이
// 새 time milestone을 넘겨 받는 코인, ② 오늘 Daily Plan 전체를 이번 세션으로
// 처음 완료해 받는 하루 1회 보너스. "목표 달성 보상"이라는 개념은 이제 ②에만 쓰인다
// (세션 단위 targetMinutes/goalBonus는 더 이상 없음).
export interface StudyRewardCalculation {
  /** timeMilestoneCoins + dailyPlanBonusCoins */
  earnedCoins: number;
  /** 누적 totalStudyMinutes에 더해질 분 = Math.floor(elapsedSeconds / 60) */
  earnedMinutes: number;
  /** 이번 세션으로 오늘 누적 공부시간이 새로 지급한 time milestone 코인(0 가능). */
  timeMilestoneCoins: number;
  /** 이번 세션으로 새로 넘은 가장 높은 time milestone(분). 없으면 undefined. */
  reachedMilestoneMinutes?: number;
  /** 이번 세션으로 오늘 Daily Plan 전체 완료 보너스를 새로 받았으면 그 코인, 아니면 0. */
  dailyPlanBonusCoins: number;
  /** 이번 세션으로 오늘 Daily Plan 전체 완료 보너스를 새로 받았는지. */
  dailyPlanCompletedNow: boolean;
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

// 사용자가 정한 "오늘 이 과목을 몇 분 하겠다"는 목표 1건. studiedSeconds는
// 저장하지 않는다 — 항상 StudyRecord.elapsedSeconds 합산으로 derive한다
// (getDailyPlanProgress, lib/dailyStudyPlan.ts). 저장된 값과 실제 기록이
// 어긋나는 걸 원천 차단한다.
export interface DailyStudyPlanItem {
  id: string;
  /** 사용자가 입력한 원문 그대로(trim만). 비교는 normalizeSubjectForPlanMatch()로 별도. */
  subject: string;
  /** 오늘 목표 시간(분). 10~3000(약 50시간) 범위. */
  targetMinutes: number;
}

// 하루 단위 계획. dayStart는 lib/studyStats.ts dayBoundaries(now)[0]과 동일한
// 로컬 자정 00:00 timestamp — 이 값으로 "오늘 계획인지" 판정한다.
export interface DailyStudyPlan {
  dayStart: number;
  items: DailyStudyPlanItem[];
}

// getDailyPlanProgress()의 반환 항목 — 이미 다 계산된 진척(derived, 저장 안 됨).
// studiedSeconds는 정확한 재계산/비교용, 분 단위는 표시 전용(floor/ceil 정책은
// lib/dailyStudyPlan.ts 주석 참고) — isCompleted 판정에 반올림된 분 값을 쓰지 않는다.
export interface DailyPlanProgress {
  subject: string;
  targetMinutes: number;
  /** 오늘 해당 subject StudyRecord의 elapsedSeconds 합계(초, 실측치 — 초과 가능). */
  studiedSeconds: number;
  /** 표시용 분 — Math.floor(studiedSeconds / 60). */
  studiedMinutes: number;
  /** 표시용 남은 분 — Math.ceil(remainingSeconds / 60). */
  remainingMinutes: number;
  isCompleted: boolean;
}

// /api/reaction에 넘기는, 이미 계산된 사실. LLM은 이 값을 재계산하지 않고
// 그대로 캐릭터 말투로 표현만 한다("판단과 계산은 코드가, 표현은 LLM이").
// status가 유일한 source of truth다 — "이번에 달성했는지"는 상태값 자체
// (just-completed)로 구분하고, 별도 boolean으로 중복 표현하지 않는다.
export type DailyPlanStatus = "in-progress" | "just-completed" | "already-completed";

export interface DailyPlanReactionContext {
  targetMinutes: number;
  /** 이번 세션 반영 후(post-session) 누적 초. */
  studiedSeconds: number;
  /** 이번 세션 반영 후 남은 초(0 이상). */
  remainingSeconds: number;
  status: DailyPlanStatus;
  /**
   * 이번 세션 "덕분에" 오늘 계획 전체가 막 완료됐는지 — 세션 반영 전엔 미완료였고
   * 반영 후 완료로 바뀐 경우(false→true 전이)에만 true. 이미 완료된 상태에서
   * 추가로 공부한 세션·계획이 없는 경우는 항상 false(LLM이 매번 다시 축하하지
   * 않도록). 없으면 false와 동일 취급.
   */
  allPlanItemsCompletedNow?: boolean;
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
  // /api/reaction(closing 모드)이 함께 만든 "오늘 공부 한눈에 보기" 요약. done 화면
  // 전용 1회성 표시값이고 StudyRecord에는 저장하지 않는다 — 다른 화면이 다시
  // 조회하지 않으므로 AppState로만 흘려보낸다. 파싱 실패/API 실패 시 undefined
  // (요약 섹션 자체를 렌더하지 않고 기존 화면과 동일하게 degrade).
  studySummary?: StudySummary;
}

// /api/reaction(closing 모드)이 만드는 구조화 요약 3필드. StudyRecord에는 저장하지
// 않는 done 화면 전용 값 — AppState.studySummary/Action.SELECT_FEELING에서만 쓰인다.
export interface StudySummary {
  summary: string;
  comparison?: string;
  nextAction?: string;
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
      studySummary?: StudySummary;
    }
  // done 화면에서 "새 공부 시작하기" — 처음 상태로 되돌린다.
  | { type: "RESET" }
  // 개발 전용 — startedAt을 과거로 옮겨 경과 시간을 시뮬레이션한다.
  // production reducer에서는 무시된다(app/page.tsx).
  | { type: "DEBUG_SET_ELAPSED"; elapsedSeconds: number }
  // 개발 전용 — preset으로 만든 실제 StudySession으로 곧바로 reaction phase에
  // 진입시킨다(회고 흐름 반복 테스트용). production reducer에서는 무시된다.
  | { type: "DEBUG_ENTER_REACTION"; studySession: StudySession };
