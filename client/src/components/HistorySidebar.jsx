import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Clock, Save, Tag } from 'lucide-react';
import { socket } from '../services/socket';
import { createVersion, listVersions } from '../services/versionService';
import { formatDiffSummary, getDiffStats } from '../utils/versionUtils';
import './HistoryPanel.css';

const formatVersionHeading = (version) => {
  if (version.name) {
    return version.name;
  }

  return new Date(version.createdAt).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
};

const getGroupLabel = (createdAt) => {
  const targetDate = new Date(createdAt);
  const today = new Date();
  const targetStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diffDays = Math.round((todayStart - targetStart) / 86400000);

  if (diffDays === 0) {
    return 'Today';
  }

  if (diffDays === 1) {
    return 'Yesterday';
  }

  return targetDate.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: targetDate.getFullYear() === today.getFullYear() ? undefined : 'numeric',
  });
};

const sortVersionsDescending = (versions) => [...versions].sort(
  (left, right) => new Date(right.createdAt) - new Date(left.createdAt),
);

const groupVersionsByDate = (versions) => sortVersionsDescending(versions).reduce((groups, version) => {
  const key = getGroupLabel(version.createdAt);

  if (!groups[key]) {
    groups[key] = [];
  }

  groups[key].push(version);
  return groups;
}, {});

const HistorySidebar = ({
  documentId,
  currentUser,
  canEdit,
  onClose,
  panelRef,
  selectedVersionId,
  selectedVersion,
  previewLoading,
  mode,
  currentText,
  onSelectVersion,
  onBackToCurrent,
  onVersionsLoaded,
}) => {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saveName, setSaveName] = useState('');
  const [saveSummary, setSaveSummary] = useState('');
  const [isSavingVersion, setIsSavingVersion] = useState(false);

  const loadVersions = useCallback(async () => {
    setLoading(true);

    try {
      const data = await listVersions(documentId);
      setVersions(data);
      onVersionsLoaded?.(data);
    } catch (error) {
      console.error('Failed to load versions:', error);
    } finally {
      setLoading(false);
    }
  }, [documentId, onVersionsLoaded]);

  useEffect(() => {
    loadVersions();
  }, [loadVersions]);

  useEffect(() => {
    const handleVersionEvent = () => {
      loadVersions();
    };

    socket.on('version-created', handleVersionEvent);
    socket.on('version-restored', handleVersionEvent);

    return () => {
      socket.off('version-created', handleVersionEvent);
      socket.off('version-restored', handleVersionEvent);
    };
  }, [loadVersions]);

  const groupedVersions = useMemo(() => {
    const enrichedVersions = versions.map((version) => {
      const diffStats = getDiffStats(version.textSnapshot || '', currentText || '');

      return {
        ...version,
        diffStats,
        diffSummary: formatDiffSummary(diffStats),
      };
    });

    return groupVersionsByDate(enrichedVersions);
  }, [currentText, versions]);

  const handleSaveVersion = async () => {
    setIsSavingVersion(true);

    try {
      await createVersion(documentId, {
        createdBy: currentUser,
        summary: saveSummary.trim() || undefined,
        name: saveName.trim() || undefined,
        isNamedVersion: Boolean(saveName.trim()),
        trigger: 'manual',
      });

      setSaveName('');
      setSaveSummary('');
      await loadVersions();
    } catch (error) {
      console.error('Failed to save version:', error);
    } finally {
      setIsSavingVersion(false);
    }
  };

  return (
    <>
      <div className="history-sidebar-backdrop" />
      <aside className="history-sidebar" ref={panelRef}>
        <div className="history-header">
          <div>
            <h3>Version History</h3>
            <p className="history-subtitle">Select a version to preview it in the main editor.</p>
          </div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="history-sidebar-content history-sidebar-content-single">
          <div className="history-sidebar-column history-sidebar-column-single">
            <div className="panel-card version-save-card">
              <label className="panel-label" htmlFor="version-name">Save a version</label>
              <input
                id="version-name"
                className="panel-input"
                value={saveName}
                onChange={(event) => setSaveName(event.target.value)}
                placeholder="Optional name, like Final Draft"
              />
              <input
                className="panel-input"
                value={saveSummary}
                onChange={(event) => setSaveSummary(event.target.value)}
                placeholder="Optional summary"
              />
              <button className="panel-primary version-save-button" disabled={!canEdit || isSavingVersion} onClick={handleSaveVersion}>
                <Save size={15} />
                {isSavingVersion ? 'Saving...' : 'Save Version'}
              </button>
            </div>

            {mode === 'preview' ? (
              <div className="panel-card history-mode-card">
                <p className="panel-label">Viewing in editor</p>
                <p className="panel-subtle">
                  {previewLoading
                    ? 'Loading selected version...'
                    : selectedVersion
                      ? `${selectedVersion.createdBy?.name || 'System'} · ${new Date(selectedVersion.createdAt).toLocaleString()}`
                      : 'Previewing a historical version.'}
                </p>
                <button className="secondary-chip history-mode-button" onClick={onBackToCurrent}>
                  Back to current
                </button>
              </div>
            ) : null}

            <div className="version-list-shell version-list-shell-sidebar">
              {loading ? (
                <p className="history-msg">Loading versions...</p>
              ) : versions.length === 0 ? (
                <p className="history-msg">No versions saved yet.</p>
              ) : (
                Object.entries(groupedVersions).map(([dateLabel, items]) => (
                  <div key={dateLabel} className="version-group">
                    <p className="version-group-label">{dateLabel}</p>
                    <ul className="history-list">
                      {items.map((version) => {
                        const isActive = version.versionId === selectedVersionId && mode === 'preview';

                        return (
                          <li key={version.versionId}>
                            <button
                              type="button"
                              className={`history-item version-list-item ${isActive ? 'version-list-item-active' : ''}`}
                              onClick={() => onSelectVersion(version.versionId)}
                            >
                              <div className="history-meta">
                                <div className="version-author-row">
                                  <span className="version-author-name">{version.createdBy?.name || 'System'}</span>
                                  <span className="version-version-heading">{formatVersionHeading(version)}</span>
                                </div>
                                <small className="version-summary-copy">{version.summary || 'Snapshot saved'}</small>
                                <small className={`version-diff-summary ${!version.diffStats.added && !version.diffStats.removed ? 'version-diff-summary-empty' : ''}`}>
                                  {version.diffSummary}
                                </small>
                              </div>
                              <div className="version-list-tags">
                                <span className="version-tag">
                                  <Clock size={12} />
                                  {new Date(version.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                </span>
                                {version.name ? (
                                  <span className="version-tag version-tag-accent">
                                    <Tag size={12} />
                                    Named
                                  </span>
                                ) : version.isAutoSave === false ? (
                                  <span className="version-tag">
                                    Manual
                                  </span>
                                ) : (
                                  <span className="version-tag">
                                    Auto
                                  </span>
                                )}
                              </div>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default HistorySidebar;
