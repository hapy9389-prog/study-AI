"use client";

import { useRef, useState } from "react";
import {
  reactionData,
  buildReactionLine,
  FALLBACK_REFLECTION_QUESTION,
  buildFallbackClosingLine,
} from "@/lib/mockData";
import { loadRecentMemories } from "@/lib/studyRecords";
import type { FeelingChoice, StudySession } from "@/lib/types";

interface CharacterReactionProps {
  studySession: StudySession;
  onSelectFeeling: (feelingId: FeelingChoice["id"], aiReaction?: string) => void;
}

// 공부 완료 후 reaction phase 안에서만 도는 짧은 회고 대화. 전역 ViewState 는
// "reaction" 하나 그대로이고, 아래 세 단계는 이 컴포넌트 로컬 상태로만 관리한다.
//   feeling     감상 칩 선택        → POST /api/reflection (질문 1개)
//   reflection  질문 + 짧은 답변    → POST /api/reaction   (마무리 한마디)
//   finishing   마무리 + [오늘 공부 마무리] → onSelectFeeling → done
// 자유 채팅 아님. 질문은 정확히 1개. 검증/점수 UI 없음.
type ReflectionStep = "feeling" | "reflection" | "finishing";

const ANSWER_MAX_LENGTH = 300;

export default function CharacterReaction({ studySession, onSelectFeeling }: CharacterReactionProps) {
  const [step, setStep] = useState<ReflectionStep>("feeling");
  const [isLoading, setIsLoading] = useState(false);
  const [feelingId, setFeelingId] = useState<FeelingChoice["id"] | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [closingLine, setClosingLine] = useState("");
  const [isFinishing, setIsFinishing] = useState(false);

  // 각 단계 요청이 정확히 한 번만 처리되도록 동기 재진입 방어(렌더 타이밍과 무관).
  const busyRef = useRef(false);
  const submittedRef = useRef(false);

  const subject = studySession.subject;
  const elapsedSeconds = studySession.elapsedSeconds ?? 0;
  const characterLine = buildReactionLine(subject, elapsedSeconds);

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

  // 2) 답변 제출 → 마무리 반응 생성. 요청 중 재클릭 금지.
  const handleSubmitAnswer = async () => {
    if (busyRef.current || step !== "reflection") return;
    const trimmed = answer.trim();
    if (trimmed === "" || feelingId === null) return;
    busyRef.current = true;
    setIsLoading(true);

    const recentMemories = loadRecentMemories();
    let nextClosing = buildFallbackClosingLine(subject);
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
          reflection: { question, answer: trimmed },
        }),
      });
      if (response.ok) {
        const data = (await response.json()) as { reaction?: unknown };
        if (typeof data.reaction === "string" && data.reaction.trim() !== "") {
          nextClosing = data.reaction.trim();
        } else {
          console.error("[CharacterReaction] 예상치 못한 /api/reaction 응답:", data);
        }
      } else {
        console.error("[CharacterReaction] /api/reaction 실패:", response.status);
      }
    } catch (error) {
      console.error("[CharacterReaction] /api/reaction 호출 오류:", error);
    } finally {
      setClosingLine(nextClosing);
      setStep("finishing");
      setIsLoading(false);
      busyRef.current = false;
    }
  };

  // 3) 마무리 → done. 연타로 onSelectFeeling 이 여러 번 불리지 않게 방어.
  const handleFinish = () => {
    if (submittedRef.current || feelingId === null) return;
    submittedRef.current = true;
    setIsFinishing(true);
    onSelectFeeling(feelingId, closingLine);
  };

  const loadingView = (text: string) => (
    <section className="mx-6 rounded-3xl bg-white p-5 shadow-sm">
      <p className="flex items-center justify-center gap-2 py-4 text-sm text-warm-gray">
        <span className="h-2 w-2 animate-pulse rounded-full bg-lavender-deep" />
        {text}
      </p>
    </section>
  );

  if (step === "feeling") {
    return (
      <section className="mx-6 rounded-3xl bg-white p-5 shadow-sm">
        <div className="rounded-2xl bg-lavender/50 px-4 py-3 text-sm text-cocoa">{characterLine}</div>

        <div className="mt-4 flex flex-wrap gap-2">
          {reactionData.choices.map((choice) => (
            <button
              key={choice.id}
              type="button"
              disabled={isLoading}
              onClick={() => handleSelectFeeling(choice.id)}
              className="rounded-full bg-peach px-4 py-2 text-sm font-medium text-cocoa transition-colors hover:bg-peach-deep disabled:opacity-50"
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
      <section className="mx-6 rounded-3xl bg-white p-5 shadow-sm">
        <div className="rounded-2xl bg-lavender/50 px-4 py-3 text-sm text-cocoa">{question}</div>

        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          maxLength={ANSWER_MAX_LENGTH}
          rows={3}
          placeholder="짧게 적어도 괜찮아요"
          className="mt-3 w-full resize-none rounded-2xl border border-peach/60 bg-cream px-4 py-3 text-sm text-cocoa outline-none focus:border-lavender-deep"
        />

        <button
          type="button"
          disabled={isLoading || answer.trim() === ""}
          onClick={handleSubmitAnswer}
          className="mt-3 w-full rounded-2xl bg-lavender-deep py-3 text-sm font-semibold text-white transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
        >
          말해주기
        </button>
      </section>
    );
  }

  // step === "finishing"
  if (isLoading) return loadingView("다온이가 오늘 공부를 떠올리고 있어요...");

  return (
    <section className="mx-6 rounded-3xl bg-white p-5 shadow-sm">
      <div className="rounded-2xl bg-lavender/50 px-4 py-3 text-sm text-cocoa">{closingLine}</div>

      <button
        type="button"
        disabled={isFinishing}
        onClick={handleFinish}
        className="mt-4 w-full rounded-2xl bg-peach py-3 text-sm font-semibold text-cocoa transition-colors hover:bg-peach-deep disabled:opacity-50"
      >
        오늘 공부 마무리
      </button>
    </section>
  );
}
