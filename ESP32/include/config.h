#ifndef CONFIG_H
#define CONFIG_H

// WiFi Configuration
#define WIFI_SSID ""     // - CHANGE THIS WIFI NAME
#define WIFI_PASSWORD "" // - CHANGE THIS WIFI PW

// GCP MQTT Configuration
#define MQTT_SERVER "" // - CHANGE THIS IP ADDRESS
#define MQTT_PORT 1883
#define MQTT_USER "esp32_client"
#define MQTT_PASSWORD ""

// MQTT Topics
#define TOPIC_GAS_DATA "gas_sensor/data"    // Telemetry data (sensor readings)
#define TOPIC_GAS_ALERT "gas_sensor/alerts" // Alert messages (emergency notifications)
#define TOPIC_MODE_STATUS "system/mode"     // System mode changes (cooking/non-cooking)

// Pin Definitions
#define MQ2_PIN 15
#define DHT11_PIN 4
#define BUZZER_PIN 14
#define SERVO_PIN 17
#define RELAY_PIN 39
#define BUTTON_PIN 38

// Thresholds
#define BASE_THRESHOLD 1000
#define COOKING_WARNING_THRESHOLD 1000
#define COOKING_DANGER_THRESHOLD 3000

// Servo positions
#define VALVE_OPEN 0
#define VALVE_CLOSED 90

// Timing
#define SENSOR_READ_INTERVAL 1000
#define MQTT_UPDATE_INTERVAL 1000
#define VALVE_CLOSE_DELAY 2000
#define FAN_CHECK_INTERVAL 5000

#endif