// Tests for the WhatsApp paste-to-fill parser and the features box. Run: node test/parse.test.mjs
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const G = createRequire(import.meta.url)('../../admin/lhgen.js');
const cases = [];
function t(name, text, expect) { cases.push([name, text, expect]); }

t('Luke M4 example (iPad copy)', `#5081 BMW M4 Coupe Competition
Year - 2022
Mileage - 32,000 KM
Grade - 4.5B
Asking price - RM428,000

✅Carbon interior package
✅360 surround camera
✅Memory seats
✅Full electric seats
✅Blind spot monitor 
✅Multifunction steering
✅Carbon roof
✅Head up display
✅Harmon Kardon sound system`, { ref: '5081', make: 'BMW', model: 'M4 Coupe Competition', year: 2022, mileage: '32,000', unit: 'km', grade: '4.5B', price: 428000, featsN: 9, feat0: 'Carbon interior package', unused: 0 });

t('Android copy: *bold*, ~struck old price~, CRLF, emoji keys', '*#7619 Honda Civic Type R FL5*\r\n📅 *Year* : 2025\r\n🛣️ Mileage : 17,500km\r\n⭐ Grade : 4.5A\r\n💰 Asking price : ~RM298,000~ *RM288,000*\r\n✔️ Honda Sensing\r\n✔️ Brembo brakes', { ref: '7619', make: 'Honda', model: 'Civic Type R FL5', year: 2025, mileage: '17,500', price: 288000, grade: '4.5A', featsN: 2, feat0: 'Honda Sensing' });

t('struck price on its own line, new price below', `#0368 Ferrari 296 GTB
Asking price -
~RM1,650,000~
Now RM1,568,000
Mileage - 5,700 miles`, { ref: '0368', make: 'Ferrari', price: 1568000, mileage: '5,700', unit: 'mi' });

t('value broken onto the next line + odd unicode spaces/zero-width', '#4183\u00A0BMW M3 Competition\nYear\u200B -\n2022\nMileage -\n29,586 KM\nAsking price - RM 438,000.00', { ref: '4183', make: 'BMW', model: 'M3 Competition', year: 2022, mileage: '29,586', price: 438000 });

t('k / mil shorthand and Enquire', `Lamborghini Urus 2022
Mileage: 18k km
Price: RM1.29mil`, { make: 'Lamborghini', model: 'Urus 2022', mileage: '18,000', price: 1290000, ref: undefined });

t('price on request', `#2012 Rolls Royce Ghost
Asking price - Enquire`, { make: 'Rolls-Royce', model: 'Ghost', poa: true, price: undefined });

t('features section without ticks, bullets, numbered emoji and U+2028 line breaks', '🚗🔥 #8877 Porsche Cayenne Coupe\u2028Colour - Grey\u2028Features:\u2028Sunroof\u2028• Sport Chrono package\u20281️⃣ Memory seats\u2028- Full electric seats', { ref: '8877', make: 'Porsche', colour: 'Grey', featsN: 4, feat0: 'Sunroof', feat2: 'Memory seats', feat3: 'Full electric seats' });

t('two strikethrough prices on one line keeps the last real price', 'Asking price - ~RM500,000~ ~RM480,000~ RM468,000', { price: 468000 });

let pass = 0;
for (const [name, text, e] of cases) {
  const r = G.parseWhatsApp(text);
  try {
    for (const k of ['ref', 'make', 'model', 'year', 'mileage', 'unit', 'grade', 'price', 'colour', 'poa']) if (k in e) assert.deepEqual(r[k], e[k], k);
    if ('featsN' in e) assert.equal(r.feats.length, e.featsN, 'feature count ' + JSON.stringify(r.feats));
    for (const i of [0, 1, 2, 3]) if ('feat' + i in e) assert.equal(r.feats[i], e['feat' + i]);
    if ('unused' in e) assert.equal(r.unused.length, e.unused, 'unused ' + JSON.stringify(r.unused));
    assert.ok(r.feats.every(f => !/[✅✔*~]/.test(f)), 'emoji/markup left in features');
    pass++; console.log('PASS', name);
  } catch (err) { console.log('FAIL', name, '-', err.message, JSON.stringify(r)); process.exitCode = 1; }
}
// features box: pasted ✅ block
assert.deepEqual(G.parseFeatures('✅Carbon roof\n\n✅ Head up display \r\n*✔️ Memory seats*\n'), ['Carbon roof', 'Head up display', 'Memory seats']); console.log('PASS features box strips ✅/✔️/bold and blank lines');
assert.equal(G.parsePrice('RM 1,568,000'), 1568000); assert.equal(G.parsePrice('~RM9~ RM 99,000'), 99000); assert.equal(G.parsePrice('Enquire'), null); console.log('PASS parsePrice');
console.log(pass + '/' + cases.length + ' paste cases passed');
