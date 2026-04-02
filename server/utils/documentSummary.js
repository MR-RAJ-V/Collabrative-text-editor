const summarizeDiff = (beforeText = '', afterText = '') => {
  if (!beforeText && !afterText) {
    return 'Initialized empty document';
  }

  if (beforeText === afterText) {
    return 'Updated document metadata';
  }

  if (afterText.length > beforeText.length) {
    return `Added ${afterText.length - beforeText.length} characters`;
  }

  if (afterText.length < beforeText.length) {
    return `Removed ${beforeText.length - afterText.length} characters`;
  }

  return 'Edited document content';
};

module.exports = {
  summarizeDiff,
};
