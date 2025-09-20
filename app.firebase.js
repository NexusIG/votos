// app.firebase.js — Inicializa Firebase + helpers (UMD/compat, sin ESM)
(function () {
  if (!window.firebase) {
    console.error("Falta Firebase SDK: app-compat y firestore-compat.");
    return;
  }

  // ✅ Tu configuración de Firebase
  var firebaseConfig = {
    apiKey: "AIzaSyACeOfOgrtfajFyzaKWcZxsDdjW7rgXEA4",
    authDomain: "votaciones-dca73.firebaseapp.com",
    projectId: "votaciones-dca73",
    storageBucket: "votaciones-dca73.firebasestorage.app",
    messagingSenderId: "695584729473",
    appId: "1:695584729473:web:9f3b2342d392d066c06080",
    measurementId: "G-S0XNNV9YXC"
  };

  if (firebase.apps.length === 0) firebase.initializeApp(firebaseConfig);
  if (firebase.analytics) { try { firebase.analytics(); } catch (e) {} }

  var db = firebase.firestore();

  // Helpers UI
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
    db: db,
    WEIGHT_JUDGES: 0.6,
    WEIGHT_PUBLIC: 0.4,
    qs: qs, $: $, $$: $$, fmt: fmt, copy: copy, toast: toast,
  };
})();
