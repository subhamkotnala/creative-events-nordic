
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
const MESSAGE_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_MESSAGE_TEMPLATE_ID || "template_fa2o7aj";

export const emailService = {
  /**
   * Sends a message notification email to the recipient when they receive a new chat message.
   * Fire-and-forget — never throws; failures are logged silently so the chat is never blocked.
   */
  sendMessageNotification: async (params: {
    recipientEmail: string;
    recipientName: string;
    senderName: string;
  }): Promise<void> => {
    try {
      if (PUBLIC_KEY === "YOUR_PUBLIC_KEY") {
        console.warn("⚠️ EmailJS not configured. Simulating message notification.");
        console.log(
          `%c[EMAIL SIMULATION - Message Notification]\n  To: ${params.recipientName} <${params.recipientEmail}>\n  From: ${params.senderName}`,
          "color: #0ea5e9; font-weight: bold;"
        );
        return;
      }
      await emailjs.send(
        SERVICE_ID,
        MESSAGE_TEMPLATE_ID,
        {
          recipient_email: params.recipientEmail,
          recipient_name: params.recipientName,
          sender_name: params.senderName,
        },
        PUBLIC_KEY
      );
    } catch (error) {
      // Silent fail — email notification must never block the chat
      console.warn("Message notification email failed (non-critical):", error);
    }
  },
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
   * Keeps contact details scrubbed to respect privacy.
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
        console.log(`%c[EMAIL SIMULATION - Admin Inquiry]\n  To: Admin (admin@creative.se)\n  User Name: ${userName}\n  Package: ${packageName}\n  Message: ${message}`, "color: #a855f7; font-weight: bold;");
        return { success: true, simulated: true };
      }

      await emailjs.send(
        SERVICE_ID,
        INQUIRY_TEMPLATE_ID,
        {
          to_email: "admin@creative.se",
          user_name: userName,
          vendor_name: vendorName,
          package_name: packageName || 'General Inquiry',
          message: message,
        },
        PUBLIC_KEY
      );

      return { success: true, simulated: false };
    } catch (error) {
      console.error("Admin inquiry email failed:", error);
      return { success: false, error };
    }
  },

  /**
   * Sends inquiry notifications to BOTH admin and vendor when a user makes an inquiry.
   * Strictly includes only the user's name, message, and package. Strictly NO contact details.
   */
  sendInquiryEmails: async (params: {
    userName: string;
    vendorName: string;
    vendorEmail: string;
    packageName: string;
    message: string;
  }) => {
    const { userName, vendorName, vendorEmail, packageName, message } = params;
    const INQUIRY_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_INQUIRY_TEMPLATE_ID || "YOUR_INQUIRY_TEMPLATE_ID";

    // 1. Notify Admin
    try {
      if (PUBLIC_KEY === "YOUR_PUBLIC_KEY" || !INQUIRY_TEMPLATE_ID || INQUIRY_TEMPLATE_ID === "YOUR_INQUIRY_TEMPLATE_ID") {
        console.warn("⚠️ EmailJS not configured. Simulating admin inquiry notification.");
        console.log(`%c[EMAIL SIMULATION - Admin Inquiry]\n  To: Admin (admin@creative.se)\n  User Name: ${userName}\n  Package: ${packageName}\n  Message: ${message}`, "color: #a855f7; font-weight: bold;");
      } else {
        await emailjs.send(
          SERVICE_ID,
          INQUIRY_TEMPLATE_ID,
          {
            to_email: "admin@creative.se",
            user_name: userName,
            vendor_name: vendorName,
            package_name: packageName || 'General Inquiry',
            message: message,
          },
          PUBLIC_KEY
        );
      }
    } catch (error) {
      console.error("Admin inquiry email failed:", error);
    }

    // 2. Notify Vendor
    try {
      if (PUBLIC_KEY === "YOUR_PUBLIC_KEY" || !INQUIRY_TEMPLATE_ID || INQUIRY_TEMPLATE_ID === "YOUR_INQUIRY_TEMPLATE_ID") {
        console.warn("⚠️ EmailJS not configured. Simulating vendor inquiry notification.");
        console.log(`%c[EMAIL SIMULATION - Vendor Inquiry]\n  To: ${vendorName} <${vendorEmail}>\n  User Name: ${userName}\n  Package: ${packageName}\n  Message: ${message}`, "color: #10b981; font-weight: bold;");
      } else {
        await emailjs.send(
          SERVICE_ID,
          INQUIRY_TEMPLATE_ID,
          {
            to_email: vendorEmail,
            user_name: userName,
            vendor_name: vendorName,
            package_name: packageName || 'General Inquiry',
            message: message,
          },
          PUBLIC_KEY
        );
      }
    } catch (error) {
      console.error("Vendor inquiry email failed:", error);
    }

    return { success: true };
  }
};
