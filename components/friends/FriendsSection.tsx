"use client";

import { useEffect, useState } from "react";
import FriendCharacter from "@/components/social/FriendCharacter";
import type { FriendStudyStatus } from "@/lib/types";

// 홈 idle 의 단일 친구 섹션. 예전엔 "친구들의 공부"(FriendStudySection, dev 전용
// 상태 표시)와 "친구 공간"(FriendRoomsSection, 방 진입)이 따로 있어 같은 mock
// 친구 목록이 두 번 보였다. 이제 한 줄에 상태 + 방 진입을 함께 둔다.
//
// 목적은 "친구도 공부하고 있네 → 나도 해야겠다"라는 사회적 동기다. 경쟁
// (랭킹/등수/streak 비교)이나 상호작용(응원/DM)은 넣지 않는다. 홈의 가장 큰
// CTA 는 여전히 "공부 시작"이므로 카드를 크게 만들지 않고, 상태 문구가 "방 보러
// 가기" 버튼보다 먼저 읽히게 둔다.

interface FriendsSectionProps {
  friends: FriendStudyStatus[];
  onVisit: (friendId: string) => void;
}

// studying 친구는 startedAt 기준 경과 분을 매 렌더 계산한다(누적 +1 아님).
// 홈 콘텐츠는 BootSplash / Social Check-in 게이트 뒤 effect 후에만 마운트되므로
// Date.now() 사용이 hydration-safe 하다(예전 FriendStudySection 과 같은 트리).
const REFRESH_INTERVAL_MS = 30_000;

function elapsedMinutes(startedAt: number | undefined, now: number): number {
  if (typeof startedAt !== "number") return 0;
  return Math.max(0, Math.floor((now - startedAt) / 60_000));
}

function statusLine(friend: FriendStudyStatus, now: number): string {
  if (friend.status === "studying") {
    return `${friend.subject} · ${elapsedMinutes(friend.startedAt, now)}분째 공부 중`;
  }
  if (friend.status === "completed") {
    return `오늘 ${friend.subject} ${friend.todayStudyMinutes}분 공부`;
  }
  return "지금은 쉬는 중";
}

// 상태 문구 앞의 아주 작은 점. 공부 중 = peach-deep, 완료 = mint, 쉬는 중 = 없음.
function statusDot(status: FriendStudyStatus["status"]): string | null {
  if (status === "studying") return "bg-peach-deep";
  if (status === "completed") return "bg-mint";
  return null;
}

export default function FriendsSection({
  friends,
  onVisit,
}: FriendsSectionProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="mx-6 flex flex-col gap-2">
      <p className="text-xs font-medium text-warm-gray">친구들</p>

      <ul className="flex flex-col gap-2">
        {friends.map((friend) => {
          const dot = statusDot(friend.status);
          return (
            <li key={friend.id} className="list-row">
              <div className="scale-90">
                <FriendCharacter
                  avatarId={friend.avatarId}
                  status={friend.status}
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-cocoa">
                  {friend.nickname}
                </p>
                <p className="flex items-center gap-1.5 text-xs text-warm-gray">
                  {dot && (
                    <span
                      aria-hidden
                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`}
                    />
                  )}
                  <span className="truncate">{statusLine(friend, now)}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => onVisit(friend.id)}
                className="shrink-0 rounded-full border border-warm-gray/30 bg-white px-3 py-1.5 text-xs font-medium text-cocoa transition-colors hover:bg-cream-deep"
              >
                방 보러 가기
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
