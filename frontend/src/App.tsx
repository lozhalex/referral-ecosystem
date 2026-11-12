import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import ChangePassword from './pages/ChangePassword';
import AdminDashboard from './pages/AdminDashboard';
import Home from './pages/Home';
import ProjectStub from './pages/ProjectStub';
import Events from './pages/Events';
import Tickets from './pages/Tickets';
import Scanner from './pages/Scanner';
import AdminEvents from './pages/AdminEvents';
import AutoHelper from './pages/AutoHelper';
import ProtectedRoute from './components/ProtectedRoute'; // 👈 ДОБАВЛЕНО

function App() {
  return (
    <Router>
      <Routes>
        {/* Публичные маршруты */}
        <Route path="/" element={<Home />} />
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

        {/* 🛡️ Защищенные маршруты (требуют авторизации) */}
        <Route element={<ProtectedRoute />}>
          <Route path="/auto" element={<AutoHelper />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/change-password" element={<ChangePassword />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/events" element={<AdminEvents />} />
          <Route path="/events" element={<Events />} />
          <Route path="/tickets" element={<Tickets />} />
          <Route path="/scanner" element={<Scanner />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;