import { supabase, qs, $, fmt, WEIGHT_JUDGES, WEIGHT_PUBLIC, toast } from "./app.js";

const pollId = qs("poll");
let poll = null;

function setHeader(){
  $("#header").style.display = "block";
  $("#rTitle").textContent = poll.title;
  $("#rCand").textContent = poll.candidate_name || "";
  if (poll.image_url){ const i=$("#rPhoto"); i.src=poll.image_url; i.style.display="block"; }
  $("#rState").textContent = poll.is_open===false? "Cerrada":"Abierta";
  $("#rState").className = "tag " + (poll.is_open===false? "bad":"ok");
}

async function pickOrLoad(){
  if (!pollId){
    $("#pickPoll").style.display = "block";
    const { data } = await supabase.from("polls").select("*").order("created_at", {ascending:false});
    $("#pollList").innerHTML = (data||[]).map(p=>{
      return `<div class="card">
        <h4>${p.title}</h4>
        <p class="small">${p.candidate_name ?? ""}</p>
        <button onclick="location.href='results.html?poll=${p.id}'">Ver resultados</button>
      </div>`;
    }).join("") || "<p class='small'>No hay encuestas</p>";
    return false;
  }
  const { data, error } = await supabase.from("polls").select("*").eq("id", pollId).single();
  if (error){ toast("No se encontró la encuesta", "bad"); return false; }
  poll = data;
  setHeader();
  $("#btnShare").onclick = ()=> navigator.clipboard?.writeText(`${location.origin}/vote.html?poll=${pollId}`);
  $("#btnOpen").onclick = async ()=>{
    const { error } = await supabase.from("polls").update({ is_open: !(poll.is_open===false) }).eq("id", pollId);
    if (!error) toast("Estado actualizado"); else toast("No se pudo actualizar", "bad");
  };
  return true;
}

function render(votes){
  const judges = votes.filter(v => v.role==="judge");
  const publics = votes.filter(v => v.role==="public");

  const avg = arr => arr.length ? (arr.reduce((s,v)=>s+Number(v.score||0),0)/arr.length) : 0;
  const aJ = avg(judges), aP = avg(publics);

  $("#stats").style.display = "grid";
  $("#lists").style.display = "grid";

  $("#avgJ").textContent = fmt(aJ);
  $("#avgP").textContent = fmt(aP);
  $("#cntJ").textContent = `${judges.length} voto(s)`;
  $("#cntP").textContent = `${publics.length} voto(s)`;
  $("#barJ").style.width = `${(aJ/10)*100}%`;
  $("#barP").style.width = `${(aP/10)*100}%`;

  const total = (aJ*WEIGHT_JUDGES) + (aP*WEIGHT_PUBLIC);
  $("#total").textContent = fmt(total);
  $("#barT").style.width = `${(total/10)*100}%`;

  $("#listJ").innerHTML = judges.map(j=>`<li>Juez <strong>${j.user_code}</strong>: ${fmt(j.score)}</li>`).join("") || "<li class='small'>—</li>";
  $("#listP").innerHTML = publics.map(p=>`<li>${p.user_code}: ${fmt(p.score)}</li>`).join("") || "<li class='small'>—</li>";
}

async function loadVotes(){
  const { data, error } = await supabase.from("votes").select("*").eq("poll_id", pollId);
  if (error){ console.error(error); return; }
  render(data||[]);
}

// Realtime votos + cambios de estado de la poll
function subscribe(){
  supabase.channel("realtime-votes")
    .on("postgres_changes",{ event:"INSERT", schema:"public", table:"votes", filter:`poll_id=eq.${pollId}` },()=>loadVotes())
    .on("postgres_changes",{ event:"UPDATE", schema:"public", table:"votes", filter:`poll_id=eq.${pollId}` },()=>loadVotes())
    .on("postgres_changes",{ event:"DELETE", schema:"public", table:"votes", filter:`poll_id=eq.${pollId}` },()=>loadVotes())
    .subscribe();

  supabase.channel("realtime-pollstate")
    .on("postgres_changes",{ event:"UPDATE", schema:"public", table:"polls", filter:`id=eq.${pollId}` }, payload=>{
      poll = payload.new; setHeader();
    })
    .subscribe();
}

if (await pickOrLoad()){
  await loadVotes();
  subscribe();
}
