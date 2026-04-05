import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { Extension } from '@tiptap/core';
import { Plugin } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle } from '@tiptap/extension-text-style';
import FontFamily from '@tiptap/extension-font-family';
import Collaboration from '@tiptap/extension-collaboration';
import { yCursorPlugin } from '@tiptap/y-tiptap';
import { FontSize } from './FontSize';
import { ImageNode } from './ImageNode';
import { TextColor } from './TextColor';
import { TextAlign } from './TextAlign';
import VersionPreview from '../VersionPreview';
import { socket } from '../../services/socket';
import * as Y from 'yjs';
import { Awareness, applyAwarenessUpdate, encodeAwarenessUpdate } from 'y-protocols/awareness';
import { extractComparableTextFromDoc } from '../../utils/versionUtils';
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

const resolveCommentRange = (comment, docSize) => {
  const start = comment?.textRange?.start;
  const end = comment?.textRange?.end;

  if (
    typeof start !== 'number'
    || typeof end !== 'number'
    || start < 1
    || end <= start
    || end > docSize
  ) {
    return null;
  }

  return { start, end };
};

const createCommentDecorationSet = (doc, comments, activeCommentId) => {
  const decorations = (comments || []).flatMap((comment) => {
    const range = resolveCommentRange(comment, doc.content.size);
    if (!range) {
      return [];
    }

    if (comment.resolved) {
      return [];
    }

    if (comment._id === activeCommentId) {
      return [
        Decoration.inline(range.start, range.end, { class: 'comment-highlight comment-highlight-active' }),
      ];
    }

    return [
      Decoration.inline(range.start, range.end, { class: 'comment-highlight' }),
    ];
  });

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

const PAGE_HEIGHT = 1123;
const PAGE_GAP = 32;
const PAGE_PADDING_Y = 80;
const PAGINATION_DEBOUNCE_MS = 180;

const EditorComponent = ({
  currentUser,
  initialState,
  canEdit,
  searchQuery,
  comments,
  activeCommentId,
  activeCommentRequestKey,
  zoomLevel,
  mode = 'edit',
  previewVersion = null,
  currentComparableText = '',
  currentVersionAuthorName = '',
  onContentChange,
  onLocalChange,
  onComparableTextChange,
  onOutlineChange,
  onSelectionChange,
  onEditorReady,
  onOpenSearch,
  onCommentTargetResolved,
  onPreviewExit,
}) => {
  const [pageCount, setPageCount] = useState(1);
  const paginationFrameRef = useRef(0);
  const paginationTimeoutRef = useRef(0);
  const resizeObserverRef = useRef(null);
  const imageCleanupRef = useRef(() => {});
  const lastPageCountRef = useRef(1);
  const modeRef = useRef(mode);
  const comparableTextChangeRef = useRef(onComparableTextChange);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    comparableTextChangeRef.current = onComparableTextChange;
  }, [onComparableTextChange]);

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
              return createCommentDecorationSet(state.doc, comments, activeCommentId);
            },
          },
        }),
      ];
    },
  }), [activeCommentId, comments]);

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
      if (origin !== socket && modeRef.current === 'edit') {
        onLocalChange?.();
        socket.emit('yjs-update', update);
      }
    });

    const handleDocUpdate = (update) => {
      Y.applyUpdate(ydoc, new Uint8Array(update), socket);
    };

    socket.on('yjs-update', handleDocUpdate);

    // 2. AWARENESS SYNC (Cursors)
    const handleAwarenessLocalUpdate = ({ added, updated, removed }, origin) => {
      if (origin === socket || modeRef.current !== 'edit') {
        return;
      }

      const changedClients = added.concat(updated, removed);
      const update = encodeAwarenessUpdate(awareness, changedClients);
      socket.emit('cursor-update', update);
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
  }, [onLocalChange, yDocState]);

  const editor = useEditor({
    editable: canEdit,
    extensions: [
      StarterKit.configure({
        undoRedo: false,
        link: {
          autolink: true,
          openOnClick: false,
          defaultProtocol: 'https',
        },
      }),
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
    onUpdate: ({ editor: instance }) => {
      if (modeRef.current === 'edit') {
        socket.emit('typing-status', true);
      }
      onContentChange?.(instance.getText());
      comparableTextChangeRef.current?.(extractComparableTextFromDoc(instance.state.doc));
      onOutlineChange?.(extractOutline(instance));
    },
  }, [yDocState, currentUser, onContentChange, onOutlineChange]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    editor.setEditable(canEdit && mode === 'edit');
  }, [canEdit, editor, mode]);

  useEffect(() => {
    if (editor) {
      onEditorReady(editor);
    }

    return () => {
      if (editor) {
        onEditorReady(null);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    const { from, to } = editor.state.selection;
    onSelectionChange({
      from,
      to,
      text: editor.state.doc.textBetween(from, to, ' '),
    });
    onContentChange?.(editor.getText());
    comparableTextChangeRef.current?.(extractComparableTextFromDoc(editor.state.doc));
    onOutlineChange?.(extractOutline(editor));
  }, [editor, onContentChange, onOutlineChange, onSelectionChange]);

  const recalculatePageCount = useCallback(() => {
    if (!editor?.view?.dom) {
      return;
    }

    const liveRoot = editor.view.dom;
    const totalHeight = Math.max(
      liveRoot.scrollHeight + (PAGE_PADDING_Y * 2),
      liveRoot.offsetHeight + (PAGE_PADDING_Y * 2),
      PAGE_HEIGHT
    );
    const nextPageCount = Math.max(1, Math.ceil(totalHeight / PAGE_HEIGHT));

    if (lastPageCountRef.current !== nextPageCount) {
      lastPageCountRef.current = nextPageCount;
      setPageCount(nextPageCount);
    }
  }, [editor]);

  const schedulePagination = useCallback(() => {
    window.clearTimeout(paginationTimeoutRef.current);
    paginationTimeoutRef.current = window.setTimeout(() => {
      if (paginationFrameRef.current) {
        window.cancelAnimationFrame(paginationFrameRef.current);
      }

      paginationFrameRef.current = window.requestAnimationFrame(() => {
        recalculatePageCount();
      });
    }, PAGINATION_DEBOUNCE_MS);
  }, [recalculatePageCount]);

  useEffect(() => {
    if (!editor?.view?.dom) {
      return undefined;
    }

    const liveRoot = editor.view.dom;
    const handleResize = () => schedulePagination();
    const bindImageListeners = () => {
      imageCleanupRef.current();

      const cleanupCallbacks = Array.from(liveRoot.querySelectorAll('img')).map((image) => {
        const onImageLoad = () => schedulePagination();
        image.addEventListener('load', onImageLoad);
        return () => image.removeEventListener('load', onImageLoad);
      });

      imageCleanupRef.current = () => {
        cleanupCallbacks.forEach((cleanup) => cleanup());
      };
    };
    const handleEditorUpdate = () => {
      bindImageListeners();
      schedulePagination();
    };

    schedulePagination();
    bindImageListeners();

    editor.on('update', handleEditorUpdate);
    window.addEventListener('resize', handleResize);

    resizeObserverRef.current = new ResizeObserver(() => {
      schedulePagination();
    });
    resizeObserverRef.current.observe(liveRoot);

    return () => {
      imageCleanupRef.current();
      window.clearTimeout(paginationTimeoutRef.current);

      if (paginationFrameRef.current) {
        window.cancelAnimationFrame(paginationFrameRef.current);
      }

      resizeObserverRef.current?.disconnect();
      window.removeEventListener('resize', handleResize);
      editor.off('update', handleEditorUpdate);
    };
  }, [editor, schedulePagination, zoomLevel]);

  useEffect(() => {
    if (!editor || !activeCommentId || mode !== 'edit') {
      return;
    }

    const activeComment = (comments || []).find((comment) => comment._id === activeCommentId);
    if (!activeComment) {
      onCommentTargetResolved?.({ commentId: activeCommentId, found: false });
      return;
    }

    const range = resolveCommentRange(activeComment, editor.state.doc.content.size);
    if (!range) {
      onCommentTargetResolved?.({ commentId: activeCommentId, found: false });
      return;
    }

    let targetNode = null;

    try {
      targetNode = editor.view.domAtPos(range.start).node;
    } catch {
      onCommentTargetResolved?.({ commentId: activeCommentId, found: false });
      return;
    }

    const targetElement = targetNode?.nodeType === Node.TEXT_NODE
      ? targetNode.parentElement
      : targetNode instanceof Element
        ? targetNode
        : null;

    if (!targetElement) {
      onCommentTargetResolved?.({ commentId: activeCommentId, found: false });
      return;
    }

    onCommentTargetResolved?.({ commentId: activeCommentId, found: true });
    window.requestAnimationFrame(() => {
      targetElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest',
      });
    });
  }, [activeCommentId, activeCommentRequestKey, comments, editor, mode, onCommentTargetResolved]);

  const pageTrackHeight = Math.max(
    PAGE_HEIGHT,
    (pageCount * PAGE_HEIGHT) + (Math.max(pageCount - 1, 0) * PAGE_GAP)
  );

  return (
    <div className="editor-container" style={{ '--editor-scale': `${(zoomLevel || 100) / 100}` }}>
      <div className="editor-content-wrapper">
        <div className="document-container">
          <div className="document-shell" style={{ '--page-track-height': `${pageTrackHeight}px` }}>
            <div className="page-stack" aria-hidden="true">
              {Array.from({ length: pageCount }, (_, index) => (
                <div className="page" key={`page-${index}`} />
              ))}
            </div>

            <div className={`editor-root-wrapper ${mode === 'preview' ? 'editor-root-wrapper-preview-hidden' : ''}`}>
              <EditorContent editor={editor} />
            </div>

            {mode === 'preview' && previewVersion ? (
              <div
                className="editor-preview-layer"
                onClick={onPreviewExit}
                role="button"
                tabIndex={-1}
                aria-label="Exit version preview"
              >
                <VersionPreview
                  stateBuffer={previewVersion.stateBuffer}
                  currentText={currentComparableText}
                  versionAuthorName={previewVersion.createdBy?.name || 'System'}
                  currentVersionAuthorName={currentVersionAuthorName}
                />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditorComponent;
