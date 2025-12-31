const mqtt = require("mqtt");
const { createClient } = require("@supabase/supabase-js");
const TwilioAlertService = require("./twilio-service.js");

// Load environment variables
require("dotenv").config();

console.log("Starting MQTT Bridge with Twilio Emergency Calls...");

// Initialize services
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const twilioService = new TwilioAlertService();

// Connect to MQTT broker
const mqttClient = mqtt.connect(
  process.env.MQTT_BROKER || "mqtt://localhost:1883"
);

console.log("Connecting to MQTT broker...");

// MQTT Connection
mqttClient.on("connect", () => {
  console.log("Connected to MQTT broker");

  // Subscribe to topics
  mqttClient.subscribe("gas_sensor/data", (err) => {
    if (!err) console.log("Subscribed to gas_sensor/data");
  });

  mqttClient.subscribe("gas_sensor/alerts", (err) => {
    if (!err) console.log("Subscribed to gas_sensor/alerts");
  });

  mqttClient.subscribe("system/mode", (err) => {
    if (!err) console.log("Subscribed to system/mode");
  });
});

// Handle incoming messages
mqttClient.on("message", async (topic, message) => {
  try {
    const messageStr = message.toString();

    // Try to parse as JSON
    let data;
    try {
      data = JSON.parse(messageStr);
    } catch (jsonError) {

      if (messageStr.length > 0) {
        console.log(
          `[${topic}] Non-JSON message: ${messageStr.substring(0, 50)}...`
        );
      }
      return;
    }

    switch (topic) {
      case "gas_sensor/data":
        await handleSensorData(data);
        break;
      case "gas_sensor/alerts":
        await handleAlertData(data);
        break;
      case "system/mode":
        console.log(`System mode changed to: ${data}`);
        break;
    }
  } catch (error) {
    console.error("Error processing message:", error.message);
  }
});

// Handle sensor data (save to database)
async function handleSensorData(data) {
  try {
    const { error } = await supabase.from("sensor_readings").insert([
      {
        gas_level: data.gas,
        temperature: data.temp,
        adjusted_threshold: data.threshold,
        mode: data.mode,
        valve_status: data.valve,
        fan_status: data.fan,
        timestamp: new Date(),
      },
    ]);

    if (error) {
      console.error("Database error:", error.message);
    }
  } catch (error) {
    console.error("Error saving sensor data:", error.message);
  }
}

// Handle alert data
async function handleAlertData(data) {
  try {
    // Parse alert data
    let alertData;
    if (typeof data === "string") {
      alertData = JSON.parse(data);
    } else {
      alertData = data;
    }

    // Get values
    const gasLevel = alertData.gas_level || 0;
    const temperature = alertData.temp || alertData.temperature || 0;
    const alertMessage =
      alertData.alert || alertData.message || "Gas leak detected";

    // Determine alert type based on ESP32 logic
    let alertType = "safe"; // Default for "system reset" messages

    if (gasLevel >= 3000 || alertMessage.includes("EXTREME DANGER")) {
      alertType = "danger";
    } else if (alertMessage.includes("Gas leak detected")) {
      // Any gas leak detection in non-cooking mode is DANGER
      alertType = "danger";
    } else if (
      alertMessage.includes("SAFETY") &&
      alertMessage.includes("Valve closed")
    ) {
      // Valve closure due to high gas is DANGER
      alertType = "danger";
    } else if (gasLevel >= 1000) {
      // Gas level above 1000 is at least a warning, could be danger
      if (
        alertMessage.includes("WARNING") ||
        alertMessage.includes("cooking")
      ) {
        alertType = "warning";
      } else {
        // If not explicitly cooking mode warning, treat as danger
        alertType = "danger";
      }
    } else if (alertMessage.includes("WARNING")) {
      alertType = "warning";
    } else if (
      alertMessage.includes("normal") ||
      alertMessage.includes("reset") ||
      alertMessage.includes("reopened")
    ) {
      alertType = "safe";
    }

    // Save to database
    try {
      await supabase.from("alerts").insert([
        {
          message: alertMessage,
          gas_level: gasLevel,
          temperature: temperature,
          alert_type: alertType,
          timestamp: new Date(),
        },
      ]);
    } catch (dbError) {
      console.error("Error saving alert to database:", dbError.message);
    }

    // Trigger emergency calls ONLY for critical alerts (DANGER)
    if (alertType === "danger") {
      console.log("CRITICAL GAS LEAK DETECTED! INITIATING EMERGENCY CALLS");
      await twilioService.sendEmergencyAlert(
        "CRITICAL GAS LEAK",
        alertMessage,
        gasLevel,
        temperature
      );
    } else if (alertType === "warning") {
      console.log("WARNING: High gas level detected - No notification sent");
    }
    // Log safe status
    else if (alertType === "safe") {
      console.log("System returned to safe status");
    }
  } catch (error) {
    console.error("Error handling alert:", error.message);
  }
}

// Handle errors
mqttClient.on("error", (error) => {
  console.error("MQTT connection error:", error.message);
});

mqttClient.on("close", () => {
  console.log("MQTT connection closed");
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("Shutting down...");
  mqttClient.end();
  process.exit(0);
});

console.log("MQTT Bridge with Twilio Emergency Calls is READY!");
