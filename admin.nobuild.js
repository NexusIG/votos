// Sin imports ni destructuring, para evitar el "Unexpected token '{'"
(function(){
  var App = window.App || {};
  var supabase = App.supabase, $ = App.$, toast = App.toast, copy = App.copy;

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

  function pollUrl(id){ return location.origin + "/vote.html?poll=" + id; }
  function resultsUrl(id){ return "results.html?poll=" + id; }

  createBtn.onclick = async function (){
    try {
      var title = (titleInput.value||"").trim();
      var candidate = (candidateInput.value||"").trim();
      var image = (imageInput.value||"").trim();
      var rawJudges = (judgesInput.value||"").trim();
      if (!title) return toast("El título es obligatorio", "warn");

      var ins = await supabase.from("polls")
        .insert([{ title: title, candidate_name: candidate||null, image_url: image||null, is_open: true }])
        .select().single();
      if (ins.error) throw ins.error;
      var poll = ins.data;

      if (rawJudges) {
        var codes = rawJudges.split(",").map(function(s){return s.trim()}).filter(Boolean);
        if (codes.length){
          var up = await supabase.from("users").upsert(codes.map(function(c){return { code:c, role:"judge" }}), { onConflict:"code" });
          if (up.error) console.warn("Upsert users:", up.error);

          var sel = await supabase.from("users").select("id, code").in("code", codes);
          var pjRows = (sel.data||[]).map(function(u){ return { poll_id: poll.id, user_id: u.id }});
          if (pjRows.length){
            var pj = await supabase.from("poll_judges").insert(pjRows);
            if (pj.error) console.warn("Insert poll_judges:", pj.error);
          }
        }
      }

      qrContainer.innerHTML = "";
      new QRCode(qrContainer, { text: pollUrl(poll.id), width: 256, height: 256 });
      resultsBtn.style.display = "inline-block";
      resultsBtn.onclick = function(){ location.href = resultsUrl(poll.id); };
      toast("Encuesta creada ✅");
      await loadPolls();
    } catch (err) {
      console.error(err);
      toast((err && err.message) || "Error creando la encuesta", "bad");
    }
  };

  async function loadPolls(){
    var tbody = $("#pollRows");
    tbody.innerHTML = "<tr><td colspan='4' class='small'>Cargando…</td></tr>";
    var q = await supabase.from("polls").select("*").order("created_at", { ascending:false });
    if (q.error){ tbody.innerHTML = "<tr><td colspan='4'>Error cargando</td></tr>"; return; }
    var data = q.data||[];
    if (!data.length){ tbody.innerHTML = "<tr><td colspan='4' class='small'>No hay encuestas</td></tr>"; return; }

    tbody.innerHTML = data.map(function(p){
      var state = (p.is_open===false) ? "<span class='tag bad'>Cerrada</span>" : "<span class='tag ok'>Abierta</span>";
      var created = p.created_at ? new Date(p.created_at).toLocaleString() : "-";
      return "<tr>"
        + "<td>"+p.title+"</td>"
        + "<td>"+state+"</td>"
        + "<td>"+created+"</td>"
        + "<td>"
          + "<button class='secondary' data-act='results' data-id='"+p.id+"'>Resultados</button>"
          + "<button class='ghost' data-act='qr' data-id='"+p.id+"'>QR</button>"
          + "<button class='warning' data-act='toggle' data-id='"+p.id+"'>"+(p.is_open===false?"Abrir":"Cerrar")+"</button>"
          + "<button class='danger' data-act='delete' data-id='"+p.id+"'>Eliminar</button>"
          + "<button class='secondary' data-act='copy' data-id='"+p.id+"'>Copiar link</button>"
        + "</td>"
      + "</tr>";
    }).join("");
  }

  document.addEventListener("click", async function(e){
    var btn = e.target.closest("button[data-act]");
    if (!btn) return;
    var id = btn.getAttribute("data-id");
    var act = btn.getAttribute("data-act");

    if (act==="results") location.href = "results.html?poll="+id;
    if (act==="copy"){ copy(pollUrl(id)); toast("Link copiado"); }

    if (act==="qr"){
      qrModalBox.innerHTML = "";
      new QRCode(qrModalBox, { text: pollUrl(id), width: 256, height: 256 });
      qrLink.textContent = pollUrl(id);
      qrModal.classList.add("show");
    }

    if (act==="toggle"){
      var get = await supabase.from("polls").select("is_open").eq("id", id).single();
      if (get.error){ toast("Error leyendo estado", "bad"); return; }
      var upd = await supabase.from("polls").update({ is_open: !get.data.is_open }).eq("id", id);
      if (upd.error) toast("No se pudo cambiar el estado", "bad"); else { toast("Estado actualizado"); loadPolls(); }
    }

    if (act==="delete"){
      if (!confirm("¿Eliminar encuesta y sus votos?")) return;
      await supabase.from("votes").delete().eq("poll_id", id);
      await supabase.from("poll_judges").delete().eq("poll_id", id);
      var del = await supabase.from("polls").delete().eq("id", id);
      if (del.error) toast("No se pudo eliminar", "bad"); else { toast("Encuesta eliminada"); loadPolls(); }
    }
  });

  btnClose.onclick = function(){ qrModal.classList.remove("show"); };
  btnCopy.onclick = function(){ copy(qrLink.textContent); toast("Link copiado"); };

  loadPolls();
})();
