import { clonePolygon, syncPolygonCounter } from './models.js';
import {
  isLegacyPixelCoordinates,
  normalizePolygonList,
} from './geometry.js';

const SCHEMA_VERSION = 2;

export function serializeScene(scene) {
  return {
    version: SCHEMA_VERSION,
    coordinateSpace: 'normalized',
    selectedId: scene.selectedId,
    polygons: scene.polygons.map((p) => ({
      id: p.id,
      name: p.name,
      vertices: p.vertices.map((v) => ({ x: v.x, y: v.y })),
      fill: p.fill,
      stroke: p.stroke,
    })),
  };
}

export function sceneToJson(scene) {
  return JSON.stringify(serializeScene(scene), null, 2);
}

/**
 * @param {{ width: number, height: number } | null} canvasSize — for legacy pixel JSON
 * @returns {{ polygons: object[], selectedId: string|null } | null}
 */
export function parseSceneJson(jsonString, canvasSize = null) {
  let data;
  try {
    data = JSON.parse(jsonString);
  } catch {
    return null;
  }

  if (!data || typeof data !== 'object' || !Array.isArray(data.polygons)) {
    return null;
  }

  const polygons = [];

  for (const raw of data.polygons) {
    if (!raw || typeof raw !== 'object') return null;
    if (!Array.isArray(raw.vertices) || raw.vertices.length < 3) return null;

    const vertices = [];
    for (const v of raw.vertices) {
      if (typeof v?.x !== 'number' || typeof v?.y !== 'number') return null;
      if (!Number.isFinite(v.x) || !Number.isFinite(v.y)) return null;
      vertices.push({ x: v.x, y: v.y });
    }

    polygons.push({
      id: typeof raw.id === 'string' ? raw.id : crypto.randomUUID?.() ?? `import-${Date.now()}`,
      name: typeof raw.name === 'string' ? raw.name : 'Полигон',
      vertices,
      fill: typeof raw.fill === 'string' ? raw.fill : 'hsl(200, 70%, 55%)',
      stroke: typeof raw.stroke === 'string' ? raw.stroke : 'rgba(255, 255, 255, 0.95)',
    });
  }

  const selectedId =
    typeof data.selectedId === 'string' &&
    polygons.some((p) => p.id === data.selectedId)
      ? data.selectedId
      : polygons.length > 0
        ? polygons[polygons.length - 1].id
        : null;

  let normalized = polygons;
  if (
    data.coordinateSpace !== 'normalized' &&
    isLegacyPixelCoordinates(polygons)
  ) {
    const refW =
      data.canvas?.width ?? canvasSize?.width ?? getMaxCoord(polygons, 'x');
    const refH =
      data.canvas?.height ?? canvasSize?.height ?? getMaxCoord(polygons, 'y');
    if (refW > 0 && refH > 0) {
      normalized = normalizePolygonList(polygons, refW, refH);
    }
  }

  return { polygons: normalized, selectedId };
}

function getMaxCoord(polygons, axis) {
  let max = 1;
  for (const p of polygons) {
    for (const v of p.vertices) {
      max = Math.max(max, v[axis]);
    }
  }
  return max;
}

export function deserializeScene(scene, data) {
  const parsed = parseSceneJson(JSON.stringify(data));
  if (!parsed) return false;

  scene.restoreAll(
    parsed.polygons.map((p) => clonePolygon({ ...p, animation: undefined })),
    parsed.selectedId,
  );
  syncPolygonCounter(parsed.polygons);
  return true;
}
