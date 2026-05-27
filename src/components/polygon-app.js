import { Scene } from '../core/scene.js';
import { HistoryManager } from '../core/history.js';
import { createPolygon, clonePolygon } from '../core/models.js';
import { tryCreateRandomPlacement, colorToHex, contrastStroke } from '../core/geometry.js';
import { sceneToJson, parseSceneJson } from '../core/serialization.js';
import {
  AddPolygonCommand,
  DeletePolygonCommand,
  DeleteAllCommand,
  MovePolygonCommand,
  ChangeColorCommand,
  ImportSceneCommand,
} from '../core/commands.js';

export class PolygonApp extends HTMLElement {
  constructor() {
    super();
    this.scene = new Scene();
    this.history = new HistoryManager(this.scene);
  }

  connectedCallback() {
    this.innerHTML = `
      <aside class="sidebar">
        <toolbar-panel></toolbar-panel>
        <info-panel></info-panel>
      </aside>
      <main class="canvas-wrap">
        <polygon-canvas></polygon-canvas>
      </main>
      <toast-message></toast-message>
    `;

    this._toolbar = this.querySelector('toolbar-panel');
    this._info = this.querySelector('info-panel');
    this._canvas = this.querySelector('polygon-canvas');
    this._toast = this.querySelector('toast-message');

    this._canvas.setScene(this.scene);

    this._onToolbarAction = this._handleToolbarAction.bind(this);
    this._onSelectionChanged = this._handleSelectionChanged.bind(this);
    this._onDragComplete = this._handleDragComplete.bind(this);
    this._onColorChange = this._handleColorChange.bind(this);
    this._onImportFile = this._handleImportFile.bind(this);
    this._onKeyDown = this._handleKeyDown.bind(this);

    this._toolbar.addEventListener('toolbar-action', this._onToolbarAction);
    this._toolbar.addEventListener('color-change', this._onColorChange);
    this._toolbar.addEventListener('import-file', this._onImportFile);
    this._canvas.addEventListener('selection-changed', this._onSelectionChanged);
    this._canvas.addEventListener('drag-complete', this._onDragComplete);
    document.addEventListener('keydown', this._onKeyDown);

    this._syncUI();
  }

  disconnectedCallback() {
    this._toolbar?.removeEventListener('toolbar-action', this._onToolbarAction);
    this._toolbar?.removeEventListener('color-change', this._onColorChange);
    this._toolbar?.removeEventListener('import-file', this._onImportFile);
    this._canvas?.removeEventListener('selection-changed', this._onSelectionChanged);
    this._canvas?.removeEventListener('drag-complete', this._onDragComplete);
    document.removeEventListener('keydown', this._onKeyDown);
  }

  _handleToolbarAction(event) {
    const { action } = event.detail;
    switch (action) {
      case 'generate':
        this._generatePolygon();
        break;
      case 'delete':
        this._deleteSelected();
        break;
      case 'delete-all':
        this._deleteAll();
        break;
      case 'undo':
        this._undo();
        break;
      case 'redo':
        this._redo();
        break;
      case 'export':
        this._exportScene();
        break;
      default:
        break;
    }
  }

  _handleSelectionChanged() {
    this._syncUI();
    this._canvas.requestRedraw();
  }

  _handleDragComplete(event) {
    const { polygonId, fromVertices, toVertices } = event.detail;
    const cmd = new MovePolygonCommand(polygonId, fromVertices, toVertices);
    this.history.record(cmd);
    this._syncUI();
    this._canvas.requestRedraw();
  }

  _handleColorChange(event) {
    const selected = this.scene.getSelected();
    if (!selected) return;

    const newFill = event.detail.color;
    const newStroke = contrastStroke();
    if (selected.fill === newFill && selected.stroke === newStroke) return;

    const cmd = new ChangeColorCommand(
      selected.id,
      selected.fill,
      selected.stroke,
      newFill,
      newStroke,
    );
    this.history.execute(cmd);
    this._syncUI();
    this._canvas.requestRedraw();
  }

  _handleImportFile(event) {
    const parsed = parseSceneJson(
      event.detail.content,
      this._canvas.getCanvasSize(),
    );
    if (!parsed) {
      this._toast.show('Некорректный JSON — проверьте формат файла');
      return;
    }

    const polygons = parsed.polygons.map((p) =>
      clonePolygon({ ...p, animation: undefined }),
    );

    this.history.execute(
      new ImportSceneCommand(polygons, parsed.selectedId),
    );
    this._syncUI();
    this._canvas.requestRedraw();
    this._toast.show(`Импортировано полигонов: ${polygons.length}`);
  }

  _handleKeyDown(event) {
    if (event.target.matches('input, textarea, select')) return;

    if (event.key === 'Delete') {
      event.preventDefault();
      this._deleteSelected();
      return;
    }

    if (event.ctrlKey || event.metaKey) {
      if (event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        this._undo();
      } else if (event.key === 'y' || (event.key === 'z' && event.shiftKey)) {
        event.preventDefault();
        this._redo();
      }
    }
  }

  _generatePolygon() {
    const placement = tryCreateRandomPlacement(this.scene.polygons);

    if (!placement) {
      this._toast.show('Не удалось разместить полигон — попробуйте освободить место');
      return;
    }

    const polygon = createPolygon(placement);
    this.history.execute(new AddPolygonCommand(polygon));
    this._syncUI();
    this._canvas.requestRedraw();
  }

  _deleteSelected() {
    const selected = this.scene.getSelected();
    if (!selected) {
      this._toast.show('Полигон не выбран — выберите полигон на холсте');
      return;
    }

    const cmd = new DeletePolygonCommand(selected, true);
    this.history.execute(cmd);
    this._syncUI();
    this._canvas.requestRedraw();
  }

  _deleteAll() {
    if (this.scene.count === 0) return;

    this.history.execute(new DeleteAllCommand());
    this._syncUI();
    this._canvas.requestRedraw();
  }

  _exportScene() {
    const json = sceneToJson(this.scene);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `polygon-scene-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    this._toast.show('Сцена экспортирована');
  }

  _undo() {
    if (this.history.undo()) {
      this._syncUI();
      this._canvas.requestRedraw();
    }
  }

  _redo() {
    if (this.history.redo()) {
      this._syncUI();
      this._canvas.requestRedraw();
    }
  }

  _syncUI() {
    const selected = this.scene.getSelected();
    this._info.update({
      count: this.scene.count,
      selectedName: selected?.name ?? null,
    });
    this._toolbar.setHistoryState({
      canUndo: this.history.canUndo,
      canRedo: this.history.canRedo,
    });
    this._toolbar.setColorPickerState({
      enabled: Boolean(selected),
      color: selected ? colorToHex(selected.fill) : undefined,
    });
  }
}

customElements.define('polygon-app', PolygonApp);
