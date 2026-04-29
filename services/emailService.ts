
export const emailService = {
  /**
   * Sends a welcome email with login credentials to the vendor.
   */
  sendWelcomeEmail: async (toName: string, toEmail: string, password: string) => {
    try {
      const response = await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateType: 'VENDOR_APPROVAL',
          data: {
            to_name: toName,
            to_email: toEmail,
            generated_password: password
          }
        })
      });

      if (!response.ok) {
         throw new Error('Failed to send email');
      }
      
      return { success: true, simulated: false };
    } catch (error) {
      console.error("Email send failed:", error);
      return { success: false, error };
    }
  }
};
