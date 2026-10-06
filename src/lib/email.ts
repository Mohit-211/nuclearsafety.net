import 'server-only';
import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '@/lib/env';

/*
 * Outgoing email via SMTP. When SMTP_HOST is not configured (local development)
 * messages — including their links — are printed to the server console instead.
 */

let transporter: Transporter | null | undefined;

function getTransporter(): Transporter | null {
  if (transporter !== undefined) return transporter;
  const e = env();
  transporter = e.SMTP_HOST
    ? nodemailer.createTransport({
      host: e.SMTP_HOST,
      port: e.SMTP_PORT,
      secure: e.SMTP_SECURE,
      auth: e.SMTP_USER ? { user: e.SMTP_USER, pass: e.SMTP_PASSWORD } : undefined,
    })
    : null;
  return transporter;
}

export async function sendEmail(message: { to: string; subject: string; text: string }) {
  const t = getTransporter();
  if (!t) {
    console.info(`[email:console] To: ${message.to}\nSubject: ${message.subject}\n\n${message.text}\n`);
    return;
  }
  try {
    await t.sendMail({ from: env().SMTP_FROM, ...message });
  } catch (err) {
    // Never surface SMTP details to end users; log for operators.
    console.error('[email] send failed', { to: message.to, subject: message.subject, err });
    throw new Error('Email could not be sent.');
  }
}

export function absoluteUrl(path: string) {
  return new URL(path, env().APP_URL).toString();
}

export function passwordLinkEmail(kind: 'reset' | 'invite', name: string, link: string, hours: number) {
  const app = env().APP_NAME;
  return kind === 'invite'
    ? {
      subject: `Your ${app} training account`,
      text: `Hello ${name},\n\nAn account has been created for you on ${app}.\nSet your password to get started:\n\n${link}\n\nThis link expires in ${hours} hours. If it expires, use "Forgot password" on the sign-in page.\n`,
    }
    : {
      subject: `Reset your ${app} password`,
      text: `Hello ${name},\n\nWe received a request to reset your ${app} password.\nChoose a new password here:\n\n${link}\n\nThis link expires in ${hours} hours. If you did not request this, you can ignore this email.\n`,
    };
}
