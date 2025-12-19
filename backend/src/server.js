const express = require('express');
const session = require('express-session');
const path = require('path');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const { db, runMigrations } = require('./db');
const {
  getCompanies,
  getCompanyDetail,
  getLatestMessageTimestamp,
  getLatestSummaryTimestamp,
  generateSummaryForCompany
} = require('./services/companyService');
const { createChatSyncService } = require('./services/chatSyncService');
const { createChatworkService } = require('./services/chatworkService');

dotenv.config();
runMigrations();

const app = express();
const port = process.env.PORT || 3000;
const sessionSecret = process.env.SESSION_SECRET || 'dev-secret';
const chatSyncService = createChatSyncService(db);
const chatworkService = createChatworkService();
const frontendDistPath = path.join(__dirname, '..', '..', 'frontend', 'dist');

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(
  session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false,
      maxAge: 24 * 60 * 60 * 1000
    }
  })
);

// === Session User Context ===
app.use((req, res, next) => {
  if (!req.session.user) {
    const adminRow = db
      .prepare("SELECT * FROM users WHERE role = 'admin' ORDER BY id ASC LIMIT 1")
      .get();
    const userRow = adminRow || db.prepare('SELECT * FROM users ORDER BY id ASC LIMIT 1').get();

    if (userRow) {
      req.session.user = sanitizeUser(userRow);
    }
  }
  res.locals.currentUser = req.session.user || null;
  next();
});

// === Auth Middleware ===
function requireAuthApi(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  return next();
}

function requireAdminApi(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (req.session.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  return next();
}

// === Helpers ===
function parseId(value) {
  const num = Number(value);
  return Number.isInteger(num) ? num : null;
}

function sanitizeUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role
  };
}

function normalizeChatworkMessage(payload, index) {
  if (!payload || typeof payload !== 'object') {
    throw new Error(`messages[${index}] is invalid`);
  }

  const id = payload.message_id ?? payload.messageId ?? payload.id;
  const sender = payload.account?.name ?? payload.sender_name ?? 'Unknown';
  const body = payload.body ?? payload.body_text ?? '';
  const sentTime = payload.send_time ?? payload.sent_at ?? payload.sendTime;

  if (id === undefined || id === null || String(id).trim() === '') {
    throw new Error(`messages[${index}].message_id is required`);
  }
  if (!body) {
    throw new Error(`messages[${index}].body is required`);
  }

  let sentAtDate;
  if (typeof sentTime === 'number') {
    sentAtDate = new Date(sentTime * 1000);
  } else {
    sentAtDate = new Date(sentTime);
  }
  if (Number.isNaN(sentAtDate.getTime())) {
    throw new Error(`messages[${index}].send_time is invalid`);
  }

  return {
    chatwork_message_id: String(id),
    sender_name: String(sender),
    sent_at: sentAtDate.toISOString(),
    body_text: String(body)
  };
}

function ensureCompanyForRoom(room) {
  if (!room) return null;
  if (room.company_id) {
    const existingById = db.prepare('SELECT id FROM companies WHERE id = ?').get(room.company_id);
    if (existingById) return existingById.id;
  }

  const trimmedName = room.name ? String(room.name).trim() : '';
  const fallbackName = room.chatwork_room_id ? `Chatwork Room ${room.chatwork_room_id}` : `Room ${room.id}`;
  const companyName = trimmedName || fallbackName;

  const existingByName = db.prepare('SELECT id FROM companies WHERE name = ?').get(companyName);
  const companyId = existingByName
    ? existingByName.id
    : db
        .prepare("INSERT INTO companies (name, created_at, updated_at) VALUES (?, datetime('now'), datetime('now'))")
        .run(companyName).lastInsertRowid;

  db.prepare("UPDATE chat_rooms SET company_id = ?, updated_at = datetime('now') WHERE id = ?").run(
    companyId,
    room.id
  );
  return companyId;
}

function backfillCompaniesFromRooms(includeLinked = false) {
  const sql = includeLinked
    ? 'SELECT id, name, chatwork_room_id, company_id FROM chat_rooms'
    : 'SELECT id, name, chatwork_room_id, company_id FROM chat_rooms WHERE company_id IS NULL';
  const rooms = db.prepare(sql).all();
  if (rooms.length === 0) return 0;

  const run = db.transaction((rows) => {
    let linked = 0;
    rows.forEach((room) => {
      const companyId = ensureCompanyForRoom(room);
      if (companyId) linked += 1;
    });
    return linked;
  });

  return run(rooms);
}

function getSummaryOptions(req) {
  return {
    lookbackDays:
      req.body?.lookback_days ??
      req.body?.lookbackDays ??
      req.query?.lookback_days ??
      req.query?.lookbackDays,
    maxMessages:
      req.body?.max_messages ??
      req.body?.maxMessages ??
      req.query?.max_messages ??
      req.query?.maxMessages,
    periodType: req.body?.period_type || req.body?.periodType || 'recent'
  };
}

// === API Routes ===

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth
app.post('/api/login', (req, res) => {
  const email = req.body?.email ? String(req.body.email).trim() : '';
  const password = req.body?.password ? String(req.body.password) : '';

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const userRow = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  const isValid = userRow ? bcrypt.compareSync(password, userRow.password_hash) : false;

  if (!isValid) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const user = sanitizeUser(userRow);
  req.session.regenerate((err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to start session' });
    }

    req.session.user = user;
    req.session.save((saveErr) => {
      if (saveErr) {
        return res.status(500).json({ error: 'Failed to save session' });
      }
      return res.json({ user });
    });
  });
});

app.get('/api/me', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  res.json({ user: req.session.user });
});

app.post('/api/logout', (req, res) => {
  if (!req.session) {
    return res.json({ success: true });
  }

  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ success: true });
  });
});

// Companies List
app.get('/api/companies', requireAuthApi, (req, res) => {
  const search = req.query.q || '';
  const companyCountRow = db.prepare('SELECT COUNT(*) AS count FROM companies').get();
  if ((companyCountRow?.count || 0) === 0) {
    backfillCompaniesFromRooms(true);
  }
  const companies = getCompanies(search);
  res.json({ companies });
});

// Company Detail
app.get('/api/companies/:id', requireAuthApi, (req, res) => {
  const companyId = parseId(req.params.id);
  if (!companyId) {
    return res.status(400).json({ error: 'Invalid company id' });
  }
  const detail = getCompanyDetail(companyId);
  if (!detail) {
    return res.status(404).json({ error: 'Company not found' });
  }
  res.json(detail);
});

// Regenerate Summary
app.post('/api/companies/:id/regenerate', requireAuthApi, async (req, res) => {
  const companyId = parseId(req.params.id);
  if (!companyId) {
    return res.status(400).json({ error: 'Invalid company id' });
  }

  let result;
  try {
    result = await generateSummaryForCompany(companyId, getSummaryOptions(req));
  } catch (error) {
    return res.status(500).json({ error: 'Failed to generate summary' });
  }

  if (!result) {
    return res.status(404).json({ error: 'Company not found' });
  }

  res.json({ summary: result.summary, stats: result.stats });
});

// Admin Companies
app.post('/api/admin/companies', requireAdminApi, (req, res) => {
  const name = req.body?.name ? String(req.body.name).trim() : '';
  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  const insertResult = db
    .prepare("INSERT INTO companies (name, created_at, updated_at) VALUES (?, datetime('now'), datetime('now'))")
    .run(name);
  const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(insertResult.lastInsertRowid);
  res.status(201).json({ company });
});

// Admin Chatwork Rooms
app.get('/api/admin/chatwork/rooms', requireAdminApi, async (req, res) => {
  try {
    const rooms = await chatworkService.listRooms();
    res.json({ rooms });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ error: error.message || 'Failed to fetch Chatwork rooms' });
  }
});

// Admin Rooms
app.get('/api/admin/rooms', requireAdminApi, (req, res) => {
  const companies = db.prepare('SELECT id, name FROM companies ORDER BY name ASC').all();
  const rooms = db
    .prepare(
      `
      SELECT r.id, r.name, r.chatwork_room_id, r.company_id, c.name AS company_name
      FROM chat_rooms r
      LEFT JOIN companies c ON c.id = r.company_id
      ORDER BY r.name ASC
    `
    )
    .all();
  res.json({ companies, rooms });
});

app.post('/api/admin/rooms', requireAdminApi, (req, res) => {
  const name = req.body?.name ? String(req.body.name).trim() : '';
  const chatworkRoomId = req.body?.chatwork_room_id ? String(req.body.chatwork_room_id).trim() : null;
  const companyId = parseId(req.body?.company_id);

  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  const insertResult = db
    .prepare(
      `
    INSERT INTO chat_rooms (company_id, chatwork_room_id, name, created_at, updated_at)
    VALUES (?, ?, ?, datetime('now'), datetime('now'))
  `
    )
    .run(companyId || null, chatworkRoomId || null, name);

  const room = db
    .prepare('SELECT id, name, chatwork_room_id, company_id, last_synced_at FROM chat_rooms WHERE id = ?')
    .get(insertResult.lastInsertRowid);

  res.status(201).json({ room });
});

app.post('/api/admin/rooms/:id/link', requireAdminApi, (req, res) => {
  const roomId = parseId(req.params.id);
  if (!roomId) {
    return res.status(400).json({ error: 'Invalid room id' });
  }

  const companyId = req.body?.company_id ? parseId(req.body.company_id) : null;
  db.prepare("UPDATE chat_rooms SET company_id = ?, updated_at = datetime('now') WHERE id = ?").run(
    companyId || null,
    roomId
  );
  res.json({ success: true, company_id: companyId || null });
});

app.post('/api/admin/rooms/:id/chatwork', requireAdminApi, (req, res) => {
  const roomId = parseId(req.params.id);
  if (!roomId) {
    return res.status(400).json({ error: 'Invalid room id' });
  }

  const chatworkRoomId = req.body?.chatwork_room_id ? String(req.body.chatwork_room_id).trim() : null;
  db.prepare("UPDATE chat_rooms SET chatwork_room_id = ?, updated_at = datetime('now') WHERE id = ?").run(
    chatworkRoomId || null,
    roomId
  );
  res.json({ success: true, chatwork_room_id: chatworkRoomId || null });
});

app.post('/api/admin/rooms/:id/sync', requireAdminApi, async (req, res) => {
  const roomId = parseId(req.params.id);
  if (!roomId) {
    return res.status(400).json({ error: 'Invalid room id' });
  }
  const force = Boolean(req.body?.force);

  const room = db
    .prepare('SELECT id, name, chatwork_room_id, company_id, last_synced_at FROM chat_rooms WHERE id = ?')
    .get(roomId);
  if (!room) {
    return res.status(404).json({ error: 'Chat room not found' });
  }

  const chatworkRoomId = room.chatwork_room_id ? String(room.chatwork_room_id).trim() : '';
  if (!chatworkRoomId) {
    return res.status(400).json({ error: 'chatwork_room_id is required' });
  }

  try {
    const companyId = ensureCompanyForRoom(room);
    const messages = await chatworkService.listRoomMessages(chatworkRoomId, { force: true });
    if (!Array.isArray(messages)) {
      return res.status(502).json({ error: 'Unexpected Chatwork response' });
    }

    const lastSyncedAt = room.last_synced_at ? new Date(room.last_synced_at) : null;
    const lastSyncedTime =
      !force && lastSyncedAt && !Number.isNaN(lastSyncedAt.getTime()) ? lastSyncedAt : null;
    const normalized = messages
      .map((message, index) => normalizeChatworkMessage(message, index))
      .filter((message) => !lastSyncedTime || new Date(message.sent_at) > lastSyncedTime);

    const trimmed = normalized.length > 500 ? normalized.slice(-500) : normalized;
    const result = chatSyncService.importMessages(roomId, trimmed);

    res.json({
      success: true,
      company_id: companyId,
      fetched: messages.length,
      candidate: normalized.length,
      imported: result.inserted,
      skipped: result.skipped,
      lastSyncedAt: result.lastSyncedAt
    });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ error: error.message || 'Failed to sync messages' });
  }
});

app.post('/api/admin/rooms/:id/messages', requireAdminApi, (req, res) => {
  const roomId = parseId(req.params.id);
  if (!roomId) {
    return res.status(400).json({ error: 'Invalid room id' });
  }

  try {
    const messages = Array.isArray(req.body?.messages) ? req.body.messages : [];
    const result = chatSyncService.importMessages(roomId, messages);
    res.json({ success: true, ...result });
  } catch (error) {
    const status = error.statusCode || 400;
    res.status(status).json({ error: error.message || 'Failed to import messages' });
  }
});

// Admin Jobs (batch summary regeneration)
app.post('/api/admin/jobs/summaries', requireAdminApi, async (req, res) => {
  try {
    const targetIds =
      Array.isArray(req.body?.company_ids) && req.body.company_ids.length
        ? req.body.company_ids.map((id) => parseId(id)).filter(Boolean)
        : db.prepare('SELECT id FROM companies').all().map((c) => c.id);

    const { lookbackDays, maxMessages, periodType } = getSummaryOptions(req);
    const force = Boolean(req.body?.force);

    const summaries = [];
    for (const id of targetIds) {
      if (!force) {
        const lastMessageAt = getLatestMessageTimestamp(id);
        const lastSummaryAt = getLatestSummaryTimestamp(id);

        if (!lastMessageAt) continue;
        if (lastSummaryAt && new Date(lastMessageAt) <= new Date(lastSummaryAt)) {
          continue;
        }
      }

      const generated = await generateSummaryForCompany(id, { lookbackDays, maxMessages, periodType });
      if (generated) summaries.push(generated);
    }

    res.json({
      updated: summaries.length,
      summaries: summaries.map((s) => s.summary)
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to run summaries job' });
  }
});



app.use(express.static(frontendDistPath));

app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(frontendDistPath, 'index.html'));
});

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((req, res) => {
  res.status(404).send('Not found');
});

if (require.main === module) {
  app.listen(port, () => {
    /* eslint-disable no-console */
    console.log(`Server listening on http://localhost:${port}`);
  });
}

module.exports = app;
