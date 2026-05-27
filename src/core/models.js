import { contrastStroke } from './geometry.js';

let polygonCounter = 0;

export function syncPolygonCounter(polygons) {
  let max = 0;
  for (const p of polygons) {
    const match = p.name?.match(/Полигон\s+(\d+)/);
    if (match) max = Math.max(max, Number.parseInt(match[1], 10));
  }
  polygonCounter = max;
}

export function createPolygon({ vertices, fill, stroke, name = null, id = null }) {
  polygonCounter += 1;
  const polygonId =
    id ?? crypto.randomUUID?.() ?? `polygon-${Date.now()}-${polygonCounter}`;

  return {
    id: polygonId,
    name: name ?? `Полигон ${polygonCounter}`,
    vertices,
    fill,
    stroke: stroke ?? contrastStroke(),
    animation: { t: 0, startTime: performance.now() },
  };
}

export function clonePolygon(polygon) {
  return {
    id: polygon.id,
    name: polygon.name,
    vertices: polygon.vertices.map((v) => ({ x: v.x, y: v.y })),
    fill: polygon.fill,
    stroke: polygon.stroke,
    animation: polygon.animation
      ? { ...polygon.animation }
      : undefined,
  };
}
