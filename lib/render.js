// Renders the overlay HTML (preview with watermark, or print layer) and the final PDF.
const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');
const { buildBoxes } = require('./layout');

const ROOT = path.join(__dirname, '..');
const W = 595.32, H = 841.92, PAGES = 7;

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function fontFaces(inline) {
  const src = (f) => inline
    ? `url(data:font/woff2;base64,${fs.readFileSync(path.join(ROOT, 'public/fonts', f)).toString('base64')})`
    : `url(/fonts/${f})`;
  return `
  @font-face{font-family:BN;font-weight:400;src:${src('bn-400.woff2')}}
  @font-face{font-family:BN;font-weight:700;src:${src('bn-700.woff2')}}
  @font-face{font-family:LT;font-weight:400;src:${src('lat-400.woff2')}}
  @font-face{font-family:LT;font-weight:700;src:${src('lat-700.woff2')}}`;
}

// Shrinks each box's font until the text fits its cell.
const FIT_JS = `
document.fonts.ready.then(()=>{
  document.querySelectorAll('.f').forEach(d=>{
    let s=parseFloat(d.dataset.max); const inn=d.firstElementChild; inn.style.fontSize=s+'pt';
    const cs=getComputedStyle(d); const avail=d.clientHeight-parseFloat(cs.paddingTop)-parseFloat(cs.paddingBottom);
    while((inn.offsetHeight>avail||inn.scrollWidth>inn.clientWidth+1)&&s>5){s-=0.25;inn.style.fontSize=s+'pt';}
  });
  window.__fitted=true;
});`;

function pagesHtml(data, { background = false } = {}) {
  const boxes = buildBoxes(data);
  let out = '';
  for (let p = 1; p <= PAGES; p++) {
    const items = boxes.filter((b) => b.p === p).map((b) => {
      const pad = b.pad ?? 4;
      const style = `left:${b.x0}pt;top:${b.top}pt;width:${b.x1 - b.x0}pt;height:${b.bottom - b.top}pt;padding:${pad}pt ${pad + 1}pt;`;
      return `<div class="f${b.center ? ' c' : ''}" style="${style}" data-max="${b.size ?? b.maxsize ?? 9.5}"><div class="in"${b.bold ? ' style="font-weight:700"' : ''}>${esc(b.text)}</div></div>`;
    }).join('');
    const bg = background ? `<img class="bg" src="/form-bg/pg-${p}.png" alt="">` : '';
    const wm = background ? `<div class="wm">${'<span>নমুনা কপি • পেমেন্টের পর ডাউনলোড</span>'.repeat(14)}</div>` : '';
    out += `<div class="pg">${bg}${items}${wm}</div>`;
  }
  return out;
}

const BASE_CSS = `
html,body{margin:0;padding:0}
.pg{position:relative;width:${W}pt;height:${H}pt;overflow:hidden;background:#fff}
.f{position:absolute;box-sizing:border-box;font-family:LT,BN,sans-serif;color:#000;line-height:1.32;
   white-space:pre-wrap;overflow:hidden;display:flex;flex-direction:column;justify-content:center}
.f .in{width:100%}
.c .in{text-align:center}`;

// Layer printed on top of the official PDF (no background).
function printHtml(data) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>${fontFaces(true)}
  @page{size:${W}pt ${H}pt;margin:0}${BASE_CSS}.pg{page-break-after:always;background:transparent}</style></head>
  <body>${pagesHtml(data)}<script>${FIT_JS}</script></body></html>`;
}

// Watermarked on-screen preview (images + text; no PDF is sent to the browser).
function previewPagesHtml(data) {
  return pagesHtml(data, { background: true });
}

const PREVIEW_CSS = `${fontFaces(false)}${BASE_CSS}
.pg{margin:0 auto 18px;box-shadow:0 2px 12px rgba(0,0,0,.15);user-select:none;-webkit-user-select:none}
.pg .bg{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
.wm{position:absolute;inset:-30%;z-index:5;pointer-events:none;transform:rotate(-30deg);
  display:flex;flex-wrap:wrap;align-content:space-around;justify-content:space-around;gap:30pt 40pt}
.wm span{font-family:BN,sans-serif;font-weight:700;font-size:22pt;color:rgba(200,0,0,.17);white-space:nowrap}`;

let browserPromise = null;
function getBrowser() {
  if (!browserPromise) {
    const puppeteer = require('puppeteer');
    browserPromise = puppeteer.launch({
      headless: true,
      executablePath: process.env.CHROME_PATH || undefined,
      args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--no-zygote', '--disable-extensions'],
    }).catch((e) => { browserPromise = null; throw e; });
  }
  return browserPromise;
}

async function renderFinalPdf(data) {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(printHtml(data), { waitUntil: 'load' });
    await page.waitForFunction('window.__fitted === true', { timeout: 20000 });
    const overlay = await page.pdf({ width: `${W / 72}in`, height: `${H / 72}in`, preferCSSPageSize: true, printBackground: false, pageRanges: `1-${PAGES}` });
    const form = await PDFDocument.load(fs.readFileSync(path.join(ROOT, 'assets/form.pdf')));
    const ov = await PDFDocument.load(overlay);
    const embedded = await form.embedPdf(ov, ov.getPageIndices());
    form.getPages().forEach((p, i) => {
      if (embedded[i]) p.drawPage(embedded[i], { x: 0, y: 0, width: p.getWidth(), height: p.getHeight() });
    });
    return Buffer.from(await form.save());
  } finally {
    await page.close();
  }
}

module.exports = { previewPagesHtml, PREVIEW_CSS, FIT_JS, renderFinalPdf, esc };
