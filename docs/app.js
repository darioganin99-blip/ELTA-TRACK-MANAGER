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


function countBy(arr, getter){
  let out={};
  arr.forEach(x=>{
    let k=String(getter(x)||"-").trim()||"-";
    out[k]=(out[k]||0)+1;
  });
  return out;
}
function renderBarChart(id, data, limit=4){
  let el=q(id);
  if(!el)return;
  let entries=Object.entries(data).sort((a,b)=>b[1]-a[1]).slice(0,limit);
  let total=Object.values(data).reduce((a,b)=>a+b,0);
  if(!entries.length||!total){
    el.innerHTML='<div class="chartEmpty">Sin datos.</div>';
    return;
  }
  el.innerHTML=entries.map(([k,v])=>{
    let pct=Math.round((v/total)*100);
    return `<div class="chartRow">
      <div class="chartLabel" title="${esc(k)}">${esc(k)}</div>
      <div class="chartValue">${v}</div>
      <div class="chartPct">${pct}%</div>
      <div class="barTrack"><div class="barFill" style="width:${pct}%"></div></div>
    </div>`;
  }).join("");
}
function renderEstadoChart(abiertos,cerrados,total){
  let el=q("chartEstado");
  if(!el)return;
  let pOpen=total?Math.round((abiertos/total)*100):0;
  let pClosed=total?Math.round((cerrados/total)*100):0;
  el.innerHTML=`<div class="stateChartSummary">
    <div class="stateBox open"><b>${abiertos}</b><small>En tránsito · ${pOpen}%</small></div>
    <div class="stateBox closed"><b>${cerrados}</b><small>Finalizado · ${pClosed}%</small></div>
  </div>
  <div class="chartRow">
    <div class="chartLabel">En tránsito</div><div class="chartValue">${abiertos}</div><div class="chartPct">${pOpen}%</div>
    <div class="barTrack"><div class="barFill" style="width:${pOpen}%"></div></div>
  </div>
  <div class="chartRow">
    <div class="chartLabel">Finalizado</div><div class="chartValue">${cerrados}</div><div class="chartPct">${pClosed}%</div>
    <div class="barTrack"><div class="barFill" style="width:${pClosed}%;background:linear-gradient(90deg,#8b5cf6,#64748b)"></div></div>
  </div>`;
}


function palette(i){
  return ["#4cc63f","#1e88e5","#facc15","#ef4444","#8b5cf6","#14b8a6","#f97316","#94a3b8"][i%8];
}
function renderPieChart(id, data, limit=4){
  let el=q(id);
  if(!el)return;
  let entries=Object.entries(data).filter(([k,v])=>v>0).sort((a,b)=>b[1]-a[1]).slice(0,limit);
  let total=Object.values(data).reduce((a,b)=>a+b,0);
  if(!entries.length||!total){
    el.innerHTML='<div class="chartEmpty">Sin información disponible.</div>';
    return;
  }
  let acc=0;
  let stops=entries.map(([k,v],i)=>{
    let start=acc;
    let pct=(v/total)*100;
    acc+=pct;
    return `${palette(i)} ${start}% ${acc}%`;
  }).join(",");
  el.innerHTML=`<div class="pieChartBlock">
    <div class="pieChart" style="background:conic-gradient(${stops})">
      <div class="pieCenter"><b>${total}</b><small>Total</small></div>
    </div>
    <div class="pieLegend">
      ${entries.map(([k,v],i)=>{
        let pct=Math.round((v/total)*100);
        return `<div class="pieLegendRow">
          <span class="swatch" style="background:${palette(i)}"></span>
          <span class="name" title="${esc(k)}">${esc(k)}</span>
          <span class="val">${v}</span>
          <span class="pct">${pct}%</span>
        </div>`;
      }).join("")}
    </div>
  </div>`;
}
function renderEstadoPie(abiertos,cerrados,total){
  renderPieChart("chartEstado", {"En tránsito":abiertos,"Finalizado":cerrados}, 2);
}

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
  if(q("ka"))q("ka").innerText=abiertos.length;
  if(q("kc"))q("kc").innerText=cerrados.length;
  if(q("kal"))q("kal").innerText=totalAlerts;
  if(q("headerAlertCount"))q("headerAlertCount").innerText=totalAlerts;
  if(q("kf"))q("kf").innerText=users.filter(u=>String(u.role||"").toLowerCase()==="flota").length || new Set(trs.map(flota).filter(Boolean)).size;

  renderEstadoPie(abiertos.length,cerrados.length,trs.length);
  renderPieChart("chartCliente", countBy(trs,t=>ruta(t).cliente), 4);
  renderPieChart("chartOrigen", countBy(trs,t=>ruta(t).origen), 4);
  renderPieChart("chartDestino", countBy(trs,t=>ruta(t).destino), 4);

  if(q("donutTotal"))q("donutTotal").innerText=trs.length;
  if(q("legOpen"))q("legOpen").innerText=abiertos.length;
  if(q("legWait"))q("legWait").innerText=Math.max(0, trs.length-abiertos.length-cerrados.length);
  if(q("legAlert"))q("legAlert").innerText=totalAlerts;
  if(q("legClosed"))q("legClosed").innerText=cerrados.length;

  renderDashTable();
  renderDashAlerts();
}

function renderDashTable(){
  if(!trs.length){if(q("dashTable")){q("dashTable").classList.add("emptyTable");q("dashTable").innerHTML="Sin información de tránsitos.";}return;}else{q("dashTable")?.classList.remove("emptyTable")}
  let rows=trs.slice().sort((a,b)=>tv(b.start?.time||b.start)-tv(a.start?.time||a.start)).slice(0,10);
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
  if(!alerts.length){q("dashAlerts").innerHTML='<div class="alertEmpty">Sin alertas activas.</div>';return;}
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




/* ===== V1.2.18 overrides ===== */

function uniq(arr){
  return [...new Set(arr.map(x=>String(x||"").trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"es"));
}
function fillSelect(id, values, label){
  let el=q(id);
  if(!el)return;
  let current=el.value;
  el.innerHTML=`<option value="">${label}</option>`+uniq(values).map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join("");
  if([...el.options].some(o=>o.value===current))el.value=current;
}
function refreshFilters(){
  fillSelect("fFlo", trs.map(flota), "Todas las flotas");
  fillSelect("fCli", trs.map(t=>ruta(t).cliente), "Todos los clientes");
}
function valFrom(obj, keys){
  for(let k of keys){
    let v=obj&&obj[k];
    if(v!==undefined&&v!==null&&String(v).trim()!=="")return v;
  }
  return "";
}
function locFull(t){
  let u=lastU(t)||{};
  let gps=u.gps||u.ultimaPosicion||t.ultimaPosicion||t.lastPosition||t.posicion||u||{};
  let direct=valFrom(gps,["ubicacionTexto","ubicacion","localidadProvincia","address","direccion","formatted_address"]);
  if(direct)return direct;
  let locTxt=[valFrom(gps,["localidad","city","ciudad","municipio","partido"]), valFrom(gps,["provincia","state","region"])].filter(Boolean).join(", ");
  if(locTxt)return locTxt;
  let lat=valFrom(gps,["lat","latitude","latitud"]);
  let lng=valFrom(gps,["lng","lon","longitude","longitud"]);
  if(lat&&lng)return `${lat}, ${lng}`;
  return "-";
}
function loc(t){return locFull(t)}
function alertLoc(a,t){
  let gps=a.gps||a.ubicacion||a.posicion||a.location||{};
  let direct=valFrom(a,["localidad","ubicacionTexto","ubicacion","lugar","zona","city","ciudad"])||valFrom(gps,["localidad","ubicacionTexto","ubicacion","city","ciudad"]);
  return direct||locFull(t);
}
function alertKm(a){
  return valFrom(a,["km","kilometro","kilómetro","kmRuta","progresiva"])||"-";
}
function alertDate(a){
  return fd(a.time||a.fecha||a.createdAt||a.ts);
}
function collectAlerts(){
  let alerts=[];
  trs.forEach(t=>(t.alerts||[]).forEach(a=>alerts.push({t,a})));
  alerts.sort((x,y)=>tv(y.a.time||y.a.fecha||y.a.createdAt||y.a.ts)-tv(x.a.time||x.a.fecha||x.a.createdAt||x.a.ts));
  return alerts;
}

async function refresh(){
  [trs,users,clientes,origenes,destinos,embarques]=await Promise.all([
    read("transitos"),read("usuarios"),read("clientes"),read("origenes"),read("destinos"),read("embarque")
  ]);
  refreshFilters();
  renderDash();renderTransitos();renderMapa();renderRep();renderUnits();renderDrivers();renderClients();renderAlerts();
}

function card(t){
  let o=openT(t),r=ruta(t);
  return `<div class="item ${o?"open":"closed"}">
    <div class="top"><span>🚚 Flota ${esc(flota(t)||"-")} / 📦 Emb. ${esc(t.embarque||"-")}</span><span class="badge ${o?"":"closed"}">${o?"En tránsito":"Finalizado"}</span></div>
    <div class="metaGrid">
      <div><b>Cliente:</b> ${esc(r.cliente||"-")}</div>
      <div><b>Lote/Carga:</b> ${esc(t.lote||"-")}</div>
      <div><b>Origen:</b> ${esc(r.origen||"-")}</div>
      <div><b>Destino:</b> ${esc(r.destino||"-")}</div>
      <div><b>Inicio:</b> ${fd(t.start?.time||t.start)}</div>
      <div><b>Cierre:</b> ${o?"-":fd(t.closed?.time||t.closed)}</div>
      <div class="fullLine"><b>Últ. posición:</b> ${esc(locFull(t))}</div>
      <div class="fullLine"><b>Últ. alerta:</b> ${esc(alertT(t))}</div>
    </div>
  </div>`;
}

function filt(t){
  let e=q("fEmb")?.value.toLowerCase()||"",f=q("fFlo")?.value||"",c=q("fCli")?.value||"",s=q("fEst")?.value||"";
  return(!e||String(t.embarque||"").toLowerCase().includes(e))&&(!f||flota(t)===f)&&(!c||String(ruta(t).cliente||"")===c)&&(!s||(s==="abierto"?openT(t):!openT(t)));
}

function renderDashAlerts(){
  let alerts=collectAlerts();
  if(!alerts.length){q("dashAlerts").innerHTML='<div class="alertEmpty">Sin alertas activas.</div>';return;}
  q("dashAlerts").innerHTML=`<div class="alertListCompact">`+alerts.map(x=>{
    let tipo=esc(x.a.tipo||x.a.type||x.a.motivo||"Alerta");
    return `<div class="alertCard">
      <div class="alertTop"><span>⚠️ ${tipo}</span><span>${alertDate(x.a)}</span></div>
      <div class="alertInfo">
        <div><b>Emb.:</b> ${esc(x.t.embarque||"-")}</div>
        <div><b>Flota:</b> ${esc(flota(x.t)||"-")}</div>
        <div><b>Km:</b> ${esc(alertKm(x.a))}</div>
        <div><b>Estado:</b> ${openT(x.t)?"En tránsito":"Finalizado"}</div>
        <div class="fullLine"><b>Localidad:</b> ${esc(alertLoc(x.a,x.t))}</div>
      </div>
    </div>`;
  }).join("")+`</div>`;
}

function renderAlerts(){
  let alerts=collectAlerts();
  q("alertList").innerHTML=alerts.map(x=>`<div class="item">
    <div class="top"><span>⚠️ ${esc(x.a.tipo||x.a.type||x.a.motivo||"Alerta")}</span><span class="badge">Emb. ${esc(x.t.embarque||"-")}</span></div>
    <div class="metaGrid">
      <div><b>Flota:</b> ${esc(flota(x.t)||"-")}</div>
      <div><b>Km:</b> ${esc(alertKm(x.a))}</div>
      <div><b>Fecha/Hora:</b> ${alertDate(x.a)}</div>
      <div><b>Estado:</b> ${openT(x.t)?"En tránsito":"Finalizado"}</div>
      <div class="fullLine"><b>Localidad:</b> ${esc(alertLoc(x.a,x.t))}</div>
    </div>
  </div>`).join("")||'<div class="item">Sin alertas registradas.</div>';
}




/* ===== V1.2.18 - Graficos barra compactos ===== */

function renderCompactBarChart(id, data, limit=4){
  let el=q(id);
  if(!el)return;
  let entries=Object.entries(data).filter(([k,v])=>v>0).sort((a,b)=>b[1]-a[1]).slice(0,limit);
  let total=Object.values(data).reduce((a,b)=>a+b,0);
  if(!entries.length||!total){
    el.innerHTML='<div class="chartEmpty">Sin información disponible.</div>';
    return;
  }
  el.innerHTML=`<div class="barChartBlock">`+entries.map(([k,v])=>{
    let pct=Math.round((v/total)*100);
    return `<div class="barChartItem">
      <div class="barChartName" title="${esc(k)}">${esc(k)}</div>
      <div class="barChartVal">${v}</div>
      <div class="barChartPct">${pct}%</div>
      <div class="barLine"><div class="barLineFill" style="width:${pct}%"></div></div>
    </div>`;
  }).join("")+`</div>`;
}

function renderEstadoPie(abiertos,cerrados,total){
  let el=q("chartEstado");
  if(!el)return;
  let pOpen=total?Math.round((abiertos/total)*100):0;
  let pClosed=total?Math.round((cerrados/total)*100):0;
  el.innerHTML=`<div class="estadoSummary">
    <div class="estadoMini open"><b>${abiertos}</b><small>En tránsito · ${pOpen}%</small></div>
    <div class="estadoMini closed"><b>${cerrados}</b><small>Finalizado · ${pClosed}%</small></div>
  </div>
  <div class="barChartBlock">
    <div class="barChartItem">
      <div class="barChartName">En tránsito</div>
      <div class="barChartVal">${abiertos}</div>
      <div class="barChartPct">${pOpen}%</div>
      <div class="barLine"><div class="barLineFill" style="width:${pOpen}%"></div></div>
    </div>
    <div class="barChartItem">
      <div class="barChartName">Finalizado</div>
      <div class="barChartVal">${cerrados}</div>
      <div class="barChartPct">${pClosed}%</div>
      <div class="barLine"><div class="barLineFill" style="width:${pClosed}%;background:linear-gradient(90deg,#8b5cf6,#55b8ff)"></div></div>
    </div>
  </div>`;
}

function renderPieChart(id,data,limit=4){
  renderCompactBarChart(id,data,limit);
}


/* ===== V1.2.18 - Reaseguro gráficos barra compactos ===== */

function renderCompactBarChart(id, data, limit=4){
  let el=q(id);
  if(!el)return;
  let entries=Object.entries(data).filter(([k,v])=>v>0).sort((a,b)=>b[1]-a[1]).slice(0,limit);
  let total=Object.values(data).reduce((a,b)=>a+b,0);
  if(!entries.length||!total){
    el.innerHTML='<div class="chartEmpty">Sin información disponible.</div>';
    return;
  }
  el.innerHTML=`<div class="barChartBlock">`+entries.map(([k,v])=>{
    let pct=Math.round((v/total)*100);
    return `<div class="barChartItem">
      <div class="barChartName" title="${esc(k)}">${esc(k)}</div>
      <div class="barChartVal">${v}</div>
      <div class="barChartPct">${pct}%</div>
      <div class="barLine"><div class="barLineFill" style="width:${pct}%"></div></div>
    </div>`;
  }).join("")+`</div>`;
}

function renderEstadoPie(abiertos,cerrados,total){
  let el=q("chartEstado");
  if(!el)return;
  let pOpen=total?Math.round((abiertos/total)*100):0;
  let pClosed=total?Math.round((cerrados/total)*100):0;
  el.innerHTML=`<div class="estadoSummary">
    <div class="estadoMini open"><b>${abiertos}</b><small>En tránsito · ${pOpen}%</small></div>
    <div class="estadoMini closed"><b>${cerrados}</b><small>Finalizado · ${pClosed}%</small></div>
  </div>
  <div class="barChartBlock">
    <div class="barChartItem">
      <div class="barChartName">En tránsito</div>
      <div class="barChartVal">${abiertos}</div>
      <div class="barChartPct">${pOpen}%</div>
      <div class="barLine"><div class="barLineFill" style="width:${pOpen}%"></div></div>
    </div>
    <div class="barChartItem">
      <div class="barChartName">Finalizado</div>
      <div class="barChartVal">${cerrados}</div>
      <div class="barChartPct">${pClosed}%</div>
      <div class="barLine"><div class="barLineFill" style="width:${pClosed}%;background:linear-gradient(90deg,#8b5cf6,#55b8ff)"></div></div>
    </div>
  </div>`;
}

function renderPieChart(id,data,limit=4){
  renderCompactBarChart(id,data,limit);
}


/* ===== V1.2.18 - Dashboard 4 gráficos + últimas alertas compactas ===== */

function renderCompactBarChart(id, data, limit=4){
  let el=q(id);
  if(!el)return;
  let entries=Object.entries(data).filter(([k,v])=>v>0).sort((a,b)=>b[1]-a[1]).slice(0,limit);
  let total=Object.values(data).reduce((a,b)=>a+b,0);
  if(!entries.length||!total){
    el.innerHTML='<div class="chartEmpty">Sin información disponible.</div>';
    return;
  }
  el.innerHTML=`<div class="barChartBlock">`+entries.map(([k,v])=>{
    let pct=Math.round((v/total)*100);
    return `<div class="barChartItem">
      <div class="barChartName" title="${esc(k)}">${esc(k)}</div>
      <div class="barChartVal">${v}</div>
      <div class="barChartPct">${pct}%</div>
      <div class="barLine"><div class="barLineFill" style="width:${pct}%"></div></div>
    </div>`;
  }).join("")+`</div>`;
}

function renderEstadoPie(abiertos,cerrados,total){
  let el=q("chartEstado");
  if(!el)return;
  let pOpen=total?Math.round((abiertos/total)*100):0;
  let pClosed=total?Math.round((cerrados/total)*100):0;
  el.innerHTML=`<div class="estadoSummary">
    <div class="estadoMini open"><b>${abiertos}</b><small>En tránsito · ${pOpen}%</small></div>
    <div class="estadoMini closed"><b>${cerrados}</b><small>Finalizado · ${pClosed}%</small></div>
  </div>
  <div class="barChartBlock">
    <div class="barChartItem">
      <div class="barChartName">En tránsito</div>
      <div class="barChartVal">${abiertos}</div>
      <div class="barChartPct">${pOpen}%</div>
      <div class="barLine"><div class="barLineFill" style="width:${pOpen}%"></div></div>
    </div>
    <div class="barChartItem">
      <div class="barChartName">Finalizado</div>
      <div class="barChartVal">${cerrados}</div>
      <div class="barChartPct">${pClosed}%</div>
      <div class="barLine"><div class="barLineFill" style="width:${pClosed}%;background:linear-gradient(90deg,#8b5cf6,#55b8ff)"></div></div>
    </div>
  </div>`;
}

function renderPieChart(id,data,limit=4){
  renderCompactBarChart(id,data,limit);
}

function renderDashAlerts(){
  let alerts=[];
  trs.forEach(t=>(t.alerts||[]).forEach(a=>alerts.push({t,a})));
  alerts.sort((x,y)=>tv(y.a.time||y.a.fecha||y.a.createdAt||y.a.ts)-tv(x.a.time||x.a.fecha||x.a.createdAt||x.a.ts));
  if(!q("dashAlerts"))return;
  if(!alerts.length){
    q("dashAlerts").innerHTML='<div class="alertEmpty">Sin alertas activas.</div>';
    return;
  }
  q("dashAlerts").innerHTML=alerts.slice(0,3).map(x=>{
    let tipo=esc(x.a.tipo||x.a.type||x.a.motivo||"Alerta");
    let emb=esc(x.t.embarque||"-");
    let flo=esc(flota(x.t)||"-");
    let fecha=fd(x.a.time||x.a.fecha||x.a.createdAt||x.a.ts);
    return `<div class="alertLine">• ${tipo} · Emb. ${emb} · Flota ${flo} · ${fecha}</div>`;
  }).join("");
}




/* ===== V1.2.18 - SOLO vista Tránsitos: tarjeta como imagen ===== */

function valFrom(obj, keys){
  for(let k of keys){
    let v=obj&&obj[k];
    if(v!==undefined&&v!==null&&String(v).trim()!=="")return v;
  }
  return "";
}
function driverName(t){
  return valFrom(t,["chofer","driver","conductor","nombreChofer"])||
         valFrom(t.user||{},["name","nombre","chofer","driver","user"])||
         valFrom(lastU(t)||{},["chofer","driver","conductor"])||
         "-";
}
function locFull(t){
  let u=lastU(t)||{};
  let sources=[u.gps,u.ultimaPosicion,u.position,u.location,u.posicion,t.ultimaPosicion,t.lastPosition,t.position,t.location,t.posicion,u].filter(Boolean);
  for(let gps of sources){
    let direct=valFrom(gps,["ubicacionTexto","ubicacion","localidadProvincia","address","direccion","formatted_address"]);
    if(direct)return direct;
    let locTxt=[valFrom(gps,["localidad","city","ciudad","municipio","partido"]), valFrom(gps,["provincia","state","region"])].filter(Boolean).join(", ");
    if(locTxt)return locTxt;
    let lat=valFrom(gps,["lat","latitude","latitud"]);
    let lng=valFrom(gps,["lng","lon","longitude","longitud"]);
    if(lat&&lng)return `${lat}, ${lng}`;
  }
  return "-";
}
function loc(t){return locFull(t)}
function alertLoc(a,t){
  let gps=a.gps||a.ubicacion||a.posicion||a.location||{};
  return valFrom(a,["localidad","ubicacionTexto","ubicacion","lugar","zona","city","ciudad"])||
         valFrom(gps,["localidad","ubicacionTexto","ubicacion","city","ciudad"])||
         locFull(t);
}
function alertKm(a){
  return valFrom(a,["km","kilometro","kilómetro","kmRuta","progresiva"])||"-";
}
function alertDate(a){
  return fd(a.time||a.fecha||a.createdAt||a.ts);
}
function transitAlertsCompact(t){
  let arr=(t.alerts||[]).slice();
  arr.sort((a,b)=>tv(b.time||b.fecha||b.createdAt||b.ts)-tv(a.time||a.fecha||a.createdAt||a.ts));
  if(!arr.length)return '<div class="noAlerts">Sin alertas registradas.</div>';
  return `<div class="transitAlertsBox">`+arr.map(a=>{
    let tipo=esc(a.tipo||a.type||a.motivo||"Alerta");
    return `<div class="transitAlertCard">
      <div class="transitAlertTop"><span>⚠️ ${tipo}</span><span>${alertDate(a)}</span></div>
      <div class="transitAlertGrid">
        <div><b>Km:</b> ${esc(alertKm(a))}</div>
        <div><b>Hora:</b> ${alertDate(a)}</div>
        <div class="fullLine"><b>Localidad:</b> ${esc(alertLoc(a,t))}</div>
      </div>
    </div>`;
  }).join("")+`</div>`;
}

function card(t){
  let o=openT(t),r=ruta(t);
  return `<div class="item ${o?"open":"closed"} transitCardV1210">
    <div class="transitLeft">
      <div class="transitTop">
        <div class="transitTitle">🚚 Flota ${esc(flota(t)||"-")} / 📦 Emb. ${esc(t.embarque||"-")}</div>
        <span class="transitBadge ${o?"open":""}">${o?"Abierto":"Finalizado"}</span>
      </div>
      <div class="transitDataGrid">
        <div><b>Chofer:</b> ${esc(driverName(t))}</div>
        <div><b>Cliente:</b> ${esc(r.cliente||"-")}</div>
        <div><b>Origen:</b> ${esc(r.origen||"-")}</div>
        <div><b>Destino:</b> ${esc(r.destino||"-")}</div>
        <div><b>Lote/Carga:</b> ${esc(t.lote||"-")}</div>
        <div><b>Inicio:</b> ${fd(t.start?.time||t.start)}</div>
        <div><b>Cierre:</b> ${o?"-":fd(t.closed?.time||t.closed)}</div>
        <div class="fullLine"><b>Últ. posición:</b> ${esc(locFull(t))}</div>
      </div>
    </div>
    <div class="transitRight">
      <h4 class="alertsTitle">⚠️ Alertas</h4>
      ${transitAlertsCompact(t)}
    </div>
  </div>`;
}




/* ===== V1.2.18 - Localidad/provincia desde coordenadas conocidas ===== */
function parseCoordPair(txt){
  let s=String(txt||"");
  let m=s.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
  if(!m)return null;
  return {lat:parseFloat(m[1]), lng:parseFloat(m[2])};
}
function distKm(a,b){
  let R=6371, dLat=(b.lat-a.lat)*Math.PI/180, dLng=(b.lng-a.lng)*Math.PI/180;
  let la1=a.lat*Math.PI/180, la2=b.lat*Math.PI/180;
  let x=Math.sin(dLat/2)**2+Math.cos(la1)*Math.cos(la2)*Math.sin(dLng/2)**2;
  return 2*R*Math.asin(Math.sqrt(x));
}
function coordToLocalidadProvincia(lat,lng){
  let p={lat:Number(lat),lng:Number(lng)};
  if(!isFinite(p.lat)||!isFinite(p.lng))return "";
  let refs=[
    {lat:-34.3512317,lng:-58.8042567,name:"Belén de Escobar, Buenos Aires"},
    {lat:-34.6160377,lng:-58.4588818,name:"Caballito, CABA"},
    {lat:-34.6171148,lng:-58.4583581,name:"Caballito, CABA"},
    {lat:-34.0910132,lng:-59.0895417,name:"Zárate, Buenos Aires"},
    {lat:-34.603722,lng:-58.381592,name:"Ciudad Autónoma de Buenos Aires, CABA"},
    {lat:-34.095,lng:-59.024,name:"Campana, Buenos Aires"},
    {lat:-34.436,lng:-58.706,name:"Tigre, Buenos Aires"},
    {lat:-34.470,lng:-58.528,name:"San Fernando, Buenos Aires"},
    {lat:-34.522,lng:-58.700,name:"Malvinas Argentinas, Buenos Aires"},
    {lat:-34.686,lng:-58.563,name:"La Matanza, Buenos Aires"},
    {lat:-34.921,lng:-57.954,name:"La Plata, Buenos Aires"},
    {lat:-32.946,lng:-60.639,name:"Rosario, Santa Fe"},
    {lat:-31.420,lng:-64.188,name:"Córdoba, Córdoba"},
    {lat:-41.133,lng:-71.310,name:"San Carlos de Bariloche, Río Negro"}
  ];
  let best=refs.map(r=>({name:r.name,d:distKm(p,r)})).sort((a,b)=>a.d-b.d)[0];
  if(best&&best.d<=35)return best.name;
  return `${p.lat.toFixed(6)}, ${p.lng.toFixed(6)}`;
}
function localidadFromObj(obj){
  if(!obj)return "";
  let direct=valFrom(obj,["localidadProvincia","ubicacionTexto","localidadTexto","ciudadProvincia"]);
  if(direct)return direct;
  let loc=[valFrom(obj,["localidad","city","ciudad","municipio","partido"]), valFrom(obj,["provincia","state","region"])].filter(Boolean).join(", ");
  if(loc)return loc;
  let lat=valFrom(obj,["lat","latitude","latitud"]);
  let lng=valFrom(obj,["lng","lon","longitude","longitud"]);
  if(lat&&lng)return coordToLocalidadProvincia(lat,lng);
  let coord=valFrom(obj,["ubicacion","address","direccion","formatted_address"]);
  let pair=parseCoordPair(coord);
  if(pair)return coordToLocalidadProvincia(pair.lat,pair.lng);
  return coord||"";
}
function locFull(t){
  let u=lastU(t)||{};
  let sources=[u.gps,u.ultimaPosicion,u.position,u.location,u.posicion,t.ultimaPosicion,t.lastPosition,t.position,t.location,t.posicion,u].filter(Boolean);
  for(let src of sources){
    let v=localidadFromObj(src);
    if(v)return v;
  }
  return "-";
}
function loc(t){return locFull(t)}
function alertLoc(a,t){
  let sources=[a,a.gps,a.ubicacion,a.posicion,a.location].filter(Boolean);
  for(let src of sources){
    let v=localidadFromObj(src);
    if(v)return v;
  }
  return locFull(t);
}
function card(t){
  let o=openT(t),r=ruta(t);
  return `<div class="item ${o?"open":"closed"} transitCardV1210">
    <div class="transitLeft">
      <div class="transitTop">
        <div class="transitTitle">🚚 Flota ${esc(flota(t)||"-")} / 📦 Emb. ${esc(t.embarque||"-")}</div>
        <span class="transitBadge ${o?"open":""}">${o?"Abierto":"Finalizado"}</span>
      </div>
      <div class="transitDataGrid">
        <div><b>Chofer:</b> ${esc(driverName(t))}</div>
        <div><b>Cliente:</b> ${esc(r.cliente||"-")}</div>
        <div><b>Origen:</b> ${esc(r.origen||"-")}</div>
        <div><b>Destino:</b> ${esc(r.destino||"-")}</div>
        <div><b>Lote/Carga:</b> ${esc(t.lote||"-")}</div>
        <div><b>Inicio:</b> ${fd(t.start?.time||t.start)}</div>
        <div><b>Cierre:</b> ${o?"-":fd(t.closed?.time||t.closed)}</div>
        <div class="fullLine"><b>Últ. posición:</b> ${esc(locFull(t))}</div>
      </div>
    </div>
    <div class="transitRight">
      <h4 class="alertsTitle">⚠️ Alertas</h4>
      ${transitAlertsCompact(t)}
    </div>
  </div>`;
}



/* ===== V1.2.18 - SOLO vista Seguimiento: mapa real GPS ===== */
let seguimientoMap=null;
let seguimientoMarkers=[];

function getPosObj(t){
  let u=lastU(t)||{};
  let sources=[u.gps,u.ultimaPosicion,u.position,u.location,u.posicion,t.ultimaPosicion,t.lastPosition,t.position,t.location,t.posicion,u].filter(Boolean);
  for(let s of sources){
    let lat=valFrom(s,["lat","latitude","latitud"]);
    let lng=valFrom(s,["lng","lon","longitude","longitud"]);
    if(lat&&lng&&!isNaN(Number(lat))&&!isNaN(Number(lng)))return {lat:Number(lat),lng:Number(lng),src:s};
    let coord=valFrom(s,["ubicacion","address","direccion","formatted_address"]);
    let pair=parseCoordPair(coord);
    if(pair)return {lat:pair.lat,lng:pair.lng,src:s};
  }
  return null;
}
function trackingAlertsHtml(t){
  let arr=(t.alerts||[]).slice();
  arr.sort((a,b)=>tv(b.time||b.fecha||b.createdAt||b.ts)-tv(a.time||a.fecha||a.createdAt||a.ts));
  if(!arr.length)return '<div class="trackingAlertItem">Sin alertas registradas.</div>';
  return arr.map(a=>{
    let tipo=esc(a.tipo||a.type||a.motivo||"Alerta");
    return `<div class="trackingAlertItem"><div class="trackingAlertTop"><span>⚠️ ${tipo}</span><span>${alertDate(a)}</span></div><div><b>Localidad:</b> ${esc(alertLoc(a,t))}</div><div><b>Km:</b> ${esc(alertKm(a))}</div></div>`;
  }).join("");
}
function trackingCard(t){
  let o=openT(t),r=ruta(t),pos=getPosObj(t);
  return `<div class="trackingCard"><div class="trackingCardTop"><div class="trackingFleetTitle">🚚 Flota ${esc(flota(t)||"-")}</div><span class="trackingState ${o?"":"closed"}">${o?"Abierto":"Finalizado"}</span></div><div class="trackingData"><div><b>Emb.:</b> ${esc(t.embarque||"-")}</div><div><b>Chofer:</b> ${esc(typeof driverName==="function"?driverName(t):"-")}</div><div class="fullLine"><b>Ubicación:</b> ${esc(locFull(t))}</div><div><b>Cliente:</b> ${esc(r.cliente||"-")}</div><div><b>Destino:</b> ${esc(r.destino||"-")}</div><div><b>Últ. reporte:</b> ${fd((lastU(t)||{}).time||(lastU(t)||{}).fecha||(lastU(t)||{}).createdAt)}</div><div><b>Coordenadas:</b> ${pos?`${pos.lat.toFixed(6)}, ${pos.lng.toFixed(6)}`:"-"}</div></div><div class="trackingAlerts"><h4>⚠️ Alertas del tránsito</h4>${trackingAlertsHtml(t)}</div></div>`;
}
function initSeguimientoMap(items){
  if(typeof L==="undefined"||!q("realMap"))return;
  let withPos=items.map(t=>({t,pos:getPosObj(t)})).filter(x=>x.pos);
  if(!seguimientoMap){
    seguimientoMap=L.map("realMap",{zoomControl:true});
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:"&copy; OpenStreetMap"}).addTo(seguimientoMap);
  }
  seguimientoMarkers.forEach(m=>m.remove());
  seguimientoMarkers=[];
  if(!withPos.length){seguimientoMap.setView([-34.6037,-58.3816],8);setTimeout(()=>seguimientoMap.invalidateSize(),150);return;}
  let bounds=[];
  withPos.forEach(({t,pos})=>{
    let icon=L.divIcon({className:"eltaTruckMarker",html:"🚚",iconSize:[28,28],iconAnchor:[14,14]});
    let marker=L.marker([pos.lat,pos.lng],{icon}).addTo(seguimientoMap);
    marker.bindPopup(`<div class="mapPopup"><b>Flota ${esc(flota(t)||"-")}</b><br>Emb.: ${esc(t.embarque||"-")}<br>Ubicación: ${esc(locFull(t))}<br>Cliente: ${esc(ruta(t).cliente||"-")}<br>Estado: ${openT(t)?"Abierto":"Finalizado"}</div>`);
    seguimientoMarkers.push(marker);
    bounds.push([pos.lat,pos.lng]);
  });
  if(bounds.length===1)seguimientoMap.setView(bounds[0],12); else seguimientoMap.fitBounds(bounds,{padding:[35,35]});
  setTimeout(()=>seguimientoMap.invalidateSize(),150);
}
function renderMapa(){
  let items=trs.filter(openT);
  if(!items.length)items=trs.slice().sort((a,b)=>tv(b.start?.time||b.start)-tv(a.start?.time||a.start)).slice(0,20);
  if(q("mapList"))q("mapList").innerHTML=items.map(trackingCard).join("")||'<div class="trackingCard">No hay flotas para mostrar.</div>';
  initSeguimientoMap(items);
}



/* ===== V1.2.18 - Seguimiento: fix mapa y localidad/provincia ===== */
function trackingCard(t){
  let o=openT(t),r=ruta(t),pos=getPosObj(t);
  return `<div class="trackingCard">
    <div class="trackingCardTop">
      <div class="trackingFleetTitle">🚚 Flota ${esc(flota(t)||"-")}</div>
      <span class="trackingState ${o?"":"closed"}">${o?"Abierto":"Finalizado"}</span>
    </div>
    <div class="trackingData">
      <div><b>Emb.:</b> ${esc(t.embarque||"-")}</div>
      <div><b>Chofer:</b> ${esc(typeof driverName==="function"?driverName(t):"-")}</div>
      <div class="locationLine"><b>Ubicación:</b> ${esc(locFull(t))}</div>
      <div><b>Cliente:</b> ${esc(r.cliente||"-")}</div>
      <div><b>Destino:</b> ${esc(r.destino||"-")}</div>
      <div><b>Últ. reporte:</b> ${fd((lastU(t)||{}).time||(lastU(t)||{}).fecha||(lastU(t)||{}).createdAt)}</div>
      <div class="coordLine"><b>Coordenadas:</b> ${pos?`${pos.lat.toFixed(6)}, ${pos.lng.toFixed(6)}`:"-"}</div>
    </div>
    <div class="trackingAlerts">
      <h4>⚠️ Alertas del tránsito</h4>
      ${trackingAlertsHtml(t)}
    </div>
  </div>`;
}

function initSeguimientoMap(items){
  if(typeof L==="undefined"||!q("realMap"))return;
  let withPos=items.map(t=>({t,pos:getPosObj(t)})).filter(x=>x.pos);

  if(!seguimientoMap){
    seguimientoMap=L.map("realMap",{zoomControl:true,preferCanvas:true});
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{
      maxZoom:19,
      attribution:"&copy; OpenStreetMap"
    }).addTo(seguimientoMap);
  }

  seguimientoMarkers.forEach(m=>m.remove());
  seguimientoMarkers=[];

  setTimeout(()=>seguimientoMap.invalidateSize(true),100);
  setTimeout(()=>seguimientoMap.invalidateSize(true),350);
  setTimeout(()=>seguimientoMap.invalidateSize(true),800);

  if(!withPos.length){
    seguimientoMap.setView([-34.6037,-58.3816],8);
    return;
  }

  let bounds=[];
  withPos.forEach(({t,pos})=>{
    let icon=L.divIcon({className:"eltaTruckMarker",html:"🚚",iconSize:[28,28],iconAnchor:[14,14]});
    let marker=L.marker([pos.lat,pos.lng],{icon}).addTo(seguimientoMap);
    marker.bindPopup(`<div class="mapPopup">
      <b>Flota ${esc(flota(t)||"-")}</b><br>
      Emb.: ${esc(t.embarque||"-")}<br>
      Ubicación: ${esc(locFull(t))}<br>
      Cliente: ${esc(ruta(t).cliente||"-")}<br>
      Estado: ${openT(t)?"Abierto":"Finalizado"}
    </div>`);
    seguimientoMarkers.push(marker);
    bounds.push([pos.lat,pos.lng]);
  });

  if(bounds.length===1)seguimientoMap.setView(bounds[0],13);
  else seguimientoMap.fitBounds(bounds,{padding:[35,35]});
}

const _tab_v1213 = tab;
tab = function(id){
  _tab_v1213(id);
  if(id==="mapa"){
    setTimeout(()=>{renderMapa(); if(seguimientoMap)seguimientoMap.invalidateSize(true);},150);
    setTimeout(()=>{if(seguimientoMap)seguimientoMap.invalidateSize(true);},600);
  }
};




/* ===== V1.2.18 - Seguimiento: zoom a todas las flotas en transito + marcador con numero ===== */

function markerHtmlForFleet(t){
  let fleet=esc(flota(t)||"-");
  let cls=openT(t)?"":" closed";
  return `<div class="eltaFleetMarker${cls}">
    <span class="truckIcon">🚚</span>
    <span class="fleetNumber">${fleet}</span>
  </div>`;
}

function initSeguimientoMap(items){
  if(typeof L==="undefined"||!q("realMap"))return;

  // Solo posicionar en mapa las flotas en tránsito con GPS.
  let withPos=items.filter(openT).map(t=>({t,pos:getPosObj(t)})).filter(x=>x.pos);

  if(!seguimientoMap){
    seguimientoMap=L.map("realMap",{
      zoomControl:true,
      preferCanvas:true,
      worldCopyJump:true
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{
      maxZoom:19,
      attribution:"&copy; OpenStreetMap"
    }).addTo(seguimientoMap);
  }

  seguimientoMarkers.forEach(m=>m.remove());
  seguimientoMarkers=[];

  setTimeout(()=>seguimientoMap.invalidateSize(true),100);
  setTimeout(()=>seguimientoMap.invalidateSize(true),350);
  setTimeout(()=>seguimientoMap.invalidateSize(true),800);

  if(!withPos.length){
    seguimientoMap.setView([-34.6037,-58.3816],8);
    return;
  }

  let bounds=[];
  withPos.forEach(({t,pos})=>{
    let icon=L.divIcon({
      className:"eltaFleetMarkerWrap",
      html:markerHtmlForFleet(t),
      iconSize:[54,34],
      iconAnchor:[27,17]
    });

    let marker=L.marker([pos.lat,pos.lng],{icon}).addTo(seguimientoMap);
    marker.bindPopup(`<div class="mapPopup">
      <div class="fleetPopupTitle">🚚 Flota ${esc(flota(t)||"-")}</div>
      Emb.: ${esc(t.embarque||"-")}<br>
      Ubicación: ${esc(locFull(t))}<br>
      Cliente: ${esc(ruta(t).cliente||"-")}<br>
      Estado: ${openT(t)?"Abierto":"Finalizado"}
    </div>`);
    seguimientoMarkers.push(marker);
    bounds.push([pos.lat,pos.lng]);
  });

  // Ajusta zoom para que se vean TODAS las flotas en tránsito.
  if(bounds.length===1){
    seguimientoMap.setView(bounds[0],12);
  }else{
    seguimientoMap.fitBounds(bounds,{
      padding:[70,70],
      maxZoom:13
    });
  }
}

function renderMapa(){
  let abiertos=trs.filter(openT);
  let items=abiertos.length?abiertos:trs.slice().sort((a,b)=>tv(b.start?.time||b.start)-tv(a.start?.time||a.start)).slice(0,20);
  if(q("mapList"))q("mapList").innerHTML=items.map(trackingCard).join("")||'<div class="trackingCard">No hay flotas para mostrar.</div>';
  initSeguimientoMap(items);
}




/* ===== V1.2.18 - Seguimiento: marcador numerico estilo etiqueta ===== */

function markerHtmlForFleet(t){
  let fleet=esc(flota(t)||"-");
  let cls=openT(t)?"":" closed";
  return `<div class="eltaFleetMarker${cls}">
    <span class="fleetNumber">${fleet}</span>
    <span class="fleetLabel">Flota ${fleet}</span>
  </div>`;
}

function initSeguimientoMap(items){
  if(typeof L==="undefined"||!q("realMap"))return;

  let withPos=items.filter(openT).map(t=>({t,pos:getPosObj(t)})).filter(x=>x.pos);

  if(!seguimientoMap){
    seguimientoMap=L.map("realMap",{
      zoomControl:true,
      preferCanvas:true,
      worldCopyJump:true
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{
      maxZoom:19,
      attribution:"&copy; OpenStreetMap"
    }).addTo(seguimientoMap);
  }

  seguimientoMarkers.forEach(m=>m.remove());
  seguimientoMarkers=[];

  setTimeout(()=>seguimientoMap.invalidateSize(true),100);
  setTimeout(()=>seguimientoMap.invalidateSize(true),350);
  setTimeout(()=>seguimientoMap.invalidateSize(true),800);

  if(!withPos.length){
    seguimientoMap.setView([-34.6037,-58.3816],8);
    return;
  }

  let bounds=[];
  withPos.forEach(({t,pos})=>{
    let icon=L.divIcon({
      className:"eltaFleetMarkerWrap",
      html:markerHtmlForFleet(t),
      iconSize:[56,48],
      iconAnchor:[28,39],
      popupAnchor:[0,-38]
    });

    let marker=L.marker([pos.lat,pos.lng],{icon}).addTo(seguimientoMap);
    marker.bindPopup(`<div class="mapPopup">
      <div class="fleetPopupTitle">Flota ${esc(flota(t)||"-")}</div>
      Emb.: ${esc(t.embarque||"-")}<br>
      Ubicación: ${esc(locFull(t))}<br>
      Cliente: ${esc(ruta(t).cliente||"-")}<br>
      Estado: ${openT(t)?"Abierto":"Finalizado"}
    </div>`);
    seguimientoMarkers.push(marker);
    bounds.push([pos.lat,pos.lng]);
  });

  if(bounds.length===1){
    seguimientoMap.setView(bounds[0],12);
  }else{
    seguimientoMap.fitBounds(bounds,{
      padding:[80,80],
      maxZoom:13
    });
  }
}




/* ===== V1.2.18 - Seguimiento: solo numero, zoom con todas las flotas, ultimo reporte resaltado ===== */

function markerHtmlForFleet(t){
  let fleet=esc(flota(t)||"-");
  let cls=openT(t)?"":" closed";
  return `<div class="eltaFleetMarker${cls}">
    <span class="fleetNumber">${fleet}</span>
  </div>`;
}

function trackingCard(t){
  let o=openT(t),r=ruta(t);
  let last=(lastU(t)||{}).time||(lastU(t)||{}).fecha||(lastU(t)||{}).createdAt||(lastU(t)||{}).ts;
  return `<div class="trackingCard">
    <div class="trackingCardTop">
      <div class="trackingFleetTitle">Flota ${esc(flota(t)||"-")}</div>
      <span class="trackingState ${o?"":"closed"}">${o?"Abierto":"Finalizado"}</span>
    </div>
    <div class="trackingData">
      <div><b>Emb.:</b> ${esc(t.embarque||"-")}</div>
      <div><b>Chofer:</b> ${esc(typeof driverName==="function"?driverName(t):"-")}</div>
      <div class="locationLine"><b>Ubicación:</b> ${esc(locFull(t))}</div>
      <div><b>Cliente:</b> ${esc(r.cliente||"-")}</div>
      <div><b>Destino:</b> ${esc(r.destino||"-")}</div>
      <div class="trackingReportLine"><b>Últ. reporte:</b> ${fd(last)}</div>
    </div>
    <div class="trackingAlerts">
      <h4>⚠️ Alertas del tránsito</h4>
      ${trackingAlertsHtml(t)}
    </div>
  </div>`;
}

function initSeguimientoMap(items){
  if(typeof L==="undefined"||!q("realMap"))return;

  // Mostrar en mapa todas las flotas con posicion dentro del conjunto renderizado.
  // Si hay abiertas, el conjunto ya viene filtrado desde renderMapa.
  let withPos=items.map(t=>({t,pos:getPosObj(t)})).filter(x=>x.pos);

  if(!seguimientoMap){
    seguimientoMap=L.map("realMap",{
      zoomControl:true,
      preferCanvas:true,
      worldCopyJump:true
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{
      maxZoom:19,
      attribution:"&copy; OpenStreetMap"
    }).addTo(seguimientoMap);
  }

  seguimientoMarkers.forEach(m=>m.remove());
  seguimientoMarkers=[];

  setTimeout(()=>seguimientoMap.invalidateSize(true),80);
  setTimeout(()=>seguimientoMap.invalidateSize(true),300);
  setTimeout(()=>seguimientoMap.invalidateSize(true),750);

  if(!withPos.length){
    seguimientoMap.setView([-34.6037,-58.3816],8);
    return;
  }

  let bounds=[];
  withPos.forEach(({t,pos})=>{
    let icon=L.divIcon({
      className:"eltaFleetMarkerWrap",
      html:markerHtmlForFleet(t),
      iconSize:[64,52],
      iconAnchor:[32,48],
      popupAnchor:[0,-46]
    });

    let marker=L.marker([pos.lat,pos.lng],{icon}).addTo(seguimientoMap);
    marker.bindPopup(`<div class="mapPopup">
      <div class="fleetPopupTitle">Flota ${esc(flota(t)||"-")}</div>
      Emb.: ${esc(t.embarque||"-")}<br>
      Ubicación: ${esc(locFull(t))}<br>
      Cliente: ${esc(ruta(t).cliente||"-")}<br>
      Estado: ${openT(t)?"Abierto":"Finalizado"}
    </div>`);
    seguimientoMarkers.push(marker);
    bounds.push([pos.lat,pos.lng]);
  });

  setTimeout(()=>{
    if(bounds.length===1){
      seguimientoMap.setView(bounds[0],12);
    }else{
      let group=L.featureGroup(seguimientoMarkers);
      seguimientoMap.fitBounds(group.getBounds(),{
        paddingTopLeft:[80,80],
        paddingBottomRight:[80,80],
        maxZoom:12
      });
    }
    seguimientoMap.invalidateSize(true);
  },120);
}

function renderMapa(){
  let abiertos=trs.filter(openT);
  let items=abiertos.length?abiertos:trs.slice().sort((a,b)=>tv(b.start?.time||b.start)-tv(a.start?.time||a.start)).slice(0,20);
  if(q("mapList"))q("mapList").innerHTML=items.map(trackingCard).join("")||'<div class="trackingCard">No hay flotas para mostrar.</div>';
  initSeguimientoMap(items);
}




/* ===== V1.2.18 - Seguimiento: filtros cliente/embarque + marker 50% ===== */

function refreshSeguimientoFilters(){
  let cli=q("segCli");
  if(!cli)return;
  let current=cli.value;
  let vals=[...new Set(trs.map(t=>String(ruta(t).cliente||"").trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"es"));
  cli.innerHTML='<option value="">Todos los clientes</option>'+vals.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join("");
  if([...cli.options].some(o=>o.value===current))cli.value=current;
}

function seguimientoFilter(t){
  let emb=(q("segEmb")?.value||"").toLowerCase().trim();
  let cli=(q("segCli")?.value||"").trim();
  return (!emb || String(t.embarque||"").toLowerCase().includes(emb)) &&
         (!cli || String(ruta(t).cliente||"")===cli);
}

function markerHtmlForFleet(t){
  let fleet=esc(flota(t)||"-");
  let cls=openT(t)?"":" closed";
  return `<div class="eltaFleetMarker${cls}">
    <span class="fleetNumber">${fleet}</span>
  </div>`;
}

function renderMapa(){
  refreshSeguimientoFilters();
  let abiertos=trs.filter(openT).filter(seguimientoFilter);
  let items=abiertos.length ? abiertos : trs.filter(seguimientoFilter).slice().sort((a,b)=>tv(b.start?.time||b.start)-tv(a.start?.time||a.start)).slice(0,20);
  if(q("mapList"))q("mapList").innerHTML=items.map(trackingCard).join("")||'<div class="trackingCard">No hay flotas para mostrar.</div>';
  initSeguimientoMap(items);
}

function initSeguimientoMap(items){
  if(typeof L==="undefined"||!q("realMap"))return;

  let withPos=items.map(t=>({t,pos:getPosObj(t)})).filter(x=>x.pos);

  if(!seguimientoMap){
    seguimientoMap=L.map("realMap",{
      zoomControl:true,
      preferCanvas:true,
      worldCopyJump:true
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{
      maxZoom:19,
      attribution:"&copy; OpenStreetMap"
    }).addTo(seguimientoMap);
  }

  seguimientoMarkers.forEach(m=>m.remove());
  seguimientoMarkers=[];

  setTimeout(()=>seguimientoMap.invalidateSize(true),80);
  setTimeout(()=>seguimientoMap.invalidateSize(true),300);
  setTimeout(()=>seguimientoMap.invalidateSize(true),750);

  if(!withPos.length){
    seguimientoMap.setView([-34.6037,-58.3816],8);
    return;
  }

  withPos.forEach(({t,pos})=>{
    let icon=L.divIcon({
      className:"eltaFleetMarkerWrap",
      html:markerHtmlForFleet(t),
      iconSize:[32,26],
      iconAnchor:[16,24],
      popupAnchor:[0,-24]
    });

    let marker=L.marker([pos.lat,pos.lng],{icon}).addTo(seguimientoMap);
    marker.bindPopup(`<div class="mapPopup">
      <div class="fleetPopupTitle">Flota ${esc(flota(t)||"-")}</div>
      Emb.: ${esc(t.embarque||"-")}<br>
      Ubicación: ${esc(locFull(t))}<br>
      Cliente: ${esc(ruta(t).cliente||"-")}<br>
      Estado: ${openT(t)?"Abierto":"Finalizado"}
    </div>`);
    seguimientoMarkers.push(marker);
  });

  setTimeout(()=>{
    if(seguimientoMarkers.length===1){
      seguimientoMap.setView(seguimientoMarkers[0].getLatLng(),12);
    }else{
      let group=L.featureGroup(seguimientoMarkers);
      seguimientoMap.fitBounds(group.getBounds(),{
        paddingTopLeft:[70,70],
        paddingBottomRight:[70,70],
        maxZoom:12
      });
    }
    seguimientoMap.invalidateSize(true);
  },120);
}




/* ===== V1.2.18 - Solo transitos abiertos + Unidades/Conductores por usuarios role=flota ===== */

function isFlotaUser(u){
  return String(u.role||u.rol||"").toLowerCase().trim()==="flota";
}
function flotaUserId(u){
  return String(u.flota||u.fleet||u.user||u.id||"").trim();
}
function flotaUserName(u){
  return String(u.nombre||u.name||u.chofer||u.conductor||u.user||u.id||"-").trim();
}
function flotaUserPhone(u){
  return String(u.telefono||u.phone||u.celular||u.mobile||"-").trim();
}
function flotaUserActive(u){
  return u.activo===false ? "Inactivo" : "Activo";
}
function renderUnits(){
  let flotas=users.filter(isFlotaUser).sort((a,b)=>flotaUserId(a).localeCompare(flotaUserId(b),"es",{numeric:true}));
  if(!q("unitsList"))return;
  q("unitsList").innerHTML=flotas.map(u=>`<div class="fleetUserCard">
    <div class="fleetUserTop">
      <div class="fleetUserTitle">🚚 Flota ${esc(flotaUserId(u)||"-")}</div>
      <span class="fleetUserRole">flota</span>
    </div>
    <div class="fleetUserData">
      <div><b>Usuario:</b> ${esc(u.user||u.id||"-")}</div>
      <div><b>Estado:</b> ${esc(flotaUserActive(u))}</div>
      <div class="fullLine"><b>Chofer:</b> ${esc(flotaUserName(u))}</div>
      <div><b>Teléfono:</b> ${esc(flotaUserPhone(u))}</div>
      <div><b>Rol:</b> ${esc(u.role||u.rol||"flota")}</div>
    </div>
  </div>`).join("")||'<div class="item">No hay usuarios con role flota.</div>';
}

/* Conductores queda unificado con Unidades por compatibilidad */
function renderDrivers(){
  renderUnits();
}

/* Vista Tránsitos: mostrar solamente tránsitos abiertos */
function renderTransitos(){
  if(q("transList"))q("transList").innerHTML=trs.filter(openT).filter(filt).map(card).join("")||'<div class="item">No hay tránsitos abiertos.</div>';
}

/* Filtros de Tránsitos: estado ya queda limitado a abierto por regla operativa */
function filt(t){
  let e=q("fEmb")?.value.toLowerCase()||"",f=q("fFlo")?.value||"",c=q("fCli")?.value||"";
  return openT(t)&&
        (!e||String(t.embarque||"").toLowerCase().includes(e))&&
        (!f||flota(t)===f||String(t?.user?.fleet||"")===f)&&
        (!c||String(ruta(t).cliente||"")===c);
}

/* Seguimiento: solo flotas con tránsitos abiertos */
function renderMapa(){
  refreshSeguimientoFilters?.();
  let items=trs.filter(openT).filter(typeof seguimientoFilter==="function"?seguimientoFilter:()=>true);
  if(q("mapList"))q("mapList").innerHTML=items.map(trackingCard).join("")||'<div class="trackingCard">No hay flotas abiertas para mostrar.</div>';
  initSeguimientoMap(items);
}

/* Dashboard: ultimos tránsitos solo abiertos */
function renderDashTable(){
  if(!q("dashTable"))return;
  let rows=trs.filter(openT).slice().sort((a,b)=>tv(b.start?.time||b.start)-tv(a.start?.time||a.start)).slice(0,10);
  if(!rows.length){
    q("dashTable").innerHTML='<div class="alertEmpty">Sin tránsitos abiertos.</div>';
    return;
  }
  q("dashTable").innerHTML=`<table class="darkTable"><thead><tr>
    <th>Embarque</th><th>Cliente</th><th>Origen</th><th>Destino</th><th>Flota</th><th>Estado</th><th>Actualizado</th>
  </tr></thead><tbody>`+rows.map(t=>`<tr>
    <td>${esc(t.embarque||"-")}</td>
    <td>${esc(ruta(t).cliente||"-")}</td>
    <td>${esc(ruta(t).origen||"-")}</td>
    <td>${esc(ruta(t).destino||"-")}</td>
    <td>${esc(flota(t)||"-")}</td>
    <td><span class="statusBadge open">En tránsito</span></td>
    <td>${fd((lastU(t)||{}).time||(lastU(t)||{}).fecha||(lastU(t)||{}).createdAt||t.start?.time||t.start)}</td>
  </tr>`).join("")+`</tbody></table>`;
}

/* Reportes: solo abiertos */
function renderRep(){
  let abiertos=trs.filter(openT);
  let by={};
  abiertos.forEach(t=>by[flota(t)||"-"]=(by[flota(t)||"-"]||0)+1);
  if(q("rep"))q("rep").innerHTML=`<div class="item"><b>Tránsitos abiertos:</b> ${abiertos.length}</div><div class="item"><b>Por flota:</b><br>${Object.entries(by).map(([k,v])=>`${esc(k)}: ${v}`).join("<br>")||"-"}</div>`;
}

/* Evitar errores si quedan llamadas internas a Coordinacion */
function renderCoordinacion(){}
