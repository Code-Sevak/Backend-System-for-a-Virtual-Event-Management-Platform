const nodemailer = require('nodemailer');

    let transporter;
    async function initMailer() {   
        try {
            const testAccount = await nodemailer.createTestAccount();
            transporter = nodemailer.createTransport({
                host: testAccount.smtp.host,
                port: testAccount.smtp.port,
                secure: testAccount.smtp.secure,
                auth: {
                    user: testAccount.user,
                    pass: testAccount.pass
                }
            });
            console.log('Nodemailer initialized with Ethereal test account');
        } catch (err) {
            console.error('Failed to create test email account', err);
        }
    };


// Utility: send email and return preview URL when using Ethereal
async function sendEmail({ to, subject, text, html }) {
    // Mailer (Ethereal test account). Initialized on startup.
await initMailer();
    if (!transporter) {
        console.warn('Transporter not ready, skipping sending email');
        return null;
    }
    const info = await transporter.sendMail({
        from: 'no-reply@virtual-events.local',
        to,
        subject,
        text,
        html
    });
    const preview = nodemailer.getTestMessageUrl(info);
    return { info, preview };
}
module.exports = { sendEmail };