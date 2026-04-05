import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import './SidebarPanels.css';

const CommentsPanel = ({
  comments,
  selection,
  activeCommentId,
  missingCommentTargetId,
  currentUserName,
  canManageComments,
  onAddComment,
  onReply,
  onResolveToggle,
  onSelectComment,
  onDeleteComment,
  onClose,
  panelRef,
}) => {
  const [draft, setDraft] = useState('');
  const [replyDrafts, setReplyDrafts] = useState({});
  const [deletePendingId, setDeletePendingId] = useState('');
  const [actionError, setActionError] = useState('');

  const hasSelection = selection && selection.from !== selection.to;
  const canCreateComment = typeof onAddComment === 'function';
  const canReply = typeof onReply === 'function';
  const canResolve = typeof onResolveToggle === 'function';
  const canDelete = typeof onDeleteComment === 'function';

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
          {actionError ? <p className="comment-action-error">{actionError}</p> : null}
          {comments.length === 0 ? (
            <p className="panel-subtle">No comments yet.</p>
          ) : comments.map((comment) => (
            <div
              className={`panel-card comment-thread-card ${activeCommentId === comment._id ? 'comment-thread-card-active' : ''}`.trim()}
              key={comment._id}
              onClick={() => {
                setActionError('');
                onSelectComment?.(comment._id);
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setActionError('');
                  onSelectComment?.(comment._id);
                }
              }}
            >
              <div className="comment-title-row">
                <div className="comment-title-meta">
                  <strong style={{ color: comment.color }}>{comment.user}</strong>
                  <span className={`pill ${comment.resolved ? 'pill-muted' : 'pill-active'}`}>
                    {comment.resolved ? 'Resolved' : 'Open'}
                  </span>
                </div>
                {canDelete && (canManageComments || currentUserName === comment.user) ? (
                  <button
                    type="button"
                    className="comment-delete-button"
                    disabled={deletePendingId === comment._id}
                    onClick={async (event) => {
                      event.stopPropagation();
                      setActionError('');
                      setDeletePendingId(comment._id);

                      try {
                        await onDeleteComment?.(comment._id);
                      } catch (error) {
                        setActionError(error?.response?.data?.message || error?.message || 'Failed to delete comment');
                      } finally {
                        setDeletePendingId('');
                      }
                    }}
                    aria-label="Delete comment"
                    title="Delete comment"
                  >
                    <Trash2 size={14} />
                    <span>{deletePendingId === comment._id ? 'Deleting...' : 'Delete'}</span>
                  </button>
                ) : null}
              </div>
              <p className="comment-selected-text">{comment.selectedText || 'Comment range'}</p>
              {activeCommentId === comment._id && missingCommentTargetId === comment._id ? (
                <p className="comment-missing-text">Text not found</p>
              ) : null}
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
                onClick={(event) => event.stopPropagation()}
                disabled={!canReply}
              />
              <div className="panel-row">
                <button
                  className="panel-secondary"
                  disabled={!canReply || !replyDrafts[comment._id]?.trim()}
                  onClick={(event) => {
                    event.stopPropagation();
                    onReply?.(comment._id, replyDrafts[comment._id].trim());
                    setReplyDrafts((value) => ({ ...value, [comment._id]: '' }));
                  }}
                >
                  Reply
                </button>
                <button
                  className="panel-secondary"
                  disabled={!canResolve}
                  onClick={(event) => {
                    event.stopPropagation();
                    onResolveToggle?.(comment._id, !comment.resolved);
                  }}
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
