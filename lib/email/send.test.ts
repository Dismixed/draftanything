import { afterEach, describe, expect, it, vi } from "vitest";

const sendMail = vi.fn(async () => ({}));
vi.mock("nodemailer", () => ({ default: { createTransport: vi.fn(() => ({ sendMail })) } }));

import nodemailer from "nodemailer";
import { sendEmail } from "./send";

afterEach(() => vi.unstubAllEnvs());

describe("sendEmail", () => {
  it("bounds every SMTP wait so a hung Gmail connection cannot eat the cron's time", async () => {
    vi.stubEnv("SMTP_USER", "me@gmail.com");
    vi.stubEnv("SMTP_PASS", "app-password");
    await sendEmail({ to: ["a@x.com", "b@x.com"], subject: "s", html: "h", text: "t" });

    expect(nodemailer.createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: "smtp.gmail.com",
        connectionTimeout: 15_000,
        greetingTimeout: 15_000,
        socketTimeout: 15_000,
      }),
    );
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({ from: "me@gmail.com", to: "a@x.com, b@x.com" }));
  });
});
