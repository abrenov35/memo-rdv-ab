(function(){
  const $=id=>document.getElementById(id);
  const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const style=document.createElement('style');
  style.textContent=`
    .ai330{background:#fff;border:1px solid #dce5ee;border-radius:22px;padding:16px;margin-bottom:12px;box-shadow:0 8px 24px #082a5210}.ai330-head{display:flex;justify-content:space-between;gap:10px;align-items:center}.ai330-title{font-size:20px;font-weight:900;color:#082a52}.ai330-badge{font-size:10px;font-weight:900;padding:6px 9px;border-radius:99px;background:#eaf2fa;color:#0d5aa7}.ai330-summary{background:linear-gradient(145deg,#082a52,#0d5aa7);color:#fff;border-radius:17px;padding:14px;margin-top:12px;line-height:1.5}.ai330-piece{border:1px solid #e0e8ef;border-radius:17px;padding:13px;margin-top:12px}.ai330-piece h3{margin:0 0 8px;color:#082a52;font-size:18px}.ai330-sec{margin-top:10px}.ai330-sec b{display:block;font-size:12px;text-transform:uppercase;color:#627287;margin-bottom:4px}.ai330-line{padding:7px 0;border-top:1px solid #edf1f4;font-size:14px;line-height:1.42}.ai330-lots{display:grid;gap:9px;margin-top:10px}.ai330-lot{border-left:4px solid #0d5aa7;background:#f7faff;border-radius:12px;padding:11px}.ai330-lot h4{margin:0 0 6px;color:#082a52;font-size:15px}.ai330-warn{background:#fff7e8;border:1px solid #f1d9a8;border-radius:14px;padding:12px;margin-top:10px}.ai330-actions{background:#eef7f2;border:1px solid #cfe6d9;border-radius:14px;padding:12px;margin-top:10px}.ai330-generate{width:100%;min-height:64px;background:#082a52;color:#fff;border-radius:16px;font-weight:900;font-size:17px;margin-top:12px}.ai330-generate:disabled{opacity:.55}.ai330-raw{margin-top:12px;font-size:12px;color:#6f7e91}
  `;
  document.head.appendChild(style);

  function lines(title,a){if(!Array.isArray(a)||!a.length)return'';return '<div class="ai330-sec"><b>'+esc(title)+'</b>'+a.map(x=>'<div class="ai330-line">'+esc(x)+'</div>').join('')+'</div>'}
  function renderReport(card,r){
    card.innerHTML='<div class="ai330-head"><div class="ai330-title">✨ Préparation du devis par IA</div><span class="ai330-badge">RELUE & STRUCTURÉE</span></div>'+
      '<div class="ai330-summary"><b>Synthèse du projet</b><br>'+esc(r.synthese_projet||'')+'</div>'+
      (r.pieces||[]).map(p=>'<div class="ai330-piece"><h3>'+esc(p.nom||'Zone')+'</h3>'+lines('Constats',p.constats)+lines('Travaux à prévoir',p.travaux)+lines('Métrés validés',p.metres)+lines('Éléments techniques',p.technique)+lines('Photos / commentaires',p.photos)+lines('Points à confirmer',p.points_a_confirmer)+'</div>').join('')+
      '<div class="ai330-sec"><b>Synthèse par lot pour chiffrage</b><div class="ai330-lots">'+(r.synthese_lots||[]).map(l=>'<div class="ai330-lot"><h4>'+esc(l.lot||'Lot')+'</h4>'+(l.prestations||[]).map(x=>'<div class="ai330-line">'+esc(x)+'</div>').join('')+'</div>').join('')+'</div></div>'+
      ((r.points_a_confirmer||[]).length?'<div class="ai330-warn"><b>⚠ Points à confirmer avant devis</b>'+ (r.points_a_confirmer||[]).map(x=>'<div class="ai330-line">'+esc(x)+'</div>').join('')+'</div>':'')+
      ((r.actions_ab_renov||[]).length?'<div class="ai330-actions"><b>✓ Actions AB RENOV</b>'+ (r.actions_ab_renov||[]).map(x=>'<div class="ai330-line">'+esc(x)+'</div>').join('')+'</div>':'');
  }

  async function generate(id,card,btn){
    btn.disabled=true;btn.textContent='✨ Relecture et rédaction IA en cours…';
    try{
      const body=new URLSearchParams({action:'generateReportAI',idRdv:id});
      const res=await fetch(window.API||'https://script.google.com/macros/s/AKfycbzq2sNhxV9PnOktzS8UUIypcvguyc58s8GMd_3D4VjSxUirx-XR-3bsC_yF9zFGNWqGww/exec',{method:'POST',body});
      const j=await res.json();if(!j.ok)throw new Error(j.error||'IA indisponible');
      if(j.report)renderReport(card,j.report);else card.innerHTML='<div class="ai330-title">Compte-rendu IA</div><div class="ai330-raw">'+esc(j.rapportComplet||'Rapport généré.')+'</div>';
    }catch(e){btn.disabled=false;btn.textContent='✨ Réessayer la rédaction IA';const m=document.createElement('div');m.className='ai330-warn';m.textContent=e.message;card.appendChild(m)}
  }

  function inject(id){
    const root=$('reportContent');if(!root||root.querySelector('.ai330'))return;
    const card=document.createElement('div');card.className='ai330';card.innerHTML='<div class="ai330-head"><div class="ai330-title">✨ Préparation du devis par IA</div><span class="ai330-badge">RELECTURE MÉTIER</span></div><div class="mut" style="margin-top:7px">L’IA corrige la dictée, supprime les répétitions, conserve les informations techniques et prépare les prestations à chiffrer par pièce puis par lot.</div><button class="ai330-generate">✨ Relire et préparer le devis</button>';
    const head=root.querySelector('.reportHead');head?head.after(card):root.prepend(card);
    const btn=card.querySelector('.ai330-generate');btn.onclick=()=>generate(id,card,btn);
  }

  function wrap(){const old=window.openReport;if(typeof old!=='function'||old.__ai330)return;const w=async function(id){await old(id);setTimeout(()=>inject(id),0)};w.__ai330=true;window.openReport=w}
  function boot(){const v=document.querySelector('.ver');if(v)v.textContent='V3.3.0';wrap()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();