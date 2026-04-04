import React from 'react';
import './Presence.css';

const dedupeUsers = (users = []) => {
  const byUserId = new Map();

  users.forEach((user) => {
    const key = user.userId || user.email || user.socketId;
    const existing = byUserId.get(key);

    if (!existing) {
      byUserId.set(key, { ...user, tabCount: 1 });
      return;
    }

    byUserId.set(key, {
      ...existing,
      socketId: existing.socketId || user.socketId,
      isTyping: Boolean(existing.isTyping || user.isTyping),
      isIdle: Boolean(existing.isIdle && user.isIdle),
      lastActivityAt: [existing.lastActivityAt, user.lastActivityAt].filter(Boolean).sort().at(-1) || existing.lastActivityAt,
      tabCount: (existing.tabCount || 1) + 1,
    });
  });

  return Array.from(byUserId.values());
};

const getPresenceUserKey = (user = {}) => user.userId || user.email || user.socketId;

const buildTypingSummary = (typingEntries) => {
  if (!typingEntries.length) {
    return '';
  }

  if (typingEntries.length === 1) {
    return `${typingEntries[0].userName} is typing...`;
  }

  if (typingEntries.length === 2) {
    return `${typingEntries[0].userName} and ${typingEntries[1].userName} are typing...`;
  }

  return `${typingEntries[0].userName} and ${typingEntries.length - 1} others are typing...`;
};

const Presence = ({ users, typingUsers = {}, currentUserId }) => {
  const uniqueUsers = dedupeUsers(users);
  const otherUsers = uniqueUsers.filter((user) => getPresenceUserKey(user) !== currentUserId);
  const typingEntries = Object.values(typingUsers)
    .filter((user) => user?.userId && user.userId !== currentUserId)
    .sort((left, right) => (right.timestamp || 0) - (left.timestamp || 0));
  const typingSummary = buildTypingSummary(typingEntries);

  if (!uniqueUsers.length) return null;

  return (
    <div className="presence-container">
      <span className="presence-label">Online:</span>
      <div className="presence-avatars">
        {uniqueUsers.map((user) => (
          <div
            key={getPresenceUserKey(user)}
            className="presence-avatar"
            style={{ backgroundColor: user.color || '#ccc' }}
            title={`${user.username}${user.tabCount > 1 ? ` (${user.tabCount} tabs)` : ''}${user.isIdle ? ' (idle)' : ''}`}
          >
            {user.avatar ? <img src={user.avatar} alt={user.username} className="presence-avatar-image" /> : user.username.substring(0, 1).toUpperCase()}
            {user.tabCount > 1 ? <span className="presence-tab-count">{user.tabCount}</span> : null}
          </div>
        ))}
      </div>
      <div className="presence-user-list">
        {otherUsers.slice(0, 3).map((user) => (
          <span className="presence-user-pill" key={`pill-${getPresenceUserKey(user)}`}>
            <span className="presence-user-dot" style={{ backgroundColor: user.color }} />
            {user.username}
            {user.tabCount > 1 ? ` (${user.tabCount} tabs)` : ''}
            {user.isIdle ? ' idle' : ' active'}
          </span>
        ))}
      </div>
      {typingSummary ? <div className="presence-typing-indicator">{typingSummary}</div> : null}
    </div>
  );
};

export default Presence;
