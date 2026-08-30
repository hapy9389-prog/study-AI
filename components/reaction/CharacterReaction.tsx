"use client";

import { useRef, useState } from "react";
import PostStudyCharacter from "@/components/character/PostStudyCharacter";
import { reactionData, toMinutes } from "@/lib/mockData";
import { loadRecentMemories, loadStudyRecords } from "@/lib/studyRecords";
import {
  didCompleteDailyPlanWithSession,
  getDailyPlanProgress,
  loadDailyPlan,
  normalizeSubjectForPlanMatch,
} from "@/lib/dailyStudyPlan";
import { evaluateMoodCheck, saveMoodCheckState } from "@/lib/studyMood";
import {
  getStudySupportFallback,
  STRAIN_FREETEXT_PROMPT,
  STRAIN_REASON_CHOICES,
  STRAIN_REASON_PROMPT,
  type StudyStrainReason,
} from "@/lib/studySupport";
import {
  characterNickname,
  characterSubject,
  type CharacterId,
} from "@/lib/characters";
import { getCharacterVoice } from "@/lib/characterVoice";
import type {
  CharacterAccessoryId,
  DailyPlanReactionContext,
  DailyPlanStatus,
  FeelingChoice,
  ReflectionEvidence,
  StudySession,
} from "@/lib/types";

interface CharacterReactionProps {
  characterId: CharacterId;
  studySession: StudySession;
  /** 장착된 액세서리(있으면). 상단 작은 캐릭터에 그대로 반영. */
  equippedAccessoryId?: CharacterAccessoryId | null;
  onSelectFeeling: (
    feelingId: FeelingChoice["id"],
    aiReaction?: string,
    reflectionClarity?: ReflectionEvidence,
  ) => void;
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
//
// 화면은 카드로 감싸지 않는다 — cream 배경 위 하나의 조용한 장면. 계층은 작은
// 캐릭터 + 말풍선(daon-bubble) + spacing 으로만 만든다.
type ReflectionStep = "feeling" | "reflection" | "followup" | "finishing";

const ANSWER_MAX_LENGTH = 300;

// 이번 세션이 "오늘 계획"의 대상 과목이면 /api/reaction 에 넘길 진척
// 컨텍스트를 만든다. 이 시점(finishing 진입 직전)엔 이번 세션의 StudyRecord가
// 아직 저장되지 않았다 — 저장은 onSelectFeeling 이후 page.tsx 에서 일어난다.
// 그래서 레코드를 다시 세지 않고, 이번 세션의 실제 elapsedSeconds를 기존 누적
// 초에 한 번만 더한다. 이 값은 프롬프트 재료일 뿐 어디에도 저장되지 않으므로
// 이후 실제 저장/재계산과 절대 겹치지 않는다(이중 반영 불가).
function buildDailyPlanContext(
  subject: string,
  elapsedSeconds: number,
): DailyPlanReactionContext | undefined {
  const plan = loadDailyPlan();
  if (!plan) return undefined;

  const key = normalizeSubjectForPlanMatch(subject);
  const matchedItem = plan.items.find(
    (item) => normalizeSubjectForPlanMatch(item.subject) === key,
  );
  if (!matchedItem) return undefined;

  const records = loadStudyRecords();
  const before = getDailyPlanProgress(plan, records).find(
    (p) => normalizeSubjectForPlanMatch(p.subject) === key,
  );
  const studiedSecondsBefore = before?.studiedSeconds ?? 0;
  const studiedSecondsAfter = studiedSecondsBefore + elapsedSeconds;
  const targetSeconds = matchedItem.targetMinutes * 60;

  // status가 유일한 source of truth다 — "이번에 막 달성했는지"는 상태값
  // 자체(just-completed)로만 구분하고 별도 boolean으로 중복 표현하지 않는다.
  const status: DailyPlanStatus =
    studiedSecondsAfter < targetSeconds
      ? "in-progress"
      : studiedSecondsBefore < targetSeconds
        ? "just-completed"
        : "already-completed";

  // 오늘 계획 "전체"가 이번 세션으로 막 완료됐는지 — page.tsx의 reward 판정과
  // 완전히 같은 함수를 재사용해 두 곳의 계산이 어긋나지 않는다. before가 이미
  // 전체 완료 상태였으면 항상 false(재축하 방지).
  const allPlanItemsCompletedNow = didCompleteDailyPlanWithSession(
    plan,
    records,
    subject,
    elapsedSeconds,
  );

  return {
    targetMinutes: matchedItem.targetMinutes,
    studiedSeconds: studiedSecondsAfter,
    remainingSeconds: Math.max(0, targetSeconds - studiedSecondsAfter),
    status,
    allPlanItemsCompletedNow,
  };
}

export default function CharacterReaction({
  characterId,
  studySession,
  equippedAccessoryId,
  onSelectFeeling,
}: CharacterReactionProps) {
  const [step, setStep] = useState<ReflectionStep>("feeling");
  const [isLoading, setIsLoading] = useState(false);
  const [feelingId, setFeelingId] = useState<FeelingChoice["id"] | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [firstAnswer, setFirstAnswer] = useState("");
  const [followUpQuestion, setFollowUpQuestion] = useState("");
  const [closingLine, setClosingLine] = useState("");
  const [isFinishing, setIsFinishing] = useState(false);

  // 최근 공부 감정 패턴 감지(cooldown 통과 시에만). finishing step 에서 평소 마무리
  // 대신 조심스러운 확인 → (조금 힘들어면) 어려움 선택 → 짧은 학습 도움을 보여준다.
  //   none        패턴 없음/쿨다운 → 기존 흐름 그대로
  //   ask         확인 문구 + [괜찮아] [조금 힘들어]
  //   reason      "어떤 점이 버거웠어?" + reason 칩 5개 + "오늘은 그냥 마무리할래"
  //   reasonText  "직접 말할래" → 짧은 자유 입력
  //   reply       [괜찮아] / "그냥 마무리" 뒤 짧은 수용 문구 + [오늘 공부 마무리]
  //   support     reason/자유입력 뒤 LLM 학습 도움(공감+관찰+제안 1) + [오늘 공부 마무리]
  const [moodPhase, setMoodPhase] = useState<
    "none" | "ask" | "reason" | "reasonText" | "reply" | "support"
  >("none");
  const [moodReplyLine, setMoodReplyLine] = useState("");
  const [reasonText, setReasonText] = useState("");
  const [supportLine, setSupportLine] = useState("");
  // finishing 진입 시점에 확정된 회고 Q&A — mood support 요청에 그대로 넘긴다.
  const [reflectionPayload, setReflectionPayload] = useState<{
    question: string;
    answer: string;
    followUpQuestion?: string;
    followUpAnswer?: string;
  } | null>(null);

  // evidence 는 내부 판단값이다 — 아래 dev 표시 외에는 사용자에게 보이지 않는다.
  const [evidence, setEvidence] = useState<ReflectionEvidence | null>(null);
  const [assessmentFallback, setAssessmentFallback] = useState(false);
  // 회고에서 최종 도달한 판정. 실제 판정이 있었을 때만 값을 갖는다(assessment
  // 실패 시엔 null → StudyRecord 에 clarity 를 남기지 않는다). raw enum 은 여기서
  // 밖으로만 나가고, 사용자 문구 변환은 done/Memory 쪽에서 한다.
  const [clarityResult, setClarityResult] = useState<ReflectionEvidence | null>(
    null,
  );

  // 각 단계 요청이 정확히 한 번만 처리되도록 동기 재진입 방어(렌더 타이밍과 무관).
  const busyRef = useRef(false);
  const submittedRef = useRef(false);

  const voice = getCharacterVoice(characterId);
  const subject = studySession.subject;
  const elapsedSeconds = studySession.elapsedSeconds ?? 0;
  const togetherPhrase =
    elapsedSeconds < 60 ? "잠깐" : `${toMinutes(elapsedSeconds)}분 정도`;
  const characterLine = voice.reactionLine(subject, togetherPhrase);

  // /api/reaction 으로 마무리 한마디를 받는다. 실패/타임아웃이면 주제가 들어간
  // 정적 fallback 을 돌려준다 — 흐름을 막지 않는다.
  const fetchClosingLine = async (
    reflection: {
      question: string;
      answer: string;
      followUpQuestion?: string;
      followUpAnswer?: string;
    },
    reflectionClarity?: ReflectionEvidence,
    moodSignal = false,
    dailyPlanContext?: DailyPlanReactionContext,
  ): Promise<string> => {
    const recentMemories = loadRecentMemories(characterId);
    try {
      const response = await fetch("/api/reaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterId,
          subject,
          elapsedSeconds,
          feelingId,
          recentMemories,
          reflection,
          ...(reflectionClarity ? { reflectionClarity } : {}),
          ...(moodSignal ? { recentStudyMoodSignal: true } : {}),
          ...(dailyPlanContext ? { dailyPlanContext } : {}),
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
    // mood check 상황이면 마무리 문구 대신 조심스러운 확인 문구를 fallback 으로.
    return moodSignal
      ? voice.moodCheck.ask
      : voice.closingLine(subject, reflectionClarity);
  };

  // 1) 감상 선택 → 회고 질문 생성. 요청 중 다른 칩 재선택 금지.
  const handleSelectFeeling = async (picked: FeelingChoice["id"]) => {
    if (busyRef.current || step !== "feeling") return;
    busyRef.current = true;
    setFeelingId(picked);
    setStep("reflection");
    setIsLoading(true);

    const recentMemories = loadRecentMemories(characterId);
    let nextQuestion = voice.reflectionQuestion;
    try {
      const response = await fetch("/api/reflection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterId,
          subject,
          elapsedSeconds,
          feelingId: picked,
          recentMemories,
        }),
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
        body: JSON.stringify({ characterId, subject, question, answer: trimmed }),
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
      // assessment 가 실제로 clear 를 준 경우에만 clarity 로 남긴다.
      // 실패해서 clear 로 흘려보낸 경우(usedFallback)는 판정 없음 → null.
      const clarity: ReflectionEvidence | null = usedFallback ? null : "clear";
      setClarityResult(clarity);
      // 최근 공부 감정 패턴 확인 여부(cooldown 포함). feelingId 는 위에서 non-null 확인됨.
      const mood = evaluateMoodCheck(feelingId);
      setReflectionPayload({ question, answer: trimmed });
      const dailyPlanContext = buildDailyPlanContext(subject, elapsedSeconds);
      const closing = await fetchClosingLine(
        { question, answer: trimmed },
        clarity ?? undefined,
        mood.shouldPrompt,
        dailyPlanContext,
      );
      setClosingLine(closing);
      if (mood.shouldPrompt) setMoodPhase("ask");
      setStep("finishing");
    } else {
      // 이 분기는 assessment 가 실제로 partial/unclear 를 반환했을 때만 온다.
      // follow-up 답변 후 재판정으로 갱신될 수 있는 임시값.
      setClarityResult(ev);
      setFollowUpQuestion(followUp ?? voice.followUpQuestion);
      setAnswer("");
      setStep("followup");
    }
    setIsLoading(false);
    busyRef.current = false;
  };

  // 3) 추가 질문 답변 제출 → 첫 답변 + follow-up 답변으로 최종 clarity 재판정 후 마무리.
  //    세 번째 질문은 없다. 재판정은 저장될 clarity 만 바꿀 뿐 흐름을 바꾸지 않는다.
  const handleSubmitFollowUp = async () => {
    if (busyRef.current || step !== "followup") return;
    const trimmed = answer.trim();
    if (trimmed === "" || feelingId === null) return;
    busyRef.current = true;
    setIsLoading(true);

    // 이 단계에 온 시점에서 evidence 는 항상 실제 partial/unclear 판정이다.
    const firstEv: ReflectionEvidence = evidence ?? "partial";
    let finalEv = firstEv;
    try {
      const response = await fetch("/api/reflection-assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterId,
          subject,
          question,
          answer: firstAnswer,
          followUpQuestion,
          followUpAnswer: trimmed,
        }),
      });
      if (response.ok) {
        const data = (await response.json()) as { evidence?: unknown };
        if (
          data.evidence === "clear" ||
          data.evidence === "partial" ||
          data.evidence === "unclear"
        ) {
          finalEv = data.evidence;
        } else {
          console.error("[CharacterReaction] 예상치 못한 재판정 응답:", data);
        }
      } else {
        console.error(
          "[CharacterReaction] /api/reflection-assessment 재판정 실패:",
          response.status,
        );
      }
    } catch (error) {
      console.error("[CharacterReaction] 재판정 호출 오류:", error);
    }
    // 재판정 실패 시엔 첫 판정을 그대로 최종값으로 둔다.
    setEvidence(finalEv);
    setClarityResult(finalEv);

    // 최근 공부 감정 패턴 확인 여부(cooldown 포함). feelingId 는 위에서 non-null 확인됨.
    const mood = evaluateMoodCheck(feelingId);
    setReflectionPayload({
      question,
      answer: firstAnswer,
      followUpQuestion,
      followUpAnswer: trimmed,
    });
    const dailyPlanContext = buildDailyPlanContext(subject, elapsedSeconds);
    const closing = await fetchClosingLine(
      {
        question,
        answer: firstAnswer,
        followUpQuestion,
        followUpAnswer: trimmed,
      },
      finalEv,
      mood.shouldPrompt,
      dailyPlanContext,
    );
    setClosingLine(closing);
    if (mood.shouldPrompt) setMoodPhase("ask");
    setStep("finishing");
    setIsLoading(false);
    busyRef.current = false;
  };

  // 4) 마무리 → done. 연타로 onSelectFeeling 이 여러 번 불리지 않게 방어.
  const handleFinish = () => {
    if (submittedRef.current || feelingId === null) return;
    submittedRef.current = true;
    setIsFinishing(true);
    // mood check 을 거친 종료는 support 조언이나 수용 문구가 아니라, clarity 를
    // 반영하는 기존 마무리(voice.closingLine)를 남긴다. support 조언은 그 화면에서만.
    const finalLine =
      moodPhase === "none"
        ? closingLine
        : voice.closingLine(subject, clarityResult ?? undefined);
    onSelectFeeling(feelingId, finalLine, clarityResult ?? undefined);
  };

  // 3.5) mood check 응답 + cooldown 기록(양쪽 다 즉시). 이후:
  //   괜찮아   → 짧은 수용 문구 → reply
  //   조금 힘들어 → 바로 조언하지 않고 "무엇이 힘든지" 물어보는 reason 단계로
  const handleMoodReply = (outcome: "ok" | "hard") => {
    if (moodPhase !== "ask") return;
    saveMoodCheckState({
      lastPromptedAt: new Date().toISOString(),
      lastOutcome: outcome,
    });
    if (outcome === "ok") {
      setMoodReplyLine(voice.moodCheck.acceptOk);
      setMoodPhase("reply");
    } else {
      setMoodPhase("reason");
    }
  };

  // reason 단계에서 "오늘은 그냥 마무리할래" — 도움을 강요하지 않는다. LLM 호출 없음.
  const handleSkipSupport = () => {
    if (moodPhase !== "reason") return;
    setMoodReplyLine(voice.moodCheck.acceptHard);
    setMoodPhase("reply");
  };

  // 사용자가 고른 어려움 + 최근 학습 기록을 참고해 짧은 도움 문장을 받는다.
  // 실패/타임아웃이면 reason별 정적 fallback. 흐름을 막지 않는다.
  const fetchMoodSupport = async (
    reason: StudyStrainReason,
    freeText?: string,
  ) => {
    if (busyRef.current || feelingId === null) return;
    busyRef.current = true;
    setIsLoading(true);

    const recentMemories = loadRecentMemories(characterId);
    let line = getStudySupportFallback(reason);
    try {
      const response = await fetch("/api/reaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterId,
          subject,
          elapsedSeconds,
          feelingId,
          recentMemories,
          ...(reflectionPayload ? { reflection: reflectionPayload } : {}),
          ...(clarityResult ? { reflectionClarity: clarityResult } : {}),
          moodSupport: { reason, ...(freeText ? { freeText } : {}) },
        }),
      });
      if (response.ok) {
        const data = (await response.json()) as { reaction?: unknown };
        if (typeof data.reaction === "string" && data.reaction.trim() !== "") {
          line = data.reaction.trim();
        } else {
          console.error("[CharacterReaction] 예상치 못한 mood-support 응답:", data);
        }
      } else {
        console.error("[CharacterReaction] mood-support 실패:", response.status);
      }
    } catch (error) {
      console.error("[CharacterReaction] mood-support 호출 오류:", error);
    }
    setSupportLine(line);
    setMoodPhase("support");
    setIsLoading(false);
    busyRef.current = false;
  };

  const handlePickReason = (reason: StudyStrainReason) => {
    if (busyRef.current || moodPhase !== "reason") return;
    if (reason === "other") {
      setMoodPhase("reasonText");
      return;
    }
    void fetchMoodSupport(reason);
  };

  const handleSubmitReasonText = () => {
    if (busyRef.current || moodPhase !== "reasonText") return;
    const trimmed = reasonText.trim();
    if (trimmed === "") return;
    void fetchMoodSupport("other", trimmed);
  };

  // 상단 작은 캐릭터 + 이름. 입력 단계에서는 작게(sm) 줄여 textarea 를 위로 올린다.
  const characterHeader = (
    headerSize: "sm" | "md",
    expression: "curious" | "happy",
  ) => (
    <div className="flex flex-col items-center gap-1">
      <PostStudyCharacter
        characterId={characterId}
        expression={expression}
        accessoryId={equippedAccessoryId}
        size={headerSize}
      />
      <p className="text-xs font-medium text-warm-gray">
        {characterNickname(characterId)}
      </p>
    </div>
  );

  // 조용한 로딩 — 큰 spinner/"분석 중" 대신 quiet-dot 3점. 높이를 크게 바꾸지 않는다.
  const loadingView = (text: string) => (
    <section className="flex min-h-[184px] flex-col items-center justify-center gap-3 px-6">
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
      <p className="text-[10px] text-warm-gray/60">
        Dev · evidence: {evidence}
        {assessmentFallback ? " (fallback)" : ""}
        {followUpQuestion ? " · follow-up: yes" : ""}
        {` · saved clarity: ${clarityResult ?? "none"}`}
        {moodPhase !== "none" ? ` · mood-check: ${moodPhase}` : ""}
      </p>
    ) : null;

  if (step === "feeling") {
    return (
      <section className="flex flex-col items-center gap-4 px-6 pt-2">
        {characterHeader("md", "curious")}
        <div className="daon-bubble w-full max-w-[300px]">{characterLine}</div>
        <div className="flex flex-wrap justify-center gap-2">
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
    if (isLoading)
      return loadingView(
        `${characterSubject(characterId)} 오늘 공부를 돌아보고 있어요...`,
      );

    return (
      <section className="flex flex-col gap-3 px-6 pt-2">
        {characterHeader("sm", "curious")}
        <div className="daon-bubble">{question}</div>
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          maxLength={ANSWER_MAX_LENGTH}
          rows={3}
          placeholder="짧게 적어도 괜찮아요"
          className="field resize-none"
        />
        <button
          type="button"
          disabled={isLoading || answer.trim() === ""}
          onClick={handleSubmitAnswer}
          className="btn-primary"
        >
          말해주기
        </button>
      </section>
    );
  }

  if (step === "followup") {
    if (isLoading)
      return loadingView(
        `${characterSubject(characterId)} 오늘 공부를 떠올리고 있어요...`,
      );

    return (
      <section className="flex flex-col gap-3 px-6 pt-2">
        {characterHeader("sm", "curious")}
        {/* 첫 대화를 조용히 남겨 "이어지는 두 번째 질문"으로 읽히게 한다. */}
        <div className="space-y-0.5 border-l-2 border-warm-line pl-3 opacity-60">
          <p className="text-xs text-warm-gray">{question}</p>
          <p className="text-xs text-cocoa">{firstAnswer}</p>
        </div>
        <div className="daon-bubble">{followUpQuestion}</div>
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          maxLength={ANSWER_MAX_LENGTH}
          rows={3}
          placeholder="짧게 적어도 괜찮아요"
          className="field resize-none"
        />
        <button
          type="button"
          disabled={isLoading || answer.trim() === ""}
          onClick={handleSubmitFollowUp}
          className="btn-primary"
        >
          말해주기
        </button>
        {devEvidenceLine}
      </section>
    );
  }

  // step === "finishing"
  if (isLoading)
    return loadingView(
      moodPhase === "reason" || moodPhase === "reasonText"
        ? `${characterSubject(characterId)} 잠깐 생각하고 있어요...`
        : `${characterSubject(characterId)} 오늘 공부를 떠올리고 있어요...`,
    );

  // 최근 공부 감정 패턴이 감지됨 — 마무리 전에 조심스럽게 한 번만 확인한다.
  if (moodPhase === "ask") {
    return (
      <section className="flex flex-col items-center gap-4 px-6 pt-2">
        {characterHeader("md", "curious")}
        <div className="daon-bubble w-full max-w-[300px]">{closingLine}</div>
        <div className="flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => handleMoodReply("ok")}
            className="chip"
          >
            괜찮아
          </button>
          <button
            type="button"
            onClick={() => handleMoodReply("hard")}
            className="chip"
          >
            조금 힘들어
          </button>
        </div>
        {devEvidenceLine}
      </section>
    );
  }

  // "조금 힘들어" → 바로 조언하지 않고 무엇이 힘든지 먼저 묻는다.
  if (moodPhase === "reason") {
    return (
      <section className="flex flex-col items-center gap-4 px-6 pt-2">
        {characterHeader("md", "curious")}
        <div className="daon-bubble w-full max-w-[300px]">
          {STRAIN_REASON_PROMPT}
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {STRAIN_REASON_CHOICES.map((choice) => (
            <button
              key={choice.id}
              type="button"
              onClick={() => handlePickReason(choice.id)}
              className="chip"
            >
              {choice.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={handleSkipSupport}
          className="text-sm text-warm-gray transition-colors hover:text-cocoa"
        >
          오늘은 그냥 마무리할래
        </button>
        {devEvidenceLine}
      </section>
    );
  }

  // "직접 말할래" → 짧은 자유 입력(회고 입력과 같은 UX).
  if (moodPhase === "reasonText") {
    return (
      <section className="flex flex-col gap-3 px-6 pt-2">
        {characterHeader("sm", "curious")}
        <div className="daon-bubble">{STRAIN_FREETEXT_PROMPT}</div>
        <textarea
          value={reasonText}
          onChange={(e) => setReasonText(e.target.value)}
          maxLength={ANSWER_MAX_LENGTH}
          rows={3}
          placeholder="짧게 적어도 괜찮아요"
          className="field resize-none"
        />
        <button
          type="button"
          disabled={reasonText.trim() === ""}
          onClick={handleSubmitReasonText}
          className="btn-primary"
        >
          말해주기
        </button>
        <button
          type="button"
          onClick={() => setMoodPhase("reason")}
          className="text-sm text-warm-gray transition-colors hover:text-cocoa"
        >
          ← 이전
        </button>
        {devEvidenceLine}
      </section>
    );
  }

  // reason/자유입력 뒤: 짧은 학습 도움(공감 + 관찰 + 작은 제안 1). 표시 전용.
  if (moodPhase === "support") {
    return (
      <section className="flex flex-col items-center gap-4 px-6 pt-2">
        {characterHeader("md", "happy")}
        <div className="daon-bubble w-full max-w-[300px]">{supportLine}</div>
        <button
          type="button"
          disabled={isFinishing}
          onClick={handleFinish}
          className="btn-primary"
        >
          오늘 공부 마무리
        </button>
        {devEvidenceLine}
      </section>
    );
  }

  // mood check 에 답한 뒤: 짧은 수용 문구 + 마무리.
  if (moodPhase === "reply") {
    return (
      <section className="flex flex-col items-center gap-4 px-6 pt-2">
        {characterHeader("md", "happy")}
        <div className="daon-bubble w-full max-w-[300px]">{moodReplyLine}</div>
        <button
          type="button"
          disabled={isFinishing}
          onClick={handleFinish}
          className="btn-primary"
        >
          오늘 공부 마무리
        </button>
        {devEvidenceLine}
      </section>
    );
  }

  return (
    <section className="flex flex-col items-center gap-4 px-6 pt-2">
      {characterHeader("md", "happy")}
      <div className="daon-bubble w-full max-w-[300px]">{closingLine}</div>
      <button
        type="button"
        disabled={isFinishing}
        onClick={handleFinish}
        className="btn-primary"
      >
        오늘 공부 마무리
      </button>
      {devEvidenceLine}
    </section>
  );
}
