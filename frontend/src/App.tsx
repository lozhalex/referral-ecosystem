import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import ChangePassword from './pages/ChangePassword';
import AdminDashboard from './pages/AdminDashboard';
import Home from './pages/Home';
import ProjectStub from './pages/ProjectStub';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/change-password" element={<ChangePassword />} />
        <Route path="/admin" element={<AdminDashboard />} />
        
        {/* Заглушки для всех проектов */}
        <Route path="/auto" element={<ProjectStub />} />
        <Route path="/daylabor" element={<ProjectStub />} />
        <Route path="/poh" element={<ProjectStub />} />
        <Route path="/gruzchiki" element={<ProjectStub />} />
        <Route path="/carpooling" element={<ProjectStub />} />
        <Route path="/tickets" element={<ProjectStub />} />
        <Route path="/housing" element={<ProjectStub />} />
        <Route path="/booking" element={<ProjectStub />} />
        <Route path="/glamping" element={<ProjectStub />} />
        <Route path="/travel" element={<ProjectStub />} />
        <Route path="/building" element={<ProjectStub />} />
        <Route path="/eco" element={<ProjectStub />} />
        <Route path="/dating" element={<ProjectStub />} />
      </Routes>
    </Router>
  );
}

export default App;