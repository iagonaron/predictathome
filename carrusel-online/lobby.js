(function(){
'use strict';

/* ============================================================================
   C1 · CARRUSEL ONLINE (elemental) — código propio de esta página
   ============================================================================ */
const SB='https://woiptkyrxkbpnvioypit.supabase.co';
const KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvaXB0a3lyeGticG52aW95cGl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0NzI2ODYsImV4cCI6MjA5MjA0ODY4Nn0.B2nKgj5rD0rkdLeMIrd9KgD8lUPWsBT4Y7aCtmnvbjA';
const QS=new URLSearchParams(location.search);
let SALTO=Number(QS.get('salto'))||0;              // solo para probar deprisa (desplaza el reloj de ESTA pantalla)
window.__coSalto=v=>{ SALTO=v; };
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function pintaPiano(){ const p=document.getElementById('estPiano'); const e=PCOnline.piano(); if(p) p.textContent=e==='listo'?'♪ Piano listo':(e==='error'?'♪ Sin piano de muestras (suena uno sencillo)':(e==='cargando'?'♪ Cargando el piano…':'')); }

/* ---------- cuenta (la misma que usa el portal GE) ---------- */
function cuentaId(){
  try{ const s=JSON.parse(localStorage.getItem('lmeav_session')||'null'); if(s&&s.id&&s.estado==='validado') return s.id; }catch(e){}
  try{ const m=document.cookie.match(/(?:^|;\s*)lm_cta_ge=([0-9a-fA-F-]{36})/); if(m) return m[1]; }catch(e){}
  return null;
}
const CUENTA=cuentaId();

/* ---------- red + reloj del servidor ---------- */
let OFF=0, BEST=1e9;
const sNow=()=>Date.now()+OFF+SALTO*1000;
async function rpc(fn,args){
  const t0=Date.now();
  try{
    const r=await fetch(SB+'/rest/v1/rpc/'+fn,{method:'POST',headers:{'Content-Type':'application/json',apikey:KEY,Authorization:'Bearer '+KEY},body:JSON.stringify(args)});
    const j=await r.json();
    if(j&&j.now){ const rtt=Date.now()-t0, off=new Date(j.now).getTime()+rtt/2-Date.now(); if(rtt<=BEST+80){ OFF=off; BEST=Math.min(BEST,rtt); } }
    return j;
  }catch(e){ return {ok:false,error:'red'}; }
}
const cr=(fn,extra)=>rpc('suite_cr_'+fn,Object.assign({p_cuenta:CUENTA},extra||{}));

/* ---------- textos ---------- */
function mmss(s){ s=Math.max(0,Math.ceil(s)); return Math.floor(s/60)+':'+String(s%60).padStart(2,'0'); }
function cuando(iso){
  const d=new Date(iso), hoy=new Date(), mid=x=>{ const y=new Date(x); y.setHours(0,0,0,0); return y.getTime(); };
  const dd=Math.round((mid(d)-mid(hoy))/864e5), hh=d.toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'});
  const dia=dd===0?'hoy':dd===1?'mañana':d.toLocaleDateString('es-ES',{weekday:'long'})+(dd>6?' '+d.getDate()+'/'+(d.getMonth()+1):'');
  return dia+' a las '+hh;
}
function grupoTxt(g){ return g?String(g).replace(/ge$/i,'').toUpperCase().replace(/^(\d)([A-Z])/,'$1.º $2'):''; }
const ESPIRAL=c=>'<svg viewBox="0 0 44 44"><g fill="none" stroke="'+c+'" stroke-linecap="round"><path d="M22 4 a18 18 0 1 0 18 18" stroke-width="3"/><path d="M22 10 a12 12 0 1 1 -12 12" stroke-width="2.4" opacity=".7"/></g><circle cx="40" cy="22" r="3" fill="'+c+'"/></svg>';
const CABECERA='<div class="top"><div class="logo"><div class="lg" id="coLogo"></div><div class="nm"><div class="tt"><span class="pre">Pre</span><span class="dict">Dict</span><span class="car">Carrusel</span></div><div class="kick">Online · Grado Elemental</div></div></div><div class="sp"></div><span class="tag" id="estPiano"></span><button class="btn peq" id="bSonido" title="Comprobar el sonido">🔊 Probar sonido</button></div>';

/* ---------- ventana de confirmación (estética PreDict) ---------- */
function confirma(titulo,texto,okTxt,noTxt){
  return new Promise(res=>{
    const m=document.createElement('div'); m.className='comodal';
    m.innerHTML='<div class="cm-caja" role="dialog" aria-modal="true"><h3>'+titulo+'</h3><p>'+texto+'</p><div class="row"><button class="btn" data-r="0">'+(noTxt||'Mejor no')+'</button><button class="btn pri" data-r="1">'+okTxt+'</button></div></div>';
    raiz.appendChild(m);
    const fin=v=>{ m.remove(); res(v); };
    m.addEventListener('click',e=>{ const b=e.target.closest('button'); if(b) fin(b.dataset.r==='1'); else if(e.target===m) fin(false); });
  });
}
const tarde=p=>p&&p.tipo==='anunciada'&&sNow()>new Date(p.programada).getTime()-5*60e3;

/* ---------- audio: se desbloquea con un clic ---------- */
function audioListo(){ PCOnline.audioListo(); }
function probarSonido(){ PCOnline.probar(); }

/* ============================================================================
   LOBBY Y SALA
   ============================================================================ */
const ST={vista:'lobby', lista:[], partida:null, est:null, aviso:'', errNo:false};
const raiz=document.createElement('div'); raiz.id='co'; raiz.innerHTML='<div id="cab">'+CABECERA+'</div><div class="cowrap" id="app"></div>'; document.body.appendChild(raiz);
const app=raiz.querySelector('#app'), cab=raiz.querySelector('#cab');
try{ cab.querySelector('#coLogo').innerHTML=PCOnline.logo('coLg'); }catch(e){}
cab.querySelector('#bSonido').onclick=()=>probarSonido();
let POLL=null, TIC=null;

function sinCuenta(){
  cab.classList.add('sin-sonido'); app.innerHTML=
    '<div class="card"><h2>Entra primero en el portal</h2><p>Para jugar tienes que haber entrado en el portal de Grado Elemental con tu cuenta. Entra desde el portal y pulsa el botón de PreDict carrusel online.</p><p><a class="btn pri" style="text-decoration:none;display:inline-block" href="https://ge.lmathome.es/">Ir al portal</a></p></div>';
}

async function arrancaLobby(){
  ST.vista='lobby'; ST.partida=null; ST.est=null; try{ localStorage.removeItem('co_partida'); }catch(e){}
  clearInterval(POLL); clearInterval(TIC);
  await refrescaLista(); pintaLobby();
  POLL=setInterval(async()=>{ if(ST.vista!=='lobby'||document.hidden) return; await refrescaLista(); pintaLobby(); },5000);
  TIC=setInterval(()=>{ if(ST.vista==='lobby') pintaTiempos(); },1000);
}
async function refrescaLista(){
  const r=await cr('lista');
  if(r&&r.ok){ ST.lista=r.partidas||[]; ST.errNo=false; } else ST.errNo=true;
}

function pintaLobby(){
  if(ST.vista!=='lobby') return;
  try{ PCOnline.fondoLobby(true); }catch(e){}
  const act=document.activeElement, enInput=act&&act.id==='hora', valorHora=enInput?act.value:null;
  const manana=new Date(Date.now()+864e5); manana.setHours(17,0,0,0);
  const def=(document.getElementById('hora')||{}).value||new Date(manana.getTime()-manana.getTimezoneOffset()*6e4).toISOString().slice(0,16);
  const lista=ST.lista.map(p=>{
    const abierta=p.lobby_abierto, mia=p.soy_creador;
    const quien=esc(p.creador)+' <span class="muted">('+esc(grupoTxt(p.grupo))+')</span>';
    const cabecera=abierta
      ? '<span class="dot live"></span>Abierta ahora'
      : '<span class="dot nar"></span>Anunciada';
    const cancel=p.anfitrion_cancelo?' <span class="chip">sin anfitrión</span>':'';
    const resp=p.yo;
    const botones=abierta
      ? '<button class="btn pri" data-a="entrar" data-id="'+p.id+'">Entrar</button>'
      : '<button class="btn pri'+(resp==='si'?' sel':'')+'" data-a="si" data-id="'+p.id+'">'+(resp==='si'?'✓ Me apunto':'Me apunto')+'</button>'+
        (resp==='quiza'?'':'<button class="btn peq" data-a="'+(resp==='si'?'no':'quiza')+'" data-id="'+p.id+'" title="'+(resp==='si'?'Quitarme de la partida':'Marcar como visto')+'">✕</button>');
    return '<div class="partida"><div class="info"><div class="quien">'+quien+cancel+'</div>'+
      '<div class="cuando">'+cabecera+' · <span data-t="'+p.programada+'">'+cuando(p.programada)+'</span></div>'+
      '<div class="cuando">'+p.apuntados+' apuntado'+(p.apuntados==1?'':'s')+(p.dentro>0?' · '+p.dentro+' en el lobby':'')+'</div></div>'+
      '<div class="row">'+botones+'</div></div>';
  }).join('');
  app.innerHTML=
    (ST.aviso?'<div class="banner">'+esc(ST.aviso)+'</div>':'')+
    (ST.errNo?'<div class="banner ko">No consigo conectar con el servidor. Reintento solo.</div>':'')+
    '<div class="cols"><div class="card"><h2>Jugar ahora</h2><p class="muted" style="margin-top:0">Abre un lobby y empieza con quien entre en los próximos 5 minutos.</p><button class="btn pri gr" id="bAhora">▶ Jugar ahora</button></div>'+
    '<div class="card"><h2>Anunciar partida</h2><p class="muted" style="margin-top:0">Elige día y hora; todo el curso lo verá en el botón de PreDict 15 minutos antes.</p><div class="row"><input type="datetime-local" id="hora" value="'+def+'"><button class="btn" id="bAnunciar">📣 Anunciar</button></div></div></div>'+
    '<div class="card"><h2>Partidas del curso</h2>'+(lista||'<p class="muted" style="margin:6px 0">Ahora mismo no hay ninguna. Abre una con «Jugar ahora» o anuncia una para más tarde.</p>')+'</div>'+
    '<p class="muted" style="font-size:13px">Mientras juegas, el tiempo se suma solo a tu actitud (mismos topes de siempre). Cada partida dura unos 11 minutos y tiene cinco partes; la última son las cadencias.</p>';
  if(enInput){ const h=document.getElementById('hora'); if(h&&valorHora) h.value=valorHora; }
  enlaza();
}
function pintaTiempos(){ /* los textos de «cuándo» no cambian cada segundo; reservado */ }

function enlaza(){
  pintaPiano();
  const ah=document.getElementById('bAhora'); if(ah) ah.onclick=async()=>{ audioListo(); ah.disabled=true; const r=await cr('crear'); if(r&&r.ok){ await entraEnSala(r.id); } else { ST.aviso=r&&r.error==='ya_tienes_una'?'Ya tienes un lobby abierto.':'No he podido crear la partida.'; ah.disabled=false; pintaLobby(); } };
  const an=document.getElementById('bAnunciar'); if(an) an.onclick=async()=>{
    const v=(document.getElementById('hora')||{}).value; if(!v) return;
    const d=new Date(v);
    if(!await confirma('¿Anunciar esta partida?','Serás el anfitrión. Si no asistes al carrusel, perderás 0,25 de actitud. Puedes evitarlo cancelando la partida hasta 5 minutos antes de su inicio.','Sí, anunciar')) return;
    an.disabled=true;
    const r=await cr('crear',{p_programada:d.toISOString()});
    if(r&&r.ok){ ST.aviso='Partida anunciada para '+cuando(d.toISOString())+'. Te has apuntado automáticamente.'; await refrescaLista(); }
    else ST.aviso=r&&r.error==='hora'?'La hora debe estar entre 10 minutos y 14 días desde ahora.':'No he podido anunciar la partida.';
    pintaLobby();
  };
  app.querySelectorAll('button[data-a]').forEach(bt=>bt.onclick=async()=>{
    const a=bt.dataset.a, id=bt.dataset.id, P=ST.lista.find(x=>x.id===id);
    if(a==='si'&&P&&P.tipo==='anunciada'&&P.yo!=='si'){ if(!await confirma('¿Estás seguro?','Si luego no asistes, perderás 0,1 de actitud. Puedes evitarlo quitándote de la partida hasta 5 minutos antes de que empiece.','Sí, me apunto')) return; }
    if((a==='no'||a==='quiza')&&P&&P.yo==='si'&&!P.soy_creador&&tarde(P)){ if(!await confirma('Ya es tarde para quitarte','Quitarte ahora cuenta como no asistir: perderás 0,1 de actitud. ¿Quieres quitarte igualmente?','Sí, quitarme','No, me quedo')) return; }
    bt.disabled=true;
    if(a==='entrar'){ audioListo(); const r=await cr('entrar',{p_partida:id}); if(r&&r.ok) await entraEnSala(id); else { ST.aviso='No he podido entrar: la partida ya no está abierta.'; await refrescaLista(); pintaLobby(); } return; }
    await cr('apuntar',{p_partida:id,p_resp:a}); await refrescaLista(); pintaLobby();
  });
}

/* ---------- sala ---------- */
async function entraEnSala(id){
  ST.vista='sala'; ST.partida=id; ST.aviso='';
  try{ localStorage.setItem('co_partida',id); }catch(e){}
  clearInterval(POLL); clearInterval(TIC);
  await refrescaSala(); pintaSala();
  POLL=setInterval(async()=>{ if(ST.vista!=='sala'||document.hidden) return; await refrescaSala(); pintaSala(); },2000);
  TIC=setInterval(()=>{ if(ST.vista==='sala') pintaSalaTiempos(); },500);
}
async function refrescaSala(){
  const r=await cr('estado',{p_partida:ST.partida});
  if(!r||!r.ok){ ST.salaErr=true; return; }
  ST.salaErr=false; ST.est=r;
  const p=r.p, yo=(r.jugadores||[]).find(j=>j.yo);
  if(p.estado==='en_juego' && yo && yo.dentro){ clearInterval(POLL); clearInterval(TIC); empiezaJuego(r); return; }
  if(p.estado==='terminada' || (p.estado==='en_juego' && !(yo&&yo.dentro))){ ST.aviso=p.estado==='terminada'?'La partida ha terminado.':'La partida ya ha empezado.'; arrancaLobby(); }
}
function pintaSala(){
  if(ST.vista!=='sala'||!ST.est) return;
  try{ PCOnline.fondoLobby(true); }catch(e){}
  const e=ST.est, p=e.p, js=e.jugadores||[];
  const dentro=js.filter(j=>j.dentro), pend=js.filter(j=>!j.dentro&&j.resp==='si');
  const hostDentro=p.anfitrion_id && dentro.some(j=>j.id===p.anfitrion_id);
  const chips=dentro.map(j=>'<span class="chip'+(j.yo?' yo':'')+(j.id===p.anfitrion_id?' host':'')+'">'+esc(j.nombre)+' <span class="muted">'+esc(grupoTxt(j.grupo))+'</span>'+(j.id===p.anfitrion_id?' · anfitrión':'')+'</span>').join('');
  const chipsP=pend.map(j=>'<span class="chip pend">'+esc(j.nombre)+' · '+'apuntado'+'</span>').join('');
  let banner='';
  if(p.anfitrion_cancelo && !p.anfitrion){
    banner='<div class="banner ko"><b>El anfitrión ha cancelado la partida</b><br>Se puede jugar igualmente. <button class="btn pri" id="bHeredar" style="margin-left:6px">¿Quieres ser el anfitrión?</button> <span class="muted">Podrás empezar cuando quieras; si no, empezará sola.</span></div>';
  } else if(!hostDentro && p.anfitrion && new Date(p.programada).getTime()<=sNow()){
    banner='<div class="banner ko"><b>El anfitrión todavía no ha llegado</b><br>La partida empieza sola en <span id="cuentaAuto" class="grande" style="font-size:26px"></span></div>';
  }
  const anfNombre=p.anfitrion?esc(p.anfitrion):'sin anfitrión';
  app.innerHTML=banner+
    '<div class="card"><h2>Partida de '+esc(p.creador)+' <span class="muted">('+esc(grupoTxt(p.grupo))+')</span> · código '+esc(p.codigo)+'</h2>'+
    '<div class="row" style="justify-content:space-between"><div><div class="muted">Empieza '+esc(cuando(p.programada))+' · anfitrión: <b>'+anfNombre+'</b></div>'+
    '<div style="margin-top:6px">Empieza sola en <span id="cuentaAuto2" class="grande" style="font-size:30px"></span></div></div>'+
    '<div class="row">'+(p.soy_anfitrion?'<button class="btn pri" id="bEmpezar">▶ Empezar ya</button><button class="btn ko" id="bCancelar">Cancelar partida</button>':'')+
    '<button class="btn" id="bSalir">← Salir</button></div></div></div>'+
    '<div class="card"><h2>En el lobby ('+dentro.length+')</h2><div>'+(chips||'<span class="muted">Nadie todavía.</span>')+'</div>'+
    (chipsP?'<h2 style="margin-top:12px">Apuntados que aún no han entrado</h2><div>'+chipsP+'</div>':'')+'</div>'+
    '<p class="muted" style="font-size:13px">Cuando empiece, todos oís lo mismo a la vez. Pon el volumen y no cierres esta pestaña.</p>';
  enlaza();
  const bh=document.getElementById('bHeredar'); if(bh) bh.onclick=async()=>{ bh.disabled=true; await cr('heredar',{p_partida:ST.partida}); await refrescaSala(); pintaSala(); };
  const be=document.getElementById('bEmpezar'); if(be) be.onclick=async()=>{ be.disabled=true; audioListo(); await cr('empezar',{p_partida:ST.partida,p_duracion:700}); await refrescaSala(); pintaSala(); };
  const bc=document.getElementById('bCancelar'); if(bc) bc.onclick=async()=>{
    const ok=await confirma(tarde(p)?'Cancelar ahora cuenta como no asistir':'¿Cancelar la partida?',tarde(p)?'Perderás 0,25 de actitud por cancelar con menos de 5 minutos de margen. ¿Cancelar la partida igualmente?':'No pasa nada: cancelando hasta 5 minutos antes no pierdes actitud. Los demás podrán seguir si alguien quiere ser anfitrión.','Sí, cancelar','No, sigo');
    if(!ok) return;
    await cr('cancelar',{p_partida:ST.partida}); ST.aviso='Has cancelado la partida.'; arrancaLobby();
  };
  const bs=document.getElementById('bSalir'); if(bs) bs.onclick=async()=>{ await cr('salir',{p_partida:ST.partida}); arrancaLobby(); };
  pintaSalaTiempos();
}
function pintaSalaTiempos(){
  const e=ST.est; if(!e) return;
  const rest=(new Date(e.p.auto).getTime()-sNow())/1000;
  ['cuentaAuto','cuentaAuto2'].forEach(id=>{ const n=document.getElementById(id); if(n) n.textContent=rest>0?mmss(rest):'ya'; });
  if(rest<=1.5 && rest>-3) refrescaSala().then(pintaSala);
}


/* ---------- la partida: la lleva el motor del carrusel (guiado-online.js) ---------- */
function empiezaJuego(est){
  const p=est.p; clearInterval(POLL); clearInterval(TIC); ST.vista='juego';
  raiz.style.display='none';
  try{ localStorage.setItem('co_partida',p.id); }catch(e){}
  PCOnline.jugar({id:p.id,inicio:new Date(p.inicio).getTime(),semilla:p.semilla,now:sNow,cr:cr,est:est,
    ping:s=>rpc('suite_actividad_ping',{p_cuenta_id:CUENTA,p_app:'predict-ge',p_origen:'carrusel-online',p_segundos:s}),
    onFin:()=>{ try{ localStorage.removeItem('co_partida'); }catch(e){} raiz.style.display=''; arrancaLobby(); }});
}
window.LobbyOnline={ arranca:async function(){
  document.documentElement.classList.add('co-on');
  if(!CUENTA){ sinCuenta(); return; }
  let id=null; try{ id=localStorage.getItem('co_partida'); }catch(e){}
  if(id){
    const r=await cr('estado',{p_partida:id});
    if(r&&r.ok){ const p=r.p, yo=(r.jugadores||[]).find(j=>j.yo);
      if(yo&&yo.dentro&&(p.estado==='abierta'||p.estado==='en_juego')){ if(p.estado==='en_juego'){ empiezaJuego(r); return; } await entraEnSala(id); return; } }
    try{ localStorage.removeItem('co_partida'); }catch(e){}
  }
  arrancaLobby();
}};

})();
