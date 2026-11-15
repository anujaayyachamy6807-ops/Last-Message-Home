// Tests for the chat engine and the data. Run: node test/chat.test.js (no install).
"use strict";
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const E = require("../engine.js");

const root = path.join(__dirname, "..");
const data = JSON.parse(fs.readFileSync(path.join(root, "data", "contacts.json"), "utf8"));
const sources = {};
fs.readdirSync(path.join(root, "data", "sources")).forEach((f) => {
  if (f.endsWith(".txt") && f !== "FETCHED.txt") sources[f.replace(/\.txt$/, "")] = fs.readFileSync(path.join(root, "data", "sources", f), "utf8");
});

let passed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log("ok   " + name); }
  catch (e) { console.log("FAIL " + name + "\n     " + e.message); process.exitCode = 1; }
}

// ---- date sums ---------------------------------------------------------------
test("span: same day is 0 days", () => assert.strictEqual(E.spanText("2000-01-01", "2000-01-01"), "0 days"));
test("span: Viking 1 landing to last contact", () => assert.deepStrictEqual(E.span("1976-07-20", "1982-11-11"), { years: 6, months: 3, days: 22 }));
test("span: borrows days across a short month", () => assert.deepStrictEqual(E.span("2021-01-31", "2021-03-01"), { years: 0, months: 1, days: 1 }));
test("span: leap day", () => assert.deepStrictEqual(E.span("2000-02-28", "2000-03-01"), { years: 0, months: 0, days: 2 }));
test("span: month borrow across a year", () => assert.deepStrictEqual(E.span("1997-12-15", "1998-01-10"), { years: 0, months: 0, days: 26 }));
test("span: text uses singular and plural", () => assert.strictEqual(E.spanText("2020-01-01", "2021-02-02"), "1 year, 1 month and 1 day"));
test("span: end before start throws", () => assert.throws(() => E.span("2000-01-02", "2000-01-01")));
test("span: bad date throws", () => { assert.throws(() => E.span("2000-02-30", "2001-01-01")); assert.throws(() => E.span("2000", "2001-01-01")); });

// ---- helpers -----------------------------------------------------------------
test("norm: curly quotes and spacing", () => assert.strictEqual(E.norm("Opportunity’s  \n rover"), "Opportunity's rover"));
test("numberTokens", () => assert.deepStrictEqual(E.numberTokens("22.483 north, 16,500 images in 1976."), ["22.483", "16,500", "1976"]));

// ---- chat flow -----------------------------------------------------------------
const viking = data.contacts.find((c) => c.id === "viking-1");
test("chat: asking removes the question and logs the reply", () => {
  const s = E.createChat(viking);
  const before = E.remaining(s).length;
  const r = E.ask(s, "land");
  assert.strictEqual(E.remaining(s).length, before - 1);
  assert.ok(r.lines.length >= 2);
  assert.strictEqual(s.log.length, 1);
});
test("chat: asking the same question twice does nothing", () => {
  const s = E.createChat(viking);
  E.ask(s, "land");
  assert.strictEqual(E.ask(s, "land"), null);
  assert.strictEqual(s.asked.length, 1);
});
test("chat: unknown question throws", () => assert.throws(() => E.ask(E.createChat(viking), "nope")));
test("chat: card unlocks after 3 questions", () => {
  const s = E.createChat(viking);
  E.ask(s, "land"); E.ask(s, "see");
  assert.strictEqual(E.canFinish(s), false);
  E.ask(s, "cold");
  assert.strictEqual(E.canFinish(s), true);
});
test("chat: fact lines carry a source link, voice lines do not", () => {
  const s = E.createChat(viking);
  const r = E.ask(s, "stop");
  r.lines.forEach((l) => {
    if (l.t === "voice") assert.ok(!l.source);
    else assert.ok(l.source && /^https:\/\//.test(l.source.url));
  });
});
test("chat: calc line fills in the sum from the dates", () => {
  const s = E.createChat(viking);
  const calc = E.ask(s, "stop").lines.find((l) => l.t === "calc");
  assert.ok(calc.text.indexOf("6 years, 3 months and 22 days") >= 0, calc.text);
});
test("quiz: grading", () => {
  const g = E.gradeQuiz(viking, [viking.quiz[0].answer, 99]);
  assert.strictEqual(g.score, 1);
  assert.strictEqual(g.total, 2);
  assert.strictEqual(E.gradeQuiz(viking, []).score, 0);
});
test("map: Mars east longitude and Moon west longitude", () => {
  const v = E.mapPoint(viking); // 47.94 W on Mars = 312.06 E
  assert.ok(Math.abs(v.x - 312.06 / 360) < 1e-9);
  assert.ok(Math.abs(v.y - (90 - 22.483) / 180) < 1e-9);
  const m = E.mapPoint(data.contacts.find((c) => c.id === "surveyor-3"));
  assert.ok(Math.abs(m.x - (180 - 23.41) / 360) < 1e-9);
  assert.strictEqual(E.mapPoint(data.contacts.find((c) => c.id === "pioneer-10")), null);
});

// ---- the data: every question has a verified source -------------------------------
test("data: at least 6 contacts, unique ids", () => {
  assert.ok(data.contacts.length >= 6);
  assert.strictEqual(new Set(data.contacts.map((c) => c.id)).size, data.contacts.length);
});
test("data: every question has a page, and the page has a link and saved text", () => {
  data.contacts.forEach((c) => c.questions.forEach((q) => {
    assert.ok(q.page, c.id + "/" + q.id + " has no page");
    const p = E.pageOf(c, q.page);
    assert.ok(p && p.url && p.label, c.id + "/" + q.id + " page not listed");
    assert.ok(sources[p.key] && sources[p.key].length > 500, "no saved text for " + p.key);
  }));
});
test("data: every question has at least one quoted fact or a note", () => {
  data.contacts.forEach((c) => c.questions.forEach((q) => {
    assert.ok(q.reply.some((l) => l.t === "fact" || l.t === "calc" || l.t === "note"), c.id + "/" + q.id);
    if (q.reply.some((l) => l.t === "fact")) assert.ok(q.reply.filter((l) => l.t === "fact").every((l) => l.quote), c.id + "/" + q.id + " fact without quote");
  }));
});
data.contacts.forEach((c) => {
  test("data: " + c.id + " quotes are on the page, numbers match, voice has no numbers", () => {
    const errors = E.validateContact(c, sources);
    assert.deepStrictEqual(errors, []);
  });
});

// ---- pictures, map and interface text ----------------------------------------------
test("data: every picture file exists", () => {
  data.contacts.forEach((c) => { if (c.image) assert.ok(fs.existsSync(path.join(root, c.image.file)), c.id + ": missing " + c.image.file); });
});
test("map: every plotted robot falls inside the map", () => {
  data.contacts.filter((c) => c.coords).forEach((c) => {
    const p = E.mapPoint(c);
    assert.ok(p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1, c.id + " is off the map");
  });
});
test("i18n: Tamil has every English interface string", () => {
  const I = require("../i18n.js");
  const missing = Object.keys(I.STR.en).filter((k) => I.STR.ta[k] == null);
  assert.deepStrictEqual(missing, []);
  I.setLang("ta");
  assert.strictEqual(I.t("progress", { have: 2, n: 12 }), "12 இல் 2 ஸ்டிக்கர்கள்");
  I.setLang("en");
  assert.strictEqual(I.t("progress", { have: 2, n: 12 }), "2 of 12 stickers");
});
test("offline: the service worker caches every picture", () => {
  const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");
  data.contacts.forEach((c) => { if (c.image) assert.ok(sw.indexOf(c.image.file) >= 0, "sw.js does not cache " + c.image.file); });
});

// ---- the checker itself catches mistakes ----------------------------------------
function clone(o) { return JSON.parse(JSON.stringify(o)); }
test("checker: finds a quote that is not on the page", () => {
  const c = clone(viking);
  c.questions[0].reply[0].quote = "I landed on Venus";
  assert.ok(E.validateContact(c, sources).some((e) => /quote not found/.test(e)));
});
test("checker: finds a number that is not in the quote", () => {
  const c = clone(viking);
  c.questions[0].reply[0].text = "I touched down in 1980.";
  assert.ok(E.validateContact(c, sources).some((e) => /number 1980/.test(e)));
});
test("checker: finds a question with no page", () => {
  const c = clone(viking);
  delete c.questions[1].page;
  assert.ok(E.validateContact(c, sources).some((e) => /no verified source/.test(e)));
});
test("checker: finds a number in a voice line", () => {
  const c = clone(viking);
  c.questions[0].reply[2].text = "I was 100 percent sure.";
  assert.ok(E.validateContact(c, sources).some((e) => /voice line has a number/.test(e)));
});
test("checker: finds a non-NASA link", () => {
  const c = clone(viking);
  c.pages[0].url = "https://example.com/viking";
  assert.ok(E.validateContact(c, sources).some((e) => /not a NASA page/.test(e)));
});
test("checker: finds a wrong quiz answer index", () => {
  const c = clone(viking);
  c.quiz[0].answer = 7;
  assert.ok(E.validateContact(c, sources).some((e) => /out of range/.test(e)));
});

console.log("\n" + passed + " passed" + (process.exitCode ? ", some FAILED" : ""));
