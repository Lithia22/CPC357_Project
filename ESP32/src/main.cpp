#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <ESP32Servo.h>
#include <DHT.h>
#include "config.h"

void setupWiFi();
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
PubSubClient mqttClient(wifiClient); // Publisher
DHT dht(DHT11_PIN, DHT11);
Servo lpgValve;

int gasValue = 0;                    
float temperature = 25.0;            
bool isCookingMode = false;          
bool gasAlertActive = false;         
bool valveClosed = false;           
unsigned long gasAlertStartTime = 0;
unsigned long lastMqttPublish = 0;
unsigned long lastButtonCheck = 0;  
bool buttonPressed = false;         
unsigned long lastFanCheck = 0;     

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

    // MQTT Broker Configuration
    mqttClient.setServer(MQTT_SERVER, MQTT_PORT);

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

    // Telemetry: Publish sensor data to MQTT Broker every 1 second
    if (millis() - lastMqttPublish >= MQTT_UPDATE_INTERVAL)
    {
        publishData(); // Publisher sends data to Broker
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

void reconnectMQTT()
{
    // Reconnect to MQTT Broker with 5-second cooldown
    static unsigned long lastAttempt = 0;
    if (millis() - lastAttempt < 5000)
        return;

    lastAttempt = millis();

    Serial.print("Attempting MQTT connection...");
    
    String clientId = "ESP32-GasDetector-";
    clientId += String(random(0xffff), HEX);
    
    if (mqttClient.connect(clientId.c_str(), MQTT_USER, MQTT_PASSWORD)) {
        Serial.println("connected");
    } else {
        Serial.print("failed, rc=");
        Serial.print(mqttClient.state());
        Serial.println(" try again in 5 seconds");
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
    if (millis() - lastFanCheck >= FAN_CHECK_INTERVAL)
    {
        lastFanCheck = millis();

        // Emergency situations - Fan MUST stay ON
        if (gasAlertActive || valveClosed)
        {
            digitalWrite(RELAY_PIN, HIGH); // Fan ON for ventilation
            return;
        }

        // Normal temperature-based control
        if (temperature > 35.0) // >35°C = turn fan ON
        {
            digitalWrite(RELAY_PIN, HIGH);
        }
        else // <=35°C = turn fan OFF
        {
            digitalWrite(RELAY_PIN, LOW);
        }
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

        // MQTT Publish: Send mode change to Topic "system/mode"
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
        if (gasValue < BASE_THRESHOLD) // <1000 PPM = SAFE
        {
            if (gasAlertActive || valveClosed)
            {
                gasAlertActive = false;
                deactivateSafetyMode();
            }
            digitalWrite(BUZZER_PIN, LOW);
        }
        else if (gasValue >= BASE_THRESHOLD && gasValue < COOKING_DANGER_THRESHOLD)
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

    // MQTT Publish: Send emergency alerts to Broker
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

    // MQTT Publish: Send system reset notification to Broker
    publishAlert("System reset - Valve reopened", gasValue);
    mqttClient.publish(TOPIC_GAS_ALERT, "Gas valve reopened - Safe to continue");
}

// Publishes sensor telemetry data to MQTT Topic "gas_sensor/data"
void publishData()
{
    char dataBuffer[256];

    // Fan status: 1=ON, 0=OFF
    int fanStatus = digitalRead(RELAY_PIN) == HIGH ? 1 : 0;

    // DEBUG: Print to Serial Monitor
    Serial.print("DEBUG - Gas: ");
    Serial.print(gasValue);
    Serial.print(" | Threshold sending: ");
    Serial.print(BASE_THRESHOLD);
    Serial.print(" | Temp: ");
    Serial.println(temperature);

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

// Publishes alert messages to MQTT Topic "gas_sensor/alerts"
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