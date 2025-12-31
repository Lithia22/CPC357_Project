const twilio = require("twilio");

class TwilioAlertService {
  constructor() {
    // Initialize Twilio client
    this.client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    this.twilioNumber = process.env.TWILIO_PHONE_NUMBER;
    this.emergencyNumber = process.env.EMERGENCY_CONTACT;

    // Alert throttling - 2 minute cooldown
    this.lastAlertTime = 0;
    this.alertCooldownMs = 2 * 60 * 1000;

    console.log("Twilio Alert Service initialized");
    console.log(`Emergency Contact: ${this.emergencyNumber}`);
  }

  // Check if enough time has passed since last alert
  canSendAlert() {
    const now = Date.now();
    const timeSinceLastAlert = now - this.lastAlertTime;

    if (timeSinceLastAlert >= this.alertCooldownMs) {
      this.lastAlertTime = now;
      return true;
    }

    const secondsRemaining = Math.ceil(
      (this.alertCooldownMs - timeSinceLastAlert) / 1000
    );
    console.log(
      `Alert throttled. Wait ${secondsRemaining}s before next alert.`
    );
    return false;
  }

  // Get formatted time in Malaysia timezone
  getFormattedTime() {
    return new Date().toLocaleString("en-MY", {
      timeZone: "Asia/Kuala_Lumpur",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  }

  // Make emergency call
  async makeEmergencyCall(alertMessage, gasLevel, temperature) {
    try {
      const callMessage = `EMERGENCY ALERT! Gas leak detected. Gas level: ${gasLevel} PPM. Temperature: ${temperature} degrees. ${alertMessage}. Immediate action required!`;

      console.log(`Making emergency call to: ${this.emergencyNumber}`);

      const call = await this.client.calls.create({
        twiml: `<Response>
          <Say voice="alice" language="en-US" loop="3">
            ${callMessage}
          </Say>
        </Response>`,
        to: this.emergencyNumber,
        from: this.twilioNumber,
      });

      console.log(`Call initiated: ${call.sid}`);
      return { success: true, callSid: call.sid };
    } catch (error) {
      console.error(`Call failed: ${error.message}`);
      // Fallback to SMS if call fails
      await this.sendSMS(alertMessage, gasLevel, temperature);
      return { success: false, error: error.message };
    }
  }

  // Send SMS
  async sendSMS(alertMessage, gasLevel, temperature) {
    try {
      const smsBody = `GAS LEAK ALERT\nGas: ${gasLevel} PPM\nTemp: ${temperature}°C\nAlert: ${alertMessage}\nTime: ${this.getFormattedTime()}`;

      console.log(`Sending SMS to: ${this.emergencyNumber}`);

      const message = await this.client.messages.create({
        body: smsBody,
        to: this.emergencyNumber,
        from: this.twilioNumber,
      });

      console.log(`SMS sent: ${message.sid}`);
      return { success: true, messageSid: message.sid };
    } catch (error) {
      console.error(`SMS failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  // Main emergency alert function
  async sendEmergencyAlert(alertType, alertMessage, gasLevel, temperature) {
    console.log(`\nALERT: ${alertType}`);
    console.log(`   Message: ${alertMessage}`);
    console.log(`   Gas: ${gasLevel} PPM | Temp: ${temperature}°C`);

    // Only process CRITICAL alerts
    if (alertType !== "CRITICAL GAS LEAK") {
      console.log(`   ${alertType} - No emergency notification sent`);
      return { success: true, notificationSent: false };
    }

    // Check cooldown
    if (!this.canSendAlert()) {
      console.log("   Alert skipped (2-minute cooldown active)");
      return { success: true, throttled: true };
    }

    // Send emergency notifications
    console.log("   DANGER ALERT - Triggering emergency response");

    const callResult = await this.makeEmergencyCall(
      alertMessage,
      gasLevel,
      temperature
    );

    const smsResult = await this.sendSMS(alertMessage, gasLevel, temperature);

    return {
      success: true,
      call: callResult,
      sms: smsResult,
    };
  }
}

module.exports = TwilioAlertService;
