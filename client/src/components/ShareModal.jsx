import React, { useCallback, useEffect, useRef, useState } from 'react';
import './SidebarPanels.css';
import './ShareModal.css';

const SHARE_UPDATE_DEBOUNCE_MS = 400;
const TOAST_DURATION_MS = 3200;

const normalizeSettings = (settings) => ({
  visibility: settings?.visibility === 'public' ? 'public' : 'private',
  linkRole: settings?.linkRole === 'editor' ? 'editor' : 'viewer',
});

const areSettingsEqual = (left, right) => (
  left?.visibility === right?.visibility && left?.linkRole === right?.linkRole
);

const ShareModal = ({
  permissions,
  shareableLink,
  onClose,
  onUpdateLinkSettings,
}) => {
  const currentVisibility = permissions?.visibility || 'private';
  const currentLinkRole = permissions?.linkRole || 'viewer';
  const [copyPending, setCopyPending] = useState(false);
  const [linkVisibility, setLinkVisibility] = useState(currentVisibility);
  const [linkRole, setLinkRole] = useState(currentLinkRole);
  const [committedSettings, setCommittedSettings] = useState(() => normalizeSettings({
    visibility: currentVisibility,
    linkRole: currentLinkRole,
  }));
  const [updatingFields, setUpdatingFields] = useState({
    visibility: false,
    linkRole: false,
  });
  const [toast, setToast] = useState(null);
  const committedSettingsRef = useRef(committedSettings);
  const queuedSettingsRef = useRef(null);
  const inFlightRef = useRef(null);
  const debounceTimeoutRef = useRef(0);
  const toastTimeoutRef = useRef(0);

  const syncCommittedSettings = useCallback((nextSettings) => {
    committedSettingsRef.current = nextSettings;
    setCommittedSettings(nextSettings);
  }, []);

  const syncLocalSettings = useCallback((nextSettings) => {
    setLinkVisibility(nextSettings.visibility);
    setLinkRole(nextSettings.linkRole);
  }, []);

  const clearDebounceTimer = useCallback(() => {
    if (debounceTimeoutRef.current) {
      window.clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = 0;
    }
  }, []);

  const showToast = useCallback((message, type = 'error') => {
    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
    }

    setToast({ message, type });
    toastTimeoutRef.current = window.setTimeout(() => {
      setToast(null);
      toastTimeoutRef.current = 0;
    }, TOAST_DURATION_MS);
  }, []);

  useEffect(() => {
    const nextSettings = normalizeSettings({
      visibility: currentVisibility,
      linkRole: currentLinkRole,
    });

    syncCommittedSettings(nextSettings);

    if (!queuedSettingsRef.current && !inFlightRef.current) {
      syncLocalSettings(nextSettings);
    }
  }, [currentLinkRole, currentVisibility, syncCommittedSettings, syncLocalSettings]);

  useEffect(() => () => {
    clearDebounceTimer();

    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
    }
  }, [clearDebounceTimer]);

  const persistQueuedSettings = useCallback(async () => {
    const nextSettings = queuedSettingsRef.current;

    if (!nextSettings || inFlightRef.current) {
      return;
    }

    const previousCommittedSettings = committedSettingsRef.current;
    const changedFields = {
      visibility: nextSettings.visibility !== previousCommittedSettings.visibility,
      linkRole: nextSettings.linkRole !== previousCommittedSettings.linkRole,
    };

    if (!changedFields.visibility && !changedFields.linkRole) {
      queuedSettingsRef.current = null;
      setUpdatingFields({ visibility: false, linkRole: false });
      return;
    }

    queuedSettingsRef.current = null;
    inFlightRef.current = nextSettings;
    setUpdatingFields(changedFields);

    try {
      await onUpdateLinkSettings(nextSettings);
      syncCommittedSettings(nextSettings);
    } catch (error) {
      const latestQueuedSettings = queuedSettingsRef.current;
      const hasNewerQueuedSettings = latestQueuedSettings && !areSettingsEqual(latestQueuedSettings, nextSettings);

      if (!hasNewerQueuedSettings) {
        syncCommittedSettings(previousCommittedSettings);
        syncLocalSettings(previousCommittedSettings);
      }

      showToast(error?.response?.data?.message || error?.message || 'Failed to update link access');
    } finally {
      inFlightRef.current = null;
      setUpdatingFields({ visibility: false, linkRole: false });

      if (queuedSettingsRef.current && !areSettingsEqual(queuedSettingsRef.current, committedSettingsRef.current)) {
        void persistQueuedSettings();
      }
    }
  }, [onUpdateLinkSettings, showToast, syncCommittedSettings, syncLocalSettings]);

  const queueSettingsUpdate = useCallback((nextSettings) => {
    queuedSettingsRef.current = nextSettings;
    clearDebounceTimer();

    debounceTimeoutRef.current = window.setTimeout(() => {
      debounceTimeoutRef.current = 0;
      void persistQueuedSettings();
    }, SHARE_UPDATE_DEBOUNCE_MS);
  }, [clearDebounceTimer, persistQueuedSettings]);

  const handleVisibilityChange = useCallback((event) => {
    const nextSettings = normalizeSettings({
      visibility: event.target.value,
      linkRole,
    });

    setToast(null);
    setLinkVisibility(nextSettings.visibility);

    if (!inFlightRef.current && areSettingsEqual(nextSettings, committedSettingsRef.current)) {
      queuedSettingsRef.current = null;
      clearDebounceTimer();
      return;
    }

    queueSettingsUpdate(nextSettings);
  }, [clearDebounceTimer, linkRole, queueSettingsUpdate]);

  const handleRoleChange = useCallback((event) => {
    const nextSettings = normalizeSettings({
      visibility: linkVisibility,
      linkRole: event.target.value,
    });

    setToast(null);
    setLinkRole(nextSettings.linkRole);

    if (!inFlightRef.current && areSettingsEqual(nextSettings, committedSettingsRef.current)) {
      queuedSettingsRef.current = null;
      clearDebounceTimer();
      return;
    }

    queueSettingsUpdate(nextSettings);
  }, [clearDebounceTimer, linkVisibility, queueSettingsUpdate]);

  const handleCopy = async () => {
    setCopyPending(true);
    setToast(null);

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

      showToast('Link copied to clipboard.', 'success');
    } catch (error) {
      showToast(error?.message || 'Failed to copy link');
    } finally {
      setCopyPending(false);
    }
  };

  const visibilityDirty = linkVisibility !== committedSettings.visibility;
  const roleDirty = linkRole !== committedSettings.linkRole;

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
          <label className="panel-label share-control-label" htmlFor="share-visibility">
            Visibility
          </label>
          <div className="share-control-wrap">
            <select
              id="share-visibility"
              className={`panel-input share-control-input ${visibilityDirty ? 'share-control-input-pending' : ''}`.trim()}
              value={linkVisibility}
              disabled={updatingFields.visibility}
              onChange={handleVisibilityChange}
            >
              <option value="private">Private</option>
              <option value="public">Public</option>
            </select>
            {visibilityDirty ? (
              <span className="share-control-status">
                <span className="share-inline-spinner" aria-hidden="true" />
                <span>{updatingFields.visibility ? 'Updating...' : 'Saving...'}</span>
              </span>
            ) : null}
          </div>
          <label className="panel-label share-control-label" htmlFor="share-role">
            Link role
          </label>
          <div className="share-control-wrap">
            <select
              id="share-role"
              className={`panel-input share-control-input ${roleDirty ? 'share-control-input-pending' : ''}`.trim()}
              value={linkRole}
              disabled={updatingFields.linkRole}
              onChange={handleRoleChange}
            >
              <option value="viewer">Viewer</option>
              <option value="editor">Editor</option>
            </select>
            {roleDirty ? (
              <span className="share-control-status">
                <span className="share-inline-spinner" aria-hidden="true" />
                <span>{updatingFields.linkRole ? 'Updating...' : 'Saving...'}</span>
              </span>
            ) : null}
          </div>
          <div className="share-link-row">
            <input className="panel-input" readOnly value={shareableLink} />
            <button className="panel-secondary" disabled={copyPending} onClick={handleCopy}>
              {copyPending ? 'Copying...' : 'Copy Link'}
            </button>
          </div>
        </div>
      </div>
      {toast ? (
        <div
          className={`share-toast share-toast-${toast.type}`.trim()}
          role={toast.type === 'error' ? 'alert' : 'status'}
          aria-live="polite"
        >
          {toast.message}
        </div>
      ) : null}
    </aside>
  );
};

export default ShareModal;
