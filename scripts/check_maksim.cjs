// Unit checks run without sending submissions or touching browser storage.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'maksim-2026-09-20-490f07/index.html'), 'utf8');
const ids = [...html.matchAll(/data-k="([^"]+)"/g)].map(m => m[1]);
assert.equal((html.match(/class="exercise"/g) || []).length, 3);
assert.equal(ids.length, 10);
assert.equal(new Set(ids).size, ids.length);
function element(id) {
  return { id, dataset: {}, value: '', hidden: true, textContent: '', events: {},
    addEventListener(type, fn) { this.events[type] = fn; },
    setAttribute(name, value) { this[name] = value; },
    removeAttribute(name) { delete this[name]; }
  };
}
const nodes = {};
for (const id of [...ids, ...ids.map(id => 'feedback-' + id), 'sheet', 'checkAll', 'checkStatus', 'hwSend', 'printCopy']) nodes[id] = element(id);
const fields = ids.map(id => Object.assign(nodes[id], { dataset: { k: id } }));
nodes.sheet.querySelectorAll = () => fields;
const groups = [fields.slice(0, 4), fields.slice(4, 7), fields.slice(7)];
const buttons = groups.map(group => Object.assign(element('check'), { closest: () => ({ querySelectorAll: () => group }) }));
const drafts = { 'hw-maksim-2026-09-19-english': JSON.stringify({d1:'old answer',d2:'receipt',p14:'keep old free text'}), 'hw-maksim-2026-09-20-english': JSON.stringify({d1:'new answer',w1:'want'}) };
const originalOld = drafts['hw-maksim-2026-09-19-english'];
let sends = 0;
vm.runInNewContext(fs.readFileSync(path.join(root, 'assets/maksim-homework.js'), 'utf8'), {
  document: { getElementById: id => nodes[id], querySelectorAll: sel => sel === '[data-check]' ? buttons : sel === '[data-k]' ? fields : [] },
  localStorage: { getItem: key => drafts[key], setItem: (key, value) => drafts[key] = value },
  window: { hwSend() { sends++; }, print() {} }
});
assert.deepEqual(JSON.parse(drafts['hw-maksim-2026-09-20-english']), {d1:'new answer',d2:'receipt',w1:'want'});
assert.equal(drafts['hw-maksim-2026-09-19-english'], originalOld);
nodes.d1.value = 'receipt'; nodes.d2.value = ' RECEIPT. '; nodes.w3.value = 'WON’T';
nodes.r1.value = 'I sent my teacher a few songs.';
nodes.s1.value = 'I am afraid you will not get the job.';
buttons[0].events.click();
assert.equal(nodes['feedback-d1'].textContent, 'Correct answer: prescription');
assert.equal(nodes['feedback-d2'].dataset.result, 'correct');
assert.equal(nodes['feedback-r1'].dataset.result, 'correct');
assert.equal(nodes['feedback-w1'].hidden, true);
nodes.checkAll.events.click();
assert.equal(sends, 0);
assert.equal(nodes['feedback-w3'].dataset.result, 'correct');
assert.equal(nodes['feedback-s1'].dataset.result, 'correct');
for (const id of ['s4','p2']) {
  assert.equal(nodes['feedback-' + id].dataset.result, 'manual');
  assert.equal(nodes['feedback-' + id].textContent, 'Проверим с учителем на уроке.');
}
nodes.s1.value = 'Another valid wording for the teacher to consider.';
nodes.checkAll.events.click();
assert.equal(nodes['feedback-s1'].dataset.result, 'compare');
nodes.d1.events.input();
assert.equal(nodes['feedback-d1'].hidden, true);
nodes.hwSend.events.click();
assert.equal(sends, 1);
console.log('PASS: 3 exercises, 10 fields, immediate keys, alternatives, manual review, draft migration, scoped checking and send hook.');
