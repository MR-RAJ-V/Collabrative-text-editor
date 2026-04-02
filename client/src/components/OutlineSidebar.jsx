import React from 'react';
import { ChevronLeft, FileText, Plus, MoreVertical } from 'lucide-react';

const OutlineSidebar = ({ title, headings, activeHeadingId, onJumpToHeading }) => (
  <aside className="outline-sidebar">
    <div className="outline-sidebar-top">
      <button className="outline-icon-button" title="Collapse navigation">
        <ChevronLeft size={18} />
      </button>
    </div>

    <div className="outline-sidebar-body">
      <div className="outline-sidebar-header">
        <div>
          <p className="outline-label">Document tabs</p>
          <h3>Outline</h3>
        </div>
        <button className="outline-icon-button" title="Create tab">
          <Plus size={16} />
        </button>
      </div>

      <button className="outline-tab-pill" title={title || 'Untitled document'}>
        <FileText size={16} />
        <span>{title || 'Untitled document'}</span>
        <MoreVertical size={16} />
      </button>

      {headings.length ? (
        <div className="outline-list">
          {headings.map((heading) => (
            <button
              key={heading.id}
              className={`outline-item ${activeHeadingId === heading.id ? 'outline-item-active' : ''}`}
              style={{ paddingLeft: `${12 + ((heading.level - 1) * 16)}px` }}
              onClick={() => onJumpToHeading?.(heading)}
            >
              <span>{heading.text}</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="outline-empty">
          Headings that you add to the document will appear here.
        </p>
      )}
    </div>
  </aside>
);

export default OutlineSidebar;
