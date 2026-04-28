// Edge function: Process automatic rent reminders (J-5, J+1, J+7)
// Triggered daily by cron. Loops over all organizations where auto_sms_enabled = true,
// finds rent payments matching reminder thresholds, and sends SMS via send-sms function.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Reminder thresholds (days). Negative = before due date, positive = after.
// Maps to template_key in notification_templates.
const REMINDERS: Array<{ offset: number; key: string }> = [
  { offset: -5, key: "before_5" },
  { offset: 1, key: "after_1" },
  { offset: 7, key: "after_7" },
];

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function applyTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? "");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, supabaseServiceKey);

  const summary = {
    organizations_processed: 0,
    sms_sent: 0,
    sms_failed: 0,
    skipped_already_paid: 0,
    skipped_no_template: 0,
    details: [] as any[],
  };

  try {
    // 1. Fetch all orgs with auto SMS enabled
    const { data: orgs, error: orgsErr } = await admin
      .from("organizations")
      .select("id, name, sms_sender_name, auto_sms_enabled")
      .eq("auto_sms_enabled", true);

    if (orgsErr) throw orgsErr;

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    for (const org of orgs ?? []) {
      summary.organizations_processed++;

      // Load templates for this org
      const { data: templates } = await admin
        .from("notification_templates")
        .select("template_key, sms_content, sms_enabled")
        .eq("organization_id", org.id);

      const tplMap = new Map<string, { content: string; enabled: boolean }>();
      for (const t of templates ?? []) {
        tplMap.set(t.template_key, { content: t.sms_content, enabled: t.sms_enabled });
      }

      // For each reminder threshold, compute target due_date and find unpaid rents
      for (const reminder of REMINDERS) {
        const target = new Date(today);
        target.setUTCDate(target.getUTCDate() + reminder.offset);
        const targetStr = fmtDate(target);

        // Get rent payments due on this date that are NOT fully paid
        const { data: rents, error: rentsErr } = await admin
          .from("rent_payments")
          .select(`
            id, amount, paid_amount, due_date, status,
            tenants!inner (
              id, full_name, phone, organization_id:unit_id,
              units!inner (
                id, name,
                properties!inner ( id, organization_id )
              )
            )
          `)
          .eq("due_date", targetStr)
          .neq("status", "paid");

        if (rentsErr) {
          summary.details.push({ org: org.name, threshold: reminder.key, error: rentsErr.message });
          continue;
        }

        for (const rent of rents ?? []) {
          const tenant: any = rent.tenants;
          const unit = tenant?.units;
          const property = unit?.properties;
          if (!property || property.organization_id !== org.id) continue;
          if (!tenant.phone) continue;

          // Skip if already fully paid
          if (Number(rent.paid_amount) >= Number(rent.amount)) {
            summary.skipped_already_paid++;
            continue;
          }

          const tpl = tplMap.get(reminder.key);
          if (!tpl || !tpl.enabled || !tpl.content) {
            summary.skipped_no_template++;
            continue;
          }

          // Idempotency: avoid sending same template_key twice for same rent_payment
          const { data: existing } = await admin
            .from("sms_history")
            .select("id")
            .eq("rent_payment_id", rent.id)
            .eq("template_key", reminder.key)
            .limit(1)
            .maybeSingle();

          if (existing) continue;

          const remaining = Number(rent.amount) - Number(rent.paid_amount);
          const message = applyTemplate(tpl.content, {
            nom: tenant.full_name || "",
            montant: remaining.toLocaleString("fr-FR").replace(/\u00A0|\u202F/g, " "),
            date_echeance: new Date(rent.due_date).toLocaleDateString("fr-FR"),
            unite: unit?.name || "",
          });

          // Call send-sms function with service-role auth
          const sendRes = await fetch(`${supabaseUrl}/functions/v1/send-sms`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              to: tenant.phone,
              message,
              recipientName: tenant.full_name,
              templateKey: reminder.key,
              organizationId: org.id,
              senderName: org.sms_sender_name,
            }),
          });

          const sendData = await sendRes.json().catch(() => ({}));
          if (sendRes.ok && sendData?.success) {
            summary.sms_sent++;
            // Link sms_history row to rent_payment for idempotency
            await admin
              .from("sms_history")
              .update({ rent_payment_id: rent.id })
              .eq("organization_id", org.id)
              .eq("template_key", reminder.key)
              .eq("recipient_phone", tenant.phone.replace(/[\s\-\.()+ ]/g, ""))
              .is("rent_payment_id", null)
              .order("created_at", { ascending: false })
              .limit(1);
          } else {
            summary.sms_failed++;
            summary.details.push({
              org: org.name,
              tenant: tenant.full_name,
              threshold: reminder.key,
              error: sendData?.error || `HTTP ${sendRes.status}`,
            });
          }
        }
      }
    }

    console.log("Reminder processing summary:", JSON.stringify(summary));
    return new Response(JSON.stringify({ success: true, ...summary }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("process-rent-reminders error:", errorMessage);
    return new Response(JSON.stringify({ success: false, error: errorMessage, summary }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
