import React, { useState } from 'react';
import './SidebarPanels.css';

const CommentsPanel = ({
  comments,
  selection,
  onAddComment,
  onReply,
  onResolveToggle,
  onClose,
  panelRef,
}) => {
  const [draft, setDraft] = useState('');
  const [replyDrafts, setReplyDrafts] = useState({});

  const hasSelection = selection && selection.from !== selection.to;
  const canCreateComment = typeof onAddComment === 'function';
  const canReply = typeof onReply === 'function';
  const canResolve = typeof onResolveToggle === 'function';

  return (
    <aside className="sidebar-panel" ref={panelRef}>
      <div className="sidebar-header">
        <h3>Comments</h3>
        <button className="sidebar-close" onClick={onClose}>×</button>
      </div>
      <div className="sidebar-content">
        <div className="panel-card">
          <p className="panel-label">Selected text</p>
          <p className="panel-subtle">{hasSelection ? selection.text : 'Select text in the editor to start a thread.'}</p>
          <textarea
            className="panel-textarea"
            rows="3"
            placeholder="Add a comment"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            disabled={!canCreateComment}
          />
          <button
            className="panel-primary"
            disabled={!canCreateComment || !hasSelection || !draft.trim()}
            onClick={() => {
              onAddComment?.(draft.trim());
              setDraft('');
            }}
          >
            Add comment
          </button>
        </div>

        <div className="panel-list">
          {comments.length === 0 ? (
            <p className="panel-subtle">No comments yet.</p>
          ) : comments.map((comment) => (
            <div className="panel-card" key={comment._id}>
              <div className="comment-title-row">
                <strong style={{ color: comment.color }}>{comment.user}</strong>
                <span className={`pill ${comment.resolved ? 'pill-muted' : 'pill-active'}`}>
                  {comment.resolved ? 'Resolved' : 'Open'}
                </span>
              </div>
              <p className="comment-selected-text">{comment.selectedText || 'Comment range'}</p>
              <p>{comment.message}</p>
              {(comment.comments || []).map((reply) => (
                <div className="comment-reply" key={reply._id || `${reply.user}-${reply.createdAt}`}>
                  <strong style={{ color: reply.color }}>{reply.user}</strong>
                  <p>{reply.message}</p>
                </div>
              ))}
              <textarea
                className="panel-textarea"
                rows="2"
                placeholder="Reply to thread"
                value={replyDrafts[comment._id] || ''}
                onChange={(event) => setReplyDrafts((value) => ({ ...value, [comment._id]: event.target.value }))}
                disabled={!canReply}
              />
              <div className="panel-row">
                <button
                  className="panel-secondary"
                  disabled={!canReply || !replyDrafts[comment._id]?.trim()}
                  onClick={() => {
                    onReply?.(comment._id, replyDrafts[comment._id].trim());
                    setReplyDrafts((value) => ({ ...value, [comment._id]: '' }));
                  }}
                >
                  Reply
                </button>
                <button
                  className="panel-secondary"
                  disabled={!canResolve}
                  onClick={() => onResolveToggle?.(comment._id, !comment.resolved)}
                >
                  {comment.resolved ? 'Reopen' : 'Resolve'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
};

export default CommentsPanel;
