(function(){
  var App = window.App||{};
  var supabase = App.supabase, qs = App.qs, $ = App.$, fmt = App.fmt, WJ = App.WEIGHT_JUDGES, WP = App.WEIGHT_PUBLIC, toast = App.toast;

  var pollId = qs("poll");
  var poll = null;

  function setHeader(){
    $("#header").style.display = "block";
    $("#rTitle").textContent = poll.title;
    $("#rCand").textContent = poll.candidate_name || "";
    if (poll.image_url){ var i=$("#rPhoto"); i.src=poll.image_url; i.style.display="block"; }
    $("#rState").textContent = (poll.is_open===false) ? "Cerrada" : "Abierta";
    $("#rState").className = "tag " + ((poll.is_open===false) ? "bad" : "ok");
  }

  async function pickOrLoad(){
    if (!pollId){
      $("#pickPoll").style.display = "block";
      var q = await supabase.from("polls").select("*").order("created_at", {ascending:false});
      var html = (q.data||[]).map(function(p){
        return "<div class='card'>"
          + "<h4>"+p.title+"</h4>"
          + "<p class='small'>"+(p.candidate_name||"")+"</p>"
          + "<button onclick=\"location.href='results.html?poll="+p.id+"'\">Ver resultados</button>"
          + "</div>";
      }).join("");
      $("#pollList").innerHTML = html || "<p class='small'>No hay encuestas</p>";
      return false;
    }
    var res = await supabase.from("polls").select("*").eq("id", pollId).single();
    if (res.error){ toast("No se encontró la encuesta", "bad"); return false; }
    poll = res.data;
    setHeader();
    $("#btnShare").onclick = function(){ navigator.clipboard && navigator.clipboard.writeText(location.origin+"/vote.html?poll="+pollId); };
    $("#btnOpen").onclick = async function(){
      var upd = await supabase.from("polls").update({ is_open: !(poll.is_open===true) }).eq("id", pollId);
      if (!upd.error) toast("Estado actualizado"); else toast("No se pudo actualizar", "bad");
    };
    return true;
  }

  function render(votes){
    var judges = votes.filter(function(v){ return v.role==="judge"; });
    var publics = votes.filter(function(v){ return v.role==="public"; });
    function avg(arr){ return arr.length ? (arr.reduce(function(s,v){return s+Number(v.score||0)},0)/arr.length) : 0; }

    var aJ = avg(judges), aP = avg(publics);
    $("#stats").style.display = "grid";
    $("#lists").style.display = "grid";

    $("#avgJ").textContent = fmt(aJ);
    $("#avgP").textContent = fmt(aP);
    $("#cntJ").textContent = judges.length + " voto(s)";
    $("#cntP").textContent = publics.length + " voto(s)";
    $("#barJ").style.width = (aJ/10)*100 + "%";
    $("#barP").style.width = (aP/10)*100 + "%";

    var total = (aJ*WJ) + (aP*WP);
    $("#total").textContent = fmt(total);
    $("#barT").style.width = (total/10)*100 + "%";

    $("#listJ").innerHTML = judges.map(function(v,i){ return "<li>Juez #"+(i+1)+": "+fmt(v.score)+"</li>"; }).join("") || "<li class='small'>—</li>";
    $("#listP").innerHTML = publics.map(function(v,i){ return "<li>Público #"+(i+1)+": "+fmt(v.score)+"</li>"; }).join("") || "<li class='small'>—</li>";
  }

  async function loadVotes(){
    var q = await supabase.from("votes").select("role, score").eq("poll_id", pollId);
    if (q.error){ console.error(q.error); return; }
    render(q.data||[]);
  }

  function subscribe(){
    supabase.channel("realtime-votes")
      .on("postgres_changes",{ event:"INSERT", schema:"public", table:"votes", filter:"poll_id=eq."+pollId },function(){loadVotes()})
      .on("postgres_changes",{ event:"UPDATE", schema:"public", table:"votes", filter:"poll_id=eq."+pollId },function(){loadVotes()})
      .on("postgres_changes",{ event:"DELETE", schema:"public", table:"votes", filter:"poll_id=eq."+pollId },function(){loadVotes()})
      .subscribe();

    supabase.channel("realtime-pollstate")
      .on("postgres_changes",{ event:"UPDATE", schema:"public", table:"polls", filter:"id=eq."+pollId }, function(payload){
        poll = payload.new; setHeader();
      })
      .subscribe();
  }

  (async function(){
    if (await pickOrLoad()){
      await loadVotes();
      subscribe();
    }
  })();
})();
