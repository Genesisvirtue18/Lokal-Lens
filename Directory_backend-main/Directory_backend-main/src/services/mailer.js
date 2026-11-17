import nodemailer from 'nodemailer';

// Sends email through SMTP when SMTP_HOST is configured. In development without SMTP the message is logged,
// so password-reset links can still be copied from the server console.
export function createMailer(config) {
  const transport = config.SMTP_HOST
    ? nodemailer.createTransport({
      host: config.SMTP_HOST,
      port: config.SMTP_PORT || 587,
      secure: (config.SMTP_PORT || 587) === 465,
      auth: config.SMTP_USER ? { user: config.SMTP_USER, pass: config.SMTP_PASS } : undefined,
    })
    : null;
  return {
    async send({ to, subject, text, html }) {
      if (!transport) {
        if (config.NODE_ENV === 'production') throw new Error('Email is not configured');
        console.info(`[mail:dev] To: ${to}\nSubject: ${subject}\n${text}`);
        return { delivered: false };
      }
      await transport.sendMail({ from: config.EMAIL_FROM || config.SMTP_USER, to, subject, text, html });
      return { delivered: true };
    },
  };
}
