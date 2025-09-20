// Results — Firestore con share robusto
(function(){
  var App = window.App||{};
  var db = App.db, qs = App.qs, $ = App.$, fmt = App.fmt, WJ = App.WEIGHT_JUDGES, WP = App.WEIGHT_PUBLIC, toast = App.toast;

  var pollId = qs("poll");
  var poll = null;

  function getBase() {
    var base = (window.__BASE_URL__ && String(window.__BASE_URL__).trim())
      || (location.origin + location.pathname.replace(/[^\/]*$/, '/'));
    if (!/\/$/.test(base)) base += '/';
    return base;
  }

  function setHeader(){
    $("#header").style.display = "block";
    $("#rTitle").textContent = poll.title || "—";
    $("#rCand").textContent = poll.candidate_name || "";
    if (poll.image_url){ var i=$("#rPhoto"); i.src=poll.image_url; i.style.display="block"; }
    $("#rState").textContent = (poll.is_open===false) ? "Cerrada" : "Abierta";
    $("#rState").className = "tag " + ((poll.is_open===false) ? "bad" : "ok");
  }

  async function pickOrLoad(){
    if (!pollId){
      $("#pickPoll").style.display = "block";
      var snap = await db.collection("polls").orderBy("created_at","desc").get();
      var html = [];
      snap.forEach(function(d){
        var p = d.data();
        html.push("<div class='card'>"
          + "<h4>"+(p.title||"-")+"</h4>"
          + "<p class='small'>"+(p.candidate_name||"")+"</p>"
          + "<button onclick=\"location.href='results.html?poll="+d.id+"'\">Ver resultados</button>"
          + "</div>");
      });
      $("#pollList").innerHTML = html.join("") || "<p class='small'>No hay encuestas</p>";
      return false;
    }

    var doc = await db.collection("polls").doc(pollId).get();
    if (!doc.exists){ toast("No se encontró la encuesta","bad"); return false; }
    poll = doc.data();
    setHeader();

    $("#btnOpen").onclick = async function(){
      try{ await db.collection("polls").doc(pollId).update({ is_open: !(poll.is_open===true) }); toast("Estado actualizado"); }
      catch(err){ console.error(err); toast("No se pudo actualizar", "bad"); }
    };

    $("#btnShare").onclick = function(){
      var u = new URL("vote.html", getBase());
      u.searchParams.set("poll", pollId);
      navigator.clipboard && navigator.clipboard.writeText(u.href);
      App.toast("Link copiado");
    };

    db.collection("polls").doc(pollId).onSnapshot(function(snap){ if (snap.exists){ poll = snap.data(); setHeader(); }});
    return true;
  }

  function render(votes){
    function avg(arr){ return arr.length ? (arr.reduce(function(s,v){return s+Number(v.score||0)},0)/arr.length) : 0; }
    var judges = votes.filter(function(v){ return v.role==="judge"; });
    var publics = votes.filter(function(v){ return v.role==="public"; });

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

  function startVotes(){
    db.collection("votes").where("poll_id","==",pollId)
      .onSnapshot(function(snap){
        var arr=[]; snap.forEach(function(d){ arr.push(d.data()); });
        render(arr);
      }, function(err){ console.error(err); });
  }

  (async function(){
    if (await pickOrLoad()){
      startVotes();
    }
  })();
})();
