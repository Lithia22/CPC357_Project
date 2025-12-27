#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <ESP32Servo.h>
#include <DHT.h>
#include "config.h"

// Function declarations
void setupWiFi();
void mqttCallback(char *topic, byte *payload, unsigned int length);
void reconnectMQTT();
void readSensors();
void processGasReading();
void handleButtonPress();
void activateSafetyMode();
void cookingModeLogic();
void publishData();
void publishAlert(const char *message, int gasLevel);
void beepBuzzer(int times, int duration);

// Global objects
WiFiClient wifiClient;
PubSubClient mqttClient(wifiClient);
DHT dht(DHT11_PIN, DHT11);
Servo lpgValve;

// Global variables
int gasValue = 0;
float temperature = 0;
int adjustedThreshold = GAS_THRESHOLD_NORMAL;
bool isCookingMode = false;
bool gasAlertActive = false;
unsigned long lastGasAlertTime = 0;
unsigned long lastMqttPublish = 0;
unsigned long lastButtonCheck = 0;
bool buttonPressed = false;

void setup()
{
    Serial.begin(115200);
    Serial.println("=== Gas Leak Detection System Starting ===");

    // Setup pins
    pinMode(MQ2_PIN, INPUT);
    pinMode(BUZZER_PIN, OUTPUT);
    pinMode(RELAY_PIN, OUTPUT);
    pinMode(BUTTON_PIN, INPUT_PULLUP);

    // Initialize components
    dht.begin();
    lpgValve.attach(SERVO_PIN);
    lpgValve.write(VALVE_OPEN);

    // Turn off everything initially
    digitalWrite(BUZZER_PIN, LOW);
    digitalWrite(RELAY_PIN, LOW);

    // Connect to WiFi
    setupWiFi();

    // Setup MQTT
    mqttClient.setServer(MQTT_SERVER, MQTT_PORT);
    mqttClient.setCallback(mqttCallback);

    // Startup beep
    beepBuzzer(2, 100);

    Serial.println("System Ready!");
    Serial.println("Current Mode: NON-COOKING (Full protection)");
    Serial.println("Press button to toggle COOKING MODE");
    Serial.print("Connected to MQTT Server: ");
    Serial.println(MQTT_SERVER);
    Serial.println("======================================");
}

void loop()
{
    // Maintain MQTT connection
    if (!mqttClient.connected())
    {
        reconnectMQTT();
    }
    mqttClient.loop();

    // Read sensors every second
    static unsigned long lastSensorRead = 0;
    if (millis() - lastSensorRead >= SENSOR_READ_INTERVAL)
    {
        readSensors();
        lastSensorRead = millis();
    }

    // Check button for mode toggle
    handleButtonPress();

    // Process gas reading based on mode
    processGasReading();

    // Publish data to MQTT every 5 seconds
    if (millis() - lastMqttPublish >= MQTT_UPDATE_INTERVAL)
    {
        publishData();
        lastMqttPublish = millis();
    }

    delay(50);
}

void setupWiFi()
{
    Serial.print("Connecting to WiFi: ");
    Serial.println(WIFI_SSID);

    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 20)
    {
        delay(500);
        Serial.print(".");
        attempts++;
    }

    if (WiFi.status() == WL_CONNECTED)
    {
        Serial.println("WiFi Connected!");
        Serial.print("IP Address: ");
        Serial.println(WiFi.localIP());
    }
    else
    {
        Serial.println("WiFi Failed!");
    }
}

void mqttCallback(char *topic, byte *payload, unsigned int length)
{
    // Convert payload to string
    String message;
    for (int i = 0; i < length; i++)
    {
        message += (char)payload[i];
    }

    Serial.print("MQTT Message [");
    Serial.print(topic);
    Serial.print("]: ");
    Serial.println(message);

    // Handle commands from web app
    String topicStr = String(topic);

    if (topicStr == TOPIC_ACTUATOR_CMD)
    {
        if (message == "emergency_stop")
        {
            Serial.println("Emergency stop command received!");
            activateSafetyMode();
        }
        else if (message == "toggle_mode")
        {
            isCookingMode = !isCookingMode;
            Serial.print("Mode changed to: ");
            Serial.println(isCookingMode ? "COOKING" : "NON-COOKING");
        }
        else if (message == "valve_open")
        {
            lpgValve.write(VALVE_OPEN);
            Serial.println("Valve opened manually");
        }
        else if (message == "valve_close")
        {
            lpgValve.write(VALVE_CLOSED);
            Serial.println("Valve closed manually");
        }
    }
}

void reconnectMQTT()
{
    while (!mqttClient.connected())
    {
        Serial.print("Attempting MQTT connection...");

        // Generate client ID
        String clientId = "ESP32-GasDetector-";
        clientId += String(random(0xffff), HEX);

        // Attempt connection
        if (mqttClient.connect(clientId.c_str(), MQTT_USER, MQTT_PASSWORD))
        {
            Serial.println("MQTT Connected!");

            // Subscribe to command topic
            mqttClient.subscribe(TOPIC_ACTUATOR_CMD);

            // Publish connection status
            mqttClient.publish("system/status", "connected");
        }
        else
        {
            Serial.print("Failed, rc=");
            Serial.print(mqttClient.state());
            Serial.println(" Retrying in 5s...");
            delay(5000);
        }
    }
}

void readSensors()
{
    // Read gas sensor
    gasValue = analogRead(MQ2_PIN);

    // Read temperature
    float temp = dht.readTemperature();
    if (!isnan(temp))
    {
        temperature = temp;

        // Adjust threshold based on temperature
        if (temperature > HOT_TEMP)
        {
            adjustedThreshold = GAS_THRESHOLD_NORMAL * HOT_FACTOR;
        }
        else if (temperature < COLD_TEMP)
        {
            adjustedThreshold = GAS_THRESHOLD_NORMAL * COLD_FACTOR;
        }
        else
        {
            adjustedThreshold = GAS_THRESHOLD_NORMAL;
        }
    }

    // Print status to serial
    Serial.print("Gas: ");
    Serial.print(gasValue);
    Serial.print(" | Temp: ");
    Serial.print(temperature);
    Serial.print("C | Thresh: ");
    Serial.print(adjustedThreshold);
    Serial.print(" | Mode: ");
    Serial.println(isCookingMode ? "COOKING" : "NON-COOKING");
}

void handleButtonPress()
{
    bool currentButtonState = (digitalRead(BUTTON_PIN) == LOW);

    // Detect button press with debounce
    if (currentButtonState && !buttonPressed && (millis() - lastButtonCheck > 300))
    {
        buttonPressed = true;
        lastButtonCheck = millis();

        // Toggle mode
        isCookingMode = !isCookingMode;

        // Beep confirmation
        beepBuzzer(1, 100);

        // Print mode change
        Serial.println("==================================");
        Serial.print("Mode changed to: ");
        Serial.println(isCookingMode ? "COOKING MODE" : "NON-COOKING MODE");
        Serial.println("==================================");

        // Publish mode change to MQTT
        String modeMsg = isCookingMode ? "cooking_mode" : "non_cooking_mode";
        mqttClient.publish(TOPIC_MODE_STATUS, modeMsg.c_str());

        // Reset if switching to non-cooking mode
        if (!isCookingMode)
        {
            digitalWrite(RELAY_PIN, LOW);
            digitalWrite(BUZZER_PIN, LOW);
            lpgValve.write(VALVE_OPEN);
        }
    }

    // Update button state
    if (!currentButtonState && buttonPressed)
    {
        buttonPressed = false;
    }
}

void processGasReading()
{
    if (!isCookingMode)
    {
        // NON-COOKING MODE: Full protection
        if (gasValue > adjustedThreshold)
        {
            if (!gasAlertActive)
            {
                gasAlertActive = true;
                lastGasAlertTime = millis();
                Serial.println("GAS LEAK DETECTED!");
                publishAlert("Gas leak detected!", gasValue);
                beepBuzzer(3, 200);
            }

            // If gas persists for 2 seconds, activate safety
            if (gasAlertActive && (millis() - lastGasAlertTime > ALARM_DELAY_MS))
            {
                activateSafetyMode();
            }
        }
        else
        {
            if (gasAlertActive)
            {
                gasAlertActive = false;
                Serial.println("Gas level returned to normal");
                publishAlert("Gas level normal", gasValue);

                // Reset safety measures
                digitalWrite(BUZZER_PIN, LOW);
                lpgValve.write(VALVE_OPEN);
                digitalWrite(RELAY_PIN, LOW);
            }
        }
    }
    else
    {
        // COOKING MODE: Smart handling
        cookingModeLogic();
    }
}

void cookingModeLogic()
{
    // LEVEL 1: Normal (< 1000) - Everything off
    if (gasValue < GAS_THRESHOLD_NORMAL)
    {
        digitalWrite(RELAY_PIN, LOW);
        digitalWrite(BUZZER_PIN, LOW);
    }
    // LEVEL 2: Medium (1000-3000) - Fan on, periodic beeps
    else if (gasValue >= GAS_THRESHOLD_NORMAL && gasValue < GAS_THRESHOLD_HIGH)
    {
        digitalWrite(RELAY_PIN, HIGH);

        // Periodic beep every 3 seconds
        static unsigned long lastBeepTime = 0;
        if (millis() - lastBeepTime > 3000)
        {
            beepBuzzer(2, 100);
            lastBeepTime = millis();
        }
    }
    // LEVEL 3: High (> 3000) - Emergency override
    else if (gasValue >= GAS_THRESHOLD_HIGH)
    {
        Serial.println("EMERGENCY! High gas during cooking!");
        publishAlert("EMERGENCY: High gas during cooking!", gasValue);

        // Switch to non-cooking mode for safety
        isCookingMode = false;
        activateSafetyMode();
    }
}

void activateSafetyMode()
{
    Serial.println("ACTIVATING SAFETY MEASURES");

    // 1. Continuous alarm
    digitalWrite(BUZZER_PIN, HIGH);

    // 2. Close gas valve
    lpgValve.write(VALVE_CLOSED);

    // 3. Turn on exhaust fan
    digitalWrite(RELAY_PIN, HIGH);

    // Publish emergency alert
    publishAlert("SAFETY MODE ACTIVATED - Gas shutoff", gasValue);

    // Send MQTT emergency notification
    mqttClient.publish(TOPIC_GAS_ALERT, "EMERGENCY: Gas shutoff activated");

    Serial.println("Valve: CLOSED");
    Serial.println("Fan: ON");
    Serial.println("Alarm: ON");
    Serial.println("Gas supply shut off!");
}

void publishData()
{
    // Create JSON-like string manually
    char dataBuffer[256];

    // Gas sensor data
    snprintf(dataBuffer, sizeof(dataBuffer),
             "{\"gas\":%d,\"temp\":%.1f,\"threshold\":%d,\"mode\":\"%s\",\"valve\":\"%s\",\"fan\":%d}",
             gasValue, temperature, adjustedThreshold,
             isCookingMode ? "cooking" : "non_cooking",
             (lpgValve.read() == VALVE_CLOSED) ? "closed" : "open",
             digitalRead(RELAY_PIN));

    mqttClient.publish(TOPIC_GAS_DATA, dataBuffer);

    // Also send separate temperature data
    char tempBuffer[50];
    snprintf(tempBuffer, sizeof(tempBuffer), "%.1f", temperature);
    mqttClient.publish("temperature/data", tempBuffer);
}

void publishAlert(const char *message, int gasLevel)
{
    char alertBuffer[200];
    snprintf(alertBuffer, sizeof(alertBuffer),
             "{\"alert\":\"%s\",\"gas_level\":%d,\"temp\":%.1f,\"time\":%lu}",
             message, gasLevel, temperature, millis());

    mqttClient.publish(TOPIC_GAS_ALERT, alertBuffer);
}

void beepBuzzer(int times, int duration)
{
    for (int i = 0; i < times; i++)
    {
        digitalWrite(BUZZER_PIN, HIGH);
        delay(duration);
        digitalWrite(BUZZER_PIN, LOW);
        if (i < times - 1)
            delay(duration);
    }
}