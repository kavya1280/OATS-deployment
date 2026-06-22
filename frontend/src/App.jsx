import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Auditordashboard from "./pages/Auditordashboard";
import Action from "./pages/AuditorAction "; // For Auditees
import AuditorAction from "./pages/AuditorAction"; // For Auditors

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Auditee Routes */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/action/:insightId" element={<Action />} />

        {/* Auditor Routes */}
        <Route path="/auditordashboard" element={<Auditordashboard />} />
        <Route path="/auditor_action/:insightId" element={<AuditorAction />} />

        
      </Routes>
    </BrowserRouter>
  );
}
export default App;