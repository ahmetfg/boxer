// ---------------------------------------------------------------------------

import { SceneManager } from "./SceneManager.js";

// Basit DOM helper
function el(tag, style = {}, attrs = {}) {
  const d = document.createElement(tag);
  Object.assign(d.style, style);
  for (const k in attrs) {
    if (k === 'text') d.textContent = attrs[k];
    else if (k.startsWith('on')) d[k] = attrs[k];
    else d.setAttribute(k, attrs[k]);
  }
  return d;
}

// ---------------------------------------------------------------------------
// Joystick — (React’te nasılsa aynısı, forceRotate mapping aynı)
const JOYSTICK_SIZE = 200, THUMB_SIZE = 100;
const MAX_DISTANCE = (JOYSTICK_SIZE - THUMB_SIZE) / 2;
export class Joystick {
  lastValues;

  constructor({ onChange, forceRotate = false } = {}) {
    this.onChange = onChange;
    this.forceRotate = !!forceRotate;
    this.activePointerId = null;
    this.isDragging = false;
    this.lastValues = { x: 0, y: 0 };
    this.pos = { x: 0, y: 0 };
    this.posRef = { x: 0, y: 0 };
    this.dragRAF = null; this.returnRAF = null;
    this.el = this._root();
    this.thumb = this._thumb();
    this.el.appendChild(this.thumb);

    this.el.addEventListener('pointerdown', e => {
      if (this._checkReset()) return;

      if (e.pointerType === 'touch') this.activePointerId = e.pointerId;
      if (this.returnRAF) cancelAnimationFrame(this.returnRAF);
      this.isDragging = true; this._startLoop(); e.preventDefault();
    }, { passive: false });

    window.addEventListener('pointermove', e => {
      if (this._checkReset()) return;
      if (!this.isDragging) return;

      if (e.pointerType === 'touch' && e.pointerId !== this.activePointerId) return;
      const r = this.el.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      let nx = e.clientX - cx, ny = e.clientY - cy;
      const d = Math.hypot(nx, ny);
      if (d > MAX_DISTANCE) { const a = Math.atan2(ny, nx); nx = Math.cos(a) * MAX_DISTANCE; ny = Math.sin(a) * MAX_DISTANCE; }
      this._set({ x: nx, y: ny });
    }, { passive: false });
    const end = e => {
      if (this._checkReset()) return;

      if (e.pointerType === 'touch' && e.pointerId !== this.activePointerId) return;
      this.activePointerId = null;
      if (this.isDragging) {
        this.isDragging = false;
        this._stopLoop();
        this._return();
      }
    };
    window.addEventListener('pointerup', end, { passive: true });
    window.addEventListener('pointercancel', end, { passive: true });
  }
  _checkReset() {
    if (SceneManager.pause) {
      this._set({ x: 0, y: 0 })
      return true
    }
    return false
  }

  _update({ x, y }) {
    this.lastValues = { x: x, y: y }
    // if (SceneManager.pause) return
    this.onChange?.({ x: x, y: y })
  }

  updateRotate(value){
    this.forceRotate = !!value;
  }

  _root() {
    const d = el('div', {
      width: 'calc(var(--vvh) * 0.2)', height: 'calc(var(--vvh) * 0.2)',
      borderRadius: '50%', backgroundColor: 'rgba(0,0,0,.3)',
      position: 'relative', touchAction: 'none', display: 'flex',
      justifyContent: 'center', alignItems: 'center'
    }); return d;
  }
  _thumb() {
    const d = el('div', {
      width: 'calc(var(--vvh) * 0.1)', height: 'calc(var(--vvh) * 0.1)',
      borderRadius: '50%', backgroundColor: 'rgba(255,255,255,1)',
      border:"1px solid rgba(199, 199, 199, 1)", 
      position: 'absolute', left: '50%', top: '50%',
      marginLeft: 'calc(-1 * var(--vvh) * 0.05)',
      marginTop: 'calc(-1 * var(--vvh) * 0.05)',
      touchAction: 'none', willChange: 'transform'
    }); return d;
  }
  _set(p) {
    this.posRef = p;
    this.pos = p;
    this._apply();
  }
  _apply() {
    const { x, y } = this.pos;
    const tx = this.forceRotate ? y : x;
    const ty = this.forceRotate ? -x : y;
    this.thumb.style.transform = `translate(${tx}px,${ty}px)`;
  }
  _startLoop() {
    const tick = () => {
      const { x, y } = this.posRef; const nx = x / MAX_DISTANCE, ny = y / MAX_DISTANCE;
      this._update({ x: nx, y: ny });
      this.dragRAF = requestAnimationFrame(tick);
    };
    this.dragRAF = requestAnimationFrame(tick);
  }
  _stopLoop() {
    if (this.dragRAF) cancelAnimationFrame(this.dragRAF);
    this.dragRAF = null;
  }
  _return() {
    const lerp = .15;
    const step = () => {
      const px = this.pos.x, py = this.pos.y;
      const nx = px + (0 - px) * lerp, ny = py + (0 - py) * lerp;
      const close = Math.hypot(nx, ny) < .5;
      this._set({ x: nx, y: ny });
      this._update({ x: nx / MAX_DISTANCE, y: ny / MAX_DISTANCE });
      if (close) {
        this._set({ x: 0, y: 0 });
        this._update({ x: 0, y: 0 });
        this.returnRAF = null; return;
      }
      this.returnRAF = requestAnimationFrame(step);
    };
    this.returnRAF = requestAnimationFrame(step);
  }
}
