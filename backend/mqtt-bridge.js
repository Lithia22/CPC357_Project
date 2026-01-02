const mqtt = require("mqtt");
const { createClient } = require("@supabase/supabase-js");
const TwilioAlertService = require("./twilio-service.js");

// Load environment variables
require("dotenv").config();

console.log("Starting MQTT Bridge with Twilio Emergency Calls...");

// Initialize Supabase client for database operations
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Initialize Twilio service for emergency notifications
const twilioService = new TwilioAlertService();

// MQTT Client - Connect to Broker to receive messages from Publisher (ESP32)
const mqttClient = mqtt.connect(
  process.env.MQTT_BROKER || "mqtt://localhost:1883"
);

console.log("Connecting to MQTT broker...");

// Data Collection: MQTT Connection
// MQTT SUBSCRIBER - Subscribe to Topics
mqttClient.on("connect", () => {
  console.log("Connected to MQTT broker");

  // Subscribe to telemetry data topic
  mqttClient.subscribe("gas_sensor/data", (err) => {
    if (!err) console.log("Subscribed to gas_sensor/data");
  });

  // Subscribe to alerts topic
  mqttClient.subscribe("gas_sensor/alerts", (err) => {
    if (!err) console.log("Subscribed to gas_sensor/alerts");
  });

  // Subscribe to system mode topic
  mqttClient.subscribe("system/mode", (err) => {
    if (!err) console.log("Subscribed to system/mode");
  });
});
// Data Cleaning: Message Validation & Parsing
mqttClient.on("message", async (topic, message) => {
  try {
    const messageStr = message.toString();

    // Data Cleaning: Validate JSON structure
    let data;
    try {
      data = JSON.parse(messageStr);
    } catch (jsonError) {
      // Skip invalid/malformed messages
      if (messageStr.length > 0) {
        console.log(
          `[${topic}] Non-JSON message: ${messageStr.substring(0, 50)}...`
        );
      }
      return;
    }

    // Data Routing: Route messages based on topic
    switch (topic) {
      case "gas_sensor/data":
        await handleSensorData(data); // Process telemetry data (sensor readings)
        break;
      case "gas_sensor/alerts":
        await handleAlertData(data); // Process alert messages
        break;
      case "system/mode":
        console.log(`System mode changed to: ${data}`);
        break;
    }
  } catch (error) {
    console.error("Error processing message:", error.message);
  }
});

// Data Processing: Sensor Telemetry Data Handler
async function handleSensorData(data) {
  try {
    // Extract and structure sensor readings
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

// Data Processing: Alert Data Handler
async function handleAlertData(data) {
  try {
    // Parse alert data (handle both string and object formats)
    let alertData;
    if (typeof data === "string") {
      alertData = JSON.parse(data);
    } else {
      alertData = data;
    }

    // Extract values with fallbacks (handle missing data)
    const gasLevel = alertData.gas_level || 0;
    const temperature = alertData.temp || alertData.temperature || 0;
    const alertMessage =
      alertData.alert || alertData.message || "Gas leak detected";

    // Data Processing: Alert Classification Logic
    let alertType = "safe"; // Default

    if (gasLevel >= 3000 || alertMessage.includes("EXTREME DANGER")) {
      alertType = "danger";
    } else if (alertMessage.includes("Gas leak detected")) {
      alertType = "danger";
    } else if (
      alertMessage.includes("SAFETY") &&
      alertMessage.includes("Valve closed")
    ) {
      alertType = "danger";
    } else if (gasLevel >= 1000) {
      if (
        alertMessage.includes("WARNING") ||
        alertMessage.includes("cooking")
      ) {
        alertType = "warning";
      } else {
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

    // Data Storage: Save processed alert to database
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

    // Data Processing: Emergency Noti Trigger
    // Trigger emergency noti & calls ONLY for critical alerts (DANGER)
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
    } else if (alertType === "safe") {
      console.log("System returned to safe status");
    }
  } catch (error) {
    console.error("Error handling alert:", error.message);
  }
}

// Handle MQTT connection errors
mqttClient.on("error", (error) => {
  console.error("MQTT connection error:", error.message);
});

mqttClient.on("close", () => {
  console.log("MQTT connection closed");
});

process.on("SIGINT", () => {
  console.log("Shutting down...");
  mqttClient.end();
  process.exit(0);
});

console.log("MQTT Bridge with Twilio Emergency Calls is READY!");
