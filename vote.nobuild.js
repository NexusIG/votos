(function(){
  var App = window.App||{};
  var supabase = App.supabase, qs = App.qs, $ = App.$, fmt = App.fmt, toast = App.toast;

  var pollId = qs("poll");
  var userCode = null;
  var pollObj = null;

  async function loadPoll(){
    var res = await supabase.from("polls").select("*").eq("id", pollId).single();
    if (res.error || !res.data){ toast("No se encontró la encuesta", "bad"); return false; }
    var poll = res.data; pollObj = poll;
    $("#title").textContent = poll.title;
    $("#candidate").textContent = poll.candidate_name || "";
    if (poll.image_url){ var img=$("#photo"); img.src=poll.image_url; img.style.display="block"; }
    setStateTag(poll.is_open===true);
    return true;
  }

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

  $("#check").onclick = async function(){
    var code = ($("#code").value||"").trim();
    if (!code) return toast("Ingresa tu código/carnet", "warn");
    if (!pollObj || !pollObj.is_open) return toast("La encuesta está cerrada", "warn");

    var r = await supabase.rpc("check_code_for_poll", { p_poll_id: pollId, p_code: code });
    if (r.error){ console.error(r.error); return toast(r.error.message || "Error verificando código", "bad"); }
    var data = r.data;
    if (!data || !data.ok) return toast((data && data.message) || "Código inválido", "bad");
    if (!data.allowed && data.role==="judge") return toast("No estás asignado como juez en este poll", "warn");
    if (data.already_voted) return toast("Este código ya votó", "warn");

    userCode = code;
    $("#roleInfo").innerHTML = 'Votarás como <span class="tag '+(data.role==="judge"?"warn":"")+'">'+(data.role==="judge"?"JUEZ":"PÚBLICO")+'</span>';
    $("#voteArea").style.display = "block";
  };

  $("#submitVote").onclick = async function(){
    var score = parseFloat($("#score").value);
    if (isNaN(score)) return toast("Selecciona un puntaje", "warn");
    if (!pollObj || !pollObj.is_open) return toast("La encuesta está cerrada", "warn");

    $("#submitVote").disabled = true;
    try{
      var r = await supabase.rpc("submit_vote", { p_poll_id: pollId, p_code: userCode, p_score: score, p_as_public: false });
      if (r.error) throw r.error;
      if (!r.data || !r.data.ok) return toast((r.data && r.data.message) || "No se pudo votar", "bad");

      toast("Voto registrado ✅", "ok");
      $("#voteArea").style.display = "none";
    }catch(err){
      console.error(err);
      toast((err && err.message) || "No se pudo guardar el voto", "bad");
    }finally{
      $("#submitVote").disabled = false;
    }
  };

  supabase.channel("realtime-polls")
    .on("postgres_changes", { event:"UPDATE", schema:"public", table:"polls", filter:"id=eq."+pollId },
      function(payload){ setStateTag(payload.new.is_open===true); })
    .subscribe();

  loadPoll();
})();
