"use client";

import { useEffect, useState } from "react";
import FriendCharacter from "./FriendCharacter";
import ScreenShell from "@/components/layout/ScreenShell";
import type { FriendStudyStatus } from "@/lib/types";

interface SocialCheckInScreenProps {
  friends: FriendStudyStatus[];
  onContinue: () => void;
}

// 앱 첫 진입 화면. 친구들의 "지금" 상태를 빠르게 보여주고 공부 자극을 준 뒤
// 기존 홈으로 넘긴다. 오래 머무는 화면이 아니므로 친구 3명 + CTA 가 모바일
// 한 화면 안에 들어오게 컴팩트하게 구성한다. 친구 목록 관리 화면이 아니다.
const REFRESH_INTERVAL_MS = 30_000;

// studying 친구의 경과 분. 인터벌은 리렌더 트리거일 뿐 누적 +1 이 아니다.
// (FriendStudySection 의 동일 로직 — 데모 안정성 위해 리팩터링하지 않고 소규모 중복.)
function elapsedMinutes(startedAt: number | undefined, now: number): number {
  if (typeof startedAt !== "number") return 0;
  return Math.max(0, Math.floor((now - startedAt) / 60_000));
}

// now 는 최초 렌더(SSR = hydration)에서 null 이다. 이때는 Date.now() 상대 계산을
// 하지 않아 서버/클라 출력이 항상 같다("미적분 공부 중"). useEffect 로 now 가
// 설정된 뒤에만 "· N분째" 를 붙인다.
function statusLine(friend: FriendStudyStatus, now: number | null): string {
  if (friend.status === "studying") {
    if (now === null) {
      return `${friend.subject} 공부 중`;
    }
    return `${friend.subject} 공부 중 · ${elapsedMinutes(friend.startedAt, now)}분째`;
  }
  if (friend.status === "completed") {
    return `오늘 ${friend.subject} ${friend.todayStudyMinutes}분 공부했어요`;
  }
  return "지금은 쉬는 중";
}

export default function SocialCheckInScreen({
  friends,
  onContinue,
}: SocialCheckInScreenProps) {
  // 최초 렌더는 deterministic 하게 null — hydration mismatch 방지. mount 후
  // useEffect 에서 실제 시각을 넣고 30초마다 갱신한다(리렌더 트리거 용도).
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    // 첫 값은 setTimeout(0) 으로 넣는다 — effect 본문에서 직접 setState 하면
    // react-hooks/set-state-in-effect 에 걸린다. mount 직후(paint 후) 실행돼
    // 곧바로 "· N분째" 로 바뀐다.
    const first = setTimeout(() => setNow(Date.now()), 0);
    const id = setInterval(() => setNow(Date.now()), REFRESH_INTERVAL_MS);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);

  const studyingCount = friends.filter((f) => f.status === "studying").length;
  const summary =
    studyingCount > 0
      ? `${studyingCount}명이 지금 공부하고 있어요`
      : "지금은 다들 잠깐 쉬고 있나 봐요";

  return (
    <ScreenShell
      eyebrow="친구들은 지금"
      title={summary}
      footer={
        <button type="button" onClick={onContinue} className="btn-primary">
          나도 공부할래
        </button>
      }
    >
      <ul className="flex flex-col gap-2">
        {friends.map((friend) => (
          <li
            key={friend.id}
            className="flex items-center gap-3 rounded-2xl bg-white px-3 py-2.5 shadow-sm"
          >
            <FriendCharacter avatarId={friend.avatarId} status={friend.status} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-cocoa">{friend.nickname}</p>
              <p className="truncate text-xs text-warm-gray">
                {statusLine(friend, now)}
              </p>
            </div>
            {friend.status === "studying" && (
              <span
                aria-hidden
                className="mr-1 h-1.5 w-1.5 shrink-0 rounded-full bg-mint"
              />
            )}
          </li>
        ))}
      </ul>
    </ScreenShell>
  );
}
