// Plain JavaScript validation. Each function returns { value, errors }:
// "value" holds the cleaned input and "errors" lists every problem found.
import mongoose from 'mongoose';
import { ALERT_TYPES, SEVERITIES, SOURCES, STATUSES } from '../models/alert.model.js';

const EDITABLE_FIELDS = ['title', 'description', 'severity', 'notes', 'relatedEntityType', 'relatedEntityId', 'relatedEntityLabel'];
const ENTITY_TYPES = ['promotion', 'coupon'];
const SORTS = ['newest', 'oldest', 'severity'];

function checkText(body, field, { required = false, min = 0, max }, value, errors) {
  if (body[field] === undefined) {
    if (required) errors.push({ field, message: `${field} is required.` });
    return;
  }
  if (typeof body[field] !== 'string') {
    errors.push({ field, message: `${field} must be text.` });
    return;
  }
  const text = body[field].trim();
  if (text.length < min) errors.push({ field, message: `${field} must contain at least ${min} characters.` });
  else if (text.length > max) errors.push({ field, message: `${field} must contain at most ${max} characters.` });
  else value[field] = text;
}

// Used for POST (partial = false) and PUT (partial = true) on manual alerts.
export function validateAlertInput(body, { partial = false } = {}) {
  const errors = [];
  const value = {};

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { value, errors: [{ field: 'body', message: 'Send a JSON object.' }] };
  }

  for (const field of Object.keys(body)) {
    if (field === 'status') {
      errors.push({ field, message: 'Use the acknowledge, resolve or reopen actions to change the status.' });
    } else if (!EDITABLE_FIELDS.includes(field)) {
      errors.push({ field, message: `${field} cannot be set; it is managed by the Alert Service.` });
    }
  }

  checkText(body, 'title', { required: !partial, min: 3, max: 150 }, value, errors);
  checkText(body, 'description', { max: 1000 }, value, errors);
  checkText(body, 'notes', { max: 1000 }, value, errors);
  checkText(body, 'relatedEntityLabel', { max: 120 }, value, errors);

  if (body.severity === undefined) {
    if (!partial) errors.push({ field: 'severity', message: 'severity is required.' });
  } else if (!SEVERITIES.includes(body.severity)) {
    errors.push({ field: 'severity', message: `severity must be one of: ${SEVERITIES.join(', ')}.` });
  } else {
    value.severity = body.severity;
  }

  if (body.relatedEntityType !== undefined) {
    if (body.relatedEntityType === null || body.relatedEntityType === '') {
      value.relatedEntityType = null;
      value.relatedEntityId = null;
      value.relatedEntityLabel = '';
    } else if (!ENTITY_TYPES.includes(body.relatedEntityType)) {
      errors.push({ field: 'relatedEntityType', message: 'relatedEntityType must be promotion, coupon or null.' });
    } else if (!mongoose.isValidObjectId(body.relatedEntityId)) {
      errors.push({ field: 'relatedEntityId', message: 'Choose a valid promotion or coupon ID.' });
    } else {
      value.relatedEntityType = body.relatedEntityType;
      value.relatedEntityId = body.relatedEntityId;
    }
  } else if (body.relatedEntityId !== undefined) {
    errors.push({ field: 'relatedEntityType', message: 'Send relatedEntityType together with relatedEntityId.' });
  }

  if (partial && errors.length === 0 && Object.keys(value).length === 0) {
    errors.push({ field: 'body', message: 'Send at least one field to update.' });
  }

  return { value, errors };
}

// Checks ?page=&limit=&search=&severity=&status=&type=&source=&sort= on GET /api/alerts
export function validateListQuery(query) {
  const errors = [];
  const page = Number(query.page ?? 1);
  const limit = Number(query.limit ?? 10);

  if (!Number.isInteger(page) || page < 1) errors.push({ field: 'page', message: 'page must be a positive whole number.' });
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) errors.push({ field: 'limit', message: 'limit must be a whole number between 1 and 100.' });

  const allowed = { severity: SEVERITIES, status: STATUSES, type: ALERT_TYPES, source: SOURCES, sort: SORTS };
  for (const [field, options] of Object.entries(allowed)) {
    if (query[field] !== undefined && query[field] !== '' && !options.includes(query[field])) {
      errors.push({ field, message: `${field} must be one of: ${options.join(', ')}.` });
    }
  }

  const search = typeof query.search === 'string' ? query.search.trim() : '';
  if (search.length > 100) errors.push({ field: 'search', message: 'search must contain at most 100 characters.' });

  return {
    errors,
    value: {
      page,
      limit,
      search,
      severity: query.severity || undefined,
      status: query.status || undefined,
      type: query.type || undefined,
      source: query.source || undefined,
      sort: query.sort || 'newest'
    }
  };
}
