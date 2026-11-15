// Last Message Home: Deep Space Network Retro-Futuristic NASA Archival Interface
// Strictly verified NASA historical records. Fully accessible, offline-capable, and interactive.
(function () {
  "use strict";

  const E = window.Engine;
  const T = window.I18n;
  const t = T.t;
  const $ = (id) => document.getElementById(id);
  const view = $("view");
  const titleEl = $("title");
  const subEl = $("subtitle");
  const whoEl = $("who");
  const backBtn = $("back");
  const toggleSoundBtn = $("toggleSound");
  const optSoundCheckbox = $("optSound");
  const tabsEl = document.querySelector(".tabs");
  const params = new URLSearchParams(location.search);
  const reduced = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const DELAY = params.has("fast") || reduced ? 0 : 480;

  let data = null;
  let tab = "chats";
  let screen = { name: "list" }; // list | chat | card
  let destinationFilter = "all"; // all | Mars | Moon | Deep space
  let token = 0; // bumps when screen changes to cancel animations
  const chats = {}; // contact id -> { state, busy }
  let stickers = {}; // contact id -> best score

  // ---- Persistent Storage ---------------------------------------------------
  function store(key, val) {
    try {
      if (val === undefined) return localStorage.getItem(key);
      if (val === null) localStorage.removeItem(key); else localStorage.setItem(key, val);
    } catch (e) { return null; }
    return null;
  }

  // ---- Synthesized Sound FX (Web Audio API, Zero Network, 100% Offline) -----
  const SoundFX = (() => {
    let ctx = null;
    let enabled = store("lmh-sound") !== "0"; // Enabled by default

    function getCtx() {
      if (!ctx && (window.AudioContext || window.webkitAudioContext)) {
        try {
          ctx = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {}
      }
      if (ctx && ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }
      return ctx;
    }

    function beep(freq, duration, type = "sine", gainVal = 0.04) {
      if (!enabled) return;
      try {
        const c = getCtx();
        if (!c) return;
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, c.currentTime);
        gain.gain.setValueAtTime(gainVal, c.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + duration);
        osc.connect(gain);
        gain.connect(c.destination);
        osc.start();
        osc.stop(c.currentTime + duration);
      } catch (e) {}
    }

    return {
      click: () => beep(850, 0.035, "triangle", 0.025),
      transmit: () => {
        beep(480, 0.04, "sine", 0.03);
        setTimeout(() => beep(960, 0.05, "sine", 0.025), 45);
      },
      success: () => {
        beep(523.25, 0.07, "triangle", 0.035);
        setTimeout(() => beep(659.25, 0.07, "triangle", 0.035), 65);
        setTimeout(() => beep(783.99, 0.12, "triangle", 0.045), 130);
      },
      wrong: () => {
        beep(260, 0.09, "sawtooth", 0.035);
        setTimeout(() => beep(200, 0.14, "sawtooth", 0.035), 90);
      },
      toggle: (val) => {
        enabled = val;
        store("lmh-sound", val ? "1" : "0");
        updateSoundUI();
      },
      isEnabled: () => enabled,
    };
  })();

  function updateSoundUI() {
    const isEn = SoundFX.isEnabled();
    if (toggleSoundBtn) {
      toggleSoundBtn.classList.toggle("active", isEn);
      toggleSoundBtn.classList.toggle("muted", !isEn);
      toggleSoundBtn.setAttribute("aria-label", isEn ? t("soundOn") : t("soundOff"));
      toggleSoundBtn.title = isEn ? t("soundOn") : t("soundOff");
    }
    if (optSoundCheckbox) {
      optSoundCheckbox.checked = isEn;
    }
  }

  if (toggleSoundBtn) {
    toggleSoundBtn.addEventListener("click", () => {
      SoundFX.toggle(!SoundFX.isEnabled());
      if (SoundFX.isEnabled()) SoundFX.click();
      toast(SoundFX.isEnabled() ? t("soundOn") : t("soundOff"));
    });
  }
  if (optSoundCheckbox) {
    optSoundCheckbox.checked = SoundFX.isEnabled();
    optSoundCheckbox.addEventListener("change", () => {
      SoundFX.toggle(optSoundCheckbox.checked);
    });
  }
  updateSoundUI();

  // ---- DOM Creation Helpers -------------------------------------------------
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    Object.keys(attrs || {}).forEach((k) => {
      const v = attrs[k];
      if (k === "class") el.className = v;
      else if (k === "style" && typeof v === "object") Object.keys(v).forEach((p) => el.style.setProperty(p, v[p]));
      else if (k.startsWith("on")) {
        el.addEventListener(k.slice(2), (e) => {
          SoundFX.click();
          v(e);
        });
      }
      else if (v !== false && v != null) el.setAttribute(k, v === true ? "" : v);
    });
    kids.flat().forEach((c) => { if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(c)); });
    return el;
  }

  const SVGNS = "http://www.w3.org/2000/svg";
  function s(tag, attrs, ...kids) {
    const el = document.createElementNS(SVGNS, tag);
    Object.keys(attrs || {}).forEach((k) => el.setAttribute(k, attrs[k]));
    kids.flat().forEach((c) => {
      if (c != null && c !== false) {
        el.append(typeof c === "string" ? document.createTextNode(c) : c);
      }
    });
    return el;
  }

  function icon(path) {
    const svg = s("svg", { viewBox: "0 0 24 24", "aria-hidden": "true" });
    svg.append(s("path", { d: path }));
    return svg;
  }

  const ICONS = {
    speaker: "M4 9v6h4l5 4V5L8 9H4zm12.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z",
    stop: "M7 7h10v10H7z",
    chevron: "M9 5l7 7-7 7",
    star: "M12 3l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.4 6.8 19.1l1-5.8L3.5 9.2l5.9-.8z",
    card: "M4 5h16v14H4zM4 9h16",
    lock: "M7 11V8a5 5 0 0 1 10 0v3M6 11h12v9H6z",
    link: "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1",
    target: "M12 2v3m0 14v3M2 12h3m14 0h3M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10z",
    arrowCursor: "M5 3l14 9-7 2-2 7L5 3z",
  };

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const byId = (id) => data.contacts.find((c) => c.id === id);
  const placeClass = (c) => (c.place === "Mars" ? "mars" : c.place === "Moon" ? "moon" : "deep");
  const avatar = (c, extra) => h("span", { class: "avatar " + placeClass(c) + (extra ? " " + extra : ""), "aria-hidden": "true" }, h("span", {}, c.short));
  const link = (src, text) => h("a", { href: src.url, target: "_blank", rel: "noopener" }, text || src.label);

  let toastTimer = 0;
  function toast(msg) {
    const el = $("toast");
    if (!el) return;
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
  }

  // ---- Read Aloud (Browser Speech Synthesis, Zero Network) ------------------
  const canSpeak = "speechSynthesis" in window && typeof window.SpeechSynthesisUtterance === "function";
  let voice = null;
  function pickVoice() {
    if (!canSpeak) return;
    const vs = speechSynthesis.getVoices();
    voice = vs.find((v) => /^en[-_]/i.test(v.lang) && /natural|neural|google|samantha|aria|jenny|daniel/i.test(v.name))
      || vs.find((v) => /^en[-_]/i.test(v.lang)) || null;
  }
  if (canSpeak) {
    pickVoice();
    if (speechSynthesis.addEventListener) speechSynthesis.addEventListener("voiceschanged", pickVoice);
  }

  function speak(text, done) {
    if (!canSpeak) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = voice ? voice.lang : "en-US";
    if (voice) u.voice = voice;
    u.rate = 0.96;
    if (done) { u.onend = done; u.onerror = done; }
    speechSynthesis.speak(u);
  }

  function stopSpeech() {
    if (canSpeak) speechSynthesis.cancel();
    document.querySelectorAll(".listen[aria-pressed='true']").forEach(resetListen);
  }

  function resetListen(b) {
    b.setAttribute("aria-pressed", "false");
    b.setAttribute("aria-label", t("listen"));
    b.replaceChildren(icon(ICONS.speaker));
  }

  function listenButton(text) {
    if (!canSpeak) return null;
    const b = h("button", { class: "listen", type: "button", "aria-pressed": "false", "aria-label": t("listen"), title: t("listen") }, icon(ICONS.speaker));
    b.addEventListener("click", () => {
      const on = b.getAttribute("aria-pressed") === "true";
      stopSpeech();
      if (on) return;
      b.setAttribute("aria-pressed", "true");
      b.setAttribute("aria-label", t("stop"));
      b.replaceChildren(icon(ICONS.stop));
      speak(text, () => resetListen(b));
    });
    return b;
  }

  const opt = (id) => $(id) && $(id).checked;

  // ---- Language -------------------------------------------------------------
  function applyLang() {
    document.documentElement.lang = T.getLang();
    document.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll("[data-i18n-label]").forEach((el) => el.setAttribute("aria-label", t(el.dataset.i18nLabel)));
    document.querySelectorAll(".seg [data-lang]").forEach((b) => b.setAttribute("aria-checked", b.dataset.lang === T.getLang() ? "true" : "false"));
    tabsEl.setAttribute("aria-label", t("tabChats") + ", " + t("tabMap") + ", " + t("tabStickers"));
    updateSoundUI();
  }

  T.setLang(store("lmh-lang") || "en");
  document.querySelectorAll(".seg [data-lang]").forEach((b) => b.addEventListener("click", () => {
    T.setLang(b.dataset.lang);
    store("lmh-lang", T.getLang());
    applyLang();
    if (data) {
      const keep = view.scrollTop;
      token++;
      render();
      if (screen.name !== "chat") view.scrollTop = keep;
    }
  }));

  // ---- Options & Settings Sheet ---------------------------------------------
  function applyOpts() {
    document.body.classList.toggle("proof", opt("optProof"));
    document.body.classList.toggle("factsonly", opt("optFacts"));
  }

  ["optProof", "optFacts", "optSpeak"].forEach((id) => {
    const el = $(id);
    if (!el) return;
    el.checked = store("lmh-" + id) === "1";
    el.addEventListener("change", () => {
      store("lmh-" + id, el.checked ? "1" : "0");
      applyOpts();
      if (id === "optSpeak" && !el.checked) stopSpeech();
    });
  });

  if (!canSpeak && $("optSpeak")) {
    $("optSpeak").checked = false;
    $("optSpeak").disabled = true;
    $("ttsRow").classList.add("disabled");
    const small = $("ttsRow").querySelector("small");
    if (small) small.dataset.i18n = "noSpeech";
  }
  applyOpts();

  const sheet = $("settings");
  let sheetReturn = null;
  function openSheet() {
    sheetReturn = document.activeElement;
    sheet.hidden = false;
    requestAnimationFrame(() => sheet.classList.add("open"));
    const first = sheet.querySelector("input:not([disabled])");
    if (first) first.focus();
  }
  function closeSheet() {
    sheet.classList.remove("open");
    setTimeout(() => { sheet.hidden = true; }, reduced ? 0 : 220);
    if (sheetReturn && sheetReturn.focus) sheetReturn.focus();
  }
  $("openSettings").addEventListener("click", openSheet);
  sheet.querySelectorAll("[data-close]").forEach((el) => el.addEventListener("click", closeSheet));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !sheet.hidden) { e.preventDefault(); closeSheet(); }
    if (e.key === "Tab" && !sheet.hidden) {
      const f = [...sheet.querySelectorAll("button, input:not([disabled]), a[href]")].filter((x) => x.offsetParent !== null);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });

  $("reset").addEventListener("click", () => {
    if (!window.confirm(t("resetAsk"))) return;
    stickers = {};
    store("lmh-stickers", null);
    Object.keys(chats).forEach((k) => delete chats[k]);
    closeSheet();
    tab = "chats";
    go({ name: "list" });
    toast(t("resetDone"));
  });

  // ---- Navigation -----------------------------------------------------------
  function setHeader(title, back, sub, contact) {
    titleEl.textContent = title;
    subEl.textContent = sub || "";
    subEl.hidden = !sub;
    backBtn.hidden = !back;
    whoEl.hidden = !contact;
    whoEl.replaceChildren(contact ? avatar(contact, "sm") : "");
  }

  function go(next) {
    token++;
    stopSpeech();
    screen = next;
    render();
    view.scrollTop = 0;
  }

  backBtn.addEventListener("click", () => {
    if (screen.name === "card") go({ name: "chat", id: screen.id });
    else go({ name: "list" });
  });

  document.querySelectorAll(".tabs button").forEach((b) => b.addEventListener("click", () => {
    tab = b.dataset.tab;
    go({ name: "list" });
  }));

  function render() {
    tabsEl.dataset.active = tab;
    document.querySelectorAll(".tabs button").forEach((b) => {
      if (b.dataset.tab === tab && screen.name === "list") b.setAttribute("aria-current", "page");
      else b.removeAttribute("aria-current");
    });
    tabsEl.classList.toggle("dim", screen.name !== "list");
    view.replaceChildren();
    view.classList.remove("enter");
    void view.offsetWidth; // restart enter animation
    view.classList.add("enter");

    if (screen.name === "chat") return renderChat(byId(screen.id));
    if (screen.name === "card") return renderCard(byId(screen.id));
    if (tab === "map") return renderMap();
    if (tab === "stickers") return renderStickers();
    renderList();
  }

  function ring(have, total) {
    const r = 22, c = 2 * Math.PI * r;
    const svg = s("svg", { class: "ring", viewBox: "0 0 56 56", "aria-hidden": "true" });
    svg.append(s("circle", { cx: 28, cy: 28, r, class: "ring-bg" }));
    const fg = s("circle", { cx: 28, cy: 28, r, class: "ring-fg", "stroke-dasharray": c, "stroke-dashoffset": c * (1 - (total ? have / total : 0)) });
    svg.append(fg);
    svg.append(s("text", { x: 28, y: 32, "text-anchor": "middle" }, have + "/" + total));
    return svg;
  }

  function createRetroTitleSvg(dest) {
    const isMoon = dest === "Moon";
    const isDeep = dest === "Deep space";
    if (isMoon) {
      return h("h1", { class: "hero-retro-title moon" }, "MOON");
    }
    if (isDeep) {
      return h("h1", { class: "hero-retro-title deep" }, "PIONEER");
    }
    // High-fidelity custom SVG retro lettering for MARS (matching Image 1)
    const svg = s("svg", {
      class: "hero-retro-svg",
      viewBox: "0 0 460 110",
      role: "img",
      "aria-label": "MARS"
    });
    // Letter M: curved rounded dual arches
    svg.append(s("path", {
      d: "M 25 95 V 42 C 25 22 44 14 62 25 C 72 31 82 45 92 60 C 102 45 112 31 122 25 C 140 14 159 22 159 42 V 95 H 133 V 48 C 133 37 122 34 114 44 L 92 72 L 70 44 C 62 34 51 37 51 48 V 95 Z",
      fill: "var(--cream)"
    }));
    // Letter A: smooth curved arch top with crossbar
    svg.append(s("path", {
      d: "M 180 95 V 42 C 180 18 202 12 226 12 C 250 12 272 18 272 42 V 95 H 246 V 62 H 206 V 95 Z M 206 42 H 246 V 36 C 246 25 238 22 226 22 C 214 22 206 25 206 36 Z",
      fill: "var(--cream)"
    }));
    // Letter R: rounded arch top, loop, and smooth extended forward leg
    svg.append(s("path", {
      d: "M 292 95 V 14 H 346 C 370 14 386 26 386 46 C 386 60 374 72 356 75 L 390 95 H 358 L 328 75 H 318 V 95 Z M 318 34 H 344 C 354 34 360 38 360 46 C 360 54 354 58 344 58 H 318 Z",
      fill: "var(--cream)"
    }));
    // Letter S: sweeping retro curved ribbon S
    svg.append(s("path", {
      d: "M 405 76 C 405 88 418 97 435 97 C 456 97 470 87 470 70 C 470 52 454 46 434 42 C 418 39 412 36 412 28 C 412 22 418 19 432 19 C 445 19 456 24 462 31 L 476 17 C 466 7 450 3 432 3 C 410 3 394 14 394 30 C 394 48 412 54 430 58 C 448 61 452 66 452 72 C 452 79 444 83 434 83 C 420 83 412 76 405 68 Z",
      fill: "var(--cream)"
    }));
    return svg;
  }

  // ---- Image 1 & 5: Retro Mars Hero Showcase Component -----------------------
  function createRetroHero(dest) {
    const isMars = dest === "Mars" || dest === "all";
    const isMoon = dest === "Moon";
    const isDeep = dest === "Deep space";

    const titleText = isMoon ? "MOON" : isDeep ? "PIONEER" : "MARS";
    const orbitText = isMoon ? "Sea of Tranquility" : isDeep ? "Interstellar Trajectory" : "Phobos & Deimos";
    const telemetryNum = isMoon ? "0.073 M" : isDeep ? "12.2 B Mi" : "0.107 M";
    const planetClass = isMoon ? "moon" : isDeep ? "deep" : "mars";

    const hero = h("section", { class: "hero-retro" });

    // Top rule with 4-point star crosshair (exact match to Image 1)
    const starSvg = s("svg", { class: "hero-star-icon", viewBox: "0 0 24 24" });
    starSvg.append(s("path", { d: "M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z", fill: "currentColor" }));

    hero.append(
      h("div", { class: "hero-retro-rule" },
        starSvg,
        h("div", { class: "hero-rule-line" })
      )
    );

    // Planet stage with radiant crescent atmosphere & centerpiece retro typography
    hero.append(
      h("div", { class: "hero-planet-stage" },
        h("div", { class: "hero-planet-crescent " + planetClass }),
        h("div", { class: "hero-title-wrap" },
          createRetroTitleSvg(dest)
        )
      )
    );

    // Bottom telemetry strip (exact match to Image 1)
    const exploreBtn = h("button", {
      class: "btn-explore-surface",
      type: "button",
      onclick: () => {
        const target = document.getElementById("pioneers-roster");
        if (target) target.scrollIntoView({ behavior: "smooth" });
      }
    },
      h("span", {}, t("exploreSurface") || "Explore Surface"),
      s("svg", { class: "cursor-arrow-icon", viewBox: "0 0 24 24" }, s("path", { d: "M5 3l14 9-7 2-2 7L5 3z" }))
    );

    const crosshairSvg = s("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "2" });
    crosshairSvg.append(s("circle", { cx: "12", cy: "12", r: "8" }));
    crosshairSvg.append(s("path", { d: "M12 2v4m0 12v4M2 12h4m12 0h4" }));

    hero.append(
      h("div", { class: "hero-telemetry-bar" },
        h("span", { class: "telemetry-pill" },
          h("span", { class: "orbit-icon" }),
          orbitText
        ),
        exploreBtn,
        h("span", { class: "telemetry-pill" },
          telemetryNum,
          crosshairSvg
        )
      )
    );

    return hero;
  }

  // ---- Image 3: Top Planetary Destinations Cards -----------------------------
  function createDestinationsGrid() {
    const dests = [
      { id: "Mars", title: t("destMars"), desc: t("destMarsDesc"), count: "7 Robots", cls: "mars" },
      { id: "Moon", title: t("destMoon"), desc: t("destMoonDesc"), count: "4 Landmarks", cls: "moon" },
      { id: "Deep space", title: t("destDeep"), desc: t("destDeepDesc"), count: "1 Voyager", cls: "deep" },
    ];

    const wrap = h("div", { class: "destinations-grid" });
    dests.forEach((d) => {
      wrap.append(
        h("button", {
          class: "dest-card",
          type: "button",
          onclick: () => {
            destinationFilter = d.id;
            render();
            const roster = document.getElementById("pioneers-roster");
            if (roster) roster.scrollIntoView({ behavior: "smooth" });
          }
        },
          h("div", { class: "dest-card-orb " + d.cls }),
          h("div", { class: "dest-card-info" },
            h("p", { class: "dest-card-title" }, d.title),
            h("p", { class: "dest-card-sub" }, d.desc),
            h("span", { class: "dest-card-tag" }, d.count)
          ),
          h("span", { class: "chev" }, icon(ICONS.chevron))
        )
      );
    });
    return wrap;
  }

  // ---- Image 3: Key Mission Telemetry Section --------------------------------
  function createKeyFactsSection() {
    return h("section", { class: "key-facts-section glass" },
      h("div", { class: "key-facts-watermark", "aria-hidden": "true" }, "KEY FACTS"),
      h("div", { class: "key-facts-head" },
        h("h3", { class: "key-facts-title" }, t("keyFacts"))
      ),
      h("div", { class: "key-facts-grid" },
        h("div", { class: "fact-item" },
          h("div", { class: "fact-item-num" }, "12"),
          h("div", { class: "fact-item-label" }, t("statRobots")),
          h("p", { class: "fact-item-desc" }, t("statRobotsDesc"))
        ),
        h("div", { class: "fact-item" },
          h("div", { class: "fact-item-num" }, "181"),
          h("div", { class: "fact-item-label" }, t("statQuotes")),
          h("p", { class: "fact-item-desc" }, t("statQuotesDesc"))
        ),
        h("div", { class: "fact-item" },
          h("div", { class: "fact-item-num" }, "48+ Yrs"),
          h("div", { class: "fact-item-label" }, t("statYears")),
          h("p", { class: "fact-item-desc" }, t("statYearsDesc"))
        ),
        h("div", { class: "fact-item" },
          h("div", { class: "fact-item-num" }, "100%"),
          h("div", { class: "fact-item-label" }, t("statReal")),
          h("p", { class: "fact-item-desc" }, t("statRealDesc"))
        )
      )
    );
  }

  // ---- Main Chat List Screen -------------------------------------------------
  function renderList() {
    setHeader("Last Message Home", false, t("robots", { n: data.contacts.length }));
    const have = data.contacts.filter((c) => stickers[c.id] != null).length;

    // 1. Hero Screen (Image 1 & 5)
    view.append(createRetroHero(destinationFilter));

    // 2. Destination Filter Pills Bar
    const filterPills = [
      { id: "all", label: t("filterAll") || "All (12)" },
      { id: "Mars", label: t("filterMars") || "Mars (7)" },
      { id: "Moon", label: t("filterMoon") || "Moon (4)" },
      { id: "Deep space", label: t("filterDeep") || "Deep Space (1)" },
    ];
    const pillsBar = h("div", { class: "dest-pills-bar", role: "tablist", "aria-label": t("filterBy") });
    filterPills.forEach((p) => {
      pillsBar.append(
        h("button", {
          class: "dest-pill" + (destinationFilter === p.id ? " active" : ""),
          type: "button",
          role: "tab",
          "aria-selected": destinationFilter === p.id ? "true" : "false",
          onclick: () => {
            destinationFilter = p.id;
            render();
          }
        }, p.label)
      );
    });
    view.append(pillsBar);

    // 3. Top Destinations Cards (Image 3)
    if (destinationFilter === "all") {
      view.append(createDestinationsGrid());
    }

    // 4. Key Facts Telemetry Grid (Image 3)
    view.append(createKeyFactsSection());

    // 5. Explanatory Legend / NASA Promise
    const legend = [["fact", "tagFact"], ["calc", "tagCalc"], ["note", "tagNote"], ["voice", "tagVoice"]];
    view.append(h("section", { class: "intro glass" },
      h("p", {}, t("intro1")),
      h("p", {}, t("intro2")),
      h("ul", { class: "tag-legend" }, legend.map(([k, d]) => h("li", {}, h("span", { class: "tag t-" + k }, t("tag:" + k)), " ", d ? t(d) : ""))),
      t("contentEnglish") ? h("p", { class: "small muted" }, t("contentEnglish")) : null,
      h("p", { class: "small muted" }, t("intro3", { date: data.meta.checked }))));

    // 6. Contact Roster by Location
    const rosterSection = h("div", { id: "pioneers-roster" });
    view.append(rosterSection);

    const placesToShow = destinationFilter === "all" ? ["Mars", "Moon", "Deep space"] : [destinationFilter];
    let i = 0;

    placesToShow.forEach((place) => {
      const list = data.contacts.filter((c) => c.place === place);
      if (!list.length) return;

      rosterSection.append(
        h("div", { class: "section-rule" },
          h("h2", { class: "section-rule-title" },
            h("span", { class: "dot " + placeClass(list[0]) }),
            " " + t("place:" + place)
          ),
          h("div", { class: "section-rule-line" }),
          h("span", { class: "section-rule-count" }, String(list.length))
        )
      );

      rosterSection.append(h("ul", { class: "contacts" }, list.map((c) => {
        const got = stickers[c.id] != null;
        return h("li", { style: { "--i": String(i++) } },
          h("button", {
            class: "contact",
            type: "button",
            onclick: () => go({ name: "chat", id: c.id }),
            "aria-label": c.name + ". " + c.kind + ", " + c.place_detail + ". " + c.last_seen.text + (got ? ". " + t("stickerCollected") : "")
          },
            avatar(c, got ? "done" : ""),
            h("span", { class: "who" },
              h("span", { class: "name" }, c.name),
              h("span", { class: "meta" }, c.kind + " · " + c.place_detail),
              h("span", { class: "meta last" }, c.last_seen.text)
            ),
            got ? h("span", { class: "stk", title: t("stickerCollected") }, icon(ICONS.star)) : null,
            h("span", { class: "chev" }, icon(ICONS.chevron))
          )
        );
      })));
    });

    // 7. About Project & Verified Sources
    view.append(about());
  }

  // ---- About Section ---------------------------------------------------------
  function about() {
    const seen = new Set();
    const pages = [];
    data.contacts.forEach((c) => c.pages.forEach((p) => {
      if (!seen.has(p.url)) { seen.add(p.url); pages.push(p); }
    }));
    return h("section", { class: "about glass" },
      h("h2", {}, t("aboutTitle")),
      h("p", {}, t("aboutChallenge")),
      h("p", {}, t("aboutHow")),
      h("details", {},
        h("summary", {}, t("aboutSources", { n: pages.length })),
        h("ul", { class: "sources" }, pages.map((p) => h("li", {}, link(p))))),
      h("p", { class: "small muted" }, t("aboutCredit")));
  }

  // ---- Message Bubble --------------------------------------------------------
  function bubble(line) {
    const kids = [
      h("div", { class: "msg-head" },
        h("span", { class: "tag t-" + line.t }, t("tag:" + line.t)),
        listenButton(line.text)
      ),
      h("p", {}, line.text)
    ];
    if (line.source) {
      kids.push(h("p", { class: "src" }, icon(ICONS.link), " ", t("source") + ": ", link(line.source)));
      if (line.quotes.length && line.t !== "note") {
        kids.push(h("blockquote", { class: "proof" }, line.quotes.map((q) => "“" + q + "”").join(" … ")));
      }
    }
    return h("div", { class: "msg robot t-" + line.t }, kids);
  }

  async function showLines(log, lines, mine, animate, c) {
    for (const line of lines) {
      if (mine !== token) return false;
      const hidden = line.t === "voice" && opt("optFacts");
      if (animate && DELAY && !hidden) {
        const typing = h("div", { class: "typing", role: "img", "aria-label": t("typing", { name: c.name }) }, h("i"), h("i"), h("i"));
        log.append(typing);
        log.scrollTop = log.scrollHeight;
        await sleep(DELAY + Math.min(500, line.text.length * 5));
        typing.remove();
        if (mine !== token) return false;
      }
      log.append(bubble(line));
      log.scrollTop = log.scrollHeight;
      if (animate && !hidden) {
        SoundFX.transmit();
        if (opt("optSpeak")) speak(line.text);
      }
    }
    return true;
  }

  // ---- Image 2: HUD Visor / Helmet Mission Header (Exact Reticle Match) -----
  function createHudHeader(c) {
    const latencies = {
      Mars: "~14m 22s (Earth ⇆ Mars · Speed of Light)",
      Moon: "~1.28s (Earth ⇆ Moon · Speed of Light)",
      "Deep space": "~18h 04m (Earth ⇆ Heliopause · Speed of Light)",
    };
    const latText = latencies[c.place] || "~12m";

    const header = h("div", { class: "hud-visor-header" });

    // High-tech circular visor reticle overlay (from Image 2)
    const visorSvg = s("svg", { class: "hud-reticle-svg", viewBox: "0 0 360 80", "aria-hidden": "true" });
    // Circular reticle ticks and arcs
    visorSvg.append(s("circle", { cx: "180", cy: "40", r: "34", class: "hud-circle-outer" }));
    visorSvg.append(s("circle", { cx: "180", cy: "40", r: "26", class: "hud-circle-inner" }));
    visorSvg.append(s("path", { d: "M 180 2 V 12 M 180 68 V 78 M 142 40 H 152 M 208 40 H 218", class: "hud-crosshairs" }));
    // Left & Right degree brackets
    visorSvg.append(s("path", { d: "M 70 25 L 50 25 L 50 55 L 70 55", class: "hud-bracket" }));
    visorSvg.append(s("path", { d: "M 290 25 L 310 25 L 310 55 L 290 55", class: "hud-bracket" }));
    header.append(visorSvg);

    // Target info and high-contrast status alert badge
    header.append(
      h("div", { class: "hud-visor-content" },
        h("div", { class: "hud-visor-top" },
          h("div", {},
            h("span", { class: "hud-kicker" }, "HELMET HUD V6.1 // TELEMETRY LINK"),
            h("h2", { class: "hud-target-name" }, c.name)
          ),
          h("div", { class: "hud-trapezoid-badge" },
            h("span", { class: "pulse-dot" }),
            t("hudStatus") || "SIGNAL LOCKED: ARCHIVE VERIFIED"
          )
        ),
        h("div", { class: "hud-telemetry-row" },
          h("span", { class: "hud-telemetry-item" },
            t("signalLatency") + ": ",
            h("strong", {}, latText)
          ),
          h("span", { class: "hud-telemetry-item" },
            c.coords ? "LAT " + c.coords.lat + "° · LON " + c.coords.lon + "°" : c.place_detail
          ),
          h("span", { class: "hud-telemetry-item status-ok" },
            "● SYS ON · DSN NOMINAL"
          )
        ),
        h("div", { class: "hud-alert-banner" },
          "LAST CONTACT: " + c.last_seen.text + " · NASA ARCHIVES"
        )
      )
    );

    return header;
  }

  // ---- Chat Screen -----------------------------------------------------------
  function renderChat(c) {
    setHeader(c.name, true, c.kind + " · " + c.place_detail, c);
    const mine = token;
    let rec = chats[c.id];
    const fresh = !rec;
    if (fresh) rec = chats[c.id] = { state: E.createChat(c), busy: false };

    const chatSection = h("section", { class: "chat" });
    view.append(chatSection);

    // Image 2: HUD Visor Telemetry Header
    chatSection.append(createHudHeader(c));

    const log = h("div", { class: "log", role: "log", "aria-live": "polite", "aria-label": c.name, tabindex: "0" });
    const replies = h("div", { class: "replies glass" });
    chatSection.append(log, replies);

    log.append(h("p", { class: "day-chip" }, c.last_seen.text));

    function drawReplies() {
      replies.replaceChildren();
      const total = c.questions.length, asked = rec.state.asked.length;
      replies.append(h("div", { class: "progress", "aria-hidden": "true" }, h("span", { style: { width: (asked / total * 100) + "%" } })));
      const left = E.remaining(rec.state);
      if (E.canFinish(rec.state)) {
        replies.append(h("button", {
          class: "go-btn",
          type: "button",
          disabled: rec.busy,
          onclick: () => go({ name: "card", id: c.id })
        }, icon(ICONS.card), t("openCard")));
      }
      if (left.length) {
        replies.append(h("p", { class: "hint" }, t("hint") + " (" + asked + "/" + total + ")"));
        replies.append(h("div", { class: "q-list" }, left.map((q, i) => h("button", {
          class: "q-btn",
          type: "button",
          disabled: rec.busy,
          style: { "--i": String(i) },
          onclick: () => ask(q.id)
        }, q.label))));
      }
    }

    async function ask(id) {
      if (rec.busy) return;
      const could = E.canFinish(rec.state);
      const r = E.ask(rec.state, id);
      if (!r) return;
      rec.busy = true;
      drawReplies();
      log.append(h("div", { class: "msg me" }, r.question.label));
      log.scrollTop = log.scrollHeight;
      await showLines(log, r.lines, mine, true, c);
      rec.busy = false;
      if (mine === token) {
        drawReplies();
        if (!could && E.canFinish(rec.state)) toast(t("cardReady"));
        const first = replies.querySelector("button:not([disabled])");
        if (first) first.focus({ preventScroll: true });
      }
    }

    (async () => {
      rec.busy = true;
      drawReplies();
      if (fresh) {
        await showLines(log, E.opening(c), mine, true, c);
      } else {
        await showLines(log, E.opening(c), mine, false, c);
        for (const r of rec.state.log) {
          log.append(h("div", { class: "msg me" }, r.question.label));
          await showLines(log, r.lines, mine, false, c);
        }
      }
      rec.busy = false;
      if (mine === token) drawReplies();
    })();
  }

  // ---- Discovery Card & Quiz Screen ------------------------------------------
  function renderCard(c) {
    setHeader(c.name, true, t("cardTitle"), c);
    const cd = E.card(c);
    const choices = [];
    const fig = c.image
      ? h("figure", {},
          h("div", { class: "img-wrap" },
            h("img", { src: c.image.file, alt: c.image.alt, loading: "lazy" })
          ),
          h("figcaption", {}, c.image.caption + " " + t("credit") + ": " + c.image.credit + ". " + t("imageOn") + " ", link(cd.source), ".")
        )
      : h("p", { class: "small muted" }, t("noPhoto"));

    view.append(h("section", { class: "card glass" },
      h("p", { class: "kicker" }, t("cardTitle")),
      h("h2", {}, cd.title),
      fig,
      h("p", { class: "card-text" }, cd.text),
      h("p", { class: "small" }, t("source") + ": ", link(cd.source)),
      h("blockquote", { class: "proof always" }, t("pageSays") + " " + cd.quotes.map((q) => "“" + q + "”").join(" … "))));

    const quizBox = h("div", {});
    view.append(quizBox);

    const prior = stickers[c.id];
    if (prior != null) quizBox.append(h("p", { class: "pad small muted" }, t("haveSticker", { s: prior, t: c.quiz.length })));
    const ui = [];

    c.quiz.forEach((q, i) => {
      const res = h("p", { class: "result", hidden: true, role: "status" });
      const opts = q.options.map((o, k) => h("button", {
        class: "opt",
        type: "button",
        "aria-pressed": "false",
        onclick: () => pick(i, k)
      },
        h("span", { class: "opt-key", "aria-hidden": "true" }, String.fromCharCode(65 + k)),
        h("span", {}, o)
      ));
      quizBox.append(h("section", { class: "quiz glass" },
        h("p", { class: "kicker" }, t("quizN", { i: i + 1, n: c.quiz.length })),
        h("h3", {}, q.q),
        h("div", { class: "opts" }, opts),
        res
      ));
      ui[i] = { opts, res };
    });

    function pick(i, k) {
      if (choices[i] != null) return;
      choices[i] = k;
      const q = c.quiz[i], u = ui[i], page = E.pageOf(c, q.page);
      const isRight = k === q.answer;

      if (isRight) SoundFX.success(); else SoundFX.wrong();

      u.opts.forEach((b, n) => {
        b.disabled = true;
        if (n === q.answer) {
          b.classList.add("right");
          b.append(h("span", { class: "opt-note" }, " " + t("rightAnswer")));
        } else if (n === k) {
          b.classList.add("wrong");
          b.append(h("span", { class: "opt-note" }, " " + t("yourAnswer")));
        }
        b.setAttribute("aria-pressed", n === k ? "true" : "false");
      });

      u.res.hidden = false;
      u.res.className = "result " + (isRight ? "ok" : "no");
      u.res.replaceChildren(
        h("strong", {}, isRight ? t("right") : t("notQuite")),
        " " + t("pageSays") + " “" + [].concat(q.quote).join(" … ") + "” ",
        link(page, t("sourceLink"))
      );

      if (choices.filter((x) => x != null).length === c.quiz.length) finish();
    }

    function finish() {
      const g = E.gradeQuiz(c, choices);
      if (stickers[c.id] == null || g.score > stickers[c.id]) {
        stickers[c.id] = g.score;
        store("lmh-stickers", JSON.stringify(stickers));
      }
      quizBox.append(
        h("div", { class: "sticker-new glass", role: "status" },
          h("span", { class: "burst", "aria-hidden": "true" }, icon(ICONS.star)),
          h("span", {}, t("scored", { s: g.score, t: g.total, title: cd.title }))
        ),
        h("div", { class: "pad" },
          h("button", {
            class: "go-btn",
            type: "button",
            onclick: () => { tab = "stickers"; go({ name: "list" }); }
          }, icon(ICONS.star), t("openBook"))
        )
      );
    }
  }

  // ---- Map Screen ------------------------------------------------------------
  function planet(name, fill, list, nums, lonLabels) {
    const W = 360, H = 180, L = 30, TOP = 10;
    const svg = s("svg", { class: "mapsvg", viewBox: "0 0 " + (W + L + 10) + " " + (H + TOP + 26), role: "group", "aria-label": name });
    svg.append(s("rect", { x: L, y: TOP, width: W, height: H, rx: 10, fill: "url(#" + fill + ")", class: "map-bg" }));
    [-60, -30, 0, 30, 60].forEach((lat) => {
      const y = TOP + (90 - lat) / 180 * H;
      svg.append(s("line", { x1: L, x2: L + W, y1: y, y2: y, class: lat === 0 ? "grid eq" : "grid" }));
      svg.append(s("text", { x: L - 5, y: y + 3, "text-anchor": "end", class: "axis" }, lat > 0 ? lat + "N" : lat < 0 ? -lat + "S" : "0"));
    });
    lonLabels.forEach(([lon, x01]) => {
      const x = L + x01 * W;
      svg.append(s("line", { x1: x, x2: x, y1: TOP, y2: TOP + H, class: "grid" }));
      svg.append(s("text", { x, y: TOP + H + 15, "text-anchor": "middle", class: "axis" }, lon));
    });

    const clusters = [];
    list.forEach((c) => {
      const p = E.mapPoint(c);
      const x = L + p.x * W, y = TOP + p.y * H;
      const hit = clusters.find((k) => Math.hypot(k.x - x, k.y - y) < 8);
      if (hit) hit.members.push(c); else clusters.push({ x, y, members: [c] });
    });

    const LINE = 13, MINX = 2, MAXX = W + L + 8, MINY = 2, MAXY = TOP + H - 2;
    const boxes = clusters.map((k) => { const r = 5 + (k.members.length - 1) * 4 + 2; return { x1: k.x - r, x2: k.x + r, y1: k.y - r, y2: k.y + r }; });
    const hits = (b, self) => b.x1 < MINX || b.x2 > MAXX || b.y1 < MINY || b.y2 > MAXY || boxes.some((o, i) => i !== self && b.x1 < o.x2 && b.x2 > o.x1 && b.y1 < o.y2 && b.y2 > o.y1);

    clusters.forEach((k, ki) => {
      const n = k.members.length;
      const rMax = 5 + (n - 1) * 4;
      const texts = k.members.map((c) => nums[c.id] + " " + c.name);
      const wBox = Math.max(...texts.map((x) => x.length)) * 6.1 + 4, hBox = n * LINE;
      const gap = rMax + 5;
      const tries = [
        [k.x + gap, k.y - hBox / 2], [k.x - gap - wBox, k.y - hBox / 2],
        [k.x + gap - 4, k.y - hBox - 4], [k.x + gap - 4, k.y + 4],
        [k.x - gap - wBox + 4, k.y - hBox - 4], [k.x - gap - wBox + 4, k.y + 4],
        [k.x - wBox / 2, k.y - gap - hBox], [k.x - wBox / 2, k.y + gap],
      ];
      let pick = tries.map(([x, y]) => ({ x1: x, x2: x + wBox, y1: y, y2: y + hBox })).find((b) => !hits(b, ki));
      if (!pick) { const [x, y] = tries[k.x > L + W * 0.6 ? 1 : 0]; pick = { x1: x, x2: x + wBox, y1: y, y2: y + hBox }; }
      boxes.push(pick);
      const lead = Math.abs((pick.x1 + pick.x2) / 2 - k.x) > wBox / 2 + rMax + 8;
      k.members.forEach((c, j) => {
        const g = s("g", { class: "mk", tabindex: "0", role: "link", "aria-label": nums[c.id] + ". " + c.name });
        const open = () => go({ name: "chat", id: c.id });
        g.addEventListener("click", open);
        g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } });
        g.append(s("circle", { cx: k.x, cy: k.y, r: 5 + j * 4, class: j === 0 ? "dot" : "ring-mk" }));
        if (j === 0) g.append(s("circle", { cx: k.x, cy: k.y, r: 10, class: "pulse" }));
        if (j === 0 && lead) g.append(s("line", { x1: k.x, y1: k.y, x2: (pick.x1 + pick.x2) / 2, y2: (pick.y1 + pick.y2) / 2, class: "lead" }));
        g.append(s("text", { x: pick.x1 + 2, y: pick.y1 + LINE * j + 10, class: "label" }, texts[j]));
        svg.append(g);
      });
    });
    return svg;
  }

  function coordText(c) {
    const k = c.coords;
    return Math.abs(k.lat) + (k.lat >= 0 ? " N, " : " S, ") + k.lon + (k.ew === "W" ? " W" : " E");
  }

  function legendTable(list, nums) {
    return h("div", { class: "table-wrap" }, h("table", { class: "legend" },
      h("thead", {}, h("tr", {}, h("th", { scope: "col" }, t("colNo")), h("th", { scope: "col" }, t("colName")), h("th", { scope: "col" }, t("colPos")))),
      h("tbody", {}, list.map((c) => {
        const page = E.pageOf(c, c.coords.page);
        return h("tr", {},
          h("td", {}, h("span", { class: "num " + placeClass(c) }, String(nums[c.id]))),
          h("td", {}, h("button", { class: "legend-link", type: "button", onclick: () => go({ name: "chat", id: c.id }) }, c.name)),
          h("td", {}, coordText(c), c.coords.note ? h("span", { class: "muted" }, " · " + c.coords.note) : null, " ", link(page, t("sourceLink"))));
      }))));
  }

  function renderMap() {
    setHeader(t("mapTitle"), false, t("tabMap"));
    const mars = data.contacts.filter((c) => c.place === "Mars" && c.coords);
    const moon = data.contacts.filter((c) => c.place === "Moon" && c.coords);
    const nums = {};
    mars.forEach((c, i) => { nums[c.id] = i + 1; });
    moon.forEach((c, i) => { nums[c.id] = i + 1; });

    const wrap = h("div", { class: "mapwrap" });
    wrap.append(h("p", { class: "small muted" }, t("mapIntro")));
    wrap.append(h("section", { class: "glass map-card" },
      h("h2", {}, h("span", { class: "dot mars" }), t("mapMars")),
      planet(t("mapMars"), "marsFill", mars, nums, [["0", 0], ["90E", .25], ["180E", .5], ["270E", .75]]),
      legendTable(mars, nums)));
    wrap.append(h("section", { class: "glass map-card" },
      h("h2", {}, h("span", { class: "dot moon" }), t("mapMoon")),
      planet(t("mapMoon"), "moonFill", moon, nums, [["180W", 0], ["90W", .25], ["0", .5], ["90E", .75]]),
      legendTable(moon, nums),
      h("p", { class: "small muted" }, t("cluster"))));

    const none = data.contacts.filter((c) => c.place === "Mars" && !c.coords);
    if (none.length) {
      wrap.append(h("section", { class: "glass map-card" },
        h("h2", {}, t("noPos")),
        h("p", { class: "small" }, none.map((c, i) => (i ? "; " : "") + c.name + " (" + c.place_detail + ")"), ". " + t("noGuess"))));
    }

    const deep = data.contacts.filter((c) => c.place === "Deep space");
    if (deep.length) {
      wrap.append(h("section", { class: "glass map-card" },
        h("h2", {}, h("span", { class: "dot deep" }), t("deep")),
        deep.map((c) => h("p", { class: "small" },
          h("button", { class: "legend-link", type: "button", onclick: () => go({ name: "chat", id: c.id }) }, c.name),
          ": " + c.place_detail + ". " + c.last_seen.text + ". " + t("source") + ": ",
          link(E.pageOf(c, c.last_seen.page)), "."))));
    }
    view.append(wrap);
  }

  // ---- Sticker Book Screen ---------------------------------------------------
  function renderStickers() {
    const have = data.contacts.filter((c) => stickers[c.id] != null).length;
    setHeader(t("bookTitle"), false, t("progress", { have, n: data.contacts.length }));

    view.append(h("section", { class: "hero glass compact" },
      h("div", { class: "hero-text" },
        h("p", { class: "hero-line" }, t("progress", { have, n: data.contacts.length })),
        h("p", { class: "small muted" }, t("bookIntro"))
      ),
      ring(have, data.contacts.length)
    ));

    view.append(h("ul", { class: "stickers" }, data.contacts.map((c, i) => {
      const got = stickers[c.id] != null;
      if (!got) {
        return h("li", { style: { "--i": String(i) } },
          h("button", { class: "sticker locked", type: "button", onclick: () => go({ name: "chat", id: c.id }) },
            h("span", { class: "lock" }, icon(ICONS.lock)),
            h("strong", {}, c.name),
            h("small", {}, t("locked", { name: c.name }))
          )
        );
      }
      return h("li", { style: { "--i": String(i) } },
        h("button", { class: "sticker got", type: "button", onclick: () => go({ name: "card", id: c.id }) },
          c.image ? h("img", { src: c.image.file, alt: "", loading: "lazy" }) : avatar(c),
          h("strong", {}, c.name),
          h("small", {}, E.card(c).title),
          h("small", { class: "score" }, icon(ICONS.star), t("quizScore", { s: stickers[c.id], t: c.quiz.length }))
        )
      );
    })));
  }

  // ---- App Initialization ----------------------------------------------------
  applyLang();
  try { stickers = JSON.parse(store("lmh-stickers") || "{}") || {}; } catch (e) { stickers = {}; }

  // Support single-file embedded data or network fetch
  const load = window.LMH_DATA ? Promise.resolve(window.LMH_DATA)
    : fetch("data/contacts.json").then((r) => { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); });

  load.then((d) => {
    data = d;
    Object.keys(stickers).forEach((id) => { if (!byId(id)) delete stickers[id]; });
    const targetChat = params.get("chat") || (location.hash.startsWith("#chat=") ? location.hash.replace("#chat=", "") : null);
    const targetTab = params.get("tab") || (location.hash.startsWith("#tab=") ? location.hash.replace("#tab=", "") : null);
    if (targetTab && ["chats", "map", "stickers"].includes(targetTab)) {
      tab = targetTab;
    }
        const targetCard = params.get("card") || (location.hash.startsWith("#card=") ? location.hash.replace("#card=", "") : null);
    if (targetCard && byId(targetCard)) {
      go({ name: "card", id: targetCard });
    } else if (targetChat && byId(targetChat)) {
      go({ name: "chat", id: targetChat });
    } else {
      render();
    }
  }).catch((e) => {
    setHeader("Last Message Home", false);
    view.append(h("div", { class: "intro glass", role: "alert" },
      h("p", {}, t("loadFail", { msg: e.message })),
      h("p", {}, t("loadHelp"))));
  });

  // Offline service worker registration
  if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol) && !params.has("nosw") && !window.LMH_DATA) {
    window.addEventListener("load", () => {
      const first = !navigator.serviceWorker.controller;
      navigator.serviceWorker.register("sw.js").then((reg) => {
        if (first && reg.installing) reg.installing.addEventListener("statechange", (e) => {
          if (e.target.state === "activated") toast(t("offline"));
        });
      }).catch(() => {});
    });
  }
})();
