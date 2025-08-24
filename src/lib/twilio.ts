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

export async function sendBorrowRequestNotification({
  _ownerName,
  ownerPhone,
  borrowerName,
  itemName,
  approvalUrl,
}: {
  _ownerName: string;
  ownerPhone: string;
  borrowerName: string;
  itemName: string;
  approvalUrl: string;
}) {
  const message = `📱 Stuff Library: ${borrowerName} wants to borrow your "${itemName}". View their video request and respond here: ${approvalUrl}`;

  return await sendSMS({
    to: ownerPhone,
    body: message,
  });
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
