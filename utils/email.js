const rateLimit = require('express-rate-limit');
const nodemailer = require('nodemailer');
const logger = require('./logger');

module.exports.emailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2,
  handler: (req, res) => {
    const retryAfter = req.rateLimit ? Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000) : null;
    
    logger.event('Email verification rate limit hit', `IP: ${req.ip} | Email: ${req.body.email || '???'}`);
    
    res.status(429).render("auth/emailLimiting", {
      title: "Slow down",
      retryAfter
    });
  }
});

module.exports.sendRecoveryPasswordEmail = async (userEmail, userId, userName, token) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const recoverLink = `${process.env.BASEURL}/users/recover/${userId}/${userEmail}/${token}`

    const mailOptions = {
      from: `"afbc04 - Blog" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: 'Recovery of Account',
      html: `
        <div style="font-family: Arial, sans-serif; background-color: #f4f6f8; padding: 20px;">
          <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 8px; padding: 30px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
            
            <h2 style="color: #333;">Recover of account</h2>
     
            <p style="color: #555; font-size: 15px;">
              Hello <span style="color: #008080; font-weight: bold;">${userName}</span>,
              <br><br>
              To recover your account, use the link below:
            </p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${recoverLink}" 
                style="background-color: #008080; color: #ffffff; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                Recover account
              </a>
            </div>

            <p style="color: #555; font-size: 14px;">
              If the button doesn’t work, you can also copy and paste this link into your browser:
            </p>

            <p style="word-break: break-all; font-size: 13px; color: #1a73e8;">
              ${recoverLink}
            </p>

            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;" />

            <p style="color: #888; font-size: 12px;">
              — afbc04
            </p>

          </div>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    logger.event(`Recovery email sent ${info}`)

    return true;
  } catch (err) {
    logger.error('Failed to send verification email', err);
    throw err;
  }
};

module.exports.sendApprovalAccountEmail = async (userEmail,userName, userID) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const loginLink = `${process.env.BASEURL}/auth/login?username=${userID}&message=approvedAccount`

    const mailOptions = {
      from: `"afbc04 - Blog" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: 'Welcome to Blog!',
      html: `
        <div style="font-family: Arial, sans-serif; background-color: #f4f6f8; padding: 20px;">
          <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 8px; padding: 30px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
            
            <h2 style="color: #333;">Welcome to Blog!</h2>
     
            <p style="color: #555; font-size: 15px;">
              Hello <span style="color: #008080; font-weight: bold;">${userName}</span>,
              <br><br>
              Your account has been approved — welcome aboard! We're excited to have you join our community.
              <br><br>
              You can now start exploring the blog by clicking the button below.
            </p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${loginLink}" 
                style="background-color: #008080; color: #ffffff; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                Login
              </a>
            </div>

            <p style="color: #555; font-size: 14px;">
              If the button doesn’t work, you can also copy and paste this link into your browser:
            </p>

            <p style="word-break: break-all; font-size: 13px; color: #1a73e8;">
              ${loginLink}
            </p>

            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;" />

            <p style="color: #888; font-size: 12px;">
              If you did not create this account, you can safely ignore this email.
            </p>

            <p style="color: #888; font-size: 12px;">
              — afbc04
            </p>

          </div>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    logger.event(`Approval account email sent ${info}`)

    return true;
  } catch (err) {
    logger.error('Failed to send verification email', err);
    throw err;
  }
};