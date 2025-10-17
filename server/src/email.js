// src/email.js
import nodemailer from 'nodemailer';

const {
  SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM,
  PUBLIC_BASE_URL
} = process.env;

let transport;

function createTransport() {
  if (transport) return transport;
  console.log(`[email] Creating transporter smtp://${SMTP_HOST}:${SMTP_PORT} as ${SMTP_USER}`);
  transport = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT || 587),
    secure: false,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return transport;
}

export async function verifyTransport() {
  try {
    const t = createTransport();
    await t.verify();
    console.log(`[email] SMTP ready: ${SMTP_HOST} ${SMTP_PORT} as ${SMTP_USER}`);
  } catch (e) {
    console.error('[email] SMTP verify FAILED:', e);
  }
}

export async function sendVerificationEmail(to, token) {
  const url = `${PUBLIC_BASE_URL}/api/users/verify?token=${encodeURIComponent(token)}`;
  console.log('[email] sendVerificationEmail →', to, url);
  const t = createTransport();
  const info = await t.sendMail({
    from: EMAIL_FROM,
    to,
    subject: 'Verify your Daps account',
    text: `Verify your email: ${url}`,
    html: `<p>Verify your email:</p><p><a href="${url}">${url}</a></p>`
  });
  console.log('[email] verification sent messageId=', info?.messageId);
  return info;
}

export async function sendPasswordResetEmail(to, token) {
  const url = `${PUBLIC_BASE_URL}/api/users/reset-password?token=${encodeURIComponent(token)}`;
  console.log('[email] sendPasswordResetEmail →', to, url);
  const t = createTransport();
  const info = await t.sendMail({
    from: EMAIL_FROM,
    to,
    subject: 'Reset your Daps password',
    text: `Reset password: ${url}`,
    html: `<p>Reset your password:</p><p><a href="${url}">${url}</a></p>`
  });
  console.log('[email] reset sent messageId=', info?.messageId);
  return info;
}

export async function sendTestEmail(to) {
  console.log('[email] sendTestEmail →', to);
  const t = createTransport();
  const info = await t.sendMail({
    from: EMAIL_FROM,
    to,
    subject: 'Daps test email',
    text: 'This is a test email from Daps backend.',
  });
  console.log('[email] test sent messageId=', info?.messageId);
  return info;
}

/**
 * Offer status notification to the customer.
 * - to: email address (usually offer.customerEmail)
 * - offer: Offer object with { status, offered, expDesc, gameDesc, athlete?{name,team}, id, createdAt }
 */
export async function sendOfferStatusEmail(to, offer) {
  if (!to) {
    console.warn('[email] sendOfferStatusEmail skipped: no recipient (customerEmail missing).');
    return;
  }
  const { status, offered, expDesc, gameDesc, athlete } = offer || {};
  const athleteName = athlete?.name || 'the athlete';
  const experience = expDesc || gameDesc || 'your requested experience';

  let subject, text, html;
  if (status === 'approved') {
    subject = `Your Daps offer was approved`;
    text = `Good news! Your offer (${offered ? `$${offered}` : '—'}) for ${experience} with ${athleteName} was approved.`;
    html = `
      <h2>Offer approved 🎉</h2>
      <p>Good news! Your offer ${offered ? `<b>$${offered}</b>` : ''} for <b>${experience}</b> with <b>${athleteName}</b> was approved.</p>
      <p>We’ll be in touch with next steps.</p>
    `;
  } else if (status === 'declined') {
    subject = `Update on your Daps offer`;
    text = `Thanks for your offer for ${experience} with ${athleteName}. It wasn't approved this time.`;
    html = `
      <h2>Offer update</h2>
      <p>Thanks for your offer for <b>${experience}</b> with <b>${athleteName}</b>. It wasn't approved this time.</p>
      <p>You can submit a new offer anytime.</p>
    `;
  } else if (status === 'pending') {
    subject = `Your Daps offer is pending`;
    text = `Your offer for ${experience} with ${athleteName} is pending review.`;
    html = `
      <h2>Offer pending</h2>
      <p>Your offer for <b>${experience}</b> with <b>${athleteName}</b> is pending review.</p>
    `;
  } else {
    console.warn('[email] sendOfferStatusEmail skipped: unknown status', status);
    return;
  }

  console.log('[email] sendOfferStatusEmail →', to, '| status=', status);
  const t = createTransport();
  const info = await t.sendMail({
    from: EMAIL_FROM,
    to,
    subject,
    text,
    html
  });
  console.log('[email] offer-status sent messageId=', info?.messageId);
  return info;
}
