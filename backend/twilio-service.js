const twilio = require("twilio");

class TwilioAlertService {
  constructor() {
    // Initialize Twilio client
    this.client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    this.twilioNumber = process.env.TWILIO_PHONE_NUMBER;
    this.emergencyNumbers = process.env.EMERGENCY_CONTACTS.split(",");

    console.log("Twilio Alert Service initialized - Simple version");
  }

  // Make emergency phone call
  async makeEmergencyCall(alertMessage, gasLevel, temperature) {
    try {
      // Create clear emergency message
      const callMessage = `EMERGENCY ALERT! Gas leak detected. Gas level: ${gasLevel} PPM. Temperature: ${temperature} degrees. ${alertMessage}. Immediate action required!`;

      console.log(
        `Making emergency call to: ${this.emergencyNumbers.join(", ")}`
      );

      // Call each emergency number
      for (const number of this.emergencyNumbers) {
        const phoneNumber = number.trim();

        try {
          const call = await this.client.calls.create({
            twiml: `<Response>
              <Say voice="alice" language="en-US" loop="3">
                ${callMessage}
              </Say>
            </Response>`,
            to: phoneNumber,
            from: this.twilioNumber,
          });

          console.log(`Call initiated to ${phoneNumber}: ${call.sid}`);
        } catch (error) {
          console.error(`Failed to call ${phoneNumber}:`, error.message);
          // Try sending SMS if call fails
          await this.sendSMSBackup(
            alertMessage,
            gasLevel,
            temperature,
            phoneNumber
          );
        }
      }

      return { success: true };
    } catch (error) {
      console.error("Error making emergency calls:", error.message);
      return { success: false, error: error.message };
    }
  }

  // Send SMS as backup if call fails
  async sendSMSBackup(alertMessage, gasLevel, temperature, phoneNumber) {
    try {
      const smsBody = `GAS LEAK ALERT \nGas: ${gasLevel} PPM\nTemp: ${temperature}°C\nAlert: ${alertMessage}\nTime: ${new Date().toLocaleString()}`;

      const message = await this.client.messages.create({
        body: smsBody,
        to: phoneNumber,
        from: this.twilioNumber,
      });

      console.log(`SMS sent to ${phoneNumber}: ${message.sid}`);
      return { success: true };
    } catch (smsError) {
      console.error(`Failed to send SMS to ${phoneNumber}:`, smsError.message);
      return { success: false };
    }
  }

  // Main alert function
  async sendEmergencyAlert(alertType, alertMessage, gasLevel, temperature) {
    console.log(`${alertType}: ${alertMessage} (Gas: ${gasLevel} PPM)`);

    if (alertType === "CRITICAL GAS LEAK") {
      // Make emergency calls for critical alerts
      return await this.makeEmergencyCall(alertMessage, gasLevel, temperature);
    } else if (alertType === "WARNING") {
      // Send SMS for warnings only
      console.log(`Sending SMS warning to contacts`);
      await this.sendWarningSMS(alertMessage, gasLevel, temperature);
      return { success: true };
    }

    return { success: true };
  }

  // Send warning SMS
  async sendWarningSMS(alertMessage, gasLevel, temperature) {
    try {
      const smsBody = `GAS WARNING\nGas: ${gasLevel} PPM\nTemp: ${temperature}°C\nAlert: ${alertMessage}\nTime: ${new Date().toLocaleString()}`;

      const smsPromises = this.emergencyNumbers.map((number) =>
        this.client.messages.create({
          body: smsBody,
          to: number.trim(),
          from: this.twilioNumber,
        })
      );

      const results = await Promise.allSettled(smsPromises);

      results.forEach((result, index) => {
        const number = this.emergencyNumbers[index];
        if (result.status === "fulfilled") {
          console.log(`Warning SMS sent to ${number}`);
        } else {
          console.error(
            `Failed to send warning SMS to ${number}:`,
            result.reason.message
          );
        }
      });

      return { success: true };
    } catch (error) {
      console.error("Error sending warning SMS:", error.message);
      return { success: false };
    }
  }
}

module.exports = TwilioAlertService;
