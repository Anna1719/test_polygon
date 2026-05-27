export class InfoPanel extends HTMLElement {
  connectedCallback() {
    this.render({ count: 0, selectedName: null });
  }

  render({ count, selectedName }) {
    const selectionHtml = selectedName
      ? `<p class="stat"><span class="stat-label">Выбран: </span><span class="stat-value">${selectedName}</span></p>`
      : `<p class="stat stat--muted"><span class="stat-value">Ничего не выбрано</span></p>`;

    this.innerHTML = `
      <h3>Информация</h3>
      <p class="stat"><span class="stat-label">Полигонов на холсте: </span><span class="stat-value">${count}</span></p>
      ${selectionHtml}
    `;
  }

  update({ count, selectedName }) {
    this.render({ count, selectedName });
  }
}

customElements.define('info-panel', InfoPanel);
