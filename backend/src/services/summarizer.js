const DEFAULT_MAX_MESSAGES = 120;
const DEFAULT_LOOKBACK_DAYS = 30;

function toDate(value) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatTimestamp(value) {
  const d = toDate(value);
  if (!d) return '日時不明';
  return d.toISOString().replace('T', ' ').slice(0, 16);
}

function truncate(text, length) {
  if (!text) return '';
  if (text.length <= length) return text;
  return `${text.slice(0, length)}…`;
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

function detectActionItems(messages) {
  const patterns = [/ください/, /お願いします?/, /対応/, /送付/, /依頼/, /します/];
  return messages.filter((m) => patterns.some((p) => p.test(m.body_text || '')));
}

function highlightLines(messages, count) {
  return messages.slice(-count).map((m) => {
    const sender = m.sender_name || '送信者不明';
    const room = m.room_name ? `[${m.room_name}] ` : '';
    return `- ${formatTimestamp(m.sent_at)} ${room}${sender}: ${truncate(m.body_text || '', 140)}`;
  });
}

function buildSummary(rawMessages, options = {}) {
  const maxMessages = options.maxMessages || DEFAULT_MAX_MESSAGES;
  const lookbackDays = options.lookbackDays ?? DEFAULT_LOOKBACK_DAYS;

  const messages = filterMessages(rawMessages || [], { lookbackDays, maxMessages });
  if (messages.length === 0) {
    return {
      content: '対象期間のメッセージが見つかりませんでした。',
      stats: { count: 0, lookbackDays: lookbackDays || null }
    };
  }

  const participants = uniqueList(messages.map((m) => m.sender_name));
  const rooms = uniqueList(messages.map((m) => m.room_name));
  const first = messages[0];
  const last = messages[messages.length - 1];

  const actions = detectActionItems(messages);
  const summaryLines = [
    `対象期間: ${formatTimestamp(first.sent_at)} 〜 ${formatTimestamp(last.sent_at)} (${messages.length}件)`,
    `参加者: ${participants.length ? participants.join(', ') : '不明'}`,
    `関連ルーム: ${rooms.length ? rooms.join(', ') : '未紐づけ'}`,
    '--- 直近のやり取り ---',
    ...highlightLines(messages, 5)
  ];

  if (actions.length) {
    summaryLines.push('--- リクエスト/タスク候補 ---', ...highlightLines(actions, 3));
  }

  return {
    content: summaryLines.join('\n'),
    stats: {
      count: messages.length,
      lookbackDays: lookbackDays || null,
      participants,
      rooms,
      from: formatTimestamp(first.sent_at),
      to: formatTimestamp(last.sent_at)
    }
  };
}

module.exports = { buildSummary };
