/**
 * Geometry utilities for polygon editor.
 */

export function getBounds(vertices) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const { x, y } of vertices) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }

  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

export function getCentroid(vertices) {
  let cx = 0;
  let cy = 0;
  for (const { x, y } of vertices) {
    cx += x;
    cy += y;
  }
  const n = vertices.length;
  return { x: cx / n, y: cy / n };
}

export function translateVertices(vertices, dx, dy) {
  return vertices.map((v) => ({ x: v.x + dx, y: v.y + dy }));
}

export function cloneVertices(vertices) {
  return vertices.map((v) => ({ x: v.x, y: v.y }));
}

/** Convert normalized vertices (0–1) to pixel coordinates. */
export function toPixelVertices(vertices, width, height) {
  return vertices.map((v) => ({ x: v.x * width, y: v.y * height }));
}

/** Convert pixel vertices to normalized (0–1). */
export function toNormalizedVertices(vertices, width, height) {
  if (width <= 0 || height <= 0) return cloneVertices(vertices);
  return vertices.map((v) => ({ x: v.x / width, y: v.y / height }));
}

export function isLegacyPixelCoordinates(polygons) {
  for (const polygon of polygons) {
    for (const { x, y } of polygon.vertices) {
      if (x > 1.5 || y > 1.5) return true;
    }
  }
  return false;
}

export function normalizePolygonList(polygons, width, height) {
  if (!isLegacyPixelCoordinates(polygons)) return polygons;
  return polygons.map((p) => ({
    ...p,
    vertices: toNormalizedVertices(p.vertices, width, height),
  }));
}

/** Ray casting — works for non-convex polygons. */
export function pointInPolygon(point, vertices) {
  const { x, y } = point;
  let inside = false;
  const n = vertices.length;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = vertices[i].x;
    const yi = vertices[i].y;
    const xj = vertices[j].x;
    const yj = vertices[j].y;

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }

  return inside;
}

function orientation(a, b, c) {
  const val = (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y);
  if (Math.abs(val) < 1e-10) return 0;
  return val > 0 ? 1 : 2;
}

function onSegment(a, b, c) {
  return (
    Math.min(a.x, c.x) <= b.x &&
    b.x <= Math.max(a.x, c.x) &&
    Math.min(a.y, c.y) <= b.y &&
    b.y <= Math.max(a.y, c.y)
  );
}

function segmentsIntersect(p1, p2, p3, p4) {
  const o1 = orientation(p1, p2, p3);
  const o2 = orientation(p1, p2, p4);
  const o3 = orientation(p3, p4, p1);
  const o4 = orientation(p3, p4, p2);

  if (o1 !== o2 && o3 !== o4) return true;

  if (o1 === 0 && onSegment(p1, p3, p2)) return true;
  if (o2 === 0 && onSegment(p1, p4, p2)) return true;
  if (o3 === 0 && onSegment(p3, p1, p4)) return true;
  if (o4 === 0 && onSegment(p3, p2, p4)) return true;

  return false;
}

function edgesIntersect(verticesA, verticesB) {
  const na = verticesA.length;
  const nb = verticesB.length;

  for (let i = 0; i < na; i++) {
    const a1 = verticesA[i];
    const a2 = verticesA[(i + 1) % na];

    for (let j = 0; j < nb; j++) {
      const b1 = verticesB[j];
      const b2 = verticesB[(j + 1) % nb];

      if (segmentsIntersect(a1, a2, b1, b2)) return true;
    }
  }
  return false;
}

export function polygonsOverlap(verticesA, verticesB) {
  if (edgesIntersect(verticesA, verticesB)) return true;

  if (pointInPolygon(verticesA[0], verticesB)) return true;
  if (pointInPolygon(verticesB[0], verticesA)) return true;

  return false;
}

export function polygonOverlapsAny(vertices, others, excludeId = null) {
  for (const other of others) {
    if (excludeId && other.id === excludeId) continue;
    if (polygonsOverlap(vertices, other.vertices)) return true;
  }
  return false;
}

export function isInsideCanvas(vertices, width, height, padding = 0) {
  const { minX, minY, maxX, maxY } = getBounds(vertices);
  return (
    minX >= padding &&
    minY >= padding &&
    maxX <= width - padding &&
    maxY <= height - padding
  );
}

/** Clamp translation so bbox stays within canvas. */
export function clampTranslation(vertices, dx, dy, canvasWidth, canvasHeight) {
  const { minX, minY, maxX, maxY } = getBounds(vertices);

  let clampedDx = dx;
  let clampedDy = dy;

  if (minX + dx < 0) clampedDx = -minX;
  if (minY + dy < 0) clampedDy = -minY;
  if (maxX + dx > canvasWidth) clampedDx = canvasWidth - maxX;
  if (maxY + dy > canvasHeight) clampedDy = canvasHeight - maxY;

  return { dx: clampedDx, dy: clampedDy };
}

export function verticesEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (Math.abs(a[i].x - b[i].x) > 0.01 || Math.abs(a[i].y - b[i].y) > 0.01) {
      return false;
    }
  }
  return true;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomColor() {
  const h = randomInt(0, 359);
  const s = randomInt(55, 85);
  const l = randomInt(45, 65);
  return `hsl(${h}, ${s}%, ${l}%)`;
}

export function contrastStroke() {
  return 'rgba(255, 255, 255, 0.95)';
}

/** Normalize any CSS color to #rrggbb for color input. */
export function colorToHex(color) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = color;
  const normalized = ctx.fillStyle;
  if (normalized.startsWith('#')) return normalized;
  const match = normalized.match(/\d+/g);
  if (match && match.length >= 3) {
    const h = (n) => Number(n).toString(16).padStart(2, '0');
    return `#${h(match[0])}${h(match[1])}${h(match[2])}`;
  }
  return '#3b82f6';
}

export function brightStroke(fill) {
  return 'rgba(255, 255, 255, 1)';
}

function scaleVertices(vertices, scale) {
  return vertices.map((v) => ({ x: v.x * scale, y: v.y * scale }));
}

function placeVertices(localVertices, centerX, centerY) {
  return localVertices.map((v) => ({
    x: v.x + centerX,
    y: v.y + centerY,
  }));
}

const MAX_PLACEMENT_ATTEMPTS = 60;
/** Padding in normalized coordinates (0–1). */
const MIN_PADDING_NORM = 0.02;

/**
 * Try to create random polygon vertices in normalized space (0–1).
 * @returns {{ vertices, fill, stroke } | null}
 */
export function tryCreateRandomPlacement(existingPolygons) {
  const canvasWidth = 1;
  const canvasHeight = 1;

  const vertexCount = randomInt(3, 7);
  const localShape = createLocalShapeNormalized(vertexCount);
  const fill = randomColor();
  const stroke = contrastStroke();

  const localBounds = getBounds(localShape);
  const maxScaleX =
    (canvasWidth - MIN_PADDING_NORM * 2) / Math.max(localBounds.width, 0.001);
  const maxScaleY =
    (canvasHeight - MIN_PADDING_NORM * 2) / Math.max(localBounds.height, 0.001);
  const maxScale = Math.min(maxScaleX, maxScaleY) * 0.85;

  for (let attempt = 0; attempt < MAX_PLACEMENT_ATTEMPTS; attempt++) {
    const scale = 0.35 + Math.random() * maxScale;
    const scaled = scaleVertices(localShape, scale);
    const bounds = getBounds(scaled);
    const margin = MIN_PADDING_NORM;

    const minCx = margin - bounds.minX;
    const maxCx = canvasWidth - margin - bounds.maxX;
    const minCy = margin - bounds.minY;
    const maxCy = canvasHeight - margin - bounds.maxY;

    if (minCx > maxCx || minCy > maxCy) continue;

    const centerX = minCx + Math.random() * (maxCx - minCx);
    const centerY = minCy + Math.random() * (maxCy - minCy);
    const vertices = placeVertices(scaled, centerX, centerY);

    if (
      !isInsideCanvas(vertices, canvasWidth, canvasHeight, MIN_PADDING_NORM)
    ) {
      continue;
    }

    const others = existingPolygons.map((p) => ({
      id: p.id,
      vertices: p.vertices,
    }));
    if (!polygonOverlapsAny(vertices, others)) {
      return { vertices, fill, stroke };
    }
  }

  return null;
}

function createLocalShapeNormalized(vertexCount) {
  const vertices = [];
  const baseAngle = Math.random() * Math.PI * 2;

  for (let i = 0; i < vertexCount; i++) {
    const angle = baseAngle + (i / vertexCount) * Math.PI * 2;
    const radius = 0.04 + Math.random() * 0.07;
    vertices.push({
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    });
  }

  return vertices;
}

export function easeOutBack(t) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}
