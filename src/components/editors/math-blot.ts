'use client';

import Quill from 'quill';
import katex from 'katex';

const Embed = Quill.import('blots/embed') as any;

/**
 * Custom Quill blot for rendering LaTeX math formulas using KaTeX
 * Supports both inline and block (display) math modes
 */
class MathBlot extends Embed {
  static blotName = 'formula';
  static tagName = 'span';
  static className = 'ql-formula';

  static create(value: string) {
    const node = super.create() as HTMLElement;
    if (typeof value === 'string' && value.length > 0) {
      try {
        katex.render(value, node, {
          throwOnError: false,
          displayMode: false,
          output: 'html'
        });
      } catch (e) {
        node.innerText = value;
      }
    }
    node.setAttribute('data-value', value);
    node.setAttribute('contenteditable', 'false');
    return node;
  }

  static value(node: HTMLElement): string {
    return node.getAttribute('data-value') || '';
  }
}

/**
 * Custom Quill blot for rendering block-level (display) LaTeX math formulas
 * Renders math centered on its own line
 */
class DisplayMathBlot extends Embed {
  static blotName = 'display-formula';
  static tagName = 'div';
  static className = 'ql-display-formula';

  static create(value: string) {
    const node = super.create() as HTMLElement;
    if (typeof value === 'string' && value.length > 0) {
      try {
        katex.render(value, node, {
          throwOnError: false,
          displayMode: true,
          output: 'html'
        });
      } catch (e) {
        node.innerText = value;
      }
    }
    node.setAttribute('data-value', value);
    node.setAttribute('contenteditable', 'false');
    return node;
  }

  static value(node: HTMLElement): string {
    return node.getAttribute('data-value') || '';
  }
}

/**
 * Register math blots with Quill
 */
export function registerMathBlots() {
  Quill.register(MathBlot, true);
  Quill.register(DisplayMathBlot, true);
}

export { MathBlot, DisplayMathBlot };
