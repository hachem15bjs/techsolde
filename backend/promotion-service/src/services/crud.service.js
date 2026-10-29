import mongoose from 'mongoose';
import { ApiError } from '../utils/api-error.js';

const allowedStatuses = new Set(['active', 'inactive']);

export function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function parseListQuery(query) {
  const page = Number.parseInt(query.page ?? '1', 10);
  const limit = Number.parseInt(query.limit ?? '10', 10);
  const status = query.status;
  const sort = query.sort ?? 'desc';

  if (!Number.isInteger(page) || page < 1) throw new ApiError(400, 'Page must be a positive integer.');
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new ApiError(400, 'Limit must be an integer between 1 and 100.');
  }
  if (status && !allowedStatuses.has(status)) throw new ApiError(400, 'Status must be active or inactive.');
  if (!['asc', 'desc'].includes(sort)) throw new ApiError(400, 'Sort must be asc or desc.');

  return { page, limit, status, sort, search: (query.search ?? '').trim() };
}

export async function listRecords(Model, query, searchFields) {
  const { page, limit, status, sort, search } = parseListQuery(query);
  const filter = {};
  if (status) filter.isActive = status === 'active';
  if (search) {
    const pattern = new RegExp(escapeRegex(search), 'i');
    filter.$or = searchFields.map((field) => ({ [field]: pattern }));
  }

  const [items, totalItems] = await Promise.all([
    Model.find(filter)
      .sort({ createdAt: sort === 'asc' ? 1 : -1, _id: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Model.countDocuments(filter)
  ]);
  const totalPages = Math.ceil(totalItems / limit);

  return {
    items,
    meta: {
      page,
      limit,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1 && totalPages > 0
    }
  };
}

export function validateId(id) {
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, 'Invalid record ID.');
}

export async function getRecord(Model, id) {
  validateId(id);
  const item = await Model.findById(id).lean();
  if (!item) throw new ApiError(404, 'Record not found.');
  return item;
}

export async function updateRecord(Model, id, updates, schema) {
  validateId(id);
  const record = await Model.findById(id);
  if (!record) throw new ApiError(404, 'Record not found.');

  const candidate = { ...record.toObject(), ...updates };
  const validation = schema.safeParse(candidate);
  if (!validation.success) {
    throw new ApiError(
      400,
      'Request validation failed.',
      validation.error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message }))
    );
  }

  record.set(validation.data);
  await record.save();
  return record.toObject();
}
