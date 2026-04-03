import React, { useEffect, useMemo } from 'react';
import { Extension } from '@tiptap/core';
import { Plugin } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import FontFamily from '@tiptap/extension-font-family';
import { TextColor } from './Editor/TextColor';
import { TextAlign } from './Editor/TextAlign';
import { ImageNode } from './Editor/ImageNode';
import Collaboration from '@tiptap/extension-collaboration';
import * as Y from 'yjs';
import { FontSize } from './Editor/FontSize';
import {
  buildDiffRanges,
  extractComparableTextFromDoc,
  normalizeBinaryPayload,
} from '../utils/versionUtils';

const buildTextOffsetIndex = (doc) => {
  const spans = [];
  let offset = 0;

  doc.descendants((node, position) => {
    if (!node.isText || !node.text) {
      return;
    }

    spans.push({
      from: position,
      to: position + node.text.length,
      startOffset: offset,
      endOffset: offset + node.text.length,
    });

    offset += node.text.length;
  });

  return { spans, totalLength: offset };
};

const resolvePositionAtOffset = (index, offset) => {
  const { spans } = index;

  if (!spans.length) {
    return 1;
  }

  if (offset <= 0) {
    return spans[0].from;
  }

  for (const span of spans) {
    if (offset < span.endOffset) {
      return span.from + (offset - span.startOffset);
    }

    if (offset === span.endOffset) {
      return span.to;
    }
  }

  return spans[spans.length - 1].to;
};

const createDiffDecorationSet = (doc, currentText, versionAuthorName, currentVersionAuthorName) => {
  const previewText = extractComparableTextFromDoc(doc);
  const diffRanges = buildDiffRanges(previewText, currentText || '');
  const deletedTitle = `Present in this version by ${versionAuthorName || 'System'}`;
  const insertedTitle = currentVersionAuthorName
    ? `Present in the current document. Latest saved by ${currentVersionAuthorName}`
    : 'Present in the current document';

  if (!diffRanges.length) {
    return DecorationSet.empty;
  }

  const index = buildTextOffsetIndex(doc);
  const decorations = [];

  diffRanges.forEach((range, rangeIndex) => {
    if (range.type === 'delete' && range.beforeEnd > range.beforeStart) {
      index.spans.forEach((span) => {
        const start = Math.max(span.startOffset, range.beforeStart);
        const end = Math.min(span.endOffset, range.beforeEnd);

        if (start >= end) {
          return;
        }

        decorations.push(
          Decoration.inline(
            span.from + (start - span.startOffset),
            span.from + (end - span.startOffset),
            {
              class: 'version-inline-removed',
              title: deletedTitle,
              'data-version-author': versionAuthorName || 'System',
            },
          ),
        );
      });
      return;
    }

    if (range.type === 'insert' && range.value) {
      const anchor = resolvePositionAtOffset(index, range.beforeStart);
      decorations.push(
        Decoration.widget(anchor, () => {
          const element = document.createElement('span');
          element.className = 'version-inline-added';
          element.textContent = range.value;
          element.title = insertedTitle;
          element.dataset.versionAuthor = currentVersionAuthorName || 'Current document';
          return element;
        }, { key: `insert-${rangeIndex}-${range.beforeStart}` }),
      );
    }
  });

  return DecorationSet.create(doc, decorations);
};

const VersionPreview = ({
  stateBuffer,
  currentText = '',
  versionAuthorName = 'System',
  currentVersionAuthorName = '',
}) => {
  const ydoc = useMemo(() => {
    const doc = new Y.Doc();
    const bytes = normalizeBinaryPayload(stateBuffer);

    if (bytes.length) {
      Y.applyUpdate(doc, bytes);
    }

    return doc;
  }, [stateBuffer]);

  const diffExtension = useMemo(() => Extension.create({
    name: 'versionDiffDecorations',
    addProseMirrorPlugins() {
      return [
        new Plugin({
          props: {
            decorations(state) {
              return createDiffDecorationSet(
                state.doc,
                currentText,
                versionAuthorName,
                currentVersionAuthorName,
              );
            },
          },
        }),
      ];
    },
  }), [currentText, currentVersionAuthorName, versionAuthorName]);

  const editor = useEditor({
    editable: false,
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ history: false }),
      Link.configure({
        autolink: true,
        openOnClick: false,
        defaultProtocol: 'https',
      }),
      Underline,
      TextStyle,
      FontFamily,
      FontSize,
      TextColor,
      TextAlign,
      ImageNode,
      Collaboration.configure({
        document: ydoc,
      }),
      diffExtension,
    ],
  }, [diffExtension, ydoc]);

  useEffect(() => () => {
    ydoc.destroy();
  }, [ydoc]);

  if (!stateBuffer?.length) {
    return <p className="version-preview-empty">No snapshot data available.</p>;
  }

  return (
    <div className="version-preview-shell">
      <EditorContent editor={editor} className="version-preview-editor" />
    </div>
  );
};

export default VersionPreview;
