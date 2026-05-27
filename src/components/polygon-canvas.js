import { drawScene, updateAnimations } from '../core/renderer.js';
import {
  cloneVertices,
  verticesEqual,
  isLegacyPixelCoordinates,
  normalizePolygonList,
} from '../core/geometry.js';

export class PolygonCanvas extends HTMLElement {
  constructor() {
    super();
    this._scene = null;
    this._rafId = null;
    this._drag = null;
    this._resizeObserver = null;
    this._canvasWidth = 0;
    this._canvasHeight = 0;
    this._dpr = 1;
  }

  connectedCallback() {
    this.innerHTML = '<canvas></canvas>';
    this._canvas = this.querySelector('canvas');
    this._ctx = this._canvas.getContext('2d');

    this._onPointerDown = this._handlePointerDown.bind(this);
    this._onPointerMove = this._handlePointerMove.bind(this);
    this._onPointerUp = this._handlePointerUp.bind(this);
    this._onPointerCancel = this._handlePointerUp.bind(this);

    this._canvas.addEventListener('pointerdown', this._onPointerDown);
    this._canvas.addEventListener('pointermove', this._onPointerMove);
    this._canvas.addEventListener('pointerup', this._onPointerUp);
    this._canvas.addEventListener('pointercancel', this._onPointerCancel);

    this._resizeObserver = new ResizeObserver(() => this._resize());
    this._resizeObserver.observe(this);
    this._resize();
    this._startLoop();
  }

  disconnectedCallback() {
    this._resizeObserver?.disconnect();
    this._canvas?.removeEventListener('pointerdown', this._onPointerDown);
    this._canvas?.removeEventListener('pointermove', this._onPointerMove);
    this._canvas?.removeEventListener('pointerup', this._onPointerUp);
    this._canvas?.removeEventListener('pointercancel', this._onPointerCancel);
    if (this._rafId) cancelAnimationFrame(this._rafId);
  }

  setScene(scene) {
    this._scene = scene;
    this._updateAttributes();
    this.requestRedraw();
  }

  getCanvasSize() {
    return { width: this._canvasWidth, height: this._canvasHeight };
  }

  requestRedraw() {
    if (!this._rafId) {
      this._rafId = requestAnimationFrame(() => this._drawFrame());
    }
  }

  _resize() {
    const rect = this.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    this._dpr = window.devicePixelRatio || 1;
    this._canvasWidth = Math.floor(rect.width);
    this._canvasHeight = Math.floor(rect.height);

    this._canvas.width = Math.floor(rect.width * this._dpr);
    this._canvas.height = Math.floor(rect.height * this._dpr);
    this._ctx.setTransform(this._dpr, 0, 0, this._dpr, 0, 0);

    this._migrateLegacyCoordinates();
    this.requestRedraw();
    this.dispatchEvent(new CustomEvent('canvas-resize', { bubbles: true }));
  }

  /** One-time conversion of old pixel-based scenes after resize. */
  _migrateLegacyCoordinates() {
    if (!this._scene?.polygons.length || this._canvasWidth <= 0) return;
    if (!isLegacyPixelCoordinates(this._scene.polygons)) return;

    const normalized = normalizePolygonList(
      this._scene.polygons,
      this._canvasWidth,
      this._canvasHeight,
    );
    for (let i = 0; i < this._scene.polygons.length; i++) {
      this._scene.polygons[i].vertices = normalized[i].vertices;
    }
  }

  _startLoop() {
    const loop = (now) => {
      if (this._scene && this._canvasWidth > 0) {
        updateAnimations(this._scene.polygons, now);
        this._drawFrame(now);
      }
      this._loopId = requestAnimationFrame(loop);
    };
    this._loopId = requestAnimationFrame(loop);
  }

  _drawFrame(now = performance.now()) {
    this._rafId = null;
    if (!this._scene || this._canvasWidth === 0) return;

    drawScene(
      this._ctx,
      this._scene.polygons,
      this._scene.selectedId,
      this._canvasWidth,
      this._canvasHeight,
    );
  }

  _updateAttributes() {
    if (!this._scene) return;
    this.dataset.dragging = this._drag ? 'true' : 'false';
    this.dataset.hasSelection = this._scene.selectedId ? 'true' : 'false';
  }

  _getCanvasPoint(event) {
    const rect = this._canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  _handlePointerDown(event) {
    if (!this._scene) return;
    event.preventDefault();

    const point = this._getCanvasPoint(event);
    if (this._canvasWidth <= 0 || this._canvasHeight <= 0) return;

    const hit = this._scene.selectAt(
      point.x / this._canvasWidth,
      point.y / this._canvasHeight,
    );

    this._emitSelectionChanged();

    if (hit) {
      this._canvas.setPointerCapture(event.pointerId);
      this._drag = {
        id: hit.id,
        startX: point.x,
        startY: point.y,
        lastX: point.x,
        lastY: point.y,
        startVertices: cloneVertices(hit.vertices),
      };
      this._updateAttributes();
    } else {
      this._drag = null;
      this._updateAttributes();
    }

    this.requestRedraw();
  }

  _handlePointerMove(event) {
    if (!this._scene || !this._drag) return;

    const point = this._getCanvasPoint(event);
    const dx = point.x - this._drag.lastX;
    const dy = point.y - this._drag.lastY;

    if (dx !== 0 || dy !== 0) {
      this._scene.tryMove(
        this._drag.id,
        dx / this._canvasWidth,
        dy / this._canvasHeight,
      );
      this._drag.lastX = point.x;
      this._drag.lastY = point.y;
      this.requestRedraw();
    }
  }

  _handlePointerUp(event) {
    if (!this._scene) return;

    if (this._drag) {
      try {
        this._canvas.releasePointerCapture(event.pointerId);
      } catch {
        /* already released */
      }

      const polygon = this._scene.getPolygon(this._drag.id);
      if (
        polygon &&
        !verticesEqual(this._drag.startVertices, polygon.vertices)
      ) {
        this.dispatchEvent(
          new CustomEvent('drag-complete', {
            bubbles: true,
            detail: {
              polygonId: this._drag.id,
              fromVertices: this._drag.startVertices,
              toVertices: cloneVertices(polygon.vertices),
            },
          }),
        );
      }
    }

    this._drag = null;
    this._updateAttributes();
    this.requestRedraw();
  }

  _emitSelectionChanged() {
    const selected = this._scene.getSelected();
    this.dispatchEvent(
      new CustomEvent('selection-changed', {
        bubbles: true,
        detail: { selected },
      }),
    );
  }
}

customElements.define('polygon-canvas', PolygonCanvas);
