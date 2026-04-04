import { useState, useCallback, useEffect, useRef } from 'react';
import { createDocument, deleteDocument, listDocuments, updateDocument } from '../services/api';
import { socket } from '../services/socket';
import { getErrorMessage } from '../utils/errorUtils';

export const useDocuments = (isAuthenticated) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const documentsRef = useRef([]);
  const titleSaveTimeoutsRef = useRef(new Map());
  const persistedTitlesRef = useRef(new Map());

  useEffect(() => {
    documentsRef.current = documents;
  }, [documents]);

  const normalizeDocuments = useCallback((data) => {
    const nextDocuments = data?.documents || data || [];
    return Array.isArray(nextDocuments) ? nextDocuments : [];
  }, []);

  const getDocumentId = useCallback((document) => document?.documentId || document?._id || document?.id, []);

  const syncPersistedTitles = useCallback((nextDocuments) => {
    nextDocuments.forEach((document) => {
      const documentId = getDocumentId(document);
      if (documentId) {
        persistedTitlesRef.current.set(documentId, document.title || 'Untitled Document');
      }
    });
  }, [getDocumentId]);

  const applyDocumentPatch = useCallback((id, updater) => {
    setDocuments((prev) => prev.map((document) => {
      const documentId = getDocumentId(document);
      if (documentId !== id) {
        return document;
      }

      return typeof updater === 'function' ? updater(document) : { ...document, ...updater };
    }));
  }, [getDocumentId]);

  const fetchDocuments = useCallback(async () => {
    if (!isAuthenticated) {
      setDocuments([]);
      setLoading(false);
      setError('');
      return;
    }

    try {
      const data = await listDocuments();
      const nextDocuments = normalizeDocuments(data);
      setDocuments(nextDocuments);
      syncPersistedTitles(nextDocuments);
      setError('');
    } catch (e) {
      console.error('Failed to fetch documents', e);
      setError(getErrorMessage(e, 'Failed to load your documents'));
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, normalizeDocuments, syncPersistedTitles]);

  const createLocalDocument = useCallback((document) => ({
    _id: document.documentId,
    documentId: document.documentId,
    title: document.title || 'Untitled Document',
    owner: document.owner || null,
    visibility: document.visibility || 'private',
    createdAt: document.createdAt || new Date().toISOString(),
    updatedAt: document.updatedAt || document.lastUpdated || new Date().toISOString(),
  }), []);

  const handleCreateDocument = useCallback(async () => {
    const document = await createDocument();
    const nextDocument = createLocalDocument(document);

    setDocuments((prev) => {
      const filtered = prev.filter((item) => (item.documentId || item._id || item.id) !== nextDocument.documentId);
      return [nextDocument, ...filtered];
    });
    persistedTitlesRef.current.set(nextDocument.documentId, nextDocument.title);

    return document;
  }, [createLocalDocument]);

  const upsertDocument = useCallback((document) => {
    const nextDocument = createLocalDocument(document);

    setDocuments((prev) => {
      const existingIndex = prev.findIndex((item) => getDocumentId(item) === nextDocument.documentId);
      if (existingIndex === -1) {
        return [nextDocument, ...prev];
      }

      return prev.map((item, index) => (index === existingIndex ? { ...item, ...nextDocument } : item));
    });

    persistedTitlesRef.current.set(nextDocument.documentId, nextDocument.title);
    return nextDocument;
  }, [createLocalDocument, getDocumentId]);

  const handleDeleteDocument = useCallback(async (id) => {
    const previous = documents;
    setDocuments((prev) => prev.filter((document) => (document.documentId || document._id || document.id) !== id));

    try {
      await deleteDocument(id);
    } catch (e) {
      console.error('Failed to delete document', e);
      setDocuments(previous);
      throw e;
    }
  }, [documents]);

  const flushDocumentTitle = useCallback(async (id) => {
    const currentDocument = documentsRef.current.find((document) => getDocumentId(document) === id);
    if (!currentDocument) {
      return null;
    }

    const trimmedTitle = String(currentDocument.title || '').trim() || 'Untitled Document';
    const rollbackTitle = persistedTitlesRef.current.get(id) || 'Untitled Document';

    applyDocumentPatch(id, { title: trimmedTitle, updatedAt: new Date().toISOString() });

    try {
      const updated = await updateDocument(id, { title: trimmedTitle });
      upsertDocument(updated);
      return updated;
    } catch (e) {
      console.error('Failed to rename document', e);
      applyDocumentPatch(id, { title: rollbackTitle });
      throw e;
    }
  }, [applyDocumentPatch, getDocumentId, upsertDocument]);

  const updateDocumentTitle = useCallback((id, title, options = {}) => {
    const { immediate = false, persist = true } = options;
    const trimmedTitle = String(title || '').trim() || 'Untitled Document';

    applyDocumentPatch(id, {
      title: trimmedTitle,
      updatedAt: new Date().toISOString(),
    });

    const existingTimeout = titleSaveTimeoutsRef.current.get(id);
    if (existingTimeout) {
      window.clearTimeout(existingTimeout);
      titleSaveTimeoutsRef.current.delete(id);
    }

    if (!persist) {
      return Promise.resolve(null);
    }

    if (immediate) {
      return flushDocumentTitle(id);
    }

    const timeoutId = window.setTimeout(async () => {
      titleSaveTimeoutsRef.current.delete(id);
      try {
        await flushDocumentTitle(id);
      } catch {
        // Rollback is handled inside flushDocumentTitle.
      }
    }, 400);

    titleSaveTimeoutsRef.current.set(id, timeoutId);
    return Promise.resolve(null);
  }, [applyDocumentPatch, flushDocumentTitle]);

  useEffect(() => {
    fetchDocuments();

    socket.on('connect', fetchDocuments);
    socket.on('document-created', fetchDocuments);
    socket.on('document-deleted', fetchDocuments);
    socket.on('doc-updated', fetchDocuments);

    return () => {
      socket.off('connect', fetchDocuments);
      socket.off('document-created', fetchDocuments);
      socket.off('document-deleted', fetchDocuments);
      socket.off('doc-updated', fetchDocuments);
    };
  }, [fetchDocuments]);

  useEffect(() => () => {
    titleSaveTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    titleSaveTimeoutsRef.current.clear();
  }, []);

  return {
    documents,
    setDocuments,
    loading,
    error,
    upsertDocument,
    createDocument: handleCreateDocument,
    deleteDocument: handleDeleteDocument,
    renameDocument: (id, title) => updateDocumentTitle(id, title, { immediate: true }),
    updateDocumentTitle,
    flushDocumentTitle,
    refresh: fetchDocuments,
  };
};
