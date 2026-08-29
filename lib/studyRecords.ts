// 완료된 공부 기록(StudyRecord)의 localStorage 영속화 유틸.
// 저장 + 조회만 담당한다. 삭제/수정/검색/통계는 없다.
// 새 공부 반응 생성 시 최근 일부(loadRecentMemories)를 Claude prompt에 함께 넘긴다.

import type { StudyMemoryContext, StudyRecord } from "./types";
import { feelingDisplayLabel, reactionData } from "./mockData";
import { DEFAULT_CHARACTER_ID, isCharacterId, type CharacterId } from "./characters";

const STUDY_RECORDS_STORAGE_KEY = "study-ai:study-records";

// 저장 상한. 기억 화면은 이 중 최근 일부만 보여준다(RECENT_RECORDS_LIMIT).
const MAX_STORED_RECORDS = 50;

// 기억 화면에서 한 번에 표시할 최근 기록 수.
export const RECENT_RECORDS_LIMIT = 20;

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
      r.reflectionClarity === "unclear")
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

// 오늘(로컬 자정~다음 자정) 완료된 기록의 실제 공부시간 합계를 분으로 돌려준다.
// StudyRewardState.totalStudyMinutes(누적 평생)와 다른, "오늘치" 값이다.
// now 를 인자로 받아 테스트 가능하고, 호출부(클릭 핸들러)에서만 실행돼 SSR 을 타지 않는다.
export function getTodayStudyMinutes(
  records: StudyRecord[],
  now: number = Date.now(),
): number {
  const startOfDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const todayStart = startOfDay(new Date(now));
  const todayEnd = todayStart + 86_400_000;

  const totalSeconds = records.reduce((sum, record) => {
    const at = new Date(record.completedAt).getTime();
    if (Number.isNaN(at) || at < todayStart || at >= todayEnd) return sum;
    return sum + Math.max(0, record.elapsedSeconds);
  }, 0);

  return Math.floor(totalSeconds / 60);
}
