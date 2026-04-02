import axios from 'axios';

let tokenProvider = async () => null;

export const setAuthTokenProvider = (provider) => {
  tokenProvider = provider || (async () => null);
};

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

api.interceptors.request.use(async (config) => {
  const token = await tokenProvider();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export const getCurrentUser = async () => {
  const response = await api.get('/auth/me');
  return response.data.user;
};

export const createDocument = async () => {
  const response = await api.post('/documents', {});
  return response.data;
};

export const listDocuments = async () => {
  const response = await api.get('/documents');
  return response.data;
};

export const getDocument = async (id) => {
  const response = await api.get(`/documents/${id}`);
  return response.data;
};

export const updateDocument = async (id, content) => {
  const response = await api.put(`/documents/${id}`, content);
  return response.data;
};

export const deleteDocument = async (id) => {
  const response = await api.delete(`/documents/${id}`);
  return response.data;
};

export const addComment = async (id, payload) => {
  const response = await api.post(`/documents/${id}/comments`, payload);
  return response.data;
};

export const updateComment = async (id, commentId, payload) => {
  const response = await api.put(`/documents/${id}/comments/${commentId}`, payload);
  return response.data;
};

export const addSuggestion = async (id, payload) => {
  const response = await api.post(`/documents/${id}/suggestions`, payload);
  return response.data;
};

export const updateSuggestion = async (id, suggestionId, payload) => {
  const response = await api.put(`/documents/${id}/suggestions/${suggestionId}`, payload);
  return response.data;
};

export const shareDocument = async (id, payload) => {
  const response = await api.patch(`/documents/${id}/share`, payload);
  return response.data;
};

export const getPermissions = async (id) => {
  const response = await api.get(`/documents/${id}/permissions`);
  return response.data;
};

export const updatePermissions = async (id, payload) => {
  const response = await api.put(`/documents/${id}/permissions`, payload);
  return response.data;
};
