const mqtt = require("mqtt");
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL || "YOUR_SUPABASE_URL";
const SUPABASE_KEY = process.env.SUPABASE_KEY || "YOUR_SUPABASE_ANON_KEY";
const MQTT_BROKER = process.env.MQTT_BROKER || "mqtt://localhost:1883";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const mqttClient = mqtt.connect(MQTT_BROKER, {
  clientId: "mqtt_bridge_" + Math.random().toString(16).substr(2, 8),
  clean: true,
  reconnectPeriod: 1000,
});

mqttClient.on("connect", () => {
  console.log("Connected to MQTT broker");

  mqttClient.subscribe("gas_sensor/data", (err) => {
    if (!err) console.log("Subscribed to gas_sensor/data");
  });

  mqttClient.subscribe("gas_sensor/alerts", (err) => {
    if (!err) console.log("Subscribed to gas_sensor/alerts");
  });
});

mqttClient.on("message", async (topic, message) => {
  try {
    const data = JSON.parse(message.toString());
    console.log(`Received on ${topic}:`, data);

    if (topic === "gas_sensor/data") {
      const { error } = await supabase.from("sensor_readings").insert({
        gas_level: data.gas,
        temperature: data.temp,
        adjusted_threshold: data.threshold,
        mode: data.mode,
        valve_status: data.valve,
        fan_status: data.fan === 1,
      });

      if (error) {
        console.error("Supabase insert error:", error);
      } else {
        console.log("Sensor data saved to database");
      }
    }

    if (topic === "gas_sensor/alerts") {
      let alertType = "info";
      if (data.gas_level > 3000) alertType = "danger";
      else if (data.gas_level > 1000) alertType = "warning";

      const { error } = await supabase.from("alerts").insert({
        message: data.alert,
        gas_level: data.gas_level,
        temperature: data.temp || null,
        alert_type: alertType,
      });

      if (error) {
        console.error("Alert insert error:", error);
      } else {
        console.log("Alert saved to database");
      }
    }
  } catch (err) {
    console.error("Message processing error:", err);
  }
});

mqttClient.on("error", (err) => {
  console.error("MQTT error:", err);
});

mqttClient.on("offline", () => {
  console.log("MQTT client offline, attempting reconnect...");
});

mqttClient.on("reconnect", () => {
  console.log("Reconnecting to MQTT broker...");
});

console.log("MQTT Bridge started");
console.log("Broker:", MQTT_BROKER);
console.log("Supabase URL:", SUPABASE_URL);
