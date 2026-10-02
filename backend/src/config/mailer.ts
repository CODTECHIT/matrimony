import nodemailer, { type Transporter } from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const FRONTEND_URL = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");

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

interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

async function sendMailHelper(options: SendMailOptions): Promise<{ success: boolean; error?: string }> {
  if (!transporter) {
    console.error(`[MAILER] Transporter is not configured. Cannot send email to ${options.to}`);
    return { success: false, error: "Email service is not configured" };
  }

  try {
    const info = await transporter.sendMail({
      from: `"YFJ Matrimony" <${SMTP_USER}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });

    console.log(`[MAILER] Email successfully sent to ${options.to}. Subject: "${options.subject}". Message ID: ${info.messageId}`);
    return { success: true };
  } catch (err: any) {
    console.error(`[MAILER ERROR] Failed to send email to ${options.to}:`, err.message || err);
    return { success: false, error: err.message || "Failed to send email via SMTP" };
  }
}

/**
 * Shared HTML template layout with responsive styling and YFJ Matrimony branding.
 */
function renderEmailLayout(params: {
  previewText: string;
  contentHtml: string;
  ctaText?: string;
  ctaUrl?: string;
  footerNote?: string;
}): string {
  const currentYear = new Date().getFullYear();

  const ctaButtonHtml = params.ctaText && params.ctaUrl
    ? `
      <table border="0" cellspacing="0" cellpadding="0" style="margin: 28px 0 16px 0;">
        <tr>
          <td align="center" style="border-radius: 8px; background: linear-gradient(135deg, #D92662 0%, #C2185B 100%);">
            <a href="${params.ctaUrl}" target="_blank" style="display: inline-block; padding: 13px 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 8px;">
              ${params.ctaText} &rarr;
            </a>
          </td>
        </tr>
      </table>
    `
    : "";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>YFJ Matrimony</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FFF9F8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #2D2D2D; -webkit-font-smoothing: antialiased;">
  <!-- Preview Text (Hidden in body) -->
  <div style="display: none; max-height: 0px; overflow: hidden; font-size: 1px; line-height: 1px; color: #fff; opacity: 0;">
    ${params.previewText}
  </div>

  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #FFF9F8; padding: 36px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width: 540px; background-color: #ffffff; border-radius: 16px; border: 1px solid #FFE4E6; box-shadow: 0 4px 20px rgba(180, 83, 9, 0.05); overflow: hidden;" cellpadding="0" cellspacing="0">
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #D92662 0%, #C2185B 100%); padding: 30px 24px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 700; letter-spacing: -0.5px;">YFJ Matrimony</h1>
              <p style="margin: 6px 0 0 0; color: #FFE4E6; font-size: 13px; font-weight: 500;">Your Family. Your Future. Our Priority.</p>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 32px 28px;">
              ${params.contentHtml}
              ${ctaButtonHtml}

              ${params.footerNote ? `
                <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #F3F4F6;">
                  <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #9CA3AF;">
                    ${params.footerNote}
                  </p>
                </div>
              ` : ""}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #FFF9F8; padding: 20px 28px; text-align: center; border-top: 1px solid #FFE4E6;">
              <p style="margin: 0 0 6px 0; font-size: 12px; color: #6B7280;">
                Need help or have questions? Contact us at <a href="mailto:support@yfjmatrimony.com" style="color: #D92662; text-decoration: none;">support@yfjmatrimony.com</a>
              </p>
              <p style="margin: 0; font-size: 11px; color: #9CA3AF;">
                &copy; ${currentYear} YFJ Matrimony. All rights reserved. &bull; <a href="${FRONTEND_URL}" style="color: #9CA3AF; text-decoration: underline;">Visit Portal</a>
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
}

/**
 * 1. User Registered Welcome Email
 */
export async function sendWelcomeEmail(params: {
  to: string;
  fullName: string;
  displayId?: string;
}): Promise<{ success: boolean; error?: string }> {
  const { to, fullName, displayId } = params;
  const loginUrl = `${FRONTEND_URL}/login`;
  const profileUrl = `${FRONTEND_URL}/app/my-profile`;

  const contentHtml = `
    <h2 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 700; color: #1F2937;">Welcome to YFJ Matrimony, ${fullName}! 💍</h2>
    <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #4B5563;">
      Thank you for joining <strong>YFJ Matrimony</strong>. Your account has been created successfully, and we are excited to help you find your ideal life partner.
    </p>

    <!-- Account Details Box -->
    <div style="background-color: #FFF1F2; border: 1px solid #FDA4AF; border-radius: 12px; padding: 18px 20px; margin: 20px 0;">
      <h3 style="margin: 0 0 10px 0; font-size: 14px; font-weight: 600; color: #9F1239; text-transform: uppercase; letter-spacing: 0.5px;">Your Account Details</h3>
      <table width="100%" cellpadding="4" cellspacing="0" style="font-size: 13px; color: #374151;">
        <tr>
          <td width="35%" style="font-weight: 600; color: #6B7280;">Member Name:</td>
          <td style="font-weight: 600; color: #1F2937;">${fullName}</td>
        </tr>
        <tr>
          <td style="font-weight: 600; color: #6B7280;">Profile ID:</td>
          <td style="font-weight: 700; color: #D92662;">${displayId || "Assigned on verification"}</td>
        </tr>
        <tr>
          <td style="font-weight: 600; color: #6B7280;">Registered Email:</td>
          <td>${to}</td>
        </tr>
      </table>
    </div>

    <h3 style="margin: 22px 0 10px 0; font-size: 15px; font-weight: 600; color: #1F2937;">3 Steps to Get Started:</h3>
    <ol style="margin: 0 0 20px 0; padding-left: 20px; font-size: 13px; line-height: 1.8; color: #4B5563;">
      <li><strong>Complete Your Profile:</strong> Add horoscope, education, and family background to stand out.</li>
      <li><strong>Upload Photos:</strong> Profiles with photos receive up to <strong>5x more responses</strong>!</li>
      <li><strong>Express Interest:</strong> Search verified profiles and send interest requests.</li>
    </ol>
  `;

  const html = renderEmailLayout({
    previewText: `Welcome to YFJ Matrimony, ${fullName}! Your Profile ID is ${displayId || "ready"}.`,
    contentHtml,
    ctaText: "Complete Your Profile Now",
    ctaUrl: profileUrl,
    footerNote: `You received this email because you signed up for YFJ Matrimony. If you did not sign up, please let us know immediately.`,
  });

  return sendMailHelper({
    to,
    subject: `Welcome to YFJ Matrimony! Your Profile ID: ${displayId || "Active"} 💖`,
    text: `Hello ${fullName},\n\nWelcome to YFJ Matrimony! Your account has been registered successfully.\nProfile ID: ${displayId || "Pending"}\nRegistered Email: ${to}\n\nPlease complete your profile at: ${profileUrl}\n\nBest regards,\nYFJ Matrimony Team`,
    html,
  });
}

/**
 * 2. Forgot Password OTP Email
 */
export async function sendPasswordResetEmail(
  to: string,
  otp: string
): Promise<{ success: boolean; error?: string }> {
  const contentHtml = `
    <h2 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 600; color: #1F2937;">Password Reset Verification Code</h2>
    <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #4B5563;">
      We received a request to reset your password for your <strong>YFJ Matrimony</strong> account. Use the 6-digit verification code below to complete the reset:
    </p>

    <!-- OTP Box -->
    <div style="background-color: #FFF1F2; border: 2px dashed #FDA4AF; border-radius: 14px; padding: 20px; text-align: center; margin: 24px 0;">
      <span style="font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #D92662; font-family: monospace;">${otp}</span>
      <p style="margin: 10px 0 0 0; font-size: 12px; color: #9F1239; font-weight: 500;">Valid for 15 minutes</p>
    </div>

    <p style="margin: 20px 0 0 0; font-size: 13px; line-height: 1.6; color: #6B7280;">
      If you did not request a password reset, you can safely ignore this email. Your password will not change until you enter this code and create a new one.
    </p>
  `;

  const html = renderEmailLayout({
    previewText: `Your YFJ Matrimony password reset verification code is ${otp}.`,
    contentHtml,
    footerNote: "For security reasons, never share this code with anyone. YFJ Matrimony staff will never ask for your verification code or password.",
  });

  return sendMailHelper({
    to,
    subject: `${otp} is your YFJ Matrimony Password Reset Code`,
    text: `Your YFJ Matrimony password reset verification code is: ${otp}. It is valid for 15 minutes. If you did not request this, please ignore this email.`,
    html,
  });
}

/**
 * 3. New Request Come (Interest Request Received)
 */
export async function sendInterestReceivedEmail(params: {
  to: string;
  receiverName: string;
  senderName: string;
  senderDisplayId?: string;
  senderAge?: number;
  senderOccupation?: string;
  senderCity?: string;
}): Promise<{ success: boolean; error?: string }> {
  const { to, receiverName, senderName, senderDisplayId, senderAge, senderOccupation, senderCity } = params;
  const requestsUrl = `${FRONTEND_URL}/app/interests/received`;

  const detailsList: string[] = [];
  if (senderAge) detailsList.push(`${senderAge} yrs`);
  if (senderOccupation) detailsList.push(senderOccupation);
  if (senderCity) detailsList.push(senderCity);
  const detailsSnippet = detailsList.join(" &bull; ");

  const contentHtml = `
    <h2 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 700; color: #1F2937;">New Interest Request Received! 💖</h2>
    <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #4B5563;">
      Hello <strong>${receiverName}</strong>,
    </p>
    <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #4B5563;">
      A member has viewed your profile and expressed interest in connecting with you on <strong>YFJ Matrimony</strong>:
    </p>

    <!-- Sender Preview Card -->
    <div style="background-color: #FFF1F2; border: 1px solid #FDA4AF; border-radius: 14px; padding: 20px; margin: 20px 0;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td>
            <h3 style="margin: 0 0 4px 0; font-size: 16px; font-weight: 700; color: #9F1239;">${senderName}</h3>
            <p style="margin: 0 0 6px 0; font-size: 13px; font-weight: 600; color: #D92662;">Profile ID: ${senderDisplayId || "Active Member"}</p>
            ${detailsSnippet ? `<p style="margin: 0; font-size: 13px; color: #4B5563;">${detailsSnippet}</p>` : ""}
          </td>
        </tr>
      </table>
    </div>

    <p style="margin: 16px 0 0 0; font-size: 14px; line-height: 1.6; color: #4B5563;">
      Review their complete bio, horoscope, and photos on YFJ Matrimony. If you are interested, simply click <strong>Accept</strong> to start chatting directly!
    </p>
  `;

  const html = renderEmailLayout({
    previewText: `${senderName} (${senderDisplayId || ""}) sent you an interest request on YFJ Matrimony.`,
    contentHtml,
    ctaText: "Review & Respond to Request",
    ctaUrl: requestsUrl,
    footerNote: "You can manage your notification preferences anytime from your Account Settings.",
  });

  return sendMailHelper({
    to,
    subject: `${senderName} (${senderDisplayId || "Member"}) expressed interest in your profile 💖`,
    text: `Hello ${receiverName},\n\n${senderName} (${senderDisplayId || ""}) has expressed interest in your profile on YFJ Matrimony!\n\nDetails: ${detailsList.join(", ")}\n\nPlease visit ${requestsUrl} to review and respond.\n\nBest regards,\nYFJ Matrimony Team`,
    html,
  });
}

/**
 * 4. New Request Accepted (Interest Accepted)
 */
export async function sendInterestAcceptedEmail(params: {
  to: string;
  senderName: string;
  partnerName: string;
  partnerDisplayId?: string;
  conversationId?: string;
}): Promise<{ success: boolean; error?: string }> {
  const { to, senderName, partnerName, partnerDisplayId } = params;
  const messagesUrl = `${FRONTEND_URL}/app/messages`;

  const contentHtml = `
    <h2 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 700; color: #1F2937;">Interest Request Accepted! 🎉</h2>
    <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #4B5563;">
      Hello <strong>${senderName}</strong>,
    </p>
    <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #4B5563;">
      Great news! <strong>${partnerName}</strong> (${partnerDisplayId || "Member"}) has accepted your interest request on <strong>YFJ Matrimony</strong>!
    </p>

    <!-- Success Match Banner -->
    <div style="background-color: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 14px; padding: 20px; margin: 20px 0; text-align: center;">
      <p style="margin: 0 0 4px 0; font-size: 13px; font-weight: 600; color: #065F46; text-transform: uppercase;">Connection Established</p>
      <h3 style="margin: 0; font-size: 18px; font-weight: 700; color: #047857;">You are now connected with ${partnerName}!</h3>
      <p style="margin: 8px 0 0 0; font-size: 13px; color: #065F46;">
        A conversation has been unlocked. You can now chat directly, share contact info, and get to know each other.
      </p>
    </div>

    <p style="margin: 16px 0 0 0; font-size: 14px; line-height: 1.6; color: #4B5563;">
      Don't keep them waiting! Send a courteous introductory greeting to start the conversation.
    </p>
  `;

  const html = renderEmailLayout({
    previewText: `${partnerName} accepted your interest request! You can now start chatting on YFJ Matrimony.`,
    contentHtml,
    ctaText: "Start Chatting Now",
    ctaUrl: messagesUrl,
    footerNote: "Remember to keep all communications courteous and respectful.",
  });

  return sendMailHelper({
    to,
    subject: `Congratulations! ${partnerName} (${partnerDisplayId || ""}) accepted your interest request! 🎉`,
    text: `Hello ${senderName},\n\nGreat news! ${partnerName} (${partnerDisplayId || ""}) has accepted your interest request on YFJ Matrimony!\n\nYou can now chat directly at: ${messagesUrl}\n\nBest regards,\nYFJ Matrimony Team`,
    html,
  });
}

/**
 * 5a. Plan is Getting Over (Expiring Soon Reminder)
 */
export async function sendPlanExpiringEmail(params: {
  to: string;
  userName: string;
  tier: string;
  expiresAt: Date | string;
  daysLeft: number;
}): Promise<{ success: boolean; error?: string }> {
  const { to, userName, tier, expiresAt, daysLeft } = params;
  const upgradeUrl = `${FRONTEND_URL}/app/upgrade`;
  const tierName = tier.charAt(0).toUpperCase() + tier.slice(1);
  const formattedDate = new Date(expiresAt).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const contentHtml = `
    <h2 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 700; color: #1F2937;">Your ${tierName} Plan is Expiring Soon ⏳</h2>
    <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #4B5563;">
      Hello <strong>${userName}</strong>,
    </p>
    <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #4B5563;">
      This is a reminder that your <strong>${tierName} Membership</strong> on YFJ Matrimony will expire in 
      <strong style="color: #D92662;">${daysLeft} ${daysLeft === 1 ? "day" : "days"}</strong> on <strong>${formattedDate}</strong>.
    </p>

    <!-- Expiry Alert Box -->
    <div style="background-color: #FFFBEB; border: 1px solid #FDE68A; border-radius: 14px; padding: 18px 20px; margin: 20px 0;">
      <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #92400E;">Don't Lose Your Premium Benefits:</h3>
      <ul style="margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.8; color: #78350F;">
        <li>Direct messaging & chatting with connected matches</li>
        <li>Viewing verified contact numbers and WhatsApp details</li>
        <li>Priority profile placement in matchmaking searches</li>
      </ul>
    </div>

    <p style="margin: 16px 0 0 0; font-size: 14px; line-height: 1.6; color: #4B5563;">
      Renew your subscription now to ensure uninterrupted communication with your prospects!
    </p>
  `;

  const html = renderEmailLayout({
    previewText: `Your YFJ Matrimony ${tierName} plan is expiring in ${daysLeft} days (${formattedDate}). Renew now to stay connected.`,
    contentHtml,
    ctaText: "Renew My Membership",
    ctaUrl: upgradeUrl,
    footerNote: "Renewing before expiry ensures no disruption in your ongoing conversations and match connections.",
  });

  return sendMailHelper({
    to,
    subject: `Important: Your YFJ Matrimony ${tierName} plan expires in ${daysLeft} ${daysLeft === 1 ? "day" : "days"} ⏳`,
    text: `Hello ${userName},\n\nYour ${tierName} plan on YFJ Matrimony is expiring on ${formattedDate} (${daysLeft} days left).\n\nTo keep direct messaging and verified contact views, renew your plan at: ${upgradeUrl}\n\nBest regards,\nYFJ Matrimony Team`,
    html,
  });
}

/**
 * 5b. Plan Expired Notice
 */
export async function sendPlanExpiredEmail(params: {
  to: string;
  userName: string;
  tier: string;
}): Promise<{ success: boolean; error?: string }> {
  const { to, userName, tier } = params;
  const upgradeUrl = `${FRONTEND_URL}/app/upgrade`;
  const tierName = tier.charAt(0).toUpperCase() + tier.slice(1);

  const contentHtml = `
    <h2 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 700; color: #1F2937;">Your ${tierName} Membership Has Expired</h2>
    <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #4B5563;">
      Hello <strong>${userName}</strong>,
    </p>
    <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #4B5563;">
      Your <strong>${tierName} Membership</strong> on YFJ Matrimony has expired, and your account has been transitioned to the Free tier.
    </p>

    <!-- Expiration Notice Box -->
    <div style="background-color: #FEF2F2; border: 1px solid #FECACA; border-radius: 14px; padding: 18px 20px; margin: 20px 0;">
      <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #991B1B;">What changes on the Free Plan:</h3>
      <ul style="margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.8; color: #7F1D1D;">
        <li>Direct messaging is paused until renewal</li>
        <li>Contact number viewing is limited</li>
        <li>Standard search visibility</li>
      </ul>
    </div>

    <p style="margin: 16px 0 0 0; font-size: 14px; line-height: 1.6; color: #4B5563;">
      Renew today to immediately restore all your premium features, contacts, and messaging capabilities.
    </p>
  `;

  const html = renderEmailLayout({
    previewText: `Your YFJ Matrimony ${tierName} plan has expired. Upgrade or renew to restore premium features.`,
    contentHtml,
    ctaText: "Upgrade / Renew Plan",
    ctaUrl: upgradeUrl,
    footerNote: "Your profile and match history remain safe. Simply renew to resume chatting.",
  });

  return sendMailHelper({
    to,
    subject: `Your YFJ Matrimony ${tierName} plan has expired — Renew to keep connecting`,
    text: `Hello ${userName},\n\nYour ${tierName} membership on YFJ Matrimony has expired and your account is currently on the Free plan.\n\nRenew your plan to resume messaging and unlocking contacts: ${upgradeUrl}\n\nBest regards,\nYFJ Matrimony Team`,
    html,
  });
}
