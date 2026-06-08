// Edge function: Process automatic rent reminders
// Triggered daily by cron. Loops over all organizations where auto_sms_enabled = true,
// reads notification_templates (with trigger_after_days / repeat_every_days),
// finds unpaid rent payments matching each template's conditions, and sends SMS.
//
// Template semantics:
//   trigger_after_days = number of days to ADD to today to find the target due_date
//     before_5 -> -5  (échéance dans 5 jours: due_date = today + 5)  [actually: today - (-5) = today+5? we use today + trigger_after_days inverted]
//   We use: target_due_date = today + offset, where offset = -trigger_after_days for "after_X" semantics.
//
// To keep things explicit and aligned with previous behavior we map:
//   trigger_after_days < 0  => one-shot, due_date = today + abs(trigger_after_days)  (rappel avant échéance)
//   trigger_after_days >= 0 => due_date <= today - trigger_after_days (relance après échéance, en retard)
//   repeat_every_days NULL/0 => one-shot (skip if already sent for this rent_payment + template_key)
//   repeat_every_days > 0    => recurring (re-send if last send for same rent+template > repeat_every_days ago)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

  // Allow forced run via body.force (bypass hour check)
  let forceRun = false;
  let forcedOrgId: string | null = null;
  if (req.method === "POST") {
    try {
      const body = await req.json();
      forceRun = !!body?.force;
      forcedOrgId = body?.organizationId ?? null;
    } catch (_) { /* ignore */ }
  }

  const summary = {
    organizations_processed: 0,
    sms_sent: 0,
    sms_failed: 0,
    skipped_already_paid: 0,
    skipped_no_template: 0,
    skipped_recently_sent: 0,
    details: [] as any[],
  };

  try {
    let orgsQuery = admin
      .from("organizations")
      .select("id, name, sms_sender_name, auto_sms_enabled, auto_sms_hour, timezone")
      .eq("auto_sms_enabled", true);
    if (forcedOrgId) orgsQuery = orgsQuery.eq("id", forcedOrgId);
    const { data: orgs, error: orgsErr } = await orgsQuery;
    if (orgsErr) throw orgsErr;

    const now = new Date();
    const today = new Date(now);
    today.setUTCHours(0, 0, 0, 0);

    for (const org of orgs ?? []) {
      summary.organizations_processed++;

      if (!forceRun) {
        try {
          const tz = (org as any).timezone || "Africa/Abidjan";
          const hourStr = new Intl.DateTimeFormat("en-US", {
            timeZone: tz, hour: "2-digit", hour12: false,
          }).format(now);
          const localHour = parseInt(hourStr, 10);
          const targetHour = Number((org as any).auto_sms_hour ?? 8);
          if (localHour !== targetHour) {
            summary.details.push({ org: org.name, skipped: `hour ${localHour} != ${targetHour}` });
            continue;
          }
        } catch (_) { /* fall through */ }
      }

      const { data: templates } = await admin
        .from("notification_templates")
        .select("template_key, sms_content, sms_enabled, trigger_after_days, repeat_every_days")
        .eq("organization_id", org.id);

      for (const tpl of templates ?? []) {
        if (!tpl.sms_enabled || !tpl.sms_content) continue;
        if (tpl.trigger_after_days === null || tpl.trigger_after_days === undefined) continue;

        const triggerDays = Number(tpl.trigger_after_days);
        const repeatDays = Number(tpl.repeat_every_days ?? 0);

        // Build rent query
        let rentQuery = admin
          .from("rent_payments")
          .select(`
            id, amount, paid_amount, due_date, status,
            tenants!inner (
              id, full_name, phone,
              units!inner ( id, name, properties!inner ( id, organization_id ) )
            )
          `)
          .neq("status", "paid");

        if (triggerDays < 0) {
          // Rappel avant échéance : due_date = today + abs(triggerDays)
          const target = new Date(today);
          target.setUTCDate(target.getUTCDate() + Math.abs(triggerDays));
          rentQuery = rentQuery.eq("due_date", fmtDate(target));
        } else {
          // Relance après échéance : due_date <= today - triggerDays
          const target = new Date(today);
          target.setUTCDate(target.getUTCDate() - triggerDays);
          rentQuery = rentQuery.lte("due_date", fmtDate(target));
        }

        const { data: rents, error: rentsErr } = await rentQuery;
        if (rentsErr) {
          summary.details.push({ org: org.name, template: tpl.template_key, error: rentsErr.message });
          continue;
        }

        for (const rent of rents ?? []) {
          const tenant: any = rent.tenants;
          const unit = tenant?.units;
          const property = unit?.properties;
          if (!property || property.organization_id !== org.id) continue;
          if (!tenant.phone) continue;

          if (Number(rent.paid_amount) >= Number(rent.amount)) {
            summary.skipped_already_paid++;
            continue;
          }

          // Idempotency / recurrence check
          const { data: lastSend } = await admin
            .from("sms_history")
            .select("id, created_at")
            .eq("rent_payment_id", rent.id)
            .eq("template_key", tpl.template_key)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (lastSend) {
            if (repeatDays <= 0) continue; // one-shot already sent
            const last = new Date(lastSend.created_at).getTime();
            const diffDays = (now.getTime() - last) / (1000 * 60 * 60 * 24);
            if (diffDays < repeatDays) {
              summary.skipped_recently_sent++;
              continue;
            }
          }

          const remaining = Number(rent.amount) - Number(rent.paid_amount);
          const message = applyTemplate(tpl.sms_content, {
            nom: tenant.full_name || "",
            montant: remaining.toLocaleString("fr-FR").replace(/\u00A0|\u202F/g, " "),
            date_echeance: new Date(rent.due_date).toLocaleDateString("fr-FR"),
            unite: unit?.name || "",
          });

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
              templateKey: tpl.template_key,
              organizationId: org.id,
              senderName: org.sms_sender_name,
            }),
          });

          const sendData = await sendRes.json().catch(() => ({}));
          if (sendRes.ok && sendData?.success) {
            summary.sms_sent++;
            await admin
              .from("sms_history")
              .update({ rent_payment_id: rent.id })
              .eq("organization_id", org.id)
              .eq("template_key", tpl.template_key)
              .eq("recipient_phone", tenant.phone.replace(/[\s\-\.()+ ]/g, ""))
              .is("rent_payment_id", null)
              .order("created_at", { ascending: false })
              .limit(1);
          } else {
            summary.sms_failed++;
            summary.details.push({
              org: org.name,
              tenant: tenant.full_name,
              template: tpl.template_key,
              error: sendData?.error || `HTTP ${sendRes.status}`,
            });
          }
        }
      }
    }

    console.log("Reminder processing summary:", JSON.stringify(summary));
    return new Response(JSON.stringify({ success: true, sent: summary.sms_sent, failed: summary.sms_failed, ...summary }), {
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
