// Films a level's known solution in the real game and writes a contact-sheet PNG.
// Usage: node tools/film.js <levelId> <outPng> [seconds] [every]
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const [id, out, secs = '12', every = '1'] = process.argv.slice(2);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 640, height: 400 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://127.0.0.1:8765/index.html', { waitUntil: 'load' });
  await page.addScriptTag({ path: path.join(__dirname, 'solutions.js') });
  await page.evaluate((id) => {
    const G = JJ.Game;
    const def = JJ.findLevel(id);
    G.openLevel(def);
    const sol = JJ_SOLUTIONS.SOL[id];
    G.design = JJ_SOLUTIONS.design(sol.rows);
    G.debugMem = {};
    G.debugCtl = sol.ctl;
    document.getElementById('bd-hint').hidden = true;
    G.go();
  }, id);
  const shots = [];
  const n = Math.round(+secs / +every);
  for (let k = 0; k <= n; k++) {
    const info = await page.evaluate(() => { const s = JJ.Game.sim; if (!s) return 'no sim'; const p = s.focus(); return 't=' + s.time.toFixed(1) + ' x=' + p.x.toFixed(1) + ' y=' + p.y.toFixed(1) + (s.status.won ? ' WON' : '') + (s.status.collected ? ' cap' : '') + ' br=' + s.status.broken; });
    shots.push({ img: (await page.screenshot()).toString('base64'), info });
    await page.waitForTimeout(+every * 1000);
  }
  const sheet = await browser.newPage({ viewport: { width: 1300, height: 400 } });
  await sheet.setContent('<body style="margin:0;background:#222"><canvas id="c"></canvas></body>');
  const buf = await sheet.evaluate(async (shots) => {
    const cols = 4, w = 320, h = 200;
    const rows = Math.ceil(shots.length / cols);
    const c = document.getElementById('c');
    c.width = cols * w; c.height = rows * h;
    const ctx = c.getContext('2d');
    for (let i = 0; i < shots.length; i++) {
      const im = new Image();
      im.src = 'data:image/png;base64,' + shots[i].img;
      await im.decode();
      const x = (i % cols) * w, y = Math.floor(i / cols) * h;
      ctx.drawImage(im, x, y, w, h);
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x, y + h - 18, w, 18);
      ctx.fillStyle = '#fff'; ctx.font = '12px monospace'; ctx.fillText(shots[i].info, x + 4, y + h - 5);
      ctx.strokeStyle = '#000'; ctx.strokeRect(x, y, w, h);
    }
    return c.toDataURL('image/png').split(',')[1];
  }, shots);
  require('fs').writeFileSync(out, Buffer.from(buf, 'base64'));
  if (errors.length) console.log('ERRORS', errors);
  console.log('wrote', out, shots[shots.length - 1].info);
  await browser.close();
})();
