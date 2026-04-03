import React, { useState, useCallback } from 'react';
import { Page } from './Page';
import './styles.css';

export const DocumentManager = ({ initialTitle }) => {
  const [pages, setPages] = useState([{ id: crypto.randomUUID(), content: '' }]);
  const [title, setTitle] = useState(initialTitle || 'Untitled Document');

  const handleUpdate = useCallback((id, content) => {
    setPages((prev) => prev.map((p) => (p.id === id ? { ...p, content } : p)));
  }, []);

  const handleAddPage = useCallback(() => {
    setPages((prev) => [...prev, { id: crypto.randomUUID(), content: '' }]);
    // Scroll to new page after a short delay
    setTimeout(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }, 100);
  }, []);

  const handleDeletePage = useCallback((id) => {
    setPages((prev) => {
      if (prev.length <= 1) return prev; // Never allow deleting the last page
      return prev.filter((p) => p.id !== id);
    });
  }, []);

  const handleOverflow = useCallback((id) => {
    setPages((prev) => {
      const idx = prev.findIndex((p) => p.id === id);
      if (idx === -1) return prev;

      const newPages = [...prev];
      // Append node safely to the next page or create one
      if (idx === newPages.length - 1) {
        newPages.push({ id: crypto.randomUUID(), content: '' }); // We can't strictly inject raw JSON easily into empty HTML string on mount without deeper TipTap refs, so just spawning page is step 1.
      }
      return newPages;
    });
  }, []);

  const handleMergeUp = useCallback((id) => {
    setPages((prev) => {
      const idx = prev.findIndex((p) => p.id === id);
      if (idx <= 0) return prev;

      // Focus the previous page
      const prevPageId = prev[idx - 1].id;
      const el = document.getElementById(`page-container-${prevPageId}`);
      if (el) {
        const editorContent = el.querySelector('.ProseMirror');
        if (editorContent) editorContent.focus();
      }
      return prev;
    });
  }, []);

  return (
    <div className="document-manager-wrapper">
      <header className="document-manager-header">
        <input
          className="document-manager-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <div className="document-manager-actions">
          <span className="badge-local">Local Mode (Offline)</span>
        </div>
      </header>

      <div className="page-manager">
        {pages.map((page, index) => (
          <Page
            key={page.id}
            id={page.id}
            content={page.content}
            index={index}
            isLast={index === pages.length - 1}
            totalPages={pages.length}
            onUpdate={handleUpdate}
            onDelete={handleDeletePage}
            onAddPage={handleAddPage}
            onOverflow={handleOverflow}
            onMergeUp={() => handleMergeUp(page.id)}
          />
        ))}
      </div>
    </div>
  );
};
