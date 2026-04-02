import React, { useEffect, useMemo } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import FontFamily from '@tiptap/extension-font-family';
import Collaboration from '@tiptap/extension-collaboration';
import * as Y from 'yjs';
import { FontSize } from './Editor/FontSize';
import { normalizeBinaryPayload } from '../utils/versionUtils';

const VersionPreview = ({ stateBuffer }) => {
  const ydoc = useMemo(() => {
    const doc = new Y.Doc();
    const bytes = normalizeBinaryPayload(stateBuffer);

    if (bytes.length) {
      Y.applyUpdate(doc, bytes);
    }

    return doc;
  }, [stateBuffer]);

  const editor = useEditor({
    editable: false,
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ history: false }),
      Underline,
      TextStyle,
      FontFamily,
      FontSize,
      Collaboration.configure({
        document: ydoc,
      }),
    ],
  }, [ydoc]);

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
