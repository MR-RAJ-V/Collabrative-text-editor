import React, { useState } from 'react';
import './ShareModal.css';

const ShareModal = ({
  permissions,
  shareableLink,
  onClose,
  onShare,
  onUpdateLinkSettings,
}) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('viewer');
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    if (!email.trim()) {
      return;
    }

    setPending(true);
    try {
      await onShare({ email: email.trim(), role });
      setEmail('');
    } finally {
      setPending(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard?.writeText(shareableLink);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <aside className="share-modal">
      <div className="sidebar-header">
        <h3>Share Document</h3>
        <button className="sidebar-close" onClick={onClose}>×</button>
      </div>
      <div className="sidebar-content">
        <div className="panel-card">
          <p className="panel-label">Invite by email</p>
          <input
            className="panel-input"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="collaborator@example.com"
          />
          <select className="panel-input" value={role} onChange={(event) => setRole(event.target.value)}>
            <option value="viewer">Viewer</option>
            <option value="commenter">Commenter</option>
            <option value="editor">Editor</option>
          </select>
          <button className="panel-primary" disabled={pending} onClick={handleShare}>
            {pending ? 'Sharing...' : 'Share'}
          </button>
        </div>

        <div className="panel-card">
          <p className="panel-label">Link access</p>
          <select
            className="panel-input"
            value={permissions?.visibility || 'private'}
            onChange={(event) => onUpdateLinkSettings({ visibility: event.target.value })}
          >
            <option value="private">Private</option>
            <option value="link">Anyone with link</option>
          </select>
          <select
            className="panel-input"
            value={permissions?.linkRole || 'viewer'}
            onChange={(event) => onUpdateLinkSettings({ linkRole: event.target.value })}
          >
            <option value="viewer">Viewer</option>
            <option value="commenter">Commenter</option>
            <option value="editor">Editor</option>
          </select>
          <div className="share-link-row">
            <input className="panel-input" readOnly value={shareableLink} />
            <button className="panel-secondary" onClick={handleCopy}>
              {copied ? 'Copied' : 'Copy Link'}
            </button>
          </div>
        </div>

        <div className="panel-card">
          <p className="panel-label">People with access</p>
          <div className="share-list">
            <div className="share-person">
              <strong>{permissions?.owner?.name || 'Owner'}</strong>
              <span>{permissions?.owner?.email}</span>
              <span className="pill pill-active">Owner</span>
            </div>
            {(permissions?.collaborators || []).map((item) => (
              <div key={`${item.user?.id}-${item.role}`} className="share-person">
                <strong>{item.user?.name}</strong>
                <span>{item.user?.email}</span>
                <span className="pill pill-muted">{item.role}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
};

export default ShareModal;
