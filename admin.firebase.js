// Admin — Firestore con QR robusto, base fija y QR grande/legible
(function(){
  var App = window.App||{};
  var db = App.db, $ = App.$, toast = App.toast, copy = App.copy;

  var titleInput = $("#title");
  var candidateInput = $("#candidate");
  var imageInput = $("#image");
  var judgesInput = $("#judges");
  var createBtn = $("#createPoll");
  var qrContainer = $("#qrContainer");
  var resultsBtn = $("#viewResultsBtn");

  var qrModal = $("#qrModal");
  var qrModalBox = $("#qrModalBox");
  var qrLink = $("#qrLink");
  var btnCopy = $("#copyLink");
  var btnClose = $("#closeQr");

  // --- Base URL fija (usa __BASE_URL__ si existe, si no usa carpeta actual) ---
  function getBase() {
    var base = (window.__BASE_URL__ && String(window.__BASE_URL__).trim())
      || (location.origin + location.pathname.replace(/[^\/]*$/, '/'));
    if (!/\/$/.test(base)) base += '/';
    return base;
  }
  function pollUrl(id){
    var u = new URL("vote.html", getBase());
    u.searchParams.set("poll", id);
    return u.href;
  }
  function resultsUrl(id){
    var u = new URL("results.html", getBase());
    u.searchParams.set("poll", id);
    return u.href;
  }

  // --- Carga librería QR si hace falta (fallbacks) ---
  function loadScript(src){
    return new Promise(function(resolve, reject){
      var s = document.createElement("script");
      s.src = src; s.async = true; s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });
  }
  var triedFallbackQR = false;
  async function ensureQRCode(){
    if (window.QRCode) return true;
    if (!triedFallbackQR){
      triedFallbackQR = true;
      try { await loadScript("https://cdn.jsdelivr.net/npm/qrcodejs/qrcode.min.js"); if (window.QRCode) return true; } catch(_){}
      try { await loadScript("https://unpkg.com/qrcodejs@1.0.0/qrcode.min.js"); if (window.QRCode) return true; } catch(_){}
    }
    return !!window.QRCode;
  }

  // --- Dibuja QR grande, con fondo blanco y margen (mejor lectura) ---
  async function renderQR(targetEl, link){
    targetEl.innerHTML = "";
    var box = document.createElement("div");
    box.style.display = "flex";
    box.style.flexDirection = "column";
    box.style.alignItems = "center";
    box.style.gap = "8px";
    targetEl.appendChild(box);

    // cuadro blanco para quiet zone
    var qrWrap = document.createElement("div");
    qrWrap.style.background = "#ffffff";
    qrWrap.style.padding = "12px";
    qrWrap.style.borderRadius = "8px";
    box.appendChild(qrWrap);

    var ok = await ensureQRCode();
    if (ok){
      try {
        new QRCode(qrWrap, {
          text: link,
          width: 320,
          height: 320,
          colorDark: "#000000",
          colorLight: "#ffffff",
          correctLevel: (window.QRCode && window.QRCode.CorrectLevel && window.QRCode.CorrectLevel.M) || 1
        });
      } catch (e) {
        console.warn("QR render error:", e);
      }
    } else {
      var warn = document.createElement("div");
      warn.className = "small";
      warn.textContent = "No se pudo cargar la librería de QR. Mostrando solo el link.";
      box.appendChild(warn);
    }

    var a = document.createElement("a");
    a.href = link; a.target = "_blank"; a.rel = "noopener";
    a.textContent = link; a.className = "small"; a.style.wordBreak = "break-all";
    box.appendChild(a);

    var openBtn = document.createElement("button");
    openBtn.className = "secondary";
    openBtn.textContent = "Abrir link";
    openBtn.onclick = function(){ window.open(link, "_blank", "noopener"); };
    box.appendChild(openBtn);
  }

  // --- Crear encuesta ---
  createBtn.onclick = async function (){
    try {
      var title = (titleInput.value||"").trim();
      var candidate = (candidateInput.value||"").trim();
      var image = (imageInput.value||"").trim();
      var rawJudges = (judgesInput.value||"").trim();
      if (!title) return toast("El título es obligatorio", "warn");

      var pollRef = await db.collection("polls").add({
        title: title,
        candidate_name: candidate || null,
        image_url: image || null,
        is_open: true,
        max_score_per_judge: 10,
        created_at: firebase.firestore.FieldValue.serverTimestamp()
      });
      var pollId = pollRef.id;

      if (rawJudges){
        var codes = rawJudges.split(",").map(function(s){return s.trim().toUpperCase()}).filter(Boolean);
        for (var i=0;i<codes.length;i++){
          var code = codes[i];
          await db.collection("users").doc(code).set({
            role: "judge",
            code: code,
            updated_at: firebase.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
          await db.collection("poll_judges").doc(pollId + "_" + code).set({
            poll_id: pollId,
            code: code,
            created_at: firebase.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
        }
      }

      var link = pollUrl(pollId);
      await renderQR(qrContainer, link);         // QR visible
      await renderQR(qrModalBox, link);          // QR en modal
      qrLink.textContent = link;
      qrModal.classList.add("show");

      resultsBtn.style.display = "inline-block";
      resultsBtn.onclick = function(){ location.href = resultsUrl(pollId); };

      toast("Encuesta creada ✅");
      await loadPolls();
    } catch (err) {
      console.error(err);
      toast((err && err.message) || "Error creando la encuesta", "bad");
    }
  };

  // --- Listado + acciones ---
  async function loadPolls(){
    var tbody = $("#pollRows");
    tbody.innerHTML = "<tr><td colspan='4' class='small'>Cargando…</td></tr>";
    try{
      var snap = await db.collection("polls").orderBy("created_at","desc").get();
      if (snap.empty){ tbody.innerHTML = "<tr><td colspan='4' class='small'>No hay encuestas</td></tr>"; return; }
      var rows = [];
      snap.forEach(function(doc){
        var p = doc.data(); p.id = doc.id;
        var state = (p.is_open===false) ? "<span class='tag bad'>Cerrada</span>" : "<span class='tag ok'>Abierta</span>";
        var created = p.created_at && p.created_at.toDate ? p.created_at.toDate().toLocaleString() : "-";
        rows.push(
          "<tr>"
          + "<td>"+(p.title||"-")+"</td>"
          + "<td>"+state+"</td>"
          + "<td>"+created+"</td>"
          + "<td>"
            + "<button class='secondary' data-act='results' data-id='"+p.id+"'>Resultados</button>"
            + "<button class='ghost' data-act='qr' data-id='"+p.id+"'>QR</button>"
            + "<button class='warning' data-act='toggle' data-id='"+p.id+"'>"+(p.is_open===false?"Abrir":"Cerrar")+"</button>"
            + "<button class='danger' data-act='delete' data-id='"+p.id+"'>Eliminar</button>"
            + "<button class='secondary' data-act='copy' data-id='"+p.id+"'>Copiar link</button>"
          + "</td>"
          + "</tr>"
        );
      });
      tbody.innerHTML = rows.join("");
    } catch(err){
      console.error(err);
      tbody.innerHTML = "<tr><td colspan='4'>Error cargando</td></tr>";
    }
  }

  document.addEventListener("click", async function(e){
    var btn = e.target.closest("button[data-act]"); if (!btn) return;
    var id = btn.getAttribute("data-id");
    var act = btn.getAttribute("data-act");

    if (act==="results"){ location.href = resultsUrl(id); }
    if (act==="copy"){ copy(pollUrl(id)); toast("Link copiado"); }

    if (act==="qr"){
      var link = pollUrl(id);
      qrModalBox.innerHTML = "";
      await renderQR(qrModalBox, link);
      qrLink.textContent = link;
      qrModal.classList.add("show");
    }

    if (act==="toggle"){
      try{
        var ref = db.collection("polls").doc(id);
        var doc = await ref.get(); if (!doc.exists) return toast("No existe el poll", "bad");
        var cur = !!doc.data().is_open;
        await ref.update({ is_open: !cur });
        toast("Estado actualizado");
        loadPolls();
      }catch(err){ console.error(err); toast("No se pudo cambiar el estado", "bad"); }
    }

    if (act==="delete"){
      if (!confirm("¿Eliminar encuesta y sus votos?")) return;
      try{
        var batch = db.batch();
        var vs = await db.collection("votes").where("poll_id","==",id).get();
        vs.forEach(function(d){ batch.delete(d.ref); });
        var pjs = await db.collection("poll_judges").where("poll_id","==",id).get();
        pjs.forEach(function(d){ batch.delete(d.ref); });
        batch.delete(db.collection("polls").doc(id));
        await batch.commit();
        toast("Encuesta eliminada");
        loadPolls();
      }catch(err){ console.error(err); toast("No se pudo eliminar", "bad"); }
    }
  });

  btnClose.onclick = function(){ qrModal.classList.remove("show"); };
  btnCopy.onclick = function(){ copy(qrLink.textContent); toast("Link copiado"); };

  loadPolls();
})();
