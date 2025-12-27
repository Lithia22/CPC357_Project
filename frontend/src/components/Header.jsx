import React, { useState, useEffect } from "react";
import mqttService from "../services/mqttService";

function Header({ onLogout }) {
  const [currentTime, setCurrentTime] = useState(
    new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })
  );
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    }, 1000);

    const checkConnection = setInterval(() => {
      setIsOnline(mqttService.isConnected());
    }, 2000);

    return () => {
      clearInterval(timer);
      clearInterval(checkConnection);
    };
  }, []);

  return (
    <header className="app-header">
      <div className="header-left">
        <h2>Main Kitchen</h2>
        <div className="header-time">{currentTime}</div>
      </div>

      <div className="header-right">
        <div className="header-status">
          <span className={`status-dot ${isOnline ? "online" : ""}`}></span>
          <span>{isOnline ? "System Online" : "Connecting..."}</span>
        </div>
        <button className="logout-btn" onClick={onLogout}>
          Exit Monitor
        </button>
      </div>
    </header>
  );
}

export default Header;
