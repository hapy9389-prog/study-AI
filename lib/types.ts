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
// 아직 이 기록은 Claude prompt에 전달하지 않는다(장기 기억 아님).
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

export interface ReactionData {
  choices: FeelingChoice[];
}

export interface MemoryResult {
  memoryMessage: string;
  nextStudyNudge: string;
  responseLines: Record<FeelingChoice["id"], string>;
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
