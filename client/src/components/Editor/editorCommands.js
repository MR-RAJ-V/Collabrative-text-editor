export const FONT_FAMILIES = [
  { value: 'Inter', label: 'Inter' },
  { value: 'Arial', label: 'Arial' },
  { value: 'Times New Roman', label: 'Times New Roman' },
  { value: 'Roboto', label: 'Roboto' },
];

export const FONT_SIZES = [
  '8px',
  '9px',
  '10px',
  '11px',
  '12px',
  '14px',
  '16px',
  '18px',
  '20px',
  '24px',
  '30px',
  '36px',
  '48px',
  '60px',
  '72px',
];

export const TEXT_STYLE_OPTIONS = [
  { value: 'paragraph', label: 'Normal text' },
  { value: 'h1', label: 'Heading 1' },
  { value: 'h2', label: 'Heading 2' },
  { value: 'h3', label: 'Heading 3' },
];

export const getNextFontSize = (currentValue, direction) => {
  const currentIndex = Math.max(FONT_SIZES.indexOf(currentValue || '16px'), 0);
  const nextIndex = Math.min(Math.max(currentIndex + direction, 0), FONT_SIZES.length - 1);
  return FONT_SIZES[nextIndex];
};

export const formatActions = {
  undo: (editor) => editor.chain().focus().undo().run(),
  redo: (editor) => editor.chain().focus().redo().run(),
  bold: (editor) => editor.chain().focus().toggleBold().run(),
  italic: (editor) => editor.chain().focus().toggleItalic().run(),
  underline: (editor) => editor.chain().focus().toggleUnderline().run(),
  strike: (editor) => editor.chain().focus().toggleStrike().run(),
  setBlockType: (editor, value) => {
    if (value === 'paragraph') {
      return editor.chain().focus().setParagraph().run();
    }

    return editor.chain().focus().toggleHeading({ level: Number(value.replace('h', '')) }).run();
  },
  setFontFamily: (editor, value) => editor.chain().focus().setFontFamily(value).run(),
  setFontSize: (editor, value) => editor.chain().focus().setMark('textStyle', { fontSize: value }).run(),
  increaseFontSize: (editor, currentValue) => (
    editor.chain().focus().setMark('textStyle', { fontSize: getNextFontSize(currentValue, 1) }).run()
  ),
  decreaseFontSize: (editor, currentValue) => (
    editor.chain().focus().setMark('textStyle', { fontSize: getNextFontSize(currentValue, -1) }).run()
  ),
  align: (editor, value) => editor.chain().focus().setTextAlign(value).run(),
  bulletList: (editor) => editor.chain().focus().toggleBulletList().run(),
  orderedList: (editor) => editor.chain().focus().toggleOrderedList().run(),
  indent: (editor) => editor.chain().focus().sinkListItem('listItem').run(),
  outdent: (editor) => editor.chain().focus().liftListItem('listItem').run(),
  textColor: (editor, value) => editor.chain().focus().setTextColor(value).run(),
  highlightColor: (editor, value) => editor.chain().focus().setHighlightColor(value).run(),
  clearFormatting: (editor) => editor.chain().focus().clearNodes().unsetAllMarks().run(),
};

