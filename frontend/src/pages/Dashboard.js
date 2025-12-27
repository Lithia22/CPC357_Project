import React, { useState, useEffect } from "react";
import mqttService from "../services/mqttService";
import {
  getLatestReading,
  subscribeToReadings,
  subscribeToAlerts,
} from "../services/supabaseService";

function Dashboard() {
  const [gasLevel, setGasLevel] = useState(0);
  const [temperature, setTemperature] = useState(0);
  const [mode, setMode] = useState("non_cooking");
  const [valve, setValve] = useState("open");
  const [fan, setFan] = useState(false);
  const [buzzer, setBuzzer] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [mqttConnected, setMqttConnected] = useState(false);

  useEffect(() => {
    const initializeData = async () => {
      try {
        const latest = await getLatestReading();
        if (latest) {
          setGasLevel(latest.gas_level);
          setTemperature(latest.temperature);
          setMode(latest.mode);
          setValve(latest.valve_status);
          setFan(latest.fan_status);
        }
      } catch (err) {
        console.error("Error fetching initial data:", err);
      }

      const brokerUrl =
        process.env.REACT_APP_MQTT_BROKER || "ws://localhost:9001";

      try {
        await mqttService.connect(brokerUrl);
        setMqttConnected(true);
      } catch (err) {
        console.error("MQTT connection failed:", err);
      }
    };

    initializeData();

    mqttService.subscribe("gas_sensor/data", (data) => {
      setGasLevel(data.gas);
      setTemperature(data.temp);
      setMode(data.mode);
      setValve(data.valve);
      setFan(data.fan === 1);
      setBuzzer(data.buzzer === 1);
    });

    const readingsChannel = subscribeToReadings((newReading) => {
      setGasLevel(newReading.gas_level);
      setTemperature(newReading.temperature);
      setMode(newReading.mode);
      setValve(newReading.valve_status);
      setFan(newReading.fan_status);
    });

    const alertsChannel = subscribeToAlerts((newAlert) => {
      const time = new Date(newAlert.timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      setAlerts((prev) => [
        `${time} - ${newAlert.message}`,
        ...prev.slice(0, 9),
      ]);
    });

    return () => {
      readingsChannel.unsubscribe();
      alertsChannel.unsubscribe();
      mqttService.disconnect();
    };
  }, []);

  const toggleMode = () => {
    mqttService.sendCommand("toggle_mode");
  };

  const getGasStatus = () => {
    if (gasLevel > 3000) return { text: "DANGER", class: "danger" };
    if (gasLevel > 1000) return { text: "WARNING", class: "warning" };
    return { text: "SAFE", class: "safe" };
  };

  const gasStatus = getGasStatus();

  return (
    <div className="dashboard-page">
      <h1>Kitchen Safety Dashboard</h1>

      {!mqttConnected && (
        <div className="warning-banner">Connecting to system...</div>
      )}

      {gasStatus.class === "danger" && (
        <div className="emergency-banner">EMERGENCY - GAS LEAK DETECTED</div>
      )}

      <div className={`gas-display ${gasStatus.class}`}>
        <div className="gas-label">GAS LEVEL</div>
        <div className="gas-value">{gasLevel}</div>
        <div className="gas-unit">PPM</div>
        <div className="gas-status">{gasStatus.text}</div>
      </div>

      <div className="status-grid">
        <div className="status-card">
          <div className="card-label">Temperature</div>
          <div className="card-value">{temperature.toFixed(1)}°C</div>
          <div className="card-sub">
            {temperature > 30 ? "HOT" : temperature < 20 ? "COOL" : "NORMAL"}
          </div>
        </div>

        <div className="status-card">
          <div className="card-label">System Mode</div>
          <div className={`card-value mode-${mode}`}>
            {mode === "cooking" ? "COOKING" : "NON-COOKING"}
          </div>
          <button className="mode-toggle" onClick={toggleMode}>
            Switch Mode
          </button>
        </div>

        <div className="status-card">
          <div className="card-label">Gas Valve</div>
          <div className={`card-value valve-${valve}`}>
            {valve === "open" ? "OPEN" : "CLOSED"}
          </div>
          <div className="card-sub">
            {valve === "open" ? "Gas can flow" : "Gas supply cut"}
          </div>
        </div>

        <div className="status-card">
          <div className="card-label">Exhaust Fan</div>
          <div className={`card-value fan-${fan ? "on" : "off"}`}>
            {fan ? "RUNNING" : "STOPPED"}
          </div>
          <div className="card-sub">{fan ? "Ventilating" : "Standby"}</div>
        </div>
      </div>

      <div className="status-grid">
        <div className="status-card">
          <div className="card-label">Buzzer Alarm</div>
          <div className={`card-value ${buzzer ? "danger" : ""}`}>
            {buzzer ? "ACTIVE" : "SILENT"}
          </div>
          <div className="card-sub">
            {buzzer ? "Alert sound on" : "No alarm"}
          </div>
        </div>

        <div className="status-card">
          <div className="card-label">MQTT Connection</div>
          <div className={`card-value ${mqttConnected ? "safe" : "warning"}`}>
            {mqttConnected ? "ONLINE" : "OFFLINE"}
          </div>
          <div className="card-sub">
            {mqttConnected ? "Real-time data" : "Reconnecting..."}
          </div>
        </div>
      </div>

      <div className="alerts-panel">
        <h3>Recent Alerts</h3>
        <div className="alerts-list">
          {alerts.length === 0 ? (
            <div className="alert-item">No alerts yet</div>
          ) : (
            alerts.map((alert, index) => (
              <div key={index} className="alert-item">
                {alert}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
