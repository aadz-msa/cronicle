/**
 * ui.js — HUD overlay, info panels, tooltips, and raycasting interaction.
 */
import * as THREE from 'three';

export class UI {
  /**
   * @param {THREE.PerspectiveCamera} camera
   * @param {HTMLCanvasElement} canvas
   * @param {Array} interactables — meshes with userData
   */
  constructor(camera, canvas, interactables) {
    this.camera = camera;
    this.canvas = canvas;
    this.interactables = interactables;

    // DOM references
    this.infoPanel   = document.getElementById('info-panel');
    this.infoName    = document.getElementById('info-name');
    this.infoRole    = document.getElementById('info-title-role');
    this.infoStory   = document.getElementById('info-story');
    this.infoClose   = document.getElementById('info-close');
    this.tooltip     = document.getElementById('tooltip');
    this.wingLabel   = document.getElementById('wing-label');
    this.btnPrev     = document.getElementById('btn-prev');
    this.btnNext     = document.getElementById('btn-next');
    this.btnTour     = document.getElementById('btn-tour');
    this.btnFly      = document.getElementById('btn-fly');
    this.loadScreen  = document.getElementById('loading-screen');
    this.loaderFill  = document.querySelector('.loader-fill');
    this.loaderStatus = document.querySelector('.loader-status');

    // Raycaster
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this._hoveredObject = null;
    this._selectedObject = null;

    this._initEvents();
  }

  _initEvents() {
    // Mouse move → tooltip
    this.canvas.addEventListener('mousemove', (e) => {
      this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
      this._mouseX = e.clientX;
      this._mouseY = e.clientY;
    });

    // Click → info panel
    this.canvas.addEventListener('click', (e) => {
      // Don't handle if pointer is locked (fly mode)
      if (document.pointerLockElement) return;
      this._handleClick();
    });

    // Close info panel
    this.infoClose.addEventListener('click', () => {
      this.hideInfoPanel();
    });

    // Escape closes info panel
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.hideInfoPanel();
    });
  }

  /** Update raycasting each frame */
  updateRaycast() {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const hits = this.raycaster.intersectObjects(this.interactables, false);

    if (hits.length > 0) {
      const obj = hits[0].object;
      if (obj !== this._hoveredObject) {
        this._hoveredObject = obj;
        this._showTooltip(obj.userData.name);
      }
      // Move tooltip to mouse position
      if (this.tooltip) {
        this.tooltip.style.left = `${this._mouseX + 15}px`;
        this.tooltip.style.top  = `${this._mouseY - 10}px`;
      }
    } else {
      if (this._hoveredObject) {
        this._hoveredObject = null;
        this._hideTooltip();
      }
    }
  }

  _handleClick() {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const hits = this.raycaster.intersectObjects(this.interactables, false);

    if (hits.length > 0) {
      const data = hits[0].object.userData;
      this.showInfoPanel(data);
    }
  }

  showInfoPanel(data) {
    this.infoName.textContent = data.name || '';
    this.infoRole.textContent = data.role || data.contribution || '';
    this.infoStory.textContent = data.story || '';
    this.infoPanel.classList.remove('hidden');
    this._selectedObject = data;
  }

  hideInfoPanel() {
    this.infoPanel.classList.add('hidden');
    this._selectedObject = null;
  }

  _showTooltip(text) {
    this.tooltip.textContent = text;
    this.tooltip.classList.remove('hidden');
  }

  _hideTooltip() {
    this.tooltip.classList.add('hidden');
  }

  /** Update wing label in HUD */
  setWingLabel(text) {
    if (this.wingLabel) this.wingLabel.textContent = text;
  }

  /** Loading screen progress (0–100) */
  setLoadProgress(pct, statusText) {
    if (this.loaderFill) this.loaderFill.style.width = `${pct}%`;
    if (statusText && this.loaderStatus) this.loaderStatus.textContent = statusText;
  }

  /** Hide loading screen */
  hideLoadScreen() {
    if (this.loadScreen) {
      this.loadScreen.classList.add('fade-out');
      setTimeout(() => {
        this.loadScreen.style.display = 'none';
      }, 1200);
    }
  }

  /** Wire up navigation buttons */
  bindNavigation(nav) {
    this.btnPrev.addEventListener('click', () => {
      nav.prevWing();
      const w = nav.getCurrentWing();
      if (w) this.setWingLabel(w.name);
    });
    this.btnNext.addEventListener('click', () => {
      nav.nextWing();
      const w = nav.getCurrentWing();
      if (w) this.setWingLabel(w.name);
    });
    this.btnTour.addEventListener('click', () => {
      nav.startGuidedTour((idx, wp) => {
        this.setWingLabel(wp.name);
      });
      this.btnTour.classList.add('active');
      this.btnFly.classList.remove('active');
    });
    this.btnFly.addEventListener('click', () => {
      nav.enableFly();
      this.btnFly.classList.add('active');
      this.btnTour.classList.remove('active');
    });
  }
}
