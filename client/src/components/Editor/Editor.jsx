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
import Collaboration from '@tiptap/extension-collaboration';
import { yCursorPlugin } from '@tiptap/y-tiptap';
import { FontSize } from './FontSize';
import { ImageNode } from './ImageNode';
import { TextColor } from './TextColor';
import { TextAlign } from './TextAlign';
import { socket } from '../../services/socket';
import * as Y from 'yjs';
import { Awareness, applyAwarenessUpdate, encodeAwarenessUpdate } from 'y-protocols/awareness';
import './Editor.css';

const withCursorOpacity = (color, opacityHex = '33') => {
  if (typeof color === 'string' && color.startsWith('#') && color.length === 7) {
    return `${color}${opacityHex}`;
  }

  return color;
};

const buildTextDecorations = (doc, query) => {
  if (!query?.trim()) {
    return [];
  }

  const normalizedQuery = query.toLowerCase();
  const decorations = [];

  doc.descendants((node, position) => {
    if (!node.isText) {
      return;
    }

    const text = node.text || '';
    const lower = text.toLowerCase();
    let startIndex = 0;

    while (startIndex < lower.length) {
      const foundAt = lower.indexOf(normalizedQuery, startIndex);
      if (foundAt === -1) {
        break;
      }

      decorations.push(
        Decoration.inline(position + foundAt, position + foundAt + query.length, { class: 'search-highlight' })
      );

      startIndex = foundAt + query.length;
    }
  });

  return decorations;
};

const createCommentDecorationSet = (doc, comments) => {
  const decorations = (comments || [])
    .filter((comment) => !comment.resolved && comment.textRange?.end > comment.textRange?.start)
    .map((comment) => Decoration.inline(comment.textRange.start, comment.textRange.end, { class: 'comment-highlight' }));

  return DecorationSet.create(doc, decorations);
};

const createSearchDecorationSet = (doc, query) => {
  return DecorationSet.create(doc, buildTextDecorations(doc, query));
};

const extractOutline = (editor) => {
  const headings = [];

  editor.state.doc.descendants((node, position) => {
    if (node.type.name !== 'heading') {
      return;
    }

    const text = (node.textContent || '').trim();
    if (!text) {
      return;
    }

    headings.push({
      id: `${position}-${text}`,
      text,
      level: node.attrs.level || 1,
      position,
    });
  });

  return headings;
};

const EditorComponent = ({
  currentUser,
  initialState,
  canEdit,
  searchQuery,
  comments,
  zoomLevel,
  onContentChange,
  onOutlineChange,
  onSelectionChange,
  onEditorReady,
  onOpenSearch,
}) => {
  const yDocState = useMemo(() => {
    const ydoc = new Y.Doc();
    const awareness = new Awareness(ydoc);

    if (initialState?.length) {
      Y.applyUpdate(ydoc, initialState);
    }

    awareness.setLocalStateField('user', {
      name: currentUser.username,
      color: currentUser.color,
    });

    return { ydoc, awareness };
  }, [currentUser, initialState]);

  const commentExtension = useMemo(() => Extension.create({
    name: 'commentDecorations',
    addProseMirrorPlugins() {
      return [
        new Plugin({
          props: {
            decorations(state) {
              return createCommentDecorationSet(state.doc, comments);
            },
          },
        }),
      ];
    },
  }), [comments]);

  const searchExtension = useMemo(() => Extension.create({
    name: 'searchHighlights',
    addProseMirrorPlugins() {
      return [
        new Plugin({
          props: {
            decorations(state) {
              return createSearchDecorationSet(state.doc, searchQuery);
            },
          },
        }),
      ];
    },
  }), [searchQuery]);

  const liveCursorExtension = useMemo(() => Extension.create({
    name: 'liveCursor',
    addProseMirrorPlugins() {
      return [
        yCursorPlugin(yDocState.awareness, {
          cursorBuilder: (user) => {
            const cursor = document.createElement('span');
            cursor.classList.add('collaboration-cursor__caret');
            cursor.style.borderColor = user.color || '#0f172a';

            const label = document.createElement('div');
            label.classList.add('collaboration-cursor__label');
            label.style.backgroundColor = user.color || '#0f172a';
            label.textContent = user.name || 'Anonymous';

            cursor.append(label);
            return cursor;
          },
          selectionBuilder: (user) => ({
            style: `background-color: ${withCursorOpacity(user.color || '#0f172a')}`,
          }),
        }),
      ];
    },
  }), [yDocState]);

  const shortcutsExtension = useMemo(() => Extension.create({
    name: 'editorShortcuts',
    addKeyboardShortcuts() {
      return {
        'Mod-f': () => {
          onOpenSearch();
          return true;
        },
      };
    },
  }), [onOpenSearch]);

  useEffect(() => {
    const { ydoc, awareness } = yDocState;

    // 1. DOC SYNC
    ydoc.on('update', (update, origin) => {
      if (origin !== socket) {
        socket.emit('yjs-update', update);
      }
    });

    const handleDocUpdate = (update) => {
      Y.applyUpdate(ydoc, new Uint8Array(update), socket);
    };

    socket.on('yjs-update', handleDocUpdate);

    // 2. AWARENESS SYNC (Cursors)
    const handleAwarenessLocalUpdate = ({ added, updated, removed }, origin) => {
      if (origin !== socket) {
        const changedClients = added.concat(updated, removed);
        const update = encodeAwarenessUpdate(awareness, changedClients);
        socket.emit('cursor-update', update);
      }
    };

    const handleAwarenessRemoteUpdate = (update) => {
      applyAwarenessUpdate(awareness, new Uint8Array(update), socket);
    };

    awareness.on('update', handleAwarenessLocalUpdate);
    socket.on('cursor-update', handleAwarenessRemoteUpdate);

    return () => {
      socket.off('yjs-update', handleDocUpdate);
      socket.off('cursor-update', handleAwarenessRemoteUpdate);
      awareness.off('update', handleAwarenessLocalUpdate);
      yDocState.awareness.destroy();
      ydoc.destroy();
    };
  }, [yDocState]);

  const editor = useEditor({
    editable: canEdit,
    extensions: [
      StarterKit.configure({
        history: false,
      }),
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
        document: yDocState.ydoc,
      }),
      liveCursorExtension,
      searchExtension,
      commentExtension,
      shortcutsExtension,
    ],
    onSelectionUpdate: ({ editor: instance }) => {
      const { from, to } = instance.state.selection;
      onSelectionChange({
        from,
        to,
        text: instance.state.doc.textBetween(from, to, ' '),
      });
    },
    onCreate: ({ editor: instance }) => {
      onEditorReady(instance);
      onContentChange?.(instance.getText());
      onOutlineChange?.(extractOutline(instance));
    },
    onUpdate: ({ editor: instance }) => {
      socket.emit('typing-status', true);
      onContentChange?.(instance.getText());
      onOutlineChange?.(extractOutline(instance));
    },
  }, [yDocState, currentUser, onContentChange, onOutlineChange]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    editor.setEditable(canEdit);
  }, [canEdit, editor]);

  useEffect(() => () => {
    if (editor) {
      onEditorReady(null);
    }
  }, [editor, onEditorReady]);

  return (
    <div className="editor-container" style={{ '--editor-scale': `${(zoomLevel || 100) / 100}` }}>
      <div className="editor-content-wrapper">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};

export default EditorComponent;
