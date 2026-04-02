import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import EditorComponent from './components/Editor/Editor';
import TextToolbar from './components/Editor/TextToolbar';
import Presence from './components/Presence';
import Header from './components/Header';
import MenuBar from './components/MenuBar';
import HeaderActions from './components/HeaderActions';
import Dialog from './components/Dialog';
import EditorLayout from './components/EditorLayout';
import HistorySidebar from './components/HistorySidebar';
import OutlineSidebar from './components/OutlineSidebar';
import CommentsPanel from './components/CommentsPanel';
import SearchPanel from './components/SearchPanel';
import ShareModal from './components/ShareModal';
import Login from './components/Login';
import {
  addComment,
  createDocument,
  getDocument,
  listDocuments,
  shareDocument,
  updateComment,
  updatePermissions,
} from './services/api';
import { socket } from './services/socket';
import {
  captureVersionOnUnload,
  normalizeBinaryPayload,
  restoreVersion,
} from './services/versionService';
import { useTheme } from './hooks/useTheme';
import { useAuth } from './hooks/useAuth';
import {
  FONT_FAMILIES,
  FONT_SIZES,
  TEXT_STYLE_OPTIONS,
  formatActions,
} from './components/Editor/editorCommands';
import './App.css';

const REDIRECT_AFTER_LOGIN_KEY = 'redirectAfterLogin';
const DEFAULT_TEXT_COLOR = '#0f172a';
const DEFAULT_HIGHLIGHT_COLOR = '#fef08a';

const getEditorUiSnapshot = (editor, selection = { from: 0, to: 0 }) => {
  if (!editor) {
    return null;
  }

  const textStyleAttrs = editor.getAttributes('textStyle');

  return {
    blockType: editor.isActive('heading', { level: 1 })
      ? 'h1'
      : editor.isActive('heading', { level: 2 })
        ? 'h2'
        : editor.isActive('heading', { level: 3 })
          ? 'h3'
          : 'paragraph',
    fontFamily: textStyleAttrs.fontFamily || FONT_FAMILIES[0].value,
    fontSize: textStyleAttrs.fontSize || '16px',
    textColor: textStyleAttrs.color || DEFAULT_TEXT_COLOR,
    highlightColor: textStyleAttrs.backgroundColor || DEFAULT_HIGHLIGHT_COLOR,
    alignment: editor.isActive({ textAlign: 'justify' })
      ? 'justify'
      : editor.isActive({ textAlign: 'center' })
        ? 'center'
        : editor.isActive({ textAlign: 'right' })
          ? 'right'
          : 'left',
    isBold: editor.isActive('bold'),
    isItalic: editor.isActive('italic'),
    isUnderline: editor.isActive('underline'),
    isStrike: editor.isActive('strike'),
    isLink: editor.isActive('link'),
    isBulletList: editor.isActive('bulletList'),
    isOrderedList: editor.isActive('orderedList'),
    canUndo: Boolean(editor.can().undo?.()),
    canRedo: Boolean(editor.can().redo?.()),
    canIndent: Boolean(editor.can().sinkListItem?.('listItem')),
    canOutdent: Boolean(editor.can().liftListItem?.('listItem')),
    canLink: Boolean(editor.isActive('link') || selection.from !== selection.to),
    canClearFormatting: Boolean(
      editor.isActive('bold')
      || editor.isActive('italic')
      || editor.isActive('underline')
      || editor.isActive('strike')
      || editor.isActive('bulletList')
      || editor.isActive('orderedList')
      || textStyleAttrs.fontFamily
      || textStyleAttrs.fontSize
      || textStyleAttrs.color
      || textStyleAttrs.backgroundColor
      || editor.isActive('heading')
      || editor.isActive({ textAlign: 'center' })
      || editor.isActive({ textAlign: 'right' })
      || editor.isActive({ textAlign: 'justify' })
    ),
  };
};

const colorFromId = (id) => {
  let hash = 0;

  for (let index = 0; index < id.length; index += 1) {
    hash = id.charCodeAt(index) + ((hash << 5) - hash);
  }

  return `hsl(${Math.abs(hash) % 360} 70% 55%)`;
};

const saveRedirectAfterLogin = (pathname) => {
  if (pathname) {
    localStorage.setItem(REDIRECT_AFTER_LOGIN_KEY, pathname);
  }
};

const consumeRedirectAfterLogin = () => {
  const redirect = localStorage.getItem(REDIRECT_AFTER_LOGIN_KEY);
  if (redirect) {
    localStorage.removeItem(REDIRECT_AFTER_LOGIN_KEY);
  }

  return redirect;
};

const navigateToPath = (pathname, options = {}) => {
  const { replace = false } = options;
  const method = replace ? 'replaceState' : 'pushState';
  window.history[method](null, '', pathname);
  window.dispatchEvent(new PopStateEvent('popstate'));
};

const sanitizeFilename = (value) => (value || 'untitled-document')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '') || 'untitled-document';

const usePathname = () => {
  const [pathname, setPathname] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopstate = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', handlePopstate);

    return () => window.removeEventListener('popstate', handlePopstate);
  }, []);

  return pathname;
};

const getRoute = (pathname) => {
  if (pathname === '/login') {
    return { name: 'login' };
  }

  if (pathname === '/documents') {
    return { name: 'documents' };
  }

  const documentMatch = pathname.match(/^\/doc\/([^/]+)$/);
  if (documentMatch) {
    return { name: 'document', documentId: documentMatch[1] };
  }

  return { name: 'unknown' };
};

const buildPermissionsFromDocument = (document) => ({
  owner: document.owner,
  collaborators: document.collaborators || [],
  sharedUsers: document.sharedUsers || [],
  visibility: document.visibility || 'private',
  linkRole: document.linkRole || 'viewer',
});

const guestUser = {
  userId: 'guest',
  uid: 'guest',
  username: 'Guest',
  name: 'Guest',
  email: '',
  avatar: '',
  color: '#64748b',
};

const SpinnerScreen = ({ label }) => (
  <div className="loading-screen">
    <div className="spinner" />
    <p>{label}</p>
  </div>
);

const EmptyState = ({ title, message, actions }) => (
  <div className="empty-state-screen">
    <div className="empty-state-card">
      <h2>{title}</h2>
      <p>{message}</p>
      {actions ? <div className="top-button-row">{actions}</div> : null}
    </div>
  </div>
);

const AvatarBadge = ({ user, fallbackLabel, className = '' }) => {
  const label = (user?.name || user?.username || fallbackLabel || 'U').trim().charAt(0).toUpperCase();

  if (user?.avatar) {
    return <img className={`avatar-image ${className}`.trim()} src={user.avatar} alt={user.name || user.username || 'User'} />;
  }

  return <div className={`avatar-fallback ${className}`.trim()}>{label || 'U'}</div>;
};

const ProfileMenu = ({ user, onMyDocuments, onNewDocument, onLogout }) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  return (
    <div className="profile-menu" ref={menuRef}>
      <button className="profile-trigger" onClick={() => setOpen((value) => !value)}>
        <AvatarBadge user={user} fallbackLabel={user?.name} className="profile-avatar" />
      </button>

      {open ? (
        <div className="profile-dropdown">
          <div className="profile-summary">
            <AvatarBadge user={user} fallbackLabel={user?.name} className="profile-avatar profile-avatar-large" />
            <div>
              <strong>{user?.name}</strong>
              <p>{user?.email}</p>
            </div>
          </div>

          <button className="profile-action" onClick={() => { setOpen(false); onMyDocuments(); }}>
            My Documents
          </button>
          <button className="profile-action" onClick={() => { setOpen(false); onNewDocument(); }}>
            Create New Document
          </button>
          <button className="profile-action profile-action-danger" onClick={() => { setOpen(false); onLogout(); }}>
            Logout
          </button>
        </div>
      ) : null}
    </div>
  );
};

const PrivateRoute = ({ auth, pathname, children, fallback }) => {
  useEffect(() => {
    if (!auth.loading && !auth.isAuthenticated) {
      saveRedirectAfterLogin(pathname);
      navigateToPath('/login', { replace: true });
    }
  }, [auth.isAuthenticated, auth.loading, pathname]);

  if (auth.loading) {
    return <SpinnerScreen label="Checking your session..." />;
  }

  if (!auth.isAuthenticated) {
    return fallback || <SpinnerScreen label="Redirecting to login..." />;
  }

  return children;
};

const LoginRoute = ({ auth, onCreateAndOpenDocument }) => {
  const [startupError, setStartupError] = useState('');

  useEffect(() => {
    if (auth.loading || !auth.isAuthenticated) {
      return;
    }

    let cancelled = false;
    const timeoutId = window.setTimeout(() => {
      if (!cancelled) {
        setStartupError('Preparing your workspace took too long. Please try again.');
      }
    }, 12000);

    const resolveNextRoute = async () => {
      const redirect = consumeRedirectAfterLogin();
      if (redirect) {
        navigateToPath(redirect, { replace: true });
        return;
      }

      try {
        const document = await onCreateAndOpenDocument({ navigate: false });
        if (!cancelled && document?.documentId) {
          navigateToPath(`/doc/${document.documentId}`, { replace: true });
        } else if (!cancelled) {
          setStartupError('Could not create a document. Please try again.');
        }
      } catch (error) {
        if (!cancelled) {
          setStartupError(error.response?.data?.message || error.message || 'Failed to create your first document');
        }
      }
    };

    resolveNextRoute();

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [auth.isAuthenticated, auth.loading, onCreateAndOpenDocument]);

  if (auth.loading || (auth.isAuthenticated && !startupError)) {
    return <SpinnerScreen label="Preparing your workspace..." />;
  }

  return <Login error={startupError || auth.authError} onSignIn={auth.signIn} isSigningIn={auth.isSigningIn} />;
};

const DocumentsRoute = ({ auth, onCreateAndOpenDocument }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!auth.isAuthenticated) {
      return;
    }

    let mounted = true;

    const loadDocuments = async () => {
      setLoading(true);

      try {
        const nextDocuments = await listDocuments();
        if (mounted) {
          setDocuments(nextDocuments);
          setError('');
        }
      } catch (loadError) {
        if (mounted) {
          setError(loadError.response?.data?.message || loadError.message || 'Failed to load your documents');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadDocuments();

    return () => {
      mounted = false;
    };
  }, [auth.isAuthenticated]);

  if (loading) {
    return <SpinnerScreen label="Loading your documents..." />;
  }

  return (
    <div className="dashboard-shell">
      <div className="dashboard-header">
        <div>
          <p className="section-kicker">Workspace</p>
          <h1>My Documents</h1>
          <p className="section-copy">Jump back into recent docs or start a fresh blank page.</p>
        </div>
        <div className="top-button-row">
          <button className="primary-button" onClick={onCreateAndOpenDocument}>
            New Document
          </button>
        </div>
      </div>

      {error ? <p className="inline-error">{error}</p> : null}

      <div className="documents-grid">
        {documents.map((document) => (
          <button
            key={document.documentId}
            className="document-card"
            onClick={() => navigateToPath(`/doc/${document.documentId}`)}
          >
            <div className="document-card-top">
              <span className={`visibility-pill visibility-${document.visibility}`}>{document.visibility === 'link' ? 'Anyone with link' : 'Private'}</span>
              <span className="document-card-time">
                {new Date(document.updatedAt).toLocaleDateString()}
              </span>
            </div>
            <strong>{document.title || 'Untitled Document'}</strong>
            <p>{document.owner?.name ? `Owner: ${document.owner.name}` : 'Shared document'}</p>
          </button>
        ))}

        {!documents.length ? (
          <div className="document-card document-card-empty">
            <strong>No documents yet</strong>
            <p>Create your first blank document and start editing.</p>
            <button className="primary-button" onClick={onCreateAndOpenDocument}>
              Create New Document
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
};

const DocumentRoute = ({ auth, currentUser, pathname, routeDocumentId, theme, toggleTheme, onCreateAndOpenDocument, onLogout }) => {
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState(null);
  const [documentId, setDocumentId] = useState(routeDocumentId);
  const [docAccess, setDocAccess] = useState(null);
  const [permissions, setPermissions] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [activeUsers, setActiveUsers] = useState([]);
  const [activePanel, setActivePanel] = useState(null);
  const [showShare, setShowShare] = useState(false);
  const [title, setTitle] = useState('Loading...');
  const [saveStatus, setSaveStatus] = useState('Saved');
  const [lastSaved, setLastSaved] = useState(null);
  const [comments, setComments] = useState([]);
  const [selection, setSelection] = useState({ from: 0, to: 0, text: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [replaceValue, setReplaceValue] = useState('');
  const [searchMatches, setSearchMatches] = useState([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [documentText, setDocumentText] = useState('');
  const [documentState, setDocumentState] = useState(new Uint8Array());
  const [editorInstanceKey, setEditorInstanceKey] = useState(0);
  const [eventsFeed, setEventsFeed] = useState([]);
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);
  const [toolbarEditor, setToolbarEditor] = useState(null);
  const [editorUiState, setEditorUiState] = useState(null);
  const [outlineHeadings, setOutlineHeadings] = useState([]);
  const [activeHeadingId, setActiveHeadingId] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [dialogState, setDialogState] = useState(null);

  const editorRef = useRef(null);
  const panelRef = useRef(null);
  const saveStatusTimeout = useRef(null);
  const titleInputRef = useRef(null);
  const actor = currentUser || guestUser;
  const canEdit = Boolean(auth.isAuthenticated && docAccess?.canEdit);
  const canManage = Boolean(auth.isAuthenticated && docAccess?.canManage);

  const shareableLink = useMemo(() => {
    if (!documentId) {
      return '';
    }

    return `${window.location.origin}/doc/${documentId}`;
  }, [documentId]);

  const updateSearchMatches = useCallback(() => {
    const editor = editorRef.current;
    if (!editor || !searchQuery.trim()) {
      setSearchMatches([]);
      setCurrentMatchIndex(0);
      return;
    }

    const matches = [];
    const query = searchQuery.toLowerCase();

    editor.state.doc.descendants((node, position) => {
      if (!node.isText) {
        return;
      }

      const text = (node.text || '').toLowerCase();
      let startIndex = 0;

      while (startIndex < text.length) {
        const foundAt = text.indexOf(query, startIndex);
        if (foundAt === -1) {
          break;
        }

        matches.push({
          from: position + foundAt,
          to: position + foundAt + searchQuery.length,
        });
        startIndex = foundAt + searchQuery.length;
      }
    });

    setSearchMatches(matches);
    setCurrentMatchIndex((value) => Math.min(value, Math.max(matches.length - 1, 0)));
  }, [searchQuery]);

  useEffect(() => {
    updateSearchMatches();
  }, [documentText, updateSearchMatches]);

  useEffect(() => {
    if (!outlineHeadings.length) {
      setActiveHeadingId(null);
      return;
    }

    const current = [...outlineHeadings]
      .reverse()
      .find((heading) => selection.from >= heading.position);

    setActiveHeadingId(current?.id || outlineHeadings[0]?.id || null);
  }, [outlineHeadings, selection.from]);

  useEffect(() => {
    setDocumentId(routeDocumentId);
  }, [routeDocumentId]);

  useEffect(() => {
    setActivePanel(null);
  }, [routeDocumentId]);

  useEffect(() => {
    setLoadingTimedOut(false);
    const timeoutId = window.setTimeout(() => {
      setLoadingTimedOut(true);
    }, 12000);

    return () => window.clearTimeout(timeoutId);
  }, [routeDocumentId]);

  useEffect(() => {
    let mounted = true;

    const initializeDocument = async () => {
      if (auth.loading) {
        return;
      }

      setLoading(true);
      setErrorState(null);
      socket.disconnect();
      socket.removeAllListeners();
      setToolbarEditor(null);
      setEditorUiState(null);
      setOutlineHeadings([]);
      setActiveHeadingId(null);

      try {
        const initialDoc = await getDocument(routeDocumentId);
        if (!mounted) {
          return;
        }

        setDocumentId(initialDoc.documentId);
        setComments(initialDoc.comments || []);
        setTitle(initialDoc.title || 'Untitled Document');
        setDocumentText(initialDoc.content || '');
        setDocumentState(normalizeBinaryPayload(initialDoc.state));
        setPermissions(buildPermissionsFromDocument(initialDoc));
        setDocAccess(initialDoc.access || null);
        setLastSaved(initialDoc.lastUpdated ? new Date(initialDoc.lastUpdated) : null);
        setSaveStatus(auth.isAuthenticated ? 'Saved' : 'View only');
        setActiveUsers([]);
        setEventsFeed([]);

        if (!auth.isAuthenticated || !currentUser) {
          setLoading(false);
          return;
        }

        socket.connect();
        socket.on('connect', () => {
          setIsConnected(true);
          setSaveStatus('Saved');
          socket.emit('join-document', { documentId: initialDoc.documentId });
        });

        socket.on('disconnect', () => {
          setIsConnected(false);
          setSaveStatus('Offline');
        });

        socket.on('connect_error', (error) => {
          setErrorState({
            type: 'generic',
            title: 'Connection Error',
            message: error.message || 'Connection failed',
          });
          setSaveStatus('Offline');
        });

        socket.on('access-denied', ({ message }) => {
          setErrorState({
            type: 'access-denied',
            title: 'Access Denied',
            message: message || 'You do not have access to this document.',
          });
        });

        socket.on('document-access', (access) => {
          setDocAccess(access);
        });

        socket.on('users-update', (users) => {
          setActiveUsers(users);
        });

        socket.on('user-joined', (user) => {
          setEventsFeed((feed) => [`${user.username} joined`, ...feed].slice(0, 5));
        });

        socket.on('user-left', (user) => {
          setEventsFeed((feed) => [`${user.username} left`, ...feed].slice(0, 5));
        });

        socket.on('title-init', (value) => setTitle(value));
        socket.on('title-update', (value) => setTitle(value));

        socket.on('version-created', (version) => {
          setEventsFeed((feed) => [`${version.createdBy?.name || 'System'} saved a version`, ...feed].slice(0, 5));
        });

        socket.on('version-restored', ({ state, restoredBy, sourceVersion }) => {
          setDocumentState(normalizeBinaryPayload(state));
          setEditorInstanceKey((value) => value + 1);
          setLastSaved(new Date());
          setSaveStatus('Saved');
          setEventsFeed((feed) => [
            `${restoredBy?.name || 'System'} restored ${sourceVersion?.name || 'a version'}`,
            ...feed,
          ].slice(0, 5));
        });

        socket.on('yjs-update', () => {
          setLastSaved(new Date());
          setSaveStatus('Saved');
        });

        socket.on('save-status', ({ status, at }) => {
          setSaveStatus(status === 'saved' ? 'Saved' : status);
          if (at) {
            setLastSaved(new Date(at));
          }
        });

        socket.on('comment-added', (comment) => {
          setComments((value) => (value.some((item) => item._id === comment._id) ? value : [comment, ...value]));
        });

        socket.on('comment-updated', (comment) => {
          setComments((value) => value.map((item) => (item._id === comment._id ? comment : item)));
        });
      } catch (error) {
        if (!mounted) {
          return;
        }

        const statusCode = error.response?.status;
        const message = error.response?.data?.message || error.message || 'Failed to load document';

        if (!auth.isAuthenticated && (statusCode === 401 || statusCode === 403)) {
          saveRedirectAfterLogin(pathname);
          navigateToPath('/login', { replace: true });
          return;
        }

        if (statusCode === 404) {
          setErrorState({
            type: 'not-found',
            title: 'Document Not Found',
            message: 'This document does not exist or the link is invalid.',
          });
        } else if (statusCode === 403) {
          setErrorState({
            type: 'access-denied',
            title: 'Access Denied',
            message: 'You do not have permission to open this document.',
          });
        } else {
          setErrorState({
            type: 'generic',
            title: 'Unable to Open Document',
            message,
          });
        }
      } finally {
        if (mounted) {
          setLoading(false);
          setLoadingTimedOut(false);
        }
      }
    };

    initializeDocument();

    return () => {
      mounted = false;
      socket.disconnect();
      socket.removeAllListeners();
      setIsConnected(false);
      if (saveStatusTimeout.current) {
        clearTimeout(saveStatusTimeout.current);
      }
    };
  }, [auth.isAuthenticated, auth.loading, currentUser, pathname, routeDocumentId]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!documentId || !currentUser || !canEdit) {
        return;
      }

      captureVersionOnUnload(documentId, {
        createdBy: currentUser,
        token: auth.token,
      });
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [auth.token, canEdit, currentUser, documentId]);

  const markSaving = useCallback(() => {
    setSaveStatus('Saving...');
    if (saveStatusTimeout.current) {
      clearTimeout(saveStatusTimeout.current);
    }
    saveStatusTimeout.current = setTimeout(() => setSaveStatus(isConnected ? 'Saved' : 'Offline'), 2200);
  }, [isConnected]);

  const handleRestoreVersion = async (versionId) => {
    try {
      await restoreVersion(documentId, versionId, { createdBy: actor });
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to restore version');
    }
  };

  const handleTitleChange = (event) => {
    const newTitle = event.target.value;
    setTitle(newTitle);

    if (!canEdit) {
      return;
    }

    markSaving();
    socket.emit('title-update', newTitle);
  };

  const handleEditorReady = (editor) => {
    editorRef.current = editor;
    setToolbarEditor(editor);
    setEditorUiState(getEditorUiSnapshot(editor, selection));
    if (editor) {
      setDocumentText(editor.getText());
      updateSearchMatches();
    }
  };

  const handleOutlineChange = useCallback((headings) => {
    setOutlineHeadings(headings || []);
  }, []);

  const handleJumpToHeading = useCallback((heading) => {
    if (!editorRef.current || !heading?.position) {
      return;
    }

    setActiveHeadingId(heading.id);
    editorRef.current.chain().focus().setTextSelection(heading.position + 1).run();
  }, []);

  const handleAddComment = async (message) => {
    if (!selection.text || selection.from === selection.to || !currentUser) {
      return;
    }

    const comment = await addComment(documentId, {
      color: currentUser.color,
      message,
      textRange: { start: selection.from, end: selection.to },
      selectedText: selection.text,
    });

    setComments((value) => [comment, ...value]);
    socket.emit('comment-added', comment);
  };

  const handleReply = async (commentId, message) => {
    const updated = await updateComment(documentId, commentId, {
      action: 'reply',
      reply: {
        color: actor.color,
        message,
      },
    });

    setComments((value) => value.map((item) => (item._id === updated._id ? updated : item)));
    socket.emit('comment-updated', updated);
  };

  const handleResolveToggle = async (commentId, resolved) => {
    const updated = await updateComment(documentId, commentId, { resolved });
    setComments((value) => value.map((item) => (item._id === updated._id ? updated : item)));
    socket.emit('comment-updated', updated);
  };

  const handleDownloadText = useCallback(() => {
    const blob = new Blob([documentText || ''], { type: 'text/plain;charset=utf-8' });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = `${sanitizeFilename(title)}.txt`;
    link.click();
    URL.revokeObjectURL(href);
  }, [documentText, title]);

  const handleFocusTitle = useCallback(() => {
    titleInputRef.current?.focus();
    titleInputRef.current?.select?.();
  }, []);

  const handleZoomIn = useCallback(() => {
    setZoomLevel((value) => Math.min(value + 10, 200));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel((value) => Math.max(value - 10, 60));
  }, []);

  const handleClipboardCopy = useCallback(async () => {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }

    const { from, to } = editor.state.selection;
    const content = from !== to ? editor.state.doc.textBetween(from, to, ' ') : editor.getText();
    await navigator.clipboard.writeText(content);
  }, []);

  const handleClipboardCut = useCallback(async () => {
    const editor = editorRef.current;
    if (!editor || !canEdit) {
      return;
    }

    const { from, to } = editor.state.selection;
    if (from === to) {
      return;
    }

    await navigator.clipboard.writeText(editor.state.doc.textBetween(from, to, ' '));
    editor.chain().focus().deleteSelection().run();
    markSaving();
  }, [canEdit, markSaving]);

  const handleClipboardPaste = useCallback(async () => {
    const editor = editorRef.current;
    if (!editor || !canEdit) {
      return;
    }

    const content = await navigator.clipboard.readText();
    if (content) {
      editor.chain().focus().insertContent(content).run();
      markSaving();
    }
  }, [canEdit, markSaving]);

  const handleInsertLink = useCallback(() => {
    const editor = editorRef.current;
    if (!editor || !canEdit) {
      return;
    }

    const previousUrl = editor.getAttributes('link').href || '';
    const nextUrl = window.prompt('Enter link URL', previousUrl);

    if (nextUrl === null) {
      return;
    }

    if (!nextUrl.trim()) {
      editor.chain().focus().unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: nextUrl.trim() }).run();
    markSaving();
  }, [canEdit, markSaving]);

  const handleInsertImage = useCallback(() => {
    const editor = editorRef.current;
    if (!editor || !canEdit) {
      return;
    }

    const src = window.prompt('Paste image URL');
    if (!src?.trim()) {
      return;
    }

    editor.chain().focus().setImage({ src: src.trim(), alt: 'Inserted image' }).run();
    markSaving();
  }, [canEdit, markSaving]);

  const handleSearchNext = () => {
    if (!searchMatches.length || !editorRef.current) {
      return;
    }

    const nextIndex = (currentMatchIndex + 1) % searchMatches.length;
    setCurrentMatchIndex(nextIndex);
    editorRef.current.chain().focus().setTextSelection(searchMatches[nextIndex]).run();
  };

  const handleReplaceOne = () => {
    if (!searchMatches.length || !editorRef.current || !canEdit) {
      return;
    }

    editorRef.current.chain().focus().insertContentAt(searchMatches[currentMatchIndex], replaceValue).run();
    markSaving();
  };

  const handleReplaceAll = () => {
    if (!searchMatches.length || !editorRef.current || !canEdit) {
      return;
    }

    [...searchMatches].reverse().forEach((match) => {
      editorRef.current.chain().focus().insertContentAt(match, replaceValue).run();
    });
    markSaving();
  };

  const handleShare = async (payload) => {
    const nextPermissions = await shareDocument(documentId, payload);
    setPermissions(nextPermissions);
  };

  const handleUpdateLinkSettings = async (payload) => {
    const nextPermissions = await updatePermissions(documentId, payload);
    setPermissions(nextPermissions);
  };

  const closeDialog = useCallback(() => {
    setDialogState(null);
  }, []);

  const togglePanel = useCallback((panel) => {
    setActivePanel((current) => (current === panel ? null : panel));
  }, []);

  const closeActivePanel = useCallback(() => {
    setActivePanel(null);
  }, []);

  useEffect(() => {
    if (!activePanel) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (event.target?.closest?.('.header-actions')) {
        return;
      }

      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setActivePanel(null);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setActivePanel(null);
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleEscape);

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [activePanel]);

  useEffect(() => {
    if (!toolbarEditor) {
      return undefined;
    }

    const syncEditorUiState = () => {
      const nextState = getEditorUiSnapshot(toolbarEditor, selection);

      setEditorUiState((current) => {
        const currentSnapshot = current ? JSON.stringify(current) : '';
        const nextSnapshot = JSON.stringify(nextState);

        if (currentSnapshot === nextSnapshot) {
          return current;
        }

        return nextState;
      });
    };

    syncEditorUiState();
    toolbarEditor.on('selectionUpdate', syncEditorUiState);
    toolbarEditor.on('transaction', syncEditorUiState);
    toolbarEditor.on('update', syncEditorUiState);

    return () => {
      toolbarEditor.off('selectionUpdate', syncEditorUiState);
      toolbarEditor.off('transaction', syncEditorUiState);
      toolbarEditor.off('update', syncEditorUiState);
    };
  }, [selection, toolbarEditor]);

  const runEditorCommand = useCallback((command, { save = true } = {}) => {
    const editor = editorRef.current;
    if (!editor || !canEdit) {
      return false;
    }

    const didRun = command(editor);
    if (didRun && save) {
      markSaving();
    }

    return didRun;
  }, [canEdit, markSaving]);

  const formattingActions = useMemo(() => ({
    undo: () => runEditorCommand((editor) => formatActions.undo(editor)),
    redo: () => runEditorCommand((editor) => formatActions.redo(editor)),
    toggleBold: () => runEditorCommand((editor) => formatActions.bold(editor)),
    toggleItalic: () => runEditorCommand((editor) => formatActions.italic(editor)),
    toggleUnderline: () => runEditorCommand((editor) => formatActions.underline(editor)),
    toggleStrike: () => runEditorCommand((editor) => formatActions.strike(editor)),
    setBlockType: (value) => runEditorCommand((editor) => formatActions.setBlockType(editor, value)),
    setFontFamily: (value) => runEditorCommand((editor) => formatActions.setFontFamily(editor, value)),
    setFontSize: (value) => runEditorCommand((editor) => formatActions.setFontSize(editor, value)),
    increaseFontSize: () => runEditorCommand((editor) => formatActions.increaseFontSize(editor, editorUiState?.fontSize || '16px')),
    decreaseFontSize: () => runEditorCommand((editor) => formatActions.decreaseFontSize(editor, editorUiState?.fontSize || '16px')),
    setTextColor: (value) => runEditorCommand((editor) => formatActions.textColor(editor, value)),
    setHighlightColor: (value) => runEditorCommand((editor) => formatActions.highlightColor(editor, value)),
    clearFormatting: () => runEditorCommand((editor) => formatActions.clearFormatting(editor)),
    insertLink: handleInsertLink,
    insertImage: handleInsertImage,
    setTextAlign: (value) => runEditorCommand((editor) => formatActions.align(editor, value)),
    toggleBulletList: () => runEditorCommand((editor) => formatActions.bulletList(editor)),
    toggleOrderedList: () => runEditorCommand((editor) => formatActions.orderedList(editor)),
    increaseIndent: () => runEditorCommand((editor) => formatActions.indent(editor)),
    decreaseIndent: () => runEditorCommand((editor) => formatActions.outdent(editor)),
    openSearch: () => togglePanel('search'),
  }), [editorUiState?.fontSize, handleInsertImage, handleInsertLink, runEditorCommand, togglePanel]);

  const toolbarConfig = useMemo(() => ({
    textStyles: TEXT_STYLE_OPTIONS,
    fontFamilies: FONT_FAMILIES,
    fontSizes: FONT_SIZES.map((value) => ({ value, label: value.replace('px', '') })),
  }), []);

  const effectiveToolbarState = editorUiState || getEditorUiSnapshot(toolbarEditor, selection);

  const wordCount = useMemo(() => {
    const trimmed = (documentText || '').trim();
    const words = trimmed ? trimmed.split(/\s+/).length : 0;

    return {
      words,
      characters: (documentText || '').length,
      charactersNoSpaces: (documentText || '').replace(/\s+/g, '').length,
    };
  }, [documentText]);

  const menuItems = useMemo(() => {
    const hasSelection = Boolean(selection.text);
    const formatState = editorUiState;

    return [
      {
        label: 'File',
        items: [
          { label: 'New Document', onSelect: onCreateAndOpenDocument },
          { label: 'Rename Document', onSelect: handleFocusTitle, disabled: !canEdit },
          { type: 'separator' },
          { label: 'Download as .txt', onSelect: handleDownloadText },
        ],
      },
      {
        label: 'Edit',
        items: [
          { label: 'Undo', shortcut: 'Ctrl+Z', onSelect: formattingActions.undo, disabled: !canEdit || !formatState?.canUndo },
          { label: 'Redo', shortcut: 'Ctrl+Y', onSelect: formattingActions.redo, disabled: !canEdit || !formatState?.canRedo },
          { type: 'separator' },
          { label: 'Cut', shortcut: 'Ctrl+X', onSelect: () => handleClipboardCut().catch(() => {}), disabled: !canEdit || !hasSelection },
          { label: 'Copy', shortcut: 'Ctrl+C', onSelect: () => handleClipboardCopy().catch(() => {}) },
          { label: 'Paste', shortcut: 'Ctrl+V', onSelect: () => handleClipboardPaste().catch(() => {}), disabled: !canEdit },
        ],
      },
      {
        label: 'View',
        items: [
          { label: theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode', onSelect: toggleTheme },
          { label: `Zoom in (${zoomLevel}%)`, onSelect: handleZoomIn },
          { label: `Zoom out (${zoomLevel}%)`, onSelect: handleZoomOut },
        ],
      },
      {
        label: 'Insert',
        items: [
          { label: 'Insert Image', onSelect: handleInsertImage, disabled: !canEdit },
          { label: 'Insert Link', onSelect: handleInsertLink, disabled: !canEdit || !formatState?.canLink },
        ],
      },
      {
        label: 'Format',
        items: [
          { label: 'Normal text', onSelect: () => formattingActions.setBlockType('paragraph'), disabled: !canEdit, active: formatState?.blockType === 'paragraph' },
          { label: 'Heading 1', onSelect: () => formattingActions.setBlockType('h1'), disabled: !canEdit, active: formatState?.blockType === 'h1' },
          { label: 'Heading 2', onSelect: () => formattingActions.setBlockType('h2'), disabled: !canEdit, active: formatState?.blockType === 'h2' },
          { label: 'Heading 3', onSelect: () => formattingActions.setBlockType('h3'), disabled: !canEdit, active: formatState?.blockType === 'h3' },
          { type: 'separator' },
          { label: 'Bold', onSelect: formattingActions.toggleBold, disabled: !canEdit, active: formatState?.isBold },
          { label: 'Italic', onSelect: formattingActions.toggleItalic, disabled: !canEdit, active: formatState?.isItalic },
          { label: 'Underline', onSelect: formattingActions.toggleUnderline, disabled: !canEdit, active: formatState?.isUnderline },
          { label: 'Strikethrough', onSelect: formattingActions.toggleStrike, disabled: !canEdit, active: formatState?.isStrike },
          { type: 'separator' },
          { label: 'Align Left', onSelect: () => formattingActions.setTextAlign('left'), disabled: !canEdit, active: formatState?.alignment === 'left' },
          { label: 'Align Center', onSelect: () => formattingActions.setTextAlign('center'), disabled: !canEdit, active: formatState?.alignment === 'center' },
          { label: 'Align Right', onSelect: () => formattingActions.setTextAlign('right'), disabled: !canEdit, active: formatState?.alignment === 'right' },
          { label: 'Justify', onSelect: () => formattingActions.setTextAlign('justify'), disabled: !canEdit, active: formatState?.alignment === 'justify' },
          { type: 'separator' },
          { label: 'Bullet List', onSelect: formattingActions.toggleBulletList, disabled: !canEdit, active: formatState?.isBulletList },
          { label: 'Numbered List', onSelect: formattingActions.toggleOrderedList, disabled: !canEdit, active: formatState?.isOrderedList },
          { label: 'Increase Indent', onSelect: formattingActions.increaseIndent, disabled: !canEdit || !formatState?.canIndent },
          { label: 'Decrease Indent', onSelect: formattingActions.decreaseIndent, disabled: !canEdit || !formatState?.canOutdent },
          { type: 'separator' },
          { label: 'Clear Formatting', onSelect: formattingActions.clearFormatting, disabled: !canEdit || !formatState?.canClearFormatting },
        ],
      },
      {
        label: 'Tools',
        items: [
          { label: 'Word count', onSelect: () => setDialogState('word-count') },
        ],
      },
      {
        label: 'Help',
        items: [
          { label: 'About this editor', onSelect: () => setDialogState('help') },
        ],
      },
    ];
  }, [
    canEdit,
    handleClipboardCopy,
    handleClipboardCut,
    handleClipboardPaste,
    handleDownloadText,
    handleFocusTitle,
    handleInsertImage,
    handleInsertLink,
    handleZoomIn,
    handleZoomOut,
    onCreateAndOpenDocument,
    formattingActions,
    editorUiState,
    selection.text,
    theme,
    toggleTheme,
    zoomLevel,
  ]);

  if (auth.loading || loading) {
    if (loadingTimedOut) {
      return (
        <EmptyState
          title="Workspace Took Too Long"
          message="This document is taking longer than expected to open. Try reloading or opening it again."
          actions={(
            <>
              <button className="primary-button" onClick={() => window.location.reload()}>
                Reload
              </button>
              <button className="secondary-chip" onClick={() => navigateToPath('/documents')}>
                My Documents
              </button>
            </>
          )}
        />
      );
    }

    return <SpinnerScreen label="Opening document..." />;
  }

  if (errorState) {
    return (
      <EmptyState
        title={errorState.title}
        message={errorState.message}
        actions={(
          <>
            {auth.isAuthenticated ? (
              <button className="primary-button" onClick={onCreateAndOpenDocument}>
                Create New Document
              </button>
            ) : (
              <button
                className="primary-button"
                onClick={() => {
                  saveRedirectAfterLogin(pathname);
                  navigateToPath('/login');
                }}
              >
                Sign In
              </button>
            )}
            <button className="secondary-chip" onClick={() => navigateToPath('/documents')}>
              My Documents
            </button>
          </>
        )}
      />
    );
  }

  const heatmap = activeUsers
    .filter((user) => !user.isIdle)
    .slice(0, 5)
    .map((user, index) => ({
      id: user.socketId,
      label: `${user.username} editing activity`,
      intensity: Math.max(30, 100 - (index * 15)),
      color: user.color,
    }));

  return (
    <div className="app-container">
      <Header
        title={title}
        titleInputRef={titleInputRef}
        onTitleChange={handleTitleChange}
        canEdit={canEdit}
        saveStatus={saveStatus}
        lastSaved={lastSaved}
        docAccess={docAccess}
        menuContent={<MenuBar menus={menuItems} />}
        actionContent={(
          <HeaderActions
            activePanel={activePanel}
            onToggleComments={() => togglePanel('comments')}
            onToggleHistory={() => togglePanel('history')}
            onToggleSearch={() => togglePanel('search')}
          />
        )}
        toolbarContent={(
          <TextToolbar
            canEdit={canEdit}
            state={effectiveToolbarState}
            actions={formattingActions}
            config={toolbarConfig}
          />
        )}
        rightContent={(
          <>
            {auth.isAuthenticated ? <Presence users={activeUsers} /> : null}
            <div className="workspace-actions">
              {canManage ? (
                <button className="primary-button" onClick={() => setShowShare((value) => !value)}>Share</button>
              ) : null}
              <button className="secondary-chip" onClick={toggleTheme}>
                {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
              </button>
              {auth.isAuthenticated ? (
                <ProfileMenu
                  user={{
                    ...currentUser,
                    name: auth.firebaseUser?.displayName || currentUser?.name,
                    email: auth.firebaseUser?.email || currentUser?.email,
                    avatar: auth.firebaseUser?.photoURL || currentUser?.avatar,
                  }}
                  onMyDocuments={() => navigateToPath('/documents')}
                  onNewDocument={onCreateAndOpenDocument}
                  onLogout={onLogout}
                />
              ) : (
                <button
                  className="secondary-chip"
                  onClick={() => {
                    saveRedirectAfterLogin(pathname);
                    navigateToPath('/login');
                  }}
                >
                  Sign In
                </button>
              )}
            </div>
          </>
        )}
      />

      {activePanel === 'history' && auth.isAuthenticated ? (
        <HistorySidebar
          panelRef={panelRef}
          documentId={documentId}
          currentText={documentText}
          currentUser={actor}
          canEdit={canEdit}
          onRestoreVersion={handleRestoreVersion}
          onClose={closeActivePanel}
        />
      ) : null}

      {showShare && canManage ? (
        <ShareModal
          permissions={permissions}
          shareableLink={shareableLink}
          onClose={() => setShowShare(false)}
          onShare={handleShare}
          onUpdateLinkSettings={handleUpdateLinkSettings}
        />
      ) : null}

      {activePanel === 'comments' ? (
        <CommentsPanel
          panelRef={panelRef}
          comments={comments}
          selection={selection}
          onAddComment={auth.isAuthenticated ? handleAddComment : null}
          onReply={auth.isAuthenticated ? handleReply : null}
          onResolveToggle={auth.isAuthenticated ? handleResolveToggle : null}
          onClose={closeActivePanel}
        />
      ) : null}

      {activePanel === 'search' ? (
        <SearchPanel
          panelRef={panelRef}
          searchQuery={searchQuery}
          replaceValue={replaceValue}
          matchCount={searchMatches.length}
          currentMatch={currentMatchIndex}
          onSearchChange={setSearchQuery}
          onReplaceChange={setReplaceValue}
          onNext={handleSearchNext}
          onReplaceOne={handleReplaceOne}
          onReplaceAll={handleReplaceAll}
          onClose={closeActivePanel}
        />
      ) : null}

      <EditorLayout
        sidebar={(
          <OutlineSidebar
            title={title}
            headings={outlineHeadings}
            activeHeadingId={activeHeadingId}
            onJumpToHeading={handleJumpToHeading}
          />
        )}
      >
        {!auth.isAuthenticated && docAccess?.visibility === 'link' ? (
          <div className="viewer-banner">
            <p>Viewing via shared link. Sign in to comment, collaborate, or create your own copy.</p>
            <button
              className="primary-button"
              onClick={() => {
                saveRedirectAfterLogin(pathname);
                navigateToPath('/login');
              }}
            >
              Sign In
            </button>
          </div>
        ) : null}

        <EditorComponent
          key={editorInstanceKey}
          currentUser={actor}
          initialState={documentState}
          canEdit={canEdit}
          searchQuery={searchQuery}
          comments={comments}
          zoomLevel={zoomLevel}
          onContentChange={setDocumentText}
          onOutlineChange={handleOutlineChange}
          onSelectionChange={setSelection}
          onEditorReady={handleEditorReady}
          onOpenSearch={() => togglePanel('search')}
        />

        {(eventsFeed.length || heatmap.length) ? (
          <div className="workspace-footnote">
            <span>{eventsFeed[0] || 'Ready for collaboration.'}</span>
            {heatmap[0]?.label ? <span>{heatmap[0].label}</span> : null}
          </div>
        ) : null}
      </EditorLayout>

      {dialogState === 'word-count' ? (
        <Dialog title="Word Count" onClose={closeDialog}>
          <div className="dialog-stat-grid">
            <div className="dialog-stat-card">
              <strong>{wordCount.words}</strong>
              <span>Words</span>
            </div>
            <div className="dialog-stat-card">
              <strong>{wordCount.characters}</strong>
              <span>Characters</span>
            </div>
            <div className="dialog-stat-card">
              <strong>{wordCount.charactersNoSpaces}</strong>
              <span>Characters without spaces</span>
            </div>
          </div>
        </Dialog>
      ) : null}

      {dialogState === 'help' ? (
        <Dialog title="About This Editor" onClose={closeDialog}>
          <p className="dialog-copy">
            This collaborative editor supports real-time editing, comments, shared links, version history, and Google sign-in.
          </p>
          <p className="dialog-copy">
            Use the menu bar for document actions, the format strip for quick editing, and the right-side icons for comments, history, and search.
          </p>
        </Dialog>
      ) : null}
    </div>
  );
};

function App() {
  const pathname = usePathname();
  const route = getRoute(pathname);
  const auth = useAuth();
  const { theme, toggleTheme } = useTheme();
  const currentUser = useMemo(() => {
    if (!auth.profile) {
      return null;
    }

    return {
      ...auth.profile,
      userId: auth.profile.uid,
      uid: auth.profile.uid,
      username: auth.profile.username,
      color: colorFromId(auth.profile.uid),
    };
  }, [auth.profile]);

  const createAndOpenDocument = useCallback(async (options = {}) => {
    const { navigate = true } = options;
    const document = await createDocument();
    if (navigate) {
      navigateToPath(`/doc/${document.documentId}`);
    }
    return document;
  }, []);

  const handleLogout = useCallback(async () => {
    await auth.signOut();
    navigateToPath('/login', { replace: true });
  }, [auth]);

  useEffect(() => {
    if (pathname === '/') {
      navigateToPath('/login', { replace: true });
    }
  }, [pathname]);

  if (route.name === 'login') {
    return <LoginRoute auth={auth} onCreateAndOpenDocument={createAndOpenDocument} />;
  }

  if (route.name === 'documents') {
    return (
      <PrivateRoute auth={auth} pathname={pathname}>
        <DocumentsRoute auth={auth} onCreateAndOpenDocument={createAndOpenDocument} />
      </PrivateRoute>
    );
  }

  if (route.name === 'document') {
    return (
      <DocumentRoute
        auth={auth}
        currentUser={currentUser}
        pathname={pathname}
        routeDocumentId={route.documentId}
        theme={theme}
        toggleTheme={toggleTheme}
        onCreateAndOpenDocument={createAndOpenDocument}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <EmptyState
      title="Page Not Found"
      message="The page you requested does not exist."
      actions={<button className="primary-button" onClick={() => navigateToPath('/login')}>Go to Login</button>}
    />
  );
}

export default App;
