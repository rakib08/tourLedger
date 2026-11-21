import { createHmac, randomInt } from 'node:crypto';
import { connect } from 'node:tls';

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

export function generateDeleteOtp() {
  const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
  const secret = requiredEnv('OTP_HASH_SECRET');
  if (secret.length < 32) throw new Error('OTP_HASH_SECRET must contain at least 32 characters.');
  const hash = createHmac('sha256', secret).update(code).digest('hex');
  return { code, hash };
}

export async function sendDeleteOtp(to: string, groupName: string, code: string) {
  const user = requiredEnv('GMAIL_USER').trim();
  const password = requiredEnv('GMAIL_APP_PASSWORD').replace(/\s/g, '');
  const socket = connect({ host: 'smtp.gmail.com', port: 465, servername: 'smtp.gmail.com' });
  socket.setTimeout(15_000);

  let buffer = '';
  const pending: Array<{ resolve: (value: string) => void; reject: (error: Error) => void }> = [];
  const replies: string[] = [];
  let closedError: Error | null = null;
  socket.setEncoding('utf8');
  socket.on('data', (chunk: string) => {
    buffer += chunk;
    while (true) {
      const end = buffer.indexOf('\n');
      if (end < 0) break;
      const line = buffer.slice(0, end).replace(/\r$/, '');
      buffer = buffer.slice(end + 1);
      const match = line.match(/^(\d{3})([ -])/);
      if (!match || match[2] === '-') continue;
      const waiter = pending.shift();
      if (waiter) waiter.resolve(line);
      else replies.push(line);
    }
  });
  socket.on('timeout', () => socket.destroy(new Error('Gmail SMTP timed out waiting for a response.')));
  socket.on('error', (error) => {
    closedError = error;
    while (pending.length) pending.shift()!.reject(error);
  });
  socket.on('close', () => {
    if (!closedError) closedError = new Error('Gmail SMTP connection closed unexpectedly.');
    while (pending.length) pending.shift()!.reject(closedError);
  });

  const response = () => new Promise<string>((resolve, reject) => {
    if (replies.length) return resolve(replies.shift()!);
    if (closedError) return reject(closedError);
    pending.push({ resolve, reject });
  });
  const command = async (value: string, expected: number) => {
    const resultPromise = response();
    socket.write(`${value}\r\n`);
    const result = await resultPromise;
    if (Number(result.slice(0, 3)) !== expected) throw new Error(`Gmail SMTP error: ${result}`);
  };

  try {
    // Register protocol listeners before waiting for TLS, so the server greeting
    // cannot be lost while the TLS handshake completes.
    await new Promise<void>((resolve, reject) => {
      socket.once('secureConnect', resolve);
      socket.once('error', reject);
    });
    const greeting = await response();
    if (!greeting.startsWith('220')) throw new Error(`Gmail SMTP error: ${greeting}`);
    await command('EHLO tourledger.local', 250);
    await command('AUTH LOGIN', 334);
    await command(Buffer.from(user).toString('base64'), 334);
    await command(Buffer.from(password).toString('base64'), 235);
    await command(`MAIL FROM:<${user}>`, 250);
    await command(`RCPT TO:<${to}>`, 250);
    await command('DATA', 354);
    const subject = 'TourLedger – Confirm Permanent Group Deletion';
    const safeGroupName = groupName.replace(/[\r\n]/g, ' ').slice(0, 150);
    const body = [
      `To: ${to}`,
      `From: TourLedger <${user}>`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=UTF-8',
      '',
      `Your TourLedger deletion verification code is: ${code}`,
      '',
      `Group: ${safeGroupName}`,
      'This code expires in 5 minutes and can only be used once for this group.',
      'If you did not request this, you can ignore this email.',
      '.',
      '',
    ].join('\r\n').replace(/\n\./g, '\n..');
    const sentPromise = response();
    socket.write(`${body}\r\n`);
    const sent = await sentPromise;
    if (!sent.startsWith('250')) throw new Error(`Gmail SMTP error: ${sent}`);
    await command('QUIT', 221);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown SMTP error';
    if (message.includes('timed out')) {
      throw new Error('Gmail SMTP timed out. Your network test may pass while Node.js is blocked by a firewall, antivirus, VPN, or hosting network. Try allowing Node.js outbound access or use a transactional email provider.');
    }
    throw error;
  } finally {
    socket.destroy();
  }
}
