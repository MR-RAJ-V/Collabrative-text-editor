import React from 'react';
import { History, MessageSquare, Search } from 'lucide-react';

const HeaderActions = ({ activePanel, onToggleComments, onToggleHistory, onToggleSearch }) => (
  <div className="header-actions">
    <button
      className={`header-action-button ${activePanel === 'comments' ? 'header-action-button-active' : ''}`}
      onClick={onToggleComments}
      title="Comments"
      aria-label="Comments"
    >
      <MessageSquare size={18} />
    </button>
    <button
      className={`header-action-button ${activePanel === 'history' ? 'header-action-button-active' : ''}`}
      onClick={onToggleHistory}
      title="History"
      aria-label="History"
    >
      <History size={18} />
    </button>
    <button
      className={`header-action-button ${activePanel === 'search' ? 'header-action-button-active' : ''}`}
      onClick={onToggleSearch}
      title="Search"
      aria-label="Search"
    >
      <Search size={18} />
    </button>
  </div>
);

export default HeaderActions;
