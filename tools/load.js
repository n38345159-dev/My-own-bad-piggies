// Loads the game's DOM-free modules into Node for headless testing.
const path = require('path');
const fs = require('fs');
const vm = require('vm');
const root = path.join(__dirname, '..');
globalThis.planck = require(path.join(root, 'js/lib/planck.min.js'));
for (const f of ['util.js', 'parts.js', 'level.js', 'sim.js', 'levels.js']) {
  const p = path.join(root, 'js', f);
  if (!fs.existsSync(p)) continue;
  vm.runInThisContext(fs.readFileSync(p, 'utf8'), { filename: p });
}
module.exports = globalThis.JJ;
