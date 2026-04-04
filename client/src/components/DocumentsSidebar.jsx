import React, { memo, useState } from 'react';
import { ChevronLeft, FileText, Plus, Trash2 } from 'lucide-react';

const DocumentsSidebar = ({
  documents,
  activeDocumentId,
  onCreateDocument,
  onDeleteDocument,
  onNavigate,
  onRenameDocument,
  onToggle,
  canCollapse = true,
}) => {
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
      {canCollapse ? (
        <div className="outline-sidebar-top">
          <button className="outline-icon-button" title="Collapse navigation" onClick={onToggle}>
            <ChevronLeft size={18} />
          </button>
        </div>
      ) : null}

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
                  <div className="outline-doc-main">
                    <FileText size={16} className="outline-doc-icon" />
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
                        className="outline-doc-input"
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span 
                        className="outline-doc-title"
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
