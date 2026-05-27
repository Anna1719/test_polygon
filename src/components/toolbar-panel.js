const BUTTONS = [
  { action: 'generate', label: 'Сгенерировать полигон', icon: '＋' },
  { action: 'delete', label: 'Удалить выбранный', icon: '🗑', danger: true },
  { action: 'delete-all', label: 'Удалить все', icon: '⌫', danger: true },
];

const HISTORY_BUTTONS = [
  { action: 'undo', label: 'Отменить', icon: '↶' },
  { action: 'redo', label: 'Повторить', icon: '↷' },
];

const EXTRA_BUTTONS = [
  { action: 'export', label: 'Экспорт JSON', icon: '⇩' },
  { action: 'import', label: 'Импорт JSON', icon: '⇧' },
];

export class ToolbarPanel extends HTMLElement {
  connectedCallback() {
    this.render();
    this.addEventListener('click', this._onClick);
    this._colorInput = this.querySelector('[data-color-input]');
    this._colorInput?.addEventListener('change', this._onColorChange.bind(this));
    this._fileInput = this.querySelector('[data-file-input]');
    this._fileInput?.addEventListener('change', this._onFileSelected.bind(this));
  }

  render() {
    const mainButtons = BUTTONS.map(
      (b) => `
      <button type="button" class="toolbar-btn${b.danger ? ' toolbar-btn--danger' : ''}" data-action="${b.action}">
        <span class="icon">${b.icon}</span>
        <span>${b.label}</span>
      </button>
    `,
    ).join('');

    const historyButtons = HISTORY_BUTTONS.map(
      (b) => `
      <button type="button" class="toolbar-btn" data-action="${b.action}" disabled>
        <span class="icon">${b.icon}</span>
        <span>${b.label}</span>
      </button>
    `,
    ).join('');

    const extraButtons = EXTRA_BUTTONS.map(
      (b) => `
      <button type="button" class="toolbar-btn" data-action="${b.action}">
        <span class="icon">${b.icon}</span>
        <span>${b.label}</span>
      </button>
    `,
    ).join('');

    this.innerHTML = `
      <h2>Инструменты</h2>
      ${mainButtons}
      <div class="toolbar-group">
        ${historyButtons}
      </div>
      <h2 class="toolbar-section-title">Дополнительно</h2>
      <label class="color-picker-row">
        <span class="color-picker-label">Цвет полигона</span>
        <input type="color" data-color-input value="#3b82f6" disabled aria-label="Цвет выбранного полигона" />
      </label>
      ${extraButtons}
      <input type="file" accept=".json,application/json" data-file-input hidden />
    `;
  }

  setHistoryState({ canUndo, canRedo }) {
    const undoBtn = this.querySelector('[data-action="undo"]');
    const redoBtn = this.querySelector('[data-action="redo"]');
    if (undoBtn) undoBtn.disabled = !canUndo;
    if (redoBtn) redoBtn.disabled = !canRedo;
  }

  setColorPickerState({ enabled, color }) {
    if (!this._colorInput) {
      this._colorInput = this.querySelector('[data-color-input]');
    }
    if (!this._colorInput) return;

    this._colorInput.disabled = !enabled;
    if (color) this._colorInput.value = color;
  }

  _onColorChange(event) {
    if (event.target.disabled) return;
    this.dispatchEvent(
      new CustomEvent('color-change', {
        bubbles: true,
        detail: { color: event.target.value },
      }),
    );
  }

  _onFileSelected(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      this.dispatchEvent(
        new CustomEvent('import-file', {
          bubbles: true,
          detail: { content: reader.result },
        }),
      );
      event.target.value = '';
    };
    reader.readAsText(file);
  }

  _onClick(event) {
    const btn = event.target.closest('[data-action]');
    if (!btn || btn.disabled) return;

    if (btn.dataset.action === 'import') {
      this._fileInput?.click();
      return;
    }

    this.dispatchEvent(
      new CustomEvent('toolbar-action', {
        bubbles: true,
        detail: { action: btn.dataset.action },
      }),
    );
  }
}

customElements.define('toolbar-panel', ToolbarPanel);
