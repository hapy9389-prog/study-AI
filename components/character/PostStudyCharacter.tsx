import CharacterFace from "@/components/character/CharacterFace";
import type { CharacterId } from "@/lib/characters";
import type { CharacterAccessoryId, Expression } from "@/lib/types";

interface PostStudyCharacterProps {
  characterId: CharacterId;
  expression: Expression;
  /** 장착된 액세서리(있으면). CharacterFace 오버레이로 그대로 전달된다. */
  accessoryId?: CharacterAccessoryId | null;
  /** sm = 입력 단계(공간 확보), md = 감상/마무리 단계. */
  size?: "sm" | "md";
}

// 공부 후 화면(reaction / done) 상단의 작은 캐릭터. CharacterScene 의 소파·책상
// 없이 캐릭터 + 뒤의 조용한 빛(lamp-glow)만 둔다 — "작은 공부 친구가 곁에 있는"
// 존재감만 주고 결과/입력을 가리지 않는다. CharacterFace 는 아직 CSS placeholder라
// scale-* 래퍼로 축소한다(MyRoomCharacter 와 같은 기법). 실제 일러스트로 바뀌면
// 이 래퍼만 정리하면 된다.
// CharacterFace 는 128px(h-32 w-32) 고정이라 scale 만으로는 레이아웃 박스가 줄지
// 않는다 → 스케일된 크기의 고정 박스로 감싸 아래 요소(이름/말풍선)와의 간격을
// 예측 가능하게 만든다. 스케일된 얼굴 원은 박스 안에 들어와 보이는 잘림은 없다.
const SIZE: Record<"sm" | "md", { box: string; scale: string }> = {
  sm: { box: "h-16 w-16", scale: "scale-[0.5]" },
  md: { box: "h-24 w-24", scale: "scale-[0.72]" },
};

export default function PostStudyCharacter({
  characterId,
  expression,
  accessoryId,
  size = "md",
}: PostStudyCharacterProps) {
  const { box, scale } = SIZE[size];
  return (
    <div className={`relative flex ${box} items-center justify-center`}>
      <span className="lamp-glow left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 opacity-45" />
      <div className={`${scale} origin-center`}>
        <CharacterFace
          characterId={characterId}
          expression={expression}
          accessoryId={accessoryId}
        />
      </div>
    </div>
  );
}
