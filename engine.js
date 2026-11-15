// Chat engine for Last Message Home. Plain JS, works in the browser and in Node (for tests).
// No AI, no network. A chat is a fixed list of tap-to-ask questions. Every reply line is one of:
//   fact  - copied from a NASA page; has a quote that is an exact piece of that page
//   calc  - a sum done from two dates that are on the page (the page does not state the answer)
//   note  - what the page does not say (for example "no reason given")
//   voice - the robot's voice only; it may not contain any number
(function (root) {
  "use strict";

  const MIN_QUESTIONS = 3;

  // Same text on both sides: one space between words, straight quote marks.
  function norm(s) {
    return String(s)
      .replace(/[‘’ʼ]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/[   ]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function asList(q) {
    return Array.isArray(q) ? q : q ? [q] : [];
  }

  // Numbers written in a text, e.g. "22.483", "16,500", "1976".
  function numberTokens(text) {
    return (String(text).match(/\d[\d.,]*/g) || []).map((t) => t.replace(/[.,]+$/, ""));
  }

  // ---- dates -----------------------------------------------------------------
  function parseDate(s) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (!m) throw new Error("Bad date: " + s);
    const y = +m[1], mo = +m[2], d = +m[3];
    const dt = new Date(Date.UTC(y, mo - 1, d));
    if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) throw new Error("Bad date: " + s);
    return { y, mo, d };
  }

  function daysInMonth(y, mo) {
    return new Date(Date.UTC(y, mo, 0)).getUTCDate();
  }

  // Whole years, months and days from one date to a later one (calendar sums).
  // Whole months first (a day that does not exist in a short month is moved to its last day), then the days left.
  function span(from, to) {
    const a = parseDate(from), b = parseDate(to);
    const t0 = Date.UTC(a.y, a.mo - 1, a.d), t1 = Date.UTC(b.y, b.mo - 1, b.d);
    if (t1 < t0) throw new Error("End is before start");
    let total = (b.y - a.y) * 12 + (b.mo - a.mo);
    if (b.d < a.d) total -= 1;
    const am = a.mo - 1 + total;
    const ay = a.y + Math.floor(am / 12), amo = (am % 12) + 1;
    const anchor = Date.UTC(ay, amo - 1, Math.min(a.d, daysInMonth(ay, amo)));
    return { years: Math.floor(total / 12), months: total % 12, days: Math.round((t1 - anchor) / 86400000) };
  }

  function spanText(from, to) {
    const s = span(from, to);
    const parts = [];
    const add = (n, w) => { if (n > 0) parts.push(n + " " + w + (n === 1 ? "" : "s")); };
    add(s.years, "year"); add(s.months, "month"); add(s.days, "day");
    if (!parts.length) return "0 days";
    if (parts.length === 1) return parts[0];
    return parts.slice(0, -1).join(", ") + " and " + parts[parts.length - 1];
  }

  // ---- sources ---------------------------------------------------------------
  function pageOf(contact, key) {
    return contact.pages.find((p) => p.key === key) || null;
  }

  function renderLine(contact, question, line) {
    const page = pageOf(contact, question.page);
    const out = { t: line.t, text: line.text, quotes: asList(line.quote) };
    if (line.t === "calc") out.text = line.text.replace("{span}", spanText(line.from, line.to));
    if (line.t !== "voice") out.source = page ? { label: page.label, url: page.url } : null;
    return out;
  }

  // ---- chat ------------------------------------------------------------------
  function createChat(contact) {
    return { contact, asked: [], log: [] };
  }

  function opening(contact) {
    const q = { page: contact.pages[0].key };
    return contact.opening.map((l) => { const r = renderLine(contact, q, l); delete r.source; return r; });
  }

  function remaining(state) {
    return state.contact.questions.filter((q) => state.asked.indexOf(q.id) < 0);
  }

  function ask(state, id) {
    const q = state.contact.questions.find((x) => x.id === id);
    if (!q) throw new Error("No such question: " + id);
    if (state.asked.indexOf(id) >= 0) return null;
    state.asked.push(id);
    const result = {
      question: { id: q.id, label: q.label },
      lines: q.reply.map((l) => renderLine(state.contact, q, l)),
    };
    state.log.push(result);
    return result;
  }

  function canFinish(state) {
    return state.asked.length >= Math.min(MIN_QUESTIONS, state.contact.questions.length);
  }

  // ---- discovery card and quiz ----------------------------------------------
  function card(contact) {
    const c = contact.card;
    const page = pageOf(contact, c.page);
    return { title: c.title, text: c.text, quotes: asList(c.quote), source: { label: page.label, url: page.url }, image: contact.image };
  }

  function gradeQuiz(contact, choices) {
    const results = contact.quiz.map((q, i) => ({ correct: choices[i] === q.answer, right: q.options[q.answer], quote: q.quote, page: pageOf(contact, q.page) }));
    return { score: results.filter((r) => r.correct).length, total: results.length, results };
  }

  // ---- map -------------------------------------------------------------------
  // Position on a flat map 0..1. Mars: east longitude 0..360. Moon: -180..180 (west is negative).
  function mapPoint(contact) {
    const c = contact.coords;
    if (!c) return null;
    const signed = c.ew === "W" ? -c.lon : c.lon;
    const x = contact.place === "Mars" ? (signed < 0 ? signed + 360 : signed) / 360 : (signed + 180) / 360;
    return { x, y: (90 - c.lat) / 180 };
  }

  // ---- checks (used by the tests) --------------------------------------------
  // sources: { pageKey: textOfPage }. Returns a list of problems; an empty list is a pass.
  function validateContact(contact, sources) {
    const errors = [];
    const err = (m) => errors.push(contact.id + ": " + m);
    const urls = new Set();
    contact.pages.forEach((p) => {
      if (!p.url || !/^https:\/\/(science\.nasa\.gov|nssdc\.gsfc\.nasa\.gov)\//.test(p.url)) err("page url is not a NASA page: " + p.key);
      if (!sources[p.key]) err("no saved text for page " + p.key);
      urls.add(p.key);
    });
    const text = (key) => norm(sources[key] || "");
    const checkQuotes = (where, pageKey, quotes, claimText) => {
      if (!urls.has(pageKey)) { err(where + ": page '" + pageKey + "' is not listed in pages"); return; }
      if (!quotes.length) { err(where + ": no quote"); return; }
      quotes.forEach((q) => { if (text(pageKey).indexOf(norm(q)) < 0) err(where + ": quote not found on page: " + q); });
      if (claimText != null) {
        claimText = claimText.split(contact.name).join("");
        const joined = norm(quotes.join(" "));
        numberTokens(claimText).forEach((n) => { if (joined.indexOf(n) < 0) err(where + ": number " + n + " is not in its quote"); });
      }
    };

    ["id", "name", "short", "kind", "place", "place_detail"].forEach((k) => { if (!contact[k]) err("missing " + k); });
    if (["Moon", "Mars", "Deep space"].indexOf(contact.place) < 0) err("unknown place " + contact.place);
    checkQuotes("place", contact.pages[0].key, asList(contact.place_quote));
    checkQuotes("last_seen", contact.last_seen.page, asList(contact.last_seen.quote), contact.last_seen.text);
    if (contact.coords) checkQuotes("coords", contact.coords.page, asList(contact.coords.quote), String(contact.coords.lat).replace("-", "") + " " + contact.coords.lon);

    if (!contact.questions || contact.questions.length < 3) err("needs at least 3 questions");
    const ids = new Set();
    (contact.questions || []).forEach((q) => {
      const w = "question '" + q.id + "'";
      if (ids.has(q.id)) err(w + ": duplicate id");
      ids.add(q.id);
      if (!q.label) err(w + ": no label");
      if (!q.page) err(w + ": no verified source (page)");
      let facts = 0;
      (q.reply || []).forEach((l, i) => {
        const lw = w + " line " + (i + 1);
        if (["fact", "calc", "note", "voice"].indexOf(l.t) < 0) { err(lw + ": bad type " + l.t); return; }
        if (l.t === "fact") { facts++; checkQuotes(lw, q.page, asList(l.quote), l.text); }
        if (l.t === "calc") {
          facts++;
          checkQuotes(lw, q.page, asList(l.quote));
          try { span(l.from, l.to); } catch (e) { err(lw + ": " + e.message); }
          const joined = norm(asList(l.quote).join(" "));
          [l.from, l.to].forEach((d) => {
            const p = parseDate(d);
            if (joined.indexOf(String(p.y)) < 0) err(lw + ": year " + p.y + " is not in the quotes");
          });
          if (l.text.indexOf("{span}") < 0) err(lw + ": calc text has no {span}");
        }
        if (l.t === "voice") {
          const t = l.text.split(contact.name).join("");
          if (/\d/.test(t)) err(lw + ": voice line has a number");
          if (l.quote) err(lw + ": voice line should not carry a quote");
        }
      });
      if (!facts && !(q.reply || []).some((l) => l.t === "note")) err(w + ": no fact or note");
    });

    if (!contact.card) err("no discovery card");
    else checkQuotes("card", contact.card.page, asList(contact.card.quote), contact.card.text.replace(contact.name, ""));
    if (!contact.quiz || contact.quiz.length !== 2) err("quiz needs exactly 2 questions");
    (contact.quiz || []).forEach((z, i) => {
      const w = "quiz " + (i + 1);
      if (!Array.isArray(z.options) || z.options.length < 2) err(w + ": options");
      else if (!(z.answer >= 0 && z.answer < z.options.length)) err(w + ": answer index out of range");
      else checkQuotes(w, z.page, asList(z.quote), z.options[z.answer]);
    });
    (contact.opening || []).forEach((l, i) => {
      if (l.t === "voice" && /\d/.test(l.text.split(contact.name).join(""))) err("opening " + (i + 1) + ": voice line has a number");
    });
    if (contact.image) ["file", "alt", "caption", "credit"].forEach((k) => { if (!contact.image[k]) err("image missing " + k); });
    return errors;
  }

  const api = { MIN_QUESTIONS, norm, numberTokens, span, spanText, createChat, opening, remaining, ask, canFinish, card, gradeQuiz, mapPoint, renderLine, validateContact, pageOf };
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.Engine = api;
})(typeof self !== "undefined" ? self : this);
