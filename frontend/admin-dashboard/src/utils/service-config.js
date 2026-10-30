const env = import.meta.env;

export const serviceUrls = {
  promotions: env.VITE_PROMOTION_API_URL || 'http://localhost:5003/api',
  alerts: env.VITE_ALERT_API_URL || 'http://localhost:5004/api',
  products: env.VITE_PRODUCT_API_URL || '',
  users: env.VITE_USER_API_URL || '',
  orders: env.VITE_ORDER_API_URL || '',
  payments: env.VITE_PAYMENT_API_URL || '',
  notifications: env.VITE_NOTIFICATION_API_URL || ''
};
