# Promotion Service API

Base URL: `http://localhost:5003/api`

All endpoints return JSON. An entity response is wrapped as `{ "success": true, "data": ... }`. List responses also return `meta`:

```json
{
  "success": true,
  "data": [],
  "meta": {
    "page": 1,
    "limit": 10,
    "totalItems": 0,
    "totalPages": 0,
    "hasNextPage": false,
    "hasPreviousPage": false
  }
}
```

Errors use `{ "success": false, "error": { "message": "...", "details": [] } }`. `details` appears when field-level validation information is available.

## Health

### `GET /health`

Mounted under `/api`, so use `GET /api/health`. Returns HTTP 200 when MongoDB is connected and HTTP 503 when it is not.

## Promotions

### `GET /promotions`

List promotions. Optional query parameters: `search` (title or code), `status` (`active`/`inactive`, based on `isActive`), `page` (positive integer, default 1), `limit` (1–100, default 10), and `sort` (`asc`/`desc` by creation date, default `desc`).

### `GET /promotions/stats`

Returns MongoDB counts: `totalPromotions`, `activePromotions`, `expiredPromotions`, `upcomingPromotions`, `totalCoupons`, and `availableCoupons`.

- Active promotions are enabled and have `startDate <= now <= endDate`.
- Expired promotions have `endDate < now`, whether or not they are enabled.
- Upcoming promotions are enabled, have a future start date, and have not already expired.
- Available coupons are enabled, not expired, and either unlimited or below their configured usage limit.

### `GET /promotions/:id`

Read one promotion by its MongoDB ObjectId.

### `POST /promotions`

Create a promotion with a JSON body:

```json
{
  "title": "Laptop Student Discount",
  "description": "Discounts for students.",
  "code": "STUDENT10",
  "discountType": "percentage",
  "discountValue": 10,
  "startDate": "2026-10-01T00:00:00.000Z",
  "endDate": "2026-12-31T23:59:59.000Z",
  "isActive": true
}
```

`title`, `code`, `discountType`, `discountValue`, `startDate`, and `endDate` are required. Codes are trimmed, uppercased, and unique. `discountType` is `percentage` or `fixed`. The discount must be positive; a percentage cannot exceed 100. The end must be after the start. `description` is optional and `isActive` defaults to true.

Success: HTTP 201.

### `PUT /promotions/:id`

Update a promotion. Send any fields to change; the service combines them with the stored record and validates the complete result before saving. Validation, duplicate codes, and invalid IDs use the same errors as creation.

### `DELETE /promotions/:id`

Delete the record. Success returns HTTP 200 and a confirmation message.

## Coupons

### `GET /coupons`

List coupons. Supports the same query parameters as `GET /promotions`; search checks code and description.

### `GET /coupons/:id`

Read one coupon by MongoDB ObjectId.

### `POST /coupons`

Create a coupon:

```json
{
  "code": "WELCOME10",
  "description": "Welcome coupon.",
  "discountType": "percentage",
  "discountValue": 10,
  "usageLimit": 500,
  "usedCount": 0,
  "expirationDate": "2027-12-31T23:59:59.000Z",
  "isActive": true
}
```

`code`, `discountType`, `discountValue`, and `expirationDate` are required. Codes are trimmed, uppercased, and unique. `discountValue` must be positive; percentage discounts cannot exceed 100. `usageLimit` is an optional non-negative integer; omitting it means unlimited uses. `usedCount` is a non-negative integer, defaults to zero, and cannot exceed a configured usage limit. `isActive` defaults to true. Coupon CRUD is standalone: it does not call other microservices or redeem a coupon.

Success: HTTP 201.

### `PUT /coupons/:id`

Update one or more coupon fields. The resulting record is validated as a whole; changing `usageLimit` below the existing `usedCount` is rejected.

### `DELETE /coupons/:id`

Delete the record. Success returns HTTP 200 and a confirmation message.

## Error codes

| Status | Meaning |
|---|---|
| 400 | Invalid ID, invalid input, or invalid list query |
| 404 | No matching record or route |
| 409 | Duplicate promotion or coupon code |
| 500 | Unexpected internal error; production responses do not expose stack traces |
| 503 | Health check reports MongoDB disconnected |

The API is intentionally unauthenticated for local coursework validation. Protect it using the real User Service authentication and authorization before public deployment.
