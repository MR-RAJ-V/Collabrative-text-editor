import React from 'react';

const EditorLayout = ({ sidebar, children, isSidebarOpen, onToggleSidebar }) => (
  <main className="editor-layout">
    <div className={`editor-workspace ${!isSidebarOpen ? 'sidebar-collapsed' : ''}`}>
      {!isSidebarOpen ? (
        <button 
          className="sidebar-uncollapse-button"
          onClick={onToggleSidebar}
          title="Open documents menu"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
      ) : null}
      
      {sidebar}
      
      <div className="editor-stage">
        {children}
      </div>
    </div>
  </main>
);

export default EditorLayout;
