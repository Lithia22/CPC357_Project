const mqtt = require("mqtt");
const { createClient } = require("@supabase/supabase-js");
const TextBeeService = require("./textbee-service");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const MQTT_BROKER = process.env.MQTT_BROKER || "mqtt://localhost:1883";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const textBee = new TextBeeService();

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
      }

      if (data.gas >= 3000) {
        console.log(`DANGER DETECTED: ${data.gas} PPM - Sending emergency alerts`);

        if (process.env.EMERGENCY_CONTACT_1) {
          await textBee.sendEmergencySMS(
            process.env.EMERGENCY_CONTACT_1,
            data.gas,
            data.temp
          );
        }

        if (process.env.EMERGENCY_CONTACT_2) {
          await textBee.sendEmergencySMS(
            process.env.EMERGENCY_CONTACT_2,
            data.gas,
            data.temp
          );
        }
      }
    }

    if (topic === "gas_sensor/alerts") {
      let alertType = "info";
      if (data.gas_level >= 3000) alertType = "danger";
      else if (data.gas_level >= 1000) alertType = "warning";

      const { error } = await supabase.from("alerts").insert({
        message: data.alert,
        gas_level: data.gas_level,
        temperature: data.temp || null,
        alert_type: alertType,
      });

      if (error) {
        console.error("Alert insert error:", error);
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
  console.log("MQTT client offline, attempting reconnect");
});

mqttClient.on("reconnect", () => {
  console.log("Reconnecting to MQTT broker");
});

console.log("MQTT Bridge started");
console.log("Broker:", MQTT_BROKER);
console.log("Supabase URL:", SUPABASE_URL);
