const { db, runMigrations } = require('../src/db');

runMigrations();

function resetTables() {
  db.exec(`
    DELETE FROM summaries;
    DELETE FROM messages;
    DELETE FROM chat_rooms;
    DELETE FROM companies;
    DELETE FROM users;
    VACUUM;
  `);
}

function seed() {
  resetTables();
  console.log('Seed completed. No sample data inserted.');
}

seed();
