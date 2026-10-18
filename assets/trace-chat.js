/* TRACE support chat widget. One file, no dependencies.
   Add to a page:  <script src="/assets/trace-chat.js" data-endpoint="https://YOUR-WORKER.workers.dev" defer></script>
   Colours come from the site's own CSS variables (--bg-1, --orange, --txt ...), with fallbacks. */
(function () {
  "use strict";
  if (window.traceChat) return;

  var script =
    document.currentScript || document.querySelector('script[src*="trace-chat"]');
  var ENDPOINT = (script && script.getAttribute("data-endpoint")) || "/api/chat";

  var MODELS = [
    { id: "flash-lite", label: "Fast (Flash-Lite)", short: "Flash-Lite" },
    { id: "groq", label: "Instant (Groq)", short: "Groq" },
  ];
  var GREETING = "Hey, ask me anything about TRACE: setup, the PC and Android apps, features like Dyno & Tune and Keep Awake, or troubleshooting.";
  var history = []; // real turns only: {role, text}
  var busy = false;

  var CSS = [
    ".tc-root{--tc-bg:var(--bg-1,#0e0e11);--tc-bg2:var(--bg-2,#17171b);--tc-bg3:var(--bg-3,#202024);--tc-line:var(--line,rgba(255,255,255,.08));--tc-line2:var(--line-2,rgba(255,255,255,.16));--tc-red:var(--orange,#c8102e);--tc-reddim:var(--orange-dim,#8c0c22);--tc-red2:var(--orange-2,#e2455a);--tc-txt:var(--txt,#f2f0ec);--tc-mid:var(--mid,#96949c);--tc-dim:var(--dim,#605e68);--tc-green:var(--green,#3c9a5f);font-family:var(--font-body,system-ui,sans-serif);color:var(--tc-txt);position:fixed;right:20px;bottom:84px;z-index:9999;line-height:1.5}",
    ".tc-root *{box-sizing:border-box}",
    ".tc-fab{display:flex;align-items:center;gap:8px;background:var(--tc-red);color:var(--tc-txt);border:0;border-radius:var(--radius,6px);padding:11px 16px;font:600 13px/1 var(--font-display,system-ui,sans-serif);letter-spacing:.06em;text-transform:uppercase;cursor:pointer;box-shadow:0 8px 24px -8px rgba(0,0,0,.7)}",
    ".tc-fab:hover{background:var(--tc-red2)}",
    ".tc-fab:focus-visible,.tc-x:focus-visible,.tc-send:focus-visible,.tc-chip:focus-visible{outline:2px solid var(--tc-txt);outline-offset:2px}",
    ".tc-fab svg{width:18px;height:18px}",
    ".tc-panel{position:absolute;right:0;bottom:0;width:360px;max-width:calc(100vw - 24px);height:min(560px,calc(100vh - 130px));display:none;flex-direction:column;background:var(--tc-bg);border:1px solid var(--tc-line);border-radius:var(--radius,6px);overflow:hidden;box-shadow:0 24px 60px -16px rgba(0,0,0,.8)}",
    ".tc-open .tc-panel{display:flex}",
    ".tc-open .tc-fab{display:none}",
    ".tc-hd{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-bottom:1px solid var(--tc-line)}",
    ".tc-ttl{display:flex;align-items:center;gap:8px;font:600 13px/1 var(--font-display,system-ui,sans-serif);letter-spacing:.08em;text-transform:uppercase}",
    ".tc-dot{width:8px;height:8px;border-radius:50%;background:var(--tc-green)}",
    ".tc-x{background:none;border:0;color:var(--tc-mid);font-size:22px;line-height:1;cursor:pointer;padding:2px 6px;border-radius:4px}",
    ".tc-x:hover{color:var(--tc-txt)}",
    ".tc-mrow{display:flex;align-items:center;gap:8px;padding:9px 14px;border-bottom:1px solid var(--tc-line);font-size:12px;color:var(--tc-mid)}",
    ".tc-sel{flex:1;height:30px;background:var(--tc-bg2);color:var(--tc-txt);border:1px solid var(--tc-line2);border-radius:4px;font:inherit;font-size:13px;padding:0 8px}",
    ".tc-log{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px}",
    ".tc-m{max-width:88%;padding:8px 12px;border-radius:var(--radius,6px);font-size:13px;white-space:pre-wrap;word-wrap:break-word}",
    ".tc-m a{color:var(--tc-red2);text-decoration:underline}",
    ".tc-m code{font-family:var(--font-mono,monospace);font-size:12px;background:var(--tc-bg3);padding:1px 5px;border-radius:3px}",
    ".tc-bot{align-self:flex-start;background:var(--tc-bg2)}",
    ".tc-me{align-self:flex-end;background:var(--tc-reddim)}",
    ".tc-note{align-self:flex-start;font:11px/1.3 var(--font-mono,monospace);color:var(--tc-dim);margin-top:-4px}",
    ".tc-chips{display:flex;flex-wrap:wrap;gap:6px}",
    ".tc-chip{background:none;border:1px solid var(--tc-line2);color:var(--tc-mid);border-radius:999px;padding:5px 10px;font:inherit;font-size:12px;cursor:pointer}",
    ".tc-chip:hover{color:var(--tc-txt);border-color:var(--tc-mid)}",
    ".tc-typing span{display:inline-block;width:6px;height:6px;margin-right:3px;border-radius:50%;background:var(--tc-mid);animation:tc-b 1s infinite ease-in-out}",
    ".tc-typing span:nth-child(2){animation-delay:.15s}.tc-typing span:nth-child(3){animation-delay:.3s}",
    "@keyframes tc-b{0%,80%,100%{opacity:.25}40%{opacity:1}}",
    "@media (prefers-reduced-motion:reduce){.tc-typing span{animation:none;opacity:.6}}",
    ".tc-form{display:flex;gap:8px;padding:10px 14px;border-top:1px solid var(--tc-line)}",
    ".tc-in{flex:1;min-width:0;height:36px;background:var(--tc-bg2);color:var(--tc-txt);border:1px solid var(--tc-line2);border-radius:4px;font:inherit;font-size:14px;padding:0 10px}",
    ".tc-in::placeholder{color:var(--tc-dim)}",
    ".tc-send{width:40px;border:0;border-radius:4px;background:var(--tc-red);color:var(--tc-txt);cursor:pointer;display:flex;align-items:center;justify-content:center}",
    ".tc-send:hover{background:var(--tc-red2)}",
    ".tc-send svg{width:16px;height:16px}",
    ".tc-fine{padding:0 14px 10px;font-size:11px;color:var(--tc-dim)}",
    "@media (max-width:480px){.tc-root{right:12px;bottom:80px}.tc-panel{position:fixed;left:8px;right:8px;bottom:8px;width:auto;max-width:none;height:min(70vh,560px)}.tc-in,.tc-sel{font-size:16px}}",
  ].join("\n");

  function esc(s) {
    return s.replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function fmt(t) {
    var h = esc(t);
    h = h.replace(/`([^`\n]+)`/g, "<code>$1</code>");
    h = h.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");
    h = h.replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)])/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
    h = h.replace(
      /(^|[\s(])((?:gt7trace\.netlify\.app|github\.com|ko-fi\.com)\/[^\s<]*[^\s<.,;:!?)])/g,
      '$1<a href="https://$2" target="_blank" rel="noopener noreferrer">$2</a>'
    );
    return h;
  }
  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  var style = document.createElement("style");
  style.id = "trace-chat-style";
  style.textContent = CSS;
  document.head.appendChild(style);

  var root = el("div", "tc-root");
  var fab = el(
    "button",
    "tc-fab",
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><span>Ask TRACE</span>'
  );
  fab.type = "button";
  fab.setAttribute("aria-label", "Open TRACE support chat");
  fab.setAttribute("aria-expanded", "false");

  var panel = el("div", "tc-panel");
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "TRACE support chat");

  var hd = el("div", "tc-hd", '<div class="tc-ttl"><span class="tc-dot"></span>TRACE support</div>');
  var xbtn = el("button", "tc-x", "&times;");
  xbtn.type = "button";
  xbtn.setAttribute("aria-label", "Close chat");
  hd.appendChild(xbtn);

  var mrow = el("div", "tc-mrow", "<span>Model</span>");
  var sel = el("select", "tc-sel");
  sel.setAttribute("aria-label", "Choose AI model");
  MODELS.forEach(function (m) {
    var o = document.createElement("option");
    o.value = m.id;
    o.textContent = m.label;
    sel.appendChild(o);
  });
  try {
    var saved = localStorage.getItem("trace-chat-model");
    if (saved && MODELS.some(function (m) { return m.id === saved; })) sel.value = saved;
  } catch (e) {}
  sel.addEventListener("change", function () {
    try { localStorage.setItem("trace-chat-model", sel.value); } catch (e) {}
  });
  mrow.appendChild(sel);

  var log = el("div", "tc-log");
  log.setAttribute("role", "log");
  log.setAttribute("aria-live", "polite");

  var form = el("form", "tc-form");
  var input = el("input", "tc-in");
  input.type = "text";
  input.maxLength = 800;
  input.placeholder = "Describe your problem";
  input.setAttribute("aria-label", "Your question");
  input.autocomplete = "off";
  var send = el(
    "button",
    "tc-send",
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4z"/></svg>'
  );
  send.type = "submit";
  send.setAttribute("aria-label", "Send");
  form.appendChild(input);
  form.appendChild(send);

  var fine = el("div", "tc-fine", "AI answers can be wrong. If something looks off, open a GitHub issue.");

  panel.appendChild(hd);
  panel.appendChild(mrow);
  panel.appendChild(log);
  panel.appendChild(form);
  panel.appendChild(fine);
  root.appendChild(panel);
  root.appendChild(fab);
  document.body.appendChild(root);

  function scroll() { log.scrollTop = log.scrollHeight; }
  function bubble(kind, text) {
    var b = el("div", "tc-m " + (kind === "me" ? "tc-me" : "tc-bot"));
    if (kind === "me") b.textContent = text;
    else b.innerHTML = fmt(text);
    log.appendChild(b);
    scroll();
    return b;
  }
  function note(text) {
    log.appendChild(el("div", "tc-note", esc(text)));
    scroll();
  }
  function shortName(id) {
    for (var i = 0; i < MODELS.length; i++) if (MODELS[i].id === id) return MODELS[i].short;
    return id;
  }

  bubble("bot", GREETING);
  var chips = el("div", "tc-chips");
  ["Dashboard says OFFLINE", "Windows blocked the app", "Car name is blank", "Stop my PC sleeping mid-race", "Set up the Android app", "What data does TRACE send?"].forEach(function (q) {
    var c = el("button", "tc-chip");
    c.type = "button";
    c.textContent = q;
    c.addEventListener("click", function () { ask(q); });
    chips.appendChild(c);
  });
  log.appendChild(chips);

  function open() {
    root.classList.add("tc-open");
    fab.setAttribute("aria-expanded", "true");
    setTimeout(function () { input.focus(); }, 0);
  }
  function close() {
    root.classList.remove("tc-open");
    fab.setAttribute("aria-expanded", "false");
    fab.focus();
  }

  function ask(text) {
    text = String(text || "").trim();
    if (!text || busy) return;
    open();
    if (chips.parentNode) chips.parentNode.removeChild(chips);
    busy = true;
    send.disabled = true;
    input.value = "";
    history.push({ role: "user", text: text });
    if (history.length > 20) history = history.slice(-20);
    bubble("me", text);
    var typing = bubble("bot", "");
    typing.className += " tc-typing";
    typing.innerHTML = "<span></span><span></span><span></span>";

    var ctl = new AbortController();
    var timer = setTimeout(function () { ctl.abort(); }, 30000);
    var chosen = sel.value;

    fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: history.slice(-6), model: chosen }),
      signal: ctl.signal,
    })
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (d) { return { ok: r.ok, d: d }; });
      })
      .then(function (res) {
        var d = res.d || {};
        if (d.errors && window.console) console.debug("[trace-chat] server errors:", d.errors);
        if (typing.parentNode) typing.parentNode.removeChild(typing);
        var reply = d.reply || "Something went wrong. Try again in a moment.";
        bubble("bot", reply);
        if (res.ok && d.used && d.used !== "none" && d.used !== "limit") {
          if (d.used === "backup") note("chosen model was busy - answered by backup model");
          else note("answered by " + shortName(d.used));
          history.push({ role: "assistant", text: reply });
        } else {
          history.pop();
        }
      })
      .catch(function () {
        if (typing.parentNode) typing.parentNode.removeChild(typing);
        bubble("bot", "Couldn't reach the support bot. Check your connection and try again.");
        history.pop();
      })
      .then(function () {
        clearTimeout(timer);
        busy = false;
        send.disabled = false;
        input.focus();
      });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    ask(input.value);
  });
  fab.addEventListener("click", open);
  xbtn.addEventListener("click", close);
  root.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && root.classList.contains("tc-open")) close();
  });

  window.traceChat = { open: open, close: close, ask: ask };
})();
