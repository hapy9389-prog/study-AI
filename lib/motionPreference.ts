// 코드베이스의 reduced-motion 처리는 지금까지 전부 CSS(@media (prefers-reduced-motion:
// reduce), motion-safe: 변형)만으로 해결돼 왔다. 캐릭터 말풍선 타이핑 애니메이션은
// 글자 단위로 state가 실제로 바뀌는 동적 텍스트라 CSS만으로는 막을 수 없어서, 이
// 파일이 유일하게 JS에서 직접 확인하는 예외다(components/character/TypingText.tsx).

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}
