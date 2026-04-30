
import emailjs from '@emailjs/browser';

// CONFIGURATION:
// To make this send real emails:
// 1. Go to https://www.emailjs.com/ and create a free account.
// 2. Create a "Service" (e.g., Gmail).
// 3. Create a "Email Template".
//    - Template variables to use: {{to_name}}, {{to_email}}, {{password}}, {{login_url}}
// 4. Replace the placeholders below with your keys.

const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || "YOUR_PUBLIC_KEY"; 
const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || "YOUR_SERVICE_ID"; 
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_ADMIN_TEMPLATE_ID || "YOUR_TEMPLATE_ID"; 

export const emailService = {
  /**
   * Sends a welcome email with login credentials to the vendor.
   */
  sendWelcomeEmail: async (toName: string, toEmail: string, password: string) => {
    try {
      // Check if keys are configured. If not, simulate the email to prevent app crash.
      if (PUBLIC_KEY === "YOUR_PUBLIC_KEY") {
        console.warn("⚠️ EmailJS not configured. Simulating email send.");
        console.log(`%c[EMAIL SIMULATION]\n        To: ${toName} <${toEmail}>\n        Subject: Welcome to Creative Events!\n        Body: \n          Here are your login details:\n          User: ${toEmail}\n          Pass: ${password}\n          Link: ${window.location.origin}/#/login\n        `, "color: #0ea5e9; font-weight: bold;");
        
        // Return a flag indicating it was simulated
        return { success: true, simulated: true };
      }

      // If configured, send real email
      await emailjs.send(
        SERVICE_ID, 
        TEMPLATE_ID, 
        {
          to_name: toName,
          to_email: toEmail,
          password: password,
          login_url: `${window.location.origin}/#/login`,
        },
        PUBLIC_KEY
      );
      
      return { success: true, simulated: false };
    } catch (error) {
      console.error("Email send failed:", error);
      return { success: false, error };
    }
  }
};
