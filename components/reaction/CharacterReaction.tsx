"use client";

import { useRef, useState } from "react";
import {
  reactionData,
  buildReactionLine,
  FALLBACK_REFLECTION_QUESTION,
  FALLBACK_FOLLOWUP_QUESTION,
  buildFallbackClosingLine,
} from "@/lib/mockData";
import { loadRecentMemories } from "@/lib/studyRecords";
import type { FeelingChoice, ReflectionEvidence, StudySession } from "@/lib/types";

interface CharacterReactionProps {
  studySession: StudySession;
  onSelectFeeling: (feelingId: FeelingChoice["id"], aiReaction?: string) => void;
}

// 공부 완료 후 reaction phase 안에서만 도는 짧은 회고 대화. 전역 ViewState 는
// "reaction" 하나 그대로이고, 아래 단계는 이 컴포넌트 로컬 상태로만 관리한다.
//   feeling     감상 칩 선택
//   reflection  회고 질문 + 첫 답변 → /api/reflection-assessment 로 evidence 판단
//                clear            → 바로 마무리
//                partial/unclear  → followup 단계로
//   followup    추가 질문 1개 + 답변 (판단 재실행 없음 — 질문은 최대 2개)
//   finishing   /api/reaction 마무리 한마디 + [오늘 공부 마무리] → onSelectFeeling → done
// 자유 채팅 아님. 질문 최대 2개. 사용자 화면에 evidence/점수/검증 표시 없음.
type ReflectionStep = "feeling" | "reflection" | "followup" | "finishing";

const ANSWER_MAX_LENGTH = 300;

export default function CharacterReaction({ studySession, onSelectFeeling }: CharacterReactionProps) {
  const [step, setStep] = useState<ReflectionStep>("feeling");
  const [isLoading, setIsLoading] = useState(false);
  const [feelingId, setFeelingId] = useState<FeelingChoice["id"] | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [firstAnswer, setFirstAnswer] = useState("");
  const [followUpQuestion, setFollowUpQuestion] = useState("");
  const [closingLine, setClosingLine] = useState("");
  const [isFinishing, setIsFinishing] = useState(false);

  // evidence 는 내부 판단값이다 — 아래 dev 표시 외에는 사용자에게 보이지 않는다.
  const [evidence, setEvidence] = useState<ReflectionEvidence | null>(null);
  const [assessmentFallback, setAssessmentFallback] = useState(false);

  // 각 단계 요청이 정확히 한 번만 처리되도록 동기 재진입 방어(렌더 타이밍과 무관).
  const busyRef = useRef(false);
  const submittedRef = useRef(false);

  const subject = studySession.subject;
  const elapsedSeconds = studySession.elapsedSeconds ?? 0;
  const characterLine = buildReactionLine(subject, elapsedSeconds);

  // /api/reaction 으로 마무리 한마디를 받는다. 실패/타임아웃이면 주제가 들어간
  // 정적 fallback 을 돌려준다 — 흐름을 막지 않는다.
  const fetchClosingLine = async (reflection: {
    question: string;
    answer: string;
    followUpQuestion?: string;
    followUpAnswer?: string;
  }): Promise<string> => {
    const recentMemories = loadRecentMemories();
    try {
      const response = await fetch("/api/reaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          targetMinutes: studySession.targetMinutes,
          elapsedSeconds,
          feelingId,
          recentMemories,
          reflection,
        }),
      });
      if (response.ok) {
        const data = (await response.json()) as { reaction?: unknown };
        if (typeof data.reaction === "string" && data.reaction.trim() !== "") {
          return data.reaction.trim();
        }
        console.error("[CharacterReaction] 예상치 못한 /api/reaction 응답:", data);
      } else {
        console.error("[CharacterReaction] /api/reaction 실패:", response.status);
      }
    } catch (error) {
      console.error("[CharacterReaction] /api/reaction 호출 오류:", error);
    }
    return buildFallbackClosingLine(subject);
  };

  // 1) 감상 선택 → 회고 질문 생성. 요청 중 다른 칩 재선택 금지.
  const handleSelectFeeling = async (picked: FeelingChoice["id"]) => {
    if (busyRef.current || step !== "feeling") return;
    busyRef.current = true;
    setFeelingId(picked);
    setStep("reflection");
    setIsLoading(true);

    const recentMemories = loadRecentMemories();
    let nextQuestion = FALLBACK_REFLECTION_QUESTION;
    try {
      const response = await fetch("/api/reflection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, elapsedSeconds, feelingId: picked, recentMemories }),
      });
      if (response.ok) {
        const data = (await response.json()) as { question?: unknown };
        if (typeof data.question === "string" && data.question.trim() !== "") {
          nextQuestion = data.question.trim();
        } else {
          console.error("[CharacterReaction] 예상치 못한 /api/reflection 응답:", data);
        }
      } else {
        console.error("[CharacterReaction] /api/reflection 실패:", response.status);
      }
    } catch (error) {
      console.error("[CharacterReaction] /api/reflection 호출 오류:", error);
    } finally {
      setQuestion(nextQuestion);
      setIsLoading(false);
      busyRef.current = false;
    }
  };

  // 2) 첫 답변 제출 → evidence 판단 → clear면 바로 마무리, 아니면 추가 질문.
  const handleSubmitAnswer = async () => {
    if (busyRef.current || step !== "reflection") return;
    const trimmed = answer.trim();
    if (trimmed === "" || feelingId === null) return;
    busyRef.current = true;
    setIsLoading(true);
    setFirstAnswer(trimmed);

    // assessment 실패 시 사용자를 붙잡지 않는다 — 기술적 fallback 으로 clear 취급.
    // (실제 clear 판단이 아니라 흐름을 막지 않기 위함.)
    let ev: ReflectionEvidence = "clear";
    let usedFallback = false;
    let followUp: string | undefined;
    try {
      const response = await fetch("/api/reflection-assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, question, answer: trimmed }),
      });
      if (response.ok) {
        const data = (await response.json()) as {
          evidence?: unknown;
          followUpQuestion?: unknown;
        };
        if (
          data.evidence === "clear" ||
          data.evidence === "partial" ||
          data.evidence === "unclear"
        ) {
          ev = data.evidence;
          if (
            typeof data.followUpQuestion === "string" &&
            data.followUpQuestion.trim() !== ""
          ) {
            followUp = data.followUpQuestion.trim();
          }
        } else {
          usedFallback = true;
          console.error("[CharacterReaction] 예상치 못한 assessment 응답:", data);
        }
      } else {
        usedFallback = true;
        console.error("[CharacterReaction] /api/reflection-assessment 실패:", response.status);
      }
    } catch (error) {
      usedFallback = true;
      console.error("[CharacterReaction] /api/reflection-assessment 호출 오류:", error);
    }

    setEvidence(ev);
    setAssessmentFallback(usedFallback);

    if (ev === "clear") {
      const closing = await fetchClosingLine({ question, answer: trimmed });
      setClosingLine(closing);
      setStep("finishing");
    } else {
      setFollowUpQuestion(followUp ?? FALLBACK_FOLLOWUP_QUESTION);
      setAnswer("");
      setStep("followup");
    }
    setIsLoading(false);
    busyRef.current = false;
  };

  // 3) 추가 질문 답변 제출 → 판단 없이 무조건 마무리(세 번째 질문 없음).
  const handleSubmitFollowUp = async () => {
    if (busyRef.current || step !== "followup") return;
    const trimmed = answer.trim();
    if (trimmed === "" || feelingId === null) return;
    busyRef.current = true;
    setIsLoading(true);

    const closing = await fetchClosingLine({
      question,
      answer: firstAnswer,
      followUpQuestion,
      followUpAnswer: trimmed,
    });
    setClosingLine(closing);
    setStep("finishing");
    setIsLoading(false);
    busyRef.current = false;
  };

  // 4) 마무리 → done. 연타로 onSelectFeeling 이 여러 번 불리지 않게 방어.
  const handleFinish = () => {
    if (submittedRef.current || feelingId === null) return;
    submittedRef.current = true;
    setIsFinishing(true);
    onSelectFeeling(feelingId, closingLine);
  };

  const loadingView = (text: string) => (
    <section className="card mx-6 flex min-h-[168px] flex-col items-center justify-center gap-3">
      <span aria-hidden className="flex gap-1.5">
        <span className="motion-safe:animate-quiet-dot h-1.5 w-1.5 rounded-full bg-lavender-deep" />
        <span className="motion-safe:animate-quiet-dot h-1.5 w-1.5 rounded-full bg-lavender-deep [animation-delay:0.2s]" />
        <span className="motion-safe:animate-quiet-dot h-1.5 w-1.5 rounded-full bg-lavender-deep [animation-delay:0.4s]" />
      </span>
      <p className="font-serif text-sm text-warm-gray">{text}</p>
    </section>
  );

  // 개발 환경에서만 보이는 작은 내부 판단 표시. production 빌드에서는
  // 이 분기와 문자열이 통째로 제거된다.
  const devEvidenceLine =
    process.env.NODE_ENV === "development" && evidence ? (
      <p className="mt-2 text-[10px] text-warm-gray/60">
        Dev · evidence: {evidence}
        {assessmentFallback ? " (fallback)" : ""}
        {followUpQuestion ? " · follow-up: yes" : ""}
      </p>
    ) : null;

  // reflection · followup 단계의 답변 입력 UI (동일 형태). onClick 핸들러만 다르다.
  const answerFieldClass = "field mt-3 resize-none";
  const submitButtonClass = "btn-primary mt-3";

  if (step === "feeling") {
    return (
      <section className="card mx-6 min-h-[168px]">
        <div className="daon-bubble">{characterLine}</div>

        <div className="mt-4 flex flex-wrap gap-2">
          {reactionData.choices.map((choice) => (
            <button
              key={choice.id}
              type="button"
              disabled={isLoading}
              onClick={() => handleSelectFeeling(choice.id)}
              className="chip disabled:opacity-50"
            >
              {choice.label}
            </button>
          ))}
        </div>
      </section>
    );
  }

  if (step === "reflection") {
    if (isLoading) return loadingView("다온이가 오늘 공부를 돌아보고 있어요...");

    return (
      <section className="card mx-6 min-h-[168px]">
        <div className="daon-bubble">{question}</div>
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          maxLength={ANSWER_MAX_LENGTH}
          rows={3}
          placeholder="짧게 적어도 괜찮아요"
          className={answerFieldClass}
        />
        <button
          type="button"
          disabled={isLoading || answer.trim() === ""}
          onClick={handleSubmitAnswer}
          className={submitButtonClass}
        >
          말해주기
        </button>
      </section>
    );
  }

  if (step === "followup") {
    if (isLoading) return loadingView("다온이가 오늘 공부를 떠올리고 있어요...");

    return (
      <section className="card mx-6 min-h-[168px]">
        <div className="daon-bubble">{followUpQuestion}</div>
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          maxLength={ANSWER_MAX_LENGTH}
          rows={3}
          placeholder="짧게 적어도 괜찮아요"
          className={answerFieldClass}
        />
        <button
          type="button"
          disabled={isLoading || answer.trim() === ""}
          onClick={handleSubmitFollowUp}
          className={submitButtonClass}
        >
          말해주기
        </button>
        {devEvidenceLine}
      </section>
    );
  }

  // step === "finishing"
  if (isLoading) return loadingView("다온이가 오늘 공부를 떠올리고 있어요...");

  return (
    <section className="card mx-6 min-h-[168px]">
      <div className="daon-bubble">{closingLine}</div>

      <button
        type="button"
        disabled={isFinishing}
        onClick={handleFinish}
        className="btn-primary mt-4"
      >
        오늘 공부 마무리
      </button>
      {devEvidenceLine}
    </section>
  );
}
