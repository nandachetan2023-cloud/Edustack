type NotifyResult = { sent: boolean; channel: "slack" | "email"; reason?: string };

export async function sendSlackReminder(message: string): Promise<NotifyResult> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    return { sent: false, channel: "slack", reason: "SLACK_WEBHOOK_URL not configured" };
  }
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: message }),
    });
    if (!res.ok) {
      return { sent: false, channel: "slack", reason: `Slack webhook returned ${res.status}` };
    }
    return { sent: true, channel: "slack" };
  } catch (err) {
    return { sent: false, channel: "slack", reason: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function sendEmailReminder(to: string, subject: string, body: string): Promise<NotifyResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromAddress = process.env.NOTIFICATIONS_FROM_EMAIL;
  if (!apiKey || !fromAddress) {
    return { sent: false, channel: "email", reason: "RESEND_API_KEY / NOTIFICATIONS_FROM_EMAIL not configured" };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: fromAddress, to, subject, text: body }),
    });
    if (!res.ok) {
      return { sent: false, channel: "email", reason: `Email provider returned ${res.status}` };
    }
    return { sent: true, channel: "email" };
  } catch (err) {
    return { sent: false, channel: "email", reason: err instanceof Error ? err.message : "Unknown error" };
  }
}

export function isSlackConfigured() {
  return Boolean(process.env.SLACK_WEBHOOK_URL);
}

export function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.NOTIFICATIONS_FROM_EMAIL);
}
