import { clonePolygon } from './models.js';
import {
  pointInPolygon,
  cloneVertices,
  translateVertices,
  clampTranslation,
  polygonOverlapsAny,
  isInsideCanvas,
} from './geometry.js';

export class Scene {
  constructor() {
    this.polygons = [];
    this.selectedId = null;
  }

  getPolygon(id) {
    return this.polygons.find((p) => p.id === id) ?? null;
  }

  getSelected() {
    return this.selectedId ? this.getPolygon(this.selectedId) : null;
  }

  select(id) {
    this.selectedId = id;
  }

  clearSelection() {
    this.selectedId = null;
  }

  /** Top-most polygon at point (last drawn = on top). */
  selectAt(x, y) {
    for (let i = this.polygons.length - 1; i >= 0; i--) {
      const polygon = this.polygons[i];
      if (pointInPolygon({ x, y }, polygon.vertices)) {
        this.selectedId = polygon.id;
        return polygon;
      }
    }
    this.selectedId = null;
    return null;
  }

  add(polygon, select = true) {
    this.polygons.push(polygon);
    if (select) this.selectedId = polygon.id;
  }

  remove(id) {
    const index = this.polygons.findIndex((p) => p.id === id);
    if (index === -1) return null;

    const [removed] = this.polygons.splice(index, 1);
    if (this.selectedId === id) this.selectedId = null;
    return removed;
  }

  removeAll() {
    const snapshot = this.polygons.map(clonePolygon);
    const selectedId = this.selectedId;
    this.polygons = [];
    this.selectedId = null;
    return { polygons: snapshot, selectedId };
  }

  restoreAll(polygons, selectedId = null) {
    this.polygons = polygons.map(clonePolygon);
    this.selectedId = selectedId;
  }

  setVertices(id, vertices) {
    const polygon = this.getPolygon(id);
    if (!polygon) return false;
    polygon.vertices = cloneVertices(vertices);
    return true;
  }

  setColors(id, fill, stroke) {
    const polygon = this.getPolygon(id);
    if (!polygon) return false;
    polygon.fill = fill;
    polygon.stroke = stroke;
    return true;
  }

  /**
   * Try to move polygon by normalized delta (0–1 space). Returns true if applied.
   */
  tryMove(id, dx, dy) {
    const polygon = this.getPolygon(id);
    if (!polygon) return false;

    const canvasWidth = 1;
    const canvasHeight = 1;

    const { dx: cdx, dy: cdy } = clampTranslation(
      polygon.vertices,
      dx,
      dy,
      canvasWidth,
      canvasHeight,
    );

    if (cdx === 0 && cdy === 0 && (dx !== 0 || dy !== 0)) {
      return false;
    }

    const newVertices = translateVertices(polygon.vertices, cdx, cdy);

    if (!isInsideCanvas(newVertices, canvasWidth, canvasHeight)) {
      return false;
    }

    if (polygonOverlapsAny(newVertices, this.polygons, id)) {
      return false;
    }

    polygon.vertices = newVertices;
    return true;
  }

  get count() {
    return this.polygons.length;
  }
}
