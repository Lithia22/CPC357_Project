#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <ESP32Servo.h>
#include <DHT.h>
#include "config.h"

void setupWiFi();
void mqttCallback(char *topic, byte *payload, unsigned int length);
void reconnectMQTT();
void readSensors();
void processGasReading();
void handleButtonPress();
void activateSafetyMode();
void deactivateSafetyMode();
void publishData();
void publishAlert(const char *message, int gasLevel);
void beepBuzzer(int times, int duration);
void controlFanBasedOnTemperature();

WiFiClient wifiClient;
PubSubClient mqttClient(wifiClient);
DHT dht(DHT11_PIN, DHT11);
Servo lpgValve;

int gasValue = 0;                    // Current gas reading from MQ2 sensor
float temperature = 25.0;            // Current temperature from DHT11
bool isCookingMode = false;          // Cooking mode flag (true = cooking, false = non-cooking)
bool gasAlertActive = false;         // Gas alert active flag
bool valveClosed = false;            // Gas valve state (true = closed, false = open)
unsigned long gasAlertStartTime = 0; // Timer for valve closure delay
unsigned long lastMqttPublish = 0;   // Timer for MQTT publishing
unsigned long lastButtonCheck = 0;   // Timer for button debouncing
bool buttonPressed = false;          // Button state flag
unsigned long lastFanCheck = 0;      // Timer for fan control

void setup()
{
    Serial.begin(115200);
    delay(1000);

    pinMode(MQ2_PIN, INPUT);
    pinMode(BUZZER_PIN, OUTPUT);
    pinMode(RELAY_PIN, OUTPUT);
    pinMode(BUTTON_PIN, INPUT_PULLUP);

    dht.begin();
    delay(2000);

    lpgValve.attach(SERVO_PIN);
    delay(500);
    lpgValve.write(VALVE_OPEN);

    digitalWrite(BUZZER_PIN, LOW);
    digitalWrite(RELAY_PIN, LOW);

    setupWiFi();

    mqttClient.setServer(MQTT_SERVER, MQTT_PORT);
    mqttClient.setCallback(mqttCallback);

    beepBuzzer(2, 100);
}

void loop()
{
    // MQTT connection
    if (!mqttClient.connected())
    {
        reconnectMQTT();
    }
    mqttClient.loop();

    static unsigned long lastSensorRead = 0;
    if (millis() - lastSensorRead >= SENSOR_READ_INTERVAL)
    {
        readSensors();
        lastSensorRead = millis();
    }

    handleButtonPress();
    processGasReading();            // Core safety logic - detects gas leaks
    controlFanBasedOnTemperature(); // Smart fan control based on temperature

    // Publish data to MQTT every MQTT_UPDATE_INTERVAL (1 second)
    if (millis() - lastMqttPublish >= MQTT_UPDATE_INTERVAL)
    {
        publishData();
        lastMqttPublish = millis();
    }

    delay(50);
}

void setupWiFi()
{
    Serial.print("Connecting to WiFi...");
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
        Serial.println(" Connected!");
    }
    else
    {
        Serial.println(" Failed!");
    }
}

void mqttCallback(char *topic, byte *payload, unsigned int length)
{
    // Handle incoming MQTT messages from web dashboard
    String message;
    for (unsigned int i = 0; i < length; i++)
    {
        message += (char)payload[i];
    }

    String topicStr = String(topic);

    if (topicStr == TOPIC_ACTUATOR_CMD)
    {
        if (message == "emergency_stop")
        {
            activateSafetyMode();
        }
    }
}

void reconnectMQTT()
{
    // Reconnect to MQTT broker with 5-second cooldown
    static unsigned long lastAttempt = 0;
    if (millis() - lastAttempt < 5000)
        return;

    lastAttempt = millis();

    String clientId = "ESP32-GasDetector-";
    clientId += String(random(0xffff), HEX);

    if (mqttClient.connect(clientId.c_str(), MQTT_USER, MQTT_PASSWORD))
    {
        mqttClient.subscribe(TOPIC_ACTUATOR_CMD);
    }
}

void readSensors()
{
    // Read MQ2 gas sensor (analog value)
    gasValue = analogRead(MQ2_PIN);

    // Read DHT11 temperature sensor
    float temp = dht.readTemperature();
    if (!isnan(temp) && temp > 0 && temp < 80)
    {
        temperature = temp;
    }
}

void controlFanBasedOnTemperature()
{
    // Smart fan control based on temperature and safety conditions
    if (millis() - lastFanCheck >= FAN_CHECK_INTERVAL)
    {
        lastFanCheck = millis();

        // PRIORITY 1: Fan MUST stay ON during gas alerts
        if (gasAlertActive || valveClosed)
        {
            digitalWrite(RELAY_PIN, HIGH);
            return; // Skip temperature logic during emergencies
        }

        // PRIORITY 2: Temperature-based fan control for comfort
        if (temperature > TEMP_HOT) // >30°C = turn fan ON
        {
            digitalWrite(RELAY_PIN, HIGH);
        }
        else if (temperature < TEMP_COOL) // <25°C = turn fan OFF
        {
            digitalWrite(RELAY_PIN, LOW);
        }
        // Between 25-30°C: maintain current fan state (energy saving)
    }
}

void handleButtonPress()
{
    // Physical button to toggle cooking mode
    bool currentButtonState = (digitalRead(BUTTON_PIN) == LOW);

    if (currentButtonState && !buttonPressed && (millis() - lastButtonCheck > 300))
    {
        buttonPressed = true;
        lastButtonCheck = millis();

        // Toggle cooking mode
        isCookingMode = !isCookingMode;
        beepBuzzer(1, 100);

        // Publish mode change to MQTT
        String modeMsg = isCookingMode ? "cooking_mode" : "non_cooking_mode";
        mqttClient.publish(TOPIC_MODE_STATUS, modeMsg.c_str());

        // If switching to non-cooking mode, reset system to safe state
        if (!isCookingMode)
        {
            digitalWrite(RELAY_PIN, LOW);
            digitalWrite(BUZZER_PIN, LOW);
            if (!valveClosed)
            {
                lpgValve.write(VALVE_OPEN);
            }
            gasAlertActive = false;
        }
    }

    if (!currentButtonState && buttonPressed)
    {
        buttonPressed = false;
    }
}

void processGasReading()
{
    // Processes gas readings and triggers appropriate responses
    if (!isCookingMode)
    {
        // NON-COOKING MODE
        // In non-cooking mode, ANY gas leak is considered dangerous
        if (gasValue >= BASE_THRESHOLD) // 1000+ PPM = DANGER
        {
            if (!gasAlertActive)
            {
                gasAlertActive = true;
                gasAlertStartTime = millis();
                publishAlert("Gas leak detected in NON-COOKING mode", gasValue);
                beepBuzzer(3, 200); // Triple beep for danger

                digitalWrite(RELAY_PIN, HIGH);  // Fan ON for ventilation
                digitalWrite(BUZZER_PIN, HIGH); // Continuous alarm
            }

            // Close gas valve after VALVE_CLOSE_DELAY (2 seconds)
            if (millis() - gasAlertStartTime >= VALVE_CLOSE_DELAY)
            {
                if (!valveClosed)
                {
                    activateSafetyMode();
                }
            }
        }
        else
        {
            // Gas level returned to normal
            if (gasAlertActive || valveClosed)
            {
                gasAlertActive = false;
                publishAlert("Gas level normal - System reset", gasValue);
                deactivateSafetyMode();
            }
        }
    }
    else
    {
        // COOKING MODE
        // In cooking mode, higher thresholds are allowed
        if (gasValue < COOKING_WARNING_THRESHOLD) // <1000 PPM = SAFE
        {
            if (gasAlertActive || valveClosed)
            {
                gasAlertActive = false;
                deactivateSafetyMode();
            }
            digitalWrite(BUZZER_PIN, LOW);
        }
        else if (gasValue >= COOKING_WARNING_THRESHOLD && gasValue < COOKING_DANGER_THRESHOLD)
        {
            // 1000-3000 PPM = WARNING (normal cooking levels)
            if (!gasAlertActive)
            {
                publishAlert("Medium gas level during cooking", gasValue);
                gasAlertActive = true;
            }
            digitalWrite(RELAY_PIN, HIGH);  // Fan ON for ventilation
            digitalWrite(BUZZER_PIN, HIGH); // Warning alarm
        }
        else if (gasValue >= COOKING_DANGER_THRESHOLD) // 3000+ PPM = DANGER
        {
            // Even in cooking mode, extremely high gas is dangerous
            if (!valveClosed)
            {
                publishAlert("EXTREME DANGER: Gas too high, valve closed", gasValue);
                activateSafetyMode();
            }
        }
    }
}

void activateSafetyMode()
{
    // EMERGENCY PROCEDURE - Close gas valve and activate all alarms
    if (valveClosed)
        return; // Already in safety mode

    valveClosed = true;
    digitalWrite(BUZZER_PIN, HIGH);
    digitalWrite(RELAY_PIN, HIGH); // Fan ON for emergency ventilation

    // Close gas valve
    lpgValve.write(VALVE_CLOSED);
    delay(500);

    // Send alerts
    publishAlert("SAFETY: Valve closed due to high gas", gasValue);
    mqttClient.publish(TOPIC_GAS_ALERT, "Gas valve closed for safety");
}

void deactivateSafetyMode()
{
    // Return system to normal operation
    if (!valveClosed)
        return;

    valveClosed = false;
    digitalWrite(BUZZER_PIN, LOW);

    // Open gas valve (servo to open position)
    lpgValve.write(VALVE_OPEN);
    delay(500);

    publishAlert("System reset - Valve reopened", gasValue);
    mqttClient.publish(TOPIC_GAS_ALERT, "Gas valve reopened - Safe to continue");
}

void publishData()
{
    // Publish sensor data to MQTT for web dashboard
    char dataBuffer[256];

    // Fan status: 1=ON, 0=OFF
    int fanStatus = digitalRead(RELAY_PIN) == HIGH ? 1 : 0;

    // Format JSON data
    snprintf(dataBuffer, sizeof(dataBuffer),
             "{\"gas\":%d,\"temp\":%.1f,\"threshold\":%d,\"mode\":\"%s\",\"valve\":\"%s\",\"fan\":%d,\"buzzer\":%d}",
             gasValue,
             temperature,
             BASE_THRESHOLD,
             isCookingMode ? "cooking" : "non_cooking",
             valveClosed ? "closed" : "open",
             fanStatus,
             digitalRead(BUZZER_PIN));

    mqttClient.publish(TOPIC_GAS_DATA, dataBuffer);
}

void publishAlert(const char *message, int gasLevel)
{
    // Publish alert message to MQTT
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