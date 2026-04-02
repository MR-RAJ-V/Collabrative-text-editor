import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Clock, RotateCcw, Save, Tag } from 'lucide-react';
import VersionPreview from './VersionPreview';
import { socket } from '../services/socket';
import { createVersion, getVersion, listVersions } from '../services/versionService';
import { buildDiffSegments } from '../utils/versionUtils';
import './HistoryPanel.css';

const formatVersionLabel = (version) => {
  if (version.name) {
    return version.name;
  }

  return new Date(version.createdAt).toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

const groupVersionsByDate = (versions) => versions.reduce((groups, version) => {
  const key = new Date(version.createdAt).toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  if (!groups[key]) {
    groups[key] = [];
  }

  groups[key].push(version);
  return groups;
}, {});

const HistorySidebar = ({
  documentId,
  currentText,
  currentUser,
  canEdit,
  onClose,
  onRestoreVersion,
  panelRef,
}) => {
  const [versions, setVersions] = useState([]);
  const [selectedVersionId, setSelectedVersionId] = useState(null);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveSummary, setSaveSummary] = useState('');
  const [isSavingVersion, setIsSavingVersion] = useState(false);
  const [restorePendingId, setRestorePendingId] = useState(null);
  const loadVersions = useCallback(async ({ preserveSelection = true } = {}) => {
    setLoading(true);

    try {
      const data = await listVersions(documentId);
      setVersions(data);

      const nextSelectedId = preserveSelection && selectedVersionId
        ? (data.some((item) => item.versionId === selectedVersionId) ? selectedVersionId : data[0]?.versionId)
        : data[0]?.versionId;

      setSelectedVersionId(nextSelectedId || null);
    } catch (error) {
      console.error('Failed to load versions:', error);
    } finally {
      setLoading(false);
    }
  }, [documentId, selectedVersionId]);

  useEffect(() => {
    loadVersions({ preserveSelection: false });
  }, [documentId, loadVersions]);

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

  useEffect(() => {
    if (!selectedVersionId) {
      setSelectedVersion(null);
      return;
    }

    let cancelled = false;
    const loadSelectedVersion = async () => {
      setPreviewLoading(true);

      try {
        const version = await getVersion(documentId, selectedVersionId);
        if (!cancelled) {
          setSelectedVersion(version);
        }
      } catch (error) {
        if (!cancelled) {
          setSelectedVersion(null);
        }
        console.error('Failed to load version preview:', error);
      } finally {
        if (!cancelled) {
          setPreviewLoading(false);
        }
      }
    };

    loadSelectedVersion();

    return () => {
      cancelled = true;
    };
  }, [documentId, selectedVersionId]);

  const groupedVersions = useMemo(() => groupVersionsByDate(versions), [versions]);

  const diffSegments = useMemo(() => {
    if (!selectedVersion) {
      return [];
    }

    return buildDiffSegments(selectedVersion.textSnapshot || '', currentText || '');
  }, [currentText, selectedVersion]);

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
      await loadVersions({ preserveSelection: false });
    } catch (error) {
      console.error('Failed to save version:', error);
    } finally {
      setIsSavingVersion(false);
    }
  };

  const handleRestore = async () => {
    if (!selectedVersion) {
      return;
    }

    setRestorePendingId(selectedVersion.versionId);

    try {
      await onRestoreVersion(selectedVersion.versionId);
    } finally {
      setRestorePendingId(null);
    }
  };

  return (
    <>
      <div className="history-sidebar-backdrop" />
      <aside className="history-sidebar" ref={panelRef}>
        <div className="history-header">
          <div>
            <h3>Version History</h3>
            <p className="history-subtitle">Browse snapshots, compare changes, and restore safely.</p>
          </div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="history-sidebar-content">
          <div className="history-sidebar-column">
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
                        const isActive = version.versionId === selectedVersionId;

                        return (
                          <li key={version.versionId}>
                            <button
                              type="button"
                              className={`history-item version-list-item ${isActive ? 'version-list-item-active' : ''}`}
                              onClick={() => setSelectedVersionId(version.versionId)}
                            >
                              <div className="history-meta">
                                <span>{formatVersionLabel(version)}</span>
                                <small>{version.createdBy?.name || 'System'} · {version.summary || 'Snapshot saved'}</small>
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
                                ) : null}
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

          <div className="history-sidebar-preview">
            {!selectedVersionId ? (
              <div className="version-empty-state">
                <p>Select a version to load its preview.</p>
              </div>
            ) : previewLoading || !selectedVersion ? (
              <div className="version-empty-state">
                <p>Loading preview...</p>
              </div>
            ) : (
              <>
                <div className="version-toolbar">
                  <div>
                    <h4>{formatVersionLabel(selectedVersion)}</h4>
                    <p className="panel-subtle">
                      {selectedVersion.createdBy?.name || 'System'} saved this on{' '}
                      {new Date(selectedVersion.createdAt).toLocaleString()}.
                    </p>
                  </div>
                  <button
                    className="panel-primary version-restore-button"
                    disabled={!canEdit || restorePendingId === selectedVersion.versionId}
                    onClick={handleRestore}
                  >
                    <RotateCcw size={15} />
                    {restorePendingId === selectedVersion.versionId ? 'Restoring...' : 'Restore'}
                  </button>
                </div>

                <div className="panel-card">
                  <p className="panel-label">Preview</p>
                  <VersionPreview stateBuffer={selectedVersion.stateBuffer} />
                </div>

                <div className="panel-card">
                  <p className="panel-label">Diff vs current document</p>
                  <p className="panel-subtle">Green text was added after this snapshot. Red text was removed.</p>
                  <div className="version-diff">
                    {diffSegments.length === 0 ? (
                      <p className="panel-subtle">No text changes detected.</p>
                    ) : (
                      diffSegments.map((segment, index) => (
                        <span
                          key={`${segment.type}-${index}`}
                          className={`diff-token diff-token-${segment.type}`}
                        >
                          {segment.value}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

export default HistorySidebar;
