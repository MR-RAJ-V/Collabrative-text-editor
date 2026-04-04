const sendError = (res, error, fallbackMessage = 'Unexpected server error') => {
  const statusCode = error?.statusCode || 500;
  const message = error?.message || fallbackMessage;
  return res.status(statusCode).json({ message });
};

module.exports = {
  sendError,
};
