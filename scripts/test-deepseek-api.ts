// scripts/chat.ts

import * as readline from 'readline';
import { streamDeepSeekWeb, ChatMessage, StreamEvent } from '../lib/deepseek';

// Validate environment
const DEBUG = process.env.DEBUG === 'true';
const PROXY_URL = process.env.DEEPSEEK_PROXY_URL;
const API_KEY = process.env.DEEPSEEK_API_KEY_REVERSE_PROXY;

if (!PROXY_URL) {
  console.error('❌ DEEPSEEK_PROXY_URL is not set');
  process.exit(1);
}
if (!API_KEY) {
  console.error('❌ DEEPSEEK_API_KEY_REVERSE_PROXY is not set');
  process.exit(1);
}

if (DEBUG) {
  console.log(`🔍 Proxy URL: ${PROXY_URL}`);
  console.log(`🔍 API Key: ${API_KEY.slice(0, 4)}...${API_KEY.slice(-4)}`);
}

// Conversation history
const messages: ChatMessage[] = [];
const SYSTEM_PROMPT =
  process.env.SYSTEM_PROMPT ||
  'You are a helpful, harmless, and honest assistant.';

if (SYSTEM_PROMPT) {
  messages.push({ role: 'system', content: SYSTEM_PROMPT });
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: true,
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => rl.question(query, resolve));
}

// Debug wrapper – transparent passthrough that counts events.
async function* debugStream(
  messages: ChatMessage[]
): AsyncGenerator<StreamEvent> {
  let eventCount = 0;
  let totalContent = '';
  try {
    for await (const event of streamDeepSeekWeb(messages)) {
      eventCount++;
      if (event.type === 'replace') {
        totalContent = event.content;
      } else {
        totalContent += event.content;
      }
      if (DEBUG) {
        console.error(
          `[DEBUG] Event #${eventCount} (${event.type}): "${event.content}"`
        );
      }
      yield event;
    }
    if (DEBUG && eventCount === 0) {
      console.error('[DEBUG] ⚠️ No events yielded – stream produced empty output.');
    }
    if (DEBUG && totalContent === '') {
      console.error('[DEBUG] ⚠️ Total content is empty string.');
    }
  } catch (error) {
    console.error('[DEBUG] ❌ Error in stream:', error);
    throw error;
  }
}

async function chat() {
  console.log('\n🤖 DeepSeek Chat (type "exit" or "quit" to end)');
  if (DEBUG) {
    console.log('🔍 Debug mode enabled – raw events will be printed to stderr.\n');
  }

  while (true) {
    const userInput = await question('You: ');
    const trimmed = userInput.trim();

    if (!trimmed) continue;
    if (['exit', 'quit', 'q'].includes(trimmed.toLowerCase())) {
      console.log('Goodbye!');
      rl.close();
      break;
    }

    messages.push({ role: 'user', content: trimmed });
    process.stdout.write('Assistant: ');

    let fullResponse = '';
    let streamError = false;

    try {
      for await (const event of debugStream(messages)) {
        if (event.type === 'replace') {
          // Server detected a DOM re-render. Overwrite accumulated buffer.
          // Visually: clear the current terminal line and reprint from scratch.
          fullResponse = event.content;
          process.stdout.write('\r\x1b[K' + 'Assistant: ' + event.content);
        } else {
          process.stdout.write(event.content);
          fullResponse += event.content;
        }
      }
      console.log('\n');
    } catch (error) {
      console.error('\n⚠️  Error:', error);
      streamError = true;
    }

    if (streamError) {
      messages.pop(); // remove user message to keep history clean
      continue;
    }

    if (fullResponse) {
      messages.push({ role: 'assistant', content: fullResponse });
    } else {
      messages.pop();
      console.warn('⚠️  Empty response – user message removed from history.');
      console.warn('💡 Check your proxy URL, API key, and network connectivity.');
      console.warn('💡 Try setting DEBUG=true to see raw data.');
    }
  }
}

chat().catch((err) => {
  console.error('Fatal error:', err);
  rl.close();
  process.exit(1);
});