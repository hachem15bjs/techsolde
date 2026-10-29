import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import AppRoutes from './routes/AppRoutes.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
      <Toaster position="bottom-right" richColors closeButton />
    </BrowserRouter>
  );
}
