
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
  },

  /**
   * Sends an inquiry notification email to the admin when a new chat inquiry is raised.
   */
  sendInquiryNotificationToAdmin: async (
    userName: string,
    userEmail: string,
    vendorName: string,
    packageName: string,
    eventDate: string,
    message: string
  ) => {
    try {
      const INQUIRY_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_INQUIRY_TEMPLATE_ID || "YOUR_INQUIRY_TEMPLATE_ID";
      if (PUBLIC_KEY === "YOUR_PUBLIC_KEY" || !INQUIRY_TEMPLATE_ID || INQUIRY_TEMPLATE_ID === "YOUR_INQUIRY_TEMPLATE_ID") {
        console.warn("⚠️ EmailJS not configured. Simulating admin inquiry notification.");
        console.log(`%c[EMAIL SIMULATION - Admin Inquiry]\n  From: ${userName} <${userEmail}>\n  Vendor: ${vendorName}\n  Package: ${packageName}\n  Event Date: ${eventDate}\n  Message: ${message}`, "color: #a855f7; font-weight: bold;");
        return { success: true, simulated: true };
      }

      await emailjs.send(
        SERVICE_ID,
        INQUIRY_TEMPLATE_ID,
        {
          user_name: userName,
          user_email: userEmail,
          vendor_name: vendorName,
          package_name: packageName || 'General Inquiry',
          event_date: eventDate || 'Not specified',
          message: message,
        },
        PUBLIC_KEY
      );

      return { success: true, simulated: false };
    } catch (error) {
      console.error("Admin inquiry email failed:", error);
      return { success: false, error };
    }
  }
};
