import React, { useState, useEffect } from "react";
import mqttService from "../services/mqttService";
import { getRecentReadings } from "../services/supabaseService";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
function LiveCharts() {
  const [combinedData, setCombinedData] = useState([]);
  const [currentGas, setCurrentGas] = useState(0);
  const [currentTemp, setCurrentTemp] = useState(0);
  const [currentMode, setCurrentMode] = useState("non_cooking");
  const [adjustedThreshold, setAdjustedThreshold] = useState(1000);
  const calculateAdjustedThreshold = (temp, baseThreshold = 1000) => {
    if (temp > 35) return Math.round(baseThreshold * 1.5);
    if (temp < 15) return Math.round(baseThreshold * 0.7);
    return baseThreshold;
  };
  useEffect(() => {
    const initializeData = async () => {
      try {
        const readings = await getRecentReadings(20);
        const formattedData = readings.reverse().map((r) => ({
          time: new Date(r.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          gas: r.gas_level,
          temp: Math.round(r.temperature),
        }));
        setCombinedData(formattedData);
        if (readings.length > 0) {
          const latest = readings[readings.length - 1];
          setCurrentGas(latest.gas_level);
          setCurrentTemp(Math.round(latest.temperature));
          setAdjustedThreshold(latest.adjusted_threshold);
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
        hour: "2-digit",
        minute: "2-digit",
      });
      setCombinedData((prev) => {
        const updated = [
          ...prev.slice(1),
          { time, gas: data.gas, temp: Math.round(data.temp) },
        ];
        return updated;
      });
      setCurrentGas(data.gas);
      setCurrentTemp(Math.round(data.temp));
      setCurrentMode(data.mode);
      setAdjustedThreshold(data.threshold);
    });
    return () => {
      mqttService.disconnect();
    };
  }, []);
  const getGasStatus = (value) => {
    if (currentMode === "cooking") {
      const warningThreshold = calculateAdjustedThreshold(currentTemp, 1000);
      const dangerThreshold = calculateAdjustedThreshold(currentTemp, 3000);
      if (value >= dangerThreshold)
        return { label: "DANGER", variant: "destructive" };
      if (value >= warningThreshold)
        return { label: "WARNING", variant: "secondary" };
      return { label: "SAFE", variant: "default" };
    } else {
      if (value >= adjustedThreshold)
        return { label: "DANGER", variant: "destructive" };
      return { label: "SAFE", variant: "default" };
    }
  };
  const gasStatus = getGasStatus(currentGas);
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Live Monitoring
        </h1>
        <p className="text-gray-600">Real-time sensor data visualization</p>
      </div>{" "}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-2">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-4 relative">
              <div className="text-sm font-medium text-gray-600">
                Current Gas Level
              </div>
              <Badge
                className={
                  gasStatus.variant === "destructive"
                    ? "bg-red-500"
                    : gasStatus.variant === "secondary"
                    ? "bg-amber-500"
                    : "bg-green-500"
                }
              >
                {gasStatus.label}
              </Badge>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-bold text-gray-900">
                {currentGas}
              </span>
              <span className="text-xl font-semibold text-gray-500">PPM</span>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Threshold: {adjustedThreshold} PPM
            </p>
          </CardContent>
        </Card>{" "}
        <Card className="border-2">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-4">
              <div className="text-sm font-medium text-gray-600">
                Current Temperature
              </div>
              <Badge variant="secondary">NORMAL</Badge>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-bold text-gray-900">
                {currentTemp}
              </span>
              <span className="text-xl font-semibold text-gray-500">°C</span>
            </div>
            <p className="text-sm text-gray-500 mt-2">Live reading</p>
          </CardContent>
        </Card>
      </div>{" "}
      {/* Gas Level Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Gas Level Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={combinedData}
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="time"
                tick={{ fill: "#666", fontSize: 12 }}
                label={{
                  value: "Time",
                  position: "outside",
                  offset: 5,
                  fill: "#666",
                  fontSize: 14,
                  dy: 30,
                }}
              />
              <YAxis
                tick={{ fill: "#666", fontSize: 12 }}
                label={{
                  value: "Gas Level (PPM)",
                  angle: -90,
                  position: "middle",
                  dx: -25,
                  dy: 10,
                  fill: "#666",
                }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #ddd",
                  borderRadius: "8px",
                  padding: "8px",
                }}
              />
              <Bar
                dataKey="gas"
                fill="#F86901"
                radius={[8, 8, 0, 0]}
                name="Gas Level (PPM)"
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>{" "}
      {/* Temperature Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Temperature Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={combinedData}
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="time"
                tick={{ fill: "#666", fontSize: 12 }}
                label={{
                  value: "Time",
                  position: "outside",
                  offset: 5,
                  fill: "#666",
                  fontSize: 14,
                  dy: 30,
                }}
              />
              <YAxis
                tick={{ fill: "#666", fontSize: 12 }}
                label={{
                  value: "Temperature (°C)",
                  angle: -90,
                  position: "middle",
                  dx: -25,
                  dy: 10,
                  fill: "#666",
                }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #ddd",
                  borderRadius: "8px",
                  padding: "8px",
                }}
              />
              <Line
                type="monotone"
                dataKey="temp"
                stroke="#3B82F6"
                strokeWidth={3}
                dot={{ fill: "#3B82F6", r: 4 }}
                name="Temperature (°C)"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>{" "}
      <Card>
        <CardHeader>
          <CardTitle>Recent Readings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    Time
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    Gas (PPM)
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    Temp (°C)
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {combinedData.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="text-center py-8 text-gray-500">
                      Waiting for data...
                    </td>
                  </tr>
                ) : (
                  combinedData
                    .slice()
                    .reverse()
                    .slice(0, 10)
                    .map((point, index) => {
                      const status = getGasStatus(point.gas);
                      return (
                        <tr key={index} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4 text-gray-700">
                            {point.time}
                          </td>
                          <td className="py-3 px-4 font-semibold text-gray-900">
                            {point.gas}
                          </td>
                          <td className="py-3 px-4 text-gray-700">
                            {point.temp}
                          </td>
                          <td className="py-3 px-4">
                            <Badge
                              className={
                                status.variant === "destructive"
                                  ? "bg-red-500"
                                  : status.variant === "secondary"
                                  ? "bg-amber-500"
                                  : "bg-green-500"
                              }
                            >
                              {status.label}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default LiveCharts;
