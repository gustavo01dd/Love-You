"use strict";

/* ==============================================================
   CONFIGURAÇÃO
   ============================================================== */
const MUSIC_FILE = "Eternamente_-_Gal_costa.mp3";
const START_LABEL = "▶ Te amo mor ❤️";
const WORDS = ["love you", "Love You", "LOVE YOU"];
const CENTER_TEXT = "Eu te amo";           // aparece no fim, depois da letra
const COLORS = [
  [70, 130, 180],
  [30, 144, 255],
  [0, 191, 255],
  [100, 149, 237],
  [65, 105, 225]
];
const LYRIC_FONT = '"Playfair Display", Georgia, "Times New Roman", serif';

// Linha do tempo da formação do coração (segundos da música)
const OUTLINE_TIME = 6.5;    // o contorno se desenha de 0 s até aqui
const FILL_START = 6.0;      // o miolo começa a acender
const FILL_TIME = 5.5;       // ...e leva esse tempo para completar
const FADE_TIME = 0.3;       // cada palavrinha leva isso para acender
const CENTER_TEXT_AT = 12;   // sem letra: quando o "Love You" central aparece

const EDIT_MODE = /editar/i.test(location.search + location.hash);

/* ==============================================================
   GEOMETRIA DO CORAÇÃO (em "unidades" da fórmula do coração)
   ============================================================== */
const HEART_TOP = -11.95;               // topo das curvas
const HEART_BOTTOM = 17;                // ponta de baixo
const HEART_MID = (HEART_TOP + HEART_BOTTOM) / 2;
const FIT_W = 32 + 7;                   // largura + sobra das palavras do contorno
const FIT_H = (HEART_BOTTOM - HEART_TOP) + 1.6;
const TEXT_Y = 0.4;                     // centro vertical da letra
const TEXT_MAX_W = 17.5;                // largura máxima da letra

/* ============================================================== */

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const button = document.getElementById("musicButton");

let W = 0, H = 0, dpr = 1;
let scale = 10, cx = 0, cy = 0;
let reserve = { right: 0, bottom: 0 };  // espaço ocupado pelo editor
const sprites = new Map();
const layoutCache = new Map();

function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function randInt(n) { return Math.floor(Math.random() * n); }
function rgba(c, a) { return `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${a})`; }

function heartXY(t) {
  const x = 16 * Math.pow(Math.sin(t), 3);
  const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
  return [x, -y];
}

/* ---------------- partículas (criadas uma vez, em unidades) ---------------- */

function makeParticle(ux, uy, kind, appear) {
  const word = randInt(WORDS.length);
  const color = randInt(COLORS.length);
  // quanto a partícula fica "apagadinha" quando tem letra na frente
  const dx = ux / 12.5, dy = (uy - TEXT_Y) / 5.8;
  const zone = kind === "fill" ? clamp(1.3 - (dx * dx + dy * dy), 0, 1) : 0;
  return {
    ux, uy, kind, appear, zone,
    key: `${kind}|${word}|${color}`,
    phase: Math.random() * Math.PI * 2,
    size: 0.85 + Math.random() * 0.30
  };
}

function buildParticles() {
  const result = [];

  // contorno
  const N = 160, gapO = 1.67, placedO = [];
  for (let i = 0; i < N; i++) {
    const [x, y] = heartXY((i / N) * Math.PI * 2);
    if (placedO.some(p => Math.hypot(p[0] - x, p[1] - y) < gapO)) continue;
    placedO.push([x, y]);
    result.push(makeParticle(x, y, "outline", (i / N) * OUTLINE_TIME));
  }

  // miolo
  const M = 130, gapF = 2.55, placedF = [];
  let attempts = 0;
  while (placedF.length < M && attempts < M * 80) {
    attempts++;
    const t = Math.random() * Math.PI * 2;
    const r = Math.random() * 0.86;
    const [bx, by] = heartXY(t);
    const x = bx * r, y = by * r;
    if (placedF.some(p => Math.hypot(p[0] - x, p[1] - y) < gapF)) continue;
    placedF.push([x, y]);
    result.push(makeParticle(x, y, "fill", FILL_START + Math.random() * FILL_TIME));
  }
  return result;
}

const particles = buildParticles();

/* ---------------- sprites: cada palavra com brilho, desenhada 1 vez ---------------- */

function makeSprite(word, color, kind) {
  const outline = kind === "outline";
  const fontPx = Math.max(outline ? 10.5 : 9, scale * (outline ? 1.11 : 0.94));
  const blur = scale * (outline ? 1.0 : 0.78);
  const font = `700 ${fontPx}px Arial, Helvetica, sans-serif`;

  const c = document.createElement("canvas");
  const g = c.getContext("2d");
  g.font = font;
  const tw = g.measureText(word).width;
  const pad = Math.ceil(blur * 1.6);
  const w = tw + pad * 2;
  const h = fontPx * 1.3 + pad * 2;
  c.width = Math.ceil(w * dpr);
  c.height = Math.ceil(h * dpr);

  g.scale(dpr, dpr);
  g.font = font;
  g.textAlign = "center";
  g.textBaseline = "middle";
  const col = rgba(color, 1);
  g.fillStyle = col;
  g.shadowColor = col;

  g.shadowBlur = blur * dpr;       // brilho largo
  g.globalAlpha = 0.28;
  g.fillText(word, w / 2, h / 2);

  g.shadowBlur = blur * 0.5 * dpr; // brilho curto
  g.globalAlpha = 0.5;
  g.fillText(word, w / 2, h / 2);

  g.shadowBlur = 0;                // letra nítida
  g.globalAlpha = 1;
  g.fillText(word, w / 2, h / 2);

  return { canvas: c, w, h };
}

function buildSprites() {
  sprites.clear();
  for (const kind of ["outline", "fill"]) {
    WORDS.forEach((word, wi) => {
      COLORS.forEach((color, ci) => {
        sprites.set(`${kind}|${wi}|${ci}`, makeSprite(word, color, kind));
      });
    });
  }
}

/* ---------------- tamanho da tela ---------------- */

function layout() {
  W = window.innerWidth;
  H = window.innerHeight;
  dpr = Math.min(window.devicePixelRatio || 1, 2);

  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  canvas.style.width = W + "px";
  canvas.style.height = H + "px";

  const vw = Math.max(160, W - reserve.right);
  const vh = Math.max(160, H - reserve.bottom);

  // O coração se ajusta ao lado menor da tela (celular em pé ou deitado, PC...)
  scale = Math.min((vw * 0.94) / FIT_W, (vh * 0.66) / FIT_H);
  cx = vw / 2;
  cy = vh * 0.48 - HEART_MID * scale;

  buildSprites();
  layoutCache.clear();
}

let resizeTimer = null;
function scheduleLayout() {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(layout, 80);
}
window.addEventListener("resize", scheduleLayout);
window.addEventListener("orientationchange", scheduleLayout);

/* ---------------- letra ---------------- */

function normalizeLyrics(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map(l => ({
      texto: String((l && l.texto) || "").trim(),
      entra: Number(l && l.entra),
      sai: Number(l && l.sai)
    }))
    .filter(l => l.texto && Number.isFinite(l.entra) && Number.isFinite(l.sai) && l.sai > l.entra)
    .sort((a, b) => a.entra - b.entra);
}

let lyrics = [];
let lyricsEnd = 0;
function setLyrics(list) {
  lyrics = normalizeLyrics(list);
  lyricsEnd = lyrics.reduce((m, l) => Math.max(m, l.sai), 0);
  layoutCache.clear();
}
setLyrics(window.LETRA);

function wrapWords(widths, spaceW, maxW) {
  const lines = [];
  let cur = [], curW = 0;
  widths.forEach((w, i) => {
    const add = cur.length ? spaceW + w : w;
    if (cur.length && curW + add > maxW) {
      lines.push({ idx: cur, w: curW });
      cur = [i];
      curW = w;
    } else {
      cur.push(i);
      curW += add;
    }
  });
  if (cur.length) lines.push({ idx: cur, w: curW });
  return lines;
}

// Quebra a frase em até 3 linhas equilibradas que cabem dentro do coração.
function layoutLyric(text) {
  const key = text + "|" + scale.toFixed(3);
  const cached = layoutCache.get(key);
  if (cached) return cached;

  const words = text.split(/\s+/).filter(Boolean);
  const maxW = scale * TEXT_MAX_W;
  let fontPx = clamp(scale * 1.75, 15, 46);
  let font, widths, spaceW, lines;

  for (let k = 0; k < 10; k++) {
    font = `italic 600 ${fontPx}px ${LYRIC_FONT}`;
    ctx.font = font;
    widths = words.map(w => ctx.measureText(w).width);
    spaceW = ctx.measureText(" ").width;
    lines = wrapWords(widths, spaceW, maxW);
    if (lines.length <= 3 && lines.every(l => l.w <= maxW)) break;
    fontPx *= 0.9;
  }

  if (lines.length > 1) {
    const total = widths.reduce((a, b) => a + b, 0) + spaceW * (words.length - 1);
    let target = total / lines.length;
    for (let i = 0; i < 30; i++) {
      const cand = wrapWords(widths, spaceW, Math.min(maxW, target));
      if (cand.length <= lines.length) { lines = cand; break; }
      target *= 1.04;
    }
  }

  const lh = fontPx * 1.3;
  const top = -((lines.length - 1) * lh) / 2;
  const items = [];
  lines.forEach((ln, li) => {
    let x = -ln.w / 2;
    ln.idx.forEach(i => {
      items.push({ text: words[i], x, y: top + li * lh, order: i });
      x += widths[i] + spaceW;
    });
  });

  const blockW = Math.max(...lines.map(l => l.w));
  const blockH = lines.length * lh;
  const result = { font, fontPx, items, blockW, blockH };
  layoutCache.set(key, result);
  return result;
}

function lyricVisibility(l, t) {
  return clamp((t - l.entra) / 0.4, 0, 1) * clamp((l.sai - t) / 0.45, 0, 1);
}

// Sombra escura e suave atrás da frase, para ela se destacar do coração
function drawLyricHalo(l, t) {
  const vis = lyricVisibility(l, t);
  if (vis <= 0) return;
  const L = layoutLyric(l.texto);
  ctx.save();
  ctx.translate(cx, cy + TEXT_Y * scale);
  ctx.scale(L.blockW / 2 + L.fontPx * 1.4, L.blockH / 2 + L.fontPx * 1.1);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  g.addColorStop(0, `rgba(0, 0, 0, ${0.7 * vis})`);
  g.addColorStop(0.6, `rgba(0, 0, 0, ${0.45 * vis})`);
  g.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawLyric(l, t) {
  const L = layoutLyric(l.texto);
  const fadeOut = clamp((l.sai - t) / 0.45, 0, 1);
  const x0 = cx, y0 = cy + TEXT_Y * scale;

  ctx.save();
  ctx.font = L.font;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgb(255, 250, 245)";

  for (const it of L.items) {
    // cada palavra acende um pouquinho depois da anterior
    const p = clamp((t - l.entra - it.order * 0.09) / 0.5, 0, 1);
    const e = 1 - Math.pow(1 - p, 3);
    const a = e * fadeOut;
    if (a <= 0.003) continue;

    const x = x0 + it.x;
    const y = y0 + it.y + (1 - e) * L.fontPx * 0.35;

    ctx.shadowColor = `rgba(90, 160, 255, ${0.95 * a})`;
    ctx.shadowBlur = L.fontPx * 0.8 * dpr;
    ctx.globalAlpha = a * 0.6;
    ctx.fillText(it.text, x, y);

    ctx.shadowBlur = 0;
    ctx.globalAlpha = a;
    ctx.fillText(it.text, x, y);
  }
  ctx.restore();
}

/* ---------------- "Love You" central ---------------- */

function centerAlpha(t) {
  const start = lyrics.length ? lyricsEnd + 0.4 : CENTER_TEXT_AT;
  if (t <= start) return 0;
  const p = Math.min(1, (t - start) / 1.0);
  return 1 - Math.exp(-p * 8);
}

function drawCenter(a, wall) {
  if (a <= 0) return;
  const pulse = 1 + 0.025 * Math.sin(wall * 3);
  const fs = clamp(scale * 2.5, 22, 60);

  ctx.save();
  ctx.translate(cx, cy + TEXT_Y * scale);
  ctx.scale(pulse, pulse);
  ctx.font = `700 ${fs}px Georgia, "Times New Roman", serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgb(255, 250, 245)";

  ctx.shadowColor = `rgba(255, 250, 245, ${a})`;
  ctx.shadowBlur = fs * 0.4 * dpr;
  ctx.globalAlpha = a * 0.2;
  ctx.fillText(CENTER_TEXT, 0, 0);

  ctx.shadowBlur = fs * 0.15 * dpr;
  ctx.globalAlpha = a;
  ctx.fillText(CENTER_TEXT, 0, 0);
  ctx.restore();
}

/* ---------------- música e relógio ---------------- */

const music = new Audio(MUSIC_FILE);
music.loop = true;
music.preload = "auto";
music.volume = 0.8;

let started = false;
const clock = { base: 0, perf: 0 };

function resyncClock() {
  clock.base = music.currentTime;
  clock.perf = performance.now() / 1000;
}

// Tempo atual da música, suave (sem "pulos" entre um quadro e outro)
function songTime() {
  if (music.paused) return music.currentTime;
  const now = performance.now() / 1000;
  const est = clock.base + (now - clock.perf);
  const ct = music.currentTime;
  if (Math.abs(ct - est) > 0.25) {   // recomeçou, pulou ou travou: sincroniza
    resyncClock();
    return ct;
  }
  return est;
}

music.addEventListener("playing", resyncClock);
music.addEventListener("seeked", resyncClock);

const ICON_PLAY = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>';
const ICON_PAUSE = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>';

function updateButton() {
  if (!started) {
    button.className = "start";
    button.textContent = START_LABEL;
    button.setAttribute("aria-label", "Tocar música");
  } else {
    button.className = "mini";
    button.innerHTML = music.paused ? ICON_PLAY : ICON_PAUSE;
    button.setAttribute("aria-label", music.paused ? "Tocar" : "Pausar");
  }
}

async function play(fromStart) {
  if (fromStart) {
    try { music.currentTime = 0; } catch (e) { /* ainda carregando */ }
  }
  try {
    await music.play();
    started = true;
    resyncClock();
  } catch (err) {
    console.warn("Não deu para tocar a música:", err);
  }
  updateButton();
}

function pause() {
  music.pause();
  updateButton();
}

music.addEventListener("play", updateButton);
music.addEventListener("pause", updateButton);
music.addEventListener("error", () => {
  button.className = "start";
  button.textContent = "Não achei a música 😢";
  console.error(`Não encontrei o arquivo "${MUSIC_FILE}". Ele precisa estar na mesma pasta do index.html.`);
});

button.addEventListener("click", e => {
  e.stopPropagation();
  if (!started) play(true);
  else if (music.paused) play(false);
  else pause();
});

canvas.addEventListener("click", () => {
  if (!started) play(true);
});

/* ---------------- animação ---------------- */

function drawParticles(t, wall, focus) {
  for (const p of particles) {
    let a = (t - p.appear) / FADE_TIME;
    if (a <= 0) continue;
    a = Math.min(a, 1);

    // brilho piscando depois de aceso
    const flick = 0.75 + 0.25 * Math.sin(wall * 2.4 + p.phase);
    a *= 1 + (flick - 1) * a;

    // apaga um pouco o miolo atrás da letra para ela ficar legível
    if (focus > 0 && p.zone > 0) a *= 1 - focus * p.zone * 0.85;
    if (a <= 0.01) continue;

    const sp = sprites.get(p.key);
    const w = sp.w * p.size, h = sp.h * p.size;
    ctx.globalAlpha = a;
    ctx.drawImage(sp.canvas, cx + p.ux * scale - w / 2, cy + p.uy * scale - h / 2, w, h);
  }
  ctx.globalAlpha = 1;
}

function frame(now) {
  const wall = now / 1000;
  const t = started ? songTime() : 0;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);

  let focus = 0;
  const active = [];
  for (const l of lyrics) {
    if (t >= l.entra && t <= l.sai) {
      active.push(l);
      focus = Math.max(focus, lyricVisibility(l, t));
    }
  }
  const ca = started ? centerAlpha(t) : 0;
  focus = Math.max(focus, ca);

  if (started) drawParticles(t, wall, focus);
  for (const l of active) drawLyricHalo(l, t);
  for (const l of active) drawLyric(l, t);
  drawCenter(ca, wall);

  requestAnimationFrame(frame);
}

layout();
updateButton();
requestAnimationFrame(frame);

// Quando a fonte bonita da letra terminar de carregar, recalcula as quebras de linha
if (document.fonts && document.fonts.load) {
  document.fonts.load(`italic 600 20px "Playfair Display"`).then(() => layoutCache.clear()).catch(() => {});
}

/* ---------------- acesso para o editor (editor.js) ---------------- */

window.Coracao = {
  EDIT_MODE,
  music,
  time: () => (started ? songTime() : music.currentTime),
  isPlaying: () => !music.paused,
  play: () => play(false),
  pause,
  seek(t) {
    try { music.currentTime = Math.max(0, t); } catch (e) { /* ignora */ }
    resyncClock();
  },
  playFrom(t) {
    this.seek(t);
    return play(false);
  },
  setLyrics,
  setReserve(r) {
    const next = { right: r.right || 0, bottom: r.bottom || 0 };
    if (next.right === reserve.right && next.bottom === reserve.bottom) return;
    reserve = next;
    scheduleLayout();
  }
};
