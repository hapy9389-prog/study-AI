// Mock-data-only shared types for the Phase 1/2 UI prototype.
// No real API/DB shapes here — everything mirrors lib/mockData.ts.

export type Expression = "curious" | "quiet" | "happy" | "excited";

export interface Character {
  name: string;
  age: number;
  mood: string;
  currentInterest: string;
}

// A user-entered study session. `targetMinutes` is a goal the user set, not
// an elapsed/measured duration — there is no timer yet (that's Phase 3).
export interface StudySession {
  subject: string;
  targetMinutes: number;
}

export interface FeelingChoice {
  id: "proud" | "tired" | "fun";
  label: string;
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
}

export type Action =
  | { type: "START_STUDY"; studySession: StudySession }
  | { type: "COMPLETE_STUDY" }
  | { type: "SELECT_FEELING"; feelingId: FeelingChoice["id"] };
