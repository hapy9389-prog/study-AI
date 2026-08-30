// 완료된 공부 기록(StudyRecord)의 localStorage 영속화 유틸.
// 저장 + 조회만 담당한다. 삭제/수정/검색/통계는 없다.
// 새 공부 반응 생성 시 최근 일부(loadRecentMemories)를 Claude prompt에 함께 넘긴다.

import type { StudyMemoryContext, StudyRecord } from "./types";
import { feelingDisplayLabel, reactionData } from "./mockData";
import { DEFAULT_CHARACTER_ID, isCharacterId, type CharacterId } from "./characters";
import { dayBoundaries } from "./studyStats";
import { normalizeSubjectForPlanMatch } from "./dailyStudyPlan";

const STUDY_RECORDS_STORAGE_KEY = "study-ai:study-records";

// 저장 상한. Calendar 탭이 지난 달 이상을 조회할 수 있어야 해서(RECENT_RECORDS_LIMIT
// 20개짜리 "기억" 탭 시절보다) 넉넉하게 늘렸다. 레코드 1건 ≈ 300자(characterReaction
// 포함) → 200개는 대략 120~130KB, localStorage quota(수 MB) 대비 부담 없는 수준이다.
const MAX_STORED_RECORDS = 200;

// 새 공부 반응 생성 시 Claude 프롬프트에 함께 넘길 최근 기억 수.
// 프롬프트/비용을 작게 유지한다(서버도 같은 수로 다시 자른다).
export const PROMPT_MEMORY_LIMIT = 5;

// 로드 검증용 화이트리스트 — 신규 3단계 id + 구 기록의 legacy id 3개.
// legacy 를 포함하지 않으면 isStudyRecord 가 구 기록을 통째로 버려 전체 기록이 소실된다.
const KNOWN_FEELING_IDS = new Set<string>([
  ...reactionData.choices.map((choice) => choice.id),
  "proud",
  "tired",
  "fun",
]);

function generateRecordId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // 구형 환경 fallback — 라이브러리를 새로 설치하지 않는다.
  return `r-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function createStudyRecord(
  input: Omit<StudyRecord, "id" | "completedAt">,
): StudyRecord {
  return {
    id: generateRecordId(),
    completedAt: new Date().toISOString(),
    ...input,
  };
}

// 기록의 귀속 캐릭터. 캐릭터 선택 이전 기록엔 characterId 가 없으므로 다온으로 본다.
export function recordCharacterId(record: StudyRecord): CharacterId {
  return isCharacterId(record.characterId)
    ? record.characterId
    : DEFAULT_CHARACTER_ID;
}

// localStorage에서 온 알 수 없는 값을 StudyRecord로 신뢰하기 전 가벼운 런타임 검증.
// schema 라이브러리는 쓰지 않는다.
function isStudyRecord(value: unknown): value is StudyRecord {
  if (typeof value !== "object" || value === null) return false;
  const r = value as Record<string, unknown>;
  return (
    typeof r.id === "string" &&
    typeof r.subject === "string" &&
    typeof r.targetMinutes === "number" &&
    typeof r.elapsedSeconds === "number" &&
    typeof r.feelingId === "string" &&
    KNOWN_FEELING_IDS.has(r.feelingId) &&
    typeof r.characterReaction === "string" &&
    typeof r.completedAt === "string" &&
    // 캐릭터 선택 이전 기록엔 없다. 없거나(구 기록) 유효한 id 면 통과.
    (r.characterId === undefined || isCharacterId(r.characterId)) &&
    // 회고 선명도 도입 이전 기록엔 없다. 없거나 유효한 값이면 통과.
    (r.reflectionClarity === undefined ||
      r.reflectionClarity === "clear" ||
      r.reflectionClarity === "partial" ||
      r.reflectionClarity === "unclear") &&
    // 아래 세 필드는 이번에 추가된 optional 필드 — 도입 이전 기록엔 없다.
    // 없거나(구 기록) 유효한 shape이면 통과.
    (r.reflectionNote === undefined || typeof r.reflectionNote === "string") &&
    isValidReviewSuggestion(r.reviewSuggestion) &&
    isValidReviewQuestions(r.reviewQuestions)
  );
}

function isValidReviewSuggestion(value: unknown): boolean {
  if (value === undefined) return true;
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.text === "string" && typeof v.generatedAt === "string";
}

function isValidReviewQuestions(value: unknown): boolean {
  if (value === undefined) return true;
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    Array.isArray(v.questions) &&
    v.questions.every((q) => typeof q === "string") &&
    (v.sourceNote === undefined || typeof v.sourceNote === "string") &&
    typeof v.generatedAt === "string"
  );
}

// 저장된 기록을 최신순(앞이 최신)으로 반환한다.
// SSR / 깨진 JSON / 예상치 못한 타입 어느 경우에도 앱을 깨뜨리지 않고 [] 를 반환한다.
export function loadStudyRecords(): StudyRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STUDY_RECORDS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isStudyRecord);
  } catch {
    return [];
  }
}

// 새 기록 1건을 맨 앞에 추가하고 상한을 넘으면 오래된 것을 버린다.
// 호출 측(app/page.tsx)에서 한 세션당 정확히 1회만 호출한다.
export function saveStudyRecord(record: StudyRecord): void {
  if (typeof window === "undefined") return;
  const next = [record, ...loadStudyRecords()].slice(0, MAX_STORED_RECORDS);
  try {
    window.localStorage.setItem(STUDY_RECORDS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // 용량 초과 / 저장 차단 등 — 기록 저장은 핵심 흐름을 막지 않는다.
  }
}

// 이미 저장된 기록 1건에 reviewSuggestion/reviewQuestions/reflectionNote만
// 사후에 채워 넣는다. StudyRecord의 나머지 필드(id/완료 시각/characterReaction 등)는
// 절대 이 함수로 바꾸지 않는다 — "생성 시점 필드는 불변" 원칙은 그대로 유지하고,
// 이 세 필드만 예외로 사후에 채워질 수 있다(lib/types.ts StudyRecord 주석 참고).
// id가 없으면(기록이 그 사이 삭제/초과 상한으로 밀려남) 조용히 아무 것도 하지 않는다.
export function updateStudyRecord(
  id: string,
  patch: Partial<
    Pick<StudyRecord, "reviewSuggestion" | "reviewQuestions" | "reflectionNote">
  >,
): void {
  if (typeof window === "undefined") return;
  const records = loadStudyRecords();
  const next = records.map((record) =>
    record.id === id ? { ...record, ...patch } : record,
  );
  try {
    window.localStorage.setItem(STUDY_RECORDS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // 용량 초과 / 저장 차단 등 — 복습 제안/질문 저장 실패가 앱을 막지 않는다.
    // (화면엔 이미 결과가 표시된 상태라 다음 방문 시에만 사라질 수 있다 — 프로토타입
    // 규모에서는 감내 가능한 리스크로 본다.)
  }
}

// 첫 답변 + follow-up 답변(있으면)을 이어붙인 회고 원문. 별도 clamp를 새로 두지
// 않는다 — 입력 textarea가 이미 답변마다 300자 상한이라 합쳐도 충분히 작고,
// 서버로 보낼 때는 각 API route의 기존 clampReflectionText(500자)가 다시 방어한다.
// 둘 다 비어 있으면 undefined(저장할 회고 원문 없음).
export function buildReflectionNote(
  answer: string,
  followUpAnswer?: string,
): string | undefined {
  const parts = [answer, followUpAnswer]
    .map((part) => part?.trim())
    .filter((part): part is string => !!part);
  return parts.length > 0 ? parts.join("\n") : undefined;
}

export interface RecentSubjectRecordsOptions {
  /** 기준이 되는(보통 지금 막 펼친) 기록의 id — 결과에서 제외한다. */
  excludeId?: string;
  /** 반환할 최대 개수. 기본 5. */
  limit?: number;
}

// "같은 과목"의 최근 기록을 사용자 전체 범위에서 조회한다. **의도적으로 characterId로
// 필터하지 않는다** — 공부 성과·기록 비교는 그날 함께 있던 캐릭터가 아니라
// 사용자에게 귀속된다(다온과 SQLD → 다른 캐릭터와 SQLD → 다시 다온과 SQLD여도
// 하나의 SQLD 학습 이력으로 이어져야 한다). "우리 저번에도 같이 했었지" 같은
// 캐릭터의 개인적 기억이 필요하면 이 함수 대신 기존 loadRecentMemories(characterId)를
// 쓴다 — 학습 분석 history(user-wide)와 캐릭터 기억(character-specific)은 서로
// 다른 목적의 별도 조회로 분리한다.
//
// 과목 비교는 dailyStudyPlan.ts와 동일한 normalizeSubjectForPlanMatch()로 한다
// (공백/대소문자만 무시하는 표기 비교 — 의미 기반 매칭은 아니다).
export function getRecentRecordsForSubject(
  records: StudyRecord[],
  subject: string,
  options: RecentSubjectRecordsOptions = {},
): StudyRecord[] {
  const { excludeId, limit = 5 } = options;
  const key = normalizeSubjectForPlanMatch(subject);
  return records
    .filter(
      (record) =>
        record.id !== excludeId &&
        normalizeSubjectForPlanMatch(record.subject) === key,
    )
    .slice(0, limit);
}

// StudyRecord → Claude 프롬프트용 StudyMemoryContext. loadRecentMemories와 동일한
// 변환 규칙(clarity는 partial/unclear만 포함, characterReaction 제외)을 getRecentRecordsForSubject
// 결과에도 적용할 때 쓴다. loadRecentMemories 내부는 안정성을 위해 그대로 두고,
// 이 변환만 별도로 재사용 가능하게 뺐다.
export function toMemoryContext(record: StudyRecord): StudyMemoryContext {
  return {
    subject: record.subject,
    elapsedSeconds: record.elapsedSeconds,
    feelingId: record.feelingId,
    completedAt: record.completedAt,
    ...(record.reflectionClarity === "partial" ||
    record.reflectionClarity === "unclear"
      ? { reflectionClarity: record.reflectionClarity }
      : {}),
  };
}

// 새 공부 반응 요청에 함께 보낼 최근 기억. LLM 에게는 "지금 이 캐릭터가 실제로
// 곁에 있었던 공부"만 전달한다 — characterId 로 필터한다(다온의 과거를 다른
// 캐릭터가 자기 경험처럼 말하지 않도록). 전체 목록/통계/Memory 탭은 그대로 공용.
//
// characterId 를 넘기지 않으면(구버전 호출) 필터 없이 전체에서 최근 N개 —
// 기존 동작과 동일.
export function loadRecentMemories(characterId?: CharacterId): StudyMemoryContext[] {
  const records = loadStudyRecords();
  const scoped =
    characterId === undefined
      ? records
      : records.filter((record) => recordCharacterId(record) === characterId);
  return scoped.slice(0, PROMPT_MEMORY_LIMIT).map((record) => ({
    subject: record.subject,
    elapsedSeconds: record.elapsedSeconds,
    feelingId: record.feelingId,
    completedAt: record.completedAt,
    // partial/unclear 만 넘긴다 — 캐릭터가 "그때 흐릿했던 공부"를 알아볼 수 있게.
    // clear/미지정은 생략(기본값이라 프롬프트 노이즈만 늘린다).
    ...(record.reflectionClarity === "partial" ||
    record.reflectionClarity === "unclear"
      ? { reflectionClarity: record.reflectionClarity }
      : {}),
  }));
}

// 신규 id 든 구 기록의 legacy id 든 화면에 보여줄 한글 라벨로.
export function feelingLabel(feelingId: string): string {
  return feelingDisplayLabel(feelingId);
}

// ISO 문자열을 사람이 읽기 좋은 형태로. "오늘 23:12" / "어제 20:30" / "8월 25일 15:30".
// 날짜 라이브러리는 쓰지 않는다.
export function formatCompletedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  const time = `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes(),
  ).padStart(2, "0")}`;

  const startOfDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dayDiff = Math.round(
    (startOfDay(new Date()) - startOfDay(date)) / 86_400_000,
  );

  if (dayDiff === 0) return `오늘 ${time}`;
  if (dayDiff === 1) return `어제 ${time}`;
  return `${date.getMonth() + 1}월 ${date.getDate()}일 ${time}`;
}

// 오늘(로컬 자정~다음 자정) 완료된 기록의 실제 공부시간 합계를 초로 돌려준다(정확치 —
// milestone reward 판정(lib/studyRewards.ts)처럼 분 단위 반올림 없이 정확한 비교가
// 필요한 곳에서 쓴다). now 를 인자로 받아 테스트 가능하고, 호출부에서만 실행돼 SSR 을 타지 않는다.
export function getTodayStudySeconds(
  records: StudyRecord[],
  now: number = Date.now(),
): number {
  const [todayStart, todayEnd] = dayBoundaries(now);
  return records.reduce((sum, record) => {
    const at = new Date(record.completedAt).getTime();
    if (Number.isNaN(at) || at < todayStart || at >= todayEnd) return sum;
    return sum + Math.max(0, record.elapsedSeconds);
  }, 0);
}

// 오늘 공부시간을 분으로. StudyRewardState.totalStudyMinutes(누적 평생)와 다른,
// "오늘치" 표시용 값이다.
export function getTodayStudyMinutes(
  records: StudyRecord[],
  now: number = Date.now(),
): number {
  return Math.floor(getTodayStudySeconds(records, now) / 60);
}
