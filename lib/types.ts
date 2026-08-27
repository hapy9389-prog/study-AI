// Mock-data-only shared types for the Phase 1 UI prototype.
// No real API/DB shapes here — everything mirrors lib/mockData.ts.

export type Expression = "curious" | "quiet" | "happy" | "excited";

export interface Character {
  name: string;
  age: number;
  mood: string;
  currentInterest: string;
}

export interface StudyInfo {
  subject: string;
  durationMinutes: number;
}

export interface FeelingChoice {
  id: "proud" | "tired" | "fun";
  label: string;
}

export interface ReactionData {
  characterLine: string;
  choices: FeelingChoice[];
}

export interface MemoryResult {
  rememberedTopic: string;
  memoryMessage: string;
  nextStudyNudge: string;
  responseLines: Record<FeelingChoice["id"], string>;
}

// idle: 오늘의 공부 확인
// studying: 공부 중 (캐릭터는 조용히 함께 있을 뿐, 새 대사/이벤트 없음)
// reaction: 공부 완료 직후 다온의 짧은 반응 + 감상 선택
// done: 다온의 호응 + "오늘의 공부를 기억했어요" + 오늘의 학습 기록
export type ViewState = "idle" | "studying" | "reaction" | "done";

export interface AppState {
  phase: ViewState;
  selectedFeelingId?: FeelingChoice["id"];
}

export type Action =
  | { type: "START_STUDY" }
  | { type: "COMPLETE_STUDY" }
  | { type: "SELECT_FEELING"; feelingId: FeelingChoice["id"] };
