import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 're_123456789'); // Provide your Resend API KEY in .env

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { templateType, data } = req.body;
    
    // It's highly recommended to use a verified domain with Resend (e.g. notifications@yourdomain.com)
    // If you haven't verified a domain yet, Resend forces you to use onboarding@resend.dev as FROM.
    const fromEmail = process.env.RESEND_FROM_EMAIL || process.env.CONTACT_EMAIL || 'onboarding@resend.dev'; 
    const adminEmail = process.env.CONTACT_EMAIL || 'your-admin-email@example.com';
    
    let subject = '';
    let html = '';
    let to = '';

    switch (templateType) {
      case 'VENDOR_APPROVAL':
        subject = 'Your Vendor Account is Approved!';
        to = data.to_email;
        html = `
          <h2>Welcome to Creative Events Marketplace, ${data.to_name || data.business_name}!</h2>
          <p>Your vendor account has been approved.</p>
          <p><strong>Your temporary password:</strong> ${data.generated_password}</p>
          <p>Please login and change your password.</p>
        `;
        break;

      case 'CONTACT_SUPPORT':
        subject = 'New Contact Form Submission';
        to = adminEmail;
        html = `
          <h2>New Contact Request</h2>
          <p><strong>Email:</strong> ${data.user_email}</p>
          <p><strong>Phone:</strong> ${data.user_phone}</p>
          <p><strong>Message/Vision:</strong> ${data.message}</p>
        `;
        break;

      case 'VENDOR_INQUIRY':
        subject = `New Inquiry for ${data.vendor_name}`;
        // Since we don't have the vendor email statically here (it's in the client or DB),
        // pass vendor_email from client or route to admin
        to = data.vendor_email || adminEmail; 
        html = `
          <h2>New Event Inquiry</h2>
          <p><strong>From:</strong> ${data.user_name} (${data.user_email})</p>
          <p><strong>Phone:</strong> ${data.user_phone}</p>
          <p><strong>Event Date:</strong> ${data.event_date}</p>
          <p><strong>Message:</strong></p>
          <p>${data.message}</p>
        `;
        break;

      case 'VENDOR_INQUIRY_ACK':
        subject = `Inquiry Sent: ${data.vendor_name}`;
        to = data.user_email;
        html = `
          <h2>Inquiry Received</h2>
          <p>Hi ${data.user_name},</p>
          <p>We have successfully sent your inquiry to ${data.vendor_name} for the date: ${data.event_date}.</p>
          <p>They will get back to you soon.</p>
        `;
        break;

      case 'MARKETPLACE_JOIN_ALERT':
        subject = `New Vendor Application: ${data.vendor_name}`;
        to = adminEmail;
        html = `
          <h2>New Vendor Application</h2>
          <p>A new vendor (<strong>${data.vendor_name}</strong>) has applied to join the marketplace.</p>
          <p>Please review their application in the admin portal.</p>
        `;
        break;

      case 'MARKETPLACE_JOIN_ACK':
        subject = `Application Received: ${data.vendor_name}`;
        to = data.user_email;
        html = `
          <h2>Application Received</h2>
          <p>Hi there,</p>
          <p>We have received your application for <strong>${data.vendor_name}</strong>.</p>
          <p>Our team will review it and get back to you shortly.</p>
        `;
        break;

      default:
        return res.status(400).json({ error: 'Unknown template type' });
    }

    const resendResponse = await resend.emails.send({
      from: fromEmail,
      to: [to],
      subject: subject,
      html: html,
    });

    if (resendResponse.error) {
      console.error(resendResponse.error);
      return res.status(400).json(resendResponse.error);
    }

    return res.status(200).json({ success: true, data: resendResponse.data });
  } catch (error) {
    console.error("Resend API error:", error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
