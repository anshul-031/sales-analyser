export const getAuthenticatedUser = async (request: Request) => {
  // Return a dummy user for testing purposes
  return {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
  };
};

export const verifyToken = async (token: string) => {
  if (token === 'valid-token') {
    return { userId: 'test-user-id' };
  }
  return null;
};

export const generateToken = (userId: string) => {
  return 'mock-token-for-' + userId;
};
