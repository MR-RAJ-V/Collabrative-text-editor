import { Node, mergeAttributes } from '@tiptap/core';

export const ImageNode = Node.create({
  name: 'image',
  group: 'block',
  selectable: true,
  draggable: true,
  addAttributes() {
    return {
      src: {
        default: null,
      },
      alt: {
        default: '',
      },
      title: {
        default: '',
      },
    };
  },
  parseHTML() {
    return [{ tag: 'img[src]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['img', mergeAttributes(HTMLAttributes)];
  },
  addCommands() {
    return {
      setImage: (options) => ({ commands }) => commands.insertContent({
        type: this.name,
        attrs: options,
      }),
    };
  },
});
