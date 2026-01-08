# Gas Leak Detection System

## Project Overview

IoT-based smart kitchen gas leak detection system designed to enhance safety, contributing to **UN Sustainable Development Goal (SDG) 11: Sustainable Cities and Communities**.

**System Features:**

- Real-time gas leak detection and monitoring
- Automatic safety response (valve shutoff, ventilation, buzzer alert)
- Emergency SMS and phone call alerts
- Cloud-based data storage
- Web dashboard for remote monitoring

## Prerequisites

- **ESP32-S3** development board
- **VS Code** with PlatformIO extension
- **Node.js** v20 or higher
- **Google Cloud Platform** account
- **Supabase** account
- **Twilio** account

## Project Structure

```
CPC357_Project/
├── ESP32/                   # ESP32 firmware (PlatformIO)
│   ├── platformio.ini       # PlatformIO configuration
│   ├── include/config.h     # WiFi & MQTT configuration
│   └── src/main.cpp         # Main cpp firmware code
├── backend/                 # Node.js bridge (runs on GCP VM)
│   ├── mqtt-bridge.js       # Main MQTT to Supabase bridge
│   ├── twilio-service.js    # Emergency call service
│   ├── package.json         # Backend Dependencies
│   └── .env                 # Environment variables
├── frontend/                # React dashboard
│   └── package.json         # Frontend dependencies
│   └── .env.local           # Environment variables
└── README.md                # This documentation
```

---

# Part A: Local Development Setup (Your Computer)

## Step 1: Clone Repository for Development

```bash
git clone https://github.com/Lithia22/CPC357_Project.git
cd CPC357_Project
```

## Step 2: Configure ESP32 Firmware

1. **Open the project in VS Code** with PlatformIO extension installed
2. **Configure WiFi and MQTT settings:**

   - Open `ESP32/include/config.h`
   - Update with your credentials:

   ```cpp
   #define WIFI_SSID "YOUR_WIFI_NAME"
   #define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"
   #define MQTT_SERVER "YOUR_GCP_VM_IP"
   ```

3. **Upload firmware to ESP32 (VS code Terminal 1):**
   - Connect ESP32 via USB
   - In VS code GUI click **✓** to build then **➔** to upload
   - Open Serial Monitor (plug icon) to verify connection

## Step 3: Set Up React Dashboard (VS code Terminal 2)

```bash
cd frontend
npm install

# Create .env.local file:
touch .env.local
```

Add:

```
REACT_APP_MQTT_BROKER=ws://YOUR_GCP_VM_IP:9001
REACT_APP_SUPABASE_URL=your_supabase_project_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**Note:** You'll get the GCP VM IP and Supabase credentials in the next sections.

```bash
# Start the development server
npm start
```

Dashboard will open at `http://localhost:3000`

---

# Part B: Cloud Services Setup

## Step 4: Supabase Database Setup

1. **Create account** at [supabase.com](https://supabase.com)
2. **Create new project** and wait for it to initialize
3. **Create database tables** in SQL Editor:

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

4. **Set up authentication:**

   - Go to **Authentication → Users** → **Add User**
   - Email: `user@kitchen.com`
   - Password: `user123`
   - Click **"Create User"**

   **Note**: Disable email confirmation in **Authentication → Providers → Email** → Turn OFF "Confirm email" → Save

5. **Get API credentials:**
   - Go to **Project Settings → API**
   - **Project URL** → Use as `SUPABASE_URL`
   - **anon public key** → Use as `SUPABASE_KEY`

## Step 5: Twilio Setup for Emergency Alerts

1. **Create account** at [twilio.com](https://twilio.com) (free trial available)
2. **Buy a phone number:**
   - Go to **Console → Phone Numbers → Buy a Number**
   - Choose a number with **Voice** capability
   - Click "Buy" (trial accounts get $15 credit)
3. **Get API credentials:**
   - Go to **Console → Account → API keys & tokens**
   - Save: **Account SID**, **Auth Token**, **Phone Number**
4. **Verify emergency contacts:**
   - Go to **Phone Numbers → Verified Caller IDs**
   - Add and verify your emergency contact numbers
   - **Note:** Trial accounts can only call verified numbers

---

# Part C: GCP Cloud Deployment (Virtual Machine)

## Step 6: Create VM Instance & Firewall

1. **Go to Google Cloud Console** → Compute Engine → VM Instances
2. **Click "Create Instance":**

| Setting          | Configuration                    |
| ---------------- | -------------------------------- |
| **Name**         | `gas-detection-mqtt`             |
| **Region**       | `us-central1` (or closest)       |
| **Machine type** | `e2-micro`                       |
| **Boot disk**    | Ubuntu 22.04 LTS (x86/64), 10 GB |

3. Click **"Create"**
4. **Configure Firewall Rules:**
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

## Step 7: SSH Setup & Install Dependencies

```bash
# In GCP Console, click "SSH" button next to your VM
sudo apt update && sudo apt upgrade -y
sudo apt install mosquitto mosquitto-clients nano git -y

# Install Node.js 20+ (Supabase requires Node 20+)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install nodejs -y
node --version  # Should show v20.x.x

# Configure Mosquitto:
sudo nano /etc/mosquitto/mosquitto.conf
```

Add these lines to the config file:

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

# Get your VM's public IP
curl -s ifconfig.me
```

## Step 8: Deploy Backend Service

```bash
# Clone the repository on your GCP VM
git clone https://github.com/Lithia22/CPC357_Project.git
cd CPC357_Project/backend

# Install Node.js dependencies
npm install

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
# Test the bridge connection (see if its successfully connected):
node mqtt-bridge.js
```

## Step 9: Set Up Auto-Start Service

```bash
# Create systemd service file
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
WorkingDirectory=/home/YOUR_USERNAME/CPC357_Project/backend
EnvironmentFile=/home/YOUR_USERNAME/CPC357_Project/backend/.env
ExecStart=/usr/bin/node mqtt-bridge.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

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