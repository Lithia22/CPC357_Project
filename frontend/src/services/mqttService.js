// frontend/src/services/mqttService.js
// Use the browser build of MQTT
import mqtt from "mqtt/dist/mqtt";

class MQTTService {
  constructor() {
    this.client = null;
    this.callbacks = {};
    this.connected = false;
  }

  connect(brokerUrl = process.env.REACT_APP_MQTT_BROKER) {
    if (this.client) {
      return Promise.resolve();
    }

    console.log("Connecting to MQTT broker:", brokerUrl);

    return new Promise((resolve, reject) => {
      try {
        // Use WebSocket transport for browser
        this.client = mqtt.connect(brokerUrl, {
          clientId: "web_client_" + Math.random().toString(16).substr(2, 8),
          clean: true,
          reconnectPeriod: 1000,
          connectTimeout: 4000,
          // Force WebSocket protocol
          protocol: "ws", // or "wss" for secure
        });

        this.client.on("connect", () => {
          console.log("✅ Connected to MQTT broker");
          this.connected = true;

          // Subscribe to topics
          const topics = [
            "gas_sensor/data",
            "gas_sensor/alerts",
            "system/mode",
          ];
          topics.forEach((topic) => {
            this.client.subscribe(topic, (err) => {
              if (!err) {
                console.log(`Subscribed to ${topic}`);
              }
            });
          });

          resolve();
        });

        this.client.on("message", (topic, message) => {
          console.log(`MQTT Message [${topic}]:`, message.toString());
          try {
            const data = JSON.parse(message.toString());
            if (this.callbacks[topic]) {
              this.callbacks[topic].forEach((callback) => callback(data));
            }
          } catch (err) {
            console.error("MQTT message parse error:", err);
            // Even if not JSON, still pass the raw message
            if (this.callbacks[topic]) {
              this.callbacks[topic].forEach((callback) =>
                callback(message.toString())
              );
            }
          }
        });

        this.client.on("error", (err) => {
          console.error("❌ MQTT error:", err);
          this.connected = false;
          reject(err);
        });

        this.client.on("offline", () => {
          console.log("MQTT offline");
          this.connected = false;
        });

        this.client.on("reconnect", () => {
          console.log("MQTT reconnecting...");
        });

        // Set timeout for connection
        setTimeout(() => {
          if (!this.connected) {
            reject(new Error("MQTT connection timeout"));
          }
        }, 5000);
      } catch (err) {
        console.error("MQTT initialization error:", err);
        reject(err);
      }
    });
  }

  // Rest of the methods remain the same...
  subscribe(topic, callback) {
    if (!this.callbacks[topic]) {
      this.callbacks[topic] = [];
    }
    this.callbacks[topic].push(callback);

    // Subscribe to topic if connected
    if (this.client && this.connected) {
      this.client.subscribe(topic, (err) => {
        if (err) {
          console.error(`Failed to subscribe to ${topic}:`, err);
        }
      });
    }
  }

  unsubscribe(topic, callback) {
    if (this.callbacks[topic]) {
      this.callbacks[topic] = this.callbacks[topic].filter(
        (cb) => cb !== callback
      );
    }
  }

  publish(topic, message) {
    if (this.client && this.connected) {
      this.client.publish(topic, JSON.stringify(message));
    } else {
      console.warn("Cannot publish: MQTT not connected");
    }
  }

  sendCommand(command) {
    this.publish("system/commands", { command });
  }

  disconnect() {
    if (this.client) {
      this.client.end();
      this.client = null;
      this.connected = false;
    }
  }

  isConnected() {
    return this.connected;
  }
}

export default new MQTTService();
