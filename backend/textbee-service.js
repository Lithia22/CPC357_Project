const axios = require("axios");

class TextBeeService {
  constructor() {
    this.apiKey = process.env.TEXTBEE_API_KEY;
    this.deviceId = process.env.TEXTBEE_DEVICE_ID;
    this.baseUrl = "https://api.textbee.dev/api/v1/gateway";
    this.lastSentTime = 0;
    this.minInterval = 300000; // 5 minutes between alerts
  }

  async sendEmergencySMS(phoneNumber, gasLevel, temperature) {
    try {
      const now = Date.now();
      if (now - this.lastSentTime < this.minInterval) {
        console.log("SMS rate limited - waiting for cooldown period");
        return { success: false, error: "Rate limited" };
      }

      console.log(`Sending emergency SMS to ${phoneNumber}`);

      const response = await axios.post(
        `${this.baseUrl}/devices/${this.deviceId}/send-sms`,
        {
          recipients: [phoneNumber],
          message: this.formatEmergencyMessage(gasLevel, temperature),
        },
        {
          headers: {
            "x-api-key": this.apiKey,
            "Content-Type": "application/json",
          },
          timeout: 10000,
        }
      );

      this.lastSentTime = now;
      console.log("TextBee SMS sent successfully");
      return { success: true, data: response.data };
    } catch (error) {
      console.error("TextBee SMS failed:", {
        error: error.message,
        response: error.response?.data,
      });
      return { success: false, error: error.message };
    }
  }

  formatEmergencyMessage(gasLevel, temperature) {
    return `GAS EMERGENCY ALERT

Gas Level: ${gasLevel} PPM
Temperature: ${temperature}°C
Location: Main Kitchen
Time: ${new Date().toLocaleString("en-MY")}

Status: CRITICAL
Action Required: Immediate evacuation`;
  }
}

module.exports = TextBeeService;
