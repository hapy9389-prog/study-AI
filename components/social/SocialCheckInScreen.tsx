"use client";

import { useEffect, useState } from "react";
import FriendCharacter from "./FriendCharacter";
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

function statusLine(friend: FriendStudyStatus, now: number): string {
  if (friend.status === "studying") {
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
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  const studyingCount = friends.filter((f) => f.status === "studying").length;
  const summary =
    studyingCount > 0
      ? `${studyingCount}명이 지금 공부하고 있어요`
      : "지금은 다들 잠깐 쉬고 있나 봐요";

  return (
    <div className="flex min-h-screen w-full justify-center bg-warm-gray/10">
      <div className="flex min-h-screen w-full max-w-[430px] flex-col bg-cream px-6 py-8 shadow-xl">
        <div className="flex flex-1 flex-col">
          <p className="text-xs font-medium text-warm-gray">친구들은 지금</p>
          <h1 className="mt-1 text-xl font-semibold text-cocoa">{summary}</h1>

          <ul className="mt-6 flex flex-col gap-2">
            {friends.map((friend) => (
              <li
                key={friend.id}
                className="flex items-center gap-3 rounded-2xl bg-white px-3 py-2 shadow-sm"
              >
                <FriendCharacter
                  avatarId={friend.avatarId}
                  status={friend.status}
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-cocoa">
                    {friend.nickname}
                  </p>
                  <p className="truncate text-xs text-warm-gray">
                    {statusLine(friend, now)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <button
          type="button"
          onClick={onContinue}
          className="mt-6 rounded-full bg-peach px-4 py-3 text-sm font-medium text-cocoa transition-colors hover:bg-peach-deep"
        >
          나도 공부할래
        </button>
      </div>
    </div>
  );
}
