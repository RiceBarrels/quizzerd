import * as React from 'react';

interface ExamInvitationEmailProps {
    studentName?: string;
    examName: string;
    courseName: string;
    teacherName: string;
    examUrl: string;
    dueDate?: string;
    description?: string;
}

export function ExamInvitationEmail({
    studentName,
    examName,
    courseName,
    teacherName,
    examUrl,
    dueDate,
    description,
}: ExamInvitationEmailProps) {
    return (
        <div style={{
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
            maxWidth: '600px',
            margin: '0 auto',
            padding: '20px',
            backgroundColor: '#ffffff',
        }}>
            {/* Header */}
            <div style={{
                backgroundColor: '#18181b',
                padding: '24px',
                borderRadius: '8px 8px 0 0',
                textAlign: 'center' as const,
            }}>
                <h1 style={{
                    color: '#ffffff',
                    fontSize: '24px',
                    margin: 0,
                    fontWeight: 600,
                }}>
                    Test Tracker
                </h1>
            </div>

            {/* Content */}
            <div style={{
                backgroundColor: '#f4f4f5',
                padding: '32px 24px',
                borderRadius: '0 0 8px 8px',
            }}>
                <h2 style={{
                    color: '#18181b',
                    fontSize: '20px',
                    marginTop: 0,
                    marginBottom: '16px',
                }}>
                    {studentName ? `Hi ${studentName},` : 'Hello,'}
                </h2>

                <p style={{
                    color: '#3f3f46',
                    fontSize: '16px',
                    lineHeight: '24px',
                    margin: '0 0 16px 0',
                }}>
                    You have been assigned a new exam in <strong>{courseName}</strong>.
                </p>

                {/* Exam Card */}
                <div style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e4e4e7',
                    borderRadius: '8px',
                    padding: '20px',
                    marginBottom: '24px',
                }}>
                    <h3 style={{
                        color: '#18181b',
                        fontSize: '18px',
                        margin: '0 0 8px 0',
                    }}>
                        {examName}
                    </h3>

                    <p style={{
                        color: '#71717a',
                        fontSize: '14px',
                        margin: '0 0 12px 0',
                    }}>
                        Assigned by {teacherName}
                    </p>

                    {description && (
                        <p style={{
                            color: '#3f3f46',
                            fontSize: '14px',
                            lineHeight: '20px',
                            margin: '0 0 12px 0',
                            padding: '12px',
                            backgroundColor: '#f4f4f5',
                            borderRadius: '4px',
                        }}>
                            {description}
                        </p>
                    )}

                    {dueDate && (
                        <p style={{
                            color: '#dc2626',
                            fontSize: '14px',
                            fontWeight: 500,
                            margin: 0,
                        }}>
                            Due: {dueDate}
                        </p>
                    )}
                </div>

                {/* CTA Button */}
                <div style={{ textAlign: 'center' as const, marginBottom: '24px' }}>
                    <a
                        href={examUrl}
                        style={{
                            display: 'inline-block',
                            backgroundColor: '#18181b',
                            color: '#ffffff',
                            fontSize: '16px',
                            fontWeight: 500,
                            textDecoration: 'none',
                            padding: '12px 32px',
                            borderRadius: '6px',
                        }}
                    >
                        Take Exam
                    </a>
                </div>

                <p style={{
                    color: '#71717a',
                    fontSize: '14px',
                    lineHeight: '20px',
                    margin: 0,
                    textAlign: 'center' as const,
                }}>
                    If you don't have an account yet, you'll be prompted to sign up when you click the button above.
                </p>
            </div>

            {/* Footer */}
            <div style={{
                padding: '24px',
                textAlign: 'center' as const,
            }}>
                <p style={{
                    color: '#a1a1aa',
                    fontSize: '12px',
                    margin: 0,
                }}>
                    This email was sent by Test Tracker on behalf of your instructor.
                    <br />
                    If you believe this was sent in error, please contact your instructor.
                </p>
            </div>
        </div>
    );
}

// Generate HTML version for non-React email clients
export function generateExamInvitationHtml(props: ExamInvitationEmailProps): string {
    const { studentName, examName, courseName, teacherName, examUrl, dueDate, description } = props;

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Exam Invitation - ${examName}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #f4f4f5;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <div style="background-color: #18181b; padding: 24px; text-align: center;">
            <h1 style="color: #ffffff; font-size: 24px; margin: 0; font-weight: 600;">Test Tracker</h1>
        </div>
        <div style="padding: 32px 24px;">
            <h2 style="color: #18181b; font-size: 20px; margin: 0 0 16px 0;">${studentName ? `Hi ${studentName},` : 'Hello,'}</h2>
            <p style="color: #3f3f46; font-size: 16px; line-height: 24px; margin: 0 0 16px 0;">
                You have been assigned a new exam in <strong>${courseName}</strong>.
            </p>
            <div style="background-color: #f4f4f5; border: 1px solid #e4e4e7; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                <h3 style="color: #18181b; font-size: 18px; margin: 0 0 8px 0;">${examName}</h3>
                <p style="color: #71717a; font-size: 14px; margin: 0 0 12px 0;">Assigned by ${teacherName}</p>
                ${description ? `<p style="color: #3f3f46; font-size: 14px; line-height: 20px; margin: 0 0 12px 0; padding: 12px; background-color: #ffffff; border-radius: 4px;">${description}</p>` : ''}
                ${dueDate ? `<p style="color: #dc2626; font-size: 14px; font-weight: 500; margin: 0;">Due: ${dueDate}</p>` : ''}
            </div>
            <div style="text-align: center; margin-bottom: 24px;">
                <a href="${examUrl}" style="display: inline-block; background-color: #18181b; color: #ffffff; font-size: 16px; font-weight: 500; text-decoration: none; padding: 12px 32px; border-radius: 6px;">Take Exam</a>
            </div>
            <p style="color: #71717a; font-size: 14px; line-height: 20px; margin: 0; text-align: center;">
                If you don't have an account yet, you'll be prompted to sign up when you click the button above.
            </p>
        </div>
        <div style="padding: 24px; text-align: center; border-top: 1px solid #e4e4e7;">
            <p style="color: #a1a1aa; font-size: 12px; margin: 0;">
                This email was sent by Test Tracker on behalf of your instructor.<br>
                If you believe this was sent in error, please contact your instructor.
            </p>
        </div>
    </div>
</body>
</html>
    `.trim();
}
