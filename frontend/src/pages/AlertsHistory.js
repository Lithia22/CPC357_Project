import React, { useState, useEffect } from "react";
import {
  getRecentAlerts,
  subscribeToAlerts,
} from "../services/supabaseService";

function AlertsHistory() {
  const [alerts, setAlerts] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAlerts = async () => {
      try {
        const data = await getRecentAlerts();
        setAlerts(data);
        setLoading(false);
      } catch (err) {
        console.error("Error loading alerts:", err);
        setLoading(false);
      }
    };

    loadAlerts();

    const channel = subscribeToAlerts((newAlert) => {
      setAlerts((prev) => [newAlert, ...prev]);
    });

    return () => {
      channel.unsubscribe();
    };
  }, []);

  const filteredAlerts = alerts.filter((alert) => {
    if (filter === "all") return true;
    return alert.alert_type === filter;
  });

  const getTypeIcon = (type) => {
    switch (type) {
      case "danger":
        return "Alert";
      case "warning":
        return "Warning";
      default:
        return "Info";
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className="alerts-page">
      <h1>Alerts History</h1>
      <p className="page-subtitle">System events and notifications</p>

      <div className="filter-buttons">
        <button
          className={filter === "all" ? "active" : ""}
          onClick={() => setFilter("all")}
        >
          All Alerts ({alerts.length})
        </button>
        <button
          className={filter === "danger" ? "active" : ""}
          onClick={() => setFilter("danger")}
        >
          Danger ({alerts.filter((a) => a.alert_type === "danger").length})
        </button>
        <button
          className={filter === "warning" ? "active" : ""}
          onClick={() => setFilter("warning")}
        >
          Warning ({alerts.filter((a) => a.alert_type === "warning").length})
        </button>
        <button
          className={filter === "info" ? "active" : ""}
          onClick={() => setFilter("info")}
        >
          Info ({alerts.filter((a) => a.alert_type === "info").length})
        </button>
      </div>

      <div className="alerts-table-container">
        {loading ? (
          <div style={{ textAlign: "center", padding: "40px" }}>
            Loading alerts...
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px" }}>
            No alerts found
          </div>
        ) : (
          <table className="alerts-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Type</th>
                <th>Gas Level</th>
                <th>Temperature</th>
                <th>Message</th>
              </tr>
            </thead>
            <tbody>
              {filteredAlerts.map((alert) => (
                <tr key={alert.id} className={`alert-row ${alert.alert_type}`}>
                  <td>
                    <div>{formatTime(alert.timestamp)}</div>
                    <div style={{ fontSize: "12px", color: "#718096" }}>
                      {formatDate(alert.timestamp)}
                    </div>
                  </td>
                  <td className="alert-type">
                    <span className={`type-badge ${alert.alert_type}`}>
                      {getTypeIcon(alert.alert_type)}{" "}
                      {alert.alert_type.toUpperCase()}
                    </span>
                  </td>
                  <td>
                    <div className="gas-display-small">
                      {alert.gas_level} PPM
                      {alert.gas_level > 3000 && (
                        <span className="danger-dot"></span>
                      )}
                      {alert.gas_level > 1000 && alert.gas_level <= 3000 && (
                        <span className="warning-dot"></span>
                      )}
                    </div>
                  </td>
                  <td>
                    {alert.temperature ? `${alert.temperature}°C` : "N/A"}
                  </td>
                  <td className="alert-message">{alert.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="stats-summary">
        <div className="stat-card">
          <div className="stat-value">{alerts.length}</div>
          <div className="stat-label">Total Alerts</div>
        </div>
        <div className="stat-card">
          <div className="stat-value danger">
            {alerts.filter((a) => a.alert_type === "danger").length}
          </div>
          <div className="stat-label">Danger Alerts</div>
        </div>
        <div className="stat-card">
          <div className="stat-value warning">
            {alerts.filter((a) => a.alert_type === "warning").length}
          </div>
          <div className="stat-label">Warning Alerts</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            {alerts.length > 0 ? formatDate(alerts[0].timestamp) : "N/A"}
          </div>
          <div className="stat-label">Last Updated</div>
        </div>
      </div>

      <div className="safety-note">
        <h3>Safety Information</h3>
        <ul>
          <li>Danger alerts trigger automatic gas shutoff</li>
          <li>Warning alerts activate exhaust fan and beeper</li>
          <li>All emergency actions are automatic</li>
          <li>System logs all events for safety review</li>
        </ul>
      </div>
    </div>
  );
}

export default AlertsHistory;
