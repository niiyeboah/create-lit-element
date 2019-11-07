import { fixture, html } from '@open-wc/testing-helpers';
import { CreateLitElement } from '../../src/create-lit-element.js';

const { expect } = chai;

describe('sample test', () => {
  let element: CreateLitElement;
  let tagName: string;

  beforeEach(async () => {
    element = await fixture(
      html`
        <create-lit-element></create-lit-element>
      `
    );
    tagName = element.tagName.toLowerCase();
  });

  it('should be defined in custom element registry', () => {
    expect(customElements.get(tagName)).to.be.ok;
    expect(element instanceof CreateLitElement).to.be.ok;
  });

  it('should have a valid static "is" getter', () => {
    expect(customElements.get(tagName).is).to.equal(tagName);
  });

  it('should have a valid version number', () => {
    expect(customElements.get(tagName).version).to.match(/^(\d+\.)?(\d+\.)?(\d+)(-(alpha|beta)\d+)?$/);
  });
});
