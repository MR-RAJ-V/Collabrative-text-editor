import React, { useEffect, useState } from 'react';
import './SidebarPanels.css';
import './ShareModal.css';

const ShareModal = ({
  permissions,
  shareableLink,
  onClose,
  onUpdateLinkSettings,
}) => {
  const currentVisibility = permissions?.visibility || 'private';
  const currentLinkRole = permissions?.linkRole || 'viewer';
  const [settingsPending, setSettingsPending] = useState(false);
  const [copyPending, setCopyPending] = useState(false);
  const [settingsError, setSettingsError] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [linkVisibility, setLinkVisibility] = useState(currentVisibility);
  const [linkRole, setLinkRole] = useState(currentLinkRole);

  useEffect(() => {
    setLinkVisibility(currentVisibility);
  }, [currentVisibility]);

  useEffect(() => {
    setLinkRole(currentLinkRole);
  }, [currentLinkRole]);

  const handleUpdateLinkSettings = async (changes) => {
    const nextVisibility = changes.visibility ?? linkVisibility;
    const nextLinkRole = changes.linkRole ?? linkRole;

    if (changes.visibility !== undefined) {
      setLinkVisibility(changes.visibility);
    }

    if (changes.linkRole !== undefined) {
      setLinkRole(changes.linkRole);
    }

    setSettingsPending(true);
    setSettingsError('');
    setFeedbackMessage('');

    try {
      await onUpdateLinkSettings({
        visibility: nextVisibility,
        linkRole: nextLinkRole,
      });
      setFeedbackMessage('Sharing settings updated.');
    } catch (error) {
      setLinkVisibility(currentVisibility);
      setLinkRole(currentLinkRole);
      setSettingsError(error?.response?.data?.message || error?.message || 'Failed to update link access');
    } finally {
      setSettingsPending(false);
    }
  };

  const handleCopy = async () => {
    setCopyPending(true);
    setSettingsError('');

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareableLink);
      } else {
        const helperInput = document.createElement('textarea');
        helperInput.value = shareableLink;
        helperInput.setAttribute('readonly', '');
        helperInput.style.position = 'absolute';
        helperInput.style.left = '-9999px';
        document.body.appendChild(helperInput);
        helperInput.select();
        document.execCommand('copy');
        document.body.removeChild(helperInput);
      }

      setFeedbackMessage('Link copied to clipboard.');
    } catch (error) {
      setSettingsError(error?.message || 'Failed to copy link');
    } finally {
      setCopyPending(false);
    }
  };

  return (
    <aside className="share-modal">
      <div className="sidebar-header">
        <h3>Share Document</h3>
        <button className="sidebar-close" onClick={onClose}>×</button>
      </div>
      <div className="sidebar-content">
        <div className="panel-card">
          <p className="panel-label">Link access</p>
          <p className="panel-subtle">Share this document using a link only. Set who can open it, then copy the URL.</p>
          <select
            className="panel-input"
            value={linkVisibility}
            disabled={settingsPending}
            onChange={(event) => handleUpdateLinkSettings({ visibility: event.target.value })}
          >
            <option value="private">Private</option>
            <option value="public">Public</option>
          </select>
          <select
            className="panel-input"
            value={linkRole}
            disabled={settingsPending}
            onChange={(event) => handleUpdateLinkSettings({ linkRole: event.target.value })}
          >
            <option value="viewer">Viewer</option>
            <option value="editor">Editor</option>
          </select>
          <div className="share-link-row">
            <input className="panel-input" readOnly value={shareableLink} />
            <button className="panel-secondary" disabled={copyPending} onClick={handleCopy}>
              {copyPending ? 'Copying...' : 'Copy Link'}
            </button>
          </div>
          {feedbackMessage ? <p className="share-feedback share-feedback-success">{feedbackMessage}</p> : null}
          {settingsError ? <p className="share-feedback">{settingsError}</p> : null}
        </div>
      </div>
    </aside>
  );
};

export default ShareModal;
