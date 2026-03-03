/**
 * navigation.js — Camera controls: free-fly mode and guided tour.
 * Uses PointerLockControls for FPS-style movement, with a smooth
 * guided-tour mode that transitions between wings.
 */
import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

export class Navigation {
  /**
   * @param {THREE.PerspectiveCamera} camera
   * @param {HTMLElement} domElement
   * @param {Array} wingPositions — [{ id, name, position, target }]
   */
  constructor(camera, domElement, wingPositions = []) {
    this.camera = camera;
    this.domElement = domElement;
    this.wingPositions = wingPositions;
    this.currentWing = 0;
    this.mode = 'tour'; // 'tour' | 'fly'

    // Movement state
    this._moveForward = false;
    this._moveBackward = false;
    this._moveLeft = false;
    this._moveRight = false;
    this._moveUp = false;
    this._moveDown = false;
    this._velocity = new THREE.Vector3();
    this._direction = new THREE.Vector3();
    this._speed = 24;

    // Tour animation
    this._tourActive = false;
    this._tourProgress = 0;
    this._tourFrom = new THREE.Vector3();
    this._tourTo = new THREE.Vector3();
    this._tourLookFrom = new THREE.Vector3();
    this._tourLookTo = new THREE.Vector3();
    this._tourDuration = 2.5; // seconds
    this._tourCallback = null;

    // Name reveal sequencing
    this._revealQueue = [];
    this._revealActive = false;

    // PointerLock controls for free-fly
    this.controls = new PointerLockControls(camera, domElement);

    this._initKeyboard();
    this._initPointerLock();

    // Start at entrance
    camera.position.set(0, 3, 8);
    camera.lookAt(0, 3, -5);
  }

  _initKeyboard() {
    const onKey = (e, pressed) => {
      switch (e.code) {
        case 'KeyW': case 'ArrowUp':    this._moveForward  = pressed; break;
        case 'KeyS': case 'ArrowDown':  this._moveBackward = pressed; break;
        case 'KeyA': case 'ArrowLeft':  this._moveLeft     = pressed; break;
        case 'KeyD': case 'ArrowRight': this._moveRight    = pressed; break;
        case 'Space':                   this._moveUp       = pressed; break;
        case 'ShiftLeft':               this._moveDown     = pressed; break;
      }
    };
    document.addEventListener('keydown', (e) => onKey(e, true));
    document.addEventListener('keyup',   (e) => onKey(e, false));
  }

  _initPointerLock() {
    this.domElement.addEventListener('click', () => {
      if (this.mode === 'fly' && !this.controls.isLocked) {
        this.controls.lock();
      }
    });
  }

  /** Switch to free-fly mode */
  enableFly() {
    this.mode = 'fly';
    this._tourActive = false;
  }

  /** Switch to guided tour mode */
  enableTour() {
    this.mode = 'tour';
    if (this.controls.isLocked) this.controls.unlock();
  }

  /** Navigate to a specific wing by index */
  goToWing(index) {
    if (index < 0 || index >= this.wingPositions.length) return;
    this.currentWing = index;
    const wp = this.wingPositions[index];
    this._startTransition(
      this.camera.position.clone(),
      wp.position.clone(),
      this._getLookTarget(),
      wp.target.clone(),
    );
  }

  /** Go to next wing */
  nextWing() {
    if (this.currentWing < this.wingPositions.length - 1) {
      this.goToWing(this.currentWing + 1);
    }
  }

  /** Go to previous wing */
  prevWing() {
    if (this.currentWing > 0) {
      this.goToWing(this.currentWing - 1);
    }
  }

  /** Start a sequential guided tour through all wings */
  startGuidedTour(onWingReached) {
    this.enableTour();
    this.currentWing = -1;
    this._tourCallback = onWingReached;
    this._advanceTour();
  }

  _advanceTour() {
    this.currentWing++;
    if (this.currentWing >= this.wingPositions.length) {
      this._tourActive = false;
      this._tourCallback = null;
      return;
    }
    const wp = this.wingPositions[this.currentWing];
    this._startTransition(
      this.camera.position.clone(),
      wp.position.clone(),
      this._getLookTarget(),
      wp.target.clone(),
      () => {
        if (this._tourCallback) this._tourCallback(this.currentWing, wp);
        // Pause, then advance
        setTimeout(() => this._advanceTour(), 3000);
      }
    );
  }

  _startTransition(fromPos, toPos, fromLook, toLook, onComplete) {
    this._tourActive = true;
    this._tourProgress = 0;
    this._tourFrom.copy(fromPos);
    this._tourTo.copy(toPos);
    this._tourLookFrom.copy(fromLook);
    this._tourLookTo.copy(toLook);
    this._onTransitionComplete = onComplete || null;
  }

  _getLookTarget() {
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    return this.camera.position.clone().add(dir.multiplyScalar(5));
  }

  /** Get current wing info */
  getCurrentWing() {
    if (this.currentWing >= 0 && this.currentWing < this.wingPositions.length) {
      return this.wingPositions[this.currentWing];
    }
    return null;
  }

  /** Update per frame */
  update(dt) {
    if (this._tourActive) {
      this._updateTour(dt);
    } else if (this.mode === 'fly' && this.controls.isLocked) {
      this._updateFly(dt);
    }
  }

  _updateTour(dt) {
    this._tourProgress += dt / this._tourDuration;

    if (this._tourProgress >= 1.0) {
      this._tourProgress = 1.0;
      this._tourActive = false;

      this.camera.position.copy(this._tourTo);
      this.camera.lookAt(this._tourLookTo);

      if (this._onTransitionComplete) {
        this._onTransitionComplete();
        this._onTransitionComplete = null;
      }
      return;
    }

    // Smooth easing (ease-in-out cubic)
    const t = this._tourProgress;
    const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    // Interpolate position
    this.camera.position.lerpVectors(this._tourFrom, this._tourTo, ease);

    // Interpolate look target
    const lookTarget = new THREE.Vector3();
    lookTarget.lerpVectors(this._tourLookFrom, this._tourLookTo, ease);
    this.camera.lookAt(lookTarget);
  }

  _updateFly(dt) {
    const speed = this._speed;

    // Deceleration
    this._velocity.x -= this._velocity.x * 8.0 * dt;
    this._velocity.y -= this._velocity.y * 8.0 * dt;
    this._velocity.z -= this._velocity.z * 8.0 * dt;

    this._direction.z = Number(this._moveForward) - Number(this._moveBackward);
    this._direction.x = Number(this._moveRight) - Number(this._moveLeft);
    this._direction.y = Number(this._moveUp) - Number(this._moveDown);
    this._direction.normalize();

    if (this._moveForward || this._moveBackward) {
      this._velocity.z -= this._direction.z * speed * dt;
    }
    if (this._moveLeft || this._moveRight) {
      this._velocity.x -= this._direction.x * speed * dt;
    }
    if (this._moveUp || this._moveDown) {
      this._velocity.y += this._direction.y * speed * dt;
    }

    this.controls.moveRight(-this._velocity.x * dt);
    this.controls.moveForward(-this._velocity.z * dt);
    this.camera.position.y += this._velocity.y * dt;

    // Clamp height
    if (this.camera.position.y < 1.0) this.camera.position.y = 1.0;
    if (this.camera.position.y > 7.0) this.camera.position.y = 7.0;
  }
}
