const DEFAULT_DURATION = 2800;

export class ToastMessage extends HTMLElement {
  constructor() {
    super();
    this._hideTimer = null;
  }

  connectedCallback() {
    this.setAttribute('role', 'status');
    this.setAttribute('aria-live', 'polite');
    this.dataset.visible = 'false';
  }

  disconnectedCallback() {
    if (this._hideTimer) clearTimeout(this._hideTimer);
  }

  show(message, duration = DEFAULT_DURATION) {
    this.textContent = message;
    this.dataset.visible = 'true';

    if (this._hideTimer) clearTimeout(this._hideTimer);
    this._hideTimer = setTimeout(() => {
      this.dataset.visible = 'false';
      this._hideTimer = null;
    }, duration);
  }
}

customElements.define('toast-message', ToastMessage);
