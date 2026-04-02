import { Extension } from '@tiptap/core';

export const TextColor = Extension.create({
  name: 'textColor',
  addOptions() {
    return {
      types: ['textStyle'],
    };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          color: {
            default: null,
            parseHTML: (element) => element.style.color || null,
            renderHTML: (attributes) => {
              if (!attributes.color) {
                return {};
              }

              return {
                style: `color: ${attributes.color}`,
              };
            },
          },
          backgroundColor: {
            default: null,
            parseHTML: (element) => element.style.backgroundColor || null,
            renderHTML: (attributes) => {
              if (!attributes.backgroundColor) {
                return {};
              }

              return {
                style: `background-color: ${attributes.backgroundColor}`,
              };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setTextColor: (value) => ({ chain }) => chain().setMark('textStyle', { color: value }).run(),
      unsetTextColor: () => ({ chain }) => chain().setMark('textStyle', { color: null }).run(),
      setHighlightColor: (value) => ({ chain }) => chain().setMark('textStyle', { backgroundColor: value }).run(),
      unsetHighlightColor: () => ({ chain }) => chain().setMark('textStyle', { backgroundColor: null }).run(),
    };
  },
});
