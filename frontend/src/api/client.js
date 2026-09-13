const API_BASE = '/api';

export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('uoh_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const config = {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  };

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Something went wrong. Please try again.');
    }

    return data;
  } catch (err) {
    throw err;
  }
}

// API endpoints grouped by domain
export const api = {
  // Auth
  sendOTP: (body) => apiRequest('/auth/send-otp', { method: 'POST', body }),
  register: (body) => apiRequest('/auth/register', { method: 'POST', body }),
  login: (body) => apiRequest('/auth/login', { method: 'POST', body }),
  getProfile: () => apiRequest('/auth/profile'),
  updateProfile: (body) => apiRequest('/auth/profile', { method: 'PUT', body }),
  getStudentProfile: (id) => apiRequest(`/auth/students/${id}`),

  // Items
  getCategories: () => apiRequest('/items/categories'),
  getItems: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/items${query ? `?${query}` : ''}`);
  },
  getMyListings: () => apiRequest('/items/my-listings'),
  getItem: (id) => apiRequest(`/items/${id}`),
  createItem: (body) => apiRequest('/items', { method: 'POST', body }),
  uploadItemImage: (body) => apiRequest('/items/upload-image', { method: 'POST', body }),
  updateItem: (id, body) => apiRequest(`/items/${id}`, { method: 'PUT', body }),
  deleteItem: (id) => apiRequest(`/items/${id}`, { method: 'DELETE' }),
  toggleAvailability: (id) => apiRequest(`/items/${id}/toggle-availability`, { method: 'PATCH' }),

  // Borrows
  createBorrowRequest: (body) => apiRequest('/borrows', { method: 'POST', body }),
  getMyBorrows: () => apiRequest('/borrows/my-borrows'),
  getIncomingRequests: () => apiRequest('/borrows/incoming'),
  updateBorrowStatus: (id, body) => apiRequest(`/borrows/${id}/status`, { method: 'PATCH', body }),
  cancelBorrowRequest: (id) => apiRequest(`/borrows/${id}/cancel`, { method: 'PATCH' }),

  // Payments
  createPaymentOrder: (body) => apiRequest('/payments/create-order', { method: 'POST', body }),
  checkoutPayment: (body) => apiRequest('/payments/checkout', { method: 'POST', body }),
  verifyRazorpay: (body) => apiRequest('/payments/verify-razorpay', { method: 'POST', body }),
  getPaymentDetails: (borrowRequestId) => apiRequest(`/payments/request/${borrowRequestId}`),

  // Returns
  initiateReturn: (body) => apiRequest('/returns/initiate', { method: 'POST', body }),
  confirmReturn: (body) => apiRequest('/returns/confirm', { method: 'POST', body }),

  // Feedback
  submitFeedback: (body) => apiRequest('/feedback', { method: 'POST', body }),
  getItemReviews: (itemId) => apiRequest(`/feedback/item/${itemId}`),

  // Wishlist
  getWishlist: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/wishlist${query ? `?${query}` : ''}`);
  },
  createWishlist: (body) => apiRequest('/wishlist', { method: 'POST', body }),
  deleteWishlist: (id) => apiRequest(`/wishlist/${id}`, { method: 'DELETE' }),

  // Messages
  startConversation: (body) => apiRequest('/messages/start', { method: 'POST', body }),
  getConversations: () => apiRequest('/messages/conversations'),
  getMessages: (convoId) => apiRequest(`/messages/conversations/${convoId}`),
  sendMessage: (convoId, body) => apiRequest(`/messages/conversations/${convoId}`, { method: 'POST', body }),

  // Notifications
  getNotifications: () => apiRequest('/notifications'),
  markNotificationRead: (id) => apiRequest(`/notifications/${id}/read`, { method: 'PATCH' }),
  markAllNotificationsRead: () => apiRequest('/notifications/mark-all-read', { method: 'PATCH' }),

  // Admin Portal
  admin: {
    getStats: () => apiRequest('/admin/stats'),
    getUsers: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return apiRequest(`/admin/users${query ? `?${query}` : ''}`);
    },
    toggleUserBan: (id) => apiRequest(`/admin/users/${id}/ban`, { method: 'PATCH' }),
    deleteUser: (id) => apiRequest(`/admin/users/${id}`, { method: 'DELETE' }),
    getItems: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return apiRequest(`/admin/items${query ? `?${query}` : ''}`);
    },
    deleteItem: (id, body = {}) => apiRequest(`/admin/items/${id}`, { method: 'DELETE', body }),
    getBorrows: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return apiRequest(`/admin/borrows${query ? `?${query}` : ''}`);
    },
    forceCompleteBorrow: (id) => apiRequest(`/admin/borrows/${id}/force-complete`, { method: 'PATCH' }),
    createCategory: (body) => apiRequest('/admin/categories', { method: 'POST', body }),
    deleteCategory: (id) => apiRequest(`/admin/categories/${id}`, { method: 'DELETE' }),
  },
};
