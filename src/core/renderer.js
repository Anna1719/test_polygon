import { getCentroid, easeOutBack, brightStroke, toPixelVertices } from './geometry.js';

const APPEAR_DURATION_MS = 280;

export function updateAnimations(polygons, now) {
  let needsFrame = false;
  for (const polygon of polygons) {
    if (!polygon.animation) continue;
    const elapsed = now - polygon.animation.startTime;
    const t = Math.min(1, elapsed / APPEAR_DURATION_MS);
    polygon.animation.t = t;
    if (t < 1) needsFrame = true;
    else delete polygon.animation;
  }
  return needsFrame;
}

export function drawScene(ctx, polygons, selectedId, width, height) {
  ctx.clearRect(0, 0, width, height);

  ctx.fillStyle = '#121820';
  ctx.fillRect(0, 0, width, height);

  for (const polygon of polygons) {
    const isSelected = polygon.id === selectedId;
    const pixelPolygon = {
      ...polygon,
      vertices: toPixelVertices(polygon.vertices, width, height),
    };
    drawPolygon(ctx, pixelPolygon, isSelected);
  }
}

function drawPolygon(ctx, polygon, isSelected) {
  const { vertices, fill, stroke } = polygon;
  if (vertices.length < 3) return;

  const centroid = getCentroid(vertices);
  let scale = 1;
  let alpha = 1;

  if (polygon.animation) {
    const eased = easeOutBack(polygon.animation.t);
    scale = 0.5 + eased * 0.5;
    alpha = polygon.animation.t;
  }

  ctx.save();
  ctx.globalAlpha = alpha;

  ctx.beginPath();
  const first = vertices[0];
  const fx = centroid.x + (first.x - centroid.x) * scale;
  const fy = centroid.y + (first.y - centroid.y) * scale;
  ctx.moveTo(fx, fy);

  for (let i = 1; i < vertices.length; i++) {
    const v = vertices[i];
    const x = centroid.x + (v.x - centroid.x) * scale;
    const y = centroid.y + (v.y - centroid.y) * scale;
    ctx.lineTo(x, y);
  }
  ctx.closePath();

  ctx.fillStyle = fill;
  ctx.fill();

  ctx.strokeStyle = isSelected ? brightStroke(fill) : stroke;
  ctx.lineWidth = isSelected ? 3.5 : 2;
  ctx.lineJoin = 'round';
  ctx.stroke();

  ctx.restore();
}
