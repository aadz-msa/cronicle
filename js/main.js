/**
 * main.js — Entry point & scene orchestrator for the Hall of Legacy.
 * Sets up Three.js renderer, camera, lighting, loads data, and runs the loop.
 */
import * as THREE from 'three';
import { buildHall } from './hall.js';
import { AmbientDust } from './particles.js';
import { Navigation } from './navigation.js';
import { UI } from './ui.js';

// ── Globals ─────────────────────────────────────
let renderer, scene, camera, clock;
let navigation, ui;
let hallData, hallResult;
let dustSystem;
let animationMixers = [];

// ── Init ────────────────────────────────────────
async function init() {
  // Canvas & renderer
  const canvas = document.getElementById('hall-canvas');
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.4;
  renderer.shadowMap.enabled = false; // Performance — enable if needed

  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05050a);
  scene.fog = new THREE.FogExp2(0x05050a, 0.006);

  // Camera
  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    500
  );

  // Clock
  clock = new THREE.Clock();

  // ── Base lighting ─────────────────────────────
  // Ambient fill (warm stone feel)
  const ambient = new THREE.AmbientLight(0x443344, 1.0);
  scene.add(ambient);

  // Hemisphere light (sky/ground)
  const hemi = new THREE.HemisphereLight(0x334455, 0x221122, 0.8);
  scene.add(hemi);

  // Directional fill light (simulates distant light down the hall)
  const dirLight = new THREE.DirectionalLight(0xffeedd, 0.6);
  dirLight.position.set(2, 8, 5);
  scene.add(dirLight);

  // ── Temporary UI reference for loading ────────
  const tempUI = {
    setLoadProgress: (pct, msg) => {
      const fill = document.querySelector('.loader-fill');
      const status = document.querySelector('.loader-status');
      if (fill) fill.style.width = `${pct}%`;
      if (status) status.textContent = msg;
    },
  };

  // ── Load Data ─────────────────────────────────
  tempUI.setLoadProgress(10, 'Loading legacy data...');
  try {
    const resp = await fetch('data/legacy.json');
    hallData = await resp.json();
  } catch (err) {
    console.error('Failed to load legacy.json:', err);
    hallData = { hallTitle: 'Hall of Legacy', subtitle: '', periods: [] };
  }

  // ── Build Hall ────────────────────────────────
  tempUI.setLoadProgress(30, 'Carving stone corridors...');
  hallResult = buildHall(hallData);
  scene.add(hallResult.group);

  tempUI.setLoadProgress(60, 'Igniting torches...');

  // ── Ambient Dust ──────────────────────────────
  const totalDepth = hallData.periods.length * 60 + 30;
  dustSystem = new AmbientDust({
    x: [-10, 10],
    y: [0.5, 7],
    z: [-totalDepth, 12],
  }, { count: 500, size: 0.03 });
  dustSystem.addTo(scene);

  tempUI.setLoadProgress(80, 'Inscribing names...');

  // ── Navigation ────────────────────────────────
  navigation = new Navigation(camera, canvas, hallResult.wingPositions);

  // ── UI ────────────────────────────────────────
  ui = new UI(camera, canvas, hallResult.interactables);
  ui.bindNavigation(navigation);

  // Set initial wing label
  if (hallResult.wingPositions.length > 0) {
    ui.setWingLabel(hallResult.wingPositions[0].name);
  }

  tempUI.setLoadProgress(100, 'The Hall awaits...');

  // ── Hide loading screen ───────────────────────
  setTimeout(() => {
    ui.hideLoadScreen();
  }, 800);

  // ── Window resize ─────────────────────────────
  window.addEventListener('resize', onResize);

  // ── Start loop ────────────────────────────────
  animate();
}

// ── Render Loop ─────────────────────────────────
function animate() {
  requestAnimationFrame(animate);

  const dt = clock.getDelta();
  const elapsed = clock.getElapsedTime();

  // Update navigation
  navigation.update(dt);

  // Update particles
  hallResult.particles.forEach((p) => p.update(dt));
  dustSystem.update(dt);

  // Update UI raycasting
  ui.updateRaycast();

  // Render
  renderer.render(scene, camera);
}

// ── Resize ──────────────────────────────────────
function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// ── Bootstrap ───────────────────────────────────
init().catch((err) => {
  console.error('Hall of Legacy init failed:', err);
});
