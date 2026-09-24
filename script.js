const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const WORDS = ["love you", "Love You", "LOVE YOU"];
const CENTER_TEXT = " Love You ";
const COLORS = [
  [70, 130, 180],
  [30, 144, 255],
  [0, 191, 255],
  [100, 149, 237],
  [65, 105, 225]
];

let W = 0;
let H = 0;
let scale = 20;
let particles = [];
let frame = 0;
let fillStartFrame = 0;

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth;
  H = window.innerHeight;

  canvas.width = Math.floor(W * dpr);
  canvas.height = Math.floor(H * dpr);
  canvas.style.width = W + "px";
  canvas.style.height = H + "px";

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // Mantém aproximadamente a mesma proporção visual do Pygame 2000x1200.
  scale = Math.min(W / 100, H / 60);

  createParticles();
}

function heartXY(t) {
  const x = 16 * Math.pow(Math.sin(t), 3);
  const y =
    13 * Math.cos(t) -
    5 * Math.cos(2 * t) -
    2 * Math.cos(3 * t) -
    Math.cos(4 * t);

  return [x, -y];
}

function toScreen(x, y) {
  return [
    x * scale + W / 2,
    y * scale + H / 2
  ];
}

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function distance(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

function createParticle(x, y, order, kind) {
  return {
    x,
    y,
    order,
    kind,
    word: randomChoice(WORDS),
    color: randomChoice(COLORS),
    alpha: 0,
    flicker: Math.random() * Math.PI * 2,
    delay: 0,
    sizeMult: 0.85 + Math.random() * 0.30
  };
}

function buildOutlineParticles(nOutline, minGap = 30) {
  const result = [];
  const placed = [];

  for (let i = 0; i < nOutline; i++) {
    const t = (i / nOutline) * Math.PI * 2;
    const [bx, by] = heartXY(t);
    const [sx, sy] = toScreen(bx, by);

    if (placed.some(p => distance([sx, sy], p) < minGap)) continue;

    placed.push([sx, sy]);
    result.push(createParticle(sx, sy, i, "outline"));
  }

  return result;
}

function buildFillParticles(nFill, minGap = 46) {
  const result = [];
  const placed = [];
  let attempts = 0;
  const maxAttempts = nFill * 80;

  while (result.length < nFill && attempts < maxAttempts) {
    attempts++;

    const t = Math.random() * Math.PI * 2;
    const r = Math.random() * 0.86;
    const [bx, by] = heartXY(t);
    const [sx, sy] = toScreen(bx * r, by * r);

    if (placed.some(p => distance([sx, sy], p) < minGap)) continue;

    placed.push([sx, sy]);
    result.push(createParticle(
      sx,
      sy,
      Math.floor(Math.random() * 321),
      "fill"
    ));
  }

  return result;
}

function createParticles() {
  const outline = buildOutlineParticles(160);
  const fill = buildFillParticles(130);

  const outlineSpan = outline.length
    ? Math.max(...outline.map(p => p.order))
    : 0;

  const framesPerStep = 2.8;
  fillStartFrame = 600;

  outline.forEach(p => {
    p.delay = Math.floor(p.order * framesPerStep);
  });

  fill.forEach(p => {
    p.delay = fillStartFrame + p.order;
  });

  particles = [...outline, ...fill];
  frame = 0;
}

function rgba(color, alpha) {
  return `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`;
}

function drawGlowText(p, alpha) {
  const fontSize = (p.kind === "outline" ? 20 : 17) * p.sizeMult;
  const weight = "700";
  const font = `${weight} ${fontSize}px Arial`;

  ctx.save();
  ctx.font = font;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const color = rgba(p.color, alpha / 255);

  // Glow semelhante ao smoothscale usado no Pygame.
  if (alpha > 10) {
    ctx.shadowColor = color;
    ctx.shadowBlur = p.kind === "outline" ? 18 : 14;

    ctx.globalAlpha = (alpha / 255) * 0.28;
    ctx.fillStyle = color;
    ctx.fillText(p.word, p.x, p.y);

    ctx.shadowBlur = p.kind === "outline" ? 9 : 7;
    ctx.globalAlpha = (alpha / 255) * 0.50;
    ctx.fillText(p.word, p.x, p.y);
  }

  ctx.shadowBlur = 0;
  ctx.globalAlpha = alpha / 255;
  ctx.fillStyle = color;
  ctx.fillText(p.word, p.x, p.y);

  ctx.restore();
}

function drawCenter(frame) {
  const centerStart = fillStartFrame + 200;
  if (frame <= centerStart) return;

  const progress = Math.min(1, (frame - centerStart) / 60);
  const centerAlpha = Math.floor(
    255 * (1 - Math.exp(-progress * 8))
  );

  const pulse = 1 + 0.025 * Math.sin(frame * 0.05);

  const fontSize = Math.max(28, Math.min(54, W / 28));
  const font = `700 ${fontSize}px Georgia`;

  ctx.save();
  ctx.font = font;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const x = W / 2;
  const y = H / 2;

  ctx.translate(x, y);
  ctx.scale(pulse, pulse);

  ctx.shadowColor = `rgba(255, 250, 245, ${centerAlpha / 255})`;
  ctx.shadowBlur = 22;
  ctx.globalAlpha = (centerAlpha / 255) * 0.20;
  ctx.fillStyle = "rgb(255, 250, 245)";
  ctx.fillText(CENTER_TEXT, 0, 0);

  ctx.shadowBlur = 8;
  ctx.globalAlpha = centerAlpha / 255;
  ctx.fillText(CENTER_TEXT, 0, 0);

  ctx.restore();
}

function animate() {
  frame++;

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);

  for (const p of particles) {
    if (frame > p.delay && p.alpha < 255) {
      p.alpha = Math.min(
        255,
        p.alpha + 14 + Math.floor(Math.random() * 5)
      );
    }

    let flick = 1;

    if (p.alpha >= 255) {
      flick =
        0.75 +
        0.25 * Math.sin(frame * 0.04 + p.flicker);
    }

    const alpha = Math.floor(p.alpha * flick);

    if (alpha > 0) {
      drawGlowText(p, alpha);
    }
  }

  drawCenter(frame);

  requestAnimationFrame(animate);
}

window.addEventListener("resize", resize);

resize();
animate();


// Música sincroniza o início da formação do coração.
// A animação começa quando a música começa e percorre a formação
// principal durante os primeiros 18 segundos.
const music = new Audio("love_you.mp3");
music.loop = true;
music.volume = 0.7;

const musicButton = document.getElementById("musicButton");
const MUSIC_DURATION = 18.0;

function resetAnimation() {
  frame = 0;
  for (const p of particles) {
    p.alpha = 0;
  }
}

async function startMusic() {
  try {
    resetAnimation();
    await music.play();
    musicButton.textContent = "🔊 Música";
  } catch (err) {
    musicButton.textContent = "▶ Te amo mor ❤️";
  }
}

music.addEventListener("play", () => {
  resetAnimation();
});

music.addEventListener("timeupdate", () => {
  // Mantém a animação acompanhando a posição real do áudio.
  if (!music.paused) {
    const t = Math.min(music.currentTime, MUSIC_DURATION);
    frame = Math.floor(t * 60);
  }
});

music.addEventListener("ended", () => {
  // loop já cuida da música; ao reiniciar, recomeça a animação.
  resetAnimation();
});

musicButton.addEventListener("click", startMusic);

window.addEventListener("pointerdown", () => {
  if (music.paused) startMusic();
}, { once: true });
