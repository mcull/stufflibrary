/**
 * Email template system for StuffLibrary notifications
 * Professional, responsive HTML emails with consistent branding
 */

interface BaseTemplateProps {
  recipientName: string;
  siteUrl?: string;
}

interface BorrowRequestReceivedProps extends BaseTemplateProps {
  borrowerName: string;
  borrowerImage?: string;
  itemName: string;
  itemImage?: string;
  videoThumbnail?: string;
  requestMessage?: string;
  requestedReturnDate: string;
  approvalUrl: string;
}

interface BorrowRequestApprovedProps extends BaseTemplateProps {
  lenderName: string;
  itemName: string;
  itemImage?: string;
  lenderMessage?: string;
  pickupDetails?: string;
  returnDate: string;
  contactInfo?: string;
}

interface BorrowRequestDeclinedProps extends BaseTemplateProps {
  lenderName: string;
  itemName: string;
  itemImage?: string;
  lenderMessage?: string;
  suggestedAlternatives?: string[];
}

interface ItemReturnedProps extends BaseTemplateProps {
  borrowerName: string;
  itemName: string;
  itemImage?: string;
  returnDate: string;
  borrowerNotes?: string;
  confirmReturnUrl?: string;
}

interface ReturnReminderProps extends BaseTemplateProps {
  itemName: string;
  itemImage?: string;
  lenderName: string;
  returnDate: string;
  contactInfo?: string;
}

// Base email template with consistent styling
function baseTemplate(content: string, title: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0; 
      padding: 0; 
      background-color: #f8fafc;
      line-height: 1.6;
    }
    .container { 
      max-width: 600px; 
      margin: 0 auto; 
      background-color: white;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
      color: white;
      padding: 40px 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 700;
      letter-spacing: -0.5px;
    }
    .header p {
      margin: 8px 0 0 0;
      opacity: 0.9;
      font-size: 16px;
    }
    .content {
      padding: 40px 30px;
    }
    .item-card {
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
      background-color: #f9fafb;
    }
    .item-image {
      width: 80px;
      height: 80px;
      border-radius: 8px;
      object-fit: cover;
      margin-right: 16px;
      float: left;
    }
    .button {
      display: inline-block;
      background-color: #2563eb;
      color: white !important;
      padding: 16px 32px;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      margin: 20px 0;
      transition: background-color 0.2s;
    }
    .button:hover {
      background-color: #1d4ed8;
    }
    .button-secondary {
      background-color: #6b7280;
      color: white !important;
    }
    .button-secondary:hover {
      background-color: #4b5563;
    }
    .message-box {
      background-color: #fef3c7;
      border: 1px solid #f59e0b;
      border-radius: 8px;
      padding: 16px;
      margin: 20px 0;
    }
    .footer {
      background-color: #f9fafb;
      padding: 30px;
      text-align: center;
      color: #6b7280;
      font-size: 14px;
    }
    .footer a {
      color: #2563eb;
      text-decoration: none;
    }
    @media (max-width: 600px) {
      .container { margin: 0; border-radius: 0; }
      .content, .header, .footer { padding: 30px 20px; }
    }
  </style>
</head>
<body>
  <div style="padding: 20px 0;">
    <div class="container">
      <div class="header">
        <h1>StuffLibrary</h1>
        <p>Share more, buy less</p>
      </div>
      <div class="content">
        ${content}
      </div>
      <div class="footer">
        <p>StuffLibrary - Building sharing communities, one neighborhood at a time.</p>
        <p>
          <a href="%UNSUBSCRIBE_URL%">Notification Preferences</a> | 
          <a href="mailto:support@stufflibrary.org">Support</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export const EmailTemplates = {
  borrowRequestReceived({
    recipientName,
    borrowerName,
    borrowerImage,
    itemName,
    itemImage,
    videoThumbnail,
    requestMessage,
    requestedReturnDate,
    approvalUrl,
  }: BorrowRequestReceivedProps) {
    const content = `
      <h2 style="color: #1f2937; margin-bottom: 20px;">New Borrow Request! 📱</h2>
      
      <p style="font-size: 16px; color: #374151;">Hi ${recipientName},</p>
      
      <p style="font-size: 16px; color: #374151;">
        <strong>${borrowerName}</strong> would like to borrow your <strong>"${itemName}"</strong>. 
        ${videoThumbnail ? "They've sent you a video request explaining what they need it for." : ""}
      </p>

      <div class="item-card">
        ${itemImage ? `<img src="${itemImage}" alt="${itemName}" class="item-image">` : ''}
        <h3 style="margin: 0 0 8px 0; color: #1f2937;">${itemName}</h3>
        <p style="margin: 0; color: #6b7280;">Requested by ${borrowerName}</p>
        <p style="margin: 8px 0 0 0; color: #6b7280;">Return by: ${requestedReturnDate}</p>
        <div style="clear: both;"></div>
      </div>

      ${requestMessage ? `
        <div class="message-box">
          <strong>Message from ${borrowerName}:</strong>
          <p style="margin: 8px 0 0 0;">"${requestMessage}"</p>
        </div>
      ` : ''}

      ${videoThumbnail ? `
        <div style="text-align: center; margin: 30px 0;">
          <p style="color: #6b7280; margin-bottom: 16px;">Video Request from ${borrowerName}</p>
          <img src="${videoThumbnail}" alt="Video thumbnail" style="max-width: 300px; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
        </div>
      ` : ''}

      <div style="text-align: center; margin: 40px 0;">
        <a href="${approvalUrl}" class="button">
          View Request & Respond
        </a>
      </div>

      <p style="font-size: 14px; color: #6b7280;">
        You can approve or decline this request after viewing all the details. 
        We'll notify ${borrowerName} of your decision.
      </p>
    `;

    return {
      subject: `${borrowerName} wants to borrow your "${itemName}"`,
      html: baseTemplate(content, 'New Borrow Request'),
    };
  },

  borrowRequestApproved({
    recipientName,
    lenderName,
    itemName,
    itemImage,
    lenderMessage,
    pickupDetails,
    returnDate,
    contactInfo,
  }: BorrowRequestApprovedProps) {
    const content = `
      <h2 style="color: #059669; margin-bottom: 20px;">Request Approved! 🎉</h2>
      
      <p style="font-size: 16px; color: #374151;">Hi ${recipientName},</p>
      
      <p style="font-size: 16px; color: #374151;">
        Great news! <strong>${lenderName}</strong> has approved your request to borrow 
        <strong>"${itemName}"</strong>.
      </p>

      <div class="item-card">
        ${itemImage ? `<img src="${itemImage}" alt="${itemName}" class="item-image">` : ''}
        <h3 style="margin: 0 0 8px 0; color: #1f2937;">${itemName}</h3>
        <p style="margin: 0; color: #6b7280;">Lent by ${lenderName}</p>
        <p style="margin: 8px 0 0 0; color: #059669; font-weight: 600;">✅ Approved</p>
        <div style="clear: both;"></div>
      </div>

      ${lenderMessage ? `
        <div class="message-box" style="background-color: #d1fae5; border-color: #10b981;">
          <strong>Message from ${lenderName}:</strong>
          <p style="margin: 8px 0 0 0;">"${lenderMessage}"</p>
        </div>
      ` : ''}

      <div style="background-color: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <h3 style="margin: 0 0 12px 0; color: #0c4a6e;">Next Steps:</h3>
        ${pickupDetails ? `<p><strong>Pickup:</strong> ${pickupDetails}</p>` : ''}
        <p><strong>Return by:</strong> ${returnDate}</p>
        ${contactInfo ? `<p><strong>Contact:</strong> ${contactInfo}</p>` : ''}
      </div>

      <p style="font-size: 14px; color: #6b7280;">
        Please be respectful of the return date and take good care of the item. 
        Happy borrowing! 🌟
      </p>
    `;

    return {
      subject: `✅ Your request for "${itemName}" has been approved!`,
      html: baseTemplate(content, 'Request Approved'),
    };
  },

  borrowRequestDeclined({
    recipientName,
    lenderName,
    itemName,
    itemImage,
    lenderMessage,
    suggestedAlternatives,
  }: BorrowRequestDeclinedProps) {
    const content = `
      <h2 style="color: #374151; margin-bottom: 20px;">Request Update</h2>
      
      <p style="font-size: 16px; color: #374151;">Hi ${recipientName},</p>
      
      <p style="font-size: 16px; color: #374151;">
        Thanks for your interest in borrowing <strong>"${itemName}"</strong> from ${lenderName}. 
        Unfortunately, they're not able to lend it at this time.
      </p>

      <div class="item-card">
        ${itemImage ? `<img src="${itemImage}" alt="${itemName}" class="item-image">` : ''}
        <h3 style="margin: 0 0 8px 0; color: #1f2937;">${itemName}</h3>
        <p style="margin: 0; color: #6b7280;">Owner: ${lenderName}</p>
        <p style="margin: 8px 0 0 0; color: #6b7280;">Not available this time</p>
        <div style="clear: both;"></div>
      </div>

      ${lenderMessage ? `
        <div class="message-box" style="background-color: #fef2f2; border-color: #ef4444;">
          <strong>Message from ${lenderName}:</strong>
          <p style="margin: 8px 0 0 0;">"${lenderMessage}"</p>
        </div>
      ` : ''}

      <p style="font-size: 16px; color: #374151;">
        Don't worry! There are other ways to find what you need:
      </p>

      <ul style="color: #374151;">
        <li>Browse other items in your local libraries</li>
        <li>Check back later - availability changes frequently</li>
        <li>Ask neighbors if they have similar items</li>
        ${suggestedAlternatives?.map(alt => `<li>${alt}</li>`).join('') || ''}
      </ul>

      <div style="text-align: center; margin: 30px 0;">
        <a href="/browse" class="button button-secondary">
          Browse Other Items
        </a>
      </div>

      <p style="font-size: 14px; color: #6b7280;">
        Keep sharing and building community! 🌟
      </p>
    `;

    return {
      subject: `Update on your request for "${itemName}"`,
      html: baseTemplate(content, 'Request Update'),
    };
  },

  itemReturned({
    recipientName,
    borrowerName,
    itemName,
    itemImage,
    returnDate,
    borrowerNotes,
    confirmReturnUrl,
  }: ItemReturnedProps) {
    const content = `
      <h2 style="color: #059669; margin-bottom: 20px;">Item Returned! 📦</h2>
      
      <p style="font-size: 16px; color: #374151;">Hi ${recipientName},</p>
      
      <p style="font-size: 16px; color: #374151;">
        Great news! <strong>${borrowerName}</strong> has marked your 
        <strong>"${itemName}"</strong> as returned on ${returnDate}.
      </p>

      <div class="item-card">
        ${itemImage ? `<img src="${itemImage}" alt="${itemName}" class="item-image">` : ''}
        <h3 style="margin: 0 0 8px 0; color: #1f2937;">${itemName}</h3>
        <p style="margin: 0; color: #6b7280;">Returned by ${borrowerName}</p>
        <p style="margin: 8px 0 0 0; color: #059669; font-weight: 600;">✅ Returned ${returnDate}</p>
        <div style="clear: both;"></div>
      </div>

      ${borrowerNotes ? `
        <div class="message-box" style="background-color: #f0f9ff; border-color: #0ea5e9;">
          <strong>Note from ${borrowerName}:</strong>
          <p style="margin: 8px 0 0 0;">"${borrowerNotes}"</p>
        </div>
      ` : ''}

      ${confirmReturnUrl ? `
        <div style="text-align: center; margin: 30px 0;">
          <a href="${confirmReturnUrl}" class="button">
            Confirm Return Received
          </a>
        </div>
      ` : ''}

      <p style="font-size: 16px; color: #374151;">
        Your item is now available for future borrow requests. Thank you for being 
        part of the sharing community! 🌟
      </p>

      <p style="font-size: 14px; color: #6b7280;">
        If there are any issues with the returned item, please contact support.
      </p>
    `;

    return {
      subject: `📦 ${borrowerName} has returned your "${itemName}"`,
      html: baseTemplate(content, 'Item Returned'),
    };
  },

  returnReminder({
    recipientName,
    itemName,
    itemImage,
    lenderName,
    returnDate,
    contactInfo,
  }: ReturnReminderProps) {
    const content = `
      <h2 style="color: #f59e0b; margin-bottom: 20px;">Return Reminder ⏰</h2>
      
      <p style="font-size: 16px; color: #374151;">Hi ${recipientName},</p>
      
      <p style="font-size: 16px; color: #374151;">
        Just a friendly reminder that <strong>"${itemName}"</strong> is due back 
        to ${lenderName} tomorrow (${returnDate}).
      </p>

      <div class="item-card">
        ${itemImage ? `<img src="${itemImage}" alt="${itemName}" class="item-image">` : ''}
        <h3 style="margin: 0 0 8px 0; color: #1f2937;">${itemName}</h3>
        <p style="margin: 0; color: #6b7280;">Return to ${lenderName}</p>
        <p style="margin: 8px 0 0 0; color: #f59e0b; font-weight: 600;">⏰ Due ${returnDate}</p>
        <div style="clear: both;"></div>
      </div>

      <div style="background-color: #fffbeb; border: 1px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <h3 style="margin: 0 0 12px 0; color: #92400e;">Before You Return:</h3>
        <ul style="margin: 0; padding-left: 20px; color: #92400e;">
          <li>Clean the item if needed</li>
          <li>Include any accessories or parts</li>
          <li>Check for any damage</li>
          ${contactInfo ? `<li>Contact ${lenderName}: ${contactInfo}</li>` : ''}
        </ul>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="/my-borrows" class="button">
          Mark as Returned
        </a>
      </div>

      <p style="font-size: 14px; color: #6b7280;">
        Thank you for being a responsible borrower and helping build a great 
        sharing community! 🌟
      </p>
    `;

    return {
      subject: `⏰ Return reminder: "${itemName}" due tomorrow`,
      html: baseTemplate(content, 'Return Reminder'),
    };
  },
};