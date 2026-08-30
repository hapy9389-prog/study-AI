import type { RoomDecorationId } from "@/lib/types";

interface RoomDecorationProps {
  id: RoomDecorationId;
  /** "sm" = 작은 room preview 타일(~96px 프레임). "md" = RoomScene 전체 화면(176px 프레임). */
  size: "sm" | "md";
}

// RoomScene 이 stage 에 따라 자동으로 그리는 책상/의자/러그/스탠드/식물/책장과는
// 겹치지 않는, "이 방 주인이 직접 골라 둔" 작은 소품 4종. 아직 실제 일러스트가
// 아니라 FriendCharacter/RoomScene 과 같은 "절대배치 span" CSS placeholder다.
// "누구의 방이냐"와 무관한 일반 컴포넌트라 room preview 타일과 RoomScene 양쪽에서
// 그대로 재사용한다(FriendRoomProfile 전용이 아니라 나중에 내 방 꾸미기에도 재사용).
export default function RoomDecoration({ id, size }: RoomDecorationProps) {
  const isSmall = size === "sm";

  switch (id) {
    case "cushion":
      return (
        <span
          aria-hidden
          className={
            isSmall
              ? "absolute bottom-1.5 left-2.5 h-2 w-4 rounded-full bg-peach-deep/40"
              : "absolute bottom-2 left-10 h-3 w-8 rounded-full bg-peach-deep/40"
          }
        />
      );
    case "poster":
      return (
        <span
          aria-hidden
          className={
            isSmall
              ? "absolute right-1.5 top-1 h-3 w-2.5 rounded-[1px] border border-lavender-deep/40 bg-lavender-deep/10"
              : "absolute right-16 top-4 h-8 w-6 rounded-sm border border-lavender-deep/30 bg-lavender-deep/10"
          }
        />
      );
    case "fairy-lights":
      return (
        <span
          aria-hidden
          className={
            isSmall
              ? "absolute inset-x-3 top-1.5 flex justify-between"
              : "absolute inset-x-8 top-2 flex justify-between"
          }
        >
          {(isSmall ? [0, 1, 2] : [0, 1, 2, 3]).map((i) => (
            <span
              key={i}
              className={
                isSmall
                  ? "h-1 w-1 rounded-full bg-peach-deep/70"
                  : "h-1 w-1 rounded-full bg-peach-deep/50"
              }
            />
          ))}
        </span>
      );
    case "photo-frame":
      return (
        <span
          aria-hidden
          className={
            isSmall
              ? "absolute left-1.5 top-1 h-2.5 w-2 rounded-[1px] border border-cocoa/30 bg-cream"
              : "absolute left-16 top-6 h-6 w-5 rounded-sm border border-cocoa/25 bg-cream"
          }
        />
      );
    default:
      return null;
  }
}
