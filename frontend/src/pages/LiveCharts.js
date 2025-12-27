import React, { useState, useEffect } from "react";
import mqttService from "../services/mqttService";
import { getRecentReadings } from "../services/supabaseService";

function LiveCharts() {
  const [gasData, setGasData] = useState([]);
  const [tempData, setTempData] = useState([]);
  const [currentGas, setCurrentGas] = useState(0);
  const [currentTemp, setCurrentTemp] = useState(0);

  useEffect(() => {
    const initializeData = async () => {
      try {
        const readings = await getRecentReadings(10);

        const gasPoints = readings.reverse().map((r) => ({
          time: new Date(r.timestamp).toLocaleTimeString([], {
            minute: "2-digit",
            second: "2-digit",
          }),
          value: r.gas_level,
        }));

        const tempPoints = readings.map((r) => ({
          time: new Date(r.timestamp).toLocaleTimeString([], {
            minute: "2-digit",
            second: "2-digit",
          }),
          value: Math.round(r.temperature),
        }));

        setGasData(gasPoints);
        setTempData(tempPoints);

        if (readings.length > 0) {
          setCurrentGas(readings[readings.length - 1].gas_level);
          setCurrentTemp(Math.round(readings[readings.length - 1].temperature));
        }
      } catch (err) {
        console.error("Error loading chart data:", err);
      }

      const brokerUrl =
        process.env.REACT_APP_MQTT_BROKER || "ws://localhost:9001";

      try {
        await mqttService.connect(brokerUrl);
      } catch (err) {
        console.error("MQTT connection failed:", err);
      }
    };

    initializeData();

    mqttService.subscribe("gas_sensor/data", (data) => {
      const time = new Date().toLocaleTimeString([], {
        minute: "2-digit",
        second: "2-digit",
      });

      setGasData((prev) => {
        const updated = [...prev.slice(1), { time, value: data.gas }];
        return updated;
      });

      setTempData((prev) => {
        const updated = [
          ...prev.slice(1),
          { time, value: Math.round(data.temp) },
        ];
        return updated;
      });

      setCurrentGas(data.gas);
      setCurrentTemp(Math.round(data.temp));
    });

    return () => {
      mqttService.disconnect();
    };
  }, []);

  const renderGasChart = () => {
    const max = 4000;
    return (
      <div className="simple-chart">
        <div className="chart-title">Gas Level - Live Data</div>
        <div className="chart-bars">
          {gasData.map((point, index) => {
            const height = (point.value / max) * 100;
            return (
              <div key={index} className="chart-bar-container">
                <div
                  className={`chart-bar ${
                    point.value > 1000 ? "warning" : ""
                  } ${point.value > 3000 ? "danger" : ""}`}
                  style={{ height: `${height}%` }}
                  title={`${point.time}: ${point.value} PPM`}
                ></div>
                <div className="chart-time">{point.time}</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderTempChart = () => {
    const min = 15;
    const max = 40;
    return (
      <div className="simple-chart">
        <div className="chart-title">Temperature - Live Data</div>
        <div className="temp-chart">
          {tempData.map((point, index) => {
            const percent = ((point.value - min) / (max - min)) * 100;
            return (
              <div
                key={index}
                className="temp-point"
                style={{ left: `${index * 10}%`, bottom: `${percent}%` }}
                title={`${point.time}: ${point.value}°C`}
              ></div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="charts-page">
      <h1>Live Monitoring</h1>
      <p className="page-subtitle">Real-time sensor data</p>

      <div className="current-readings">
        <div className="reading-card">
          <div className="reading-label">Current Gas Level</div>
          <div
            className={`reading-value ${
              currentGas > 3000
                ? "danger"
                : currentGas > 1000
                ? "warning"
                : "safe"
            }`}
          >
            {currentGas} PPM
          </div>
          <div className="reading-time">Live</div>
        </div>

        <div className="reading-card">
          <div className="reading-label">Current Temperature</div>
          <div className="reading-value">{currentTemp}°C</div>
          <div className="reading-time">Live</div>
        </div>
      </div>

      <div className="charts-container">
        {renderGasChart()}
        {renderTempChart()}
      </div>

      <div className="data-table">
        <h3>Recent Readings</h3>
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Gas (PPM)</th>
              <th>Temp (°C)</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {gasData.length === 0 ? (
              <tr>
                <td colSpan="4">Waiting for data...</td>
              </tr>
            ) : (
              gasData
                .slice()
                .reverse()
                .map((gasPoint, index) => {
                  const tempPoint = tempData[tempData.length - 1 - index];
                  const status =
                    gasPoint.value > 3000
                      ? "Danger"
                      : gasPoint.value > 1000
                      ? "Warning"
                      : "Safe";
                  return (
                    <tr key={index}>
                      <td>{gasPoint.time}</td>
                      <td>{gasPoint.value}</td>
                      <td>{tempPoint?.value || "--"}</td>
                      <td
                        className={`status-${
                          gasPoint.value > 3000
                            ? "danger"
                            : gasPoint.value > 1000
                            ? "warning"
                            : "safe"
                        }`}
                      >
                        {status}
                      </td>
                    </tr>
                  );
                })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default LiveCharts;
