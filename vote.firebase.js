// Vote — Firestore (sin ESM)
(function(){
  var App = window.App||{};
  var db = App.db, qs = App.qs, $ = App.$, fmt = App.fmt, toast = App.toast;

  var pollId = qs("poll");
  var userCode = null;
  var roleForVote = null;
  var pollObj = null;

  function setStateTag(isOpen){
    var tag = $("#stateTag");
    tag.textContent = isOpen ? "Abierta" : "Cerrada";
    tag.className = "tag " + (isOpen ? "ok":"bad");
    $("#check").disabled = !isOpen;
  }

  $("#score").addEventListener("input", function(e){
    var v = parseFloat(e.target.value || 0);
    $("#scoreValue").textContent = fmt(v);
    $("#scoreBar").style.width = (v/10)*100 + "%";
  });

  async function loadPoll(){
    try{
      var doc = await db.collection("polls").doc(pollId).get();
      if (!doc.exists) return toast("No se encontró la encuesta", "bad");
      var p = doc.data(); pollObj = p;
      $("#title").textContent = p.title || "Votación";
      $("#candidate").textContent = p.candidate_name || "";
      if (p.image_url){ var img=$("#photo"); img.src=p.image_url; img.style.display="block"; }
      setStateTag(p.is_open===true);

      db.collection("polls").doc(pollId).onSnapshot(function(snap){
        var np = snap.data(); if (!np) return;
        pollObj = np; setStateTag(np.is_open===true);
      });
    }catch(err){ console.error(err); toast("Error cargando encuesta","bad"); }
  }

  $("#check").onclick = async function(){
    var code = ($("#code").value||"").trim().toUpperCase();
    if (!code) return toast("Ingresa tu código", "warn");
    if (!pollObj || !pollObj.is_open) return toast("La encuesta está cerrada", "warn");

    try{
      var uref = db.collection("users").doc(code);
      var udoc = await uref.get();
      var role = "public";
      if (udoc.exists && udoc.data() && udoc.data().role === "judge") role = "judge";
      if (!udoc.exists){
        await uref.set({
          code: code, role: "public",
          created_at: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      }

      if (role === "judge"){
        var asg = await db.collection("poll_judges").doc(pollId + "_" + code).get();
        if (!asg.exists) return toast("No estás asignado como juez en este poll", "warn");
      }

      var vref = db.collection("votes").doc(pollId + "_" + code);
      var vdoc = await vref.get();
      if (vdoc.exists) return toast("Este código ya votó", "warn");

      userCode = code;
      roleForVote = role;
      $("#roleInfo").innerHTML = 'Votarás como <span class="tag '+(role==="judge"?"warn":"")+'">'+(role==="judge"?"JUEZ":"PÚBLICO")+'</span>';
      $("#voteArea").style.display = "block";
    }catch(err){ console.error(err); toast("No se pudo validar el código", "bad"); }
  };

  $("#submitVote").onclick = async function(){
    var score = parseFloat($("#score").value);
    if (isNaN(score)) return toast("Selecciona un puntaje", "warn");
    if (!pollObj || !pollObj.is_open) return toast("La encuesta está cerrada", "warn");
    if (!userCode) return toast("Primero valida tu código", "warn");

    if (roleForVote==="judge" && typeof pollObj.max_score_per_judge==="number" && score>pollObj.max_score_per_judge){
      return toast("Excede el máximo permitido para jueces", "warn");
    }

    $("#submitVote").disabled = true;
    try{
      await db.runTransaction(async function(tx){
        var vref = db.collection("votes").doc(pollId + "_" + userCode);
        var vdoc = await tx.get(vref);
        if (vdoc.exists) throw new Error("Este código ya votó");
        tx.set(vref, {
          poll_id: pollId,
          code: userCode,
          role: roleForVote,
          score: score,
          created_at: firebase.firestore.FieldValue.serverTimestamp()
        });
      });

      toast("Voto registrado ✅", "ok");
      $("#voteArea").style.display = "none";
    }catch(err){
      console.error(err);
      toast((err && err.message) || "No se pudo guardar el voto", "bad");
    }finally{
      $("#submitVote").disabled = false;
    }
  };

  loadPoll();
})();
