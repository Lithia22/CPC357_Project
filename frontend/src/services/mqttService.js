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
        this.client = mqtt.connect(brokerUrl, {
          clientId: "web_client_" + Math.random().toString(16).substr(2, 8),
          clean: true,
          reconnectPeriod: 1000,
          connectTimeout: 4000,
          protocol: "ws",
        });

        this.client.on("connect", () => {
          console.log("Connected to MQTT broker");
          this.connected = true;

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
          try {
            const data = JSON.parse(message.toString());
            if (this.callbacks[topic]) {
              this.callbacks[topic].forEach((callback) => callback(data));
            }
          } catch (err) {
            console.error("MQTT message parse error:", err);
            if (this.callbacks[topic]) {
              this.callbacks[topic].forEach((callback) =>
                callback(message.toString())
              );
            }
          }
        });

        this.client.on("error", (err) => {
          console.error("MQTT error:", err);
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

  subscribe(topic, callback) {
    if (!this.callbacks[topic]) {
      this.callbacks[topic] = [];
    }
    this.callbacks[topic].push(callback);

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
    this.publish("system/commands", command);
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

const mqttServiceInstance = new MQTTService();
export default mqttServiceInstance;
