import React, { useRef, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Trash2, Plus } from 'lucide-react';
import { Extension } from '@tiptap/core';
import './styles.css';

export const Page = ({
  id,
  content,
  isLast,
  totalPages,
  onUpdate,
  onOverflow,
  onMergeUp,
  onDelete,
  onAddPage,
}) => {
  const containerRef = useRef(null);

  const BackspaceHandler = Extension.create({
    name: 'backspaceHandler',
    addKeyboardShortcuts() {
      return {
        Backspace: () => {
          const { selection } = this.editor.state;
          const { empty, $anchor } = selection;
          if (empty && $anchor.pos === 1) {
            onMergeUp();
            return true;
          }
          return false;
        },
      };
    },
  });

  const editor = useEditor({
    extensions: [StarterKit, BackspaceHandler],
    content,
    onUpdate: ({ editor }) => {
      onUpdate(id, editor.getHTML());

      if (containerRef.current) {
        // Physical internal printable height is 864px (1056 - 96*2)
        if (containerRef.current.scrollHeight > 864) {
          const doc = editor.getJSON();
          if (doc.content && doc.content.length > 1) {
            const lastNode = doc.content.pop();
            editor.commands.setContent(doc);
            onOverflow(id, lastNode);
          }
        }
      }
    },
  });

  useEffect(() => {
    return () => {
      if (editor) {
        editor.destroy();
      }
    };
  }, [editor]);

  return (
    <div className="page-a4" id={`page-container-${id}`}>
      <div className="page-content" ref={containerRef}>
        <EditorContent editor={editor} />
      </div>

      {totalPages > 1 && (
        <div className="page-controls">
          <button className="page-delete-btn" title="Delete Page" onClick={() => onDelete(id)}>
            <Trash2 size={16} />
          </button>
        </div>
      )}

      {isLast && (
        <div className="page-add-container">
          <button className="page-add-btn" onClick={onAddPage}>
            <Plus size={16} /> Add Page
          </button>
        </div>
      )}
    </div>
  );
};
