import { DialexController } from "dialexjs/lit";
import { html, LitElement } from "lit";
import { customElement } from "lit/decorators.js";

import { locales } from "./dialex.generated";
import { i18n } from "./i18n";

@customElement("language-switcher")
export class LanguageSwitcher extends LitElement {
  private dx = new DialexController(this, i18n);

  protected createRenderRoot() {
    return this;
  }

  render() {
    const common = this.dx.dictionary("common");

    return html`
      <label>
        ${common.language}
        <select
          @change=${(event: Event) => this.dx.setLocale((event.target as HTMLSelectElement).value)}
        >
          ${locales.map(
            (code) =>
              html`<option value=${code} ?selected=${code === this.dx.locale}>
                ${code.toUpperCase()}
              </option>`,
          )}
        </select>
      </label>
    `;
  }
}
