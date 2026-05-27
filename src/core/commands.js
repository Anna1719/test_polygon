import { clonePolygon } from './models.js';
import { cloneVertices } from './geometry.js';

export class AddPolygonCommand {
  constructor(polygon) {
    this.polygon = clonePolygon(polygon);
  }

  execute(scene) {
    scene.add(clonePolygon(this.polygon), true);
  }

  undo(scene) {
    scene.remove(this.polygon.id);
  }
}

export class DeletePolygonCommand {
  constructor(polygon, wasSelected) {
    this.polygon = clonePolygon(polygon);
    this.wasSelected = wasSelected;
    this.index = -1;
  }

  execute(scene) {
    this.index = scene.polygons.findIndex((p) => p.id === this.polygon.id);
    scene.remove(this.polygon.id);
  }

  undo(scene) {
    const restored = clonePolygon(this.polygon);
    if (this.index >= 0 && this.index <= scene.polygons.length) {
      scene.polygons.splice(this.index, 0, restored);
    } else {
      scene.polygons.push(restored);
    }
    if (this.wasSelected) scene.select(restored.id);
  }
}

export class DeleteAllCommand {
  constructor() {
    this.snapshot = null;
  }

  execute(scene) {
    this.snapshot = scene.removeAll();
  }

  undo(scene) {
    if (this.snapshot) {
      scene.restoreAll(this.snapshot.polygons, this.snapshot.selectedId);
    }
  }
}

export class MovePolygonCommand {
  constructor(polygonId, fromVertices, toVertices) {
    this.polygonId = polygonId;
    this.fromVertices = cloneVertices(fromVertices);
    this.toVertices = cloneVertices(toVertices);
  }

  execute(scene) {
    scene.setVertices(this.polygonId, this.toVertices);
  }

  undo(scene) {
    scene.setVertices(this.polygonId, this.fromVertices);
  }
}

export class ChangeColorCommand {
  constructor(polygonId, oldFill, oldStroke, newFill, newStroke) {
    this.polygonId = polygonId;
    this.oldFill = oldFill;
    this.oldStroke = oldStroke;
    this.newFill = newFill;
    this.newStroke = newStroke;
  }

  execute(scene) {
    scene.setColors(this.polygonId, this.newFill, this.newStroke);
  }

  undo(scene) {
    scene.setColors(this.polygonId, this.oldFill, this.oldStroke);
  }
}

export class ImportSceneCommand {
  constructor(nextPolygons, nextSelectedId) {
    this.nextPolygons = nextPolygons.map(clonePolygon);
    this.nextSelectedId = nextSelectedId;
    this.previous = null;
  }

  execute(scene) {
    this.previous = {
      polygons: scene.polygons.map(clonePolygon),
      selectedId: scene.selectedId,
    };
    scene.restoreAll(this.nextPolygons, this.nextSelectedId);
  }

  undo(scene) {
    if (this.previous) {
      scene.restoreAll(this.previous.polygons, this.previous.selectedId);
    }
  }
}
