"use client";

import { useState } from "react";
import CharacterFace from "@/components/character/CharacterFace";
import ScreenShell from "@/components/layout/ScreenShell";
import { CHARACTERS, type CharacterId } from "@/lib/characters";

interface CharacterSelectScreenProps {
  /** "initial" = 첫 진입 온보딩(뒤로가기 없음, 선택 필수). "change" = 나중에 바꾸기. */
  mode?: "initial" | "change";
  /** change 모드에서 현재 동반자 표시 + 기본 선택. */
  currentCharacterId?: CharacterId;
  onSelect: (id: CharacterId) => void;
  /** change 모드 뒤로가기. */
  onCancel?: () => void;
}

// 첫 진입에서, 그리고 "내 공부 친구" 화면에서 다시 열린다. 한 화면, 카드 3개.
export default function CharacterSelectScreen({
  mode = "initial",
  currentCharacterId,
  onSelect,
  onCancel,
}: CharacterSelectScreenProps) {
  const [picked, setPicked] = useState<CharacterId | null>(
    mode === "change" ? (currentCharacterId ?? null) : null,
  );

  const isChange = mode === "change";
  const ctaDisabled =
    picked === null || (isChange && picked === currentCharacterId);

  return (
    <ScreenShell
      onBack={isChange ? onCancel : undefined}
      eyebrow={isChange ? undefined : "함께 공부할 친구"}
      title={isChange ? "다른 친구 선택하기" : "누구랑 같이 공부해볼까?"}
      subtitle={
        isChange
          ? "공부 기록·코인·방은 그대로예요. 함께 반응해줄 친구만 바뀌어요."
          : "공부를 함께 하고, 끝나면 짧게 반응해주는 작은 동반자예요. 나중에 바꿀 수 있어요."
      }
      footer={
        <button
          type="button"
          disabled={ctaDisabled}
          onClick={() => picked && onSelect(picked)}
          className="btn-primary"
        >
          {isChange ? "이 친구로 바꾸기" : "이 친구랑 시작하기"}
        </button>
      }
    >
      <ul className="flex flex-col gap-3">
        {CHARACTERS.map((character) => {
          const isPicked = picked === character.id;
          const isCurrent = isChange && character.id === currentCharacterId;
          return (
            <li key={character.id}>
              <button
                type="button"
                onClick={() => setPicked(character.id)}
                aria-pressed={isPicked}
                className={`flex w-full items-center gap-4 rounded-2xl bg-white p-4 text-left transition-colors ${
                  isPicked
                    ? "ring-2 ring-peach-deep"
                    : "ring-1 ring-warm-line hover:bg-cream-deep"
                }`}
              >
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden">
                  <div className="origin-center scale-[0.5]">
                    <CharacterFace
                      expression="happy"
                      characterId={character.id}
                    />
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-cocoa">
                    {character.name}
                    {isCurrent && (
                      <span className="ml-2 text-xs font-normal text-warm-gray">
                        지금 함께
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-warm-gray">
                    {character.tagline}
                  </p>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </ScreenShell>
  );
}
