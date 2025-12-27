# Gas Leak Detection System

## Project Overview

IoT gas leak detection system with ESP32 hardware, GCP cloud backend, React dashboard, Supabase database and automatic safety shutoff.

## Project Structure

```
CPC357_Project/
├── ESP32-Code/                # microcontroller codes
│   ├── include/config.h       # WiFi, MQTT, pin configurations
│   └── src/main.cpp           # Main sensor logic & safety controls
│
├── frontend/
│   ├── src/                  # React web dashboard
│   │   ├── components/       # UI components (Header, Sidebar)
│   │   ├── pages/            # Main views (Dashboard, Charts, Alerts)
│   │   ├── services/         # MQTT & Supabase connection services
│   │   ├── App.js            # Main app routing
│   │   └── index.js          # React entry point
│   └── package.json
│
├── backend/                  # GCP VM services
    ├── mqtt-bridge.js        # MQTT to Supabase data bridge
    └── package.json          # Node.js dependencies
```

## Hardware Setup

### Required Components:

1. **ESP32 Dev Board**
2. **MQ-2 Gas Sensor**
3. **DHT11 Temperature Sensor**
4. **Active Buzzer**
5. **SG90 Servo**
6. **5V Relay**
7. **Push Button**

### Wiring Configuration:

See `ESP32-Code/include/config.h` for pin mappings.

## Setup Instructions

### Step 1: Configure ESP32

1. Open `ESP32-Code/include/config.h`
2. Update these values:

```cpp
#define WIFI_SSID "YOUR_WIFI_NAME"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"
#define MQTT_SERVER "YOUR_GCP_VM_IP"  // From Step 2.6
```

### Step 2: GCP VM Setup (One-time)

#### **2.1 Create VM Instance**

```bash
# In Google Cloud Console:
# 1. Navigate to Compute Engine → VM Instances
# 2. Click "Create Instance"
# 3. Configure:
#    - Name: gas-detection-mqtt
#    - Region: us-central1 (or closest)
#    - Machine: e2-micro (free tier eligible)
#    - OS: Ubuntu 22.04 LTS
#    - Boot disk: 10 GB
# 4. Click "Create"
```

#### **2.2 Configure Firewall Rules (CRITICAL!)**

**Right after VM creation**, configure firewall:

```bash
# In Google Cloud Console:
# 1. Go to VPC Network → Firewall
# 2. Click "CREATE FIREWALL RULE"
# 3. Configure:
#    - Name: allow-mqtt-ports
#    - Direction: Ingress
#    - Targets: All instances in the network
#    - Source IP ranges: 0.0.0.0/0
#    - Protocols and ports: tcp:1883,9001
# 4. Click "CREATE"
```

#### **2.3 SSH into VM**

```bash
# In GCP Console, click "SSH" button next to your VM
# This opens browser terminal
```

#### **2.4 Install Mosquitto MQTT Broker**

```bash
# In SSH terminal:
sudo apt update && sudo apt upgrade -y
sudo apt install mosquitto mosquitto-clients nano -y

# Configure Mosquitto:
sudo nano /etc/mosquitto/mosquitto.conf
```

#### **2.5 Configure Mosquitto**

Add these lines to the config file:

```ini
# MQTT broker configuration
listener 1883 0.0.0.0
protocol mqtt

listener 9001 0.0.0.0
protocol websockets

allow_anonymous true
max_connections -1

persistence true
persistence_location /var/lib/mosquitto/

log_dest file /var/log/mosquitto/mosquitto.log
log_type all
```

Save (`Ctrl+O`, `Enter`, `Ctrl+X`) and restart:

```bash
sudo systemctl restart mosquitto
sudo systemctl enable mosquitto
```

#### **2.6 Get VM Public IP**

```bash
# In SSH terminal:
curl -s ifconfig.me
# Copy this IP address for ESP32 config
```

#### **2.7 Install Node.js**

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install nodejs -y
node --version  # Should show v18.x.x
```

### Step 3: Deploy MQTT Bridge Service

```bash
# On GCP VM:
mkdir -p ~/gas-detection-backend
cd ~/gas-detection-backend

# Create package.json:
nano package.json
```

Add:

```json
{
  "name": "mqtt-bridge",
  "version": "1.0.0",
  "dependencies": {
    "mqtt": "^4.3.7",
    "@supabase/supabase-js": "^2.39.0"
  },
  "main": "mqtt-bridge.js"
}
```

```bash
# Create .env file:
nano .env
```

Add:

```
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key
MQTT_BROKER=mqtt://localhost:1883
```

```bash
# Install dependencies:
npm install

# Copy mqtt-bridge.js from project files
# Then create service:
sudo nano /etc/systemd/system/mqtt-bridge.service
```

Add service configuration:

```ini
[Unit]
Description=MQTT Bridge Service
After=network.target mosquitto.service

[Service]
Type=simple
User=YOUR_USERNAME
WorkingDirectory=/home/YOUR_USERNAME/gas-detection-backend
EnvironmentFile=/home/YOUR_USERNAME/gas-detection-backend/.env
ExecStart=/usr/bin/node mqtt-bridge.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
# Enable service:
sudo systemctl daemon-reload
sudo systemctl start mqtt-bridge
sudo systemctl enable mqtt-bridge
```

### Step 4: Supabase Database Setup

1. Create account at [supabase.com](https://supabase.com)
2. Run SQL in Supabase SQL Editor:

```sql
CREATE TABLE sensor_readings (
  id BIGSERIAL PRIMARY KEY,
  gas_level INTEGER NOT NULL,
  temperature DECIMAL(5,2) NOT NULL,
  adjusted_threshold INTEGER NOT NULL,
  mode VARCHAR(20) NOT NULL,
  valve_status VARCHAR(10) NOT NULL,
  fan_status BOOLEAN NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE alerts (
  id BIGSERIAL PRIMARY KEY,
  message TEXT NOT NULL,
  gas_level INTEGER NOT NULL,
  temperature DECIMAL(5,2),
  alert_type VARCHAR(20) NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);
```

### Step 5: React Dashboard Setup

```bash
# On local machine:
cd frontend

# Install dependencies:
npm install

# Configure environment:
nano .env.local
```

Add:

```
REACT_APP_MQTT_BROKER=ws://YOUR_GCP_VM_IP:9001
REACT_APP_SUPABASE_URL=your_supabase_project_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
```

```bash
# Start development server:
npm start
```

### Step 6: ESP32 Firmware Upload

1. Open `ESP32-Code` in VS Code with PlatformIO extension
2. Click ✓ button to compile
3. Connect ESP32 via USB
4. Click ➔ button to upload
5. Click PlatformIO serial monitor button for output

## System Behavior

### Normal Mode (Default):

- **Gas < 1000**: All systems normal
- **Gas > 1000 for 2 seconds**: Emergency shutoff
  - Valve closes (gas off)
  - Fan turns on
  - Continuous alarm

### Cooking Mode (Press Button):

- **Gas < 1000**: All off
- **Gas 1000-3000**: Fan ON + Continuous buzzer
- **Gas > 3000**: Emergency override to Normal mode
