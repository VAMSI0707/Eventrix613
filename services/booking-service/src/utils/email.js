const nodemailer = require('nodemailer');
const QRCode = require('qrcode');

const buildQrCode = async (booking) => {
  const qrPayload = {
    bookingReference: booking.bookingReference,
    eventId: booking.eventId,
    eventTitle: booking.eventTitle,
    eventDate: booking.eventDate,
    userEmail: booking.userEmail
  };
  return QRCode.toDataURL(JSON.stringify(qrPayload));
};

const createTransporter = () => {
  const smtpHost = process.env.SMTP_HOST || 'sandbox.smtp.mailtrap.io';
  const smtpPort = parseInt(process.env.SMTP_PORT || '2525', 10);
  const smtpUser = process.env.SMTP_USER || '';
  const smtpPass = process.env.SMTP_PASS || '';

  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    auth: smtpUser && smtpPass ? { user: smtpUser, pass: smtpPass } : undefined
  });
};

const sendEmail = async (options) => {
  try {
    const smtpUser = process.env.SMTP_USER || '';
    const smtpPass = process.env.SMTP_PASS || '';
    
    if (!smtpUser || !smtpPass) {
      console.warn('SMTP credentials are not configured. Email not sent.');
      return;
    }
    
    const transporter = createTransporter();
    await transporter.sendMail(options);
  } catch (err) {
    console.error('Email send failed:', err.message);
  }
};

const sendBookingEmail = async (booking, event) => {
  const qrImage = await buildQrCode(booking);
  const eventDate = new Date(booking.eventDate).toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  const eventTime = booking.eventTime || 'TBA';
  const mailFrom = process.env.MAIL_FROM || 'no-reply@eventrix.local';

  const mailOptions = {
    from: mailFrom,
    to: booking.userEmail,
    subject: `Your Eventrix Tickets - ${booking.eventTitle}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Arial, sans-serif; background-image: url('https://umd.edu/sites/default/files/styles/optimized/public/2021-09/aerial-view-of-mckeldin-mall.jpg'); background-size: cover; background-position: center; background-attachment: fixed;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: rgba(255, 255, 255, 0.95); padding: 20px 0;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.2);">
                
                <!-- Header with UMD red -->
                <tr>
                  <td style="background-color: #E03A3E; padding: 40px 30px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: bold; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);">
                      Booking Confirmed!
                    </h1>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <p style="margin: 0 0 20px; font-size: 18px; color: #333333;">
                      Hi <strong style="color: #E03A3E;">${booking.userName}</strong>,
                    </p>
                    
                    <p style="margin: 0 0 30px; font-size: 16px; color: #666666; line-height: 1.6;">
                      Great news! Your booking for <strong style="color: #E03A3E;">${booking.eventTitle}</strong> has been confirmed.
                    </p>
                    
                    <!-- Booking Reference Box -->
                    <div style="background-color: #FFF9E6; border-left: 4px solid #FFD520; padding: 20px; margin-bottom: 30px; border-radius: 4px;">
                      <p style="margin: 0; font-size: 14px; color: #666666; text-transform: uppercase; letter-spacing: 1px;">
                        Booking Reference
                      </p>
                      <p style="margin: 5px 0 0; font-size: 24px; color: #E03A3E; font-weight: bold; letter-spacing: 2px;">
                        ${booking.bookingReference}
                      </p>
                    </div>
                    
                    <!-- Event Details -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                      <tr>
                        <td style="padding: 15px; background-color: #f9f9f9; border-radius: 4px;">
                          <table width="100%" cellpadding="8" cellspacing="0">
                            <tr>
                              <td style="color: #666666; font-size: 14px; padding: 8px 0;">
                                <strong style="color: #333333;">Date:</strong>
                              </td>
                              <td style="color: #333333; font-size: 14px; text-align: right; padding: 8px 0;">
                                ${eventDate}
                              </td>
                            </tr>
                            <tr>
                              <td style="color: #666666; font-size: 14px; padding: 8px 0; border-top: 1px solid #e0e0e0;">
                                <strong style="color: #333333;">Time:</strong>
                              </td>
                              <td style="color: #333333; font-size: 14px; text-align: right; padding: 8px 0; border-top: 1px solid #e0e0e0;">
                                ${eventTime}
                              </td>
                            </tr>
                            <tr>
                              <td style="color: #666666; font-size: 14px; padding: 8px 0; border-top: 1px solid #e0e0e0;">
                                <strong style="color: #333333;">Venue:</strong>
                              </td>
                              <td style="color: #333333; font-size: 14px; text-align: right; padding: 8px 0; border-top: 1px solid #e0e0e0;">
                                ${booking.eventVenue}
                              </td>
                            </tr>
                            <tr>
                              <td style="color: #666666; font-size: 14px; padding: 8px 0; border-top: 1px solid #e0e0e0;">
                                <strong style="color: #333333;">Tickets:</strong>
                              </td>
                              <td style="color: #333333; font-size: 14px; text-align: right; padding: 8px 0; border-top: 1px solid #e0e0e0;">
                                ${booking.numberOfTickets}
                              </td>
                            </tr>
                            <tr>
                              <td style="color: #666666; font-size: 14px; padding: 8px 0; border-top: 2px solid #E03A3E;">
                                <strong style="color: #E03A3E;">Total Amount:</strong>
                              </td>
                              <td style="color: #E03A3E; font-size: 18px; font-weight: bold; text-align: right; padding: 8px 0; border-top: 2px solid #E03A3E;">
                                $${booking.totalAmount}
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- QR Code Section -->
                    <div style="text-align: center; padding: 30px; background: linear-gradient(135deg, #1a1a1a 0%, #333333 100%); border-radius: 8px; margin-bottom: 30px;">
                      <p style="margin: 0 0 20px; color: #FFD520; font-size: 16px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">
                        Your Entry Pass
                      </p>
                      <div style="background-color: #ffffff; display: inline-block; padding: 20px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
                        <img src="cid:qrcode" alt="QR Code" style="display: block; width: 200px; height: 200px;" />
                      </div>
                      <p style="margin: 20px 0 0; color: #ffffff; font-size: 14px; line-height: 1.6;">
                        Show this QR code at the entrance for check-in
                      </p>
                    </div>
                    
                    <p style="margin: 0; font-size: 14px; color: #999999; text-align: center; line-height: 1.6;">
                      Thank you for choosing Eventrix!<br>
                      We look forward to seeing you at the event.
                    </p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background-color: #1a1a1a; padding: 30px; text-align: center;">
                    <p style="margin: 0; color: #FFD520; font-size: 20px; font-weight: bold;">
                      EVENTRIX
                    </p>
                    <p style="margin: 10px 0 0; color: #999999; font-size: 12px;">
                      Your premier event management platform
                    </p>
                  </td>
                </tr>
                
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
    attachments: [
      {
        filename: 'ticket-qr.png',
        path: qrImage,
        cid: 'qrcode'
      }
    ]
  };

  await sendEmail(mailOptions);
};

const sendWaitlistEmail = async (booking, event) => {
  const mailFrom = process.env.MAIL_FROM || 'no-reply@eventrix.local';
  const eventDate = new Date(booking.eventDate).toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  const eventTime = booking.eventTime || 'TBA';
  
  const mailOptions = {
    from: mailFrom,
    to: booking.userEmail,
    subject: `Waitlist Confirmation - ${booking.eventTitle}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Arial, sans-serif; background-image: url('https://umd.edu/sites/default/files/styles/optimized/public/2021-09/aerial-view-of-mckeldin-mall.jpg'); background-size: cover; background-position: center; background-attachment: fixed;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: rgba(255, 255, 255, 0.95); padding: 20px 0;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.2);">
                
                <!-- Header -->
                <tr>
                  <td style="background-color: #FFD520; padding: 40px 30px; text-align: center;">
                    <h1 style="margin: 0; color: #1a1a1a; font-size: 32px; font-weight: bold; text-shadow: 2px 2px 4px rgba(255,255,255,0.3);">
                      You're on the Waitlist
                    </h1>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <p style="margin: 0 0 20px; font-size: 18px; color: #333333;">
                      Hi <strong style="color: #E03A3E;">${booking.userName}</strong>,
                    </p>
                    
                    <p style="margin: 0 0 30px; font-size: 16px; color: #666666; line-height: 1.6;">
                      The event <strong style="color: #E03A3E;">${booking.eventTitle}</strong> is currently at full capacity. We've added you to the waitlist and will automatically notify you if seats become available.
                    </p>
                    
                    <!-- Waitlist Reference Box -->
                    <div style="background-color: #FFF9E6; border-left: 4px solid #FFD520; padding: 20px; margin-bottom: 30px; border-radius: 4px;">
                      <p style="margin: 0; font-size: 14px; color: #666666; text-transform: uppercase; letter-spacing: 1px;">
                        Waitlist Reference
                      </p>
                      <p style="margin: 5px 0 0; font-size: 24px; color: #E03A3E; font-weight: bold; letter-spacing: 2px;">
                        ${booking.bookingReference}
                      </p>
                    </div>
                    
                    <!-- Event Details -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                      <tr>
                        <td style="padding: 15px; background-color: #f9f9f9; border-radius: 4px;">
                          <table width="100%" cellpadding="8" cellspacing="0">
                            <tr>
                              <td style="color: #666666; font-size: 14px; padding: 8px 0;">
                                <strong style="color: #333333;">Date:</strong>
                              </td>
                              <td style="color: #333333; font-size: 14px; text-align: right; padding: 8px 0;">
                                ${eventDate}
                              </td>
                            </tr>
                            <tr>
                              <td style="color: #666666; font-size: 14px; padding: 8px 0; border-top: 1px solid #e0e0e0;">
                                <strong style="color: #333333;">Time:</strong>
                              </td>
                              <td style="color: #333333; font-size: 14px; text-align: right; padding: 8px 0; border-top: 1px solid #e0e0e0;">
                                ${eventTime}
                              </td>
                            </tr>
                            <tr>
                              <td style="color: #666666; font-size: 14px; padding: 8px 0; border-top: 1px solid #e0e0e0;">
                                <strong style="color: #333333;">Venue:</strong>
                              </td>
                              <td style="color: #333333; font-size: 14px; text-align: right; padding: 8px 0; border-top: 1px solid #e0e0e0;">
                                ${booking.eventVenue}
                              </td>
                            </tr>
                            <tr>
                              <td style="color: #666666; font-size: 14px; padding: 8px 0; border-top: 1px solid #e0e0e0;">
                                <strong style="color: #333333;">Requested Tickets:</strong>
                              </td>
                              <td style="color: #333333; font-size: 14px; text-align: right; padding: 8px 0; border-top: 1px solid #e0e0e0;">
                                ${booking.numberOfTickets}
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                    
                    <div style="background-color: #FFF3CD; border: 1px solid #FFD520; border-radius: 4px; padding: 20px; margin-bottom: 20px;">
                      <p style="margin: 0; color: #856404; font-size: 14px; line-height: 1.6;">
                        <strong>What happens next?</strong><br>
                        If a spot opens up, we'll automatically confirm your booking and send you a confirmation email with your tickets and QR code.
                      </p>
                    </div>
                    
                    <p style="margin: 0; font-size: 14px; color: #999999; text-align: center; line-height: 1.6;">
                      Thank you for your interest in this event!<br>
                      We'll keep you updated on your waitlist status.
                    </p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background-color: #1a1a1a; padding: 30px; text-align: center;">
                    <p style="margin: 0; color: #FFD520; font-size: 20px; font-weight: bold;">
                      EVENTRIX
                    </p>
                    <p style="margin: 10px 0 0; color: #999999; font-size: 12px;">
                      Your premier event management platform
                    </p>
                  </td>
                </tr>
                
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `
  };

  await sendEmail(mailOptions);
};

module.exports = {
  sendBookingEmail,
  sendWaitlistEmail
};



