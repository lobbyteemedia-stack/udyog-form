// Storage: Postgres when DATABASE_URL is set (needed on free hosts whose disk resets),
// otherwise one JSON file per application in data/apps/.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const newIds = () => ({ id: crypto.randomBytes(8).toString('hex'), token: crypto.randomBytes(24).toString('hex') });
const validId = (id) => /^[a-f0-9]{16}$/.test(String(id));

// ---------- file backend ----------
function fileBackend() {
  const DIR = path.join(__dirname, '..', 'data', 'apps');
  fs.mkdirSync(DIR, { recursive: true });
  const file = (id) => path.join(DIR, `${id}.json`);
  return {
    async init() {},
    async get(id) { return validId(id) && fs.existsSync(file(id)) ? JSON.parse(fs.readFileSync(file(id), 'utf8')) : null; },
    async put(app) { const tmp = file(app.id) + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(app)); fs.renameSync(tmp, file(app.id)); },
    async all() { return fs.readdirSync(DIR).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'))); },
    async del(id) { if (validId(id) && fs.existsSync(file(id))) fs.unlinkSync(file(id)); },
  };
}

// ---------- postgres backend ----------
function pgBackend(url) {
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: url, ssl: /localhost|127\.0\.0\.1/.test(url) ? false : { rejectUnauthorized: false }, max: 4 });
  return {
    async init() { await pool.query('CREATE TABLE IF NOT EXISTS apps (id text PRIMARY KEY, doc jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now())'); },
    async get(id) { if (!validId(id)) return null; const r = await pool.query('SELECT doc FROM apps WHERE id=$1', [id]); return r.rows[0]?.doc || null; },
    async put(app) { await pool.query('INSERT INTO apps (id, doc, updated_at) VALUES ($1,$2,now()) ON CONFLICT (id) DO UPDATE SET doc=EXCLUDED.doc, updated_at=now()', [app.id, app]); },
    async all() { return (await pool.query('SELECT doc FROM apps ORDER BY updated_at DESC LIMIT 2000')).rows.map((r) => r.doc); },
    async del(id) { await pool.query('DELETE FROM apps WHERE id=$1', [id]); },
  };
}

const B = process.env.DATABASE_URL ? pgBackend(process.env.DATABASE_URL) : fileBackend();
console.log('স্টোরেজ:', process.env.DATABASE_URL ? 'Postgres ডেটাবেস' : 'লোকাল ফাইল (data/apps)');

async function create(data) {
  const now = new Date().toISOString();
  const app = { ...newIds(), data, payment: { status: 'unpaid' }, createdAt: now, updatedAt: now };
  await B.put(app);
  return app;
}
const get = (id) => B.get(id);
async function save(app) { app.updatedAt = new Date().toISOString(); await B.put(app); }
async function list() {
  return (await B.all()).sort((a, b) => (b.payment.submittedAt || b.updatedAt).localeCompare(a.payment.submittedAt || a.updatedAt));
}
async function trxUsed(trxId, exceptId) {
  const norm = String(trxId).trim().toUpperCase();
  return (await B.all()).some((a) => a.id !== exceptId && a.payment.trxId && a.payment.trxId.toUpperCase() === norm && a.payment.status !== 'rejected');
}
async function purgeOlderThan(days) {
  const cutoff = Date.now() - days * 864e5;
  for (const a of await B.all()) if (Date.parse(a.updatedAt) < cutoff) await B.del(a.id);
}
const checkToken = (app, token) =>
  !!app && !!token && app.token.length === String(token).length &&
  crypto.timingSafeEqual(Buffer.from(app.token), Buffer.from(String(token)));

module.exports = { init: () => B.init(), create, get, save, list, trxUsed, purgeOlderThan, checkToken };
