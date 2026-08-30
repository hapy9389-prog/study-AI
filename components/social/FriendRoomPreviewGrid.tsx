import FriendCharacter from "./FriendCharacter";
import RoomDecoration from "@/components/room/RoomDecoration";
import type { FriendRoomProfile, FriendStudyStatus } from "@/lib/types";

// 첫 진입 Social Check-in 의 핵심 장면. 친구들을 "같은 교실의 책상"이 아니라
// 각자의 방 preview 로 보여준다 — 이 서비스의 세계관("내가 내 캐릭터/방을
// 꾸미듯, 친구들도 각자 자기 캐릭터와 방을 꾸미고 있다")에 맞춘 표현이다.
//
// presentation-only. 데이터/이동 로직은 상위(SocialCheckInScreen)가 가진다 —
// entries 는 이미 friend 와 roomProfile 이 1:1로 묶여서 내려온다.
// 항상 6명 전체를 2열×3행으로 보여준다. 빈 자리 placeholder는 없다.

interface FriendRoomPreviewGridProps {
  entries: { friend: FriendStudyStatus; roomProfile: FriendRoomProfile }[];
  /** SocialCheckInScreen 이 소유. SSR/hydration 에서는 null → 시계 줄 생략. */
  now: number | null;
  onVisit: (friendId: string) => void;
}

// 순수 duration 계산(Date 포매터 아님) — 24시간을 넘어도 그대로 27:04:02 처럼
// 이어진다. 호출 지점이 이 화면 하나뿐이라 lib/time.ts 로 뽑지 않는다.
function formatElapsedClock(startedAt: number | undefined, now: number): string {
  if (typeof startedAt !== "number") return "00:00:00";
  const totalSeconds = Math.max(0, Math.floor((now - startedAt) / 1000));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(totalSeconds / 3600))}:${pad(
    Math.floor((totalSeconds % 3600) / 60),
  )}:${pad(totalSeconds % 60)}`;
}

// 방 preview 타일 하단의 상태 텍스트. "오늘 총 공부시간"(todayStudyMinutes)과
// "이번 세션 경과시간"(formatElapsedClock)은 다른 값이라 섞어 쓰지 않는다.
function FriendStatusText({
  friend,
  now,
}: {
  friend: FriendStudyStatus;
  now: number | null;
}) {
  if (friend.status === "studying") {
    return (
      <>
        <p className="truncate text-[10px] leading-tight text-warm-gray">
          {friend.subject} 공부 중
        </p>
        {now !== null && (
          <p className="text-[10px] leading-tight text-cocoa tabular-nums">
            {formatElapsedClock(friend.startedAt, now)}
          </p>
        )}
      </>
    );
  }
  if (friend.status === "completed") {
    return (
      <>
        <p className="truncate text-[10px] leading-tight text-warm-gray">
          오늘 {friend.subject} 공부 완료
        </p>
        <p className="text-[10px] leading-tight text-warm-gray">
          {friend.todayStudyMinutes}분
        </p>
      </>
    );
  }
  return (
    <p className="text-[10px] leading-tight text-warm-gray">지금은 쉬는 중</p>
  );
}

// 친구 한 명의 방 preview. 전체가 하나의 탭 타깃 — 누르면 그 친구의
// FriendRoomScreen(같은 roomProfile 로 크게 보기)으로 이동한다.
function FriendRoomTile({
  friend,
  roomProfile,
  now,
  onVisit,
}: {
  friend: FriendStudyStatus;
  roomProfile: FriendRoomProfile;
  now: number | null;
  onVisit: (friendId: string) => void;
}) {
  const { roomStage, decorations } = roomProfile;

  return (
    <button
      type="button"
      onClick={() => onVisit(friend.id)}
      aria-label={`${friend.nickname} 방 보러 가기`}
      className="flex flex-col items-center gap-1 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-peach-deep/60"
    >
      <div
        className={`relative h-28 w-full overflow-hidden rounded-lg border border-warm-line transition-colors hover:border-peach-deep/50 ${
          roomStage >= 3 ? "bg-peach/20" : "bg-cream"
        }`}
      >
        {/* Stage 3: 은은한 warm glow */}
        {roomStage >= 3 && (
          <span
            aria-hidden
            className="absolute -right-3 -top-3 h-10 w-10 rounded-full bg-peach-deep/25 blur-xl"
          />
        )}
        {/* 바닥 — 모든 stage 공통 */}
        <span aria-hidden className="absolute inset-x-0 bottom-0 h-3 bg-cocoa/10" />
        {/* Stage 2+: 러그 */}
        {roomStage >= 2 && (
          <span
            aria-hidden
            className="absolute bottom-1 left-1/2 h-2 w-12 -translate-x-1/2 rounded-full bg-peach/35"
          />
        )}

        {/*
         * RoomScene(components/room/RoomScene.tsx)의 stage 가구를 이 작은 박스
         * 크기에 맞게 그대로 축소 재현한 것이다 — 책상(모든 stage) + 스탠드(2+,
         * 왼쪽 열에 쌓임) / 식물(2+) + 책장(3+, 오른쪽 열에 쌓임). 위치·비율을
         * 픽셀 단위로 복사한 건 아니지만 "같은 stage의 같은 방"으로 읽히도록
         * 시각 언어(무엇이 몇 단계에 추가되는가)는 그대로 따른다.
         * RoomScene의 stage 구성이 바뀌면(가구 종류/단계 추가 등) 여기도 함께
         * 검토해야 한다 — 두 곳이 각자 하드코딩된 별개 마크업이라 자동으로
         * 동기화되지 않는다.
         */}
        {/* 책상(모든 stage) — 바닥 왼쪽 끝 */}
        <span
          aria-hidden
          className="absolute bottom-0 left-1 h-1 w-5 rounded-[1px] bg-cocoa/25"
        />
        <span
          aria-hidden
          className="absolute bottom-0 left-1.5 h-1.5 w-px bg-cocoa/20"
        />
        {/* Stage 2+: 스탠드 — 책상 위, 같은 왼쪽 열 */}
        {roomStage >= 2 && (
          <>
            <span
              aria-hidden
              className="absolute bottom-1 left-2 h-3 w-px bg-warm-gray/50"
            />
            <span
              aria-hidden
              className="absolute bottom-3.5 left-1.5 h-1 w-1.5 rounded-full bg-peach-deep/70"
            />
          </>
        )}
        {/* Stage 2+: 식물 — 오른쪽 열 */}
        {roomStage >= 2 && (
          <span
            aria-hidden
            className="absolute bottom-1 right-1.5 h-2 w-2 rounded-full bg-mint/70"
          />
        )}
        {/* Stage 3+: 책장 실루엣 — 식물 위, 같은 오른쪽 열 */}
        {roomStage >= 3 && (
          <span
            aria-hidden
            className="absolute bottom-2.5 right-1 h-4 w-2 rounded-[1px] bg-cocoa/15"
          />
        )}

        {/* 이 친구가 고른 방 소품 전체 — 전체보기(FriendRoomScreen)와 동일하게
            roomProfile.decorations 전부를 보여준다(대표 1개만 보여주던 이전 방식 폐기) */}
        {decorations.map((id) => (
          <RoomDecoration key={id} id={id} size="sm" />
        ))}
        {/* 캐릭터 — 스케일 축소 없이, 시선의 중심 */}
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2">
          <FriendCharacter avatarId={friend.avatarId} status={friend.status} />
        </div>
      </div>

      <p className="w-full truncate text-center text-[11px] font-medium leading-tight text-cocoa">
        {friend.nickname}
      </p>
      <FriendStatusText friend={friend} now={now} />
    </button>
  );
}

export default function FriendRoomPreviewGrid({
  entries,
  now,
  onVisit,
}: FriendRoomPreviewGridProps) {
  return (
    <div className="grid grid-cols-2 gap-x-2 gap-y-3">
      {entries.map(({ friend, roomProfile }) => (
        <FriendRoomTile
          key={friend.id}
          friend={friend}
          roomProfile={roomProfile}
          now={now}
          onVisit={onVisit}
        />
      ))}
    </div>
  );
}
