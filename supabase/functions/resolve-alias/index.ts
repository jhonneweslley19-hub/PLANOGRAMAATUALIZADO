// Traduz o alias digitado no login pro e-mail real, consultando
// public.profiles com a service role key (só existe aqui no servidor).
// Deploy: painel do Supabase → Edge Functions → New Function "resolve-alias"
// → colar este arquivo → Deploy. SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY
// já vêm injetados automaticamente no ambiente da função.

import { createClient } from "npm:@supabase/supabase-js@2";

// CORS aberto: a função não usa cookie/sessão (só a anon key, já pública)
// e não escreve nada no banco. A proteção real é a service role key ficar
// só aqui no servidor, e o papel (role) de ninguém sair por esta rota.
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (req) => {
  const headers = { ...CORS_HEADERS, "Content-Type": "application/json" };

  if (req.method === "OPTIONS") return new Response(null, { headers });
  if (req.method !== "POST"){
    return new Response(JSON.stringify({ email: null }), { status: 405, headers });
  }

  let alias = "";
  try{
    const body = await req.json();
    alias = String(body?.alias ?? "").trim().toLowerCase();
  } catch(_e){
    return new Response(JSON.stringify({ email: null }), { status: 400, headers });
  }

  if (!alias || alias.length > 64 || !/^[a-z0-9._-]+$/.test(alias)){
    return new Response(JSON.stringify({ email: null }), { headers });
  }

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("email")
    .eq("alias", alias)
    .maybeSingle();

  if (error){
    return new Response(JSON.stringify({ email: null }), { status: 500, headers });
  }

  return new Response(JSON.stringify({ email: data?.email ?? null }), { headers });
});
