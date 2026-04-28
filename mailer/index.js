import express from 'express'
import nodemailer from 'nodemailer'

const app = express()
app.use(express.json())

const port = Number(process.env.MAILER_PORT || 4000)
const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@inferx.local'
const productName = process.env.MAILER_PRODUCT_NAME || 'InferX-ML'

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true',
    auth: process.env.SMTP_USER
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        }
        : undefined,
})

function renderTemplate(type, payload = {}) {
    const expires = payload.expiresInMinutes || 10
    if (type === 'verification') {
        return {
            subject: `Verify your ${productName} account`,
            html: `
                <div style="font-family: Inter, Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #111827;">
                    <h2 style="margin-bottom: 12px;">Verify your email</h2>
                    <p style="margin-bottom: 20px;">Hi ${payload.username || 'there'}, use this one-time code to verify your account.</p>
                    <div style="font-size: 32px; font-weight: 700; letter-spacing: 8px; padding: 18px 24px; background: #f3f4f6; border-radius: 12px; text-align: center; margin-bottom: 20px;">${payload.otp}</div>
                    <p style="margin-bottom: 8px;">This code expires in ${expires} minutes.</p>
                    <p style="color: #6b7280; font-size: 14px;">If you did not request this, you can safely ignore this email.</p>
                </div>
            `,
        }
    }

    if (type === 'password_reset') {
        return {
            subject: `Reset your ${productName} password`,
            html: `
                <div style="font-family: Inter, Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #111827;">
                    <h2 style="margin-bottom: 12px;">Reset your password</h2>
                    <p style="margin-bottom: 20px;">Hi ${payload.username || 'there'}, use this one-time code to reset your password.</p>
                    <div style="font-size: 32px; font-weight: 700; letter-spacing: 8px; padding: 18px 24px; background: #f3f4f6; border-radius: 12px; text-align: center; margin-bottom: 20px;">${payload.otp}</div>
                    <p style="margin-bottom: 8px;">This code expires in ${expires} minutes.</p>
                    <p style="color: #6b7280; font-size: 14px;">If you did not request this, reset your password from the app and review your account activity.</p>
                </div>
            `,
        }
    }

    throw new Error('Unsupported email template')
}

app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'inferx-mailer' })
})

app.post('/send', async (req, res) => {
    const { type, to, payload } = req.body || {}
    if (!type || !to) {
        return res.status(400).json({ error: 'type and to are required' })
    }

    try {
        const template = renderTemplate(type, payload)
        await transporter.sendMail({
            from: fromEmail,
            to,
            subject: template.subject,
            html: template.html,
        })
        return res.json({ message: 'sent' })
    } catch (error) {
        console.error('Mailer send failed', error)
        return res.status(502).json({ error: 'send_failed' })
    }
})

app.listen(port, '0.0.0.0', () => {
    console.log(`InferX mailer listening on ${port}`)
})
