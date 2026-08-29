// Mock 친구 데이터. 데이터는 데모용이지만 이걸 쓰는 Social Check-in / 친구 공간
// UI 는 production 에서도 렌더된다.
//
// 이 서비스에서 친구 기능의 목적은 경쟁이 아니라 "친구도 공부하고 있네 → 나도
// 해야겠다"라는 사회적 동기다. 여기서는 그 감각만 데모로 보여준다.
//
// 실제 로그인 / 친구 추가 / 서버 DB / Realtime / Supabase 는 연결하지 않는다.
// 나중에 실제 소스로 갈아끼울 때는 getFriendStudyStatuses() / getFriendRoomProfile()
// 만 서버 데이터로 교체하면 된다.

import type { FriendRoomProfile, FriendStudyStatus } from "./types";

// now 를 인자로 받아 startedAt 을 상대 시간으로 만든다. 모듈 로드 시점의
// Date.now() 를 리터럴로 박아두면 import 타이밍에 따라 값이 흔들릴 수 있다.
export function createMockFriendStatuses(now: number): FriendStudyStatus[] {
  return [
    {
      id: "friend-minsu",
      nickname: "민수",
      avatarId: "minsu",
      status: "studying",
      subject: "미적분",
      startedAt: now - 34 * 60 * 1000, // 약 34분째
      todayStudyMinutes: 34,
    },
    {
      id: "friend-seoyeon",
      nickname: "서연",
      avatarId: "seoyeon",
      status: "idle",
      todayStudyMinutes: 0,
    },
    {
      id: "friend-jihun",
      nickname: "지훈",
      avatarId: "jihun",
      status: "completed",
      subject: "네트워크",
      todayStudyMinutes: 48,
    },
    {
      id: "friend-yujin",
      nickname: "유진",
      avatarId: "yujin",
      status: "studying",
      subject: "알고리즘",
      startedAt: now - 12 * 60 * 1000, // 약 12분째
      todayStudyMinutes: 12,
    },
    {
      id: "friend-harin",
      nickname: "하린",
      avatarId: "harin",
      status: "idle",
      todayStudyMinutes: 0,
    },
    {
      id: "friend-doyun",
      nickname: "도윤",
      avatarId: "doyun",
      status: "studying",
      subject: "제어공학",
      startedAt: now - 51 * 60 * 1000, // 약 51분째
      todayStudyMinutes: 51,
    },
  ];
}

// 첫 호출 결과를 모듈 스코프에 한 번 캐시한다. FriendStudySection 이
// unmount → remount 되어도(예: idle → studying → done) studying 친구의
// startedAt 이 유지되어 "36분째"가 다시 "34분째"로 되돌아가지 않는다.
// 새 상태관리나 storage 를 도입하지 않고, 페이지가 살아있는 동안만 안정적이면
// 데모 목적에는 충분하다(전체 새로고침 시 초기화되는 건 자연스럽다).
let cachedStatuses: FriendStudyStatus[] | null = null;

// 친구 UI 가 Mock 배열에 직접 결합되지 않도록 하는 얇은 추상화.
// 지금: Mock 반환. 나중: Supabase/API 반환으로 이 함수만 교체.
export function getFriendStudyStatuses(now: number = Date.now()): FriendStudyStatus[] {
  if (cachedStatuses === null) {
    cachedStatuses = createMockFriendStatuses(now);
  }
  return cachedStatuses;
}

// 친구별 공개 방 프로필(Study Space). 친구마다 공부량/방 성장 차이가 보이도록
// 서로 다르게 둔다. 시간과 무관한 정적 값이라 캐시/now 가 필요 없다.
// todayStudyMinutes 는 FriendStudyStatus 에서 읽는다(민수 34 / 서연 0 / 지훈 48).
export const FRIEND_ROOM_PROFILES: FriendRoomProfile[] = [
  { friendId: "friend-minsu", roomStage: 3, totalStudyMinutes: 420 },
  { friendId: "friend-seoyeon", roomStage: 1, totalStudyMinutes: 45 },
  { friendId: "friend-jihun", roomStage: 2, totalStudyMinutes: 165 },
  { friendId: "friend-yujin", roomStage: 2, totalStudyMinutes: 210 },
  { friendId: "friend-harin", roomStage: 1, totalStudyMinutes: 60 },
  { friendId: "friend-doyun", roomStage: 3, totalStudyMinutes: 480 },
];

export function getFriendRoomProfile(
  friendId: string,
): FriendRoomProfile | undefined {
  return FRIEND_ROOM_PROFILES.find((profile) => profile.friendId === friendId);
}
