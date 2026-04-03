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

export const normalizeVersionText = (value) => String(value || '')
  .replace(/\s+/g, ' ')
  .trim();

export const extractComparableTextFromDoc = (doc) => {
  if (!doc) {
    return '';
  }

  let output = '';

  doc.descendants((node) => {
    if (node.isText) {
      output += node.text || '';
    }
  });

  return output;
};

export const buildDiffRanges = (beforeText, afterText) => {
  const before = normalizeVersionText(beforeText).split(/(\s+)/).filter(Boolean);
  const after = normalizeVersionText(afterText).split(/(\s+)/).filter(Boolean);
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
  let beforeOffset = 0;
  let afterOffset = 0;

  const pushSegment = (type, value, beforeStart, beforeEnd, afterStart, afterEnd) => {
    if (!value) {
      return;
    }

    const previous = segments[segments.length - 1];
    if (
      previous?.type === type
      && previous.beforeEnd === beforeStart
      && previous.afterEnd === afterStart
    ) {
      previous.value += value;
      previous.beforeEnd = beforeEnd;
      previous.afterEnd = afterEnd;
      return;
    }

    segments.push({
      type,
      value,
      beforeStart,
      beforeEnd,
      afterStart,
      afterEnd,
    });
  };

  while (i < before.length && j < after.length) {
    if (before[i] === after[j]) {
      const value = before[i];
      pushSegment('equal', value, beforeOffset, beforeOffset + value.length, afterOffset, afterOffset + value.length);
      beforeOffset += value.length;
      afterOffset += value.length;
      i += 1;
      j += 1;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      const value = before[i];
      pushSegment('delete', value, beforeOffset, beforeOffset + value.length, afterOffset, afterOffset);
      beforeOffset += value.length;
      i += 1;
    } else {
      const value = after[j];
      pushSegment('insert', value, beforeOffset, beforeOffset, afterOffset, afterOffset + value.length);
      afterOffset += value.length;
      j += 1;
    }
  }

  while (i < before.length) {
    const value = before[i];
    pushSegment('delete', value, beforeOffset, beforeOffset + value.length, afterOffset, afterOffset);
    beforeOffset += value.length;
    i += 1;
  }

  while (j < after.length) {
    const value = after[j];
    pushSegment('insert', value, beforeOffset, beforeOffset, afterOffset, afterOffset + value.length);
    afterOffset += value.length;
    j += 1;
  }

  return segments;
};

export const buildDiffSegments = (beforeText, afterText) => {
  return buildDiffRanges(beforeText, afterText).map(({ type, value }) => ({ type, value }));
};

export const getDiffStats = (beforeText, afterText) => {
  const ranges = buildDiffRanges(beforeText, afterText);

  return ranges.reduce((stats, range) => {
    if (range.type === 'insert') {
      stats.added += range.value.length;
    }

    if (range.type === 'delete') {
      stats.removed += range.value.length;
    }

    return stats;
  }, { added: 0, removed: 0 });
};

export const formatDiffSummary = ({ added = 0, removed = 0 } = {}) => {
  const parts = [];

  if (added > 0) {
    parts.push(`Added ${added} char${added === 1 ? '' : 's'}`);
  }

  if (removed > 0) {
    parts.push(`Removed ${removed} char${removed === 1 ? '' : 's'}`);
  }

  if (!parts.length) {
    return 'No differences from current version';
  }

  return parts.join(' • ');
};
