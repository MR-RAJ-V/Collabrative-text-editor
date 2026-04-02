import * as Y from 'yjs';

export const normalizeBinaryPayload = (value) => {
  if (!value) {
    return new Uint8Array();
  }

  if (value instanceof Uint8Array) {
    return value;
  }

  if (value instanceof ArrayBuffer) {
    return new Uint8Array(value);
  }

  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }

  if (typeof value === 'string') {
    const binary = window.atob(value);
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }

    return bytes;
  }

  if (Array.isArray(value)) {
    return new Uint8Array(value);
  }

  if (value.type === 'Buffer' && Array.isArray(value.data)) {
    return new Uint8Array(value.data);
  }

  return new Uint8Array();
};

export const extractTextFromYjsState = (state) => {
  const bytes = normalizeBinaryPayload(state);
  if (!bytes.length) {
    return '';
  }

  try {
    const ydoc = new Y.Doc();
    Y.applyUpdate(ydoc, bytes);
    return ydoc
      .getXmlFragment('default')
      .toString()
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  } catch {
    return '';
  }
};

export const buildDiffSegments = (beforeText, afterText) => {
  const before = (beforeText || '').split(/(\s+)/).filter(Boolean);
  const after = (afterText || '').split(/(\s+)/).filter(Boolean);
  const dp = Array.from({ length: before.length + 1 }, () => Array(after.length + 1).fill(0));

  for (let i = before.length - 1; i >= 0; i -= 1) {
    for (let j = after.length - 1; j >= 0; j -= 1) {
      if (before[i] === after[j]) {
        dp[i][j] = dp[i + 1][j + 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  const segments = [];
  let i = 0;
  let j = 0;

  const pushSegment = (type, value) => {
    if (!value) {
      return;
    }

    const previous = segments[segments.length - 1];
    if (previous?.type === type) {
      previous.value += value;
      return;
    }

    segments.push({ type, value });
  };

  while (i < before.length && j < after.length) {
    if (before[i] === after[j]) {
      pushSegment('equal', before[i]);
      i += 1;
      j += 1;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      pushSegment('delete', before[i]);
      i += 1;
    } else {
      pushSegment('insert', after[j]);
      j += 1;
    }
  }

  while (i < before.length) {
    pushSegment('delete', before[i]);
    i += 1;
  }

  while (j < after.length) {
    pushSegment('insert', after[j]);
    j += 1;
  }

  return segments;
};
