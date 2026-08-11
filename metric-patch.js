(function(){
  const $=id=>document.getElementById(id);
  function cap(s){return String(s||'').trim().replace(/^./,c=>c.toUpperCase()).replace(/^Sdb\b/i,'Salle de bains')}
  function fullRoom(text){
    const s=String(text||'').replace(/[’]/g,"'");
    const roomRe=/(chambre(?:\s+(?:bébé|parentale|enfant|amis|invités?|1|2|3|4|5))?|bureau(?:\s+[\wÀ-ÿ'-]+){0,2}|cuisine(?:\s+[\wÀ-ÿ'-]+){0,2}|salon(?:\s+[\wÀ-ÿ'-]+){0,2}|séjour(?:\s+[\wÀ-ÿ'-]+){0,2}|salle de bains?(?:\s+[\wÀ-ÿ'-]+){0,2}|sdb(?:\s+[\wÀ-ÿ'-]+){0,2}|wc(?:\s+[\wÀ-ÿ'-]+){0,2}|toilettes?(?:\s+[\wÀ-ÿ'-]+){0,2}|couloir(?:\s+[\wÀ-ÿ'-]+){0,2}|entrée(?:\s+[\wÀ-ÿ'-]+){0,2}|garage(?:\s+[\wÀ-ÿ'-]+){0,2}|buanderie(?:\s+[\wÀ-ÿ'-]+){0,2}|cellier(?:\s+[\wÀ-ÿ'-]+){0,2}|terrasse(?:\s+[\wÀ-ÿ'-]+){0,2}|dressing(?:\s+[\wÀ-ÿ'-]+){0,2}|palier(?:\s+[\wÀ-ÿ'-]+){0,2}|cave(?:\s+[\wÀ-ÿ'-]+){0,2}|combles?(?:\s+[\wÀ-ÿ'-]+){0,2})/i;
    const stop=/\b(?:fait|mesure|de|du|des|avec|où|qui|et|il|elle|prévoir|à|a|pour|mur|porte|fenêtre|verrière|ouverture|plafond|sol)\b/i;
    const m=s.match(roomRe); if(!m) return '';
    let v=m[1]||m[0];
    let parts=v.split(/\s+/), out=[];
    for(const p of parts){ if(out.length>0 && stop.test(p)) break; out.push(p); }
    return cap(out.join(' '));
  }
  function norm(t){return String(t||'').toLowerCase().replace(/[’]/g,"'").replace(/,/g,'.').replace(/virgule/g,'.').replace(/(\d+)\s*(?:m|mètre|mètres)\s*(\d{1,2})\b/g,'$1.$2m').replace(/(\d+)\s*(?:cm|centimètres?)\b/g,(_,a)=>(Number(a)/100).toFixed(2)+'m')}
  function d(v){let n=Number(v);if(n>20&&n<=500)n/=100;return n>0&&n<=30?n:0}
  function obj(t){let m=String(t||'').match(/\b(mur|cloison|porte|fenêtre|verrière|ouverture|receveur|niche|placard|plan de travail|plafond|sol|façade|escalier|baie(?: vitrée)?|radiateur|meuble|douche|vasque)\b/i);return m?cap(m[1]):''}
  window.roomFromText=fullRoom;
  window.detectMetrics=function(text){
    let n=norm(text), piece=fullRoom(text)||(window.S&&S.currentPiece)||'', designation=obj(text)||(piece?'Pièce':'Métré'), out=[],m;
    const pair=/(\d+(?:\.\d+)?)\s*(?:m|mètre|mètres)?\s*(?:par|x|fois|sur)\s*(\d+(?:\.\d+)?)\s*(?:m|mètre|mètres)?/gi;
    while((m=pair.exec(n))){let a=d(m[1]),b=d(m[2]);if(a&&b)out.push({piece,designation,a,b,phrase:String(text||'')})}
    return out;
  };
  function ensureNote(){
    let note=$('metricOriginal'); if(note) return note;
    note=document.createElement('div'); note.id='metricOriginal'; note.style.cssText='margin:10px 0;padding:12px;border-radius:12px;background:#f7faff;border:1px solid #d6e5f4;font-size:14px;line-height:1.45;color:#31445b';
    const hero=$('metricHero'); if(hero&&hero.parentNode) hero.parentNode.insertBefore(note,hero.nextSibling);
    return note;
  }
  function renderFromText(t){
    const txt=String(t||'').trim(); if(!txt) return;
    ensureNote().innerHTML='<b>Note dictée associée</b><br>'+txt.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
    const m=window.detectMetrics(txt)[0];
    if($('metricVoiceText')) $('metricVoiceText').textContent='Entendu : '+txt;
    const p=fullRoom(txt); if(p&&$('mPiece')) $('mPiece').value=p;
    const o=obj(txt); if(o&&$('mDesignation')) $('mDesignation').value=o;
    if(m){
      $('mL').value=m.a||''; $('mW').value=m.b||'';
      if($('metricBig')) $('metricBig').textContent=Number(m.a).toFixed(2).replace('.',',')+' × '+Number(m.b).toFixed(2).replace('.',',')+' m';
      if($('metricContext')) $('metricContext').textContent=(m.piece||'Zone à préciser')+' · '+(m.designation||'Métré');
      if($('metricHero')) $('metricHero').classList.remove('hidden');
      if(window.S) S.pendingMetric={...(S.pendingMetric||{}),...m,phrase:txt};
    }
  }
  function bind(){
    const btn=$('metricVoice'); if(!btn) return;
    btn.onclick=function(){
      if(window.S&&S.metricRec) return;
      const C=window.SpeechRecognition||window.webkitSpeechRecognition;
      if(!C){ if(window.toast) toast('Micro indisponible'); return; }
      const r=new C; if(window.S) S.metricRec=r;
      r.lang='fr-FR';r.interimResults=true;r.continuous=false;r.maxAlternatives=5;
      let finalText='';
      btn.textContent='🔴 Parlez…'; btn.style.background='#fee9ea'; btn.style.color='#a9232c';
      if($('metricVoiceText')) $('metricVoiceText').textContent='Je vous écoute…';
      r.onresult=e=>{
        let interim='';
        for(let i=e.resultIndex;i<e.results.length;i++){
          const t=(e.results[i][0]?.transcript||'').trim();
          if(e.results[i].isFinal) finalText=(finalText+' '+t).trim(); else interim=(interim+' '+t).trim();
        }
        const shown=(finalText+' '+interim).trim();
        if($('metricVoiceText')) $('metricVoiceText').textContent=shown?'Entendu : '+shown:'Je vous écoute…';
        if(shown){ const p=fullRoom(shown); if(p&&$('mPiece')) $('mPiece').value=p; }
      };
      r.onend=()=>{
        if(window.S) S.metricRec=null;
        btn.textContent='🎙️ Redicter la cote';btn.style.background='';btn.style.color='';
        if(finalText) renderFromText(finalText); else if($('metricVoiceText')&&!$('metricVoiceText').textContent.includes('Entendu')) $('metricVoiceText').textContent='Aucun texte reconnu. Réessayez.';
      };
      r.onerror=e=>{if($('metricVoiceText')) $('metricVoiceText').textContent='Erreur micro : '+e.error;};
      try{r.start()}catch(e){if(window.S)S.metricRec=null;btn.textContent='🎙️ Redicter la cote';}
    };
    const oldOpen=window.openMetric;
    if(typeof oldOpen==='function') window.openMetric=function(m){oldOpen(m);const note=ensureNote();const phrase=(m&&m.phrase)||'';note.innerHTML=phrase?'<b>Note dictée associée</b><br>'+phrase.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])):'<b>Note dictée associée</b><br><span style="color:#718095">Aucune note vocale associée.</span>';};
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);else bind();
})();