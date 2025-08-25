import { Resend } from 'resend';
import twilio from 'twilio';

function getTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    throw new Error(
      'Twilio credentials not found. Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN environment variables.'
    );
  }

  // Validate Account SID format - must start with 'AC'
  if (!accountSid.startsWith('AC')) {
    console.error('Invalid Twilio Account SID format:', {
      accountSid: accountSid.substring(0, 5) + '***', // Log first 5 chars only for security
      expectedFormat: 'AC...',
    });
    throw new Error(
      `Invalid TWILIO_ACCOUNT_SID format. Account SID must start with 'AC' but got '${accountSid.substring(0, 2)}***'. Please check your Twilio console for the correct Account SID.`
    );
  }

  return twilio(accountSid, authToken);
}

export interface SMSMessage {
  to: string;
  body: string;
}

export async function sendSMS({ to, body }: SMSMessage) {
  try {
    const client = getTwilioClient();
    const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!twilioPhoneNumber) {
      throw new Error('TWILIO_PHONE_NUMBER environment variable is required');
    }

    if (!to || to.trim() === '') {
      throw new Error('Phone number is required but was empty or null');
    }

    // Ensure phone number is in E.164 format
    let formattedTo = to;

    // Remove all non-digit characters except + at the beginning
    const cleanNumber = to.replace(/[^\d+]/g, '');

    if (cleanNumber.startsWith('+')) {
      // Already has + prefix, use as-is
      formattedTo = cleanNumber;
    } else if (cleanNumber.length === 11 && cleanNumber.startsWith('1')) {
      // US number with country code but no + (e.g., 15105551234)
      formattedTo = `+${cleanNumber}`;
    } else if (cleanNumber.length === 10) {
      // US number without country code (e.g., 5105551234)
      formattedTo = `+1${cleanNumber}`;
    } else {
      // For other formats, just add + if missing
      formattedTo = cleanNumber.startsWith('+')
        ? cleanNumber
        : `+${cleanNumber}`;
    }

    console.log(`📞 Phone number formatting: "${to}" → "${formattedTo}"`);

    // Validate the formatted number meets E.164 requirements
    if (!formattedTo.match(/^\+[1-9]\d{1,14}$/)) {
      throw new Error(
        `Invalid phone number format after formatting: "${formattedTo}". Expected E.164 format (+1234567890).`
      );
    }

    const message = await client.messages.create({
      body,
      from: twilioPhoneNumber,
      to: formattedTo,
    });

    console.log(`SMS sent successfully: ${message.sid}`);
    return {
      success: true,
      messageId: message.sid,
      status: message.status,
    };
  } catch (error) {
    console.error('Failed to send SMS:', error);

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  try {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY environment variable is required');
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    const result = await resend.emails.send({
      from: 'StuffLibrary <notifications@stufflibrary.org>',
      to: [to],
      subject,
      html,
    });

    console.log(`Email sent successfully: ${result.data?.id}`);
    return {
      success: true,
      messageId: result.data?.id,
    };
  } catch (error) {
    console.error('Failed to send email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function sendBorrowRequestNotification({
  ownerName,
  ownerPhone,
  ownerEmail,
  borrowerName,
  itemName,
  approvalUrl,
}: {
  ownerName: string;
  ownerPhone?: string;
  ownerEmail?: string;
  borrowerName: string;
  itemName: string;
  approvalUrl: string;
}) {
  const results: {
    sms: { success: boolean; error: string; messageId?: string };
    email: { success: boolean; error: string; messageId?: string };
  } = {
    sms: { success: false, error: 'SMS not attempted' },
    email: { success: false, error: 'Email not attempted' },
  };

  // Try SMS first if phone number is provided
  if (ownerPhone) {
    const smsMessage = `📱 Stuff Library: ${borrowerName} wants to borrow your "${itemName}". View their video request and respond here: ${approvalUrl}`;

    const smsResult = await sendSMS({
      to: ownerPhone,
      body: smsMessage,
    });

    results.sms = {
      success: smsResult.success,
      error: smsResult.error || '',
      ...(smsResult.messageId && { messageId: smsResult.messageId }),
    };

    console.log('📱 SMS result:', results.sms);
  }

  // Send email as primary or backup notification
  if (ownerEmail) {
    const emailSubject = `${borrowerName} wants to borrow your "${itemName}"`;
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; font-size: 28px; margin: 0;">StuffLibrary</h1>
          <p style="color: #6b7280; font-size: 16px; margin: 5px 0 0 0;">Share more, buy less</p>
        </div>
        
        <h2 style="color: #1f2937; font-size: 24px; margin-bottom: 20px;">
          New Borrow Request! 📱
        </h2>
        
        <p style="font-size: 16px; line-height: 1.5; color: #374151; margin-bottom: 20px;">
          Hi ${ownerName},
        </p>
        
        <p style="font-size: 16px; line-height: 1.5; color: #374151; margin-bottom: 20px;">
          <strong>${borrowerName}</strong> would like to borrow your <strong>"${itemName}"</strong>. 
          They've sent you a video request explaining what they need it for and when they'll return it.
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${approvalUrl}" 
             style="background-color: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block;">
            View Video Request & Respond
          </a>
        </div>
        
        <p style="font-size: 14px; color: #6b7280; margin-bottom: 10px;">
          You can approve or decline this request after viewing their video message.
        </p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;">
        
        <p style="font-size: 12px; color: #9ca3af; text-align: center;">
          StuffLibrary - Building sharing communities, one neighborhood at a time.<br>
          This notification was sent because someone requested to borrow your item.
        </p>
      </div>
    `;

    const emailResult = await sendEmail({
      to: ownerEmail,
      subject: emailSubject,
      html: emailHtml,
    });

    results.email = {
      success: emailResult.success,
      error: emailResult.error || '',
      ...(emailResult.messageId && { messageId: emailResult.messageId }),
    };

    console.log('📧 Email result:', results.email);
  }

  // Return success if either SMS or email succeeded
  const overallSuccess = results.sms.success || results.email.success;
  const primaryResult = results.sms.success ? results.sms : results.email;

  return {
    success: overallSuccess,
    sms: results.sms,
    email: results.email,
    error: overallSuccess ? undefined : 'Both SMS and email failed',
    messageId:
      'messageId' in primaryResult ? primaryResult.messageId : undefined,
  };
}

export async function sendBorrowResponseNotification({
  _borrowerName,
  borrowerPhone,
  ownerName,
  itemName,
  approved,
  message,
}: {
  _borrowerName: string;
  borrowerPhone: string;
  ownerName: string;
  itemName: string;
  approved: boolean;
  message: string;
}) {
  const status = approved ? '✅ Approved' : '❌ Declined';
  const smsMessage = `📱 Stuff Library: ${status} - ${ownerName} responded to your "${itemName}" request: "${message}"`;

  return await sendSMS({
    to: borrowerPhone,
    body: smsMessage,
  });
}

export async function sendDueDateReminder({
  _borrowerName,
  borrowerPhone,
  itemName,
  dueDate,
  ownerName,
}: {
  _borrowerName: string;
  borrowerPhone: string;
  itemName: string;
  dueDate: Date;
  ownerName: string;
}) {
  const dueDateStr = dueDate.toLocaleDateString();
  const message = `📱 Stuff Library: Reminder - "${itemName}" borrowed from ${ownerName} is due back on ${dueDateStr}. Thanks for being a great community member!`;

  return await sendSMS({
    to: borrowerPhone,
    body: message,
  });
}
