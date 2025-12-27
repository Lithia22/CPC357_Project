import React from "react";
import { NavLink } from "react-router-dom";

function Sidebar() {
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h3>Kitchen Safety</h3>
      </div>

      <nav className="sidebar-nav">
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            isActive ? "nav-item active" : "nav-item"
          }
        >
          Dashboard
        </NavLink>

        <NavLink
          to="/live-charts"
          className={({ isActive }) =>
            isActive ? "nav-item active" : "nav-item"
          }
        >
          Live Data
        </NavLink>

        <NavLink
          to="/alerts"
          className={({ isActive }) =>
            isActive ? "nav-item active" : "nav-item"
          }
        >
          Alerts
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <div className="system-status">
          <div className="status-dot"></div>
          <span>System Online</span>
        </div>
      </div>
    </div>
  );
}

export default Sidebar;
