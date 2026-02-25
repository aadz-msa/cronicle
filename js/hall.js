/**
 * hall.js — Builds the 3D hall geometry for each Period wing.
 * Creates corridors, walls, plinths, name plates, and torches.
 */
import * as THREE from 'three';
import {
  createStoneFloorTexture,
  createStoneWallTexture,
  createMetalTexture,
  createCeilingTexture,
  createTextTexture,
} from './textures.js';
import { TorchFlame, GlowRing } from './particles.js';

// ── Constants ───────────────────────────────────
const WING_LENGTH = 50;       // Z-depth of each period wing
const WING_WIDTH = 16;        // X-width of the corridor
const WALL_HEIGHT = 8;        // Height of walls
const WING_GAP = 10;          // Gap/archway between wings
const PLINTH_HEIGHT = 1.2;
const PLINTH_WIDTH = 0.8;
const PLINTH_DEPTH = 0.8;

/**
 * Build the full hall from legacy data. Returns { group, interactables, particles, wingPositions }.
 */
export function buildHall(data) {
  const group = new THREE.Group();
  const interactables = [];  // Objects that can be hovered/clicked
  const particles = [];       // Particle systems to update
  const wingPositions = [];   // Camera target positions per wing

  // Shared textures (generated once)
  const floorTex = createStoneFloorTexture();
  const wallTex = createStoneWallTexture();
  const ceilingTex = createCeilingTexture();

  // ── Entrance Hall ────────────────────────────
  const entranceGroup = buildEntrance(data, floorTex, wallTex, ceilingTex);
  group.add(entranceGroup);

  // ── Period Wings ─────────────────────────────
  data.periods.forEach((period, index) => {
    const zOffset = -(index * (WING_LENGTH + WING_GAP) + 20); // Start after entrance
    const wingGroup = buildWing(period, index, {
      floorTex, wallTex, ceilingTex,
      interactables, particles, zOffset,
    });
    group.add(wingGroup);

    wingPositions.push({
      id: period.id,
      name: `${period.name} — ${period.title}`,
      position: new THREE.Vector3(0, 3, zOffset + WING_LENGTH * 0.4),
      target: new THREE.Vector3(0, 2.5, zOffset - WING_LENGTH * 0.2),
    });
  });

  return { group, interactables, particles, wingPositions };
}

/** Build the grand entrance area */
function buildEntrance(data, floorTex, wallTex, ceilingTex) {
  const g = new THREE.Group();
  g.name = 'entrance';

  // Floor
  const floor = createFloor(WING_WIDTH + 4, 24, floorTex);
  floor.position.set(0, 0, -2);
  g.add(floor);

  // Ceiling
  const ceiling = createCeiling(WING_WIDTH + 4, 24, ceilingTex);
  ceiling.position.set(0, WALL_HEIGHT, -2);
  g.add(ceiling);

  // Walls
  const wallL = createWall(24, WALL_HEIGHT, wallTex);
  wallL.position.set(-WING_WIDTH / 2 - 2, WALL_HEIGHT / 2, -2);
  wallL.rotation.y = Math.PI / 2;
  g.add(wallL);

  const wallR = createWall(24, WALL_HEIGHT, wallTex);
  wallR.position.set(WING_WIDTH / 2 + 2, WALL_HEIGHT / 2, -2);
  wallR.rotation.y = -Math.PI / 2;
  g.add(wallR);

  // Back wall (behind the viewer start)
  const wallBack = createWall(WING_WIDTH + 4, WALL_HEIGHT, wallTex);
  wallBack.position.set(0, WALL_HEIGHT / 2, 10);
  g.add(wallBack);

  // Title plaque on back wall
  const titleTex = createTextTexture(data.hallTitle || 'Hall of Legacy', {
    fontSize: 40,
    color: '#d4af37',
    glow: true,
    width: 1024,
    height: 128,
    subText: data.subtitle || '',
    subFontSize: 22,
  });
  const titlePlane = new THREE.Mesh(
    new THREE.PlaneGeometry(8, 1),
    new THREE.MeshBasicMaterial({ map: titleTex, transparent: true, side: THREE.DoubleSide })
  );
  titlePlane.position.set(0, WALL_HEIGHT - 2, 9.9);
  g.add(titlePlane);

  return g;
}

/** Build a single Period wing */
function buildWing(period, index, ctx) {
  const { floorTex, wallTex, ceilingTex, interactables, particles, zOffset } = ctx;
  const g = new THREE.Group();
  g.name = `wing-${period.id}`;

  const accentColor = period.theme?.accentColor || '#d4af37';
  const torchColor = period.theme?.torchColor || '#ff9944';
  const metalTex = createMetalTexture(accentColor);

  // ── Floor & Ceiling ─────────────────────────
  const floor = createFloor(WING_WIDTH, WING_LENGTH, floorTex);
  floor.position.set(0, 0, zOffset - WING_LENGTH / 2);
  g.add(floor);

  const ceiling = createCeiling(WING_WIDTH, WING_LENGTH, ceilingTex);
  ceiling.position.set(0, WALL_HEIGHT, zOffset - WING_LENGTH / 2);
  g.add(ceiling);

  // Carpet runner (center of corridor)
  const carpet = new THREE.Mesh(
    new THREE.PlaneGeometry(2.5, WING_LENGTH),
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(accentColor).multiplyScalar(0.2),
      roughness: 0.9,
    })
  );
  carpet.rotation.x = -Math.PI / 2;
  carpet.position.set(0, 0.01, zOffset - WING_LENGTH / 2);
  g.add(carpet);

  // ── Walls ───────────────────────────────────
  const wallL = createWall(WING_LENGTH, WALL_HEIGHT, wallTex);
  wallL.position.set(-WING_WIDTH / 2, WALL_HEIGHT / 2, zOffset - WING_LENGTH / 2);
  wallL.rotation.y = Math.PI / 2;
  g.add(wallL);

  const wallR = createWall(WING_LENGTH, WALL_HEIGHT, wallTex);
  wallR.position.set(WING_WIDTH / 2, WALL_HEIGHT / 2, zOffset - WING_LENGTH / 2);
  wallR.rotation.y = -Math.PI / 2;
  g.add(wallR);

  // ── Archway header (period title) ───────────
  const archTex = createTextTexture(`${period.name} — ${period.title}`, {
    fontSize: 52,
    color: accentColor,
    glow: true,
    width: 1024,
    height: 128,
    subText: period.years || '',
    subFontSize: 28,
  });
  const archPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(6, 0.8),
    new THREE.MeshBasicMaterial({ map: archTex, transparent: true, side: THREE.DoubleSide })
  );
  archPlane.position.set(0, WALL_HEIGHT - 1.5, zOffset + 0.1);
  g.add(archPlane);

  // ── Period description plaque ───────────────
  const descTex = createTextTexture(period.description || '', {
    fontSize: 26,
    color: '#bbbbcc',
    width: 1024,
    height: 64,
  });
  const descPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(6, 0.4),
    new THREE.MeshBasicMaterial({ map: descTex, transparent: true, side: THREE.DoubleSide })
  );
  descPlane.position.set(0, WALL_HEIGHT - 2.5, zOffset + 0.1);
  g.add(descPlane);

  // ── Torches ─────────────────────────────────
  const torchSpacing = 8;
  const numTorches = Math.floor(WING_LENGTH / torchSpacing);
  for (let t = 0; t < numTorches; t++) {
    const tz = zOffset - 4 - t * torchSpacing;
    [-1, 1].forEach((side) => {
      const tx = side * (WING_WIDTH / 2 - 0.3);
      // Torch bracket
      const bracket = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.08, 0.5, 6),
        new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.8, roughness: 0.3 })
      );
      bracket.position.set(tx, 3.5, tz);
      g.add(bracket);

      // Point light (torch glow)
      const light = new THREE.PointLight(
        new THREE.Color(torchColor),
        2.5,
        18,
        1.2
      );
      light.position.set(tx, 4.0, tz);
      g.add(light);

      // Flame particles
      const flame = new TorchFlame(new THREE.Vector3(tx, 3.8, tz), {
        color: torchColor,
        count: 25,
      });
      flame.addTo(g);
      particles.push(flame);
    });
  }

  // ── Spotlight overhead ──────────────────────
  const spotLight = new THREE.SpotLight(
    new THREE.Color(accentColor),
    1.5, 40, Math.PI / 5, 0.4, 1
  );
  spotLight.position.set(0, WALL_HEIGHT - 0.5, zOffset - WING_LENGTH / 2);
  spotLight.target.position.set(0, 0, zOffset - WING_LENGTH / 2);
  g.add(spotLight);
  g.add(spotLight.target);

  // ── Section labels and content ──────────────
  let zCursor = zOffset - 4; // Start position for content

  // --- Council of Architects ---
  zCursor = placeSection(g, period.council, 'council', zCursor, {
    metalTex, accentColor, interactables, particles,
    side: 'left',
  });

  zCursor -= 4; // Gap

  // --- Captains of Clans ---
  zCursor = placeSection(g, period.captains, 'captains', zCursor, {
    metalTex, accentColor, interactables, particles,
    side: 'right',
  });

  zCursor -= 4; // Gap

  // --- The Inscribed (elite, center) ---
  zCursor = placeInscribed(g, period.inscribed, zCursor, {
    metalTex, accentColor, interactables, particles,
  });

  return g;
}

/**
 * Place a section (Council or Captains) along one side of the wing.
 */
function placeSection(group, sectionData, type, startZ, ctx) {
  const { metalTex, accentColor, interactables, side } = ctx;
  if (!sectionData || !sectionData.members) return startZ;

  const xBase = side === 'left' ? -WING_WIDTH / 2 + 2.5 : WING_WIDTH / 2 - 2.5;
  const faceDir = side === 'left' ? 0 : Math.PI;

  // Section header (on wall)
  const headerTex = createTextTexture(sectionData.title || type, {
    fontSize: 36,
    color: accentColor,
    glow: true,
    width: 512,
    height: 64,
  });
  const headerPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(3, 0.4),
    new THREE.MeshBasicMaterial({ map: headerTex, transparent: true })
  );
  const wallX = side === 'left' ? -WING_WIDTH / 2 + 0.05 : WING_WIDTH / 2 - 0.05;
  headerPlane.position.set(wallX, 5.5, startZ - 1);
  headerPlane.rotation.y = side === 'left' ? Math.PI / 2 : -Math.PI / 2;
  group.add(headerPlane);

  let z = startZ;

  sectionData.members.forEach((member, i) => {
    const mz = z - i * 3.5;

    // Wall plaque
    const subLine = type === 'council'
      ? (member.role || '')
      : `${member.clan || ''} ${member.emblem ? '· ' + member.emblem : ''}`;

    const nameTex = createTextTexture(member.name, {
      fontSize: 36,
      color: '#e0d8c8',
      width: 512,
      height: 128,
      subText: subLine,
      subColor: '#8888aa',
      subFontSize: 22,
    });

    const plaque = new THREE.Mesh(
      new THREE.PlaneGeometry(2.8, 0.9),
      new THREE.MeshBasicMaterial({ map: nameTex, transparent: true })
    );
    plaque.position.set(wallX + (side === 'left' ? 0.05 : -0.05), 3.5, mz);
    plaque.rotation.y = side === 'left' ? Math.PI / 2 : -Math.PI / 2;
    group.add(plaque);

    // Small pedestal beneath
    const pedestal = createPlinth(0.5, 0.3, 0.3, metalTex);
    pedestal.position.set(xBase, 0.15, mz);
    group.add(pedestal);

    // Interactive data
    const hitBox = new THREE.Mesh(
      new THREE.BoxGeometry(2.8, 1.2, 0.5),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    hitBox.position.set(wallX + (side === 'left' ? 0.3 : -0.3), 3.5, mz);
    hitBox.userData = {
      type,
      name: member.name,
      role: member.role || member.clan || '',
      story: member.motto || `${member.name} of ${member.clan || 'the Council'}.`,
    };
    group.add(hitBox);
    interactables.push(hitBox);
  });

  return z - sectionData.members.length * 3.5;
}

/**
 * Place the Inscribed elite members on central plinths with glow effects.
 */
function placeInscribed(group, inscribedData, startZ, ctx) {
  const { metalTex, accentColor, interactables, particles } = ctx;
  if (!inscribedData || !inscribedData.members) return startZ;

  // Section header (overhead)
  const headerTex = createTextTexture(inscribedData.title || 'The Inscribed', {
    fontSize: 44,
    color: accentColor,
    glow: true,
    width: 512,
    height: 64,
  });
  const headerPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(3.5, 0.5),
    new THREE.MeshBasicMaterial({ map: headerTex, transparent: true, side: THREE.DoubleSide })
  );
  headerPlane.position.set(0, 6, startZ - 1);
  group.add(headerPlane);

  let z = startZ;

  inscribedData.members.forEach((member, i) => {
    const mz = z - i * 5;
    const xPos = (i % 2 === 0 ? -1 : 1) * 2; // Alternate sides slightly

    // Central plinth (larger)
    const plinth = createPlinth(PLINTH_WIDTH, PLINTH_HEIGHT, PLINTH_DEPTH, metalTex);
    plinth.position.set(xPos, PLINTH_HEIGHT / 2, mz);
    group.add(plinth);

    // Name plate on plinth top
    const nameTex = createTextTexture(member.name, {
      fontSize: 40,
      color: accentColor,
      glow: true,
      width: 512,
      height: 128,
      subText: `"${member.title}"`,
      subColor: '#aaaacc',
      subFontSize: 24,
    });
    const namePlane = new THREE.Mesh(
      new THREE.PlaneGeometry(2.2, 0.6),
      new THREE.MeshBasicMaterial({ map: nameTex, transparent: true, side: THREE.DoubleSide })
    );
    namePlane.position.set(xPos, PLINTH_HEIGHT + 0.5, mz);
    group.add(namePlane);

    // Contribution sub-plate
    const contribTex = createTextTexture(member.contribution || '', {
      fontSize: 22,
      color: '#8888aa',
      width: 512,
      height: 48,
    });
    const contribPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(2.2, 0.25),
      new THREE.MeshBasicMaterial({ map: contribTex, transparent: true, side: THREE.DoubleSide })
    );
    contribPlane.position.set(xPos, PLINTH_HEIGHT + 0.05, mz);
    group.add(contribPlane);

    // Glow ring
    const glow = new GlowRing(
      new THREE.Vector3(xPos, 0.05, mz),
      { color: accentColor, radius: 1.0, opacity: 0.3 }
    );
    glow.addTo(group);
    particles.push(glow);

    // Spot light on inscribed plinth
    const spot = new THREE.SpotLight(
      new THREE.Color(accentColor), 2.0, 15, Math.PI / 6, 0.4, 1
    );
    spot.position.set(xPos, WALL_HEIGHT - 0.5, mz);
    spot.target.position.set(xPos, 0, mz);
    group.add(spot);
    group.add(spot.target);

    // Interactive hit box
    const hitBox = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, PLINTH_HEIGHT + 1.5, 1.5),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    hitBox.position.set(xPos, (PLINTH_HEIGHT + 1.5) / 2, mz);
    hitBox.userData = {
      type: 'inscribed',
      name: member.name,
      role: member.title || '',
      story: member.story || '',
      contribution: member.contribution || '',
    };
    group.add(hitBox);
    interactables.push(hitBox);
  });

  return z - inscribedData.members.length * 5;
}

// ── Geometry Helpers ────────────────────────────

function createFloor(w, d, texture) {
  const geo = new THREE.PlaneGeometry(w, d);
  const mat = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.85,
    metalness: 0.1,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.receiveShadow = true;
  return mesh;
}

function createCeiling(w, d, texture) {
  const geo = new THREE.PlaneGeometry(w, d);
  const mat = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.9,
    metalness: 0.05,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = Math.PI / 2;
  return mesh;
}

function createWall(length, height, texture) {
  const geo = new THREE.PlaneGeometry(length, height);
  const mat = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.9,
    metalness: 0.05,
  });
  const mesh = new THREE.Mesh(geo, mat);
  return mesh;
}

function createPlinth(w, h, d, texture) {
  // A composite plinth: base + column + cap
  const g = new THREE.Group();

  // Base
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(w * 1.3, h * 0.15, d * 1.3),
    new THREE.MeshStandardMaterial({ map: texture, roughness: 0.6, metalness: 0.4 })
  );
  base.position.y = -h * 0.425;
  g.add(base);

  // Column
  const col = new THREE.Mesh(
    new THREE.BoxGeometry(w, h * 0.7, d),
    new THREE.MeshStandardMaterial({ map: texture, roughness: 0.7, metalness: 0.3 })
  );
  g.add(col);

  // Cap
  const cap = new THREE.Mesh(
    new THREE.BoxGeometry(w * 1.2, h * 0.12, d * 1.2),
    new THREE.MeshStandardMaterial({ map: texture, roughness: 0.5, metalness: 0.5 })
  );
  cap.position.y = h * 0.41;
  g.add(cap);

  return g;
}

export { WING_LENGTH, WING_GAP, WING_WIDTH, WALL_HEIGHT };
