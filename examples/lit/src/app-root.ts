import { DialexController } from "dialexjs/lit";
import { html, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";

import { i18n } from "./i18n";
import "./language-switcher";

@customElement("app-root")
export class AppRoot extends LitElement {
  private dx = new DialexController(this, i18n);

  @state() private count = 2;

  // The app uses the page's global styles instead of a shadow root.
  protected createRenderRoot() {
    return this;
  }

  render() {
    const common = this.dx.dictionary("common");
    const home = this.dx.dictionary("home");
    const t = this.dx.t("home");

    return html`
      <main>
        <header>
          <strong>${common.appName}</strong>
          <language-switcher></language-switcher>
        </header>

        <h1>${home.title}</h1>
        <p class="muted">${home.subtitle}</p>
        <p>${home.greeting("Alex")}</p>

        <section>
          <h2>${home.cart.title}</h2>
          <p>${t("home.cart.items", { count: this.count })}</p>
          <div class="row">
            <button @click=${() => this.count++}>${common.actions.add}</button>
            <button @click=${() => (this.count = 0)}>${common.actions.reset}</button>
          </div>
        </section>

        <p>${t("home.role", { role: "admin" })}</p>

        <footer>${common.footer}</footer>
      </main>
    `;
  }
}
