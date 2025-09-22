// Email service using SendGrid integration
import sgMail from '@sendgrid/mail';

export class EmailService {
  constructor() {
    // Initialize SendGrid with API key from environment
    const apiKey = process.env.SENDGRID_API_KEY;
    if (!apiKey) {
      throw new Error('SENDGRID_API_KEY environment variable is required');
    }
    sgMail.setApiKey(apiKey);
  }

  async sendEmail(
    to: string,
    subject: string,
    html: string,
    from?: string
  ): Promise<void> {
    const fromEmail = from || process.env.SENDGRID_FROM_EMAIL || 'noreply@golfcoachplatform.com';
    
    const msg = {
      to,
      from: fromEmail,
      subject,
      html,
    };

    try {
      await sgMail.send(msg);
      console.log(`Email sent successfully to ${to}`);
    } catch (error) {
      console.error('SendGrid error:', error);
      throw new Error('Failed to send email');
    }
  }

  async sendCoachInvitation(
    email: string, 
    signupUrl: string, 
    customMessage?: string
  ): Promise<void> {
    const message = customMessage || "You've been invited to join our golf coaching platform as a PGA certified instructor.";
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c5530;">Golf Coach Platform Invitation</h2>
        <p>${message}</p>
        <p>Click the link below to register as a coach:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${signupUrl}" 
             style="background: #2c5530; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
            Register as Coach
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">Or copy and paste this URL: ${signupUrl}</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px;">
          Best regards,<br>
          The Golf Coach Team
        </p>
      </div>
    `;

    await this.sendEmail(email, "Invitation to Join Golf Coach Platform", html);
  }
}