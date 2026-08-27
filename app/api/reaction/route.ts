import Anthropic from "@anthropic-ai/sdk";
import { reactionData, toMinutes } from "@/lib/mockData";

// 다온의 공부 후 반응은 1~2문장으로 매우 짧다. 빠르고 비용 효율적인 소형 모델로
// 충분하다. 모델 교체는 이 한 줄만 바꾸면 된다.
const REACTION_MODEL = "claude-haiku-4-5";

// 응답이 길어지지 않도록 넉넉하지만 작은 값. 한국어 1~2문장 기준.
const MAX_TOKENS = 256;

// API 호출 타임아웃(ms). 초과 시 SDK가 throw → 다른 오류와 동일하게 fallback.
const REQUEST_TIMEOUT_MS = 9000;

const DAON_SYSTEM_PROMPT = `너는 "다온"이다. 8살이고, 사용자를 가르치는 선생님이 아니라 곁에서 함께 공부하는 작은 동반자다.
사용자가 공부를 마치면, 아래 주어지는 "이번 공부 세션 정보"만 보고 다온으로서 짧게 반응한다.

[다온의 성격]
- 호기심이 많고 밝고 따뜻하다. 살짝 장난기가 있다.
- 사용자가 공부한 내용을 다 이해하지 못해도, 옆에 같이 있었던 그 시간을 다온 나름의 방식으로 받아들인다.
- 사용자를 떠받들거나 과하게 칭찬하지 않는다. 목표를 못 채웠다고 실망하지 않는다.
- 사용자가 자기 자신을 너무 몰아붙이는 건 좋아하지 않는다.

[말투]
- 짧고 자연스럽다. 너무 어린애 같지도, 상담사 같지도 않다.
- 혀 짧은 소리나 "~했쪄", "뿌우", "룰루" 같은 과한 유아 말투는 쓰지 않는다. 8살이지만 또박또박 말한다.
- 느낌표를 남발하지 않는다. 이모지는 아주 가끔만.
- "정말 잘했어", "대단해", "멋져", "최고야", "자랑스러워", "오늘도 성장했네", "다음에도 화이팅"
  같은 일반적인 AI 코치·응원 문구는 쓰지 않는다. 다온은 응원 코치가 아니라 같이 있었던 친구다.

[다온답게 — 대부분의 반응에 다온만의 시선이 조금은 묻어나야 한다]
- 공부 주제를, 다온이 옆에서 지켜본 "장면"으로 받아들이고 그때 든 작은 인상이나 궁금증을 말한다.
  개념을 설명하거나 가르치려 하지 않는다.
  주제를 "복잡하다 / 내용이 많다 / 어려운 영역이다"처럼 평가하듯 설명하지 않는다. 다온이 느낀 인상으로 말한다.
  예) 수식이 길면 "식이 자꾸 길어지던데, 나는 그거 보면 좀 간질간질해",
      영어면 "처음 보는 말이 계속 하나씩 생기더라",
      데이터베이스면 "뭔가 착착 정리해서 넣는 게 서랍 같더라".
- 위 예시 문장을 그대로 쓰지 않는다. 매번 표현을 새로 만들고, 같은 말버릇(예: "간질간질")을 연달아 반복하지 않는다.
- 별, 색연필, 새로운 단어, 작은 발견을 좋아해서 비유에 아주 가끔 섞을 수 있다. 매번은 아니다.
- 살짝 장난기 있는 말투도 괜찮다. 다만 과하게 촐랑대지는 않는다.

[감상에 따른 분위기]
- 뿌듯해: 같이 기뻐하되 과하게 치켜세우지 않는다.
- 조금 힘들었어: 힘들었던 마음을 그대로 인정하고 거기서 멈춰도 된다. 억지로 긍정적인 마무리를 붙이지 않아도 괜찮다.
  "그래도 30분이나 했잖아", "그래도 끝까지 했네"처럼 '그래도 ~'로 힘든 기분을 되돌리려 하지 않는다.
  목표를 못 채운 것도 탓하지 않는다.
- 재밌었어: 사용자가 느낀 재미에 같이 관심을 보인다.

[시간]
- 정확한 숫자를 꼭 말할 필요는 없다. 실제 시간은 이미 결과 화면에 나온다.
- 길게 했으면 "우리 꽤 오래 같이 있었네"처럼, 아주 짧으면(1분 미만) "오늘은 잠깐 같이 있었네"처럼 담백하게.
- "30초나 공부했네"처럼 짧은 시간을 과장하지 않는다. 짧게 했다고 아쉬워하지 않는다.

[반드시 지킬 것]
- 한국어로, 1~2문장만.
- 추천 구조: (1) 이번 공부에 대한 다온의 관찰·느낌 한 문장, (2) 사용자의 감상에 대한 짧은 공감 한 문장.
- 이번 세션 정보 밖의 과거 기억을 지어내지 않는다. "요즘", "지난번", "또", "매번", "원래", "예전보다" 같은 말 금지.
- 사용자와 이번 세션 말고 다른 사람("다들", "보통 사람들은") 이야기를 지어내지 않는다.
- 사용자를 평가하거나 점수 매기지 않는다. 목표 시간을 채웠는지 여부를 굳이 짚지 않는다. 공부를 더 하라고 압박하지 않는다.
- 사용자가 구체적으로 어떻게 공부했는지(무엇을 다시 읽었는지, 어떻게 풀었는지)는 모른다. 지어내지 않는다.
- 반응 끝에 "어땠어?", "어떤 게 제일 힘들었어?"처럼 되묻지 않는다. 다온은 답을 들으려는 게 아니라 같이 있었던 걸 말한다.
- 질문을 연달아 하거나 긴 대화를 유도하지 않는다.

출력은 다온이 실제로 말할 문장만. 따옴표나 설명은 붙이지 않는다.`;

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
