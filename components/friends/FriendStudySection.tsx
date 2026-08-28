"use client";

import { useEffect, useState } from "react";
import { getFriendStudyStatuses } from "@/lib/mockFriends";
import type { FriendStudyStatus } from "@/lib/types";

// 홈 화면 idle / done 에서만 보이는 작은 영역. "친구도 공부하고 있네 → 나도
// 해볼까"라는 사회적 동기를 주는 게 목적이다. 경쟁(랭킹/등수/streak 비교)이나
// 상호작용(응원/DM/프로필)은 넣지 않는다 — 친구 상태는 보기만 하는 정보다.
//
// 개발자 모드 데모 전용. app/page.tsx 에서 process.env.NODE_ENV 로 렌더를 막는다.

// studying 친구는 startedAt 기준 경과 분을 매 렌더 계산한다(누적 +1 아님).
// StudyCard 타이머와 같은 원칙 — 인터벌은 리렌더 트리거 역할만 한다.
const REFRESH_INTERVAL_MS = 30_000;

function elapsedMinutes(startedAt: number | undefined, now: number): number {
  if (typeof startedAt !== "number") return 0;
  return Math.max(0, Math.floor((now - startedAt) / 60_000));
}

function FriendStudyRow({
  friend,
  now,
}: {
  friend: FriendStudyStatus;
  now: number;
}) {
  let detail: string;
  let badge: string | null;
  let tone: string;

  if (friend.status === "studying") {
    detail = `${friend.subject} · ${elapsedMinutes(friend.startedAt, now)}분째`;
    badge = "공부 중";
    tone = "bg-lavender/40";
  } else if (friend.status === "completed") {
    detail = `오늘 ${friend.subject} ${friend.todayStudyMinutes}분`;
    badge = "공부 완료";
    tone = "bg-mint/50";
  } else {
    detail = "지금은 쉬는 중";
    badge = null;
    tone = "bg-warm-gray/10";
  }

  return (
    <li
      className={`flex items-center justify-between gap-3 rounded-2xl px-3 py-2 ${tone}`}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium text-cocoa">{friend.nickname}</p>
        <p className="truncate text-xs text-warm-gray">{detail}</p>
      </div>
      {badge && (
        <span className="shrink-0 text-[11px] font-medium text-warm-gray">
          {badge}
        </span>
      )}
    </li>
  );
}

export default function FriendStudySection() {
  // Mock 배열은 마운트 시 한 번만 잡는다(getFriendStudyStatuses 가 모듈에서
  // 캐시하므로 remount 되어도 startedAt 이 유지된다).
  const [friends] = useState<FriendStudyStatus[]>(() => getFriendStudyStatuses());
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="mx-6 rounded-3xl bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-warm-gray">친구들의 공부</p>
        <span className="rounded-full bg-warm-gray/10 px-2 py-0.5 text-[10px] text-warm-gray">
          Demo
        </span>
      </div>
      <ul className="mt-3 flex flex-col gap-2">
        {friends.map((friend) => (
          <FriendStudyRow key={friend.id} friend={friend} now={now} />
        ))}
      </ul>
    </section>
  );
}
