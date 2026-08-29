import FriendCharacter from "./FriendCharacter";
import type { FriendStudyStatus } from "@/lib/types";

// Social Check-in 전용 장면. 친구들을 세로 리스트가 아니라 "같은 교실에서 각자
// 자기 자리에 앉아 공부하거나 쉬고 있는" 하나의 장면으로 보여준다.
//
// presentation-only. 데이터/이동 로직은 상위(SocialCheckInScreen)가 가진다.
// 주인공은 친구 6명이다. 친구 grid 를 장면 맨 위에 두고, 그 바로 아래로 클릭
// 불가능한 빈 책상 한 줄을 이어붙여 "친구 자리 뒤로 빈 교실이 이어진다"는
// 공간감만 만든다. 칠판·창문·화분·시계 같은 큰 장식/소품은 넣지 않는다 —
// 벽·바닥 구분만 아주 약하게.
//
// 실제 일러스트가 아니라 FriendCharacter 와 같은 "절대배치 span" placeholder.

interface FriendClassroomSceneProps {
  friends: FriendStudyStatus[];
  /** SocialCheckInScreen 이 소유. SSR/hydration 에서는 null → 상대시간 계산 안 함. */
  now: number | null;
  onVisit: (friendId: string) => void;
}

// SocialCheckInScreen / FriendRoomScreen 과 동일 로직(2줄) — demo 안정성 위해
// 리팩터링하지 않고 로컬 복제한다.
function elapsedMinutes(startedAt: number | undefined, now: number): number {
  if (typeof startedAt !== "number") return 0;
  return Math.max(0, Math.floor((now - startedAt) / 60_000));
}

// 책상 아래 아주 작은 보조 텍스트. 박스로 감싸지 않는다.
function deskLabel(friend: FriendStudyStatus, now: number | null): string {
  if (friend.status === "studying") {
    if (now === null) return `${friend.subject} 공부 중`;
    return `${friend.subject} · ${elapsedMinutes(friend.startedAt, now)}분째`;
  }
  if (friend.status === "completed") {
    return `${friend.subject} ${friend.todayStudyMinutes}분 완료`;
  }
  return "쉬는 중";
}

// 한 친구의 자리. 6명 모두 같은 책상 + 의자를 가진다 — status 는 "그 자리에서
// 무엇을 하는가"로만 구분한다. 자리 영역 전체가 하나의 탭 타깃.
function FriendDesk({
  friend,
  now,
  onVisit,
}: {
  friend: FriendStudyStatus;
  now: number | null;
  onVisit: (friendId: string) => void;
}) {
  const isIdle = friend.status === "idle";
  const isCompleted = friend.status === "completed";

  return (
    <button
      type="button"
      onClick={() => onVisit(friend.id)}
      aria-label={`${friend.nickname} 방 보러 가기`}
      className="group flex flex-col items-center rounded-xl px-1 py-1.5 transition-colors hover:bg-white/50 focus-visible:bg-white/50 focus-visible:outline-none"
    >
      <div className="relative flex h-20 w-full items-end justify-center">
        {/* 의자 등받이 */}
        <span
          aria-hidden
          className="absolute bottom-3 left-1/2 h-8 w-11 -translate-x-1/2 rounded-t-lg bg-warm-gray/15"
        />

        {/* 장면 속 친구 — idle 은 의자에 살짝 기대 앉은 각도 */}
        <div
          className={`absolute bottom-[13px] left-1/2 z-10 -translate-x-1/2 origin-bottom scale-[0.82] ${
            isIdle ? "-rotate-6" : ""
          }`}
        >
          <FriendCharacter avatarId={friend.avatarId} status={friend.status} />
        </div>

        {/* 책상 상판 모서리 + 앞판 — 캐릭터 하체를 가려 "앉아 있는" 느낌 */}
        <span
          aria-hidden
          className="absolute bottom-3 left-1/2 z-20 h-1 w-[74px] -translate-x-1/2 rounded-full bg-cocoa/35"
        />
        <span
          aria-hidden
          className="absolute bottom-0 left-1/2 z-20 h-3 w-16 -translate-x-1/2 rounded-sm bg-cocoa/15"
        />

        {/* idle: 책상 위 닫힌 책 + 음료 (필기 도구 없음) */}
        {isIdle && (
          <>
            <span
              aria-hidden
              className="absolute bottom-[15px] left-[26%] z-30 h-1.5 w-4 rounded-[1px] bg-warm-gray/45"
            />
            <span
              aria-hidden
              className="absolute bottom-[15px] right-[26%] z-30 h-2.5 w-2 rounded-b-sm rounded-t-[1px] bg-peach-deep/60"
            />
          </>
        )}

        {/* completed: 정리된 자리 표시 — 덮인 책 한 권 더 */}
        {isCompleted && (
          <span
            aria-hidden
            className="absolute bottom-[15px] left-1/2 z-30 h-1.5 w-5 -translate-x-1/2 rounded-[1px] bg-peach-deep/35"
          />
        )}
      </div>

      <p className="mt-1 text-center text-[11px] font-medium leading-tight text-cocoa">
        {friend.nickname}
      </p>
      <p className="text-center text-[10px] leading-tight text-warm-gray">
        {deskLabel(friend, now)}
      </p>
    </button>
  );
}

// 친구 자리 뒤쪽으로 이어지는 빈 자리. 데이터가 아니라 decoration — 클릭/포커스
// 불가, 이름·상태 없음, 캐릭터 없음. FriendDesk 의 의자+책상 실루엣만 재사용하고
// 대비·크기를 낮춰 친구보다 약하게 읽히게 한다.
function EmptyDesk() {
  return (
    <div aria-hidden className="flex justify-center">
      <div className="relative h-11 w-full max-w-[74px] scale-[0.86]">
        {/* 의자 등받이 */}
        <span className="absolute bottom-3 left-1/2 h-5 w-9 -translate-x-1/2 rounded-t-lg bg-warm-gray/15" />
        {/* 책상 상판 모서리 */}
        <span className="absolute bottom-3 left-1/2 h-1 w-[70px] -translate-x-1/2 rounded-full bg-cocoa/25" />
        {/* 책상 앞판 */}
        <span className="absolute bottom-0 left-1/2 h-3 w-16 -translate-x-1/2 rounded-sm bg-cocoa/10" />
      </div>
    </div>
  );
}

export default function FriendClassroomScene({
  friends,
  now,
  onVisit,
}: FriendClassroomSceneProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-warm-line bg-cream px-3 pb-3 pt-4">
      {/* 벽 / 바닥 구분 — 장면의 마지막 시각 요소 */}
      <span
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-6 bg-cocoa/[0.04]"
      />

      {/* 친구 6명 — 장면의 메인. 가장 먼저·크게 읽힌다. */}
      <div className="relative grid grid-cols-2 gap-x-2 gap-y-3 min-[360px]:grid-cols-3">
        {friends.map((friend) => (
          <FriendDesk
            key={friend.id}
            friend={friend}
            now={now}
            onVisit={onVisit}
          />
        ))}
      </div>

      {/* 뒤로 이어지는 빈 자리 한 줄 — 친구 grid 와 열을 맞춘다.
          ≥360px: 3개 한 줄 / 320px: 2열이라 2 + 1 로 접힘. */}
      <div className="relative mt-4 grid grid-cols-2 gap-x-2 gap-y-2 opacity-40 min-[360px]:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <EmptyDesk key={i} />
        ))}
      </div>
    </div>
  );
}
