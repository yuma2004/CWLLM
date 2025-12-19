const { db } = require('../src/db');
const bcrypt = require('bcryptjs');

const hash = bcrypt.hashSync('admin123', 10);
const result = db
  .prepare(
    "INSERT INTO users (name, email, password_hash, role, created_at, updated_at) VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))"
  )
  .run('Admin User', 'admin@example.com', hash, 'admin');

console.log('Admin user created successfully!');
console.log('Email: admin@example.com');
console.log('Password: admin123');
console.log('Role: admin');

