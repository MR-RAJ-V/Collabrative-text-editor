import React, { useState } from 'react';
import './SidebarPanels.css';

const SuggestionsPanel = ({
  mode,
  setMode,
  selection,
  suggestions,
  onSuggestInsert,
  onSuggestDelete,
  onUpdateSuggestion,
  onClose,
}) => {
  const [insertDraft, setInsertDraft] = useState('');
  const hasSelection = selection && selection.from !== selection.to;

  return (
    <aside className="sidebar-panel">
      <div className="sidebar-header">
        <h3>Suggestions</h3>
        <button className="sidebar-close" onClick={onClose}>×</button>
      </div>
      <div className="sidebar-content">
        <div className="panel-card">
          <p className="panel-label">Mode</p>
          <div className="panel-row">
            <button className={mode === 'edit' ? 'panel-primary' : 'panel-secondary'} onClick={() => setMode('edit')}>
              Edit
            </button>
            <button className={mode === 'suggest' ? 'panel-primary' : 'panel-secondary'} onClick={() => setMode('suggest')}>
              Suggest
            </button>
          </div>
          <p className="panel-subtle">
            In suggest mode, the editor becomes read-only and changes are added as suggestions instead of directly editing the document.
          </p>
          <textarea
            className="panel-textarea"
            rows="3"
            placeholder="Suggested insertion"
            value={insertDraft}
            onChange={(event) => setInsertDraft(event.target.value)}
          />
          <button
            className="panel-primary"
            disabled={!insertDraft.trim()}
            onClick={() => {
              onSuggestInsert(insertDraft.trim());
              setInsertDraft('');
            }}
          >
            Suggest insert at cursor
          </button>
          <button
            className="panel-secondary"
            disabled={!hasSelection}
            onClick={() => onSuggestDelete()}
          >
            Suggest delete selection
          </button>
        </div>

        <div className="panel-list">
          {suggestions.length === 0 ? (
            <p className="panel-subtle">No suggestions yet.</p>
          ) : suggestions.map((suggestion) => (
            <div className="panel-card" key={suggestion._id}>
              <div className="comment-title-row">
                <strong style={{ color: suggestion.color }}>{suggestion.user}</strong>
                <span className={`pill ${suggestion.status === 'pending' ? 'pill-active' : 'pill-muted'}`}>
                  {suggestion.status}
                </span>
              </div>
              <p className={suggestion.type === 'delete' ? 'suggestion-delete' : 'suggestion-insert'}>
                {suggestion.type === 'insert' ? `Insert: ${suggestion.content}` : `Delete: ${suggestion.content}`}
              </p>
              <p className="panel-subtle">
                Range: {suggestion.position.start} - {suggestion.position.end}
              </p>
              <div className="panel-row">
                <button
                  className="panel-primary"
                  disabled={suggestion.status !== 'pending'}
                  onClick={() => onUpdateSuggestion(suggestion, 'accepted')}
                >
                  Accept
                </button>
                <button
                  className="panel-secondary"
                  disabled={suggestion.status !== 'pending'}
                  onClick={() => onUpdateSuggestion(suggestion, 'rejected')}
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
};

export default SuggestionsPanel;
