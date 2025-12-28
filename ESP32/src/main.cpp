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
int calculateAdjustedThreshold(int baseThreshold);

WiFiClient wifiClient;
PubSubClient mqttClient(wifiClient);
DHT dht(DHT11_PIN, DHT11);
Servo lpgValve;

int gasValue = 0;
float temperature = 25.0;
int adjustedSafeThreshold = BASE_THRESHOLD;
int adjustedWarningThreshold = COOKING_WARNING_THRESHOLD;
int adjustedDangerThreshold = COOKING_DANGER_THRESHOLD;

bool isCookingMode = false;
bool gasAlertActive = false;
bool valveClosed = false;
unsigned long gasAlertStartTime = 0;
unsigned long lastMqttPublish = 0;
unsigned long lastButtonCheck = 0;
bool buttonPressed = false;

void setup()
{
    Serial.begin(115200);
    delay(1000);
    Serial.println("=== Gas Leak Detection System Starting ===");

    pinMode(MQ2_PIN, INPUT);
    pinMode(BUZZER_PIN, OUTPUT);
    pinMode(RELAY_PIN, OUTPUT);
    pinMode(BUTTON_PIN, INPUT_PULLUP);

    dht.begin();
    delay(2000);

    lpgValve.attach(SERVO_PIN);
    delay(500);
    lpgValve.write(VALVE_OPEN);
    Serial.println("Servo initialized to OPEN position");

    digitalWrite(BUZZER_PIN, LOW);
    digitalWrite(RELAY_PIN, LOW);

    setupWiFi();

    mqttClient.setServer(MQTT_SERVER, MQTT_PORT);
    mqttClient.setCallback(mqttCallback);

    beepBuzzer(2, 100);

    Serial.println("System Ready!");
    Serial.println("Current Mode: NON-COOKING");
    Serial.println("Press button to toggle modes");
    Serial.print("Connected to MQTT Server: ");
    Serial.println(MQTT_SERVER);
    Serial.println("======================================");
}

void loop()
{
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
    processGasReading();

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
    String message;
    for (unsigned int i = 0; i < length; i++)
    {
        message += (char)payload[i];
    }

    Serial.print("MQTT Message [");
    Serial.print(topic);
    Serial.print("]: ");
    Serial.println(message);

    String topicStr = String(topic);

    if (topicStr == TOPIC_ACTUATOR_CMD)
    {
        if (message == "emergency_stop")
        {
            Serial.println("Emergency stop command received from web");
            activateSafetyMode();
        }
        else if (message == "toggle_mode")
        {
            isCookingMode = !isCookingMode;

            Serial.println("==================================");
            Serial.print("Mode changed via WEB to: ");
            Serial.println(isCookingMode ? "COOKING MODE" : "NON-COOKING MODE");
            Serial.println("==================================");

            String modeMsg = isCookingMode ? "cooking_mode" : "non_cooking_mode";
            mqttClient.publish(TOPIC_MODE_STATUS, modeMsg.c_str());

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
    }
}

void reconnectMQTT()
{
    static unsigned long lastAttempt = 0;
    if (millis() - lastAttempt < 5000)
        return;

    lastAttempt = millis();
    Serial.print("Attempting MQTT connection...");

    String clientId = "ESP32-GasDetector-";
    clientId += String(random(0xffff), HEX);

    if (mqttClient.connect(clientId.c_str(), MQTT_USER, MQTT_PASSWORD))
    {
        Serial.println("MQTT Connected!");
        mqttClient.subscribe(TOPIC_ACTUATOR_CMD);
        mqttClient.publish("system/status", "connected");
    }
    else
    {
        Serial.print("Failed, rc=");
        Serial.println(mqttClient.state());
    }
}

int calculateAdjustedThreshold(int baseThreshold)
{
    if (temperature > HOT_TEMP)
    {
        return baseThreshold * HOT_FACTOR;
    }
    else if (temperature < COLD_TEMP)
    {
        return baseThreshold * COLD_FACTOR;
    }
    return baseThreshold;
}

void readSensors()
{
    gasValue = analogRead(MQ2_PIN);

    float temp = dht.readTemperature();
    if (!isnan(temp) && temp > 0 && temp < 80)
    {
        temperature = temp;
    }

    adjustedSafeThreshold = calculateAdjustedThreshold(BASE_THRESHOLD);
    adjustedWarningThreshold = calculateAdjustedThreshold(COOKING_WARNING_THRESHOLD);
    adjustedDangerThreshold = calculateAdjustedThreshold(COOKING_DANGER_THRESHOLD);

    Serial.print("Gas: ");
    Serial.print(gasValue);
    Serial.print(" | Temp: ");
    Serial.print(temperature);
    Serial.print("C | Threshold: ");
    Serial.print(adjustedSafeThreshold);
    Serial.print(" | Mode: ");
    Serial.print(isCookingMode ? "COOKING" : "NON-COOKING");
    Serial.print(" | Valve: ");
    Serial.println(valveClosed ? "CLOSED" : "OPEN");
}

void handleButtonPress()
{
    bool currentButtonState = (digitalRead(BUTTON_PIN) == LOW);

    if (currentButtonState && !buttonPressed && (millis() - lastButtonCheck > 300))
    {
        buttonPressed = true;
        lastButtonCheck = millis();

        isCookingMode = !isCookingMode;
        beepBuzzer(1, 100);

        Serial.println("==================================");
        Serial.print("BUTTON PRESSED - Mode changed to: ");
        Serial.println(isCookingMode ? "COOKING MODE" : "NON-COOKING MODE");
        Serial.println("==================================");

        String modeMsg = isCookingMode ? "cooking_mode" : "non_cooking_mode";
        mqttClient.publish(TOPIC_MODE_STATUS, modeMsg.c_str());

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
    if (!isCookingMode)
    {
        if (gasValue >= adjustedSafeThreshold)
        {
            if (!gasAlertActive)
            {
                gasAlertActive = true;
                gasAlertStartTime = millis();
                Serial.println("GAS LEAK DETECTED in NON-COOKING MODE");
                publishAlert("Gas leak detected in NON-COOKING mode", gasValue);
                beepBuzzer(3, 200);

                digitalWrite(RELAY_PIN, HIGH);
                digitalWrite(BUZZER_PIN, HIGH);
            }

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
            if (gasAlertActive || valveClosed)
            {
                gasAlertActive = false;
                Serial.println("Gas level returned to normal");
                publishAlert("Gas level normal - System reset", gasValue);
                deactivateSafetyMode();
            }
        }
    }
    else
    {
        if (gasValue < adjustedWarningThreshold)
        {
            if (gasAlertActive || valveClosed)
            {
                Serial.println("Gas returned to SAFE level");
                gasAlertActive = false;
                deactivateSafetyMode();
            }
            digitalWrite(RELAY_PIN, LOW);
            digitalWrite(BUZZER_PIN, LOW);
        }
        else if (gasValue >= adjustedWarningThreshold && gasValue < adjustedDangerThreshold)
        {
            if (!gasAlertActive)
            {
                Serial.println("WARNING: Medium gas level during cooking");
                publishAlert("Medium gas level during cooking - Normal operation", gasValue);
                gasAlertActive = true;
            }
            digitalWrite(RELAY_PIN, HIGH);
            digitalWrite(BUZZER_PIN, HIGH);
        }
        else if (gasValue >= adjustedDangerThreshold)
        {
            if (!valveClosed)
            {
                Serial.println("EXTREME DANGER: Gas too high for safe cooking");
                publishAlert("EXTREME DANGER: Gas too high, valve closed", gasValue);
                activateSafetyMode();
            }
        }
    }
}

void activateSafetyMode()
{
    if (valveClosed)
        return;

    valveClosed = true;
    digitalWrite(BUZZER_PIN, HIGH);

    lpgValve.write(VALVE_CLOSED);
    delay(500);
    Serial.print("Valve closed - Position: ");
    Serial.println(lpgValve.read());

    digitalWrite(RELAY_PIN, HIGH);

    publishAlert("SAFETY: Valve closed due to high gas", gasValue);
    mqttClient.publish(TOPIC_GAS_ALERT, "Gas valve closed for safety");
}

void deactivateSafetyMode()
{
    if (!valveClosed)
        return;

    valveClosed = false;
    digitalWrite(BUZZER_PIN, LOW);
    digitalWrite(RELAY_PIN, LOW);

    lpgValve.write(VALVE_OPEN);
    delay(500);
    Serial.print("Valve reopened - Position: ");
    Serial.println(lpgValve.read());

    publishAlert("System reset - Valve reopened", gasValue);
    mqttClient.publish(TOPIC_GAS_ALERT, "Gas valve reopened - Safe to continue");
}

void publishData()
{
    char dataBuffer[256];

    snprintf(dataBuffer, sizeof(dataBuffer),
             "{\"gas\":%d,\"temp\":%.1f,\"threshold\":%d,\"mode\":\"%s\",\"valve\":\"%s\",\"fan\":%d,\"buzzer\":%d}",
             gasValue,
             temperature,
             adjustedSafeThreshold,
             isCookingMode ? "cooking" : "non_cooking",
             valveClosed ? "closed" : "open",
             digitalRead(RELAY_PIN),
             digitalRead(BUZZER_PIN));

    mqttClient.publish(TOPIC_GAS_DATA, dataBuffer);
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