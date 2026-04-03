import { Node, mergeAttributes } from '@tiptap/core';

export const PageBreakNode = Node.create({
  name: 'pageBreak',

  group: 'block',

  parseHTML() {
    return [
      { tag: 'div[data-type="page-break"]' },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'page-break', class: 'manual-page-break' })];
  },

  addCommands() {
    return {
      setPageBreak: () => ({ chain }) => {
        return chain()
          .insertContent({ type: this.name })
          .run();
      },
    };
  },
});
