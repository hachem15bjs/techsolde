import { Route, Routes } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout.jsx';
import PlaceholderPage from '../components/PlaceholderPage.jsx';
import AlertsPage from '../pages/AlertsPage.jsx';
import CouponsPage from '../pages/CouponsPage.jsx';
import DashboardPage from '../pages/DashboardPage.jsx';
import PromotionsPage from '../pages/PromotionsPage.jsx';

const placeholders = ['Users', 'Products', 'Categories', 'Orders', 'Payments', 'Notifications', 'Reviews', 'Settings'];

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="promotions" element={<PromotionsPage />} />
        <Route path="coupons" element={<CouponsPage />} />
        <Route path="alerts" element={<AlertsPage />} />
        {placeholders.map((name) => <Route key={name} path={name.toLowerCase()} element={<PlaceholderPage name={name} />} />)}
        <Route path="*" element={<PlaceholderPage name="Page not found" />} />
      </Route>
    </Routes>
  );
}
