import "server-only";

import nodemailer from "nodemailer";

export interface EmailInput {
  to: string[];
  subject: string;
  html: string;
  text: string;
}

/** Gmail SMTP needs the account address and an app password (2FA required). */
export function isEmailConfigured(): boolean {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
}

/** Sends from SMTP_USER through Gmail. Node runtime only: nodemailer opens raw sockets. */
export async function sendEmail(input: EmailInput): Promise<void> {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) throw new Error("SMTP_USER and SMTP_PASS must be set");

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user, pass },
  });
  await transporter.sendMail({ from: user, ...input, to: input.to.join(", ") });
}
