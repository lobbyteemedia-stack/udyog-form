// Preview page: scale A4 pages to screen, show payment box / download button.
(() => {
  const { id, token } = window.APP;
  const bn = (s) => String(s).replace(/[0-9]/g, (d) => '০১২৩৪৫৬৭৮৯'[d]);
  const box = document.getElementById('paybox');
  let cfg = {};

  function fit() {
    const outer = document.getElementById('pages-outer');
    const sc = document.getElementById('scaler');
    const pageW = 595.32 * 96 / 72;
    const s = Math.min(1, (outer.clientWidth - 4) / pageW);
    sc.style.transform = `scale(${s})`;
    sc.style.width = pageW + 'px';
    outer.style.height = sc.scrollHeight * s + 'px';
  }
  window.addEventListener('resize', fit);
  document.fonts.ready.then(fit);

  function payForm(note) {
    const nums = [cfg.bkash && `বিকাশ: <b>${cfg.bkash}</b>`, cfg.nagad && `নগদ: <b>${cfg.nagad}</b>`].filter(Boolean).join(' &nbsp;|&nbsp; ');
    box.innerHTML = `
      <h3>ডাউনলোডের জন্য ৳${bn(cfg.price)} পেমেন্ট করুন</h3>
      ${note ? `<div class="err">আগের পেমেন্ট বাতিল হয়েছে: ${note.replace(/</g, '&lt;')}</div>` : ''}
      <ol class="howto">
        <li>নিচের নম্বরে <b>৳${bn(cfg.price)} Send Money</b> করুন — ${nums || 'নম্বর সেট করা হয়নি'}</li>
        <li>যে নম্বর থেকে পাঠিয়েছেন সেটি ও ট্রানজেকশন আইডি (TrxID) নিচে লিখুন।</li>
        <li>যাচাইয়ের পর এই পেজেই ডাউনলোড বাটন আসবে। পেজটির লিংক সংরক্ষণ করে রাখুন।</li>
      </ol>
      <form id="pf" class="payform">
        <select name="method" required>${cfg.bkash ? '<option>বিকাশ</option>' : ''}${cfg.nagad ? '<option>নগদ</option>' : ''}</select>
        <input name="sender" inputmode="numeric" placeholder="যে নম্বর থেকে পাঠিয়েছেন (01XXXXXXXXX)" required>
        <input name="trxId" placeholder="TrxID (যেমন: 9JK4ABCD12)" required>
        <button class="btn">পেমেন্ট তথ্য জমা দিন</button>
        <div class="err" id="perr"></div>
      </form>`;
    document.getElementById('pf').onsubmit = async (e) => {
      e.preventDefault();
      const f = Object.fromEntries(new FormData(e.target));
      f.sender = f.sender.replace(/[০-৯]/g, (d) => '০১২৩৪৫৬৭৮৯'.indexOf(d)).replace(/\D/g, '');
      const r = await fetch(`/api/applications/${id}/payment`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-token': token }, body: JSON.stringify(f) });
      const j = await r.json();
      if (!r.ok) { document.getElementById('perr').textContent = j.error; return; }
      refresh();
    };
  }

  async function refresh() {
    const r = await fetch(`/api/applications/${id}`, { headers: { 'x-token': token } });
    if (!r.ok) { box.innerHTML = '<div class="err">আবেদন পাওয়া যায়নি।</div>'; return; }
    const { payment } = await r.json();
    if (payment.status === 'approved') {
      box.innerHTML = `<h3>✅ পেমেন্ট অনুমোদিত হয়েছে</h3><p>ওয়াটারমার্ক ছাড়া আবেদন ফরম ডাউনলোড করুন। যতবার খুশি ডাউনলোড করতে পারবেন।</p>
        <a class="btn big" href="/download/${id}?t=${token}">⬇ PDF ডাউনলোড করুন</a>
        <p class="hint">প্রিন্ট করে স্বাক্ষর ও ছবি দিয়ে আপনার উপজেলার তফসিলি ব্যাংক শাখায় জমা দিন।</p>`;
    } else if (payment.status === 'pending') {
      box.innerHTML = `<h3>⏳ পেমেন্ট যাচাই চলছে</h3><p>সাধারণত কিছুক্ষণের মধ্যেই অনুমোদন হয়। এই পেজটি খোলা রাখুন বা পরে এই লিংকে ফিরে আসুন — নিজে থেকে আপডেট হবে।</p>`;
      setTimeout(refresh, 20000);
    } else {
      payForm(payment.status === 'rejected' ? payment.note : '');
    }
  }

  fetch('/api/config').then((r) => r.json()).then((c) => { cfg = c; refresh(); });
})();
