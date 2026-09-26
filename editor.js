/* ==============================================================
   EDITOR DA LETRA
   Só aparece quando o site é aberto com ?editar no endereço,
   ex.: index.html?editar  (quem só abre o site normal não vê nada disso)
   ============================================================== */
(function () {
  "use strict";

  const C = window.Coracao;
  if (!C || !C.EDIT_MODE) return;

  const STORE_KEY = "coracao-letra-v1";
  const REACTION = 0.3; // compensa o tempo de reação ao tocar no botão

  // Tempos calculados a partir do áudio (Eternamente – Gal Costa, trecho de 54 s)
  const SUGERIDOS = [
    [0.3, 6.6], [7.3, 12.3], [14.0, 20.2], [21.0, 26.9],
    [28.1, 32.2], [32.4, 35.45], [35.5, 40.35], [40.5, 47.8]
  ];

  /* ---------------- estado ---------------- */

  let texts = [];   // frases
  let times = [];   // [entra, sai] por frase (pode ter mais tempos que frases)

  function fromFile() {
    const list = Array.isArray(window.LETRA) ? window.LETRA : [];
    const hasText = list.some(l => String(l.texto || "").trim());
    texts = hasText ? list.map(l => String(l.texto || "").trim()).filter(Boolean) : [];
    times = list.length
      ? list.map(l => [num(l.entra), num(l.sai)])
      : SUGERIDOS.map(x => x.slice());
  }

  function loadStored() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      if (!Array.isArray(data.texts) || !Array.isArray(data.times)) return false;
      texts = data.texts;
      times = data.times;
      return true;
    } catch (e) {
      return false;
    }
  }

  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify({ texts, times })); } catch (e) { /* sem armazenamento */ }
  }

  function num(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  function round2(v) { return Math.round(v * 100) / 100; }

  function fmt(t) {
    if (!Number.isFinite(t)) return "";
    const m = Math.floor(t / 60);
    const s = t - m * 60;
    return `${m}:${s < 10 ? "0" : ""}${s.toFixed(1)}`;
  }

  // aceita "7.3", "7,3", "0:07.3", "1:02"
  function parse(str) {
    const s = String(str).trim().replace(",", ".");
    if (!s) return null;
    const m = s.match(/^(\d+):(\d{1,2}(?:\.\d+)?)$/);
    if (m) return Number(m[1]) * 60 + Number(m[2]);
    return /^\d+(\.\d+)?$/.test(s) ? Number(s) : NaN;
  }

  function rows() {
    return texts.map((texto, i) => ({
      texto,
      entra: times[i] ? times[i][0] : null,
      sai: times[i] ? times[i][1] : null
    }));
  }

  function commit() {
    C.setLyrics(rows());
    save();
  }

  function duration() {
    const d = C.music.duration;
    return Number.isFinite(d) ? d : 54;
  }

  /* ---------------- interface ---------------- */

  const toggle = document.createElement("button");
  toggle.id = "editToggle";
  toggle.type = "button";
  toggle.textContent = "✎ Letra";

  const panel = document.createElement("aside");
  panel.id = "editor";
  panel.innerHTML = `
    <header class="ed-head">
      <h2>Letra da música</h2>
      <button type="button" class="ed-x" data-act="close" aria-label="Fechar editor">✕</button>
    </header>

    <div class="ed-bar">
      <div class="ed-player">
        <button type="button" class="ed-play" data-act="play" aria-label="Tocar">▶</button>
        <span class="ed-time">0:00.0</span>
        <input type="range" class="ed-seek" min="0" max="54" step="0.1" value="0" aria-label="Posição da música">
      </div>

      <div class="ed-mark-idle">
        <button type="button" class="ed-btn ed-primary" data-act="mark">⏱ Marcar tempos ouvindo a música</button>
      </div>
      <div class="ed-mark-live" hidden>
        <button type="button" class="ed-big" data-act="in">Entrou</button>
        <div class="ed-row">
          <button type="button" class="ed-btn" data-act="out">Frase saiu</button>
          <button type="button" class="ed-btn" data-act="stop">Parar</button>
        </div>
        <p class="ed-hint">Toque em <b>Entrou</b> quando começar cada frase. Se tiver um silêncio antes da próxima, toque em <b>Frase saiu</b>. No PC: <kbd>Espaço</kbd> = entrou, <kbd>S</kbd> = saiu.</p>
      </div>
      <p class="ed-msg" hidden></p>
    </div>

    <div class="ed-body">
      <label class="ed-label" for="edText">Cole a letra aqui, <b>uma frase por linha</b>, na ordem:</label>
      <textarea id="edText" rows="8" spellcheck="false" placeholder="Primeira frase&#10;Segunda frase&#10;Terceira frase&#10;..."></textarea>

      <div class="ed-table-wrap">
        <table class="ed-table">
          <thead><tr><th>#</th><th>Frase</th><th>Entra</th><th>Sai</th><th></th></tr></thead>
          <tbody></tbody>
        </table>
        <p class="ed-empty">Depois de colar a letra, as frases aparecem aqui com os tempos já preenchidos. Dá para mudar os números à mão (em segundos, ex.: <code>7.3</code> ou <code>0:07.3</code>).</p>
      </div>

      <div class="ed-actions">
        <button type="button" class="ed-btn ed-primary" data-act="download">⬇ Baixar letra.js</button>
        <button type="button" class="ed-btn" data-act="copy">Copiar código</button>
        <button type="button" class="ed-btn" data-act="suggest">Usar tempos sugeridos</button>
      </div>
      <p class="ed-note">As mudanças ficam salvas só neste navegador. Para aparecer no celular dela, clique em <b>Baixar letra.js</b> e troque o arquivo <code>letra.js</code> da pasta do projeto pelo baixado.</p>
      <p class="ed-note"><a href="#" data-act="reload">Descartar mudanças e recarregar do letra.js</a></p>
    </div>
  `;

  document.body.appendChild(toggle);
  document.body.appendChild(panel);

  const $ = sel => panel.querySelector(sel);
  const textarea = $("#edText");
  const tbody = $("tbody");
  const seek = $(".ed-seek");
  const timeLabel = $(".ed-time");
  const playBtn = $(".ed-play");
  const markIdle = $(".ed-mark-idle");
  const markLive = $(".ed-mark-live");
  const bigBtn = $(".ed-big");
  const outBtn = $('[data-act="out"]');
  const msg = $(".ed-msg");
  const empty = $(".ed-empty");

  let open = true;
  let msgTimer = null;

  function flash(text, ms = 6000) {
    msg.textContent = text;
    msg.hidden = false;
    clearTimeout(msgTimer);
    msgTimer = setTimeout(() => { msg.hidden = true; }, ms);
  }

  function setOpen(v) {
    open = v;
    panel.classList.toggle("open", open);
    document.body.classList.toggle("editor-open", open);
    toggle.hidden = open;
    updateReserve();
  }

  function isWide() { return window.innerWidth >= 760; }

  function updateReserve() {
    if (!open) C.setReserve({ right: 0, bottom: 0 });
    else if (isWide()) C.setReserve({ right: panel.offsetWidth, bottom: 0 });
    else C.setReserve({ right: 0, bottom: panel.offsetHeight });
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  }

  function renderTable() {
    empty.hidden = texts.length > 0;
    tbody.innerHTML = texts.map((t, i) => {
      const [a, b] = times[i] || [null, null];
      return `<tr data-i="${i}">
        <td class="n">${i + 1}</td>
        <td class="txt" title="${esc(t)}">${esc(t)}</td>
        <td><input class="t-in" data-k="0" inputmode="decimal" value="${fmt(a)}" aria-label="Frase ${i + 1} entra"></td>
        <td><input class="t-in" data-k="1" inputmode="decimal" value="${fmt(b)}" aria-label="Frase ${i + 1} sai"></td>
        <td><button type="button" class="row-play" data-act="row" aria-label="Ouvir frase ${i + 1}">▶</button></td>
      </tr>`;
    }).join("");
  }

  function syncFromTextarea() {
    texts = textarea.value.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    // frases novas além dos tempos existentes ganham os tempos sugeridos
    for (let i = times.length; i < texts.length; i++) {
      times[i] = SUGERIDOS[i] ? SUGERIDOS[i].slice() : [null, null];
    }
    renderTable();
    commit();
  }

  textarea.addEventListener("input", syncFromTextarea);

  tbody.addEventListener("change", e => {
    const input = e.target.closest(".t-in");
    if (!input) return;
    const i = Number(input.closest("tr").dataset.i);
    const k = Number(input.dataset.k);
    const v = parse(input.value);
    if (Number.isNaN(v)) {
      input.classList.add("bad");
      return;
    }
    input.classList.remove("bad");
    if (!times[i]) times[i] = [null, null];
    times[i][k] = v === null ? null : round2(v);
    input.value = fmt(times[i][k]);
    const [a, b] = times[i];
    if (Number.isFinite(a) && Number.isFinite(b) && b <= a) {
      flash(`Frase ${i + 1}: o "Sai" precisa ser depois do "Entra".`);
    }
    commit();
  });

  /* ---------------- marcar tempos tocando ---------------- */

  let mark = null; // { idx, prov: [], lastT }

  function renderMark() {
    markIdle.hidden = !!mark;
    markLive.hidden = !mark;
    if (!mark) return;
    if (mark.idx < texts.length) {
      const t = texts[mark.idx];
      bigBtn.innerHTML = `Entrou <span>${mark.idx + 1}/${texts.length} · ${esc(t.length > 34 ? t.slice(0, 33) + "…" : t)}</span>`;
    } else {
      bigBtn.innerHTML = `Terminar <span>todas as frases marcadas</span>`;
    }
    outBtn.disabled = !(mark.idx > 0 && mark.prov[mark.idx - 1]);
  }

  function startMark() {
    if (!texts.length) {
      flash("Cole a letra primeiro 🙂");
      textarea.focus();
      return;
    }
    // guarda os tempos antigos: frases que não forem marcadas voltam a eles
    mark = { idx: 0, prov: texts.map(() => false), lastT: 0, backup: times.map(r => (r ? r.slice() : [null, null])) };
    for (let i = 0; i < texts.length; i++) times[i] = [null, null];
    commit();
    renderTable();
    renderMark();
    C.playFrom(0);
  }

  function markIn() {
    if (!mark) return;
    if (mark.idx >= texts.length) { stopMark(); return; }
    const t = round2(Math.max(0, C.time() - REACTION));
    const i = mark.idx;
    if (i > 0 && mark.prov[i - 1]) {
      times[i - 1][1] = round2(Math.max(times[i - 1][0] + 0.3, t - 0.05));
      mark.prov[i - 1] = false;
    }
    times[i] = [t, round2(Math.min(t + 60, duration()))];
    mark.prov[i] = true;
    mark.idx++;
    commit();
    renderTable();
    renderMark();
  }

  function markOut() {
    if (!mark || mark.idx === 0) return;
    const i = mark.idx - 1;
    if (!mark.prov[i]) return;
    times[i][1] = round2(Math.max(times[i][0] + 0.3, C.time() + 0.2));
    mark.prov[i] = false;
    commit();
    renderTable();
    if (mark.idx >= texts.length) stopMark();
    else renderMark();
  }

  function stopMark() {
    if (!mark) return;
    mark.prov.forEach((p, i) => {
      if (!p) return;
      const nextIn = i + 1 < mark.idx && times[i + 1] ? times[i + 1][0] - 0.05 : times[i][0] + 6;
      times[i][1] = round2(Math.min(nextIn, duration()));
    });
    const marked = mark.idx;
    for (let i = marked; i < texts.length; i++) times[i] = mark.backup[i] || [null, null];
    mark = null;
    commit();
    renderTable();
    renderMark();
    C.pause();
    flash(marked
      ? "Pronto! Aperte ▶ para conferir. Se alguma frase ficar adiantada ou atrasada, ajuste o número na tabela."
      : "Marcação cancelada.");
  }

  /* ---------------- baixar / copiar ---------------- */

  function buildFile() {
    const n = v => (Number.isFinite(v) ? String(round2(v)) : "null");
    const lines = texts.map((t, i) => {
      const [a, b] = times[i] || [null, null];
      return `  { entra: ${n(a)}, sai: ${n(b)}, texto: ${JSON.stringify(t)} },`;
    });
    return [
      "// ==============================================================",
      "//  LETRA QUE APARECE DENTRO DO CORAÇÃO",
      "//  entra = segundo em que a frase aparece | sai = segundo em que some",
      "//  Para editar ouvindo a música: abra o site com ?editar no endereço.",
      "// ==============================================================",
      "",
      "window.LETRA = [",
      ...lines,
      "];",
      ""
    ].join("\n");
  }

  function download() {
    if (!texts.length) { flash("Cole a letra primeiro 🙂"); return; }
    const blob = new Blob([buildFile()], { type: "text/javascript;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "letra.js";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    flash("Baixado! Agora troque o letra.js da pasta do projeto por esse arquivo.");
  }

  async function copy() {
    if (!texts.length) { flash("Cole a letra primeiro 🙂"); return; }
    const code = buildFile();
    try {
      await navigator.clipboard.writeText(code);
    } catch (e) {
      const ta = document.createElement("textarea");
      ta.value = code;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    flash("Código copiado! Cole dentro do arquivo letra.js (apagando o que tinha).");
  }

  /* ---------------- cliques ---------------- */

  panel.addEventListener("click", e => {
    const el = e.target.closest("[data-act]");
    if (!el) return;
    const act = el.dataset.act;
    if (el.tagName === "BUTTON") el.blur();

    switch (act) {
      case "close": setOpen(false); break;
      case "play": C.isPlaying() ? C.pause() : C.play(); break;
      case "mark": startMark(); break;
      case "in": markIn(); break;
      case "out": markOut(); break;
      case "stop": stopMark(); break;
      case "download": download(); break;
      case "copy": copy(); break;
      case "suggest":
        times = SUGERIDOS.map(x => x.slice());
        renderTable();
        commit();
        flash("Tempos sugeridos aplicados.");
        break;
      case "row": {
        const i = Number(el.closest("tr").dataset.i);
        const a = times[i] && times[i][0];
        C.playFrom(Number.isFinite(a) ? Math.max(0, a - 1.5) : 0);
        break;
      }
      case "reload":
        e.preventDefault();
        try { localStorage.removeItem(STORE_KEY); } catch (err) { /* ignora */ }
        fromFile();
        textarea.value = texts.join("\n");
        renderTable();
        commit();
        flash("Recarregado do letra.js.");
        break;
    }
  });

  toggle.addEventListener("click", () => setOpen(true));

  let seeking = false;
  seek.addEventListener("input", () => { seeking = true; C.seek(Number(seek.value)); });
  seek.addEventListener("change", () => { seeking = false; });

  document.addEventListener("keydown", e => {
    const tag = (e.target.tagName || "").toLowerCase();
    if (tag === "textarea" || tag === "input") return;
    if (e.code === "Space") {
      e.preventDefault();
      if (mark) markIn();
      else C.isPlaying() ? C.pause() : C.play();
    } else if ((e.key === "s" || e.key === "S") && mark) {
      markOut();
    } else if (e.key === "Escape" && mark) {
      stopMark();
    }
  });

  // atualiza relógio, barra e destaca a frase que está tocando
  let lastActive = -2;
  setInterval(() => {
    const t = C.time();
    timeLabel.textContent = `${fmt(t)} / ${fmt(duration())}`;
    seek.max = duration().toFixed(1);
    if (!seeking) seek.value = t.toFixed(1);
    playBtn.textContent = C.isPlaying() ? "❚❚" : "▶";

    let active = -1;
    texts.forEach((_, i) => {
      const r = times[i];
      if (r && Number.isFinite(r[0]) && Number.isFinite(r[1]) && t >= r[0] && t <= r[1]) active = i;
    });
    if (active !== lastActive) {
      tbody.querySelectorAll("tr").forEach(tr => tr.classList.toggle("active", Number(tr.dataset.i) === active));
      lastActive = active;
    }

    if (mark) {
      if (t < mark.lastT - 1) stopMark(); // a música recomeçou
      else mark.lastT = t;
    }
  }, 100);

  /* ---------------- início ---------------- */

  if (!loadStored()) fromFile();
  textarea.value = texts.join("\n");
  renderTable();
  renderMark();
  commit();

  if (typeof ResizeObserver !== "undefined") new ResizeObserver(updateReserve).observe(panel);
  window.addEventListener("resize", updateReserve);
  setOpen(true);
})();
