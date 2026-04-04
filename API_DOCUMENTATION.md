# API Documentation

This document describes the Doksify backend API and its main realtime events.

## Base URLs

- Local API: `http://localhost:5000/api`
- Local Socket.IO server: `http://localhost:5000`

## Authentication

Protected routes require a Firebase ID token in this header:

```http
Authorization: Bearer <firebase-id-token>
```

Notes:

- `GET /api/documents/:id` accepts optional authentication
- All other document write routes require authentication
- Socket.IO connections require `auth.token`

## Health Routes

### `GET /`

Returns a simple backend status message.

### `GET /health`

Returns:

```json
{
  "ok": true,
  "port": 5000,
  "timestamp": "2026-04-04T10:00:00.000Z"
}
```

## Auth Routes

### `GET /api/auth/me`

Returns the current authenticated user.

Auth required: Yes

Example response:

```json
{
  "user": {
    "id": "6800...",
    "firebaseUid": "firebase-uid",
    "name": "Alex",
    "email": "alex@example.com",
    "avatar": "https://..."
  }
}
```

## Document Routes

### `GET /api/documents`

Returns all documents owned by the authenticated user.

Auth required: Yes

Example response:

```json
[
  {
    "_id": "doc-uuid",
    "documentId": "doc-uuid",
    "title": "Untitled Document",
    "owner": {
      "id": "6800...",
      "name": "Alex",
      "email": "alex@example.com",
      "avatar": "https://..."
    },
    "visibility": "private",
    "createdAt": "2026-04-04T10:00:00.000Z",
    "updatedAt": "2026-04-04T10:00:00.000Z"
  }
]
```

### `POST /api/documents`

Creates a new document.

Auth required: Yes

Optional request body:

```json
{
  "documentId": "custom-document-id"
}
```

Example response:

```json
{
  "_id": "doc-uuid",
  "documentId": "doc-uuid",
  "title": "Untitled Document",
  "content": "",
  "visibility": "private",
  "linkRole": "viewer",
  "comments": [],
  "suggestions": [],
  "owner": {
    "id": "6800...",
    "name": "Alex",
    "email": "alex@example.com",
    "avatar": "https://..."
  },
  "access": {
    "allowed": true,
    "role": "owner",
    "isOwner": true,
    "canRead": true,
    "canComment": true,
    "canEdit": true,
    "canManage": true
  }
}
```

### `GET /api/documents/:id`

Returns a single document if the current user has access or if the document is shared by link.

Auth required: Optional

Example response fields:

- `documentId`
- `title`
- `content`
- `state`
- `comments`
- `suggestions`
- `owner`
- `visibility`
- `linkRole`
- `access`

### `PUT /api/documents/:id`

Updates the document title, plain content, or Yjs state.

Auth required: Yes

Allowed for:

- owner
- editor

Request body:

```json
{
  "title": "Project Notes",
  "content": "Optional plain-text content",
  "state": "base64-or-binary-compatible-payload"
}
```

At least one of `title`, `content`, or `state` must be provided.

### `DELETE /api/documents/:id`

Deletes the document and its saved versions.

Auth required: Yes

Allowed for:

- owner only

Response:

```json
{
  "deleted": true
}
```

### `PATCH /api/documents/:id/share`

Updates link sharing settings.

Auth required: Yes

Allowed for:

- owner only

Request body:

```json
{
  "visibility": "private",
  "role": "viewer"
}
```

Accepted `visibility` values:

- `private`
- `public`
- `link`
- `link-access`

Accepted `role` values:

- `viewer`
- `editor`

Note: the backend normalizes public link sharing to `link` internally.

Response:

```json
{
  "success": true
}
```

## Comment Routes

### `POST /api/documents/:id/comments`

Creates a document comment.

Auth required: Yes

Allowed for:

- owner
- editor

Note: with the current backend access rules, comments are available to users with edit-capable document access. Shared viewers cannot add comments.

Request body:

```json
{
  "message": "Please review this paragraph",
  "selectedText": "draft text",
  "color": "#64748b",
  "textRange": {
    "start": 10,
    "end": 40
  }
}
```

### `PUT /api/documents/:id/comments/:commentId`

Replies to a comment or marks it resolved.

Auth required: Yes

Request body for reply:

```json
{
  "action": "reply",
  "reply": {
    "message": "I updated this part",
    "color": "#64748b"
  }
}
```

Request body for resolve or reopen:

```json
{
  "resolved": true
}
```

## Suggestion Routes

### `POST /api/documents/:id/suggestions`

Creates a suggestion entry.

Auth required: Yes

Allowed for:

- owner
- editor

Request body:

```json
{
  "type": "insert",
  "content": "new text",
  "color": "#64748b",
  "position": {
    "start": 15,
    "end": 15
  }
}
```

Accepted `type` values:

- `insert`
- `delete`

### `PUT /api/documents/:id/suggestions/:suggestionId`

Updates suggestion status.

Auth required: Yes

Allowed for:

- owner
- editor

Request body:

```json
{
  "status": "accepted"
}
```

Accepted `status` values in the data model:

- `pending`
- `accepted`
- `rejected`

## Version Routes

All version routes are mounted under:

`/api/documents/:id/versions`

### `GET /api/documents/:id/versions`

Returns saved version metadata for a document.

Auth required: Yes

### `POST /api/documents/:id/versions`

Creates a manual or named version snapshot.

Auth required: Yes

Allowed for:

- owner
- editor

Request body:

```json
{
  "summary": "Ready for review",
  "isNamedVersion": true,
  "name": "Review Draft",
  "trigger": "manual",
  "createdBy": {
    "userId": "firebase-uid",
    "name": "Alex"
  }
}
```

Example response when a version is created:

```json
{
  "created": true,
  "version": {
    "versionId": "version-uuid",
    "createdAt": "2026-04-04T10:00:00.000Z",
    "createdBy": {
      "userId": "firebase-uid",
      "name": "Alex"
    },
    "summary": "Ready for review",
    "isNamedVersion": true,
    "name": "Review Draft",
    "textSnapshot": "Document text"
  }
}
```

Possible non-created response:

```json
{
  "created": false,
  "reason": "duplicate-state"
}
```

Other reasons may include `empty-state` and `cooldown`.

### `GET /api/documents/:id/versions/:versionId`

Returns one version including the Yjs state as base64.

Auth required: Yes

### `POST /api/documents/:id/versions/restore/:versionId`

Restores a previous version and creates a new restore snapshot.

Auth required: Yes

Allowed for:

- owner
- editor

Example response:

```json
{
  "restored": true,
  "restoredAt": "2026-04-04T10:00:00.000Z",
  "sourceVersion": {
    "versionId": "old-version-id"
  },
  "restoredVersion": {
    "versionId": "new-version-id"
  }
}
```

## Common Error Responses

### `401 Unauthorized`

```json
{
  "message": "Authentication token is required"
}
```

or

```json
{
  "message": "Invalid authentication token"
}
```

### `403 Forbidden`

```json
{
  "message": "You do not have access to this document"
}
```

### `404 Not Found`

```json
{
  "message": "Document not found"
}
```

## Socket.IO Events

Connect using:

```js
const socket = io(SOCKET_URL, {
  auth: { token: firebaseIdToken }
});
```

### Client emits

- `join-document`
- `title-update`
- `yjs-update`
- `manual-save`
- `cursor-update`
- `typing-status`
- `comment-added`
- `comment-updated`
- `suggestion-added`
- `suggestion-updated`

### Server emits

- `title-init`
- `document-access`
- `yjs-update`
- `users-update`
- `user-joined`
- `user-left`
- `typing-update`
- `save-status`
- `version-created`
- `version-restored`
- `document-deleted`
- `access-denied`

## Notes

- Document state is stored as a Yjs binary update in MongoDB
- Autosave and automatic snapshot creation are also triggered by realtime editing
- Link-shared viewers can read shared documents, but write actions still follow access-role checks
- Link-based readers can fetch shared documents, but write operations still require valid access rules
