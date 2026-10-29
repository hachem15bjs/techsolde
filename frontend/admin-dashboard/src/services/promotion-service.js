import { promotionApi } from './api-client.js';

export async function listPromotions(params = {}) {
  const { data } = await promotionApi.get('/promotions', { params });
  return data;
}

export async function getPromotion(id) {
  const { data } = await promotionApi.get(`/promotions/${id}`);
  return data.data;
}

export async function createPromotion(payload) {
  const { data } = await promotionApi.post('/promotions', payload);
  return data.data;
}

export async function updatePromotion(id, payload) {
  const { data } = await promotionApi.put(`/promotions/${id}`, payload);
  return data.data;
}

export async function deletePromotion(id) {
  const { data } = await promotionApi.delete(`/promotions/${id}`);
  return data;
}

export async function getPromotionStats() {
  const { data } = await promotionApi.get('/promotions/stats');
  return data.data;
}
