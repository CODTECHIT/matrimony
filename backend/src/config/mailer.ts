import nodemailer, { type Transporter } from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;

let transporter: Transporter | null = null;

if (SMTP_USER && SMTP_PASS) {
  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
} else {
  console.warn("[MAILER] SMTP_USER or SMTP_PASS not set in environment. Emails will not be sent.");
}

export async function sendPasswordResetEmail(to: string, otp: string): Promise<{ success: boolean; error?: string }> {
  if (!transporter) {
    console.error("[MAILER] Transporter is not configured. Cannot send email to", to);
    return { success: false, error: "Email service is not configured" };
  }

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password — YFJ Matrimony</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FFF9F8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #2D2D2D;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #FFF9F8; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="540" style="max-width: 540px; background-color: #ffffff; border-radius: 20px; border: 1px solid #FFE4E6; box-shadow: 0 4px 16px rgba(180, 83, 9, 0.05); overflow: hidden;" cellpadding="0" cellspacing="0">
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #D92662 0%, #C2185B 100%); padding: 32px 24px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 700; letter-spacing: -0.5px;">YFJ Matrimony</h1>
              <p style="margin: 6px 0 0 0; color: #FFE4E6; font-size: 13px; font-weight: 500;">Your Family. Your Future. Our Priority.</p>
            </td>
          </tr>
          
          <!-- Content Body -->
          <tr>
            <td style="padding: 36px 32px;">
              <h2 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 600; color: #1F2937;">Password Reset Verification Code</h2>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #4B5563;">
                We received a request to reset your password for your <strong>YFJ Matrimony</strong> account. Use the 6-digit verification code below to complete the reset:
              </p>

              <!-- OTP Box -->
              <div style="background-color: #FFF1F2; border: 2px dashed #FDA4AF; border-radius: 16px; padding: 20px; text-align: center; margin: 24px 0;">
                <span style="font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #D92662; font-family: monospace;">${otp}</span>
                <p style="margin: 10px 0 0 0; font-size: 12px; color: #9F1239; font-weight: 500;">Valid for 15 minutes</p>
              </div>

              <p style="margin: 24px 0 0 0; font-size: 13px; line-height: 1.6; color: #6B7280;">
                If you did not request a password reset, you can safely ignore this email. Your password will not change until you enter this code and create a new one.
              </p>
              
              <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #F3F4F6; text-align: center;">
                <p style="margin: 0; font-size: 12px; color: #9CA3AF;">
                  For security reasons, never share this code with anyone. YFJ Matrimony staff will never ask for your verification code or password.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #FFF9F8; padding: 20px 32px; text-align: center; border-top: 1px solid #FFE4E6;">
              <p style="margin: 0; font-size: 11px; color: #9CA3AF;">
                © ${new Date().getFullYear()} YFJ Matrimony. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  try {
    const info = await transporter.sendMail({
      from: `"YFJ Matrimony" <${SMTP_USER}>`,
      to,
      subject: `${otp} is your YFJ Matrimony Password Reset Code`,
      text: `Your YFJ Matrimony password reset verification code is: ${otp}. It is valid for 15 minutes. If you did not request this, please ignore this email.`,
      html,
    });

    console.log(`[MAILER] Password reset email sent successfully to ${to}. Message ID: ${info.messageId}`);
    return { success: true };
  } catch (err: any) {
    console.error(`[MAILER ERROR] Failed to send email to ${to}:`, err.message || err);
    return { success: false, error: err.message || "Failed to send email via SMTP" };
  }
}
