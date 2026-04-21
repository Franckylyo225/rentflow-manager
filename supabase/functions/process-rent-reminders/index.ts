import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MONSMS_URL = "https://rest.monsms.pro/v1/campaign/create";

function formatPhoneNumber(phone: string): string {
  return phone.replace(/[\s\-\.()+ ]/g, "");
}

function applyVariables(content: string, vars: Record<string, string>): string {
  return content
    .replace(/\{\{nom\}\}/g, vars.nom || "")
    .replace(/\{\{montant\}\}/g, vars.montant || "")
    .replace(/\{\{date_echeance\}\}/g, vars.date_echeance || "");
}

function diffDays(a: Date, b: Date): number {
  const ms = a.setHours(0, 0, 0, 0) - b.setHours(0, 0, 0, 0);
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

// J-5 (avant échéance), J+1 (lendemain), J+7 (une semaine après)
function pickTemplateKey(daysFromDue: number): string | null {
  if (daysFromDue === -5) return "before_5";
  if (daysFromDue === 1) return "after_1";
  if (daysFromDue === 7) return "after_7";
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const MONSMS_API_KEY = Deno.env.get("MONSMS_API_KEY");
  const MONSMS_COMPANY_ID = Deno.env.get("MONSMS_COMPANY_ID");
  if (!MONSMS_API_KEY || !MONSMS_COMPANY_ID) {
    return new Response(JSON.stringify({ success: false, error: "MonSMS not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const currentHour = new Date().getUTCHours();
    let force = false;
    let onlyOrgId: string | null = null;
    try {
      const body = await req.json();
      if (body?.force) force = true;
      if (body?.organizationId) onlyOrgId = body.organizationId;
    } catch (_) {}

    // Find orgs whose configured hour matches current UTC hour
    let orgsQuery = supabase
      .from("organizations")
      .select("id, auto_sms_enabled, auto_sms_hour, sms_sender_name");
    if (onlyOrgId) orgsQuery = orgsQuery.eq("id", onlyOrgId);

    const { data: orgs, error: orgsErr } = await orgsQuery;
    if (orgsErr) throw orgsErr;

    const targetOrgs = (orgs || []).filter(
      (o: any) => force || (o.auto_sms_enabled && o.auto_sms_hour === currentHour)
    );

    if (targetOrgs.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No orgs scheduled for this hour", currentHour }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let totalSent = 0;
    let totalFailed = 0;
    const today = new Date();

    for (const org of targetOrgs) {
      // Load templates for this org
      const { data: templates } = await supabase
        .from("notification_templates")
        .select("*")
        .eq("organization_id", org.id)
        .eq("sms_enabled", true);

      if (!templates || templates.length === 0) continue;
      const templateMap = new Map(templates.map((t: any) => [t.template_key, t]));

      // Load all unpaid payments for this org with tenant info
      const { data: payments } = await supabase
        .from("rent_payments")
        .select("id, due_date, amount, paid_amount, status, tenants!inner(id, full_name, phone, unit_id, units!inner(property_id, properties!inner(organization_id)))")
        .in("status", ["pending", "partial", "late"])
        .eq("tenants.units.properties.organization_id", org.id);

      if (!payments) continue;

      for (const p of payments as any[]) {
        const due = new Date(p.due_date);
        const daysFromDue = diffDays(new Date(today), new Date(due));
        const key = pickTemplateKey(daysFromDue);
        if (!key) continue;
        const tpl = templateMap.get(key);
        if (!tpl) continue;

        const tenant = p.tenants;
        if (!tenant?.phone) continue;

        // Clé d'événement unique : paiement + template + jour relatif
        // Garantit qu'un même rappel ne peut être envoyé qu'une seule fois,
        // même si le cron est rerun ou si la fonction est rappelée manuellement.
        const eventKey = `${p.id}:${key}:${daysFromDue}`;

        const { data: alreadySent } = await supabase
          .from("sms_history")
          .select("id")
          .eq("event_key", eventKey)
          .eq("status", "sent")
          .limit(1);
        if (alreadySent && alreadySent.length > 0) continue;

        const remaining = (p.amount || 0) - (p.paid_amount || 0);
        const message = applyVariables(tpl.sms_content, {
          nom: tenant.full_name,
          montant: remaining.toLocaleString("fr-FR"),
          date_echeance: new Date(p.due_date).toLocaleDateString("fr-FR"),
        });

        const recipientPhone = formatPhoneNumber(tenant.phone);
        const senderName = (org.sms_sender_name && String(org.sms_sender_name).trim()) || "SCI BINIEBA";
        const payload = {
          apiKey: MONSMS_API_KEY,
          companyId: MONSMS_COMPANY_ID,
          senderId: senderName,
          contacts: [{ phone: recipientPhone }],
          text: message,
          type: "SMS",
        };

        try {
          const r = await fetch(MONSMS_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          const d = await r.json();
          const ok = r.ok && d?.success === true;

          await supabase.from("sms_history").insert({
            organization_id: org.id,
            recipient_phone: recipientPhone,
            recipient_name: tenant.full_name,
            message,
            sender_name: senderName,
            status: ok ? "sent" : "failed",
            error_message: ok ? null : JSON.stringify(d?.error ?? d),
            orange_message_id: d?.data?.id || d?.data?.campaignId || null,
            template_key: key,
            rent_payment_id: p.id,
          });

          if (ok) totalSent++;
          else totalFailed++;
        } catch (e: any) {
          totalFailed++;
          await supabase.from("sms_history").insert({
            organization_id: org.id,
            recipient_phone: recipientPhone,
            recipient_name: tenant.full_name,
            message,
            sender_name: senderName,
            status: "failed",
            error_message: e.message,
            template_key: key,
            rent_payment_id: p.id,
          });
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent: totalSent, failed: totalFailed, orgs: targetOrgs.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.error("[process-rent-reminders]", e);
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
