"use client";

import { useEffect, useRef, useState } from "react";
import type { ReflectionEvidence, StudyRecord } from "@/lib/types";
import { clarityNote, formatMinutesAndSeconds } from "@/lib/mockData";
import { characterNickname } from "@/lib/characters";
import {
  feelingLabel,
  getRecentRecordsForSubject,
  loadStudyRecords,
  recordCharacterId,
  toMemoryContext,
  updateStudyRecord,
} from "@/lib/studyRecords";

// 회고 원문이 없거나 너무 짧을 때 LLM 호출 없이 쓰는 정적 일반 복습 제안.
// "지어내지 않는다" 원칙 — 구체적 내용이 없으면 일반적인 복습 행동만 제안한다.
const GENERIC_REVIEW_SUGGESTION =
  "그날 공부했던 범위에서 기억나는 핵심 개념 2~3개만 먼저 떠올려봐.";

// "복습 문제 만들기"에 필요한 최소 grounding 길이. 이보다 짧으면(또는 없으면)
// 질문을 만들기 전에 한 줄 입력을 먼저 요청한다.
const MIN_NOTE_LENGTH_FOR_QUESTIONS = 10;

// 접힌 행 오른쪽의 펼침 표시. BottomNavigation과 같은 line-icon 스타일
// (stroke=currentColor, round cap/join) — 아이콘 라이브러리를 새로 쓰지 않는다.
// 펼쳐지면 180도 회전만 시켜 위쪽을 가리키게 한다(별도 path 없음).
function ChevronIcon({ isExpanded }: { isExpanded: boolean }) {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`shrink-0 text-warm-gray transition-transform ${isExpanded ? "rotate-180" : ""}`}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

// 행 오른쪽의 clarity 표시. 이모지는 여기(작은 상태 표시)에만 쓴다 —
// 네비게이션/버튼 등 주요 UI 아이콘은 계속 inline SVG를 쓴다. 장식용이라
// aria-hidden — 실제 상세(실제 공부 시간·기분)는 펼쳤을 때 텍스트로 이미 있다.
function ClarityEmoji({ clarity }: { clarity?: ReflectionEvidence }) {
  if (clarity === "clear") return <span aria-hidden="true">☀️</span>;
  if (clarity === "partial") return <span aria-hidden="true">🌤️</span>;
  if (clarity === "unclear") return <span aria-hidden="true">☁️</span>;
  // 판정 없는 legacy 기록 — CalendarGrid 범례와 같은 중립 점.
  return <span aria-hidden="true" className="h-1 w-1 rounded-full bg-warm-gray" />;
}

type RecordUpdateHandler = (id: string, patch: Partial<StudyRecord>) => void;

interface MemoryRecordCardProps {
  record: StudyRecord;
  isExpanded: boolean;
  onToggle: (id: string) => void;
  /** 복습 제안/복습 질문 생성 후 부모(CalendarScreen)의 records state를 patch한다. */
  onRecordUpdate: RecordUpdateHandler;
}

// 공부 기록 1건. 기본은 subject + 공부시간만 보이는 compact 행이고, 누르면
// 그 자리에서 다온 반응/기분/clarity 상세가 펼쳐진다(한 번에 하나만 —
// expandedRecordId는 CalendarDayDetail이 들고 있다). 저장된 다온 문장을
// 그대로 표시할 뿐 Claude API를 재호출하지 않는다.
//
// clarity가 partial/unclear일 때만 그 아래 "복습 제안"·"복습 문제 만들기" 섹션이
// 추가로 열린다(기능 2/3) — clear/legacy(undefined) 기록에는 아무것도 뜨지 않는다.
export default function MemoryRecordCard({
  record,
  isExpanded,
  onToggle,
  onRecordUpdate,
}: MemoryRecordCardProps) {
  const [suggestionState, setSuggestionState] = useState<
    "idle" | "loading" | "error"
  >("idle");
  const [questionsOpen, setQuestionsOpen] = useState(false);
  const [questionsState, setQuestionsState] = useState<
    "idle" | "loading" | "error"
  >("idle");
  const [noteInputOpen, setNoteInputOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");

  // 요청 중 사용자가 다른 날짜로 넘어가면(CalendarDayDetail이 key로 리마운트)
  // 이 컴포넌트도 함께 unmount된다 — 그 시점 이후 setState를 막는다.
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  const suggestionBusyRef = useRef(false);
  const questionsBusyRef = useRef(false);

  // clarity가 없거나(legacy) clear면 복습 섹션 자체를 만들지 않는다. undefined는
  // "판정 없음"이지 "선명함"이 아니므로 !== "clear"가 아니라 명시적으로 좁힌다.
  const showReviewSection =
    record.reflectionClarity === "partial" || record.reflectionClarity === "unclear";

  async function handleGenerateSuggestion() {
    if (suggestionBusyRef.current || record.reviewSuggestion) return;
    const clarity = record.reflectionClarity;
    if (clarity !== "partial" && clarity !== "unclear") return;
    suggestionBusyRef.current = true;
    setSuggestionState("loading");

    const reflectionNote = record.reflectionNote?.trim();

    // 회고 원문이 없으면 LLM을 호출하지 않는다 — 비용 절감 + "지어내지 않는다"
    // 원칙(구체적 내용이 없으니 일반적인 복습 행동만 제안한다).
    if (!reflectionNote) {
      const reviewSuggestion = {
        text: GENERIC_REVIEW_SUGGESTION,
        generatedAt: new Date().toISOString(),
      };
      updateStudyRecord(record.id, { reviewSuggestion });
      if (mountedRef.current) {
        onRecordUpdate(record.id, { reviewSuggestion });
        setSuggestionState("idle");
      }
      suggestionBusyRef.current = false;
      return;
    }

    try {
      // 같은 과목 최근 기록(사용자 전체, 캐릭터 무관) — 보조 근거로만 서버에 전달한다.
      const subjectHistory = getRecentRecordsForSubject(
        loadStudyRecords(),
        record.subject,
        { excludeId: record.id, limit: 3 },
      ).map(toMemoryContext);

      const response = await fetch("/api/review-suggestion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterId: recordCharacterId(record),
          subject: record.subject,
          reflectionNote,
          clarity,
          ...(subjectHistory.length > 0 ? { subjectHistory } : {}),
        }),
      });
      if (!response.ok) throw new Error(`status ${response.status}`);
      const data = (await response.json()) as { suggestion?: unknown };
      if (typeof data.suggestion !== "string" || data.suggestion.trim() === "") {
        throw new Error("empty_suggestion");
      }
      const reviewSuggestion = {
        text: data.suggestion.trim(),
        generatedAt: new Date().toISOString(),
      };
      updateStudyRecord(record.id, { reviewSuggestion });
      if (mountedRef.current) {
        onRecordUpdate(record.id, { reviewSuggestion });
        setSuggestionState("idle");
      }
    } catch (error) {
      console.error("[MemoryRecordCard] 복습 제안 생성 실패:", error);
      if (mountedRef.current) setSuggestionState("error");
    } finally {
      suggestionBusyRef.current = false;
    }
  }

  async function generateQuestions(sourceNote: string) {
    if (questionsBusyRef.current) return;
    questionsBusyRef.current = true;
    setQuestionsState("loading");
    try {
      const response = await fetch("/api/review-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: record.subject,
          reflectionNote: sourceNote,
          ...(record.reflectionClarity ? { clarity: record.reflectionClarity } : {}),
        }),
      });
      if (!response.ok) throw new Error(`status ${response.status}`);
      const data = (await response.json()) as { questions?: unknown };
      if (
        !Array.isArray(data.questions) ||
        data.questions.length !== 3 ||
        !data.questions.every((q) => typeof q === "string")
      ) {
        throw new Error("invalid_questions");
      }
      const reviewQuestions = {
        questions: data.questions as string[],
        sourceNote,
        generatedAt: new Date().toISOString(),
      };
      updateStudyRecord(record.id, { reviewQuestions });
      if (mountedRef.current) {
        onRecordUpdate(record.id, { reviewQuestions });
        setQuestionsState("idle");
        setNoteInputOpen(false);
      }
    } catch (error) {
      console.error("[MemoryRecordCard] 복습 질문 생성 실패:", error);
      if (mountedRef.current) setQuestionsState("error");
    } finally {
      questionsBusyRef.current = false;
    }
  }

  // "복습 문제 만들기" 최초 클릭. 이미 저장된 질문이 있으면 재호출 없이 그대로 연다.
  function handleOpenQuestions() {
    setQuestionsOpen(true);
    if (record.reviewQuestions) return;

    const note = record.reflectionNote?.trim() ?? "";
    if (note.length < MIN_NOTE_LENGTH_FOR_QUESTIONS) {
      // grounding 부족 — 사용자 기록에 없는 범위를 지어내지 않기 위해 한 줄 입력을
      // 먼저 받는다.
      setNoteInputOpen(true);
      return;
    }
    void generateQuestions(note);
  }

  function handleSubmitNoteDraft() {
    const trimmed = noteDraft.trim();
    if (trimmed === "") return;
    // 기존 reflectionNote(있다면)에 이어붙여 저장한다 — 다음에 다시 볼 때도
    // grounding으로 재사용된다.
    const existing = record.reflectionNote?.trim();
    const merged = existing ? `${existing}\n${trimmed}` : trimmed;
    updateStudyRecord(record.id, { reflectionNote: merged });
    onRecordUpdate(record.id, { reflectionNote: merged });
    // 입력 폼을 먼저 닫아야 로딩/에러 상태가 그 자리에 보인다.
    setNoteInputOpen(false);
    void generateQuestions(merged);
  }

  // "새 질문 만들기" — 사용자가 명시적으로 눌렀을 때만 재호출(덮어쓰기).
  function handleRegenerateQuestions() {
    const note = record.reflectionNote?.trim() ?? "";
    if (note.length < MIN_NOTE_LENGTH_FOR_QUESTIONS) {
      setNoteInputOpen(true);
      return;
    }
    void generateQuestions(note);
  }

  return (
    <li>
      <button
        type="button"
        onClick={() => onToggle(record.id)}
        aria-expanded={isExpanded}
        className="flex w-full items-center justify-between gap-3 py-2 text-left"
      >
        <span className="min-w-0 truncate text-sm text-cocoa">{record.subject}</span>
        <span className="flex shrink-0 items-center gap-1.5 text-xs text-warm-gray">
          {formatMinutesAndSeconds(record.elapsedSeconds)}
          <ClarityEmoji clarity={record.reflectionClarity} />
          <ChevronIcon isExpanded={isExpanded} />
        </span>
      </button>

      {isExpanded && (
        <div className="flex flex-col gap-2 py-2">
          <p className="text-xs text-warm-gray">
            실제 공부 {formatMinutesAndSeconds(record.elapsedSeconds)} ·{" "}
            {feelingLabel(record.feelingId)}
          </p>

          <div>
            <p className="text-xs font-medium text-lavender-deep">
              {characterNickname(recordCharacterId(record))}
            </p>
            <p className="mt-1 rounded-xl bg-lavender/15 px-3 py-2 text-sm leading-relaxed text-cocoa">
              {record.characterReaction}
            </p>
          </div>

          {showReviewSection && (
            <div className="mt-1 flex flex-col gap-2 border-t border-warm-line pt-3">
              <p className="text-xs font-medium text-warm-gray">
                {clarityNote(record.reflectionClarity)}
              </p>

              {record.reviewSuggestion ? (
                <p className="text-sm leading-relaxed text-cocoa">
                  {record.reviewSuggestion.text}
                </p>
              ) : suggestionState === "loading" ? (
                <p className="text-xs text-warm-gray">이날 기록을 다시 보고 있어…</p>
              ) : suggestionState === "error" ? (
                <div className="flex flex-col gap-1.5">
                  <p className="text-xs text-warm-gray">
                    지금은 정리하지 못했어. 공부 기록은 정상적으로 저장됐어.
                  </p>
                  <button
                    type="button"
                    onClick={handleGenerateSuggestion}
                    className="self-start text-xs font-medium text-lavender-deep"
                  >
                    다시 시도
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleGenerateSuggestion}
                  className="self-start text-xs font-medium text-lavender-deep"
                >
                  다시 떠올려볼까? — 복습 제안 보기
                </button>
              )}

              {!questionsOpen ? (
                <button
                  type="button"
                  onClick={handleOpenQuestions}
                  className="self-start text-xs font-medium text-lavender-deep"
                >
                  {record.reviewQuestions ? "복습 문제 보기" : "복습 문제 만들기"}
                </button>
              ) : (
                <div className="flex flex-col gap-2">
                  {noteInputOpen && !record.reviewQuestions ? (
                    <div className="flex flex-col gap-1.5">
                      <p className="text-xs text-warm-gray">
                        오늘 공부한 내용에서 기억나는 핵심 개념 하나는?
                      </p>
                      <textarea
                        value={noteDraft}
                        onChange={(e) => setNoteDraft(e.target.value)}
                        maxLength={300}
                        rows={2}
                        placeholder="짧게 적어도 괜찮아요"
                        className="field resize-none"
                      />
                      <button
                        type="button"
                        disabled={
                          noteDraft.trim() === "" || questionsState === "loading"
                        }
                        onClick={handleSubmitNoteDraft}
                        className="btn-secondary self-start disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        말해주기
                      </button>
                    </div>
                  ) : questionsState === "loading" ? (
                    <p className="text-xs text-warm-gray">
                      기억을 꺼낼 질문을 만들고 있어…
                    </p>
                  ) : questionsState === "error" ? (
                    <div className="flex flex-col gap-1.5">
                      <p className="text-xs text-warm-gray">
                        지금은 정리하지 못했어. 공부 기록은 정상적으로 저장됐어.
                      </p>
                      <button
                        type="button"
                        onClick={handleRegenerateQuestions}
                        className="self-start text-xs font-medium text-lavender-deep"
                      >
                        다시 시도
                      </button>
                    </div>
                  ) : record.reviewQuestions ? (
                    <div className="flex flex-col gap-2">
                      <ol className="flex flex-col gap-1.5 text-sm leading-relaxed text-cocoa">
                        {record.reviewQuestions.questions.map((q, i) => (
                          <li key={i}>
                            {i + 1}. {q}
                          </li>
                        ))}
                      </ol>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={handleRegenerateQuestions}
                          className="text-xs font-medium text-lavender-deep"
                        >
                          새 질문 만들기
                        </button>
                        <button
                          type="button"
                          onClick={() => setQuestionsOpen(false)}
                          className="text-xs text-warm-gray"
                        >
                          완료
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </li>
  );
}
