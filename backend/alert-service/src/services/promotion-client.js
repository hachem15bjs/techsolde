// Reads promotions and coupons from the Promotion Service REST API using Node's built-in fetch.
// The Alert Service never connects to the promotions database directly.
import { ApiError } from '../utils/api-error.js';
import { getDetectionSettings } from '../config/settings.js';

const PAGE_SIZE = 100; // the Promotion Service accepts at most 100 items per page
const MAX_PAGES = 50;

async function getJson(path) {
  const { promotionApiUrl, requestTimeoutMs } = getDetectionSettings();
  let response;
  try {
    response = await fetch(`${promotionApiUrl}${path}`, { signal: AbortSignal.timeout(requestTimeoutMs) });
  } catch {
    throw new ApiError(502, `Promotion Service is unavailable at ${promotionApiUrl}. Start it and try again.`);
  }
  if (!response.ok) {
    throw new ApiError(502, `Promotion Service answered ${response.status} for ${path}.`);
  }
  return response.json();
}

// Collects every page of active records, e.g. /promotions?status=active&page=1&limit=100
async function fetchAllActive(resource) {
  const items = [];
  let page = 1;
  let totalPages = 1;

  do {
    const body = await getJson(`/${resource}?status=active&page=${page}&limit=${PAGE_SIZE}`);
    if (!Array.isArray(body?.data)) {
      throw new ApiError(502, `Promotion Service returned an unexpected response for /${resource}.`);
    }
    items.push(...body.data);
    totalPages = body.meta?.totalPages ?? 1;
    page += 1;
  } while (page <= totalPages && page <= MAX_PAGES);

  return items;
}

export async function fetchPromotionData() {
  // Both requests are sent at the same time; await waits for both answers.
  const [promotions, coupons] = await Promise.all([fetchAllActive('promotions'), fetchAllActive('coupons')]);
  return { promotions, coupons };
}

export async function isPromotionServiceReachable() {
  try {
    await getJson('/health');
    return true;
  } catch {
    return false;
  }
}
