(function(){
  const $=id=>document.getElementById(id);
  const API='https://script.google.com/macros/s/AKfycbzq2sNhxV9PnOktzS8UUIypcvguyc58s8GMd_3D4VjSxUirx-XR-3bsC_yF9zFGNWqGww/exec';
  function esc(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function cap(s){return String(s||'').trim().replace(/^./,c=>c.toUpperCase()).replace(/^Sdb\b/i,'Salle de bains')}

  /* ---------- V3.2 visual system ---------- */
  const style=document.createElement('style');
  style.textContent=`
    :root{--ab:#082a52;--ab2:#0d5aa7;--ok:#16875a;--warn:#a56a00;--soft:#f4f7fa}
    body{background:#eef3f7!important}
    .top{box-shadow:0 5px 22px #061f3d22}
    .wrap{padding-bottom:255px!important}
    .hero{padding:22px!important;border-radius:22px!important}
    .hero .title{font-size:25px!important;letter-spacing:-.3px}
    .card{border-radius:21px!important}
    button{transition:transform .06s ease,box-shadow .15s ease,opacity .15s ease;-webkit-tap-highlight-color:transparent}
    button:active{transform:scale(.985)}
    .primary,.talk,.resume{box-shadow:0 8px 20px #082a5220}
    .talk{border-radius:20px!important;min-height:96px!important}
    .tool{border-radius:18px!important;min-height:78px!important;font-size:18px!important}
    .danger{min-height:72px!important;margin-top:13px!important}
    .back,.nav,.big{border-radius:18px!important}
    .livebox{border-radius:18px!important;background:#f8fbfe!important}
    .stats{position:sticky;top:82px;z-index:8;background:#eef3f7;padding:4px 0}
    .stat{box-shadow:0 4px 12px #082a5208}
    .sheet{border-radius:26px!important;padding:20px!important}
    .modalActions{position:sticky;bottom:-1px;background:white;padding-top:10px;z-index:3}
    .metricHero{background:linear-gradient(145deg,#eef6ff,#f8fbff)!important}
    .v32-guide{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:12px 0 4px}
    .v32-step{background:#fff;border:1px solid #dce5ee;border-radius:16px;padding:13px 8px;text-align:center;font-size:12px;color:#617086}
    .v32-step b{display:block;font-size:24px;margin-bottom:5px;color:var(--ab)}
    .v32-ai{background:linear-gradient(145deg,#071f3e,#0d5aa7);color:#fff;border-radius:20px;padding:16px;margin:0 0 12px;box-shadow:0 8px 22px #082a5220}
    .v32-ai .aihead{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:7px}
    .v32-ai .aititle{font-size:18px;font-weight:900}
    .v32-ai .aistatus{font-size:10px;font-weight:900;padding:6px 8px;border-radius:99px;background:#ffffff20;border:1px solid #ffffff28}
    .v32-ai p{margin:5px 0 12px;font-size:13px;line-height:1.45;color:#dce9f6}
    .v32-ai button{width:100%;background:#fff;color:var(--ab);min-height:62px;font-size:17px}
    .v32-ai-result{background:#fff;color:#152235;border-radius:16px;padding:14px;margin-top:10px;white-space:pre-wrap;line-height:1.5;font-size:14px}
    .metric-note{margin:10px 0;padding:13px;border-radius:14px;background:#f7faff;border:1px solid #d6e5f4;font-size:14px;line-height:1.48;color:#31445b}
    .metric-live{min-height:52px;display:flex;align-items:center;justify-content:center;padding:10px;border-radius:13px;background:#f5f8fb;margin-top:8px;font-size:14px;color:#42566e;text-align:center}
    .historyCard{position:relative;padding-right:48px!important}
    .historyCard:after{content:'›';position:absolute;right:18px;top:50%;transform:translateY(-50%);font-size:28px;color:#9aa7b5}
    @media(max-width:390px){.v32-guide{grid-template-columns:1fr 1fr 1fr}.v32-step{padding:10px 4px;font-size:11px}.v32-step b{font-size:21px}}
  `;
  document.head.appendChild(style);

  /* ---------- precise room/location parsing ---------- */
  function fullRoom(text){
    const s=String(text||'').replace(/[’]/g,"'");
    const roomRe=/(chambre(?:\s+(?:bébé|parentale|enfant|amis|invités?|[1-9]|rdc|étage))?|bureau(?:\s+(?:[1-9]|rdc|étage|principal|enfant))?|cuisine(?:\s+(?:ouverte|fermée|rdc|étage))?|salon(?:\s+(?:principal|rdc|étage))?|séjour(?:\s+(?:principal|rdc|étage))?|salle de bains?(?:\s+(?:[1-9]|rdc|étage|parents?|enfants?))?|sdb(?:\s+(?:[1-9]|rdc|étage))?|wc(?:\s+(?:[1-9]|rdc|étage))?|toilettes?(?:\s+(?:rdc|étage))?|couloir(?:\s+(?:rdc|étage))?|entrée|garage(?:\s+(?:[1-9]|principal))?|buanderie|cellier|terrasse(?:\s+(?:avant|arrière))?|dressing|palier(?:\s+(?:rdc|étage))?|cave|combles?)/i;
    const m=s.match(roomRe);return m?cap(m[1]||m[0]):'';
  }
  function norm(t){return String(t||'').toLowerCase().replace(/[’]/g,"'").replace(/,/g,'.').replace(/virgule/g,'.').replace(/(\d+)\s*(?:m|mètre|mètres)\s*(\d{1,2})\b/g,'$1.$2m').replace(/(\d+)\s*(?:cm|centimètres?)\b/g,(_,a)=>(Number(a)/100).toFixed(2)+'m')}
  function d(v){let n=Number(v);if(n>20&&n<=500)n/=100;return n>0&&n<=30?n:0}
  function obj(t){let m=String(t||'').match(/\b(mur(?:\s+(?:côté\s+)?[\wÀ-ÿ'-]+){0,3}|cloison|porte|fenêtre|verrière|ouverture|receveur|niche|placard|plan de travail|plafond|sol|façade|escalier|baie(?: vitrée)?|radiateur|meuble|douche|vasque)\b/i);return m?cap(m[1]):''}
  window.roomFromText=fullRoom;
  window.detectMetrics=function(text){
    const n=norm(text),piece=fullRoom(text)||(window.S&&S.currentPiece)||'',designation=obj(text)||(piece?'Pièce':'Métré'),out=[];let m;
    const pair=/(\d+(?:\.\d+)?)\s*(?:m|mètre|mètres)?\s*(?:par|x|fois|sur)\s*(\d+(?:\.\d+)?)\s*(?:m|mètre|mètres)?/gi;
    while((m=pair.exec(n))){const a=d(m[1]),b=d(m[2]);if(a&&b)out.push({piece,designation,a,b,phrase:String(text||'')})}
    return out;
  };

  /* ---------- metric modal ---------- */
  function ensureMetricUI(){
    const hero=$('metricHero');if(!hero)return;
    let note=$('metricOriginal');
    if(!note){note=document.createElement('div');note.id='metricOriginal';note.className='metric-note';hero.parentNode.insertBefore(note,hero.nextSibling)}
    const voice=$('metricVoiceText');if(voice)voice.className='metric-live';
  }
  function showMetricText(t){
    const txt=String(t||'').trim();if(!txt)return;
    ensureMetricUI();
    $('metricOriginal').innerHTML='<b>Phrase associée au métré</b><br>'+esc(txt);
    const m=window.detectMetrics(txt)[0],p=fullRoom(txt),o=obj(txt);
    if($('metricVoiceText'))$('metricVoiceText').textContent='Entendu : '+txt;
    if(p&&$('mPiece'))$('mPiece').value=p;
    if(o&&$('mDesignation'))$('mDesignation').value=o;
    if(m){
      $('mL').value=m.a||'';$('mW').value=m.b||'';
      $('metricBig').textContent=Number(m.a).toFixed(2).replace('.',',')+' × '+Number(m.b).toFixed(2).replace('.',',')+' m';
      $('metricContext').textContent=(m.piece||'Localisation à préciser')+' · '+(m.designation||'Métré');
      $('metricHero').classList.remove('hidden');
      if(window.S)S.pendingMetric={...(S.pendingMetric||{}),...m,phrase:txt};
    }
  }
  function bindMetric(){
    ensureMetricUI();const btn=$('metricVoice');if(!btn)return;
    btn.onclick=function(){
      if(window.S&&S.metricRec)return;
      const C=window.SpeechRecognition||window.webkitSpeechRecognition;if(!C){window.toast&&toast('Micro indisponible');return}
      const r=new C;if(window.S)S.metricRec=r;r.lang='fr-FR';r.interimResults=true;r.continuous=false;r.maxAlternatives=5;
      let finalText='',lastShown='';btn.textContent='🔴 ÉCOUTE EN COURS — TOUCHEZ POUR ARRÊTER';btn.style.background='#c9343d';btn.style.color='#fff';
      $('metricVoiceText').textContent='Je vous écoute…';
      r.onresult=e=>{let interim='';for(let i=e.resultIndex;i<e.results.length;i++){const t=(e.results[i][0]?.transcript||'').trim();if(e.results[i].isFinal)finalText=(finalText+' '+t).trim();else interim=(interim+' '+t).trim()}lastShown=(finalText+' '+interim).trim();$('metricVoiceText').textContent=lastShown?'Entendu : '+lastShown:'Je vous écoute…';const p=fullRoom(lastShown);if(p)$('mPiece').value=p};
      r.onend=()=>{if(window.S)S.metricRec=null;btn.textContent='🎙️ Redicter / corriger';btn.style.background='';btn.style.color='';if(finalText||lastShown)showMetricText(finalText||lastShown);else $('metricVoiceText').textContent='Aucun texte reconnu — touchez pour réessayer.'};
      r.onerror=e=>{$('metricVoiceText').textContent='Micro : '+e.error;};
      try{r.start()}catch(e){if(window.S)S.metricRec=null;btn.textContent='🎙️ Redicter / corriger'}
    };
    const oldOpen=window.openMetric;
    if(typeof oldOpen==='function')window.openMetric=function(m){oldOpen(m);ensureMetricUI();const phrase=(m&&m.phrase)||'';$('metricOriginal').innerHTML=phrase?'<b>Phrase associée au métré</b><br>'+esc(phrase):'<b>Phrase associée au métré</b><br><span style="color:#718095">Métré manuel — aucune phrase dictée.</span>'};
  }

  /* ---------- simplified field navigation ---------- */
  function improveHome(){
    const home=$('home');if(!home||$('v32Guide'))return;
    const g=document.createElement('div');g.id='v32Guide';g.className='v32-guide';g.innerHTML='<div class="v32-step"><b>🎙️</b>Dicter</div><div class="v32-step"><b>📐</b>Mesurer</div><div class="v32-step"><b>📷</b>Photographier</div>';
    const hero=home.querySelector('.hero');hero&&hero.after(g);
    if($('newBtn'))$('newBtn').innerHTML='＋ &nbsp;COMMENCER UNE VISITE';
    if($('visitsBtn'))$('visitsBtn').innerHTML='📋 &nbsp;RETROUVER MES VISITES';
  }
  function improveVisit(){
    if($('metricBtn'))$('metricBtn').innerHTML='📐<br><b>AJOUTER UN MÉTRÉ</b>';
    if($('photoBtn'))$('photoBtn').innerHTML='📷<br><b>PRENDRE UNE PHOTO</b>';
    if($('finish'))$('finish').innerHTML='✓ &nbsp;TERMINER ET PRÉPARER LE COMPTE-RENDU';
  }

  /* ---------- AI report integration ---------- */
  async function postAI(id){
    const body=new URLSearchParams({action:'generateReportAI',idRdv:id});
    const res=await fetch(API,{method:'POST',body});const j=await res.json();if(!j.ok)throw new Error(j.error||'IA indisponible');return j;
  }
  function injectAI(id){
    if(!$('reportContent')||$('aiReportCard'))return;
    const card=document.createElement('div');card.id='aiReportCard';card.className='v32-ai';
    card.innerHTML='<div class="aihead"><div class="aititle">✨ Compte-rendu IA</div><div id="aiStatus" class="aistatus">PRÊT À ANALYSER</div></div><p>L’IA transforme les notes brutes, métrés et commentaires photos en compte-rendu professionnel, pièce par pièce puis par lots pour le devis. Aucune donnée technique ne doit être inventée.</p><button id="aiGenerate">✨ GÉNÉRER LE COMPTE-RENDU PROFESSIONNEL</button><div id="aiResult" class="v32-ai-result hidden"></div>';
    const head=$('reportContent').querySelector('.reportHead');head?head.after(card):$('reportContent').prepend(card);
    $('aiGenerate').onclick=async()=>{const b=$('aiGenerate'),st=$('aiStatus'),out=$('aiResult');b.disabled=true;b.textContent='Analyse en cours…';st.textContent='IA EN COURS';try{const j=await postAI(id);st.textContent='RAPPORT PRÊT';b.textContent='↻ REFAIRE L’ANALYSE';out.classList.remove('hidden');out.textContent=j.rapportComplet||j.report||j.resume||'Compte-rendu généré et enregistré.';}catch(e){st.textContent='IA À CONNECTER';b.textContent='✨ RÉESSAYER';out.classList.remove('hidden');out.textContent='Le design IA est prêt, mais le GAS doit exposer l’action generateReportAI. '+e.message;}finally{b.disabled=false}};
  }
  function wrapReport(){
    const old=window.openReport;if(typeof old!=='function'||old.__v32)return;
    const wrapped=async function(id){await old(id);setTimeout(()=>injectAI(id),0)};wrapped.__v32=true;window.openReport=wrapped;
  }

  function boot(){
    const ver=document.querySelector('.ver');if(ver)ver.textContent='V3.2.0';
    improveHome();improveVisit();bindMetric();wrapReport();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();