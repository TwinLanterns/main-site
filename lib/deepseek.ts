// lib/deepseek.ts

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

// Events emitted by the streaming generator.
//  - 'append':  concatenate `content` onto the accumulated response.
//  - 'replace': overwrite the accumulated response with `content`.
//     Emitted by the server when DeepSeek's DOM re-renders mid-response
//     (e.g. a table cell separator becomes real content). Append-only
//     streaming can't represent that, so the server resends the full text.
export type StreamEvent =
  { type: "append"; content: string } | { type: "replace"; content: string };

const DEBUG = process.env.DEBUG === "true";

function parseChunk(jsonStr: string): StreamEvent | null {
  try {
    const parsed = JSON.parse(jsonStr);
    const delta = parsed.choices?.[0]?.delta;
    const content =
      delta?.content || parsed.choices?.[0]?.message?.content || "";
    if (!content) return null;
    if (delta?.replace === true) {
      return { type: "replace", content };
    }
    return { type: "append", content };
  } catch (e) {
    if (DEBUG) console.error("[DEBUG] JSON parse failed:", e);
    return null;
  }
}

export async function* streamDeepSeekWeb(
  messages: ChatMessage[],
): AsyncGenerator<StreamEvent, void, unknown> {
  const PROXY_URL = process.env.DEEPSEEK_PROXY_URL as string;
  const API_KEY = process.env.DEEPSEEK_API_KEY_REVERSE_PROXY;

  if (!PROXY_URL) throw new Error("DEEPSEEK_PROXY_URL is not set");
  if (!API_KEY) throw new Error("DEEPSEEK_API_KEY_REVERSE_PROXY is not set");

  // Abort after 200s – longer than the server's own hard timeout.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 200000);

  try {
    const response = await fetch(PROXY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages,
        stream: true,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `HTTP ${response.status}: ${response.statusText} – ${text}`,
      );
    }
    if (!response.body) {
      throw new Error("Response body is null");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const clean = line.trim();
        if (!clean.startsWith("data:")) continue;
        if (clean.includes("[DONE]")) return;

        const jsonStr = clean.slice(5).trim();
        if (DEBUG) console.error("[DEBUG] jsonStr:", jsonStr);

        const event = parseChunk(jsonStr);
        if (event !== null) {
          if (DEBUG) console.error(`[DEBUG] ${event.type}:`, event.content);
          yield event;
        } else if (DEBUG) {
          console.error("[DEBUG] No content extracted from:", jsonStr);
        }
      }
    }
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Request timed out after 200 seconds");
    }
    console.error("DeepSeek streaming error:", error);
    throw error;
  }
}
