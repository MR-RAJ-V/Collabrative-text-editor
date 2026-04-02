import React from 'react';
import './SidebarPanels.css';

const SearchPanel = ({
  searchQuery,
  replaceValue,
  matchCount,
  currentMatch,
  onSearchChange,
  onReplaceChange,
  onNext,
  onReplaceOne,
  onReplaceAll,
  onClose,
  panelRef,
}) => {
  return (
    <aside className="sidebar-panel" ref={panelRef}>
      <div className="sidebar-header">
        <h3>Search</h3>
        <button className="sidebar-close" onClick={onClose}>×</button>
      </div>
      <div className="sidebar-content">
        <div className="panel-card">
          <label className="panel-label" htmlFor="search-query">Search</label>
          <input
            id="search-query"
            className="panel-input"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Find text"
          />
          <label className="panel-label" htmlFor="replace-query">Replace</label>
          <input
            id="replace-query"
            className="panel-input"
            value={replaceValue}
            onChange={(event) => onReplaceChange(event.target.value)}
            placeholder="Replace with"
          />
          <p className="panel-subtle">
            {matchCount === 0 ? 'No matches' : `Match ${Math.min(currentMatch + 1, matchCount)} of ${matchCount}`}
          </p>
          <div className="panel-row">
            <button className="panel-secondary" disabled={matchCount === 0} onClick={onNext}>Next</button>
            <button className="panel-secondary" disabled={matchCount === 0} onClick={onReplaceOne}>Replace</button>
            <button className="panel-primary" disabled={matchCount === 0} onClick={onReplaceAll}>Replace all</button>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default SearchPanel;
