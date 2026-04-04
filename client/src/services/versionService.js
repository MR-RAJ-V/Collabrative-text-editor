import axios from 'axios';
import { apiBaseUrl } from '../config/appConfig';
import { normalizeBinaryPayload } from '../utils/versionUtils';

let tokenProvider = async () => null;

export const setVersionTokenProvider = (provider) => {
  tokenProvider = provider || (async () => null);
};

const api = axios.create({
  baseURL: apiBaseUrl,
});

api.interceptors.request.use(async (config) => {
  const token = await tokenProvider();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export const listVersions = async (documentId) => {
  const response = await api.get(`/documents/${documentId}/versions`);
  return response.data;
};

export const getVersion = async (documentId, versionId) => {
  const response = await api.get(`/documents/${documentId}/versions/${versionId}`);
  return {
    ...response.data,
    stateBuffer: normalizeBinaryPayload(response.data.yjsState),
  };
};

export const createVersion = async (documentId, payload) => {
  const response = await api.post(`/documents/${documentId}/versions`, payload);
  return response.data;
};

export const restoreVersion = async (documentId, versionId, payload) => {
  const response = await api.post(`/documents/${documentId}/versions/restore/${versionId}`, payload);
  return response.data;
};

export const captureVersionOnUnload = (documentId, payload) => {
  if (!documentId) {
    return;
  }

  const token = payload?.token;
  const url = `${apiBaseUrl}/documents/${documentId}/versions`;

  window.fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    keepalive: true,
    body: JSON.stringify({
      ...payload,
      token: undefined,
      trigger: 'before-unload',
    }),
  }).catch(() => {});
};

export { normalizeBinaryPayload };
