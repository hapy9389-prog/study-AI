"use client";

import { useEffect, useState } from "react";
import FriendClassroomScene from "./FriendClassroomScene";
import FriendRoomScreen from "@/components/friends/FriendRoomScreen";
import ScreenShell from "@/components/layout/ScreenShell";
import { getFriendRoomProfile } from "@/lib/mockFriends";
import type { FriendStudyStatus } from "@/lib/types";

interface SocialCheckInScreenProps {
  friends: FriendStudyStatus[];
  onContinue: () => void;
}

// 앱 첫 진입 화면. 친구들이 "같은 교실에서 각자 공부하거나 쉬고 있는" 장면을
// 보여주고 공부 자극을 준 뒤 기존 홈으로 넘긴다. 친구 목록 관리 화면이 아니다.
const REFRESH_INTERVAL_MS = 30_000;

export default function SocialCheckInScreen({
  friends,
  onContinue,
}: SocialCheckInScreenProps) {
  // 최초 렌더는 deterministic 하게 null — hydration mismatch 방지. mount 후
  // useEffect 에서 실제 시각을 넣고 30초마다 갱신한다(리렌더 트리거 용도).
  const [now, setNow] = useState<number | null>(null);
  // 교실에서 친구 자리를 탭하면 그 친구 방으로. page.tsx 의 화면 라우팅
  // (showSocialCheckIn early-return)을 건드리지 않도록 여기서 직접 렌더한다 —
  // FriendRoomScreen 이 자체 ScreenShell 을 가지므로 셸 중첩은 없다.
  const [visitingId, setVisitingId] = useState<string | null>(null);

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

  if (visitingId) {
    const friend = friends.find((f) => f.id === visitingId);
    const roomProfile = getFriendRoomProfile(visitingId);
    if (friend && roomProfile) {
      return (
        <FriendRoomScreen
          friend={friend}
          roomProfile={roomProfile}
          onBack={() => setVisitingId(null)}
        />
      );
    }
  }

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
      {/* 장면을 억지로 늘리지 않고 위아래 작은 여백으로 제목~scene~CTA 균형만 잡는다. */}
      <div className="mt-4 mb-2">
        <FriendClassroomScene
          friends={friends}
          now={now}
          onVisit={setVisitingId}
        />
      </div>
    </ScreenShell>
  );
}
