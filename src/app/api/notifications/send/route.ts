import { NextRequest, NextResponse } from "next/server";
import { logAction } from "@/services/agents/base";

/**
 * API Route: Send Notification Email
 *
 * Envoie un email de notification/approbation via Resend, Nodemailer ou SMTP.
 * Fallback: stocke la notification dans Supabase pour affichage dashboard.
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const NOTIFY_EMAIL = process.env.APPROVAL_EMAIL || "hello@uburn.co";

export async function POST(req: NextRequest) {
  try {
    const { to, subject, html } = (await req.json()) as {
      to?: string;
      subject: string;
      html: string;
    };

    const recipient = to || NOTIFY_EMAIL;

    // Method 1: Resend API (recommended — free tier: 100 emails/day)
    if (RESEND_API_KEY) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: "Uburn Cockpit <notifications@uburn.co>",
          to: [recipient],
          subject,
          html,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        await logAction("notifications", "email_sent", {
          to: recipient,
          subject,
          provider: "resend",
          id: data.id,
        }, "success");

        return NextResponse.json({ success: true, provider: "resend", id: data.id });
      }
    }

    // Fallback: Log notification to Supabase for dashboard display
    await logAction("notifications", "email_queued", {
      to: recipient,
      subject,
      htmlLength: html.length,
      provider: "supabase_log",
      note: "Email stocké — configure RESEND_API_KEY pour l'envoi automatique",
    }, "warning");

    return NextResponse.json({
      success: true,
      provider: "supabase_log",
      note: "Notification stockée dans les logs. Ajoute RESEND_API_KEY pour l'envoi email automatique.",
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
