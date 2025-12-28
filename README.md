# Gas Leak Detection System

## Project Overview

IoT gas leak detection system with ESP32 hardware, GCP cloud backend, React dashboard with ShadcnUI components, Supabase database, automatic safety shutoff, and emergency SMS alerts via TextBee.

## Setup Instructions

### Step 1: Configure ESP32

1. Open `ESP32/include/config.h`
2. Update these values:

```cpp
#define WIFI_SSID "YOUR_WIFI_NAME"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"
#define MQTT_SERVER "YOUR_GCP_VM_IP"  // From Step 3.2
```

### Step 2: Supabase Database Setup

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

3. Go to **Authentication → Users** → Click **"Add User"**:

- **Email**: `chef@kitchen.com`
- **Password**: `chef123`
- Click **"Create User"**

**Note**: Disable email confirmation in **Authentication → Providers → Email** → Turn OFF "Confirm email" → Save

4. Get API keys from **Project Settings → API**:

- **Project URL** → Use as `SUPABASE_URL` in Step 3.3
- **anon public** key → Use as `SUPABASE_KEY` in Step 3.3

### Step 3: GCP Cloud Deployment

#### **3.1 Create VM Instance & Firewall**

1. Go to **Google Cloud Console → Compute Engine → VM Instances**
2. Click **"Create Instance"**

| Setting          | Configuration                    |
| ---------------- | -------------------------------- |
| **Name**         | `gas-detection-mqtt`             |
| **Region**       | `us-central1` (or closest)       |
| **Machine type** | `e2-micro`                       |
| **Boot disk**    | Ubuntu 22.04 LTS (x86/64), 10 GB |

3. Click **"Create"**

4. Configure Firewall:
   - Go to **VPC Network → Firewall**
   - Click **"Create Firewall Rule"**

| Setting                 | Rule                         |
| ----------------------- | ---------------------------- |
| **Name**                | `allow-mqtt-ports`           |
| **Direction**           | Ingress                      |
| **Action**              | Allow                        |
| **Targets**             | All instances in the network |
| **Source IP ranges**    | `0.0.0.0/0`                  |
| **Protocols and ports** | `TCP:1883,9001`              |

5. Click **"Create"**

#### **3.2 SSH Setup & MQTT Broker**

```bash
# In GCP Console, click "SSH" button next to your VM
sudo apt update && sudo apt upgrade -y
sudo apt install mosquitto mosquitto-clients nano -y

# Configure Mosquitto:
sudo nano /etc/mosquitto/mosquitto.conf
```

Add these lines:

```ini
listener 1883 0.0.0.0
protocol mqtt
listener 9001 0.0.0.0
protocol websockets
allow_anonymous true
max_connections -1
```

Save (`Ctrl+O`, `Enter`, `Ctrl+X`) and restart:

```bash
sudo systemctl restart mosquitto
sudo systemctl enable mosquitto

# Get VM Public IP:
curl -s ifconfig.me
# Copy this IP for ESP32 config (Step 1)

# Install Node.js:
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install nodejs -y
node --version  # Should show v18.x.x

# Install additional packages for TextBee integration:
sudo apt install git -y
```

#### **3.3 Deploy MQTT Bridge & Emergency Alert Service**

```bash
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
    "@supabase/supabase-js": "^2.39.0",
    "axios": "^1.6.0"
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
TEXTBEE_API_KEY=your_textbee_api_key
TEXTBEE_DEVICE_ID=your_textbee_device_id
EMERGENCY_CONTACT_1=+60143631375
EMERGENCY_CONTACT_2=+60123456789
```

```bash
npm install
```

### **3.4 TextBee Emergency Alert Setup (Optional but Recommended)**

1. **Register at TextBee:**

   - Go to https://textbee.dev and create an account
   - Get your API key and device ID from dashboard

2. **Setup TextBee Android Gateway:**

   - Install TextBee app on an Android phone
   - Grant SMS permissions
   - Scan QR code from dashboard to link device
   - Keep phone connected to WiFi for SMS gateway

3. **Create TextBee service file on VM:**

```bash
nano ~/gas-detection-backend/textbee-service.js
```

Add the TextBee service code (see `backend/textbee-service.js` in project files).

### **Copy files to VM:**

**On your computer:** Copy content from `backend/mqtt-bridge.js` and `backend/textbee-service.js`

**In GCP SSH terminal:**

```bash
# 1. Create mqtt-bridge.js on VM
nano ~/gas-detection-backend/mqtt-bridge.js
# Paste content and save (Ctrl+O, Enter, Ctrl+X)

# 2. Create textbee-service.js on VM
nano ~/gas-detection-backend/textbee-service.js
# Paste content and save (Ctrl+O, Enter, Ctrl+X)

# 3. Create systemd service file
sudo nano /etc/systemd/system/mqtt-bridge.service
```

Add:

```ini
[Unit]
Description=MQTT Bridge Service with Emergency Alerts
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
# Save the service file (Ctrl+O, Enter, Ctrl+X)

# Enable the service:
sudo systemctl daemon-reload
sudo systemctl start mqtt-bridge
sudo systemctl enable mqtt-bridge

# Check status:
sudo systemctl status mqtt-bridge

# View logs:
sudo journalctl -u mqtt-bridge -f
```

### Step 4: React Dashboard Setup

```bash
# On local machine:
cd frontend
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
npm start
```

### Step 5: ESP32 Firmware Upload

1. Open `ESP32` in VS Code with PlatformIO extension
2. Click ✓ button to compile
3. Connect ESP32 via USB
4. Click ➔ button to upload
5. Click PlatformIO serial monitor button for output
