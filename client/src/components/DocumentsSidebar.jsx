import React, { memo, useState } from 'react';
import { ChevronLeft, FileText, Plus, Trash2 } from 'lucide-react';

const DocumentsSidebar = ({ documents, activeDocumentId, onCreateDocument, onDeleteDocument, onNavigate, onRenameDocument, onToggle }) => {
  const [editingId, setEditingId] = useState(null);
  const [tempTitle, setTempTitle] = useState("");

  const startEditing = (doc) => {
    setEditingId(doc.documentId || doc.id || doc._id);
    setTempTitle(doc.title || 'Untitled Document');
  };

  const handleRename = () => {
    if (editingId) {
      if (onRenameDocument) {
        onRenameDocument(editingId, tempTitle.trim() || 'Untitled Document');
      }
    }
    setEditingId(null);
  };
  return (
    <aside className="outline-sidebar">
      <style>
        {`
          .outline-doc-item .doc-delete-button {
            opacity: 0;
            transition: opacity 0.15s ease, color 0.15s ease;
            right: 8px;
            position: absolute;
            background: var(--panel-bg, rgba(20,20,20));
          }
          .outline-doc-item:hover .doc-delete-button {
            opacity: 0.6;
          }
          .outline-doc-item .doc-delete-button:hover {
            opacity: 1;
            color: #ef4444; 
          }
          .outline-doc-item {
            position: relative;
            cursor: pointer;
            user-select: none;
          }
        `}
      </style>
      <div className="outline-sidebar-top">
        <button className="outline-icon-button" title="Collapse navigation" onClick={onToggle}>
          <ChevronLeft size={18} />
        </button>
      </div>

      <div className="outline-sidebar-body">
        <div className="outline-sidebar-header">
          <div>
            <p className="outline-label">Workspace</p>
            <h3>My Documents</h3>
          </div>
          <button className="outline-icon-button" title="Create Document" onClick={onCreateDocument}>
            <Plus size={16} />
          </button>
        </div>

        {documents && documents.length > 0 ? (
          <div className="outline-list">
            {documents.map((doc) => {
              const docId = doc.documentId || doc.id || doc._id;
              const isActive = activeDocumentId === docId;
              
              return (
                <div 
                  key={docId} 
                  className={`outline-item outline-doc-item ${isActive ? 'outline-item-active' : ''}`}
                  onClick={() => onNavigate(docId)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingLeft: '12px' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', paddingRight: '24px', flex: 1 }}>
                    <FileText size={16} style={{ flexShrink: 0, opacity: 0.7 }} />
                    {editingId === docId ? (
                      <input
                        value={tempTitle}
                        onChange={(e) => setTempTitle(e.target.value)}
                        onBlur={handleRename}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRename();
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        autoFocus
                        style={{
                          background: 'transparent',
                          color: 'var(--text-color)',
                          border: '1px solid #1a73e8',
                          borderRadius: '4px',
                          padding: '2px 4px',
                          outline: 'none',
                          width: '100%',
                          fontSize: 'inherit',
                          fontFamily: 'inherit'
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span 
                        style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', width: '100%' }}
                        onDoubleClick={() => startEditing(doc)}
                      >
                        {doc.title || 'Untitled Document'}
                      </span>
                    )}
                  </div>
                  
                  <button 
                    className="outline-icon-button doc-delete-button" 
                    title="Delete document"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(`Are you sure you want to delete "${doc.title || 'Untitled Document'}"?`)) {
                        onDeleteDocument(docId);
                      }
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="outline-empty" style={{ opacity: 0.7, padding: '0 16px' }}>
            No documents yet. Click the + icon to create one.
          </p>
        )}
      </div>
    </aside>
  );
};

export default memo(DocumentsSidebar);
