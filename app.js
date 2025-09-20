import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ⚠️ Usa tus credenciales actuales
const SUPABASE_URL = "https://vnekfauzivwsyueeizvz.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZuZWtmYXV6aXZ3c3l1ZWVpenZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0NTk3MzEsImV4cCI6MjA3MzAzNTczMX0.XWGEFAa8PbNNWVSBfwfEmscgDbaEASE8Z20DfTFeRlM";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Ponderación del total (ajústalo si quieres)
export const WEIGHT_JUDGES = 0.6;
export const WEIGHT_PUBLIC = 0.4;

export const qs = (name, def=null)=> new URLSearchParams(location.search).get(name) ?? def;
export const $  = (sel, root=document)=> root.querySelector(sel);
export const $$ = (sel, root=document)=> [...root.querySelectorAll(sel)];
export const fmt = n => Number(n ?? 0).toFixed(2);

export function copy(text){
  if (navigator.clipboard) navigator.clipboard.writeText(text);
}

export function toast(msg, type="ok"){
  let el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(()=>el.classList.add("show"),10);
  setTimeout(()=>{ el.classList.remove("show"); setTimeout(()=>el.remove(),200) }, 2200);
}
