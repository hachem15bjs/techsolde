import axios from 'axios';
import { serviceUrls } from '../utils/service-config.js';

export function getServiceApiClient(service) {
  const baseURL = serviceUrls[service];
  if (!baseURL) throw new Error(`Configure an API URL for the "${service}" service.`);
  return axios.create({ baseURL, headers: { 'Content-Type': 'application/json' }, timeout: 10000 });
}

export const promotionApi = getServiceApiClient('promotions');

export function getApiErrorMessage(error, serviceName = 'Promotion Service') {
  if (error.response?.data?.error?.message) return error.response.data.error.message;
  if (error.code === 'ECONNABORTED') return 'The request timed out. Please try again.';
  if (!error.response) return `Cannot reach the ${serviceName}. Check that it is running.`;
  return 'Something went wrong. Please try again.';
}
