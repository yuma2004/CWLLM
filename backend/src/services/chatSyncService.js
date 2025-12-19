const MAX_IMPORT = 500;

function createChatSyncService(db) {
  const insertMessage = db.prepare(`
    INSERT OR IGNORE INTO messages
      (chat_room_id, chatwork_message_id, sender_name, sent_at, body_text, created_at, updated_at)
    VALUES
      (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `);

  const updateLastSynced = db.prepare(`
    UPDATE chat_rooms
    SET last_synced_at = ?, updated_at = datetime('now')
    WHERE id = ?
  `);

  function normalizeMessage(payload, index) {
    if (!payload || typeof payload !== 'object') {
      throw new Error(`messages[${index}] is invalid`);
    }
    const id = payload.chatwork_message_id ? String(payload.chatwork_message_id).trim() : '';
    const sender = payload.sender_name ? String(payload.sender_name).trim() : '';
    const body = payload.body_text ? String(payload.body_text).trim() : '';
    const sentAtDate = new Date(payload.sent_at);

    if (!id) throw new Error(`messages[${index}].chatwork_message_id is required`);
    if (!sender) throw new Error(`messages[${index}].sender_name is required`);
    if (Number.isNaN(sentAtDate.getTime())) throw new Error(`messages[${index}].sent_at must be a valid date`);
    if (!body) throw new Error(`messages[${index}].body_text is required`);

    return {
      chatwork_message_id: id,
      sender_name: sender,
      sent_at: sentAtDate.toISOString(),
      body_text: body
    };
  }

  const insertMany = db.transaction((rows, roomId) => {
    let inserted = 0;
    let skipped = 0;
    let latest = null;

    for (const row of rows) {
      const result = insertMessage.run(roomId, row.chatwork_message_id, row.sender_name, row.sent_at, row.body_text);
      if (result.changes > 0) {
        inserted += 1;
        latest = !latest || new Date(row.sent_at) > new Date(latest) ? row.sent_at : latest;
      } else {
        skipped += 1;
      }
    }

    return { inserted, skipped, latestSentAt: latest };
  });

  function importMessages(roomId, rawMessages) {
    if (!Array.isArray(rawMessages)) {
      throw new Error('messages must be an array');
    }
    if (rawMessages.length > MAX_IMPORT) {
      throw new Error(`messages length must be <= ${MAX_IMPORT}`);
    }

    const room = db.prepare('SELECT id, company_id, last_synced_at FROM chat_rooms WHERE id = ?').get(roomId);
    if (!room) {
      const err = new Error('Chat room not found');
      err.statusCode = 404;
      throw err;
    }

    const normalized = rawMessages.map((msg, idx) => normalizeMessage(msg, idx));
    const { inserted, skipped, latestSentAt } = insertMany(normalized, roomId);

    if (latestSentAt) {
      updateLastSynced.run(latestSentAt, roomId);
    }

    return {
      inserted,
      skipped,
      lastSyncedAt: latestSentAt || room.last_synced_at
    };
  }

  return { importMessages };
}

module.exports = { createChatSyncService };
