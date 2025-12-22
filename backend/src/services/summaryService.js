const { buildSummary } = require('./summarizer');

const DEFAULT_LOOKBACK_DAYS = 30;
const DEFAULT_MAX_MESSAGES = 120;
const DEFAULT_MAX_INPUT_CHARS = 12000;
const DEFAULT_MAX_OUTPUT_TOKENS = 500;
const DEFAULT_TIMEOUT_MS = 20000;

function toDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatTimestamp(value) {
  const date = toDate(value);
  if (!date) return 'N/A';
  return date.toISOString().replace('T', ' ').slice(0, 16);
}

function uniqueList(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function filterMessages(messages, { lookbackDays, maxMessages }) {
  const bounded = [...messages].filter((m) => toDate(m.sent_at));
  const threshold = lookbackDays ? Date.now() - lookbackDays * 24 * 60 * 60 * 1000 : null;

  const filtered = threshold
    ? bounded.filter((m) => toDate(m.sent_at).getTime() >= threshold)
    : bounded;

  filtered.sort((a, b) => new Date(b.sent_at) - new Date(a.sent_at));
  filtered.splice(maxMessages);
  filtered.sort((a, b) => new Date(a.sent_at) - new Date(b.sent_at));
  return filtered;
}

function buildStats(messages, lookbackDays) {
  if (!messages.length) {
    return { count: 0, lookbackDays: lookbackDays || null };
  }

  const participants = uniqueList(messages.map((m) => m.sender_name));
  const rooms = uniqueList(messages.map((m) => m.room_name));
  const first = messages[0];
  const last = messages[messages.length - 1];

  return {
    count: messages.length,
    lookbackDays: lookbackDays || null,
    participants,
    rooms,
    from: formatTimestamp(first.sent_at),
    to: formatTimestamp(last.sent_at)
  };
}

function formatMessageLine(message) {
  const sender = message.sender_name || 'Unknown';
  const room = message.room_name ? `[${message.room_name}] ` : '';
  const body = String(message.body_text || '').replace(/\s+/g, ' ').trim();
  if (!body) return '';
  return `${formatTimestamp(message.sent_at)} ${room}${sender}: ${body}`;
}

function selectMessagesForPrompt(messages, maxChars) {
  const lines = [];
  let total = 0;

  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const line = formatMessageLine(messages[i]);
    if (!line) continue;

    const next = total + line.length + 1;
    if (next > maxChars) {
      if (!lines.length) {
        lines.push(line.slice(-maxChars));
      }
      break;
    }

    lines.push(line);
    total = next;
  }

  lines.reverse();
  return { text: lines.join('\n'), count: lines.length };
}

function normalizeBulletList(text) {
  const lines = String(text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) return '';

  const hasBullets = lines.some((line) => line.startsWith('- ') || line.startsWith('•'));
  if (hasBullets) return lines.join('\n');

  return lines.map((line) => `- ${line}`).join('\n');
}

function getLlmConfig() {
  const provider = (process.env.LLM_PROVIDER || 'openai').toLowerCase();
  const apiKey = process.env.LLM_API_KEY ? String(process.env.LLM_API_KEY).trim() : '';
  const modelOverride = process.env.LLM_MODEL ? String(process.env.LLM_MODEL).trim() : '';

  // Validate model matches provider - ignore mismatched model override
  let model;
  if (provider === 'gemini') {
    // For Gemini: use override only if it looks like a Gemini model, otherwise use default
    model = (modelOverride && modelOverride.toLowerCase().startsWith('gemini'))
      ? modelOverride
      : 'gemini-3-pro-preview';
  } else {
    // For OpenAI: use override only if it looks like an OpenAI model, otherwise use default
    // Default to gpt-4o-mini (faster and cheaper) or gpt-4o if available
    model = (modelOverride && !modelOverride.toLowerCase().startsWith('gemini'))
      ? modelOverride
      : 'gpt-4o-mini';
  }

  const enabled = Boolean(apiKey) && (provider === 'openai' || provider === 'gemini');

  return {
    provider,
    apiKey,
    model,
    enabled
  };
}

function buildPrompt({ companyName, stats, messagesText, filteredCount, usedCount, originalCount }) {
  const participants = stats.participants?.length ? stats.participants.join(', ') : 'N/A';
  const rooms = stats.rooms?.length ? stats.rooms.join(', ') : 'N/A';

  return [
    'You summarize Chatwork conversation logs for internal stakeholders.',
    'Write the summary in Japanese as bullet points.',
    'Output 5-10 bullets, each line starting with "- ".',
    'Focus on key topics, requests, decisions, deadlines, and open questions.',
    'If there are no clear action items, include a bullet that says so.',
    'Avoid speculation and keep it concise.',
    '',
    `Company: ${companyName || 'N/A'}`,
    `Date range: ${stats.from || 'N/A'} - ${stats.to || 'N/A'}`,
    `Participants: ${participants}`,
    `Rooms: ${rooms}`,
    `Messages: total ${originalCount}, filtered ${filteredCount}, included ${usedCount}`,
    '',
    'Messages (chronological):',
    messagesText
  ].join('\n');
}

function extractResponseText(payload) {
  if (!payload) return '';
  if (typeof payload.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text.trim();
  }
  if (!Array.isArray(payload.output)) return '';

  for (const item of payload.output) {
    if (!item || !Array.isArray(item.content)) continue;
    for (const content of item.content) {
      if (!content) continue;
      if (typeof content.text === 'string' && content.text.trim()) {
        return content.text.trim();
      }
      if (content.type === 'output_text' && typeof content.text === 'string' && content.text.trim()) {
        return content.text.trim();
      }
    }
  }

  return '';
}

async function summarizeWithOpenAI({ apiKey, model, prompt, maxOutputTokens, timeoutMs }) {
  if (typeof fetch !== 'function') {
    throw new Error('fetch is not available in this runtime');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/fc082490-ed80-4dc2-b62d-3ceb5c5aed1b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'summaryService.js:summarizeWithOpenAI',message:'Calling OpenAI API',data:{model,promptLength:prompt?.length||0,maxOutputTokens},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
  // #endregion

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: 'You are a precise summarization assistant.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: maxOutputTokens
      }),
      signal: controller.signal
    });

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/fc082490-ed80-4dc2-b62d-3ceb5c5aed1b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'summaryService.js:summarizeWithOpenAI:response',message:'OpenAI API response',data:{status:res.status,ok:res.ok,statusText:res.statusText},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
    // #endregion

    if (!res.ok) {
      const errorBody = await res.text().catch(() => 'unable to read body');
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/fc082490-ed80-4dc2-b62d-3ceb5c5aed1b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'summaryService.js:summarizeWithOpenAI:error',message:'OpenAI API error details',data:{status:res.status,errorBody:errorBody.substring(0,500)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      throw new Error(`OpenAI error ${res.status}`);
    }

    const payload = await res.json();
    // OpenAI APIのレスポンス形式: { choices: [{ message: { content: "..." } }] }
    const text = payload.choices?.[0]?.message?.content || '';
    if (!text) {
      throw new Error('OpenAI response did not include text');
    }

    return text.trim();
  } finally {
    clearTimeout(timer);
  }
}

async function summarizeWithGemini({ apiKey, model, prompt, maxOutputTokens, timeoutMs }) {
  if (typeof fetch !== 'function') {
    throw new Error('fetch is not available in this runtime');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;

  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/fc082490-ed80-4dc2-b62d-3ceb5c5aed1b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'summaryService.js:summarizeWithGemini',message:'Calling Gemini API',data:{model,urlWithoutKey:url.split('?')[0],promptLength:prompt?.length||0,maxOutputTokens},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'F,G,H'})}).catch(()=>{});
  // #endregion

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: 'You are a precise summarization assistant.' }]
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: maxOutputTokens
        }
      }),
      signal: controller.signal
    });

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/fc082490-ed80-4dc2-b62d-3ceb5c5aed1b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'summaryService.js:summarizeWithGemini:response',message:'Gemini API response',data:{status:res.status,ok:res.ok,statusText:res.statusText},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'F,G,H'})}).catch(()=>{});
    // #endregion

    if (!res.ok) {
      const errorBody = await res.text().catch(() => 'unable to read body');
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/fc082490-ed80-4dc2-b62d-3ceb5c5aed1b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'summaryService.js:summarizeWithGemini:error',message:'Gemini API error details',data:{status:res.status,errorBody:errorBody.substring(0,500)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'F,G,H'})}).catch(()=>{});
      // #endregion
      throw new Error(`Gemini error ${res.status}`);
    }

    const payload = await res.json();
    const candidates = Array.isArray(payload.candidates) ? payload.candidates : [];
    const parts = candidates[0]?.content?.parts || [];
    const text = parts.map((part) => part?.text || '').join('').trim();
    if (!text) {
      throw new Error('Gemini response did not include text');
    }

    return text;
  } finally {
    clearTimeout(timer);
  }
}

async function summarizeMessages({ companyName, messages, options = {} }) {
  const lookbackDays =
    options.lookbackDays !== undefined ? Number(options.lookbackDays) : DEFAULT_LOOKBACK_DAYS;
  const maxMessages =
    options.maxMessages !== undefined ? Number(options.maxMessages) : DEFAULT_MAX_MESSAGES;

  const filtered = filterMessages(messages || [], { lookbackDays, maxMessages });
  const stats = buildStats(filtered, lookbackDays);
  const config = getLlmConfig();

  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/fc082490-ed80-4dc2-b62d-3ceb5c5aed1b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'summaryService.js:summarizeMessages',message:'Entry: summarizeMessages',data:{companyName,messagesCount:messages?.length||0,filteredCount:filtered.length,lookbackDays,maxMessages,llmConfig:{provider:config.provider,enabled:config.enabled,model:config.model,hasApiKey:!!config.apiKey}},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,B'})}).catch(()=>{});
  // #endregion

  if (!filtered.length || !config.enabled) {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/fc082490-ed80-4dc2-b62d-3ceb5c5aed1b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'summaryService.js:fallbackBranch',message:'Using fallback (heuristic)',data:{reason:!filtered.length?'noMessages':'llmNotEnabled',filteredCount:filtered.length,configEnabled:config.enabled},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    const fallback = buildSummary(messages || [], { lookbackDays, maxMessages });
    return { content: fallback.content, stats: fallback.stats || stats, source: 'heuristic' };
  }

  try {
    const { text, count } = selectMessagesForPrompt(filtered, DEFAULT_MAX_INPUT_CHARS);
    const prompt = buildPrompt({
      companyName,
      stats,
      messagesText: text,
      filteredCount: filtered.length,
      usedCount: count,
      originalCount: (messages || []).length
    });

    let output;
    if (config.provider === 'gemini') {
      output = await summarizeWithGemini({
        apiKey: config.apiKey,
        model: config.model,
        prompt,
        maxOutputTokens: DEFAULT_MAX_OUTPUT_TOKENS,
        timeoutMs: DEFAULT_TIMEOUT_MS
      });
    } else {
      output = await summarizeWithOpenAI({
        apiKey: config.apiKey,
        model: config.model,
        prompt,
        maxOutputTokens: DEFAULT_MAX_OUTPUT_TOKENS,
        timeoutMs: DEFAULT_TIMEOUT_MS
      });
    }

    const content = normalizeBulletList(output);
    if (!content) {
      throw new Error('LLM summary was empty');
    }

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/fc082490-ed80-4dc2-b62d-3ceb5c5aed1b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'summaryService.js:llmSuccess',message:'LLM summarization succeeded',data:{provider:config.provider,model:config.model,contentLength:content.length},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    return { content, stats, source: 'llm' };
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/fc082490-ed80-4dc2-b62d-3ceb5c5aed1b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'summaryService.js:llmError',message:'LLM failed, using fallback',data:{errorMessage:error.message,provider:config.provider,model:config.model},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    console.warn(`[summary] LLM failed: ${error.message}. Using fallback summary.`);
    const fallback = buildSummary(messages || [], { lookbackDays, maxMessages });
    return { content: fallback.content, stats: fallback.stats || stats, source: 'fallback' };
  }
}

module.exports = { summarizeMessages };
