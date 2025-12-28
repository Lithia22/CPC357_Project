import React, { useState, useEffect } from "react";
import mqttService from "../services/mqttService";
import {
  getLatestReading,
  subscribeToReadings,
  subscribeToAlerts,
} from "../services/supabaseService";
import { StatsCard } from "../components/StatsCard";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Alert, AlertDescription } from "../components/ui/alert";
import { ShieldAlert } from "lucide-react";
import dht11Image from "../assets/images/dht11.png";
import lpgValveImage from "../assets/images/lpg-valve.png";
import fanMotorImage from "../assets/images/fan-motor.png";
import pushButtonImage from "../assets/images/push-button.png";
import buzzerImage from "../assets/images/buzzer.png";
import esp32Image from "../assets/images/esp32.png";

function Dashboard() {
  const [gasLevel, setGasLevel] = useState(0);
  const [temperature, setTemperature] = useState(0);
  const [adjustedThreshold, setAdjustedThreshold] = useState(1000);
  const [mode, setMode] = useState("non_cooking");
  const [valve, setValve] = useState("open");
  const [fan, setFan] = useState(false);
  const [buzzer, setBuzzer] = useState(false);
  const [mqttConnected, setMqttConnected] = useState(false);

  const calculateAdjustedThreshold = (temp, baseThreshold = 1000) => {
    if (temp > 35) return Math.round(baseThreshold * 1.5);
    if (temp < 15) return Math.round(baseThreshold * 0.7);
    return baseThreshold;
  };

  useEffect(() => {
    const initializeData = async () => {
      try {
        const latest = await getLatestReading();
        if (latest) {
          setGasLevel(latest.gas_level);
          setTemperature(latest.temperature);
          setAdjustedThreshold(latest.adjusted_threshold);
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
        setMqttConnected(false);
        await mqttService.connect(brokerUrl);
        setMqttConnected(mqttService.isConnected());
      } catch (err) {
        console.error("MQTT connection failed:", err);
        setMqttConnected(false);
      }
    };

    initializeData();

    mqttService.subscribe("gas_sensor/data", (data) => {
      setGasLevel(data.gas);
      setTemperature(data.temp);
      setAdjustedThreshold(data.threshold);
      setMode(data.mode);
      setValve(data.valve);
      setFan(data.fan === 1);
      setBuzzer(data.buzzer === 1);
    });

    const readingsChannel = subscribeToReadings((newReading) => {
      setGasLevel(newReading.gas_level);
      setTemperature(newReading.temperature);
      setAdjustedThreshold(newReading.adjusted_threshold);
      setMode(newReading.mode);
      setValve(newReading.valve_status);
      setFan(newReading.fan_status);
    });

    const alertsChannel = subscribeToAlerts((newAlert) => {
      // Handle alerts if needed
    });

    return () => {
      readingsChannel.unsubscribe();
      alertsChannel.unsubscribe();
      mqttService.disconnect();
    };
  }, []);

  const getGasStatus = () => {
    if (mode === "cooking") {
      const warningThreshold = calculateAdjustedThreshold(temperature, 1000);
      const dangerThreshold = calculateAdjustedThreshold(temperature, 3000);

      if (gasLevel >= dangerThreshold)
        return { text: "DANGER", variant: "danger" };
      if (gasLevel >= warningThreshold)
        return { text: "WARNING", variant: "warning" };
      return { text: "SAFE", variant: "safe" };
    } else {
      if (gasLevel >= adjustedThreshold)
        return { text: "DANGER", variant: "danger" };
      return { text: "SAFE", variant: "safe" };
    }
  };

  const gasStatus = getGasStatus();

  return (
    <div className="p-6 space-y-6">
      {gasStatus.variant === "danger" && (
        <Alert className="bg-red-100 border-red-300">
          <ShieldAlert className="h-5 w-5 text-red-600" />
          <AlertDescription className="text-red-800 font-semibold text-lg">
            EMERGENCY - GAS LEAK DETECTED! Immediate action required.
          </AlertDescription>
        </Alert>
      )}

      <Card
        className={`border-4 ${
          gasStatus.variant === "danger"
            ? "border-red-500 shadow-red-200"
            : gasStatus.variant === "warning"
            ? "border-amber-500 shadow-amber-200"
            : "border-green-500 shadow-green-200"
        } shadow-xl`}
      >
        <CardContent className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">
                GAS LEVEL MONITOR
              </p>
              <p className="text-gray-500 text-xs">Real-time sensor readings</p>
            </div>
            <Badge
              className={`px-4 py-2 text-sm font-bold ${
                gasStatus.variant === "danger"
                  ? "bg-red-500"
                  : gasStatus.variant === "warning"
                  ? "bg-amber-500"
                  : "bg-green-500"
              }`}
            >
              {gasStatus.text}
            </Badge>
          </div>
          <div className="text-center">
            <div className="inline-flex items-baseline gap-2">
              <span className="text-7xl font-bold text-gray-900">
                {gasLevel}
              </span>
              <span className="text-2xl font-semibold text-gray-500">PPM</span>
            </div>
            <div className="mt-4 text-sm text-gray-600">
              Adjusted Threshold: {adjustedThreshold} PPM (
              {temperature.toFixed(1)}°C)
            </div>
            <div className="mt-4 h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  gasStatus.variant === "danger"
                    ? "bg-red-500"
                    : gasStatus.variant === "warning"
                    ? "bg-amber-500"
                    : "bg-green-500"
                }`}
                style={{ width: `${Math.min((gasLevel / 5000) * 100, 100)}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          image={dht11Image}
          label="Temperature"
          value={`${temperature.toFixed(1)}°C`}
          subtext={
            temperature > 30 ? "HOT" : temperature < 20 ? "COOL" : "NORMAL"
          }
          variant={
            temperature > 30 ? "warning" : temperature < 20 ? "safe" : "default"
          }
        />

        <Card className="bg-gradient-to-br from-primary to-orange-600 border-0 hover:shadow-lg transition-all">
          <CardContent className="p-6 flex flex-col h-full">
            <div className="mb-4">
              <p className="text-sm font-medium text-white/90 mb-2">
                System Mode
              </p>
              <p className="text-3xl font-bold text-white">
                {mode === "cooking" ? "COOKING" : "STANDBY"}
              </p>
              <p className="text-sm text-white/80">
                {mode === "cooking" ? "Chef is cooking" : "No chef in kitchen"}
              </p>
            </div>

            <div className="mt-auto">
              <div className="flex justify-center mb-4">
                <img
                  src={pushButtonImage}
                  alt="Mode Switch Button"
                  className="h-32 w-auto object-contain"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <StatsCard
          image={lpgValveImage}
          label="Gas Valve"
          value={valve === "open" ? "OPEN" : "CLOSED"}
          subtext={valve === "open" ? "Gas flowing" : "Supply cut"}
          variant={valve === "closed" ? "danger" : "safe"}
        />

        {/* Exhaust Fan Card with Motor */}
        <StatsCard
          image={fanMotorImage}
          label="Exhaust Fan"
          value={fan ? "RUNNING" : "STOPPED"}
          subtext={fan ? "Ventilating" : "Standby"}
          variant={fan ? "warning" : "default"}
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Buzzer Alarm Card */}{" "}
        <StatsCard
          image={buzzerImage}
          label="Buzzer Alarm"
          value={buzzer ? "ACTIVE" : "SILENT"}
          subtext={buzzer ? "Alert sound on" : "No alarm"}
          variant={buzzer ? "danger" : "default"}
        />{" "}
        <StatsCard
          image={esp32Image}
          label="MQTT Connection"
          value={mqttConnected ? "ONLINE" : "OFFLINE"}
          subtext={mqttConnected ? "Real-time data" : "Reconnecting..."}
          variant={mqttConnected ? "safe" : "warning"}
        />
      </div>
    </div>
  );
}
export default Dashboard;
