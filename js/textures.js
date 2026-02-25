/**
 * textures.js — Procedural texture generators for the Hall of Legacy.
 * Generates stone, metal, and wall textures using canvas 2D.
 */
import * as THREE from 'three';

/** Create a canvas + context of given size */
function makeCanvas(w = 512, h = 512) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return { canvas: c, ctx: c.getContext('2d') };
}

/** Generate a dark stone floor texture */
export function createStoneFloorTexture() {
  const { canvas, ctx } = makeCanvas(512, 512);

  // Base dark stone
  ctx.fillStyle = '#1a1a22';
  ctx.fillRect(0, 0, 512, 512);

  // Add noise grain
  for (let i = 0; i < 15000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const brightness = Math.floor(Math.random() * 30 + 15);
    ctx.fillStyle = `rgb(${brightness}, ${brightness}, ${brightness + 5})`;
    ctx.fillRect(x, y, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }

  // Grid lines (stone tile joints)
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 2;
  for (let x = 0; x < 512; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 512);
    ctx.stroke();
  }
  for (let y = 0; y < 512; y += 64) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  return tex;
}

/** Generate a dark stone wall texture */
export function createStoneWallTexture() {
  const { canvas, ctx } = makeCanvas(512, 512);

  // Base wall color
  ctx.fillStyle = '#15151d';
  ctx.fillRect(0, 0, 512, 512);

  // Rough stone blocks
  for (let row = 0; row < 8; row++) {
    let x = 0;
    const y = row * 64;
    const offset = row % 2 === 0 ? 0 : 32;
    x = -offset;
    while (x < 512) {
      const blockW = 50 + Math.random() * 30;
      const brightness = Math.floor(Math.random() * 15 + 18);
      ctx.fillStyle = `rgb(${brightness}, ${brightness}, ${brightness + 3})`;
      ctx.fillRect(x + 2, y + 2, blockW - 4, 60);

      // Add subtle variation
      for (let n = 0; n < 40; n++) {
        const nx = x + Math.random() * blockW;
        const ny = y + Math.random() * 60;
        const nb = Math.floor(Math.random() * 20 + 10);
        ctx.fillStyle = `rgba(${nb}, ${nb}, ${nb}, 0.5)`;
        ctx.fillRect(nx, ny, 2, 2);
      }

      x += blockW;
    }
  }

  // Mortar lines
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.lineWidth = 3;
  for (let y = 0; y < 512; y += 64) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  return tex;
}

/** Generate a metal/bronze plinth texture */
export function createMetalTexture(tint = '#d4af37') {
  const { canvas, ctx } = makeCanvas(256, 256);

  // Base gradient
  const grad = ctx.createLinearGradient(0, 0, 256, 256);
  grad.addColorStop(0, '#1c1c1c');
  grad.addColorStop(0.5, '#2a2a2a');
  grad.addColorStop(1, '#1c1c1c');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  // Metallic streaks
  for (let i = 0; i < 200; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const w = Math.random() * 60 + 5;
    ctx.strokeStyle = `rgba(255, 255, 255, ${Math.random() * 0.03})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y + Math.random() * 4 - 2);
    ctx.stroke();
  }

  // Tint overlay
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = tint;
  ctx.globalAlpha = 0.15;
  ctx.fillRect(0, 0, 256, 256);
  ctx.globalAlpha = 1.0;
  ctx.globalCompositeOperation = 'source-over';

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/** Generate a text label texture for names on plinths/walls */
export function createTextTexture(text, options = {}) {
  const {
    fontSize = 48,
    fontFamily = 'Georgia, serif',
    color = '#d4af37',
    bgColor = 'transparent',
    width = 512,
    height = 128,
    glow = false,
    subText = '',
    subColor = '#8888aa',
    subFontSize = 24,
  } = options;

  const { canvas, ctx } = makeCanvas(width, height);

  // Background
  if (bgColor !== 'transparent') {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);
  }

  // Glow effect
  if (glow) {
    ctx.shadowColor = color;
    ctx.shadowBlur = 20;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }

  // Main text
  ctx.fillStyle = color;
  ctx.font = `${fontSize}px ${fontFamily}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = subText ? 'bottom' : 'middle';
  const yPos = subText ? height * 0.45 : height / 2;
  ctx.fillText(text, width / 2, yPos);

  // Sub text (role / contribution)
  if (subText) {
    ctx.shadowBlur = 0;
    ctx.fillStyle = subColor;
    ctx.font = `${subFontSize}px ${fontFamily}`;
    ctx.textBaseline = 'top';
    ctx.fillText(subText, width / 2, height * 0.55);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}

/** Generate a ceiling texture (dark with subtle patterns) */
export function createCeilingTexture() {
  const { canvas, ctx } = makeCanvas(512, 512);

  ctx.fillStyle = '#0a0a10';
  ctx.fillRect(0, 0, 512, 512);

  // Subtle coffers / vault pattern
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      const x = col * 128;
      const y = row * 128;
      ctx.strokeStyle = 'rgba(40, 40, 50, 0.5)';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 8, y + 8, 112, 112);

      // Inner shadow
      ctx.strokeStyle = 'rgba(20, 20, 28, 0.8)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 16, y + 16, 96, 96);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  return tex;
}
