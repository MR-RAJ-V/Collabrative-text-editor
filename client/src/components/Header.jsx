import React from 'react';
import { CheckCircle2, FileText, LoaderCircle, Lock } from 'lucide-react';

const Header = ({
  headerRef,
  title,
  titleInputRef,
  onTitleChange,
  canEdit,
  saveStatus,
  lastSaved,
  onSaveStatusClick,
  canTriggerSave,
  formatSavedAtTime,
  docAccess,
  menuContent,
  actionContent,
  toolbarContent,
  rightContent,
}) => {
  const isSaving = saveStatus === 'Saving...';
  const isSaved = saveStatus === 'Saved';
  const isOffline = saveStatus === 'Offline';
  const statusToneClass = isSaving
    ? 'status-chip-saving'
    : isSaved
      ? 'status-chip-saved'
      : isOffline
        ? 'status-chip-offline'
        : 'status-chip-unsaved';
  const statusLabel = saveStatus;
  const statusTimestamp = lastSaved && formatSavedAtTime ? `Saved at ${formatSavedAtTime(lastSaved)}` : null;

  return (
    <header className="workspace-header" ref={headerRef}>
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
                <button
                  type="button"
                  className={`status-chip ${statusToneClass} ${canTriggerSave ? 'status-chip-clickable' : ''}`.trim()}
                  onClick={onSaveStatusClick}
                  disabled={!canTriggerSave}
                  title={canTriggerSave ? 'Save now' : statusLabel}
                >
                  {isSaving
                    ? <LoaderCircle size={14} className="status-icon status-icon-spinning" />
                    : isSaved
                      ? <CheckCircle2 size={14} className="status-icon" />
                      : <span className="status-dot" aria-hidden="true" />}
                  <span>{statusLabel}</span>
                </button>
                {statusTimestamp ? <span className="last-saved">{statusTimestamp}</span> : null}
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
};

export default Header;
