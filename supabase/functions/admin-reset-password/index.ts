// Redefine a senha de um usuário existente — só admin autenticado (mesmo
// padrão de verificação de admin-create-user). Existe porque as contas
// usam e-mail interno fake (não recebem e-mail de verdade), então um
// fluxo de "esqueci a senha" por e-mail não é confiável aqui; o caminho
// real já era um admin redefinir manualmente -- isso só move esse
// caminho pra dentro do app em vez do painel do Supabase.
//
// Deploy: painel do Supabase → Edge Functions → New Function
// "admin-reset-password" → colar este arquivo → Deploy.

import { createClient } from "npm:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

function isPasswordStrongEnough(value: unknown){
  return typeof value === "string" && value.length >= 8
    && /[a-zA-Z]/.test(value) && /[0-9]/.test(value);
}

Deno.serve(async (req) => {
  const headers = { ...CORS_HEADERS, "Content-Type": "application/json" };

  if (req.method === "OPTIONS") return new Response(null, { headers });
  if (req.method !== "POST"){
    return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405, headers });
  }

  const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!jwt){
    return new Response(JSON.stringify({ error: "missing_auth" }), { status: 401, headers });
  }
  const { data: callerData, error: callerErr } = await supabaseAdmin.auth.getUser(jwt);
  if (callerErr || !callerData?.user){
    return new Response(JSON.stringify({ error: "invalid_auth" }), { status: 401, headers });
  }
  const { data: callerProfile } = await supabaseAdmin
    .from("profiles").select("role").eq("id", callerData.user.id).maybeSingle();
  if (!callerProfile || callerProfile.role !== "admin"){
    return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers });
  }

  let userId = "", password = "";
  try{
    const body = await req.json();
    userId = String(body?.userId ?? "");
    password = String(body?.password ?? "");
  } catch(_e){
    return new Response(JSON.stringify({ error: "bad_request" }), { status: 400, headers });
  }

  if (!userId){
    return new Response(JSON.stringify({ error: "missing_user_id" }), { status: 400, headers });
  }
  if (!isPasswordStrongEnough(password)){
    return new Response(JSON.stringify({ error: "weak_password" }), { status: 400, headers });
  }

  const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(userId, { password });
  if (updateErr){
    return new Response(JSON.stringify({ error: updateErr.message || "update_failed" }), { status: 400, headers });
  }

  return new Response(JSON.stringify({ ok: true }), { headers });
});
