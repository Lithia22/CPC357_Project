import React, { useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import Dashboard from "./pages/Dashboard";
import LiveCharts from "./pages/LiveCharts";
import AlertsHistory from "./pages/AlertsHistory";
import "./App.css";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(true);

  const handleLogout = () => {
    setIsLoggedIn(false);
  };

  const handleLogin = () => {
    setIsLoggedIn(true);
  };

  if (!isLoggedIn) {
    return (
      <div className="login-page">
        <div className="login-box">
          <h1>Kitchen Safety Monitor</h1>
          <p>Gas Leak Detection System</p>
          <button onClick={handleLogin} className="login-btn">
            Enter System
          </button>
          <div className="login-info">
            <p>Automatic safety system is always active</p>
            <p>Web interface is for monitoring only</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="app-container">
        <Sidebar />
        <div className="main-content">
          <Header onLogout={handleLogout} />
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/live-charts" element={<LiveCharts />} />
            <Route path="/alerts" element={<AlertsHistory />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
