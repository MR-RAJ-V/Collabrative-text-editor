import React from 'react';

const EditorLayout = ({
  sidebar,
  children,
  isSidebarOpen,
  onToggleSidebar,
  onCloseSidebar,
  sidebarMode = 'desktop',
  headerOffset = 138,
}) => {
  const isDesktop = sidebarMode === 'desktop';
  const isOverlayMode = sidebarMode !== 'desktop';
  const showSidebar = isDesktop || isSidebarOpen;

  return (
    <main
      className={`editor-layout editor-layout-${sidebarMode}`}
      style={{ '--workspace-header-offset': `${headerOffset}px` }}
    >
      <div className={`editor-workspace ${showSidebar ? 'sidebar-visible' : 'sidebar-hidden'}`}>
        {!isDesktop ? (
          <button
            type="button"
            className={`sidebar-toggle-button ${isSidebarOpen ? 'sidebar-toggle-button-hidden' : ''}`}
            onClick={onToggleSidebar}
            aria-label="Open documents menu"
            title="Open documents menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
        ) : null}

        {isOverlayMode && isSidebarOpen ? (
          <button
            type="button"
            className={`editor-layout-backdrop ${sidebarMode === 'mobile' ? 'editor-layout-backdrop-fixed' : ''}`}
            aria-label="Close documents menu"
            onClick={onCloseSidebar || onToggleSidebar}
          />
        ) : null}

        <div className="editor-sidebar-shell">
          {sidebar}
        </div>

        <div className="editor-stage">
          {children}
        </div>
      </div>
    </main>
  );
};

export default EditorLayout;
