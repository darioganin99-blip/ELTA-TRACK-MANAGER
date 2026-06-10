const firebaseConfig={apiKey:"AIzaSyDFk_mPN0r_LLHhS3HeQ2yfbfvHZJ2h2mU",authDomain:"elta-track-pod.firebaseapp.com",projectId:"elta-track-pod",storageBucket:"elta-track-pod.firebasestorage.app",messagingSenderId:"993768926683",appId:"1:993768926683:web:8a14e6af8706154a96cbfe",measurementId:"G-9FSMKJ8KL0"};
let db,trs=[],users=[],clientes=[],origenes=[],destinos=[],embarques=[],abmCol="usuarios";
function init(){if(!firebase.apps.length)firebase.initializeApp(firebaseConfig);db=firebase.firestore()}
function q(id){return document.getElementById(id)}
function esc(v){return String(v??"").replace(/[&<>]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[m]))}
function togglePass(){let p=q("pass");p.type=p.type==="password"?"text":"password"}
function tv(v){try{let d=v?.toDate?v.toDate():(v?.seconds?new Date(v.seconds*1000):new Date(v));return d&&!isNaN(d.getTime())?d.getTime():0}catch(e){return 0}}
function fd(v){let n=tv(v);return n?new Date(n).toLocaleString("es-AR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}):"-"}
function openT(t){let e=String(t.estado||"").toLowerCase();if(t.closed&&String(t.closed).toLowerCase()!=="null")return false;return e==="abierto"||t.closed==null}
function flota(t){return String(t?.user?.fleet||t.flota||"").trim()}
function ruta(t){return t.route||{}}
function lastU(t){let a=(t.updates||[]).slice();a.sort((x,y)=>tv(y.time||y.fecha||y.createdAt||y.ts)-tv(x.time||x.fecha||x.createdAt||x.ts));return a[0]||null}
function loc(t){let u=lastU(t),o=u?.gps||u?.ultimaPosicion||t.ultimaPosicion||u||{};return o.ubicacionTexto||o.ubicacion||o.localidad||o.city||o.ciudad||o.address||"-"}
function alertT(t){let a=(t.alerts||[]).slice();if(!a.length)return"-";a.sort((x,y)=>tv(y.time||y.fecha)-tv(x.time||x.fecha));return a[0].tipo||a[0].type||a[0].motivo||"Alerta"}

async function login(){
  try{
    init();
    let u=q("user").value.trim(),p=q("pass").value.trim();
    let d=await db.collection("usuarios").doc(u).get();
    if(!d.exists)return q("msg").innerText="Usuario no existe";
    let x=d.data(),r=String(x.role||"").toLowerCase();
    if(x.pass!==p)return q("msg").innerText="PASS incorrecto";
    if(!["admin","trafico","coordinador"].includes(r))return q("msg").innerText="Sin permiso Admin";
    q("login").classList.remove("active");
    q("app").classList.add("active");
    await refresh();
  }catch(e){console.log(e);q("msg").innerText="Error Firebase / configuración"}
}
function salir(){q("app").classList.remove("active");q("login").classList.add("active")}
function toggleSidebar(){document.body.classList.toggle("sidebarCollapsed")}

function tab(id){
  document.querySelectorAll(".sideNav button").forEach(b=>b.classList.remove("active"));
  document.querySelectorAll(".panel").forEach(p=>p.classList.remove("active"));
  [...document.querySelectorAll(".sideNav button")].find(b=>b.getAttribute("onclick")?.includes(id))?.classList.add("active");
  q(id)?.classList.add("active");
  if(id==="abm")renderABM();
  if(id==="reportes")renderRep();
  if(id==="unidades")renderUnits();
  if(id==="conductores")renderDrivers();
  if(id==="clientes")renderClients();
  if(id==="alertas")renderAlerts();
}

async function read(c){let s=await db.collection(c).get();return s.docs.map(d=>({id:d.id,...d.data()}))}
async function refresh(){
  [trs,users,clientes,origenes,destinos,embarques]=await Promise.all([
    read("transitos"),read("usuarios"),read("clientes"),read("origenes"),read("destinos"),read("embarque")
  ]);
  renderDash();renderTransitos();renderMapa();renderRep();renderUnits();renderDrivers();renderClients();renderAlerts();
}

function card(t){
  let o=openT(t),r=ruta(t);
  return `<div class="item ${o?"open":"closed"}">
    <div class="top"><span>🚚 Flota ${esc(flota(t)||"-")} / 📦 Emb. ${esc(t.embarque||"-")}</span><span class="badge ${o?"":"closed"}">${o?"En tránsito":"Finalizado"}</span></div>
    <div><b>Cliente:</b> ${esc(r.cliente||"-")}</div>
    <div><b>Origen:</b> ${esc(r.origen||"-")}</div>
    <div><b>Destino:</b> ${esc(r.destino||"-")}</div>
    <div><b>Lote/Carga:</b> ${esc(t.lote||"-")}</div>
    <div><b>Inicio:</b> ${fd(t.start?.time||t.start)} | <b>Cierre:</b> ${o?"-":fd(t.closed?.time||t.closed)}</div>
    <div><b>Últ. posición:</b> ${esc(loc(t))}</div>
    <div><b>Últ. alerta:</b> ${esc(alertT(t))}</div>
  </div>`;
}

function renderDash(){
  let abiertos=trs.filter(openT), cerrados=trs.filter(t=>!openT(t));
  let totalAlerts=trs.reduce((n,t)=>n+(t.alerts||[]).length,0);
  q("ka").innerText=abiertos.length;
  q("kc").innerText=cerrados.length;
  q("kal").innerText=totalAlerts;
  if(q("headerAlertCount"))q("headerAlertCount").innerText=totalAlerts;
  q("kf").innerText=users.filter(u=>String(u.role||"").toLowerCase()==="flota").length || new Set(trs.map(flota).filter(Boolean)).size;
  q("donutTotal").innerText=trs.length;
  q("legOpen").innerText=abiertos.length;
  q("legWait").innerText=Math.max(0, trs.length-abiertos.length-cerrados.length);
  q("legAlert").innerText=totalAlerts;
  q("legClosed").innerText=cerrados.length;
  renderDashTable();
  renderDashAlerts();
}

function renderDashTable(){
  let rows=trs.slice().sort((a,b)=>tv(b.start?.time||b.start)-tv(a.start?.time||a.start)).slice(0,8);
  q("dashTable").innerHTML=`<table>
    <thead><tr><th>Embarque</th><th>Cliente</th><th>Origen</th><th>Destino</th><th>Flota</th><th>Estado</th><th>Actualizado</th></tr></thead>
    <tbody>${rows.map(t=>{
      let r=ruta(t),o=openT(t);
      return `<tr><td>${esc(t.embarque||"-")}</td><td>${esc(r.cliente||"-")}</td><td>${esc(r.origen||"-")}</td><td>${esc(r.destino||"-")}</td><td>${esc(flota(t)||"-")}</td><td><span class="statusBadge ${o?"open":"closed"}">${o?"En tránsito":"Finalizado"}</span></td><td>${fd((lastU(t)||{}).time||t.start?.time||t.start)}</td></tr>`;
    }).join("")}</tbody></table>`;
}

function renderDashAlerts(){
  let alerts=[];
  trs.forEach(t=>(t.alerts||[]).forEach(a=>alerts.push({t,a})));
  alerts.sort((x,y)=>tv(y.a.time||y.a.fecha)-tv(x.a.time||x.a.fecha));
  q("dashAlerts").innerHTML=(alerts.slice(0,3).map(x=>`<div class="alertLine">• ${esc(x.a.tipo||x.a.type||x.a.motivo||"Alerta")} - Flota ${esc(flota(x.t)||"-")} - Emb. ${esc(x.t.embarque||"-")}</div>`).join(""))||'<div class="alertLine">Sin alertas activas.</div>';
}

function filt(t){
  let e=q("fEmb")?.value.toLowerCase()||"",f=q("fFlo")?.value.toLowerCase()||"",c=q("fCli")?.value.toLowerCase()||"",s=q("fEst")?.value||"";
  return(!e||String(t.embarque||"").toLowerCase().includes(e))&&(!f||flota(t).toLowerCase().includes(f))&&(!c||String(ruta(t).cliente||"").toLowerCase().includes(c))&&(!s||(s==="abierto"?openT(t):!openT(t)));
}
function renderTransitos(){q("transList").innerHTML=trs.filter(filt).map(card).join("")||'<div class="item">Sin resultados.</div>'}
function renderMapa(){q("mapList").innerHTML=trs.filter(openT).map(t=>`<div class="item open"><div class="top"><span>🚚 Flota ${esc(flota(t)||"-")}</span><span class="badge">GPS</span></div><div><b>Ubicación:</b> ${esc(loc(t))}</div><div><b>Cliente:</b> ${esc(ruta(t).cliente||"-")} | <b>Emb.:</b> ${esc(t.embarque||"-")}</div></div>`).join("")||'<div class="item">No hay flotas activas.</div>'}

function renderUnits(){
  let flotas=[...new Set(trs.map(flota).filter(Boolean))];
  q("unitList").innerHTML=flotas.map(f=>`<div class="item"><div class="top"><span>🚛 Unidad / Flota ${esc(f)}</span><span class="badge">Activa</span></div><div>Tránsitos asociados: ${trs.filter(t=>flota(t)===f).length}</div></div>`).join("")||'<div class="item">Sin unidades registradas.</div>';
}
function renderDrivers(){
  let data=users.filter(u=>String(u.role||"").toLowerCase()==="flota"||u.flota||u.user);
  q("driverList").innerHTML=data.map(u=>`<div class="item"><div class="top"><span>👤 ${esc(u.user||u.id||"-")}</span><span class="badge">Usuario</span></div><div>Flota: ${esc(u.flota||u.fleet||"-")}</div><div>Teléfono: ${esc(u.telefono||"-")}</div></div>`).join("")||'<div class="item">Sin conductores cargados.</div>';
}
function renderClients(){
  q("clientList").innerHTML=clientes.map(c=>`<div class="item"><div class="top"><span>🏢 ${esc(c.id||c.nombre||"-")}</span><span class="badge ${c.activo===false?"closed":""}">${c.activo===false?"Inactivo":"Activo"}</span></div><small>${esc(JSON.stringify(c))}</small></div>`).join("")||'<div class="item">Sin clientes cargados.</div>';
}
function renderAlerts(){
  let alerts=[];
  trs.forEach(t=>(t.alerts||[]).forEach(a=>alerts.push({t,a})));
  alerts.sort((x,y)=>tv(y.a.time||y.a.fecha)-tv(x.a.time||x.a.fecha));
  q("alertList").innerHTML=alerts.map(x=>`<div class="item"><div class="top"><span>⚠️ ${esc(x.a.tipo||x.a.type||x.a.motivo||"Alerta")}</span><span class="badge">Emb. ${esc(x.t.embarque||"-")}</span></div><div>Flota: ${esc(flota(x.t)||"-")}</div><div>Fecha: ${fd(x.a.time||x.a.fecha)}</div></div>`).join("")||'<div class="item">Sin alertas registradas.</div>';
}

function abm(c){abmCol=c;renderABM()}
function renderABM(){
  let sch={usuarios:["id","flota","user","telefono","pass","role","activo"],clientes:["id","activo"],origenes:["id","pais","ubicacion","activo"],destinos:["id","pais","ubicacion","activo"],embarque:["id","cliente","origen","destino","cuit","factura","nic","volumen","activo"]},
  data={usuarios:users,clientes,origenes,destinos,embarque:embarques}[abmCol]||[];
  q("abmForm").innerHTML=sch[abmCol].map(f=>f==="activo"?`<select id="abm_${f}"><option value="true">activo true</option><option value="false">activo false</option></select>`:`<input id="abm_${f}" placeholder="${f}">`).join("")+`<button onclick="saveABM()">Guardar</button>`;
  q("abmList").innerHTML=data.map(x=>`<div class="item"><div class="top"><span>${esc(x.id||"-")}</span><span class="badge ${x.activo===false?"closed":""}">${x.activo===false?"Inactivo":"Activo"}</span></div><small>${esc(JSON.stringify(x))}</small></div>`).join("")||'<div class="item">Sin datos.</div>';
}
async function saveABM(){
  let data={},id="";
  document.querySelectorAll("#abmForm input,#abmForm select").forEach(e=>{let k=e.id.replace("abm_",""),v=e.value.trim();if(k==="id")id=v;else data[k]=k==="activo"?v==="true":v});
  if(!id)return alert("Debe indicar id/documento");
  await db.collection(abmCol).doc(id).set(data,{merge:true});
  await refresh();
}
function renderRep(){
  let by={};trs.forEach(t=>by[flota(t)||"-"]=(by[flota(t)||"-"]||0)+1);
  q("rep").innerHTML=`<div class="item"><b>Abiertos:</b> ${trs.filter(openT).length}</div><div class="item"><b>Cerrados:</b> ${trs.filter(t=>!openT(t)).length}</div><div class="item"><b>Por flota:</b><br>${Object.entries(by).map(([k,v])=>`${esc(k)}: ${v}`).join("<br>")}</div>`;
}
function copyRep(){navigator.clipboard?.writeText(q("rep").innerText);alert("Reporte copiado")}
document.addEventListener("DOMContentLoaded",()=>{try{init()}catch(e){}})
