const { db } = require('../db');
const { summarizeMessages } = require('./summaryService');

function getCompanies(searchQuery) {
  const pattern = searchQuery ? `%${searchQuery}%` : '%';
  const stmt = db.prepare(`
    SELECT
      c.id,
      c.name,
      MAX(m.sent_at) AS last_message_at,
      MAX(s.generated_at) AS summary_generated_at
    FROM companies c
    LEFT JOIN chat_rooms r ON r.company_id = c.id
    LEFT JOIN messages m ON m.chat_room_id = r.id
    LEFT JOIN summaries s ON s.company_id = c.id
    WHERE c.name LIKE ?
    GROUP BY c.id, c.name
    ORDER BY (last_message_at IS NULL), datetime(last_message_at) DESC, c.name ASC
  `);
  return stmt.all(pattern);
}

function getCompanyMessages(companyId, { limit = 100, since } = {}) {
  const params = [companyId];
  let sinceClause = '';

  if (since) {
    sinceClause = ' AND datetime(m.sent_at) >= datetime(?)';
    params.push(since);
  }

  params.push(limit);

  const sql = `
    SELECT m.*, r.name AS room_name
    FROM messages m
    JOIN chat_rooms r ON r.id = m.chat_room_id
    WHERE r.company_id = ?
    ${sinceClause}
    ORDER BY datetime(m.sent_at) DESC
    LIMIT ?
  `;

  return db.prepare(sql).all(...params);
}

function getCompanyDetail(companyId) {
  const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(companyId);
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/fc082490-ed80-4dc2-b62d-3ceb5c5aed1b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'companyService.js:getCompanyDetail',message:'Entry: getCompanyDetail',data:{companyId,companyFound:!!company,companyName:company?.name},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'D,E'})}).catch(()=>{});
  // #endregion
  if (!company) {
    return null;
  }

  const rooms = db
    .prepare(
      `
      SELECT id, name, chatwork_room_id, last_synced_at
      FROM chat_rooms
      WHERE company_id = ?
      ORDER BY name ASC
    `
    )
    .all(companyId);

  const summary = db
    .prepare(
      `
      SELECT *
      FROM summaries
      WHERE company_id = ?
      ORDER BY datetime(generated_at) DESC
      LIMIT 1
    `
    )
    .get(companyId);

  const messages = getCompanyMessages(companyId, { limit: 50 });

  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/fc082490-ed80-4dc2-b62d-3ceb5c5aed1b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'companyService.js:getCompanyDetail:end',message:'CompanyDetail data assembled',data:{companyId,roomsCount:rooms.length,hasSummary:!!summary,summaryContent:summary?.content?.substring(0,100),messagesCount:messages.length},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'D,E'})}).catch(()=>{});
  // #endregion

  return { company, rooms, summary, messages };
}

function getLatestMessageTimestamp(companyId) {
  const row = db
    .prepare(
      `
      SELECT MAX(m.sent_at) AS last_message_at
      FROM messages m
      JOIN chat_rooms r ON r.id = m.chat_room_id
      WHERE r.company_id = ?
    `
    )
    .get(companyId);
  return row?.last_message_at || null;
}

function getLatestSummaryTimestamp(companyId) {
  const row = db
    .prepare(
      `
      SELECT generated_at
      FROM summaries
      WHERE company_id = ?
      ORDER BY datetime(generated_at) DESC
      LIMIT 1
    `
    )
    .get(companyId);
  return row?.generated_at || null;
}

async function generateSummaryForCompany(companyId, options = {}) {
  const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(companyId);
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/fc082490-ed80-4dc2-b62d-3ceb5c5aed1b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'companyService.js:generateSummaryForCompany',message:'Entry: generateSummaryForCompany',data:{companyId,companyFound:!!company,companyName:company?.name,options},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'D'})}).catch(()=>{});
  // #endregion
  if (!company) return null;

  const lookbackDays =
    options.lookbackDays !== undefined
      ? Number(options.lookbackDays)
      : options.days !== undefined
        ? Number(options.days)
        : undefined;
  const maxMessages = options.maxMessages !== undefined ? Number(options.maxMessages) : undefined;
  const periodType = options.periodType || 'recent';

  const since =
    Number.isFinite(lookbackDays) && lookbackDays > 0
      ? new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString()
      : options.since;

  const messages = getCompanyMessages(companyId, {
    limit: maxMessages || 120,
    since
  });

  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/fc082490-ed80-4dc2-b62d-3ceb5c5aed1b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'companyService.js:beforeSummarize',message:'Messages retrieved for company',data:{companyId,messageCount:messages.length,sinceDate:since,lookbackDays,maxMessages:maxMessages||120},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'D'})}).catch(()=>{});
  // #endregion

  const { content, stats } = await summarizeMessages({
    companyName: company.name,
    messages,
    options: {
      lookbackDays: Number.isFinite(lookbackDays) ? lookbackDays : undefined,
      maxMessages: Number.isFinite(maxMessages) ? maxMessages : undefined
    }
  });

  db.prepare(
    `
    INSERT INTO summaries (company_id, period_type, content, generated_at, created_at, updated_at)
    VALUES (?, ?, ?, datetime('now'), datetime('now'), datetime('now'))
  `
  ).run(company.id, periodType, content);

  const newSummary = db.prepare('SELECT * FROM summaries WHERE id = last_insert_rowid()').get();
  return { summary: newSummary, stats };
}

module.exports = {
  getCompanies,
  getCompanyDetail,
  getLatestMessageTimestamp,
  getLatestSummaryTimestamp,
  generateSummaryForCompany
};
