# TechSolde Admin Dashboard Integration Guide

This React dashboard is a shared interface for the TechSolde microservices. Promotion and Coupon CRUD use the Promotion Service; other sections remain explicit placeholders until their service owners integrate them.

## 1. Clone the repository

```powershell
git clone <your-team-repository-url>
cd <your-team-repository-folder>
```

## 2. Install and start the dashboard

```powershell
cd frontend/admin-dashboard
npm install
Copy-Item .env.example .env
npm run dev
```

The Vite development server prints the local URL, normally `http://localhost:5173`.

## 3. Add an API URL for your service

The shared URL registry is `src/utils/service-config.js`; keep service base URLs in environment variables rather than hardcoding them inside components. For the hypothetical Product Service, add this line to `.env`:

```dotenv
VITE_PRODUCT_API_URL=http://localhost:5002/api
```

The registry already reads `VITE_PRODUCT_API_URL`. `src/services/api-client.js` exports `getServiceApiClient(service)`, which creates a configured client and throws a clear error if that service has no URL. Use it from the Product Service module:

```js
// src/services/product-service.js
import { getServiceApiClient } from './api-client.js';

const productApi = getServiceApiClient('products');

export async function listProducts(params = {}) {
  const { data } = await productApi.get('/products', { params });
  return data;
}

export async function createProduct(product) {
  const { data } = await productApi.post('/products', product);
  return data.data;
}
```

Restart Vite after changing `.env` values.

## 4. Add a page for your microservice

Create a page such as `src/pages/ProductsPage.jsx`. Keep page-specific forms, data fetching, and validation in your service's page/service modules. Reuse shared pieces where they fit:

- `PageHeader` for a consistent section title and primary action.
- `DataTable` for loading, rows, and empty states.
- `StatusBadge`, `FormField`, and `ConfirmDialog` for common presentation and interactions.
- `AdminLayout` for the shared navigation and responsive shell.
- `sonner` (`toast`) for success/error feedback.

Do not treat a shared component as product-specific: pass labels, rows, columns, and callbacks as props. Existing screens in `src/pages/PromotionsPage.jsx` and `src/pages/CouponsPage.jsx` are useful examples.

## 5. Add a sidebar item

In `src/components/Sidebar.jsx`, add an entry to the `navigation` array, for example:

```js
{ label: 'Products', path: '/products', icon: Package }
```

Import an appropriate icon from `lucide-react`. Remove or repurpose the existing Products placeholder entry rather than adding a duplicate.

## 6. Register your route

In `src/routes/AppRoutes.jsx`, import your page and replace its placeholder route:

```jsx
<Route path="products" element={<ProductsPage />} />
```

Remove `Products` from the `placeholders` array after the real page is available. The placeholder route makes unimplemented ownership visible and must not be presented as working CRUD.

## 7. Connect CRUD without changing Promotion Service

Create a dedicated `src/services/product-service.js` that calls only the Product Service URL. Implement your own Product Service backend and API contract independently. Reuse only generic UI, layout, and API-client utilities; do not modify the Promotion or Coupon schemas, routes, or controllers to add another team's module.

## 8. Verify your integration

```powershell
npm run build
```

Check that your own service is running, the environment variable points to its `/api` base URL, errors are visible to the user, and the placeholder has been removed only after the integration is functional. Add tests in the service that owns the corresponding API.

## Authentication reminder

The current dashboard is an unauthenticated local coursework preview. It does not implement admin login or authorization. Coordinate with the User Service owner to integrate real authentication, and protect every service's write operations before public deployment.
