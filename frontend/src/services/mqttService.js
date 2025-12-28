import mqtt from "mqtt/dist/mqtt";

class MQTTService {
  constructor() {
    this.client = null;
    this.callbacks = {};
    this.connected = false;
    this.connectionPromise = null;
    this.pendingSubscriptions = [];
  }

  async connect(brokerUrl = process.env.REACT_APP_MQTT_BROKER) {
    // If already connected, return
    if (this.connected && this.client) {
      return Promise.resolve();
    }

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    console.log("Connecting to MQTT broker:", brokerUrl);

    this.connectionPromise = new Promise((resolve, reject) => {
      try {
        this.client = mqtt.connect(brokerUrl, {
          clientId: "web_client_" + Math.random().toString(16).substr(2, 8),
          clean: true,
          reconnectPeriod: 1000,
          connectTimeout: 8000,
          keepalive: 60,
          protocol: brokerUrl.startsWith("wss") ? "wss" : "ws",
          rejectUnauthorized: false,
        });

        this.client.on("connect", () => {
          console.log("Connected to MQTT broker");
          this.connected = true;
          this.connectionPromise = null;
          this.processPendingSubscriptions();

          resolve();
        });

        this.client.on("message", (topic, message) => {
          try {
            const data = JSON.parse(message.toString());
            if (this.callbacks[topic]) {
              this.callbacks[topic].forEach((callback) => callback(data));
            }
          } catch (err) {
            console.error("MQTT message parse error:", err);
            if (this.callbacks[topic]) {
              this.callbacks[topic].forEach((callback) =>
                callback({ raw: message.toString() })
              );
            }
          }
        });

        this.client.on("error", (err) => {
          console.error("MQTT error:", err);
          this.connected = false;
          this.connectionPromise = null;
          reject(err);
        });

        this.client.on("close", () => {
          console.log("MQTT connection closed");
          this.connected = false;
        });

        this.client.on("offline", () => {
          console.log("MQTT offline");
          this.connected = false;
        });

        this.client.on("reconnect", () => {
          console.log("MQTT reconnecting...");
        });

        // Connection timeout
        setTimeout(() => {
          if (!this.connected) {
            reject(new Error("MQTT connection timeout"));
            this.connectionPromise = null;
          }
        }, 10000);
      } catch (err) {
        console.error("MQTT initialization error:", err);
        this.connectionPromise = null;
        reject(err);
      }
    });

    return this.connectionPromise;
  }

  // Async subscription method
  async subscribe(topic, callback) {
    try {
      // Wait for connection if not connected
      if (!this.connected) {
        console.log(
          `⏳ Waiting for MQTT connection before subscribing to ${topic}`
        );
        await this.connect();
      }

      // Store callback
      if (!this.callbacks[topic]) {
        this.callbacks[topic] = [];
      }

      // Avoid duplicate callbacks
      if (!this.callbacks[topic].includes(callback)) {
        this.callbacks[topic].push(callback);
      }

      // Subscribe via MQTT
      if (this.client && this.connected) {
        this.client.subscribe(topic, (err) => {
          if (err) {
            console.error(`Failed to subscribe to ${topic}:`, err);
          } else {
            console.log(`Subscribed to ${topic}`);
          }
        });
      } else {
        // Queue for later
        console.log(`Queueing subscription to ${topic}`);
        this.pendingSubscriptions.push({ topic, callback });
      }
    } catch (err) {
      console.error(`Error subscribing to ${topic}:`, err);
    }
  }

  unsubscribe(topic, callback) {
    if (this.callbacks[topic]) {
      this.callbacks[topic] = this.callbacks[topic].filter(
        (cb) => cb !== callback
      );
    }

    // Also unsubscribe from MQTT if connected
    if (this.client && this.connected) {
      this.client.unsubscribe(topic);
    }
  }

  processPendingSubscriptions() {
    if (this.pendingSubscriptions.length > 0) {
      console.log(
        `Processing ${this.pendingSubscriptions.length} pending subscriptions`
      );
      this.pendingSubscriptions.forEach(({ topic, callback }) => {
        this.subscribe(topic, callback).catch((err) => {
          console.error(`Failed to subscribe to pending topic ${topic}:`, err);
        });
      });
      this.pendingSubscriptions = [];
    }
  }

  publish(topic, message) {
    if (this.client && this.connected) {
      const payload =
        typeof message === "object" ? JSON.stringify(message) : message;
      this.client.publish(topic, payload, (err) => {
        if (err) {
          console.error(`Failed to publish to ${topic}:`, err);
        }
      });
    } else {
      console.warn("Cannot publish: MQTT not connected");
    }
  }

  sendCommand(command) {
    this.publish("system/commands", command);
  }

  disconnect() {
    if (this.client) {
      this.client.end();
      this.client = null;
      this.connected = false;
      this.pendingSubscriptions = [];
      this.connectionPromise = null;
      console.log("Disconnected from MQTT");
    }
  }

  isConnected() {
    return this.connected && this.client && this.client.connected;
  }
}

const mqttServiceInstance = new MQTTService();
export default mqttServiceInstance;
