import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import ChangePassword from './pages/ChangePassword';
import AdminDashboard from './pages/AdminDashboard';
import AdminAutoHelper from './pages/AdminAutoHelper';
import HomeGuest from './pages/HomeGuest';
import ProjectStub from './pages/ProjectStub';
import Events from './pages/Events';
import Tickets from './pages/Tickets';
import Scanner from './pages/Scanner';
import AdminEvents from './pages/AdminEvents';
import AutoHelper from './pages/AutoHelper';
import ProtectedRoute from './components/ProtectedRoute';
import ReferralCapture from './components/ReferralCapture';

// 🆕 Компонент-обёртка для главной страницы:
// - Гость → видит лендинг HomeGuest
// - Авторизованный → редирект на /auto
const HomeRouter = () => {
  const token = localStorage.getItem('token');
  if (token) {
    return <Navigate to="/auto" replace />;
  }
  return <HomeGuest />;
};

function App() {
  return (
    <BrowserRouter>
      <ReferralCapture />
      <Routes>
        {/* Публичные маршруты */}
        <Route path="/" element={<HomeRouter />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/daylabor" element={<ProjectStub />} />
        <Route path="/poh" element={<ProjectStub />} />
        <Route path="/gruzchiki" element={<ProjectStub />} />
        <Route path="/carpooling" element={<ProjectStub />} />
        <Route path="/housing" element={<ProjectStub />} />
        <Route path="/booking" element={<ProjectStub />} />
        <Route path="/glamping" element={<ProjectStub />} />
        <Route path="/travel" element={<ProjectStub />} />
        <Route path="/building" element={<ProjectStub />} />
        <Route path="/eco" element={<ProjectStub />} />
        <Route path="/dating" element={<ProjectStub />} />
        <Route path="/ecosystem" element={<ProjectStub />} /> {/* 🆕 Заглушка, позже заменим на Ecosystem.tsx */}

        {/* 🛡️ Защищенные маршруты (требуют авторизации) */}
        <Route element={<ProtectedRoute />}>
          <Route path="/auto" element={<AutoHelper />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/change-password" element={<ChangePassword />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/events" element={<AdminEvents />} />
          <Route path="/admin/auto" element={<AdminAutoHelper />} />
          <Route path="/events" element={<Events />} />
          <Route path="/tickets" element={<Tickets />} />
          <Route path="/scanner" element={<Scanner />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;