import { html, css, customElement } from 'lit-element';
import { VaadinElement } from '@vaadin/element-base/vaadin-element.js';

/**
 * `<create-lit-element>` --elementdescription--
 *
 * @element create-lit-element
 */
@customElement('create-lit-element')
class CreateLitElement extends VaadinElement {
  static get is() {
    return 'create-lit-element';
  }

  static get version() {
    return '0.1.0';
  }

  static get styles() {
    return css`
      :host {
        display: inline-block;
      }

      :host([hidden]) {
        display: none !important;
      }
    `;
  }

  render() {
    return html`
      <slot></slot>
    `;
  }
}

export { CreateLitElement };

declare global {
  interface HTMLElementTagNameMap {
    'create-lit-element': CreateLitElement;
  }
}
