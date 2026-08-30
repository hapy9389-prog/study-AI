"use client";

import { useEffect, useState } from "react";
import { prefersReducedMotion } from "@/lib/motionPreference";

const DEFAULT_SPEED_MS = 35;

// text가 같은 값으로 유지되는 한(원시 문자열 비교) effect가 재실행되지 않으므로
// 애니메이션도 재시작되지 않는다 — 부모가 다른 이유로 리렌더돼도(예: coin 갱신)
// 같은 문장이면 그대로다. text가 실제로 바뀌는 경우(계획 변경, 새 idle 진입 등)에만
// 이전 interval을 정리하고 처음부터 새로 타이핑한다.
//
// setState를 effect 본문에서 바로 호출하지 않고 setTimeout(0)으로 한 틱 미룬다
// (react-hooks/set-state-in-effect 회피 — app/page.tsx의 characterResolution과
// 같은 패턴). 0ms 지연은 체감되지 않는다.
function useTypewriterText(text: string, speedMs: number) {
  const [displayed, setDisplayed] = useState("");

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | undefined;
    const kickoff = setTimeout(() => {
      if (prefersReducedMotion()) {
        setDisplayed(text);
        return;
      }
      setDisplayed("");
      let i = 0;
      intervalId = setInterval(() => {
        i += 1;
        setDisplayed(text.slice(0, i));
        if (i >= text.length) clearInterval(intervalId);
      }, speedMs);
    }, 0);
    return () => {
      clearTimeout(kickoff);
      if (intervalId !== undefined) clearInterval(intervalId);
    };
  }, [text, speedMs]);

  return { displayed, isTyping: displayed.length < text.length };
}

interface TypingTextProps {
  text: string;
  speedMs?: number;
  className?: string;
}

// 캐릭터 말풍선 문장을 한 글자씩 타이핑으로 보여준다. prefers-reduced-motion
// 사용자는 즉시 전체 문장을 보여주고 타이머 자체를 만들지 않는다.
export default function TypingText({
  text,
  speedMs = DEFAULT_SPEED_MS,
  className,
}: TypingTextProps) {
  const { displayed, isTyping } = useTypewriterText(text, speedMs);

  return (
    <p className={className}>
      {displayed}
      {isTyping && (
        <span
          aria-hidden
          className="motion-safe:animate-daon-cursor ml-0.5 inline-block h-[0.9em] w-px translate-y-[0.1em] bg-cocoa/60 align-middle"
        />
      )}
    </p>
  );
}
