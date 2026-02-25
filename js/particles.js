/**
 * particles.js — Particle effects for the Hall of Legacy.
 * Torch flame particles, ambient dust motes, and elite name glow.
 */
import * as THREE from 'three';

/** Create a small circular particle sprite texture */
function createParticleSprite(color = '#ffaa44', size = 64) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const half = size / 2;

  const gradient = ctx.createRadialGradient(half, half, 0, half, half, half);
  gradient.addColorStop(0, color);
  gradient.addColorStop(0.3, color);
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  return tex;
}

/**
 * TorchFlame — Particle system simulating a flickering torch fire.
 */
export class TorchFlame {
  constructor(position, options = {}) {
    const {
      count = 40,
      color = '#ff8833',
      spread = 0.15,
      height = 0.8,
      size = 0.12,
    } = options;

    this.count = count;
    this.spread = spread;
    this.height = height;

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const lifetimes = new Float32Array(count);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      this._resetParticle(i, positions, velocities, lifetimes, sizes, size);
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      map: createParticleSprite(color),
      size,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.7,
      sizeAttenuation: true,
    });

    this.points = new THREE.Points(geometry, material);
    this.points.position.copy(position);

    this._velocities = velocities;
    this._lifetimes = lifetimes;
    this._sizes = sizes;
    this._baseSize = size;
  }

  _resetParticle(i, positions, velocities, lifetimes, sizes, baseSize) {
    const i3 = i * 3;
    positions[i3] = (Math.random() - 0.5) * this.spread;
    positions[i3 + 1] = Math.random() * 0.1;
    positions[i3 + 2] = (Math.random() - 0.5) * this.spread;

    velocities[i3] = (Math.random() - 0.5) * 0.005;
    velocities[i3 + 1] = 0.008 + Math.random() * 0.012;
    velocities[i3 + 2] = (Math.random() - 0.5) * 0.005;

    lifetimes[i] = Math.random();
    sizes[i] = baseSize * (0.5 + Math.random() * 0.5);
  }

  update(dt) {
    const pos = this.points.geometry.attributes.position.array;
    const vel = this._velocities;
    const life = this._lifetimes;
    const count = this.count;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      life[i] += dt * 1.5;

      if (life[i] >= 1.0) {
        this._resetParticle(i, pos, vel, life, this._sizes, this._baseSize);
      } else {
        pos[i3] += vel[i3];
        pos[i3 + 1] += vel[i3 + 1];
        pos[i3 + 2] += vel[i3 + 2];
        // Slight wind sway
        pos[i3] += Math.sin(life[i] * 6.0) * 0.001;
      }
    }

    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.material.opacity = 0.5 + Math.sin(Date.now() * 0.005) * 0.2;
  }

  addTo(scene) {
    scene.add(this.points);
  }
}

/**
 * AmbientDust — Floating dust motes in the hall.
 */
export class AmbientDust {
  constructor(bounds, options = {}) {
    const {
      count = 300,
      color = '#aaaaaa',
      size = 0.04,
    } = options;

    this.bounds = bounds; // { x: [-w, w], y: [0, h], z: [-d, d] }
    this.count = count;

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      positions[i3] = THREE.MathUtils.randFloat(bounds.x[0], bounds.x[1]);
      positions[i3 + 1] = THREE.MathUtils.randFloat(bounds.y[0], bounds.y[1]);
      positions[i3 + 2] = THREE.MathUtils.randFloat(bounds.z[0], bounds.z[1]);
      speeds[i] = 0.002 + Math.random() * 0.005;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      map: createParticleSprite(color, 32),
      size,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.3,
      sizeAttenuation: true,
    });

    this.points = new THREE.Points(geometry, material);
    this._speeds = speeds;
  }

  update(dt) {
    const pos = this.points.geometry.attributes.position.array;
    const count = this.count;
    const b = this.bounds;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const speed = this._speeds[i];

      // Gentle drift
      pos[i3] += Math.sin(Date.now() * 0.0003 + i) * speed * 0.3;
      pos[i3 + 1] += Math.cos(Date.now() * 0.0005 + i * 0.7) * speed * 0.2;
      pos[i3 + 2] += Math.sin(Date.now() * 0.0004 + i * 1.3) * speed * 0.3;

      // Wrap around bounds
      if (pos[i3] < b.x[0]) pos[i3] = b.x[1];
      if (pos[i3] > b.x[1]) pos[i3] = b.x[0];
      if (pos[i3 + 1] < b.y[0]) pos[i3 + 1] = b.y[1];
      if (pos[i3 + 1] > b.y[1]) pos[i3 + 1] = b.y[0];
      if (pos[i3 + 2] < b.z[0]) pos[i3 + 2] = b.z[1];
      if (pos[i3 + 2] > b.z[1]) pos[i3 + 2] = b.z[0];
    }

    this.points.geometry.attributes.position.needsUpdate = true;
  }

  addTo(scene) {
    scene.add(this.points);
  }
}

/**
 * GlowRing — A subtle glowing halo around elite inscribed plinths.
 */
export class GlowRing {
  constructor(position, options = {}) {
    const {
      color = '#d4af37',
      radius = 0.8,
      tubeRadius = 0.02,
      opacity = 0.4,
    } = options;

    const geometry = new THREE.TorusGeometry(radius, tubeRadius, 8, 48);
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(position);
    this.mesh.rotation.x = -Math.PI / 2;
    this._baseOpacity = opacity;
  }

  update(dt) {
    this.mesh.rotation.z += dt * 0.3;
    this.mesh.material.opacity =
      this._baseOpacity + Math.sin(Date.now() * 0.003) * 0.15;
  }

  addTo(scene) {
    scene.add(this.mesh);
  }
}
