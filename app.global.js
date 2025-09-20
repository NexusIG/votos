// app.global.js (sin ESM). Cárgalo DESPUÉS de la UMD de Supabase.
(function(){
  if (!window.supabase) {
    console.error("Falta UMD de Supabase. Agrega <script src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js'></script> antes de app.global.js");
    return;
  }

  // ✅ TUS CREDENCIALES
  var SUPABASE_URL = "https://vnekfauzivwsyueeizvz.supabase.co";
  var SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZuZWtmYXV6aXZ3c3l1ZWVpenZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0NTk3MzEsImV4cCI6MjA3MzAzNTczMX0.XWGEFAa8PbNNWVSBfwfEmscgDbaEASE8Z20DfTFeRlM";

  var client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  function qs(name, def){ var v=new URLSearchParams(location.search).get(name); return v==null?def:v; }
  function $(sel, root){ return (root||document).querySelector(sel); }
  function $$(sel, root){ return Array.prototype.slice.call((root||document).querySelectorAll(sel)); }
  function fmt(n){ return Number(n==null?0:n).toFixed(2); }
  function copy(text){ if (navigator.clipboard) navigator.clipboard.writeText(text); }
  function toast(msg, type){
    var el=document.createElement("div");
    el.className="toast "+(type||"ok");
    el.textContent=msg;
    document.body.appendChild(el);
    setTimeout(function(){el.classList.add("show")},10);
    setTimeout(function(){ el.classList.remove("show"); setTimeout(function(){el.remove()},200) },2200);
  }

  window.App = {
    supabase: client,
    WEIGHT_JUDGES: 0.6,
    WEIGHT_PUBLIC: 0.4,
    qs:qs, $:$, $$:$$, fmt:fmt, copy:copy, toast:toast
  };
})();
