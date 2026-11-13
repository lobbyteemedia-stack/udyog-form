// Multi-step UDYOG form. Free to fill; preview is watermarked; download after payment.
(() => {
  const BN = '০১২৩৪৫৬৭৮৯';
  const bn = (s) => String(s).replace(/[0-9]/g, (d) => BN[d]);
  const en = (s) => String(s ?? '').replace(/[০-৯]/g, (d) => BN.indexOf(d));
  const num = (v) => { const n = parseFloat(en(v).replace(/[^0-9.]/g, '')); return Number.isFinite(n) ? n : 0; };
  const money = (n) => {
    n = Math.round(n); if (!n) return '০';
    const s = String(n), l = s.slice(-3), r = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    return bn(r ? r + ',' + l : l);
  };

  const COST_HEADS = ['যন্ত্রপাতি ও সরঞ্জাম ক্রয়', 'কাঁচামাল ও উপকরণ', 'পরিচালন ব্যয়', 'প্রোটোটাইপ/নমুনা উন্নয়ন',
    'প্যাকেজিং, লেবেল ও ব্র্যান্ডিং', 'ব্যবসা নিবন্ধন, লাইসেন্স ও ছাড়পত্র', 'বিপণন ও প্রচার', 'কর্মীর মজুরি',
    'পরিবহন ও সরবরাহ', 'প্রযুক্তি, সফটওয়্যার ও ইন্টারনেট', 'প্রশিক্ষণ ও দক্ষতা উন্নয়ন', 'অন্যান্য'];
  const YN = ['না', 'হ্যাঁ'];
  const hasBiz = (d) => d.has_business === 'হ্যাঁ';

  const STEPS = [
    { t: 'ব্যক্তিগত তথ্য', f: [
      { k: 'name_bn', l: 'আবেদনকারীর নাম (বাংলায়)', req: 1 },
      { k: 'name_en', l: 'Name (English, Block Letters)', req: 1, upper: 1 },
      { k: 'father', l: 'পিতার নাম' }, { k: 'mother', l: 'মাতার নাম' },
      { k: 'nid', l: 'জাতীয় পরিচয়পত্র নম্বর', mode: 'numeric' },
      { k: 'dob', l: 'জন্ম তারিখ', ph: 'যেমন: ১৫ জুন ২০০৫' },
      { k: 'age', l: 'আবেদনের শেষ তারিখে বয়স', ph: 'যেমন: ২১ বছর ৫ মাস ১৫ দিন' },
      { k: 'marital', l: 'বৈবাহিক অবস্থা', type: 'select', opts: ['অবিবাহিত', 'বিবাহিত', 'তালাকপ্রাপ্ত', 'বিধবা/বিপত্নীক'] },
      { k: 'spouse_name', l: 'স্বামী/স্ত্রীর নাম', show: (d) => d.marital === 'বিবাহিত' },
      { k: 'spouse_nid', l: 'স্বামী/স্ত্রীর জাতীয় পরিচয়পত্র নম্বর', hint: 'না থাকলে লিখুন: "নেই" বা জন্ম নিবন্ধন নম্বর', show: (d) => d.marital === 'বিবাহিত' },
      { k: 'education', l: 'শিক্ষাগত যোগ্যতা (সর্বশেষ পরীক্ষা, বোর্ড/বিশ্ববিদ্যালয় ও সাল)', type: 'textarea' },
      { k: 'phone', l: 'ফোন নম্বর', req: 1, mode: 'tel' }, { k: 'phone2', l: 'বিকল্প ফোন নম্বর', mode: 'tel' },
      { k: 'email', l: 'ই-মেইল', mode: 'email' },
    ] },
    { t: 'অভিজ্ঞতা, ব্যাংক ও ঠিকানা', f: [
      { k: 'training', l: 'দক্ষতা উন্নয়নমূলক প্রশিক্ষণ (প্রতিষ্ঠান, কোর্স, মেয়াদ ও সাল)', type: 'textarea', hint: 'না থাকলে "নেই" লিখুন। থাকলে সনদের কপি সংযুক্ত করতে হবে।' },
      { k: 'experience', l: 'ব্যবসা/চাকরির অভিজ্ঞতা', type: 'textarea' },
      { k: 'bank_name', l: 'ব্যাংকের নাম' }, { k: 'bank_branch', l: 'শাখা' },
      { k: 'bank_type', l: 'হিসাবের ধরন', ph: 'যেমন: সঞ্চয়ী হিসাব' }, { k: 'bank_acc', l: 'হিসাব নম্বর', mode: 'numeric' },
      { k: 'loan', l: 'কোনো ব্যাংক/আর্থিক প্রতিষ্ঠানে বিদ্যমান ঋণ আছে?', type: 'select', opts: YN },
      { k: 'loan_details', l: 'ঋণের বিবরণ', type: 'textarea', show: (d) => d.loan === 'হ্যাঁ' },
      { k: 'present', l: '১৫. বর্তমান ঠিকানা (জাতীয় পরিচয়পত্র মোতাবেক)', type: 'address' },
      { k: 'perm_same', l: 'স্থায়ী ঠিকানা বর্তমান ঠিকানার মতোই', type: 'check' },
      { k: 'permanent', l: '১৬. স্থায়ী ঠিকানা', type: 'address', show: (d) => !d.perm_same },
    ] },
    { t: 'উদ্যোগ ও বাজার', f: [
      { k: 'idea', l: '০১. ব্যবসায়িক ধারণা/উদ্যোগের সংক্ষিপ্ত বিবরণ', type: 'textarea', words: 200, rows: 8, req: 1 },
      { k: 'buyers', l: '০২. সম্ভাব্য ক্রেতা' },
      { k: 'start_plan', l: '০৩. কত সময়ের মধ্যে ব্যবসা শুরুর পরিকল্পনা', type: 'textarea' },
      { k: 'biz_type', l: '০৪. ব্যবসার ধরন', type: 'select', opts: ['উৎপাদন', 'সেবা', 'ব্যবসা'] },
      { k: 'biz_type_detail', l: 'ধরনের বিবরণ', type: 'textarea' },
      { k: 'location', l: '০৫. সম্ভাব্য অবস্থান (গ্রাম/মহল্লা, ইউনিয়ন, উপজেলা)' },
      { k: 'product_type', l: '০৬. পণ্যের ধরন (আমদানির বিকল্প বা রপ্তানিযোগ্য কিনা)', type: 'textarea' },
      { k: 'raw_source', l: '০৭. কাঁচামালের উৎস', type: 'textarea' },
      { k: 'market', l: '০৮. পণ্যের বাজার (স্থানীয়/আন্তর্জাতিক)', type: 'textarea' },
      { k: 'sales_m', l: '০৯. সম্ভাব্য মাসিক বিক্রয় (টাকা)', mode: 'numeric', calc: 'sales' },
      { k: 'profit_m', l: '১০. সম্ভাব্য মাসিক লাভ (টাকা)', mode: 'numeric', calc: 'profit' },
      { k: 'risk_intro', l: '১১. ঝুঁকি — ভূমিকা', type: 'textarea' },
      { k: 'risks', l: 'ঝুঁকি ও মোকাবেলার পরিকল্পনা', type: 'list', cols: [['risk', 'ঝুঁকি'], ['plan', 'মোকাবেলা']], min: 3 },
      { k: 'emp_total', l: '১২. প্রথম বছরে মোট কর্মসংস্থান (জন)', mode: 'numeric', half: 1 },
      { k: 'emp_women', l: 'তন্মধ্যে নারী (জন)', mode: 'numeric', half: 1 },
      { k: 'emp_note', l: 'কর্মসংস্থান — মন্তব্য', type: 'textarea' },
      { k: 'market_position', l: '১৩. বাজারে পণ্যের অবস্থান — সংক্ষেপে', type: 'textarea' },
      { k: 'competitors', l: 'প্রতিযোগী প্রতিষ্ঠান (কমপক্ষে ৩টি)', type: 'list', cols: [['name', 'নাম'], ['desc', 'অবস্থান/বৈশিষ্ট্য']], min: 3 },
    ] },
    { t: 'চলমান ব্যবসা', f: [
      { k: 'has_business', l: 'বর্তমানে কোনো ব্যবসা পরিচালনা করছেন?', type: 'select', opts: ['না', 'হ্যাঁ'], hint: '"না" হলে এই অংশে "প্রযোজ্য নয়" বসবে।' },
      ...[
        ['name', '০১. ব্যবসা প্রতিষ্ঠানের নাম'], ['type', '০২. ব্যবসার ধরন ও বিবরণ', 'textarea'], ['start_date', '০৩. ব্যবসা শুরুর তারিখ'],
        ['trade_license', '০৪. ট্রেড লাইসেন্স (হ্যাঁ/না, ইস্যুর তারিখ ও নম্বর)'], ['avg_price', '০৫. পণ্য/সেবার গড় বিক্রয়মূল্য', 'textarea'],
        ['sales_m', '০৬. মাসিক বিক্রয় (টাকা)', 'num'], ['profit_m', '০৭. মাসিক লাভ (টাকা)', 'num'],
        ['monthly_costs', '০৮. বিভিন্ন খাতে মাসিক খরচ', 'textarea'], ['involvement', '০৯. উদ্যোক্তা কীভাবে ব্যবসার সাথে জড়িত', 'textarea'],
        ['investment', '১০. বিনিয়োগের পরিমাণ (টাকা)', 'num'], ['raw_source', '১১. কাঁচামালের উৎস', 'textarea'], ['area', '১২. বিপণন এলাকা'],
        ['market', '১৩. বাজারে অবস্থান ও প্রতিযোগী', 'textarea'], ['risks', '১৪. সমস্যা, ঝুঁকি ও মোকাবেলা', 'textarea'],
        ['emp_total', '১৫. কর্মী সংখ্যা (মোট)', 'num'], ['emp_women', 'তন্মধ্যে নারী', 'num'], ['expansion', '১৬. সম্প্রসারণ পরিকল্পনা', 'textarea'],
      ].map(([k, l, ty]) => ({ k: 'existing.' + k, l, type: ty === 'textarea' ? 'textarea' : undefined, mode: ty === 'num' ? 'numeric' : undefined, show: hasBiz })),
    ] },
    { t: 'অর্থায়ন ও ব্যয়', f: [
      { k: 'own_invest', l: '০২. নিজস্ব বিনিয়োগ (টাকা)', mode: 'numeric', half: 1 },
      { k: 'requested', l: '০৩. আবেদনকৃত অর্থায়ন (টাকা)', mode: 'numeric', req: 1, half: 1, hint: 'সর্বোচ্চ ২০,০০,০০০' },
      { k: 'loan_part', l: 'এর মধ্যে ঋণ অংশ (টাকা)', mode: 'numeric', half: 1, hint: 'বাকিটা অনুদান ধরা হবে' },
      { k: 'total_capital', l: '০১. প্রয়োজনীয় মোট মূলধন (টাকা)', mode: 'numeric', half: 1, hint: 'ফাঁকা রাখলে = নিজস্ব + অর্থায়ন' },
      { k: 'costs', l: 'খ. খাতভিত্তিক ব্যয় বিভাজন', type: 'costs' },
    ] },
    { t: 'অন্যান্য ও জমা', f: [
      { k: 'disability', l: '০১. শারীরিক প্রতিবন্ধকতা আছে?', type: 'select', opts: YN },
      { k: 'disability_type', l: 'থাকলে ধরন', show: (d) => d.disability === 'হ্যাঁ' },
      { k: 'ethnic', l: '০২. ক্ষুদ্র নৃগোষ্ঠীভুক্ত?', type: 'select', opts: YN },
      { k: 'other', l: '০৩. অন্যান্য', type: 'textarea' },
    ] },
  ];

  // ---------- state ----------
  const LS = 'udyog_draft_v1';
  let st = JSON.parse(localStorage.getItem(LS) || '{}');
  st.data = st.data || { marital: 'অবিবাহিত', loan: 'না', has_business: 'না', perm_same: true, disability: 'না', ethnic: 'না' };
  st.step = st.step || 0;
  const D = () => st.data;
  const get = (k) => k.split('.').reduce((o, p) => (o || {})[p], D());
  const set = (k, v) => { const ps = k.split('.'); let o = D(); ps.slice(0, -1).forEach((p) => { o[p] = o[p] || {}; o = o[p]; }); o[ps.at(-1)] = v; persist(); };
  const persist = () => { try { localStorage.setItem(LS, JSON.stringify(st)); } catch (e) {} };

  const $ = (s, el = document) => el.querySelector(s);
  const h = (tag, attrs = {}, ...kids) => {
    const el = document.createElement(tag);
    for (const [a, v] of Object.entries(attrs)) {
      if (a === 'on') Object.entries(v).forEach(([ev, fn]) => el.addEventListener(ev, fn));
      else if (a in el && a !== 'list') el[a] = v; else el.setAttribute(a, v);
    }
    kids.flat().forEach((k) => k != null && el.append(k));
    return el;
  };

  // ---------- rendering ----------
  function words(s) { return String(s || '').trim().split(/\s+/).filter(Boolean).length; }

  function field(f) {
    if (f.show && !f.show(D())) return null;
    const wrap = h('div', { className: 'fld' + (f.half ? ' half' : '') });
    const lab = h('label', {}, f.l, f.req ? h('span', { className: 'req' }, ' *') : null);
    wrap.append(lab);
    const v = get(f.k);

    if (f.type === 'address') {
      const A = v || {};
      const parts = [['house', 'বাড়ি/মহল্লার নং ও নাম'], ['road', 'রোড নং/এলাকা/গ্রাম'], ['post', 'ডাকঘর ও পোস্ট কোড'], ['thana', 'থানা/উপজেলা'], ['district', 'জেলা'], ['division', 'বিভাগ']];
      const grid = h('div', { className: 'grid2' });
      parts.forEach(([p, l]) => grid.append(h('div', { className: 'fld' }, h('label', { className: 'sub' }, l),
        h('input', { value: A[p] || '', on: { input: (e) => set(`${f.k}.${p}`, e.target.value) } }))));
      wrap.append(grid); return wrap;
    }
    if (f.type === 'check') {
      wrap.className = 'fld check';
      wrap.prepend(h('input', { type: 'checkbox', checked: !!v, id: f.k, on: { change: (e) => { set(f.k, e.target.checked); render(); } } }));
      lab.htmlFor = f.k; return wrap;
    }
    if (f.type === 'select') {
      const sel = h('select', { on: { change: (e) => { set(f.k, e.target.value); render(); } } },
        h('option', { value: '' }, '— নির্বাচন করুন —'), ...f.opts.map((o) => h('option', { value: o, selected: o === v }, o)));
      wrap.append(sel);
    } else if (f.type === 'list') {
      let rows = Array.isArray(v) ? v : [];
      while (rows.length < (f.min || 1)) rows.push({});
      set(f.k, rows);
      const box = h('div', { className: 'listbox' });
      rows.forEach((r, i) => {
        const row = h('div', { className: 'lrow' },
          ...f.cols.map(([c, cl]) => h('div', { className: 'fld' }, h('label', { className: 'sub' }, cl),
            h('input', { value: r[c] || '', on: { input: (e) => { rows[i][c] = e.target.value; set(f.k, rows); } } }))),
          h('button', { type: 'button', className: 'x', title: 'মুছুন', on: { click: () => { rows.splice(i, 1); set(f.k, rows); render(); } } }, '×'));
        box.append(row);
      });
      box.append(h('button', { type: 'button', className: 'add', on: { click: () => { rows.push({}); set(f.k, rows); render(); } } }, '+ সারি যোগ করুন'));
      wrap.append(box); return wrap;
    } else if (f.type === 'costs') {
      wrap.append(costsTable()); return wrap;
    } else if (f.type === 'textarea') {
      const ta = h('textarea', { rows: f.rows || 3, value: v || '', placeholder: f.ph || '' });
      const counter = f.words ? h('div', { className: 'counter' }) : null;
      const upd = () => { if (counter) { const n = words(ta.value); counter.textContent = `শব্দ: ${bn(n)} / ${bn(f.words)}`; counter.classList.toggle('over', n > f.words); } };
      ta.addEventListener('input', () => { set(f.k, ta.value); upd(); });
      upd(); wrap.append(ta); if (counter) wrap.append(counter);
    } else {
      const inp = h('input', { value: v || '', placeholder: f.ph || '', inputMode: f.mode === 'tel' || f.mode === 'numeric' ? 'numeric' : 'text', type: f.mode === 'email' ? 'email' : 'text' });
      inp.addEventListener('input', () => { if (f.upper) inp.value = inp.value.toUpperCase(); set(f.k, inp.value); if (f.calc) calcLine(f, wrap); });
      wrap.append(inp);
      if (f.calc) calcLine(f, wrap);
    }
    if (f.hint) wrap.append(h('div', { className: 'hint' }, f.hint));
    return wrap;
  }

  function calcLine(f, wrap) {
    let el = $('.calc', wrap);
    if (!el) { el = h('div', { className: 'calc' }); wrap.append(el); }
    const m = num(get(f.k));
    el.textContent = m ? `ত্রৈমাসিক: ${money(m * 3)} • বার্ষিক: ${money(m * 12)}` : 'মাসিক লিখলে ত্রৈমাসিক ও বার্ষিক নিজে থেকে হিসাব হবে।';
  }

  function costsTable() {
    let costs = Array.isArray(D().costs) ? D().costs : [];
    COST_HEADS.forEach((_, i) => { costs[i] = costs[i] || {}; });
    set('costs', costs);
    const box = h('div', { className: 'costs' });
    const total = h('div', { className: 'total' });
    const upd = () => {
      const sum = costs.reduce((s, c) => s + num(c.amount), 0);
      const req = num(D().requested), own = num(D().own_invest);
      const target = num(D().total_capital) || req + own;
      const diff = target - sum;
      total.innerHTML = `<b>সর্বমোট: ৳${money(sum)}</b><br><span class="${diff === 0 ? 'ok' : 'warn'}">মোট মূলধন ৳${money(target)} — ${diff === 0 ? 'মিলেছে ✓' : 'পার্থক্য ৳' + money(Math.abs(diff))}</span>`;
    };
    COST_HEADS.forEach((head, i) => {
      const c = costs[i];
      box.append(h('div', { className: 'crow' },
        h('div', { className: 'chead' }, `${bn(String(i + 1).padStart(2, '0'))}  ${head}`),
        h('div', { className: 'grid3' },
          h('div', { className: 'fld' }, h('label', { className: 'sub' }, 'বিবরণ'), h('input', { value: c.desc || '', on: { input: (e) => { c.desc = e.target.value; set('costs', costs); } } })),
          h('div', { className: 'fld' }, h('label', { className: 'sub' }, 'টাকা'), h('input', { value: c.amount || '', inputMode: 'numeric', on: { input: (e) => { c.amount = e.target.value; set('costs', costs); upd(); } } })),
          h('div', { className: 'fld' }, h('label', { className: 'sub' }, 'অর্থের উৎস'), h('input', { value: c.source || '', placeholder: 'উদ্যোগ ঋণ ও অনুদান', on: { input: (e) => { c.source = e.target.value; set('costs', costs); } } })))));
    });
    box.append(total); upd();
    return box;
  }

  function render() {
    const form = $('#form');
    form.innerHTML = '';
    const S = STEPS[st.step];
    form.append(h('h2', {}, S.t), h('div', { className: 'flds' }, ...S.f.map(field)));
    if (st.step === STEPS.length - 1) {
      form.append(h('div', { className: 'submit-box' },
        h('p', {}, 'জমা দিলে আপনার পূরণ করা ফরমের একটি নমুনা (ওয়াটারমার্কসহ) দেখাবে। সব ঠিক থাকলে পেমেন্ট করে ওয়াটারমার্ক ছাড়া PDF ডাউনলোড করতে পারবেন।'),
        h('button', { type: 'button', className: 'btn big', on: { click: submit } }, 'জমা দিন ও প্রিভিউ দেখুন')));
    }
    // progress
    const pct = Math.round((st.step / STEPS.length) * 100);
    $('#pct').textContent = bn(pct) + '%';
    $('#bar').style.width = pct + '%';
    const steps = $('#steps'); steps.innerHTML = '';
    STEPS.forEach((s, i) => steps.append(h('button', { type: 'button', className: 'chip' + (i === st.step ? ' on' : i < st.step ? ' done' : ''), on: { click: () => go(i) } },
      h('span', { className: 'n' }, i < st.step ? '✓' : bn(i + 1)), s.t)));
    $('.chip.on')?.scrollIntoView({ inline: 'center', block: 'nearest' });
    $('#prev').style.visibility = st.step ? 'visible' : 'hidden';
    $('#next').style.display = st.step === STEPS.length - 1 ? 'none' : '';
  }

  function go(i) { st.step = Math.max(0, Math.min(STEPS.length - 1, i)); persist(); render(); window.scrollTo({ top: 0 }); }

  async function submit(ev) {
    const missing = STEPS.flatMap((s, si) => s.f.filter((f) => f.req && !(f.show && !f.show(D())) && !String(get(f.k) || '').trim()).map((f) => ({ si, l: f.l })));
    if (missing.length) { alert('এগুলো পূরণ করুন:\n• ' + missing.map((m) => m.l).join('\n• ')); go(missing[0].si); return; }
    const btn = ev.target; btn.disabled = true; btn.textContent = 'সংরক্ষণ হচ্ছে...';
    try {
      let res;
      if (st.id && st.token) {
        res = await fetch(`/api/applications/${st.id}`, { method: 'PUT', headers: { 'content-type': 'application/json', 'x-token': st.token }, body: JSON.stringify({ data: D() }) });
        if (res.status === 404) { st.id = st.token = null; }
        else if (res.status === 409) {
          if (!confirm('এই আবেদনের পেমেন্ট আগেই অনুমোদিত হয়েছে, তাই এটি আর পরিবর্তন করা যাবে না।\nপরিবর্তিত তথ্য দিয়ে নতুন আবেদন হিসেবে জমা দিতে চান? (নতুন করে পেমেন্ট লাগবে)')) { location.href = `/preview/${st.id}?t=${st.token}`; return; }
          st.id = st.token = null;
        }
        else if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j.error || 'সংরক্ষণ হয়নি'); }
      }
      if (!st.id) {
        res = await fetch('/api/applications', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ data: D() }) });
        const j = await res.json(); st.id = j.id; st.token = j.token;
      }
      persist();
      location.href = `/preview/${st.id}?t=${st.token}`;
    } catch (e) { alert(e.message); btn.disabled = false; btn.textContent = 'জমা দিন ও প্রিভিউ দেখুন'; }
  }

  $('#prev').onclick = () => go(st.step - 1);
  $('#next').onclick = () => go(st.step + 1);

  fetch('/api/config').then((r) => r.json()).then((c) => {
    $('#site-name').textContent = c.site; document.title = c.site;
    $('#disclaimer').innerHTML = c.disclaimer.replace(/</g, '&lt;').replace(/\n/g, '<br>');
  });
  render();
})();
