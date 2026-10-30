# TechSolde — Your Demo Guide

This is your quick guide for running the project and showing it to your professor. You do not need to be an expert developer to follow it.

## What this project does

TechSolde is a university e-commerce project for discounted technology products. **Your part is the Promotion Service**, which manages promotions and coupons. The admin website lets you create, view, change, and delete them. The information is saved in MongoDB.

The other dashboard sections are placeholders for your teammates' services. Login/authentication is not implemented.

## Tomorrow: start the project

MongoDB has already been installed on this computer. Open **two PowerShell terminals** in the project folder. Keep both terminals open while you use the project.

**Terminal 1 — Promotion API**

```powershell
cd "C:\Users\R I B\Desktop\Storeproject\backend\promotion-service"
npm run dev
```

Wait for `Promotion Service listening at http://localhost:5003`.

**Terminal 2 — Admin website**

```powershell
cd "C:\Users\R I B\Desktop\Storeproject\frontend\admin-dashboard"
npm run dev
```

Open **http://localhost:5173** in your browser. The MongoDB Windows service starts automatically. Check the API is connected by opening **http://localhost:5003/api/health**; look for `"database":"connected"`.

If PowerShell says the API port is already in use, it may already be running. Try the health link before starting it again.

## What to show your professor

1. Open the dashboard and explain that its counts come from the Promotion Service database.
2. Open **Promotions** and create a promotion.
3. Show the new row and explain that the API saved it in MongoDB.
4. Edit its discount and save the change.
5. Delete it and confirm the dialog.
6. Open **Coupons** and demonstrate create, edit, and delete there too.
7. Explain that **Users, Products, Orders, Payments, Notifications, Reviews**, and other unimplemented sections are placeholders owned by teammates.

You can also show the same API operations in Postman (instructions below).

## Test CRUD in Postman

### Quickest option: run the collection

The project includes an automated collection that checks health and statistics, then creates, lists, reads, updates, and deletes a promotion and a coupon:

- Collection: [docs/TechSolde.postman_collection.json](./docs/TechSolde.postman_collection.json)
- Environment: [docs/TechSolde-Local.postman_environment.json](./docs/TechSolde-Local.postman_environment.json)

In Postman, choose **Import**, select both files, choose **TechSolde Local** at the top right, then open **TechSolde Promotion Service** and click **Run**. Run the requests in order; the collection generates unique codes and removes the test records when done.

### Do one request at a time

First, make sure both the API and MongoDB are running. In Postman each request goes in the top URL box. For requests with a body, choose **Body → raw → JSON** and paste the example. Click **Send**.

Start with this check:

| Method | URL | Expected |
|---|---|---|
| `GET` | `http://localhost:5003/api/health` | `200 OK`, database says `connected` |

### Promotion CRUD

**1. Create — POST**

URL: `http://localhost:5003/api/promotions`

Body (**Body → raw → JSON**):

```json
{
  "title": "Postman Student Discount",
  "description": "A student discount on selected technology.",
  "code": "POSTMANSTUDENT01",
  "discountType": "percentage",
  "discountValue": 10,
  "startDate": "2026-11-01T00:00:00.000Z",
  "endDate": "2026-12-01T23:59:59.999Z",
  "isActive": true
}
```

Click **Send**. Expect `201 Created`. In the response, find `data._id` and copy it; you need that ID for the next steps. Promotion codes are saved in uppercase.

**2. Read all — GET**

URL: `http://localhost:5003/api/promotions`

Expect `200 OK`; created promotions appear in `data`. You can search with `http://localhost:5003/api/promotions?search=POSTMANSTUDENT01`.

**3. Read one — GET**

Replace `<ID>` with the `_id` you copied:

`http://localhost:5003/api/promotions/<ID>`

**4. Update — PUT**

URL: `http://localhost:5003/api/promotions/<ID>`

Body (**Body → raw → JSON**):

```json
{
  "discountValue": 20
}
```

Expect `200 OK`; the response should show `discountValue: 20`. This is a partial update, so the other fields stay the same.

**5. Delete — DELETE**

URL: `http://localhost:5003/api/promotions/<ID>`

No body is needed. Expect `200 OK` and `Promotion deleted successfully.` Check the list again to see it is gone.

### Coupon CRUD

**1. Create — POST**

URL: `http://localhost:5003/api/coupons`

Body:

```json
{
  "code": "POSTMANCOUPON01",
  "description": "A student coupon for testing.",
  "discountType": "percentage",
  "discountValue": 10,
  "usageLimit": 100,
  "usedCount": 0,
  "expirationDate": "2027-12-31T23:59:59.999Z",
  "isActive": true
}
```

Expect `201 Created`; copy `data._id` from the response.

**2. Read all — GET:** `http://localhost:5003/api/coupons`

**3. Read one — GET:** `http://localhost:5003/api/coupons/<ID>`

**4. Update — PUT:** `http://localhost:5003/api/coupons/<ID>`

Choose **Body → raw → JSON**, enter `{"discountValue":20}`, then click **Send**. Expect `200 OK`.

**5. Delete — DELETE:** `http://localhost:5003/api/coupons/<ID>`

No body needed. Expect `200 OK` and `Coupon deleted successfully.`

For either list, you can add `?status=active&page=1&limit=10`. Promotions can be searched by title/code; coupons by code/description.

### Other useful routes

| Method | URL | What it shows |
|---|---|---|
| `GET` | `http://localhost:5003/api/promotions/stats` | Live counts for promotions and coupons |
| `GET` | `http://localhost:5003/api/promotions?search=student` | Search promotions |
| `GET` | `http://localhost:5003/api/coupons?search=welcome` | Search coupons |

If you see **400**, check your JSON and dates. **409** means that code is already taken; choose another code. **404** means the ID or route does not exist. Do not send a real delete request unless you intend to remove that record.

## Where your information is stored

MongoDB database: `techsolde_promotions`. Collections: `promotions` and `coupons`. To view the saved records, connect MongoDB Compass to `mongodb://127.0.0.1:27017`.

## Alert Service (Alert Intelligence Center)

`backend/alert-service/` is a separate Express + MongoDB service (port **5004**, database `techsolde_alerts`) that reads promotions and coupons through the Promotion Service API, detects conditions that need attention (expiring promotions/coupons, coupons near their usage limit, unusually high discounts, expired-but-active promotions) and lets the admin manage them on the dashboard's **Alerts** page. Start it in a third terminal with `cd backendlert-service; npm run dev`. Full guide, demo scenario and Postman collection: [backend/alert-service/README.md](./backend/alert-service/README.md).

## Project map: folders and important files

### Backend — `backend/promotion-service/`

| File/folder | What it does |
|---|---|
| `src/server.js` | Connects to MongoDB once, then starts the API on port 5003. |
| `src/app.js` | Sets up Express, security middleware, health check, API routes, and error handling. |
| `src/config/` | MongoDB connection setup. |
| `src/models/` | Promotion and Coupon database shapes and rules. |
| `src/routes/` | Maps URLs and HTTP methods to code. |
| `src/controllers/` | Handles API requests: create, list, read, update, delete, and statistics. |
| `src/validators/` | Checks request fields, dates, discount values, and coupon limits. |
| `src/services/` | Shared database list, pagination, lookup, and update helpers. |
| `src/middlewares/` | Request validation and readable error responses. |
| `src/utils/` | Shared async request and API error helpers. |
| `tests/api.test.js` | Automated API and validation tests. |
| `src/seed.js` | Optional script to add repeatable demonstration records (`npm run seed`). |
| `.env` | Your local port and MongoDB connection; keep it private. |
| `.env.example` | Safe example settings to copy if setting up another computer. |
| `package.json` | Backend commands and dependencies. |

**Route files:** `src/routes/promotion.routes.js` handles `/api/promotions`; `src/routes/coupon.routes.js` handles `/api/coupons`. `src/controllers/` contains their CRUD logic.

### Frontend — `frontend/admin-dashboard/src/`

| File/folder | What it does |
|---|---|
| `App.jsx`, `main.jsx` | Start the React website and connect routing/styles. |
| `routes/` | Connects page URLs to pages. |
| `components/` | Reusable sidebar, forms, tables, dialogs, badges, and the shared dashboard layout (`AdminLayout.jsx`). |
| `pages/` | Overview, Promotions, Coupons, and teammate placeholder screens. |
| `services/` | Calls the API; CRUD request functions are in `promotion-service.js` and `coupon-service.js`. |
| `hooks/` | Shared page/search/pagination/loading logic. |
| `utils/` | API URL settings and date/discount display helpers. |
| `styles.css` | Colors, typography, and responsive page styling. |
| `.env` | Local frontend API URL. |
| `package.json` | Website commands and dependencies. |

### Other project files

- `docs/API.md` — full API details.
- `docs/TechSolde.postman_collection.json` — ready-to-import Postman CRUD requests.
- `docs/TechSolde-Local.postman_environment.json` — local Postman server URL.
- `INTEGRATION_GUIDE.md` — how teammates add their own microservice pages.

## Helpful commands

Run these in the relevant package folder:

```powershell
npm run dev    # start the backend or frontend (depending on folder)
npm test       # backend API tests (backend folder only)
npm run build  # check frontend production build (frontend folder only)
npm run seed   # add demo data (backend folder only; existing demo codes are updated)
```

**Safety note:** This is a local class demonstration. The API does not have login/authentication, so do not expose it publicly.
