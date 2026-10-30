import { getServiceApiClient } from './api-client.js';

const alertApi = getServiceApiClient('alerts');

export async function listAlerts(params = {}) {
  const { data } = await alertApi.get('/alerts', { params });
  return data;
}

export async function getAlert(id) {
  const { data } = await alertApi.get(`/alerts/${id}`);
  return data.data;
}

export async function createAlert(payload) {
  const { data } = await alertApi.post('/alerts', payload);
  return data.data;
}

export async function updateAlert(id, payload) {
  const { data } = await alertApi.put(`/alerts/${id}`, payload);
  return data.data;
}

export async function deleteAlert(id) {
  const { data } = await alertApi.delete(`/alerts/${id}`);
  return data;
}

export async function changeAlertStatus(id, action) {
  const { data } = await alertApi.patch(`/alerts/${id}/${action}`);
  return data.data;
}

export async function getAlertStats() {
  const { data } = await alertApi.get('/alerts/stats');
  return data.data;
}

export async function getScanStatus() {
  const { data } = await alertApi.get('/alerts/scan/status');
  return data.data;
}

// A scan calls the Promotion Service in turn, so it gets a longer timeout.
export async function runScan() {
  const { data } = await alertApi.post('/alerts/scan', null, { timeout: 30000 });
  return data;
}
