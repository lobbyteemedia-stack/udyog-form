// Maps application data -> text boxes on the official UDYOG form.
// Coordinates are PDF points (A4: 595.32 x 841.92), top-left origin.

const BN_DIGITS = '০১২৩৪৫৬৭৮৯';
const toBnDigits = (s) => String(s ?? '').replace(/[0-9]/g, (d) => BN_DIGITS[d]);
const toEnDigits = (s) => String(s ?? '').replace(/[০-৯]/g, (d) => String(BN_DIGITS.indexOf(d)));

function num(v) {
  const n = parseFloat(toEnDigits(v).replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

// Bangladeshi grouping (১২,৩৪,৫৬৭) in Bengali digits
function money(v) {
  const n = Math.round(num(v));
  if (!n) return '';
  const s = String(n);
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return toBnDigits(rest ? rest + ',' + last3 : last3);
}

const t = (v) => String(v ?? '').trim();

function addrText(a = {}) {
  return ['house', 'road', 'post', 'thana', 'district', 'division'].map((k) => t(a[k]));
}

function buildBoxes(d) {
  const B = [];
  const box = (p, x0, top, x1, bottom, text, o = {}) => {
    if (t(text)) B.push({ p, x0, top, x1, bottom, text: t(text), ...o });
  };

  // ---------- Page 1: Part-1 personal ----------
  box(1, 284, 441, 559, 481, d.name_bn, { size: 12, bold: true });
  box(1, 284, 481, 559, 520, t(d.name_en).toUpperCase(), { size: 12, bold: true });
  box(1, 207, 520, 559, 540, d.father, { size: 10.5 });
  box(1, 207, 540, 559, 564, d.mother, { size: 10.5 });
  box(1, 207, 564, 559, 584, d.nid, { size: 11 });
  const dobLines = [d.dob && `জন্ম তারিখ: ${t(d.dob)}`, d.age && `আবেদনের শেষ তারিখে বয়স: ${t(d.age)}`].filter(Boolean).join('\n');
  box(1, 207, 584, 559, 625, dobLines, { size: 10 });
  box(1, 207, 625, 559, 645, d.marital, { size: 10.5 });
  if (d.marital === 'বিবাহিত') {
    box(1, 207, 645, 559, 684, d.spouse_name, { size: 10.5 });
    box(1, 207, 684, 559, 707, d.spouse_nid, { size: 10 });
  }
  box(1, 207, 707, 559, 743, d.education);
  box(1, 207, 743, 559, 767, [t(d.phone), t(d.phone2)].filter(Boolean).join('  /  '), { size: 10.5 });
  box(1, 207, 767, 559, 787, d.email, { size: 10.5 });

  // ---------- Page 2 ----------
  box(2, 207, 28, 559, 99, d.training || 'নেই', { size: 10 });
  box(2, 207, 99, 559, 217, d.experience || 'নেই', { size: 10 });
  if (t(d.bank_name)) {
    const bank = [
      `ব্যাংকের নাম: ${t(d.bank_name)}`,
      `শাখা: ${t(d.bank_branch) || '..............................................'}`,
      `হিসাবের ধরন: ${t(d.bank_type) || '..............................................'}`,
      `হিসাব নম্বর: ${t(d.bank_acc) || '..............................................'}`,
    ].join('\n\n');
    box(2, 207, 240, 559, 336, bank, { size: 9.5 });
  }
  box(2, 207, 336, 559, 433,
    d.loan === 'হ্যাঁ' ? `হ্যাঁ। ${t(d.loan_details)}` : 'না। কোনো ব্যাংক/আর্থিক প্রতিষ্ঠানে বিদ্যমান ঋণ নেই।', { size: 10 });
  const cols = [[37, 120], [120, 220], [220, 298], [298, 387], [387, 470], [470, 559]];
  const pres = addrText(d.present);
  const perm = d.perm_same ? pres : addrText(d.permanent);
  cols.forEach(([x0, x1], i) => {
    box(2, x0, 497, x1, 566, pres[i], { size: 10, center: true });
    box(2, x0, 629, x1, 697, perm[i], { size: 10, center: true });
  });

  // ---------- Page 3: Part-2 ----------
  box(3, 203, 82, 559, 382, d.idea, { maxsize: 10.5 });
  box(3, 203, 382, 559, 402, d.buyers);
  box(3, 203, 402, 559, 442, d.start_plan);
  box(3, 203, 442, 559, 506, [t(d.biz_type) && t(d.biz_type) + '।', t(d.biz_type_detail)].filter(Boolean).join('\n'));
  box(3, 203, 506, 559, 571, d.location, { maxsize: 10 });
  box(3, 203, 571, 559, 624, d.product_type);
  box(3, 203, 624, 559, 662, d.raw_source);
  box(3, 203, 662, 559, 701, d.market);
  const sm = num(d.sales_m), pm = num(d.profit_m);
  [[203, 313, sm], [313, 433, sm * 3], [433, 559, sm * 12]].forEach(([a, b, v]) => box(3, a, 722, b, 745, money(v), { size: 10, center: true }));
  [[203, 313, pm], [313, 433, pm * 3], [433, 559, pm * 12]].forEach(([a, b, v]) => box(3, a, 766, b, 789, money(v), { size: 10, center: true }));

  // ---------- Page 4: Part-2 cont. ----------
  const risks = (d.risks || []).filter((r) => t(r.risk))
    .map((r, i) => `${toBnDigits(i + 1)}. ${t(r.risk)}${t(r.plan) ? ' — ' + t(r.plan) : ''}`).join('\n');
  box(4, 203, 29, 559, 126, [t(d.risk_intro), risks].filter(Boolean).join('\n'));
  const emp = [
    (t(d.emp_total) || t(d.emp_women)) && `মোট ${toBnDigits(t(d.emp_total) || '...')} জন, তন্মধ্যে নারী ${toBnDigits(t(d.emp_women) || '০')} জন।`,
    t(d.emp_note),
  ].filter(Boolean).join('\n');
  box(4, 203, 126, 559, 178, emp);
  const comps = (d.competitors || []).filter((c) => t(c.name))
    .map((c, i) => `${toBnDigits(i + 1)}. ${t(c.name)}${t(c.desc) ? ' — ' + t(c.desc) : ''}`).join('\n');
  box(4, 203, 178, 559, 319,
    [t(d.market_position) && `বাজারে অবস্থান: ${t(d.market_position)}`, comps && `সম্ভাব্য প্রতিযোগী প্রতিষ্ঠান:\n${comps}`].filter(Boolean).join('\n\n'));

  // ---------- Part-3 (existing business) ----------
  const e = d.existing || {};
  if (d.has_business !== 'হ্যাঁ') {
    box(4, 203, 356, 559, 379, 'প্রযোজ্য নয় — নতুন উদ্যোগ (বর্তমানে কোনো ব্যবসা পরিচালনা করছি না)', { size: 9.5 });
  } else {
    box(4, 203, 356, 559, 379, e.name, { size: 10 });
    box(4, 203, 379, 559, 431, e.type);
    box(4, 203, 431, 559, 455, e.start_date, { size: 10 });
    box(4, 203, 455, 559, 507, e.trade_license);
    box(4, 203, 507, 559, 581, e.avg_price);
    const es = num(e.sales_m), ep = num(e.profit_m);
    [[203, 306, es], [306, 430, es * 3], [430, 559, es * 12]].forEach(([a, b, v]) => box(4, a, 601, b, 625, money(v), { size: 10, center: true }));
    [[203, 306, ep], [306, 430, ep * 3], [430, 559, ep * 12]].forEach(([a, b, v]) => box(4, a, 645, b, 670, money(v), { size: 10, center: true }));
    box(4, 203, 670, 559, 754, e.monthly_costs);
    box(5, 203, 28, 559, 117, e.involvement);
    box(5, 203, 117, 559, 153, e.investment && money(e.investment) + ' টাকা', { size: 10 });
    box(5, 203, 153, 559, 207, e.raw_source);
    box(5, 203, 207, 559, 228, e.area);
    box(5, 203, 228, 559, 368, e.market);
    box(5, 203, 368, 559, 502, e.risks);
    box(5, 203, 502, 559, 558, (t(e.emp_total) || t(e.emp_women)) ? `মোট ${toBnDigits(t(e.emp_total))} জন, তন্মধ্যে নারী ${toBnDigits(t(e.emp_women) || '০')} জন` : '');
    box(5, 203, 558, 559, 759, e.expansion);
  }

  // ---------- Page 6: Part-4 financing ----------
  const costs = d.costs || [];
  const costTotal = costs.reduce((s, c) => s + num(c && c.amount), 0);
  const own = num(d.own_invest), req = num(d.requested), loan = num(d.loan_part);
  const totalCap = num(d.total_capital) || own + req;
  box(6, 314, 120, 554, 137, money(totalCap), { size: 10 });
  box(6, 314, 137, 554, 155, money(own), { size: 10 });
  box(6, 314, 155, 554, 172, req ? money(req) + (loan ? ` (ঋণ ${money(loan)} + অনুদান ${money(Math.max(req - loan, 0))})` : '') : '', { size: 10 });
  for (let i = 0; i < 12; i++) {
    const c = costs[i] || {};
    const top = 218 + i * 17.25;
    box(6, 234, top, 362, top + 17.2, c.desc, { maxsize: 8, pad: 1.5 });
    box(6, 362, top, 471, top + 17.2, money(c.amount), { size: 8.5, center: true, pad: 1.5 });
    if (num(c.amount)) box(6, 471, top, 559, top + 17.2, c.source || 'উদ্যোগ ঋণ ও অনুদান', { maxsize: 7, center: true, pad: 1.5 });
  }
  box(6, 362, 425, 471, 443, money(costTotal), { size: 9, center: true, bold: true, pad: 1.5 });

  // ---------- Page 7: Part-5 ----------
  box(7, 319, 80, 559, 102, d.disability === 'হ্যাঁ' ? `হ্যাঁ — ${t(d.disability_type)}` : d.disability, { maxsize: 9, pad: 2 });
  box(7, 319, 102, 559, 125, d.ethnic, { maxsize: 9, pad: 2 });
  box(7, 319, 125, 559, 147, d.other, { maxsize: 7.5, pad: 2 });

  return B;
}

module.exports = { buildBoxes, money, num, toBnDigits, toEnDigits };
