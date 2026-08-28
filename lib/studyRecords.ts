// 완료된 공부 기록(StudyRecord)의 localStorage 영속화 유틸.
// 저장 + 조회만 담당한다. 삭제/수정/검색/통계는 없다.
// 새 공부 반응 생성 시 최근 일부(loadRecentMemories)를 Claude prompt에 함께 넘긴다.

import type { FeelingChoice, StudyMemoryContext, StudyRecord } from "./types";
import { reactionData } from "./mockData";

const STUDY_RECORDS_STORAGE_KEY = "study-ai:study-records";

// 저장 상한. 기억 화면은 이 중 최근 일부만 보여준다(RECENT_RECORDS_LIMIT).
const MAX_STORED_RECORDS = 50;

// 기억 화면에서 한 번에 표시할 최근 기록 수.
export const RECENT_RECORDS_LIMIT = 20;

// 새 공부 반응 생성 시 Claude 프롬프트에 함께 넘길 최근 기억 수.
// 프롬프트/비용을 작게 유지한다(서버도 같은 수로 다시 자른다).
export const PROMPT_MEMORY_LIMIT = 5;

const FEELING_IDS = new Set<string>(reactionData.choices.map((choice) => choice.id));

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
    FEELING_IDS.has(r.feelingId) &&
    typeof r.characterReaction === "string" &&
    typeof r.completedAt === "string"
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

// 새 공부 반응 요청에 함께 보낼 최근 기억. 저장이 최신순(앞이 최신)이라
// slice로 최근 N개를 그대로 얻는다. loadStudyRecords()가 SSR/깨진 JSON에서
// []를 돌려주므로 로드 실패 시에도 자연히 []가 된다 — 현재 공부 반응을 막지 않는다.
export function loadRecentMemories(): StudyMemoryContext[] {
  return loadStudyRecords()
    .slice(0, PROMPT_MEMORY_LIMIT)
    .map((record) => ({
      subject: record.subject,
      elapsedSeconds: record.elapsedSeconds,
      feelingId: record.feelingId,
      completedAt: record.completedAt,
    }));
}

export function feelingLabel(feelingId: FeelingChoice["id"]): string {
  return reactionData.choices.find((choice) => choice.id === feelingId)?.label ?? "";
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
