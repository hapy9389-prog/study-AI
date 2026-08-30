"use client";

import { useEffect, useState } from "react";
import FriendRoomPreviewGrid from "./FriendRoomPreviewGrid";
import FriendRoomScreen from "@/components/friends/FriendRoomScreen";
import ScreenShell from "@/components/layout/ScreenShell";
import { getFriendRoomProfile } from "@/lib/mockFriends";
import type { FriendStudyStatus } from "@/lib/types";

interface SocialCheckInScreenProps {
  friends: FriendStudyStatus[];
  onContinue: () => void;
}

// 앱 첫 진입 화면. 친구들이 각자의 방에서 공부하거나 쉬고 있는 모습을 한눈에
// 보여주는 화면. 공부 자극을 준 뒤 기존 홈으로 넘긴다. 친구 목록 관리 화면이 아니다.
// studying 친구의 경과시간을 HH:MM:SS 로 보여주므로 1초마다 갱신한다(이 화면만).
const REFRESH_INTERVAL_MS = 1_000;

export default function SocialCheckInScreen({
  friends,
  onContinue,
}: SocialCheckInScreenProps) {
  // 최초 렌더는 deterministic 하게 null — hydration mismatch 방지. mount 후
  // useEffect 에서 실제 시각을 넣고 30초마다 갱신한다(리렌더 트리거 용도).
  const [now, setNow] = useState<number | null>(null);
  // 방 preview 타일을 탭하면 그 친구 방으로. page.tsx 의 화면 라우팅
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

  // 각 친구의 공개 방 프로필을 미리 묶어서 내려준다 — 아래 컴포넌트는 순수
  // 프레젠테이션만 담당(데이터 조회 없음). mock 6명은 항상 매칭되지만, 타입
  // 안정성을 위해 못 찾을 때의 fallback도 여기(데이터를 소유한 곳)에 둔다.
  const roomEntries = friends.map((friend) => ({
    friend,
    roomProfile: getFriendRoomProfile(friend.id) ?? {
      friendId: friend.id,
      roomStage: 1 as const,
      totalStudyMinutes: 0,
      decorations: [],
    },
  }));

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
        <FriendRoomPreviewGrid
          entries={roomEntries}
          now={now}
          onVisit={setVisitingId}
        />
      </div>
    </ScreenShell>
  );
}
