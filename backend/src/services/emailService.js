const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

const createTransport = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

const sendEmail = async ({ to, subject, html }) => {
  const transporter = createTransport();
  const mailOptions = {
    from: `MedCare 360 <${process.env.EMAIL_FROM}>`,
    to,
    subject,
    html
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    logger.info(`Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (err) {
    logger.error(`Email sending failed to ${to}: ${err.message}`);
    throw err;
  }
};

exports.sendPasswordReset = async (email, name, resetUrl) => {
  await sendEmail({
    to: email,
    subject: 'MedCare 360 - Password Reset Request',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1976d2; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">MedCare 360</h1>
        </div>
        <div style="padding: 30px; background: #f5f5f5;">
          <h2>Password Reset Request</h2>
          <p>Dear ${name},</p>
          <p>You requested a password reset. Click the button below to reset your password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background: #1976d2; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-size: 16px;">Reset Password</a>
          </div>
          <p>This link expires in 10 minutes.</p>
          <p>If you did not request this, please ignore this email.</p>
        </div>
        <div style="padding: 20px; text-align: center; color: #666;">
          <p>© 2024 MedCare 360. All rights reserved.</p>
        </div>
      </div>
    `
  });
};

exports.sendAppointmentConfirmation = async (appointment) => {
  const patientEmail = appointment.patient?.user?.email;
  if (!patientEmail) return;

  const patientName = `${appointment.patient?.user?.firstName} ${appointment.patient?.user?.lastName}`;
  const doctorName = `Dr. ${appointment.doctor?.user?.firstName} ${appointment.doctor?.user?.lastName}`;
  const date = new Date(appointment.appointmentDate).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  await sendEmail({
    to: patientEmail,
    subject: 'MedCare 360 - Appointment Confirmation',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1976d2; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">MedCare 360</h1>
        </div>
        <div style="padding: 30px; background: #f5f5f5;">
          <h2 style="color: #4caf50;">Appointment Confirmed</h2>
          <p>Dear ${patientName},</p>
          <p>Your appointment has been confirmed:</p>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Appointment ID</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${appointment.appointmentId}</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Doctor</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${doctorName}</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Date</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${date}</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Time</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${appointment.appointmentTime}</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Type</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${appointment.type}</td></tr>
          </table>
          <p>Please arrive 15 minutes before your scheduled time.</p>
        </div>
        <div style="padding: 20px; text-align: center; color: #666;">
          <p>© 2024 MedCare 360. All rights reserved.</p>
        </div>
      </div>
    `
  });
};
