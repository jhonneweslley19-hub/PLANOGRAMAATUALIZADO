// Cria um usuário novo, chamado só por admin autenticado (verifica o JWT
// de quem chama e confere profiles.role antes de criar). signUp() com a
// anon key não tem gate real no servidor -- qualquer um com a anon key
// (pública) podia chamar signUp() direto e se autocadastrar, sem passar
// pela tela "Cadastrar usuário". Esta função fecha isso: cria o usuário
// via Admin API (service role), então precisa vir com "Enable email
// signups" desligado em Authentication > Providers > Email pra fechar
// de vez o autocadastro público.
//
// Deploy: painel do Supabase → Edge Functions → New Function
// "admin-create-user" → colar este arquivo → Deploy.

import { createClient } from "npm:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const CURRENT_INTERNAL_EMAIL_DOMAIN = "interno.exemplo.local";

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

  let alias = "", password = "", role = "repositor";
  try{
    const body = await req.json();
    alias = String(body?.alias ?? "").trim().toLowerCase();
    password = String(body?.password ?? "");
    role = body?.role === "admin" ? "admin" : "repositor";
  } catch(_e){
    return new Response(JSON.stringify({ error: "bad_request" }), { status: 400, headers });
  }

  if (!alias || alias.length > 64 || !/^[a-z0-9._-]+$/.test(alias)){
    return new Response(JSON.stringify({ error: "invalid_alias" }), { status: 400, headers });
  }
  if (!isPasswordStrongEnough(password)){
    return new Response(JSON.stringify({ error: "weak_password" }), { status: 400, headers });
  }

  const { data: existing } = await supabaseAdmin
    .from("profiles").select("id").eq("alias", alias).maybeSingle();
  if (existing){
    return new Response(JSON.stringify({ error: "alias_taken" }), { status: 409, headers });
  }

  const email = `${alias}@${CURRENT_INTERNAL_EMAIL_DOMAIN}`;
  const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { alias },
  });
  if (createErr || !created?.user){
    return new Response(JSON.stringify({ error: createErr?.message || "create_failed" }), { status: 400, headers });
  }

  if (role === "admin"){
    await supabaseAdmin.from("profiles").update({ role: "admin" }).eq("id", created.user.id);
  }

  return new Response(JSON.stringify({ ok: true, alias, email, role }), { headers });
});
