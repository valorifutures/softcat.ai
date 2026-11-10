import { h } from 'preact';
import { useEffect, useRef, useState, useCallback } from 'preact/hooks';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

type Phase = 'boot' | 'ready' | 'playing' | 'paused' | 'gameover';

interface Obstacle {
  x: number;
  y: number;
  w: number;
  h: number;
  type: 'rate-limit' | 'hallucination' | 'overfit' | 'guardrail';
}

interface Token {
  x: number;
  y: number;
  alive: boolean;
}

interface PowerupItem {
  x: number;
  y: number;
  type: 'context-window' | 'fine-tune' | 'overclock';
  alive: boolean;
}

interface ActivePowerup {
  type: string;
  timer: number;
}

interface GameState {
  catY: number;
  catVY: number;
  grounded: boolean;
  sliding: boolean;
  legFrame: number;
  legTimer: number;
  obstacles: Obstacle[];
  tokens: Token[];
  powerups: PowerupItem[];
  activePowerup: ActivePowerup | null;
  score: number;
  streak: number;
  maxStreak: number;
  speed: number;
  distance: number;
  groundOffset: number;
  obstacleTimer: number;
  tokenTimer: number;
  powerupTimer: number;
  meowBuffer: string;
  rainbowTimer: number;
  particles: Particle[];
  scenery: SceneryItem[];
  sceneryOffset: number;
}

interface SceneryItem {
  x: number;
  type: 'building' | 'tree' | 'antenna' | 'house';
  w: number;
  h: number;
  color: string;
  details: number; // seed for variation
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface InputState {
  jumpPressed: boolean;
  slideHeld: boolean;
}

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const GAME_W = 800;
const GAME_H = 400;
const GROUND_Y = 320;
const CAT_X = 100;
const CAT_W = 32;
const CAT_H = 36;
const CAT_SLIDE_H = 16;
const GRAVITY = 1400;
const JUMP_VEL = -560;
const INITIAL_SPEED = 220;
const MAX_SPEED = 520;
const SPEED_INCREASE = 6;
const TOKEN_SIZE = 12;
const POWERUP_SIZE = 18;

const C = {
  void: '#0c0c14',
  surface: '#14141e',
  surfaceLight: '#1e1e30',
  green: '#4ecb8f',
  cyan: '#5ab8d4',
  purple: '#9b7acc',
  amber: '#d4a54a',
  red: '#da5e74',
  textPrimary: '#ededf2',
  textMuted: '#adadc4',
  textBright: '#ffffff',
};

// ═══════════════════════════════════════════════════════════════
// SOUND ENGINE (Web Audio API — procedural 8-bit bleeps)
// ═══════════════════════════════════════════════════════════════

function createSoundEngine() {
  let ctx: AudioContext | null = null;
  let muted = false;

  function ensureCtx() {
    if (!ctx) {
      try { ctx = new AudioContext(); } catch { /* no audio support */ }
    }
    if (ctx?.state === 'suspended') ctx.resume();
    return ctx;
  }

  function beep(freq: number, dur: number, type: OscillatorType = 'square', vol = 0.08) {
    if (muted) return;
    const c = ensureCtx();
    if (!c) return;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = vol;
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start();
    osc.stop(c.currentTime + dur);
  }

  return {
    jump() { beep(440, 0.08); setTimeout(() => beep(660, 0.08), 40); },
    collect() { beep(880, 0.06); setTimeout(() => beep(1320, 0.06), 30); },
    powerup() { beep(440, 0.08); setTimeout(() => beep(660, 0.08), 60); setTimeout(() => beep(880, 0.12), 120); },
    crash() { beep(180, 0.25, 'sawtooth', 0.12); beep(120, 0.35, 'sawtooth', 0.06); },
    meow() { beep(600, 0.15, 'sine', 0.1); setTimeout(() => beep(900, 0.2, 'sine', 0.08), 100); setTimeout(() => beep(700, 0.25, 'sine', 0.06), 250); },
    setMuted(m: boolean) { muted = m; },
    isMuted() { return muted; },
  };
}

// ═══════════════════════════════════════════════════════════════
// SCORE COMMENTARY
// ═══════════════════════════════════════════════════════════════

const COMMENTARY: Array<{ min: number; max: number; lines: string[] }> = [
  { min: 0, max: 5, lines: [
    'Training diverged immediately. Consider a different architecture.',
    'Loss: NaN. Your model needs more data.',
    'Epoch 1 failure. The weights were not in your favor.',
    'Segfault in the reward function. Classic.',
  ]},
  { min: 6, max: 20, lines: [
    'Early stopping triggered. But there\'s potential here.',
    'Gradient descent: more descent than gradient.',
    'Your tokenizer is warming up. Keep training.',
    'Underfitting detected. More parameters needed.',
  ]},
  { min: 21, max: 50, lines: [
    'Your model converged at epoch {s}. Promising.',
    'Not bad for a small parameter cat.',
    'The loss function approves. Cautiously.',
    'Your neural pathways are warming up nicely.',
  ]},
  { min: 51, max: 100, lines: [
    'Impressive token throughput. Attention heads aligned.',
    'Your context window held steady. Fine-tuning pays off.',
    'The transformer architecture would be proud.',
    'Solid inference run. The benchmarks don\'t lie.',
  ]},
  { min: 101, max: Infinity, lines: [
    'GPT-who? Your neural pathways are fully optimized.',
    'You\'ve achieved artificial general agility.',
    'RLHF couldn\'t have trained a better run.',
    'Peak inference speed. You ARE the foundation model.',
    'Scaling laws confirmed: more tokens, better cat.',
  ]},
];

function getCommentary(score: number): string {
  const bracket = COMMENTARY.find(c => score >= c.min && score <= c.max) || COMMENTARY[0];
  const line = bracket.lines[Math.floor(Math.random() * bracket.lines.length)];
  return line.replace('{s}', String(score));
}

// ═══════════════════════════════════════════════════════════════
// BOOT SEQUENCE LINES
// ═══════════════════════════════════════════════════════════════

const BOOT_LINES = [
  { text: 'softcat.ai:~ $ ./play', delay: 0, typing: true },
  { text: '[loading model weights...] done', delay: 600, typing: false },
  { text: '[initializing neural pathways...] done', delay: 400, typing: false },
  { text: '[calibrating loss function...] done', delay: 400, typing: false },
  { text: '[deploying cat...] done', delay: 400, typing: false },
  { text: '', delay: 200, typing: false },
  { text: '> NEON CAT RUNNER v1.0', delay: 100, typing: false },
  { text: '> Collect tokens. Dodge obstacles. Don\'t hallucinate.', delay: 100, typing: false },
];

// ═══════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function rand(min: number, max: number) { return min + Math.random() * (max - min); }
function randInt(min: number, max: number) { return Math.floor(rand(min, max + 1)); }

function aabb(ax: number, ay: number, aw: number, ah: number, bx: number, by: number, bw: number, bh: number) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function loadHighScore(): number {
  try { return parseInt(localStorage.getItem('softcat-runner-hs') || '0', 10) || 0; } catch { return 0; }
}
function saveHighScore(s: number) {
  try { localStorage.setItem('softcat-runner-hs', String(s)); } catch { /* storage blocked */ }
}

// ═══════════════════════════════════════════════════════════════
// DRAWING FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function drawBackground(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = C.void;
  ctx.fillRect(0, 0, GAME_W, GAME_H);

  // Subtle grid (matches site background)
  ctx.strokeStyle = 'rgba(78, 203, 143, 0.03)';
  ctx.lineWidth = 1;
  for (let x = 0; x < GAME_W; x += 50) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, GAME_H); ctx.stroke();
  }
  for (let y = 0; y < GAME_H; y += 50) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(GAME_W, y); ctx.stroke();
  }
}

function generateScenery(): SceneryItem[] {
  const items: SceneryItem[] = [];
  const colors = [C.surfaceLight, 'rgba(78, 203, 143, 0.12)', 'rgba(90, 184, 212, 0.10)', 'rgba(155, 122, 204, 0.10)'];
  let x = 0;
  // Generate enough scenery to tile across ~3x the screen width
  while (x < GAME_W * 3) {
    const typeRoll = Math.random();
    let item: SceneryItem;
    if (typeRoll < 0.35) {
      // Building
      const w = rand(40, 70);
      const h = rand(60, 150);
      item = { x, type: 'building', w, h, color: colors[randInt(0, 3)], details: Math.random() };
    } else if (typeRoll < 0.55) {
      // House
      const w = rand(35, 55);
      const h = rand(30, 50);
      item = { x, type: 'house', w, h, color: colors[randInt(0, 3)], details: Math.random() };
    } else if (typeRoll < 0.8) {
      // Tree
      const w = rand(16, 28);
      const h = rand(40, 80);
      item = { x, type: 'tree', w, h, color: 'rgba(78, 203, 143, 0.15)', details: Math.random() };
    } else {
      // Antenna tower
      const w = rand(8, 14);
      const h = rand(80, 140);
      item = { x, type: 'antenna', w, h, color: 'rgba(90, 184, 212, 0.12)', details: Math.random() };
    }
    items.push(item);
    x += item.w + rand(30, 90);
  }
  return items;
}

function drawScenery(ctx: CanvasRenderingContext2D, scenery: SceneryItem[], offset: number) {
  const parallaxOffset = offset * 0.3; // Slower than foreground for depth
  const totalW = scenery.length > 0 ? scenery[scenery.length - 1].x + 120 : GAME_W * 3;

  ctx.save();

  for (const item of scenery) {
    // Wrap x position for infinite scrolling
    let drawX = ((item.x - parallaxOffset) % totalW + totalW) % totalW - 80;
    if (drawX > GAME_W + 80) continue;

    const baseY = GROUND_Y;

    if (item.type === 'building') {
      // Building silhouette
      ctx.fillStyle = item.color;
      ctx.fillRect(drawX, baseY - item.h, item.w, item.h);

      // Window grid
      ctx.fillStyle = 'rgba(78, 203, 143, 0.06)';
      const windowW = 5;
      const windowH = 6;
      const cols = Math.floor((item.w - 8) / 10);
      const rows = Math.floor((item.h - 12) / 14);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          // Some windows "lit" based on details seed
          if (Math.sin(item.details * 100 + r * 7 + c * 13) > 0.2) {
            ctx.fillStyle = 'rgba(78, 203, 143, 0.08)';
          } else {
            ctx.fillStyle = 'rgba(155, 122, 204, 0.06)';
          }
          ctx.fillRect(drawX + 6 + c * 10, baseY - item.h + 8 + r * 14, windowW, windowH);
        }
      }

      // Roofline accent
      ctx.strokeStyle = 'rgba(78, 203, 143, 0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(drawX, baseY - item.h);
      ctx.lineTo(drawX + item.w, baseY - item.h);
      ctx.stroke();

    } else if (item.type === 'house') {
      // House body
      ctx.fillStyle = item.color;
      ctx.fillRect(drawX, baseY - item.h, item.w, item.h);

      // Pitched roof (triangle)
      ctx.fillStyle = 'rgba(155, 122, 204, 0.08)';
      ctx.beginPath();
      ctx.moveTo(drawX - 4, baseY - item.h);
      ctx.lineTo(drawX + item.w / 2, baseY - item.h - 18);
      ctx.lineTo(drawX + item.w + 4, baseY - item.h);
      ctx.closePath();
      ctx.fill();

      // Door
      ctx.fillStyle = 'rgba(90, 184, 212, 0.08)';
      ctx.fillRect(drawX + item.w / 2 - 4, baseY - 16, 8, 16);

      // Window
      ctx.fillStyle = 'rgba(212, 165, 74, 0.07)';
      ctx.fillRect(drawX + 6, baseY - item.h + 10, 7, 7);
      if (item.w > 40) {
        ctx.fillRect(drawX + item.w - 13, baseY - item.h + 10, 7, 7);
      }

    } else if (item.type === 'tree') {
      // Trunk
      ctx.fillStyle = 'rgba(78, 203, 143, 0.08)';
      const trunkW = item.w * 0.25;
      ctx.fillRect(drawX + item.w / 2 - trunkW / 2, baseY - item.h * 0.4, trunkW, item.h * 0.4);

      // Canopy (layered triangles)
      ctx.fillStyle = item.color;
      const layers = item.details > 0.5 ? 3 : 2;
      for (let i = 0; i < layers; i++) {
        const layerW = item.w * (1 - i * 0.15);
        const layerH = item.h * 0.35;
        const layerY = baseY - item.h * 0.4 - i * layerH * 0.55;
        ctx.beginPath();
        ctx.moveTo(drawX + item.w / 2 - layerW / 2, layerY);
        ctx.lineTo(drawX + item.w / 2, layerY - layerH);
        ctx.lineTo(drawX + item.w / 2 + layerW / 2, layerY);
        ctx.closePath();
        ctx.fill();
      }

    } else if (item.type === 'antenna') {
      // Tower pole
      ctx.strokeStyle = item.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(drawX + item.w / 2, baseY);
      ctx.lineTo(drawX + item.w / 2, baseY - item.h);
      ctx.stroke();

      // Cross beams
      ctx.lineWidth = 1;
      const beams = Math.floor(item.h / 30);
      for (let i = 1; i <= beams; i++) {
        const by = baseY - (item.h * i / (beams + 1));
        const bw = item.w * (1 - i / (beams + 2));
        ctx.beginPath();
        ctx.moveTo(drawX + item.w / 2 - bw, by);
        ctx.lineTo(drawX + item.w / 2 + bw, by);
        ctx.stroke();
      }

      // Blinking light at top
      if (Math.sin(Date.now() * 0.003 + item.details * 10) > 0.3) {
        ctx.fillStyle = 'rgba(218, 94, 116, 0.3)';
        ctx.beginPath();
        ctx.arc(drawX + item.w / 2, baseY - item.h, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  ctx.restore();
}

function drawGround(ctx: CanvasRenderingContext2D, offset: number) {
  // Ground line
  ctx.strokeStyle = C.surfaceLight;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y);
  ctx.lineTo(GAME_W, GROUND_Y);
  ctx.stroke();

  // Neural network nodes and connections below ground
  const nodeSpacing = 80;
  const rows = 3;
  const startX = -(offset % nodeSpacing);

  ctx.strokeStyle = 'rgba(30, 30, 48, 0.8)';
  ctx.lineWidth = 1;

  for (let row = 0; row < rows; row++) {
    const y = GROUND_Y + 20 + row * 25;
    for (let x = startX; x < GAME_W + nodeSpacing; x += nodeSpacing) {
      // Horizontal connection
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + nodeSpacing, y);
      ctx.stroke();

      // Diagonal connections to next row
      if (row < rows - 1) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + nodeSpacing / 2, y + 25);
        ctx.stroke();
      }

      // Node
      ctx.fillStyle = 'rgba(30, 30, 48, 0.9)';
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawCat(ctx: CanvasRenderingContext2D, y: number, sliding: boolean, grounded: boolean, frame: number, rainbow: boolean) {
  const x = CAT_X;
  const color = rainbow ? `hsl(${(frame * 20) % 360}, 100%, 65%)` : C.green;

  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = rainbow ? 20 : 10;
  ctx.fillStyle = color;

  if (sliding) {
    // Sliding: flattened body
    roundRect(ctx, x, y, CAT_W + 10, CAT_SLIDE_H, 4);
    ctx.fill();
    // Eye
    ctx.shadowBlur = 0;
    ctx.fillStyle = C.textBright;
    ctx.fillRect(x + CAT_W + 2, y + 4, 3, 3);
    // Ear nub
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x + CAT_W + 4, y);
    ctx.lineTo(x + CAT_W + 8, y - 4);
    ctx.lineTo(x + CAT_W + 10, y);
    ctx.fill();
  } else {
    // Body
    roundRect(ctx, x, y + 10, CAT_W, CAT_H - 10, 4);
    ctx.fill();

    // Head
    roundRect(ctx, x - 2, y + 4, CAT_W + 4, 18, 5);
    ctx.fill();

    // Ears
    ctx.beginPath();
    ctx.moveTo(x + 2, y + 6);
    ctx.lineTo(x + 7, y - 4);
    ctx.lineTo(x + 12, y + 6);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + CAT_W - 12, y + 6);
    ctx.lineTo(x + CAT_W - 7, y - 4);
    ctx.lineTo(x + CAT_W - 2, y + 6);
    ctx.fill();

    ctx.shadowBlur = 0;

    // Eyes
    ctx.fillStyle = C.textBright;
    ctx.fillRect(x + 10, y + 12, 3, 3);
    ctx.fillRect(x + CAT_W - 10, y + 12, 3, 3);

    // Nose
    ctx.fillStyle = C.red;
    ctx.fillRect(x + CAT_W / 2 - 1, y + 17, 2, 2);

    // Legs (animated when running on ground)
    ctx.fillStyle = color;
    if (grounded) {
      const off = frame % 2 === 0 ? 3 : -3;
      ctx.fillRect(x + 6 + off, y + CAT_H, 5, 6);
      ctx.fillRect(x + CAT_W - 11 - off, y + CAT_H, 5, 6);
    } else {
      // Tucked legs in air
      ctx.fillRect(x + 8, y + CAT_H - 2, 5, 4);
      ctx.fillRect(x + CAT_W - 13, y + CAT_H - 2, 5, 4);
    }

    // Tail
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.shadowColor = color;
    ctx.shadowBlur = 6;
    const wave = Math.sin(frame * 0.3) * 8;
    ctx.beginPath();
    ctx.moveTo(x - 2, y + 16);
    ctx.quadraticCurveTo(x - 14, y + 10 + wave, x - 16, y);
    ctx.stroke();
  }

  ctx.restore();
}

function drawObstacle(ctx: CanvasRenderingContext2D, obs: Obstacle) {
  // Guardrail gets its own drawing style
  if (obs.type === 'guardrail') {
    ctx.save();
    const color = C.red;

    // Faint neon fill
    ctx.globalAlpha = 0.07;
    ctx.fillStyle = color;
    ctx.fillRect(obs.x, obs.y, obs.w, obs.h);

    // Hazard stripes (diagonal lines)
    ctx.globalAlpha = 0.15;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    const step = 12;
    for (let i = -obs.h; i < obs.w + obs.h; i += step) {
      ctx.beginPath();
      ctx.moveTo(obs.x + i, obs.y + obs.h);
      ctx.lineTo(obs.x + i + obs.h, obs.y);
      ctx.stroke();
    }

    // Side rails
    ctx.globalAlpha = 0.4;
    ctx.shadowColor = color;
    ctx.shadowBlur = 6;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(obs.x, obs.y);
    ctx.lineTo(obs.x, obs.y + obs.h);
    ctx.moveTo(obs.x + obs.w, obs.y);
    ctx.lineTo(obs.x + obs.w, obs.y + obs.h);
    ctx.stroke();

    // "GUARDRAIL" label (vertical, repeated)
    ctx.shadowBlur = 4;
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = color;
    ctx.font = 'bold 8px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    const labelY = obs.y + obs.h - 30;
    ctx.save();
    ctx.translate(obs.x + obs.w / 2, labelY);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('GUARDRAIL', 0, 3);
    ctx.restore();

    ctx.restore();
    return;
  }

  const colors: Record<string, string> = {
    'rate-limit': C.red,
    'hallucination': C.purple,
    'overfit': C.amber,
  };
  const labels: Record<string, string> = {
    'rate-limit': '429',
    'hallucination': '???',
    'overfit': 'OVF',
  };
  const color = colors[obs.type] || C.red;

  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 12;
  ctx.fillStyle = color;
  roundRect(ctx, obs.x, obs.y, obs.w, obs.h, 3);
  ctx.fill();

  // Border
  ctx.shadowBlur = 0;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.6;
  roundRect(ctx, obs.x + 2, obs.y + 2, obs.w - 4, obs.h - 4, 2);
  ctx.stroke();

  // Label
  ctx.globalAlpha = 0.8;
  ctx.fillStyle = C.void;
  ctx.font = 'bold 9px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(labels[obs.type] || '', obs.x + obs.w / 2, obs.y + obs.h / 2 + 3);

  ctx.restore();
}

function drawToken(ctx: CanvasRenderingContext2D, t: Token, time: number) {
  if (!t.alive) return;
  const pulse = 0.8 + Math.sin(time * 6 + t.x) * 0.2;

  ctx.save();
  ctx.shadowColor = C.amber;
  ctx.shadowBlur = 8 * pulse;
  ctx.fillStyle = C.amber;

  // Diamond shape
  ctx.beginPath();
  ctx.moveTo(t.x, t.y - TOKEN_SIZE / 2);
  ctx.lineTo(t.x + TOKEN_SIZE / 2, t.y);
  ctx.lineTo(t.x, t.y + TOKEN_SIZE / 2);
  ctx.lineTo(t.x - TOKEN_SIZE / 2, t.y);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function drawPowerup(ctx: CanvasRenderingContext2D, p: PowerupItem, time: number) {
  if (!p.alive) return;
  const colors: Record<string, string> = {
    'context-window': C.cyan,
    'fine-tune': C.purple,
    'overclock': C.amber,
  };
  const color = colors[p.type] || C.cyan;
  const pulse = 1 + Math.sin(time * 4) * 0.3;

  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 14 * pulse;
  ctx.fillStyle = color;

  // Circle with inner ring
  ctx.beginPath();
  ctx.arc(p.x, p.y, POWERUP_SIZE / 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.fillStyle = C.void;
  ctx.beginPath();
  ctx.arc(p.x, p.y, POWERUP_SIZE / 2 - 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = color;
  ctx.font = 'bold 10px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const symbols: Record<string, string> = { 'context-window': 'C', 'fine-tune': 'F', 'overclock': '2x' };
  ctx.fillText(symbols[p.type] || '?', p.x, p.y + 1);

  ctx.restore();
}

function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
  for (const p of particles) {
    if (p.life <= 0) continue;
    const alpha = p.life / p.maxLife;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 4;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    ctx.restore();
  }
}

function drawHUD(ctx: CanvasRenderingContext2D, score: number, streak: number, highScore: number, activePowerup: ActivePowerup | null) {
  ctx.save();
  ctx.font = 'bold 14px "JetBrains Mono", monospace';

  // Score
  ctx.fillStyle = C.amber;
  ctx.shadowColor = C.amber;
  ctx.shadowBlur = 6;
  ctx.textAlign = 'left';
  ctx.fillText(`TOKENS: ${String(score).padStart(4, '0')}`, 20, 30);

  // Streak
  if (streak > 1) {
    ctx.fillStyle = C.green;
    ctx.shadowColor = C.green;
    ctx.fillText(`STREAK: x${streak}`, 20, 50);
  }

  // High score
  ctx.fillStyle = C.textMuted;
  ctx.shadowBlur = 0;
  ctx.textAlign = 'right';
  ctx.font = '12px "JetBrains Mono", monospace';
  ctx.fillText(`BEST: ${highScore}`, GAME_W - 20, 30);

  // Active powerup indicator
  if (activePowerup) {
    const pColors: Record<string, string> = { 'context-window': C.cyan, 'fine-tune': C.purple, 'overclock': C.amber };
    const pLabels: Record<string, string> = { 'context-window': 'CONTEXT WINDOW', 'fine-tune': 'FINE-TUNE', 'overclock': 'OVERCLOCK x2' };
    const pc = pColors[activePowerup.type] || C.cyan;
    ctx.fillStyle = pc;
    ctx.shadowColor = pc;
    ctx.shadowBlur = 8;
    ctx.textAlign = 'center';
    ctx.font = 'bold 12px "JetBrains Mono", monospace';
    ctx.fillText(pLabels[activePowerup.type] || '', GAME_W / 2, 30);

    // Timer bar
    const barW = 100;
    const barH = 4;
    const bx = GAME_W / 2 - barW / 2;
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(bx, 36, barW, barH);
    ctx.fillStyle = pc;
    const maxDur = activePowerup.type === 'overclock' ? 5 : 4;
    ctx.fillRect(bx, 36, barW * Math.min(activePowerup.timer / maxDur, 1), barH);
  }

  ctx.restore();
}

function drawGlitchEffect(ctx: CanvasRenderingContext2D) {
  // Scanlines
  for (let y = 0; y < GAME_H; y += 4) {
    ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.15})`;
    ctx.fillRect(0, y, GAME_W, 2);
  }
  // Random color blocks
  for (let i = 0; i < 3; i++) {
    const gx = rand(0, GAME_W);
    const gy = rand(0, GAME_H);
    ctx.fillStyle = [C.red, C.cyan, C.purple][i];
    ctx.globalAlpha = 0.08;
    ctx.fillRect(gx, gy, rand(20, 80), rand(2, 6));
    ctx.globalAlpha = 1;
  }
}

// ═══════════════════════════════════════════════════════════════
// GAME STATE
// ═══════════════════════════════════════════════════════════════

function createGameState(): GameState {
  return {
    catY: GROUND_Y - CAT_H,
    catVY: 0,
    grounded: true,
    sliding: false,
    legFrame: 0,
    legTimer: 0,
    obstacles: [],
    tokens: [],
    powerups: [],
    activePowerup: null,
    score: 0,
    streak: 0,
    maxStreak: 0,
    speed: INITIAL_SPEED,
    distance: 0,
    groundOffset: 0,
    obstacleTimer: 2,
    tokenTimer: 1,
    powerupTimer: rand(10, 18),
    meowBuffer: '',
    rainbowTimer: 0,
    particles: [],
    scenery: generateScenery(),
    sceneryOffset: 0,
  };
}

// ═══════════════════════════════════════════════════════════════
// GAME LOGIC
// ═══════════════════════════════════════════════════════════════

function spawnParticles(state: GameState, x: number, y: number, color: string, count: number) {
  for (let i = 0; i < count; i++) {
    state.particles.push({
      x, y,
      vx: rand(-80, 80),
      vy: rand(-120, -20),
      life: rand(0.3, 0.7),
      maxLife: rand(0.3, 0.7),
      color,
      size: rand(2, 5),
    });
  }
}

function updateGame(state: GameState, dt: number, input: InputState, sound: ReturnType<typeof createSoundEngine>): boolean {
  const speedMul = state.activePowerup?.type === 'context-window' ? 0.5 : 1;
  const scoreMul = state.activePowerup?.type === 'overclock' ? 2 : 1;
  const effectiveDt = dt * speedMul;
  const effectiveSpeed = state.speed * speedMul;

  // Cat physics
  if (input.jumpPressed && state.grounded) {
    state.catVY = JUMP_VEL;
    state.grounded = false;
    sound.jump();
  }
  input.jumpPressed = false;

  state.sliding = input.slideHeld && state.grounded;
  const catH = state.sliding ? CAT_SLIDE_H : CAT_H;
  const catTop = state.sliding ? GROUND_Y - CAT_SLIDE_H : state.catY;

  if (!state.grounded) {
    state.catVY += GRAVITY * effectiveDt;
    state.catY += state.catVY * effectiveDt;
    if (state.catY >= GROUND_Y - CAT_H) {
      state.catY = GROUND_Y - CAT_H;
      state.catVY = 0;
      state.grounded = true;
    }
  }

  // Leg animation
  state.legTimer += effectiveDt;
  if (state.legTimer > 0.1) {
    state.legTimer = 0;
    state.legFrame++;
  }

  // Speed increase
  state.speed = Math.min(MAX_SPEED, state.speed + SPEED_INCREASE * effectiveDt);
  state.distance += effectiveSpeed * effectiveDt;
  state.groundOffset += effectiveSpeed * effectiveDt;
  state.sceneryOffset = state.groundOffset;

  // Spawn obstacles
  state.obstacleTimer -= effectiveDt;
  if (state.obstacleTimer <= 0) {
    const types: Obstacle['type'][] = ['rate-limit', 'hallucination', 'overfit'];
    const type = types[randInt(0, 2)];
    let obs: Obstacle;

    if (type === 'rate-limit') {
      // Ground obstacle — jump over
      obs = { x: GAME_W + 20, y: GROUND_Y - 45, w: 30, h: 45, type };
    } else if (type === 'hallucination') {
      // Air obstacle — slide under, with guardrail above blocking jumps
      const hallY = GROUND_Y - CAT_H - 10;
      obs = { x: GAME_W + 20, y: hallY, w: 40, h: 22, type };
      state.obstacles.push({ x: GAME_W + 20, y: 0, w: 40, h: hallY, type: 'guardrail' });
    } else {
      // Tall obstacle — must jump early
      obs = { x: GAME_W + 20, y: GROUND_Y - 65, w: 25, h: 65, type };
    }
    state.obstacles.push(obs);
    state.obstacleTimer = rand(1.2, 2.5) * (INITIAL_SPEED / state.speed);
  }

  // Spawn tokens
  state.tokenTimer -= effectiveDt;
  if (state.tokenTimer <= 0) {
    state.tokens.push({
      x: GAME_W + 20,
      y: GROUND_Y - rand(30, 120),
      alive: true,
    });
    state.tokenTimer = rand(0.6, 1.4);
  }

  // Spawn powerups
  state.powerupTimer -= effectiveDt;
  if (state.powerupTimer <= 0) {
    const types: PowerupItem['type'][] = ['context-window', 'fine-tune', 'overclock'];
    state.powerups.push({
      x: GAME_W + 20,
      y: GROUND_Y - rand(50, 100),
      type: types[randInt(0, 2)],
      alive: true,
    });
    state.powerupTimer = rand(12, 22);
  }

  // Move obstacles, tokens, powerups
  for (const obs of state.obstacles) obs.x -= effectiveSpeed * effectiveDt;
  for (const t of state.tokens) t.x -= effectiveSpeed * effectiveDt;
  for (const p of state.powerups) p.x -= effectiveSpeed * effectiveDt;

  // Clean up off-screen
  state.obstacles = state.obstacles.filter(o => o.x + o.w > -20);
  state.tokens = state.tokens.filter(t => t.x > -20);
  state.powerups = state.powerups.filter(p => p.x > -20);

  // Fine-tune magnet: pull tokens toward cat
  if (state.activePowerup?.type === 'fine-tune') {
    for (const t of state.tokens) {
      if (!t.alive) continue;
      const dx = CAT_X + CAT_W / 2 - t.x;
      const dy = catTop + catH / 2 - t.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 150) {
        t.x += (dx / dist) * 300 * effectiveDt;
        t.y += (dy / dist) * 300 * effectiveDt;
      }
    }
  }

  // Collision: tokens
  for (const t of state.tokens) {
    if (!t.alive) continue;
    if (aabb(CAT_X + 2, catTop + 2, CAT_W - 4, catH - 4, t.x - TOKEN_SIZE / 2, t.y - TOKEN_SIZE / 2, TOKEN_SIZE, TOKEN_SIZE)) {
      t.alive = false;
      state.score += 1 * scoreMul;
      state.streak++;
      if (state.streak > state.maxStreak) state.maxStreak = state.streak;
      spawnParticles(state, t.x, t.y, C.amber, 5);
      sound.collect();
    }
  }

  // Collision: powerups
  for (const p of state.powerups) {
    if (!p.alive) continue;
    if (aabb(CAT_X, catTop, CAT_W, catH, p.x - POWERUP_SIZE / 2, p.y - POWERUP_SIZE / 2, POWERUP_SIZE, POWERUP_SIZE)) {
      p.alive = false;
      state.activePowerup = { type: p.type, timer: p.type === 'overclock' ? 5 : 4 };
      const pColors: Record<string, string> = { 'context-window': C.cyan, 'fine-tune': C.purple, 'overclock': C.amber };
      spawnParticles(state, p.x, p.y, pColors[p.type] || C.cyan, 10);
      sound.powerup();
    }
  }

  // Powerup timer
  if (state.activePowerup) {
    state.activePowerup.timer -= dt; // Real time, not slowed
    if (state.activePowerup.timer <= 0) state.activePowerup = null;
  }

  // Collision: obstacles (with forgiving hitbox)
  for (const obs of state.obstacles) {
    if (aabb(CAT_X + 4, catTop + 4, CAT_W - 8, catH - 8, obs.x, obs.y, obs.w, obs.h)) {
      sound.crash();
      spawnParticles(state, CAT_X + CAT_W / 2, catTop + catH / 2, C.red, 15);
      return true; // Dead
    }
  }

  // Missed tokens (went off screen) break streak
  const missed = state.tokens.filter(t => t.alive && t.x < -10);
  if (missed.length > 0) state.streak = 0;
  state.tokens = state.tokens.filter(t => t.alive || t.x > -10);

  // Particles
  for (const p of state.particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 200 * dt;
    p.life -= dt;
  }
  state.particles = state.particles.filter(p => p.life > 0);

  // Rainbow (easter egg)
  if (state.rainbowTimer > 0) state.rainbowTimer -= dt;

  return false; // Alive
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function NeonCatRunner() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<GameState>(createGameState());
  const inputRef = useRef<InputState>({ jumpPressed: false, slideHeld: false });
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const scaleRef = useRef<number>(1);
  const soundRef = useRef(createSoundEngine());
  const timeRef = useRef<number>(0);
  const touchStartRef = useRef<{ y: number; time: number } | null>(null);

  const [phase, setPhase] = useState<Phase>('boot');
  const [bootLines, setBootLines] = useState<string[]>([]);
  const [displayScore, setDisplayScore] = useState(0);
  const [displayStreak, setDisplayStreak] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [commentary, setCommentary] = useState('');
  const [muted, setMuted] = useState(false);

  // Load high score on mount
  useEffect(() => { setHighScore(loadHighScore()); }, []);

  // ─── Boot sequence ────────────────────────────────────
  useEffect(() => {
    if (phase !== 'boot') return;
    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout>;
    let lineIndex = 0;

    function showNextLine() {
      if (cancelled || lineIndex >= BOOT_LINES.length) {
        if (!cancelled) setPhase('ready');
        return;
      }
      const line = BOOT_LINES[lineIndex];
      lineIndex++;
      setBootLines(prev => [...prev, line.text]);
      timeout = setTimeout(showNextLine, line.delay + (line.typing ? line.text.length * 30 : 0));
    }

    timeout = setTimeout(showNextLine, 300);
    return () => { cancelled = true; clearTimeout(timeout); };
  }, [phase]);

  // ─── Resize canvas ────────────────────────────────────
  const resizeCanvas = useCallback(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = rect.width;
    const h = w * (GAME_H / GAME_W);

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    scaleRef.current = w / GAME_W;
  }, []);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [resizeCanvas]);

  // ─── Game loop ─────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'playing') return;
    lastTimeRef.current = 0;

    function loop(timestamp: number) {
      if (lastTimeRef.current === 0) lastTimeRef.current = timestamp;
      const dt = Math.min((timestamp - lastTimeRef.current) / 1000, 0.1);
      lastTimeRef.current = timestamp;
      timeRef.current += dt;

      const state = gameRef.current;
      const dead = updateGame(state, dt, inputRef.current, soundRef.current);

      // Render
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const dpr = window.devicePixelRatio || 1;
          const scale = scaleRef.current;
          ctx.save();
          ctx.scale(dpr * scale, dpr * scale);

          drawBackground(ctx);
          drawScenery(ctx, state.scenery, state.sceneryOffset);
          drawGround(ctx, state.groundOffset);

          // Draw tokens
          for (const t of state.tokens) drawToken(ctx, t, timeRef.current);
          // Draw powerups
          for (const p of state.powerups) drawPowerup(ctx, p, timeRef.current);
          // Draw obstacles
          for (const obs of state.obstacles) drawObstacle(ctx, obs);

          // Draw cat
          const catDrawY = state.sliding ? GROUND_Y - CAT_SLIDE_H : state.catY;
          drawCat(ctx, catDrawY, state.sliding, state.grounded, state.legFrame, state.rainbowTimer > 0);

          // Particles
          drawParticles(ctx, state.particles);

          // HUD
          drawHUD(ctx, state.score, state.streak, highScore, state.activePowerup);

          // Glitch effect during context-window powerup
          if (state.activePowerup?.type === 'context-window') {
            drawGlitchEffect(ctx);
          }

          ctx.restore();
        }
      }

      if (dead) {
        const finalScore = state.score;
        const newHigh = Math.max(finalScore, highScore);
        setDisplayScore(finalScore);
        setDisplayStreak(state.maxStreak);
        setCommentary(getCommentary(finalScore));
        setHighScore(newHigh);
        saveHighScore(newHigh);
        setPhase('gameover');
        return;
      }

      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [phase, highScore]);

  // ─── Render ready/paused screen on canvas ──────────────
  useEffect(() => {
    if (phase !== 'ready' && phase !== 'paused') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const scale = scaleRef.current;
    ctx.save();
    ctx.scale(dpr * scale, dpr * scale);

    if (phase === 'ready') {
      drawBackground(ctx);
      drawScenery(ctx, gameRef.current.scenery, 0);
      drawGround(ctx, 0);
      drawCat(ctx, GROUND_Y - CAT_H, false, true, 0, false);
    }

    ctx.restore();
  }, [phase]);

  // ─── Visibility change (pause) ─────────────────────────
  useEffect(() => {
    function onVisChange() {
      if (document.hidden && phase === 'playing') {
        setPhase('paused');
      }
    }
    document.addEventListener('visibilitychange', onVisChange);
    return () => document.removeEventListener('visibilitychange', onVisChange);
  }, [phase]);

  // ─── Keyboard input ───────────────────────────────────
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.repeat) return;
      const key = e.key;

      // Easter egg: meow
      if (phase === 'playing' && 'meow'.includes(key.toLowerCase())) {
        const buf = (gameRef.current.meowBuffer + key.toLowerCase()).slice(-4);
        gameRef.current.meowBuffer = buf;
        if (buf === 'meow') {
          gameRef.current.rainbowTimer = 3;
          gameRef.current.score += 10;
          spawnParticles(gameRef.current, CAT_X + CAT_W / 2, gameRef.current.catY, C.green, 20);
          soundRef.current.meow();
          gameRef.current.meowBuffer = '';
        }
      }

      if (key === ' ' || key === 'ArrowUp' || key === 'w' || key === 'W') {
        e.preventDefault();
        if (phase === 'boot') { setBootLines(BOOT_LINES.map(l => l.text)); setPhase('ready'); }
        else if (phase === 'ready') { gameRef.current = createGameState(); setPhase('playing'); }
        else if (phase === 'playing') { inputRef.current.jumpPressed = true; }
        else if (phase === 'paused') { setPhase('playing'); }
        else if (phase === 'gameover') { gameRef.current = createGameState(); setPhase('playing'); }
      }
      if ((key === 'ArrowDown' || key === 's' || key === 'S') && phase === 'playing') {
        e.preventDefault();
        inputRef.current.slideHeld = true;
      }
      if (key === 'Escape' && phase === 'playing') {
        setPhase('paused');
      }
    }

    function onKeyUp(e: KeyboardEvent) {
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        inputRef.current.slideHeld = false;
      }
    }

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => { window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp); };
  }, [phase]);

  // ─── Touch input ──────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let swipedDown = false;

    function onTouchStart(e: TouchEvent) {
      e.preventDefault();
      const touch = e.touches[0];
      touchStartRef.current = { y: touch.clientY, time: Date.now() };
      swipedDown = false;

      if (phase === 'boot') { setBootLines(BOOT_LINES.map(l => l.text)); setPhase('ready'); }
      else if (phase === 'ready') { gameRef.current = createGameState(); setPhase('playing'); }
      else if (phase === 'paused') { setPhase('playing'); }
      // Don't trigger jump here — wait for touchend to distinguish tap from swipe
    }

    function onTouchMove(e: TouchEvent) {
      e.preventDefault();
      if (!touchStartRef.current) return;
      const touch = e.touches[0];
      if (touch.clientY - touchStartRef.current.y > 30) {
        swipedDown = true;
        inputRef.current.slideHeld = true;
      }
    }

    function onTouchEnd(e: TouchEvent) {
      e.preventDefault();
      if (phase === 'playing' && !swipedDown) {
        inputRef.current.jumpPressed = true;
      }
      inputRef.current.slideHeld = false;
      swipedDown = false;
      touchStartRef.current = null;
    }

    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd, { passive: false });
    return () => {
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
    };
  }, [phase]);

  // ─── Share ─────────────────────────────────────────────
  const shareScore = useCallback(() => {
    const text = `I scored ${displayScore} tokens on SOFT CAT .ai! Can your model keep up?\nhttps://softcat.ai/play`;
    try {
      navigator.clipboard.writeText(text);
    } catch {
      // Fallback: prompt-style
      window.prompt('Copy your score:', text);
    }
  }, [displayScore]);

  // ─── Toggle mute ──────────────────────────────────────
  const toggleMute = useCallback(() => {
    const next = !muted;
    setMuted(next);
    soundRef.current.setMuted(next);
  }, [muted]);

  // ─── Overlay tap handler (overlays block canvas touch events) ──
  const handleOverlayTap = useCallback(() => {
    soundRef.current.setMuted(soundRef.current.isMuted()); // Ensure AudioContext is unlocked
    if (phase === 'boot') { setBootLines(BOOT_LINES.map(l => l.text)); setPhase('ready'); }
    else if (phase === 'ready') { gameRef.current = createGameState(); setPhase('playing'); }
    else if (phase === 'paused') { setPhase('playing'); }
    else if (phase === 'gameover') { gameRef.current = createGameState(); setPhase('playing'); }
  }, [phase]);

  // ─── Render ────────────────────────────────────────────
  const overlayBase = 'absolute inset-0 flex flex-col items-center justify-center font-mono';

  return (
    <div class="relative w-full select-none" ref={containerRef}>
      <canvas
        ref={canvasRef}
        class="block w-full rounded-lg border border-surface-light/50"
        style={{ aspectRatio: `${GAME_W}/${GAME_H}`, background: C.void }}
      />

      {/* Mute toggle */}
      <button
        onClick={toggleMute}
        class="absolute top-2 right-2 md:top-3 md:right-3 font-mono text-xs text-text-muted hover:text-neon-cyan transition-colors bg-surface/80 px-2 py-1 rounded border border-surface-light/30"
        title={muted ? 'Unmute' : 'Mute'}
      >
        {muted ? 'SOUND: OFF' : 'SOUND: ON'}
      </button>

      {/* Boot sequence overlay */}
      {phase === 'boot' && (
        <div class={`${overlayBase} bg-void/95 items-start p-6 md:p-12 cursor-pointer`} onClick={handleOverlayTap}>
          <div class="text-sm md:text-base max-w-lg">
            {bootLines.map((line, i) => (
              <div key={i} class={`mb-1 ${i === 0 ? 'text-neon-green' : 'text-text-muted'}`}>
                {line}
              </div>
            ))}
            <span class="text-neon-green animate-pulse">_</span>
          </div>
          <div class="mt-6 text-xs text-text-muted">
            tap or press any key to skip
          </div>
        </div>
      )}

      {/* Ready overlay */}
      {phase === 'ready' && (
        <div class={`${overlayBase} bg-void/70 cursor-pointer px-4`} onClick={handleOverlayTap}>
          <div class="text-lg md:text-3xl text-text-bright font-bold glow-green mb-1 md:mb-2">
            NEON CAT RUNNER
          </div>
          <div class="text-xs md:text-sm text-text-muted mb-3 md:mb-6">
            collect tokens &middot; dodge obstacles &middot; don't hallucinate
          </div>
          <div class="text-neon-green animate-pulse text-xs md:text-sm">
            [TAP] or [SPACE] to start
          </div>
          <div class="mt-2 md:mt-4 text-xs text-text-muted hidden md:block">
            SPACE / UP = jump &nbsp;&middot;&nbsp; DOWN = slide &nbsp;&middot;&nbsp; ESC = pause
          </div>
          {highScore > 0 && (
            <div class="mt-3 text-xs text-text-muted">
              best: {highScore} tokens
            </div>
          )}
        </div>
      )}

      {/* Paused overlay */}
      {phase === 'paused' && (
        <div class={`${overlayBase} bg-void/80 cursor-pointer`} onClick={handleOverlayTap}>
          <div class="text-xl md:text-2xl text-neon-cyan font-bold glow-cyan mb-2">
            MODEL SUSPENDED
          </div>
          <div class="text-sm text-text-muted animate-pulse">
            [SPACE] or [TAP] to resume
          </div>
        </div>
      )}

      {/* Game over overlay */}
      {phase === 'gameover' && (
        <div class={`${overlayBase} bg-void/85 px-4`} onClick={handleOverlayTap}>
          <div class="text-base md:text-2xl text-neon-red font-bold mb-1" style="text-shadow: 0 0 12px rgba(218,94,116,0.5)">
            TRAINING HALTED
          </div>
          <div class="text-2xl md:text-4xl text-text-bright font-bold my-2 md:my-3">
            {displayScore} <span class="text-sm md:text-lg text-neon-amber">tokens</span>
          </div>
          {displayStreak > 1 && (
            <div class="text-sm text-neon-green mb-1">
              best streak: x{displayStreak}
            </div>
          )}
          {displayScore >= highScore && displayScore > 0 && (
            <div class="text-sm text-neon-amber mb-2 animate-pulse">
              NEW HIGH SCORE
            </div>
          )}
          <div class="text-xs md:text-sm text-text-muted italic mb-3 md:mb-6 max-w-xs text-center">
            {commentary}
          </div>
          <div class="flex gap-4">
            <button
              onClick={(e) => { e.stopPropagation(); gameRef.current = createGameState(); setPhase('playing'); }}
              class="px-5 py-2 bg-surface border border-neon-green/40 rounded-lg font-mono text-sm text-neon-green hover:bg-neon-green/10 hover:border-neon-green/70 transition-all"
            >
              &gt; retry
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); shareScore(); }}
              class="px-5 py-2 bg-surface border border-neon-cyan/40 rounded-lg font-mono text-sm text-neon-cyan hover:bg-neon-cyan/10 hover:border-neon-cyan/70 transition-all"
            >
              &gt; share
            </button>
          </div>
          <div class="mt-4 text-xs text-text-muted">
            or press [SPACE]
          </div>
        </div>
      )}
    </div>
  );
}
