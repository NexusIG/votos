import { supabase, qs, $, fmt, toast } from "./app.js";

const pollId = qs("poll");
let userCode = null;
let finalRole = null;
let pollObj = null;

async function loadPoll(){
  const { data: poll, error } = await supabase.from("polls").select("*").eq("id", pollId).single();
  if (error || !poll){ toast("No se encontró la encuesta", "bad"); return false; }
  pollObj = poll;
  $("#title").textContent = poll.title;
  $("#candidate").textContent = poll.candidate_name || "";
  if (poll.image_url){ const img=$("#photo"); img.src=poll.image_url; img.style.display = "block"; }
  setStateTag(poll.is_open!==false);
  return true;
}

function setStateTag(isOpen){
  const tag = $("#stateTag");
  tag.textContent = isOpen ? "Abierta" : "Cerrada";
  tag.className = "tag " + (isOpen ? "ok":"bad");
  $("#check").disabled = !isOpen;
}

function localVotedKey(code){ return `voted_${pollId}:${code}` }

$("#score").addEventListener("input", (e)=>{
  const v = parseFloat(e.target.value || 0);
  $("#scoreValue").textContent = fmt(v);
  $("#scoreBar").style.width = `${(v/10)*100}%`;
});

$("#check").onclick = async () => {
  const code = $("#code").value.trim();
  if (!code) return toast("Ingresa tu carnet", "warn");
  if (pollObj?.is_open===false) return toast("La encuesta está cerrada", "warn");

  // Ver rol (juez o público)
  const { data: judge, error: judgeError } = await supabase
    .from("poll_judges").select("*").eq("poll_id", pollId).eq("user_id", code).maybeSingle();
  if (judgeError){ toast("Error verificando código", "bad"); return; }

  userCode = code;
  finalRole = judge ? "judge" : "public";
  $("#roleInfo").innerHTML = `Votarás como <span class="tag ${finalRole==="judge"?"warn":""}">${finalRole==="judge"?"JUEZ":"PÚBLICO"}</span>`;

  // ¿ya votó en servidor?
  const { data: existing } = await supabase.from("votes")
    .select("id").eq("poll_id", pollId).eq("user_code", userCode).maybeSingle();
  if (existing){ toast("Ya has votado en esta encuesta", "warn"); return; }

  // ¿ya en dispositivo?
  if (localStorage.getItem(localVotedKey(userCode))){
    toast("Ya votaste desde este dispositivo", "warn"); return;
  }

  $("#voteArea").style.display = "block";
};

$("#submitVote").onclick = async () => {
  const score = parseFloat($("#score").value);
  if (Number.isNaN(score)) return toast("Selecciona un puntaje", "warn");
  if (pollObj?.is_open===false) return toast("La encuesta está cerrada", "warn");

  $("#submitVote").disabled = true;
  try{
    const { data: existing } = await supabase.from("votes")
      .select("id").eq("poll_id", pollId).eq("user_code", userCode).maybeSingle();
    if (existing){ toast("Ya has votado", "warn"); return; }

    const { error: voteError } = await supabase.from("votes").insert([{
      poll_id: pollId,
      user_code: userCode,
      score,
      role: finalRole
    }]);

    if (voteError) throw voteError;

    localStorage.setItem(localVotedKey(userCode), "1");
    toast("Voto registrado ✅", "ok");
    $("#voteArea").style.display = "none";
  } catch(err){
    console.error(err);
    toast("No se pudo guardar el voto", "bad");
  } finally {
    $("#submitVote").disabled = false;
  }
};

// Realtime: si admin cierra/abre
supabase.channel("realtime-polls")
  .on("postgres_changes", { event:"UPDATE", schema:"public", table:"polls", filter:`id=eq.${pollId}` },
    payload => { setStateTag(payload.new.is_open!==false); })
  .subscribe();

await loadPoll();
