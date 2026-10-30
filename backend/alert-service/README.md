# TechSolde Alert Service — Alert Intelligence Center

The Alert Service watches TechSolde's promotions and coupons, **detects situations that need an administrator's attention**, saves them as alerts in MongoDB, and lets the administrator act on them (acknowledge, resolve, reopen, edit, delete).

Built only with the course technologies: **Node.js, Express.js, asynchronous JavaScript, MongoDB and Mongoose**. The interface is the existing React admin dashboard (new **Alerts** page).

---

## 1. What the Alert Service does

| Feature | What it means |
|---|---|
| Alert CRUD | Create, list, read, edit and delete alerts stored in MongoDB. |
| Smart detection | Five rules read real promotions/coupons and raise alerts automatically. |
| Status workflow | `new` → `acknowledged` → `resolved` (and `reopen`). Saved in MongoDB. |
| Search & filters | Search text, filter by severity / status / category, sort critical-first / newest / oldest, pagination. |
| Statistics | Totals, per status, per severity and per category — all counted by MongoDB. |

### Alert vs. notification

A *notification* only says "something happened". An **alert** describes a *condition that needs attention*: it has a **severity**, a **status**, details explaining why it was raised, the related promotion/coupon, and actions the administrator can take.

### The detection rules

| Rule (type) | Condition | Severity |
|---|---|---|
| `promotion_expiring` | Active promotion ending within the next 24 h | ≤ 6 h critical · ≤ 12 h high · else medium |
| `promotion_expired_active` | End date passed but promotion still active | high |
| `high_discount` | Active **percentage** promotion above 70 % | ≥ 90 % critical · else high |
| `coupon_usage` | Active coupon at ≥ 90 % of its `usageLimit` (uses the real `usedCount`) | 100 % critical · ≥ 95 % high · else medium |
| `coupon_expiring` | Active coupon expiring within 24 h | same as promotion expiring |
| `custom` | Created manually by the administrator | chosen by the admin |

Fixed-amount discounts (e.g. €80 off) are **never** treated as a percentage. Coupons without a usage limit are never reported as "running out". Thresholds are configurable in `.env`.

## 2. Why it is useful for TechSolde

Promotions and coupons cost money when they go wrong: a 95 % discount typed by mistake, a Black-Friday code still active a week later, a popular coupon that suddenly stops working because it hit its limit, or a flash sale ending with no follow-up. The Alert Service finds these situations automatically and puts them, sorted by severity, in front of the administrator.

## 3. Architecture

```
 ┌──────────────────────┐   HTTP (axios)   ┌──────────────────────────┐   Mongoose   ┌──────────────────────────┐
 │ React Admin Dashboard│ ───────────────► │ Alert Service (Express)  │ ───────────► │ MongoDB: techsolde_alerts │
 │  /alerts page        │                  │ port 5004                │              │ alerts, scanruns          │
 └──────────────────────┘                  └────────────┬─────────────┘              └──────────────────────────┘
                                                        │ HTTP GET (Node fetch), read-only
                                                        ▼
                                           ┌──────────────────────────┐   Mongoose   ┌──────────────────────────────┐
                                           │ Promotion Service        │ ───────────► │ MongoDB: techsolde_promotions │
                                           │ port 5003 (unchanged)    │              │ promotions, coupons           │
                                           └──────────────────────────┘              └──────────────────────────────┘
```

* The Alert Service has **its own Express app, its own port (5004) and its own database** (`techsolde_alerts`), as described in `INTEGRATION_GUIDE.md`.
* It reads promotions and coupons **only through the Promotion Service REST API** (`GET /api/promotions?status=active`, `GET /api/coupons?status=active`). It never opens or modifies the promotions database. The Promotion Service code was not changed.

### Folder structure

```
backend/alert-service/
├── src/
│   ├── server.js                  connects to MongoDB once, starts Express, starts the automatic scan timer
│   ├── app.js                     Express app: middleware, /api/health, /api/alerts routes, error handling
│   ├── seed.js                    demo data (npm run seed / npm run seed:clean)
│   ├── config/database.js         mongoose.connect / disconnect
│   ├── config/settings.js         reads detection settings from environment variables
│   ├── models/alert.model.js      Alert schema, validation, indexes
│   ├── models/scan-run.model.js   one document per scan (for "last scan" in the dashboard)
│   ├── routes/alert.routes.js     URL + HTTP method → controller
│   ├── controllers/alert.controller.js   reads the request, calls a service, sends the JSON response
│   ├── services/alert.service.js         CRUD, status changes, statistics (MongoDB queries)
│   ├── services/detection-rules.js       the five rules (pure JavaScript functions)
│   ├── services/detection.service.js     the scan: fetch → evaluate rules → save → auto-resolve
│   ├── services/promotion-client.js      HTTP calls to the Promotion Service
│   ├── validators/alert.validator.js     request body and query checks (plain JavaScript)
│   ├── middlewares/                       validation, database check, error handling
│   └── utils/                             ApiError class, asyncHandler
├── tests/                         automated tests (vitest + supertest)
├── docs/                          Postman collection + environment
├── .env.example
└── package.json
```

## 4. How Node.js is used

* **Node.js runs the server** (`node src/server.js`). It uses ES modules (`import`/`export`, `"type": "module"`).
* The **npm ecosystem** provides Express, Mongoose, dotenv, cors, helmet and morgan (`package.json`).
* **Environment variables** (`process.env`, loaded from `.env` by `dotenv`) hold the port, MongoDB URI, Promotion Service URL and rule thresholds — nothing is hardcoded.
* Node's **built-in `fetch`** calls the Promotion Service (no extra HTTP library).
* Node's **`setInterval`** timer runs the automatic scan in the background (`AUTO_SCAN_INTERVAL_MINUTES`).
* `process.on('SIGINT')` closes the server and the database connection cleanly when you press Ctrl+C.

## 5. How Express routes work

`app.js` mounts the router: `app.use('/api/alerts', requireDatabase, alertRoutes)`. In `alert.routes.js` each line connects an HTTP method + URL to a controller:

```js
router.get('/stats', getStats);                                    // GET  /api/alerts/stats
router.post('/', validateBody(validateAlertInput), createAlert);  // POST /api/alerts
router.patch('/:id/resolve', resolveAlert);                        // PATCH /api/alerts/:id/resolve
```

Fixed paths (`/stats`, `/scan`) are declared **before** `/:id`, otherwise Express would treat the word "stats" as an ID.

## 6. How asynchronous operations work

Every database call and HTTP call returns a **Promise**, and we wait for it with `async`/`await`, so Node.js keeps serving other requests while it waits (non-blocking I/O):

```js
const [promotions, coupons] = await Promise.all([fetchAllActive('promotions'), fetchAllActive('coupons')]);
```

* `Promise.all` sends the two Promotion Service requests **at the same time** and waits for both.
* The statistics endpoint runs five MongoDB queries in parallel with `Promise.all`.
* In the scan, findings are saved **one after another** (`for … of` + `await`) to keep the logic simple and avoid two saves fighting over the same alert.
* `asyncHandler` catches any rejected Promise and passes the error to the Express error middleware.

## 7. How MongoDB and Mongoose store alerts

* `server.js` opens **one** connection at startup (`mongoose.connect`) that every request reuses. The database `techsolde_alerts` and its collections are **created automatically** by MongoDB on the first insert.
* `alert.model.js` defines the schema: types, `enum` lists for severity/status/source/type, `maxlength`, `required`, `timestamps: true` (adds `createdAt` / `updatedAt`).
* A `pre('validate')` hook keeps derived fields consistent: `severityRank` (1–4, used to sort *critical first*) and `isOpen` (`true` unless resolved).
* A **unique partial index** on `ruleKey` (only for open alerts) makes MongoDB itself refuse a second open alert for the same rule and record — duplicates are impossible even if two scans run at once.
* Statistics use `countDocuments` and the aggregation `$group` stage.

Example alert document:

```json
{
  "title": "[DEMO] Flash Sale expires in 8 hours",
  "description": "Promotion DEMOALERTFLASH (20%) ends on 2026-10-30T20:00:00.000Z. Extend it or prepare a follow-up offer.",
  "type": "promotion_expiring", "severity": "high", "severityRank": 3,
  "status": "new", "source": "promotion", "isOpen": true,
  "relatedEntityType": "promotion", "relatedEntityId": "6720…", "relatedEntityLabel": "[DEMO] Flash Sale (DEMOALERTFLASH)",
  "ruleKey": "promotion_expiring:6720…",
  "details": { "code": "DEMOALERTFLASH", "expiresAt": "2026-10-30T20:00:00.000Z", "remainingHours": 8, "remaining": "8 hours" },
  "lastDetectedAt": "…", "acknowledgedAt": null, "resolvedAt": null,
  "createdAt": "…", "updatedAt": "…"
}
```

## 8. How middleware is used

Requests pass through a chain of middleware functions `(request, response, next)`:

1. `helmet()` (security headers), `cors()` (allows the dashboard origin), `express.json()` (reads JSON bodies), `morgan` (request log).
2. `requireDatabase` — answers **503** immediately if MongoDB is not connected.
3. `router.param('id', validateObjectId)` — every `/:id` route answers **400** for an invalid MongoDB ID.
4. `validateBody(...)` / `validateQuery(...)` — run the validators and answer **400** with a list of field errors.
5. `notFoundHandler` — **404** for unknown routes.
6. `errorHandler` — the last middleware: turns every error into a JSON response with the right status code.

## 9. How automatic detection works

`POST /api/alerts/scan` (or the timer) runs `runScan()` in `detection.service.js`:

1. **Lock** — if a scan is already running, answer **409** (no overlapping scans).
2. **Fetch** — get all *active* promotions and coupons from the Promotion Service (all pages, 100 per page).
3. **Evaluate** — each enabled rule checks each record with normal JavaScript (`if`, dates, arrays) and returns a *finding* or `null`.
4. **Save** each finding, identified by `ruleKey = "<rule>:<record id>"`:
   * an **open alert already exists** → update it if the details changed (e.g. remaining time); if severity *increased* and the alert was acknowledged, it goes back to **new**;
   * **no open alert** → create one, **unless** the administrator resolved the same condition by hand and nothing important changed (stops the same alert coming back after every scan);
5. **Auto-resolve** — open automatic alerts whose condition is no longer found (promotion disabled/extended/deleted, coupon limit raised…) are set to `resolved` with `autoResolved: true` and a reason.
6. **Record** the scan in `scanruns` (counts, duration, success/failure) for the dashboard.

If the Promotion Service cannot be reached the scan stops **before** touching any alert, answers **502**, and records a failed scan — so no alert is wrongly auto-resolved.

**Editing rules:** automatic alerts can only have their **notes** edited (title, severity and related record belong to the detection engine). Manual alerts can be fully edited. Status is changed only through the acknowledge / resolve / reopen actions. A resolved automatic alert cannot be reopened if a newer open alert exists for the same condition (**409**).

## 10. Endpoints

Base URL: `http://localhost:5004/api`

| Method | Route | Purpose | Success |
|---|---|---|---|
| GET | `/health` | API, MongoDB and Promotion Service status | 200 (503 if DB down) |
| POST | `/alerts` | Create a manual alert | 201 |
| GET | `/alerts` | List; `?search=&severity=&status=&type=&source=&sort=severity\|newest\|oldest&page=&limit=` | 200 |
| GET | `/alerts/stats` | Statistics | 200 |
| GET | `/alerts/scan/status` | Last scan + rules + auto-scan interval | 200 |
| POST | `/alerts/scan` | Run automatic detection now | 200 (502 / 409) |
| GET | `/alerts/:id` | One alert | 200 / 404 |
| PUT | `/alerts/:id` | Edit (manual: all fields · automatic: notes only) | 200 / 400 / 404 |
| DELETE | `/alerts/:id` | Delete | 200 / 404 |
| PATCH | `/alerts/:id/acknowledge` | new → acknowledged | 200 / 409 |
| PATCH | `/alerts/:id/resolve` | → resolved (optional body `{ "reason": "…" }`) | 200 / 409 |
| PATCH | `/alerts/:id/reopen` | resolved → new | 200 / 409 |

Create body example:

```json
{
  "title": "Review unusually high discounts before the seasonal sale",
  "description": "Check every offer above 50%.",
  "severity": "high",
  "relatedEntityType": "promotion",
  "relatedEntityId": "<a promotion _id>",
  "relatedEntityLabel": "Gaming Week (GAMING15)",
  "notes": ""
}
```

Status codes: **400** invalid input/ID · **404** not found · **409** impossible status change, scan already running, duplicate open alert · **502** Promotion Service unavailable · **503** MongoDB not connected · **500** unexpected error.

## 11. Install and run on Windows

### Prerequisites

* **Node.js** 20 or newer — check with `node -v`.
* **MongoDB Community Server** running locally.
  * Check: `Get-Service MongoDB` in PowerShell should show `Running`.
  * If it is missing, download the MSI from the official site **https://www.mongodb.com/try/download/community** (Windows x64, *msi*), run it, choose **Complete**, keep **"Install MongoD as a Service"** ticked. Or, in an *administrator* PowerShell: `winget install MongoDB.Server` (official package).
  * **MongoDB Compass** (optional GUI): tick it in the installer, or download from **https://www.mongodb.com/try/download/compass**, or `winget install MongoDB.Compass.Full`.
  * Start the service if needed (admin PowerShell): `Start-Service MongoDB`.

### Install (once)

Open PowerShell **in the project folder** (the folder that contains `backend` and `frontend`):

```powershell
cd backend\promotion-service; npm install; Copy-Item .env.example .env; cd ..\..
cd backend\alert-service;     npm install; Copy-Item .env.example .env; cd ..\..
cd frontend\admin-dashboard;  npm install; Copy-Item .env.example .env; cd ..\..
```

(If a `.env` already exists, keep it and just add the missing lines from `.env.example`. The dashboard needs `VITE_ALERT_API_URL=http://localhost:5004/api`.)

### Run (three terminals)

```powershell
# Terminal 1 — Promotion Service (port 5003)
cd backend\promotion-service; npm run dev

# Terminal 2 — Alert Service (port 5004)
cd backend\alert-service; npm run dev

# Terminal 3 — Admin dashboard (http://localhost:5173)
cd frontend\admin-dashboard; npm run dev
```

Check **http://localhost:5004/api/health** → `"database":"connected"` and `"promotionService":"reachable"`.

### Tests

```powershell
cd backend\alert-service
npm test
```

The tests use a separate database `techsolde_alerts_test` (deleted at the end) and a small fake Promotion Service started inside the tests, so the real data is never touched. MongoDB must be running. Set `MONGODB_TEST_URI` to use another server.

### Settings (`.env`)

| Variable | Default | Meaning |
|---|---|---|
| `PORT` | 5004 | Alert Service port |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/techsolde_alerts` | Alerts database |
| `PROMOTION_API_URL` | `http://localhost:5003/api` | Where promotions/coupons are read |
| `EXPIRING_WITHIN_HOURS` | 24 | Window for the two "expiring" rules |
| `HIGH_DISCOUNT_THRESHOLD` | 70 | Percentage above which a discount is flagged |
| `COUPON_USAGE_THRESHOLD` | 90 | Usage percentage that raises a coupon alert |
| `DISABLED_RULES` | *(empty)* | e.g. `high_discount,coupon_expiring` |
| `AUTO_SCAN_INTERVAL_MINUTES` | 10 in `.env.example`, 0 (off) if unset | Background scan interval |

## 12. Test the API with Postman

1. Postman → **Import** → select `docs/TechSolde-Alerts.postman_collection.json` and `docs/TechSolde-Alerts-Local.postman_environment.json`.
2. Choose the **TechSolde Alerts Local** environment (top right).
3. Make sure both services are running, open **TechSolde Alert Service** → **Run**.

Folders, in order: *Health, statistics and rules* → *Manual alert CRUD and status* (create, list, search/filter, read, update, acknowledge, resolve, reopen, delete, 404) → *Automatic detection demo* (creates a `[DEMO]` promotion ending in 8 h through the Promotion Service, scans, checks there is exactly one alert, scans again to prove no duplicate, checks automatic alerts refuse a title edit, deletes the promotion, scans and checks the alert was auto-resolved, cleans up) → *Error handling* (400 / 404).

## 13. Demonstration scenario

Optional demo data (all codes start with `DEMOALERT`, all titles with `[DEMO]`), created **through the Promotion Service API**:

```powershell
cd backend\alert-service
npm run seed          # creates/updates the demo records
npm run seed:clean    # removes them (and their alerts) afterwards
```

| Demo record | Triggers |
|---|---|
| `[DEMO] Flash Sale` — ends in 8 h | promotion_expiring (high) |
| `[DEMO] Gaming Laptop Promotion` — 75 % | high_discount (high) |
| `[DEMO] Black Friday Preview` — ended 2 days ago, still active | promotion_expired_active (high) |
| `[DEMO] Headphones €80 Off` — fixed amount | *nothing* — proves fixed amounts are not percentages |
| `DEMOALERTSTUDENT20` — 95 / 100 uses | coupon_usage (high) |
| `DEMOALERTWELCOME15` — expires in 20 h | coupon_expiring (medium) |
| `[DEMO] Review unusually high discounts…` | a manual alert |

Step by step for the professor:

1. MongoDB is running (`Get-Service MongoDB`).
2. Start the Promotion Service, the Alert Service and the dashboard (section 11).
3. In the dashboard, **Promotions → New promotion**: title "Flash Sale", code `FLASHSALE`, 20 %, start = yesterday, end = **today** (the form saves the end at 23:59 UTC, i.e. within 24 h). *(Or run `npm run seed`, which also creates a coupon at 95/100 uses.)*
4. Open **Alerts**. Point at the four statistic cards and the **Smart Alert Detection** panel (rules, last scan).
5. Click **Scan Now** → toast "Scan complete", the new alert "Flash Sale expires in … hours" appears with its severity colour.
6. Open MongoDB Compass → `techsolde_alerts` → `alerts`: the same document is there. `scanruns` shows the scan.
7. Click the row → details modal (detected values, timeline). Click **Acknowledge**, then **Resolve**. Refresh the page — the status is kept.
8. Click **Scan Now** again: no duplicate appears (the panel shows `+0 new`).
9. **New alert** → create a manual alert, then **Edit** it (change severity), then **Delete** it (confirmation dialog).
10. Show the coupon alert "… has used 95 out of 100 available redemptions" (coupon created in Coupons with limit 100 and used 95, or by the seed).
11. Show the updated statistics cards and the *Alerts per category* panel; click a category to filter the table.
12. Bonus: in **Promotions**, disable the Black Friday demo promotion → **Scan Now** → its alert is auto-resolved.

A French presentation script is in [`docs/PRESENTATION_FR.md`](docs/PRESENTATION_FR.md).

**Safety note:** like the Promotion Service, this is a local coursework API without authentication. Do not expose it publicly.
