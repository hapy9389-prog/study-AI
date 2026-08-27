import { todayStudy } from "@/lib/mockData";

interface StudyCardProps {
  phase: "idle" | "studying";
  onStartStudy: () => void;
  onCompleteStudy: () => void;
}

// [공부 시작] is the single most prominent CTA in the whole app — studying
// itself is the core action, not talking to the character. [공부 완료]
// transitions straight into the reaction phase, no extra confirmation step.
export default function StudyCard({ phase, onStartStudy, onCompleteStudy }: StudyCardProps) {
  return (
    <section className="mx-6 rounded-3xl bg-white p-5 shadow-sm">
      <p className="text-xs font-medium text-warm-gray">오늘의 공부</p>
      <h2 className="mt-1 text-lg font-bold text-cocoa">{todayStudy.subject}</h2>

      {phase === "idle" && (
        <button
          type="button"
          onClick={onStartStudy}
          className="mt-4 w-full rounded-2xl bg-lavender-deep py-4 text-lg font-bold text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          공부 시작
        </button>
      )}

      {phase === "studying" && (
        <div className="mt-4 flex flex-col items-center gap-3">
          <p className="flex items-center gap-2 text-sm text-warm-gray">
            <span className="h-2 w-2 animate-pulse rounded-full bg-peach-deep" />
            공부 중...
          </p>
          <button
            type="button"
            onClick={onCompleteStudy}
            className="w-full rounded-2xl bg-peach py-3 text-base font-semibold text-cocoa transition-colors hover:bg-peach-deep"
          >
            공부 완료
          </button>
        </div>
      )}
    </section>
  );
}
