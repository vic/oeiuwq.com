// Plays a scripted tour of every oeiuwq.com site in headless Chromium and
// saves the frames.
//
//   node record.mjs CDP_PORT APP_PORT FRAMES_DIR
//
// The server runs with -dev, so every site is /?site=<name> on one host. Each
// page gets two overlays: the keys being pressed and a one-line caption.
// Frames are PNGs; frames.txt lists them with how long each was on screen, for
// ffmpeg's concat demuxer.
import fs from "node:fs";

const [, , cdpPort, appPort, framesDir] = process.argv;
const W = 1280;
const H = 720;
const FRAME_MS = 110;
const base = `http://127.0.0.1:${appPort}`;

const targets = await (await fetch(`http://127.0.0.1:${cdpPort}/json`)).json();
const ws = new WebSocket(targets.find((t) => t.type === "page").webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let nextId = 0;
const pending = new Map();
ws.onmessage = (m) => {
  const d = JSON.parse(m.data);
  if (d.id && pending.has(d.id)) {
    pending.get(d.id)(d);
    pending.delete(d.id);
  }
};
// A command that gets no answer in 15 s ends the tour with an error, not a hang.
const send = (method, params = {}) =>
  new Promise((res, rej) => {
    const id = ++nextId;
    const timer = setTimeout(() => {
      pending.delete(id);
      rej(new Error(`no answer to ${method} in 15 s`));
    }, 15000);
    pending.set(id, (d) => {
      clearTimeout(timer);
      res(d);
    });
    ws.send(JSON.stringify({ id, method, params }));
  });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ------------------------------------------------------------------ frames
const frames = [];
let recording = false;
async function capture() {
  let n = 0;
  while (recording) {
    const t0 = Date.now();
    const r = await send("Page.captureScreenshot", { format: "png" }).catch((e) => (console.error(e.message), {}));
    if (r.result) {
      const name = `f${String(++n).padStart(5, "0")}.png`;
      fs.writeFileSync(`${framesDir}/${name}`, Buffer.from(r.result.data, "base64"));
      frames.push({ name, at: t0 });
    }
    await sleep(Math.max(0, FRAME_MS - (Date.now() - t0)));
  }
}
function writeList() {
  const lines = [];
  frames.forEach((f, i) => {
    const next = frames[i + 1] ? frames[i + 1].at : f.at + FRAME_MS;
    lines.push(`file '${f.name}'`, `duration ${((next - f.at) / 1000).toFixed(3)}`);
  });
  lines.push(`file '${frames[frames.length - 1].name}'`); // concat needs the last file repeated
  fs.writeFileSync(`${framesDir}/frames.txt`, lines.join("\n") + "\n");
}

// ------------------------------------------------------------------- input
const SHIFTED = new Set([..."ABCDEFGHIJKLMNOPQRSTUVWXYZ<>?+{}:\"~!@#$%^&*()_|"]);
const CODES = {
  Enter: 13, Escape: 27, Backspace: 8, Tab: 9, " ": 32, Delete: 46, PageDown: 34, PageUp: 33,
  ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40, F1: 112, F2: 113, F3: 114, F9: 120, F10: 121,
};
const keyDown = (k, mods = 0) => {
  const code = CODES[k] ?? k.toUpperCase().charCodeAt(0);
  const text = k === "Enter" ? "\r" : k.length === 1 ? k : undefined;
  return send("Input.dispatchKeyEvent", { type: "keyDown", key: k, code: k, windowsVirtualKeyCode: code, modifiers: mods | (SHIFTED.has(k) ? 8 : 0), text });
};
const keyUp = (k, mods = 0) => {
  const code = CODES[k] ?? k.toUpperCase().charCodeAt(0);
  return send("Input.dispatchKeyEvent", { type: "keyUp", key: k, code: k, windowsVirtualKeyCode: code, modifiers: mods });
};
async function press(k, mods = 0) {
  await keyDown(k, mods);
  await keyUp(k, mods);
}
// keys("ArrowDown ArrowDown Enter") presses each in turn
async function keys(seq, gap = 330) {
  for (const k of seq.split(" ")) {
    await press(k === "SPC" ? " " : k);
    await sleep(gap);
  }
}
// type() writes into the focused field one character at a time, like a person.
async function type(text, gap = 55) {
  for (const ch of text) {
    await send("Input.insertText", { text: ch });
    await sleep(gap);
  }
}
const run = async (js) => (await send("Runtime.evaluate", { expression: js, returnByValue: true, awaitPromise: true })).result?.result?.value;

// The center of the first element that matches css and holds text.
async function spot(css, text = "") {
  return run(`(() => {
    const e = [...document.querySelectorAll(${JSON.stringify(css)})].find((x) => x.textContent.includes(${JSON.stringify(text)}));
    if (!e) return null;
    e.scrollIntoView({ block: "nearest" });
    const r = e.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  })()`);
}
// Real mouse moves and clicks, so hover menus and pointer events fire.
async function hover(css, text) {
  const p = await spot(css, text);
  if (!p) throw new Error(`no ${css} with "${text}"`);
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: p.x, y: p.y });
  return p;
}
async function click(css, text = "") {
  const p = await hover(css, text);
  await sleep(150);
  await send("Input.dispatchMouseEvent", { type: "mousePressed", x: p.x, y: p.y, button: "left", clickCount: 1 });
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: p.x, y: p.y, button: "left", clickCount: 1 });
}
const focus = (css) => run(`document.querySelector(${JSON.stringify(css)}).focus()`);

// Overlays live in the page, above the app, and never take mouse or keyboard
// input. A new page needs them again.
async function installOverlays() {
  await run(`(() => {
    if (document.getElementById('cap')) return;
    const css = document.createElement('style');
    css.textContent = \`
      #kc { position: fixed; right: 14px; bottom: 60px; display: flex; gap: 6px; z-index: 99999; pointer-events: none; }
      #kc span { font: 700 15px Pragmasevka, ui-monospace, monospace; background: #6dfedf; color: #292a44; padding: 4px 10px; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,.5); }
      #cap { position: fixed; left: 50%; transform: translateX(-50%); top: 14px; z-index: 99999; pointer-events: none; font: 600 17px "JetBrains Mono", ui-monospace, monospace; background: rgba(41,42,68,.94); color: #f1eff8; padding: 8px 18px; border-radius: 999px; border: 2px solid #663399; box-shadow: 0 4px 16px rgba(0,0,0,.5); opacity: 0; transition: opacity .25s; white-space: nowrap; }
      #cap b { color: #ff79c6; }
    \`;
    document.head.appendChild(css);
    const kc = document.createElement('div'); kc.id = 'kc'; document.body.appendChild(kc);
    const cap = document.createElement('div'); cap.id = 'cap'; document.body.appendChild(cap);
    const names = { ' ': 'SPC', Enter: '⏎', Escape: 'Esc', Backspace: '⌫', Tab: 'Tab', Delete: 'DEL', ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓', PageDown: 'PgDn' };
    document.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      if (e.key.length > 1 && !names[e.key] && !/^F[0-9]+$/.test(e.key)) return;
      if ((e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') && !(e.key === 'Enter' || e.key === 'Escape' || e.ctrlKey || /^F[0-9]+$/.test(e.key))) return;
      const s = document.createElement('span');
      s.textContent = (e.ctrlKey ? 'Ctrl+' : '') + (names[e.key] || e.key);
      kc.appendChild(s);
      while (kc.children.length > 4) kc.removeChild(kc.firstChild);
      setTimeout(() => s.remove(), 1500);
    }, true);
    window.__cap = (t) => { cap.innerHTML = t; cap.style.opacity = t ? 1 : 0; };
  })()`);
}
const caption = (t) => run(`window.__cap && window.__cap(${JSON.stringify(t)})`);

const step = (s) => console.log(new Date().toISOString().slice(11, 19), s);

// go(site): open a site, wait for its data, put the overlays back
async function go(site, wait = 2200, hash = "") {
  await send("Page.navigate", { url: `${base}/?site=${site}${hash}` });
  await sleep(wait);
  await installOverlays();
}
// arrive(): after a link click, wait for the next page
async function arrive(wait = 2200) {
  await sleep(wait);
  await installOverlays();
}

// ------------------------------------------------------------------- tour
await send("Page.enable");
await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile: false });
await send("Page.navigate", { url: "about:blank" });
await sleep(300);

recording = true;
const capturing = capture();

step("home");
// oeiuwq.com: the power-on test, the boot menu, SETUP
await send("Page.navigate", { url: `${base}/?site=home` });
await sleep(500);
await installOverlays();
await caption("<b>oeiuwq.com</b> boots like an old PC");
await sleep(3600);
await caption("Every corner of the site is a subdomain with its own computer");
await keys("ArrowDown ArrowDown ArrowDown ArrowUp ArrowUp ArrowUp", 260);
await sleep(600);
await caption("DEL opens SETUP: 600+ base16 color schemes for every page");
await press("Delete");
await sleep(900);
const filter = async (q) => {
  await run(`(() => { const i = document.querySelector('.setup input'); i.focus(); i.value = ''; i.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await type(q, 60);
  await keys("ArrowDown", 900);
};
await filter("gruvbox dark hard");
await filter("dracula");
await filter("catppuccin mocha");
await caption("Esc keeps Rebecca purple, the default");
await press("Escape");
await sleep(1100);
await caption("Enter boots <b>codes</b>");
await sleep(700);
await press("Enter");
await arrive(2600);

step("codes");
await caption("<b>codes</b>: every public repo since 2008 on a timeline, on Mac OS 9");
await sleep(3200);
await caption("Logic: ask my repos questions in Datalog, right in the browser");
await click(".menubar .title", "Logic");
await sleep(600);
await click(".menubar .item", "connect to algebraic");
await sleep(3200);
await caption("…or search with μKanren, that also finds answers in endless searches");
await click(".menubar .title", "Logic");
await sleep(500);
await click(".menubar .item", "μKanren");
await sleep(3200);
await caption("Activity: what I did, year by year");
await click(".desktop .icon", "Activity");
await sleep(2600);
await caption("Every site links to every other: the Go menu");
await click(".menubar .title", "Go");
await sleep(1600);
await click(".menubar .item", "Projects");
await arrive(2400);

step("projects");
await caption("<b>projects</b>: a Turbo IDE where each of my projects is a file");
await sleep(1800);
await keys("ArrowDown ArrowDown ArrowDown Enter", 380);
await sleep(1600);
await keys("PageDown PageDown", 700);
await caption("F3 opens any project. READMEs render as real markdown");
await press("F3");
await sleep(700);
await type("den", 120);
await sleep(700);
await press("Enter");
await sleep(2200);

step("stars");
await go("stars", 2600);
await caption("<b>stars</b>: Nautilus on GNOME 1.4, searching 4500 READMEs over Gopher");
await sleep(2200);
await press("/");
await sleep(400);
await type("algebraic effects", 50);
await press("Enter");
await sleep(1800);
await run(`document.activeElement.blur()`);
await keys("ArrowDown Enter", 500);
await sleep(2200);
await caption("The GNOME menu reaches every other corner");
await click(".g-foot");
await sleep(500);
await hover(".g-has", "Games");
await sleep(2200);
await click(".g-submenu a", "NEON VIGIL");
await arrive(1600);

step("nes");
await caption("<b>nes</b>: NEON VIGIL, an 8-bit night in a cyberpunk arcology");
await sleep(1600);
await keys("Enter", 900);
await caption("A night courier, a plasma lash, a code vault to set free");
await keys("Enter Enter Enter", 1500);
await caption("Run, jump and lash");
await keyDown("ArrowRight");
for (let i = 0; i < 9; i++) {
  await press(i % 3 === 0 ? "x" : "z");
  await sleep(480);
}
await keyUp("ArrowRight");
await caption("Every game can be edited in the page and played again");
await click(".pill", "EDIT");
await sleep(2400);
await click(".editor button", "Close");
await sleep(300);

step("adventure");
await go("adventure", 1800);
await caption("<b>adventure</b>: THE LOST COMMIT, a text adventure on a 64");
await sleep(2000);
await focus("#c64-in");
for (const cmd of ["e", "take potato", "x potato", "w", "n"]) {
  await type(cmd, 70);
  await press("Enter");
  await sleep(1000);
}
await caption("DIR lists the disk: every site is a program to LOAD");
await type("dir", 90);
await press("Enter");
await sleep(2600);

step("smalltalk");
await go("smalltalk", 1800);
await caption("<b>smalltalk</b>: a Smalltalk-80 whose image lives in your browser");
await sleep(2000);
await run(`(() => { const t = document.querySelector('.st-work textarea'); const a = t.value.indexOf('Transcript show'); const b = t.value.indexOf('15 fib.') + 7; t.focus(); t.setSelectionRange(a, b); t.dispatchEvent(new Event('select', { bubbles: true })); })()`);
await caption("Select some code, Ctrl+P runs it and prints the answer");
await press("p", 2);
await sleep(1600);
await run(`(() => { const t = document.querySelector('.st-work textarea'); const a = t.value.indexOf('Object subclass'); t.focus(); t.setSelectionRange(a, t.value.length); t.dispatchEvent(new Event('select', { bubbles: true })); })()`);
await caption("Ctrl+D does it: a new class, kept for next time");
await press("d", 2);
await sleep(1200);
await click(".st-pane li", "Counter");
await sleep(900);
await click(".st-pane li", "increment");
await sleep(2200);

step("blog");
await go("blog", 2000);
await caption("<b>blog</b>: a BBS with posts on what I make and why");
await sleep(2400);
await click(".list button", "dnx");
await sleep(2600);
await keys("q", 600);
await caption("Bulletins and last callers are live from GitHub");
await run(`window.scrollTo({ top: 600, behavior: 'smooth' })`);
await sleep(2400);

step("portfolio");
await go("portfolio", 2000);
await caption("<b>portfolio</b>: my CV on NeXTSTEP, with a dock to every site");
await sleep(2400);
await run(`window.scrollTo({ top: 700, behavior: 'smooth' })`);
await sleep(2000);

step("faith");
await go("faith", 1600);
await caption("<b>faith</b>: a HyperCard stack");
await keys("ArrowRight", 1500);
await keys("ArrowRight", 1800);
await caption("The Home card has a stack for every site");
await click(".hc-home");
await sleep(2200);

step("love");
await go("love", 1400);
await caption("<b>love</b>: write me a love letter in DOS EDIT. F2 sends it");
await focus(".edit-area textarea");
await run(`(() => { const t = document.querySelector('.edit-area textarea'); t.setSelectionRange(t.value.length, t.value.length); })()`);
await type("\n\nP.S. hey, here's a potato.", 60);
await sleep(800);
await caption("File › Open lists every other site as a file");
await click(".dm-title", "ile");
await sleep(600);
await click(".dm-item", "pen");
await sleep(2400);

step("sponsor");
await go("sponsor", 1600);
await caption("<b>sponsor</b>: an arcade with BUG HUNT, a game nobody loses");
await sleep(2400);
await caption("EDIT RULES: a shorter round, then Run");
await click(".panel .edit", "EDIT");
await sleep(800);
await run(`(() => { const t = document.querySelector('.editor textarea'); t.value = t.value.replace('seconds: 30', 'seconds: 7'); t.dispatchEvent(new Event('input', { bubbles: true })); })()`);
await sleep(1200);
await click(".editor button", "Run");
await caption("Steer, the ship fires by itself");
for (let i = 0; i < 22; i++) {
  const p = await run(`(() => { const f = document.querySelector('.field'); if (!f) return null; const r = f.getBoundingClientRect(); return { x: r.left + r.width * (0.2 + 0.6 * Math.abs(Math.sin(${i} * 0.45))), y: r.top + r.height * 0.8 }; })()`);
  if (p) await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: p.x, y: p.y });
  await sleep(320);
}
await caption("…you win, and the screen asks you to keep the fun going");
await sleep(3000);
await caption("More cabinets on this floor, one for every site");
await run(`window.scrollTo({ top: 900, behavior: 'smooth' })`);
await sleep(2600);

step("end");
await go("home", 4600);
await caption("<b>oeiuwq.com</b> · one Go binary, Elm apps, everything free. Thanks for visiting <3");
await sleep(3400);
await caption("");
await sleep(500);

recording = false;
await capturing;
writeList();
console.log(`${frames.length} frames over ${((frames[frames.length - 1].at - frames[0].at) / 1000).toFixed(1)} s`);
ws.close();
