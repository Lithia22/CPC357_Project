import React, { useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { SidebarProvider, SidebarInset } from "./components/ui/sidebar"; // Changed from @/
import { AppSidebar } from "./components/AppSidebar";
import Header from "./components/Header";
import LandingPage from "./pages/LandingPage";
import Dashboard from "./pages/Dashboard";
import LiveCharts from "./pages/LiveCharts";
import AlertsHistory from "./pages/AlertsHistory";
import "./styles/App.css";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleLogout = () => {
    setIsLoggedIn(false);
  };

  const handleLogin = () => {
    setIsLoggedIn(true);
  };

  if (!isLoggedIn) {
    return <LandingPage onEnter={handleLogin} />;
  }

  return (
    <Router>
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-gray-50">
          <AppSidebar onLogout={handleLogout} />
          <SidebarInset className="flex-1">
            <Header />
            <main className="flex-1 overflow-y-auto">
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/live-charts" element={<LiveCharts />} />
                <Route path="/alerts" element={<AlertsHistory />} />
              </Routes>
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </Router>
  );
}

export default App;
