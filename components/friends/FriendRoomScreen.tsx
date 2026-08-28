"use client";

import { useEffect, useState } from "react";
import RoomScene from "@/components/room/RoomScene";
import FriendCharacter from "@/components/social/FriendCharacter";
import { formatTotalStudyTime } from "@/lib/mockData";
import type { FriendRoomProfile, FriendStudyStatus } from "@/lib/types";

interface FriendRoomScreenProps {
  friend: FriendStudyStatus;
  roomProfile: FriendRoomProfile;
  onBack: () => void;
}

// 친구의 방을 방문하는 전체 화면. "누구의 방인지 + 캐릭터 + 성장 정도 + 얼마나
// 공부했는지"만 본다. 좋아요/댓글/DM/응원/선물/같이공부/팔로우 같은 버튼은 없다.
// 데이터는 Mock — 실제로 친구 서버를 조회하지 않는다.

const REFRESH_INTERVAL_MS = 30_000;

// studying 친구의 경과 분. SocialCheckInScreen / FriendStudySection 과 동일 로직 —
// demo 안정성 위해 리팩터링하지 않고 소규모 중복(2줄).
function elapsedMinutes(startedAt: number | undefined, now: number): number {
  if (typeof startedAt !== "number") return 0;
  return Math.max(0, Math.floor((now - startedAt) / 60_000));
}

function statusLine(friend: FriendStudyStatus, now: number | null): string {
  if (friend.status === "studying") {
    // now 는 최초 렌더(SSR = hydration)에서 null — Date.now() 상대 계산을 하지
    // 않아 서버/클라 출력이 항상 같다. useEffect 로 now 가 채워진 뒤에만 "· N분째".
    if (now === null) {
      return `지금 ${friend.subject} 공부 중`;
    }
    return `지금 ${friend.subject} 공부 중 · ${elapsedMinutes(friend.startedAt, now)}분째`;
  }
  if (friend.status === "completed") {
    return `오늘 ${friend.subject} 공부를 마쳤어요`;
  }
  return "지금은 쉬는 중";
}

export default function FriendRoomScreen({
  friend,
  roomProfile,
  onBack,
}: FriendRoomScreenProps) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    // effect 본문에서 직접 setState 하면 react-hooks/set-state-in-effect 에 걸린다.
    // setTimeout(0) 으로 mount 직후 실제 시각을 넣고 30초마다 갱신(리렌더 트리거).
    const first = setTimeout(() => setNow(Date.now()), 0);
    const id = setInterval(() => setNow(Date.now()), REFRESH_INTERVAL_MS);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);

  return (
    <div className="flex min-h-screen w-full justify-center bg-warm-gray/10">
      <div className="flex min-h-screen w-full max-w-[430px] flex-col bg-cream px-6 py-8 shadow-xl">
        <button
          type="button"
          onClick={onBack}
          className="self-start rounded-full px-2 py-1 text-sm text-warm-gray transition-colors hover:text-cocoa"
        >
          ← 돌아가기
        </button>

        <h1 className="mt-2 text-xl font-semibold text-cocoa">
          {friend.nickname}의 방
        </h1>

        <RoomScene
          stage={roomProfile.roomStage}
          character={
            <div className="absolute bottom-3 left-1/2 origin-bottom -translate-x-1/2 scale-[1.4]">
              <FriendCharacter avatarId={friend.avatarId} status={friend.status} />
            </div>
          }
        />

        <p className="mt-4 text-sm text-cocoa">{statusLine(friend, now)}</p>

        <dl className="mt-3 flex flex-col gap-2">
          <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 shadow-sm">
            <dt className="text-xs text-warm-gray">오늘 공부</dt>
            <dd className="text-sm font-medium text-cocoa">
              {friend.todayStudyMinutes}분
            </dd>
          </div>
          <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 shadow-sm">
            <dt className="text-xs text-warm-gray">지금까지 공부</dt>
            <dd className="text-sm font-medium text-cocoa">
              {formatTotalStudyTime(roomProfile.totalStudyMinutes)}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
