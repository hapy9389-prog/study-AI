// Mock-data-only shared types for the Phase 1/2 UI prototype.
// No real API/DB shapes here — everything mirrors lib/mockData.ts.

export type Expression = "curious" | "quiet" | "happy" | "excited";

export interface Character {
  name: string;
  age: number;
  mood: string;
  currentInterest: string;
}

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

export interface FeelingChoice {
  id: "proud" | "tired" | "fun";
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

export interface MemoryResult {
  memoryMessage: string;
  nextStudyNudge: string;
  responseLines: Record<FeelingChoice["id"], string>;
}

// 개발자 모드 데모 전용 Mock 친구 상태. 실제 친구/DB/Auth 아님(lib/mockFriends.ts).
export type FriendStudyStatusType = "studying" | "completed" | "idle";

export interface FriendStudyStatus {
  id: string;
  nickname: string;
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
}

export type Action =
  | { type: "START_STUDY"; studySession: StudySession }
  | { type: "COMPLETE_STUDY" }
  | { type: "SELECT_FEELING"; feelingId: FeelingChoice["id"]; aiReaction?: string }
  // done 화면에서 "새 공부 시작하기" — 처음 상태로 되돌린다.
  | { type: "RESET" }
  // 개발 전용 — startedAt을 과거로 옮겨 경과 시간을 시뮬레이션한다.
  // production reducer에서는 무시된다(app/page.tsx).
  | { type: "DEBUG_SET_ELAPSED"; elapsedSeconds: number };
