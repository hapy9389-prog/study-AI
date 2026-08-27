import Anthropic from "@anthropic-ai/sdk";
import { reactionData, toMinutes } from "@/lib/mockData";

// 다온의 공부 후 반응은 1~2문장으로 매우 짧다. 빠르고 비용 효율적인 소형 모델로
// 충분하다. 모델 교체는 이 한 줄만 바꾸면 된다.
const REACTION_MODEL = "claude-haiku-4-5";

// 응답이 길어지지 않도록 넉넉하지만 작은 값. 한국어 1~2문장 기준.
const MAX_TOKENS = 256;

// API 호출 타임아웃(ms). 초과 시 SDK가 throw → 다른 오류와 동일하게 fallback.
const REQUEST_TIMEOUT_MS = 9000;

const DAON_SYSTEM_PROMPT = `너는 8살의 귀여운 AI 공부 동반자 "다온"이다.
사용자가 공부를 마친 뒤, 아래에 주어지는 현재 공부 세션 정보를 보고 짧고 따뜻하게 반응한다.

규칙:
- 한국어로 답한다.
- 1~2문장만 사용한다.
- 사용자의 공부 주제와 실제 공부 시간을 자연스럽게 언급할 수 있다.
- 사용자의 감정을 존중한다.
- 목표 시간을 못 채웠어도 비난하거나 아쉬워하지 않는다.
- 과장된 칭찬을 반복하지 않는다.
- 사용자를 평가하거나 점수 매기지 않는다.
- 공부를 더 오래 하라고 압박하지 않는다.
- 지금 주어진 세션 정보 외의 과거 기억을 지어내지 않는다. ("요즘", "지난주", "또", "매번" 같은 표현 금지)
- 선생님처럼 학습 내용을 가르치지 않는다.
- 질문을 연속해서 하지 않고, 긴 대화를 유도하지 않는다.
- 실제 공부 시간이 1분 미만으로 매우 짧을 때는 "N분 동안 열심히 했네"처럼 시간을 과장하지 말고, "잠깐 같이 공부했네"처럼 자연스럽고 담백하게 반응한다. 짧게 했다고 아쉬워하지 않는다.

출력은 다온이 실제로 말할 문장만 반환한다. 따옴표나 설명을 붙이지 않는다.`;

// mockData의 감상 선택지를 단일 출처로 삼아 id→한글 라벨을 만든다.
const FEELING_LABELS: Record<string, string> = Object.fromEntries(
  reactionData.choices.map((choice) => [choice.id, choice.label]),
);

// elapsedSeconds를 사람이 읽기 좋은 형태로. 60초 미만은 "N초", 그 이상은 "N분".
function readableDuration(elapsedSeconds: number): string {
  if (elapsedSeconds < 60) return `${elapsedSeconds}초`;
  return `${toMinutes(elapsedSeconds)}분`;
}

function badRequest(message: string): Response {
  return Response.json({ error: message }, { status: 400 });
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("invalid_json");
  }

  if (typeof body !== "object" || body === null) {
    return badRequest("invalid_body");
  }

  const { subject, targetMinutes, elapsedSeconds, feelingId } = body as Record<
    string,
    unknown
  >;

  if (typeof subject !== "string" || subject.trim() === "") {
    return badRequest("invalid_subject");
  }
  if (
    typeof targetMinutes !== "number" ||
    !Number.isFinite(targetMinutes) ||
    targetMinutes < 1
  ) {
    return badRequest("invalid_targetMinutes");
  }
  if (
    typeof elapsedSeconds !== "number" ||
    !Number.isFinite(elapsedSeconds) ||
    elapsedSeconds < 0
  ) {
    return badRequest("invalid_elapsedSeconds");
  }
  if (typeof feelingId !== "string" || !(feelingId in FEELING_LABELS)) {
    return badRequest("invalid_feelingId");
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("[/api/reaction] ANTHROPIC_API_KEY 가 설정되지 않음 — fallback 사용");
    return Response.json({ error: "missing_api_key" }, { status: 503 });
  }

  const sessionSummary = [
    `공부 주제: ${subject.trim()}`,
    `목표 공부 시간: ${targetMinutes}분`,
    `실제 공부 시간: ${readableDuration(elapsedSeconds)}`,
    `사용자의 감상: ${FEELING_LABELS[feelingId]}`,
  ].join("\n");

  try {
    // maxRetries: 0 — 타임아웃이 재시도로 곱해져 응답이 늦어지지 않도록.
    const client = new Anthropic({ apiKey, maxRetries: 0 });
    const message = await client.messages.create(
      {
        model: REACTION_MODEL,
        max_tokens: MAX_TOKENS,
        system: DAON_SYSTEM_PROMPT,
        messages: [{ role: "user", content: sessionSummary }],
      },
      { timeout: REQUEST_TIMEOUT_MS },
    );

    const reaction = message.content
      .map((block) => (block.type === "text" ? block.text : ""))
      .join("")
      .trim();

    if (!reaction) {
      console.error("[/api/reaction] Claude 응답에 텍스트가 없음");
      return Response.json({ error: "empty_reaction" }, { status: 502 });
    }

    return Response.json({ reaction });
  } catch (error) {
    // 타임아웃 포함 모든 오류를 동일하게 처리한다. 클라이언트는 Mock fallback 사용.
    console.error("[/api/reaction] 반응 생성 실패:", error);
    return Response.json({ error: "generation_failed" }, { status: 502 });
  }
}
