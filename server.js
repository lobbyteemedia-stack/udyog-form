// UDYOG form-filling service: fill free -> watermarked preview -> pay -> admin approves -> download PDF.
require('dotenv').config();
const express = require('express');
const path = require('path');
const crypto = require('crypto');
const store = require('./lib/store');
const { previewPagesHtml, PREVIEW_CSS, FIT_JS, renderFinalPdf, esc } = require('./lib/render');

const cfg = {
  port: +process.env.PORT || 3000,
  price: +process.env.PRICE || 100,
  site: process.env.SITE_NAME || 'উদ্যোগ ফরম সহায়তা',
  bkash: process.env.BKASH_NUMBER || '01744311005',
  nagad: process.env.NAGAD_NUMBER || '01744311005',
  adminUser: process.env.ADMIN_USER || 'admin',
  adminPass: process.env.ADMIN_PASS || '',
  keepDays: +process.env.KEEP_DAYS || 60,
};
if (!cfg.adminPass) console.warn('⚠️  ADMIN_PASS সেট করা নেই — .env ফাইলে একটি শক্ত পাসওয়ার্ড দিন।');

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));
app.get('/favicon.ico', (req, res) => res.redirect(301, '/favicon.svg'));
app.use(express.static(path.join(__dirname, 'public'), { index: 'index.html' }));

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const DISCLAIMER = `এটি বাংলাদেশ ব্যাংক বা কোনো সরকারি দপ্তরের ওয়েবসাইট নয়। এই সাইট শুধু "উদ্যোগ" কর্মসূচির আবেদন ফরম পূরণ ও PDF তৈরির একটি বেসরকারি সেবা।
সরকারি আবেদন বিনামূল্যে — পূরণ করা ফরম প্রিন্ট করে আপনার উপজেলার তফসিলি ব্যাংক শাখায় নিজে জমা দিতে হবে।`;

async function owner(req, res) {
  const a = await store.get(req.params.id);
  const tok = req.get('x-token') || req.query.t || req.body?.token;
  if (!store.checkToken(a, tok)) { res.status(404).send('পাওয়া যায়নি'); return null; }
  return a;
}

// ---------- Applicant API ----------
app.post('/api/applications', wrap(async (req, res) => {
  const a = await store.create(req.body.data || {});
  res.json({ id: a.id, token: a.token });
}));

app.put('/api/applications/:id', wrap(async (req, res) => {
  const a = await owner(req, res); if (!a) return;
  if (a.payment.status === 'approved') return res.status(409).json({ error: 'পেমেন্ট অনুমোদিত হওয়ার পর পরিবর্তন করা যাবে না।' });
  a.data = req.body.data || {};
  await store.save(a);
  res.json({ ok: true });
}));

app.get('/api/applications/:id', wrap(async (req, res) => {
  const a = await owner(req, res); if (!a) return;
  res.json({ data: a.data, payment: { status: a.payment.status, note: a.payment.note || '' } });
}));

app.post('/api/applications/:id/payment', wrap(async (req, res) => {
  const a = await owner(req, res); if (!a) return;
  const { method, sender, trxId } = req.body;
  if (!['বিকাশ', 'নগদ'].includes(method)) return res.status(400).json({ error: 'পেমেন্ট মাধ্যম বেছে নিন।' });
  if (!/^01[3-9]\d{8}$/.test(String(sender || '').trim())) return res.status(400).json({ error: 'যে নম্বর থেকে টাকা পাঠিয়েছেন সেটি সঠিকভাবে লিখুন (১১ ডিজিট)।' });
  if (!/^[A-Za-z0-9]{8,12}$/.test(String(trxId || '').trim())) return res.status(400).json({ error: 'ট্রানজেকশন আইডি (TrxID) সঠিক নয়।' });
  if (await store.trxUsed(trxId, a.id)) return res.status(400).json({ error: 'এই TrxID আগে ব্যবহার করা হয়েছে।' });
  if (a.payment.status === 'approved') return res.json({ status: 'approved' });
  a.payment = { status: 'pending', method, sender: sender.trim(), trxId: trxId.trim().toUpperCase(), amount: cfg.price, submittedAt: new Date().toISOString() };
  await store.save(a);
  res.json({ status: 'pending' });
}));

app.get('/api/config', (req, res) => res.json({ price: cfg.price, site: cfg.site, bkash: cfg.bkash, nagad: cfg.nagad, disclaimer: DISCLAIMER }));

// ---------- Watermarked preview ----------
app.get('/preview/:id', wrap(async (req, res) => {
  const a = await owner(req, res); if (!a) return;
  res.set('Cache-Control', 'no-store');
  res.send(`<!doctype html><html lang="bn"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>প্রিভিউ — ${esc(cfg.site)}</title><link rel="icon" href="/favicon.svg"><link rel="stylesheet" href="/style.css"><style>${PREVIEW_CSS}
.scaler{transform-origin:top left}</style></head>
<body oncontextmenu="return false" class="preview-body">
<header class="top"><div class="wrap"><b>${esc(cfg.site)}</b></div></header>
<div class="wrap">
  <div class="notice">${esc(DISCLAIMER).replace(/\n/g, '<br>')}</div>
  <div class="paybox" id="paybox"></div>
  <div class="actions-top"><a class="btn ghost" href="/?id=${a.id}#edit">← ফরম সম্পাদনা করুন</a></div>
  <div id="pages-outer"><div class="scaler" id="scaler">${previewPagesHtml(a.data)}</div></div>
</div>
<script>window.APP={id:${JSON.stringify(a.id)},token:${JSON.stringify(a.token)}};${FIT_JS}</script>
<script src="/preview.js"></script>
</body></html>`);
}));

// ---------- Paid download ----------
app.get('/download/:id', async (req, res) => {
  const a = await owner(req, res).catch(() => null); if (!a) return;
  if (a.payment.status !== 'approved') return res.status(402).send('পেমেন্ট অনুমোদনের পর ডাউনলোড করা যাবে।');
  try {
    const pdf = await renderFinalPdf(a.data);
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="UDYOG-Abedon-Form-${a.id.slice(0, 6)}.pdf"`, 'Cache-Control': 'no-store' });
    res.send(pdf);
  } catch (e) {
    console.error(e);
    res.status(500).send('PDF তৈরি করা যায়নি, একটু পরে আবার চেষ্টা করুন।');
  }
});

// ---------- Admin ----------
function adminAuth(req, res, next) {
  const [type, b64] = (req.get('authorization') || '').split(' ');
  const [u, p] = Buffer.from(b64 || '', 'base64').toString().split(':');
  const eq = (x, y) => { const a = Buffer.from(String(x)), b = Buffer.from(String(y)); return a.length === b.length && crypto.timingSafeEqual(a, b); };
  if (type === 'Basic' && cfg.adminPass && eq(u, cfg.adminUser) && eq(p, cfg.adminPass)) return next();
  res.set('WWW-Authenticate', 'Basic realm="admin"').status(401).send('লগইন প্রয়োজন');
}

app.get('/admin', adminAuth, wrap(async (req, res) => {
  const filter = req.query.f || 'pending';
  const apps = (await store.list()).filter((a) => filter === 'all' || a.payment.status === filter);
  const label = { unpaid: 'অপরিশোধিত', pending: 'যাচাই বাকি', approved: 'অনুমোদিত', rejected: 'বাতিল' };
  const rows = apps.map((a) => `<tr>
    <td>${esc(a.data.name_bn || a.data.name_en || '—')}<br><small>${esc(a.data.phone || '')}</small></td>
    <td>${esc(a.payment.method || '')}<br><small>${esc(a.payment.sender || '')}</small></td>
    <td><code>${esc(a.payment.trxId || '')}</code></td>
    <td><small>${esc(new Date(a.payment.submittedAt || a.updatedAt).toLocaleString('en-GB', { timeZone: 'Asia/Dhaka', dateStyle: 'short', timeStyle: 'short' }))}</small></td>
    <td><span class="st st-${a.payment.status}">${label[a.payment.status]}</span></td>
    <td class="btns">${a.payment.status === 'pending' ? `
      <form method="post" action="/admin/${a.id}/approve"><button class="btn small">অনুমোদন</button></form>
      <form method="post" action="/admin/${a.id}/reject"><input name="note" placeholder="কারণ" class="small-in"><button class="btn small danger">বাতিল</button></form>` : ''}
      <a class="btn small ghost" target="_blank" href="/preview/${a.id}?t=${a.token}">দেখুন</a></td></tr>`).join('');
  const tabs = ['pending', 'approved', 'rejected', 'unpaid', 'all'].map((f) =>
    `<a class="tab ${f === filter ? 'on' : ''}" href="/admin?f=${f}">${{ ...label, all: 'সব' }[f]}</a>`).join('');
  res.send(`<!doctype html><html lang="bn"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>অ্যাডমিন</title><link rel="icon" href="/favicon.svg"><link rel="stylesheet" href="/style.css"></head><body>
<header class="top"><div class="wrap"><b>${esc(cfg.site)} — অ্যাডমিন</b></div></header>
<div class="wrap"><p class="hint">বিকাশ/নগদ অ্যাপে TrxID ও টাকার পরিমাণ (৳${cfg.price}) মিলিয়ে তারপর অনুমোদন দিন।</p>
<div class="tabs">${tabs}</div>
<div class="table-wrap"><table class="admin"><tr><th>আবেদনকারী</th><th>মাধ্যম / নম্বর</th><th>TrxID</th><th>সময়</th><th>অবস্থা</th><th></th></tr>
${rows || '<tr><td colspan="6">কিছু নেই</td></tr>'}</table></div></div></body></html>`);
}));

app.post('/admin/:id/:action(approve|reject)', adminAuth, wrap(async (req, res) => {
  const a = await store.get(req.params.id);
  if (!a) return res.status(404).send('পাওয়া যায়নি');
  a.payment.status = req.params.action === 'approve' ? 'approved' : 'rejected';
  a.payment.note = req.params.action === 'reject' ? String(req.body.note || 'পেমেন্ট যাচাই করা যায়নি') : '';
  a.payment.reviewedAt = new Date().toISOString();
  await store.save(a);
  res.redirect('/admin');
}));

app.get('/healthz', (req, res) => res.send('ok'));
app.use((err, req, res, next) => { console.error(err); res.status(500).json({ error: 'সার্ভারে সমস্যা হয়েছে, আবার চেষ্টা করুন।' }); });

(async () => {
  await store.init();
  // Remove old personal data daily
  const purge = () => store.purgeOlderThan(cfg.keepDays).catch((e) => console.error('purge', e));
  setInterval(purge, 864e5).unref(); purge();
  app.listen(cfg.port, () => console.log(`চালু হয়েছে: http://localhost:${cfg.port}  (অ্যাডমিন: /admin)`));
})();
