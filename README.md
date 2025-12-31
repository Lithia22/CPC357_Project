# Gas Leak Detection System

## Project Overview

IoT gas leak detection system with ESP32 hardware, GCP cloud backend, React dashboard with ShadcnUI components, Supabase database, automatic safety shutoff, and emergency SMS and phone call alerts via Twilio.

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
```

#### **3.3 Twilio Account Setup**

1. **Create Twilio Account:**

   - Go to [twilio.com](https://twilio.com) and sign up
   - Verify your email and phone number

2. **Get Twilio Phone Number:**

   - Go to **Console → Phone Numbers → Buy a Number**
   - Choose a number with Voice capability
   - Click "Buy" (trial accounts get $15 credit)

3. **Get API Credentials:**

   - Go to **Console → Account → API keys & tokens**
   - Copy:
     - **Account SID**
     - **Auth Token**
     - **Phone Number**

4. **Verify Emergency Numbers:**

   - Go to **Console → Phone Numbers → Verified Caller IDs**
   - Add and verify your emergency contact numbers
   - **Note:** Trial accounts can only call verified numbers

#### **3.4 Deploy MQTT Bridge**

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
  "main": "mqtt-bridge.js",
  "dependencies": {
    "mqtt": "^4.3.7",
    "@supabase/supabase-js": "^2.39.0",
    "twilio": "^4.19.4",
    "dotenv": "^16.3.1"
  }
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
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=sender_number
EMERGENCY_CONTACT=receiver_number
```

```bash
npm install
```

### **3.5 Copy Backend Files to VM:**

**In GCP SSH terminal:**

```bash
# 1. Create mqtt-bridge.js on VM
nano ~/gas-detection-backend/mqtt-bridge.js
# Paste content from backend/mqtt-bridge.js in project files

# 2. Create twilio-service.js on VM
nano ~/gas-detection-backend/twilio-service.js
# Paste content from backend/twilio-service.js in project files

# 3. Create systemd service file
sudo nano /etc/systemd/system/mqtt-bridge.service
```

Add:

```ini
[Unit]
Description=MQTT Bridge Service with Twilio Emergency Calls
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
