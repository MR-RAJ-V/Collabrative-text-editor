import React from 'react';
import { FileText, Lock } from 'lucide-react';

const Header = ({
  title,
  titleInputRef,
  onTitleChange,
  canEdit,
  saveStatus,
  lastSaved,
  docAccess,
  menuContent,
  actionContent,
  toolbarContent,
  rightContent,
}) => (
  <header className="workspace-header">
    <div className="workspace-topbar">
      <div className="workspace-brand-block">
        <div className="workspace-brand-row">
          <div className="docs-badge">
            <FileText size={20} />
          </div>
          <div className="workspace-header-left">
            <input
              ref={titleInputRef}
              className="doc-title-input"
              value={title}
              onChange={onTitleChange}
              readOnly={!canEdit}
              placeholder="Untitled Document"
            />
            <div className="workspace-meta">
              <div className="status">
                {saveStatus === 'Offline'
                  ? <span className="saving">Offline</span>
                  : saveStatus === 'Saving...'
                    ? <span className="saving">Saving...</span>
                    : <span className="saved">{saveStatus}</span>}
              </div>
              {lastSaved ? <span className="last-saved">Last updated {lastSaved.toLocaleTimeString()}</span> : null}
              {docAccess ? <span className="last-saved">Role: {docAccess.role}</span> : null}
            </div>
          </div>
        </div>

      </div>

      <div className="workspace-header-right workspace-header-right-top">
        <button className="workspace-mode-chip" title="Access">
          <Lock size={14} />
          <span>{docAccess?.role || 'Private'}</span>
        </button>
        {rightContent}
      </div>
    </div>

    <div className="workspace-menu-strip">
      <div className="workspace-menu-strip-left">
        {menuContent}
      </div>
      <div className="workspace-menu-strip-right">
        {actionContent}
      </div>
    </div>

    <div className="workspace-toolbar-row">
      {toolbarContent}
    </div>
  </header>
);

export default Header;
