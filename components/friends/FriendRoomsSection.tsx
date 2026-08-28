import FriendCharacter from "@/components/social/FriendCharacter";
import type { FriendStudyStatus } from "@/lib/types";

interface FriendRoomsSectionProps {
  friends: FriendStudyStatus[];
  onVisit: (friendId: string) => void;
}

// 홈 idle 의 secondary 섹션 — 친구의 공개 Study Space 로 들어가는 입구.
// 홈의 가장 큰 CTA 는 여전히 "공부 시작"이므로 카드를 크게 만들지 않는다.
// 상태 문구는 정적이다(Date.now() 미사용) — hydration mismatch 방지. 경과 "N분째"
// 같은 실시간 표현은 친구 방 안(FriendRoomScreen)에서만 보여준다.
function statusLine(friend: FriendStudyStatus): string {
  if (friend.status === "studying") {
    return `${friend.subject} 공부 중`;
  }
  if (friend.status === "completed") {
    return `오늘 ${friend.subject} ${friend.todayStudyMinutes}분 공부`;
  }
  return "쉬는 중";
}

export default function FriendRoomsSection({
  friends,
  onVisit,
}: FriendRoomsSectionProps) {
  return (
    <section className="mx-6 rounded-3xl bg-white p-5 shadow-sm">
      <p className="text-xs font-medium text-warm-gray">친구 공간</p>

      <ul className="mt-3 flex flex-col gap-2">
        {friends.map((friend) => (
          <li
            key={friend.id}
            className="flex items-center gap-3 rounded-2xl bg-warm-gray/5 px-3 py-2"
          >
            <div className="scale-90">
              <FriendCharacter
                avatarId={friend.avatarId}
                status={friend.status}
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-cocoa">{friend.nickname}</p>
              <p className="truncate text-xs text-warm-gray">
                {statusLine(friend)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onVisit(friend.id)}
              className="shrink-0 rounded-full bg-lavender px-3 py-1.5 text-xs font-medium text-cocoa transition-colors hover:bg-lavender-deep hover:text-white"
            >
              방 보러 가기
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
