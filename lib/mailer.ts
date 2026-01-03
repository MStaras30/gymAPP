import nodemailer from "nodemailer";

export const mailer = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 465),
  secure: Number(process.env.SMTP_PORT || 465) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendVerificationCode(to: string, code: string) {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER!;
  await mailer.sendMail({
    from,
    to,
    subject: "MSTARAS.LT Gym Log patvirtinimo kodas",
    text: `Tavo patvirtinimo kodas: ${code}\n\nKodas galioja 10 minučių.`,
  });
}
export async function sendPasswordResetCode(to: string, code: string) {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER!;
  await mailer.sendMail({
    from,
    to,
    subject: "MSTARAS.LT Gym Log slaptažodžio atstatymo kodas",
    text: `Slaptažodžio atstatymo kodas: ${code}\n\nKodas galioja 10 minučių.`,
  });
}