import { Resend } from 'resend';

// Lazy initialization to avoid build-time errors
let resend: Resend | null = null;

function getResendClient(): Resend {
    if (!resend) {
        const apiKey = process.env.RESEND_API_KEY;
        if (!apiKey) {
            throw new Error('RESEND_API_KEY environment variable is not set');
        }
        resend = new Resend(apiKey);
    }
    return resend;
}

export interface SendEmailOptions {
    to: string | string[];
    subject: string;
    html?: string;
    react?: React.ReactElement;
    from?: string;
}

export async function sendEmail({ to, subject, html, react, from }: SendEmailOptions) {
    try {
        const client = getResendClient();
        const fromAddress = from || 'Test Tracker <noreply@resend.dev>';
        const toAddresses = Array.isArray(to) ? to : [to];

        let result;

        if (react) {
            result = await client.emails.send({
                from: fromAddress,
                to: toAddresses,
                subject,
                react,
            });
        } else if (html) {
            result = await client.emails.send({
                from: fromAddress,
                to: toAddresses,
                subject,
                html,
            });
        } else {
            throw new Error('Either react or html content is required');
        }

        if (result.error) {
            console.error('Resend error:', result.error);
            return { success: false, error: result.error };
        }

        return { success: true, data: result.data };
    } catch (error) {
        console.error('Failed to send email:', error);
        return { success: false, error };
    }
}

export async function sendBatchEmails(emails: SendEmailOptions[]) {
    const results = await Promise.allSettled(
        emails.map(email => sendEmail(email))
    );

    const succeeded = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.length - succeeded;

    return { succeeded, failed, total: results.length };
}

export { getResendClient };
