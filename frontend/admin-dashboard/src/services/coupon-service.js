import { promotionApi } from './api-client.js';

export async function listCoupons(params = {}) {
  const { data } = await promotionApi.get('/coupons', { params });
  return data;
}

export async function createCoupon(payload) {
  const { data } = await promotionApi.post('/coupons', payload);
  return data.data;
}

export async function updateCoupon(id, payload) {
  const { data } = await promotionApi.put(`/coupons/${id}`, payload);
  return data.data;
}

export async function deleteCoupon(id) {
  const { data } = await promotionApi.delete(`/coupons/${id}`);
  return data;
}
