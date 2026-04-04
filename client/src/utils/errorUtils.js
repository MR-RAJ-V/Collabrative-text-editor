export const getErrorMessage = (error, fallbackMessage = 'Something went wrong') => (
  error?.response?.data?.message
  || error?.message
  || fallbackMessage
);
