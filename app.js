(function(){
const REPORT_FORM="https://api.leadconnectorhq.com/widget/form/JY95HYe038jUmrF47JH9";
const DOW=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const DAYNAMES={Mon:"Mondays",Tue:"Tuesdays",Wed:"Wednesdays",Thu:"Thursdays",Fri:"Fridays",Sat:"Saturdays",Sun:"Sundays"};
const CATS={arts:"Museums & Arts",outdoors:"Outdoors",games:"Bar Games",music:"Concerts & Nightlife",festival:"Festivals & Community",community:"Festivals & Community",market:"Markets",family:"Family",sports:"Sports",food:"Food Trucks"};
const CAT_ORDER=["games","food","music","arts","festival","outdoors","market","family","sports"];
const CAT_COLOR={games:"var(--teal)",food:"var(--gold)",music:"var(--ember)",arts:"var(--plum)",festival:"var(--gold)",community:"var(--gold)",outdoors:"var(--free)",market:"var(--free)",family:"var(--sky)",sports:"var(--ink)"};
let DATA=null, selDay=0, gameF="All", catF="All", kindF="All";
let KIDS_VIEW=false;
const F={zone:"nearby",hood:"",price:"",daytime:false,late:false,kids:false,dogs:false,baby:false,rail:false,near:false,home:""};
const RAIL=new Set(["Uptown","South End","Lower South End","NoDa","Optimist Park","University City","Dilworth","North End"]);
let NEWK=new Set(), EVK=new Map(), newOnly=false;
let venueSel=null, wkOff=0; let DB=null, USER=null, REPORTED=new Map(), REPORT_N=0; const freeNights=new Set(store0("cltNights",[]));
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
function store0(k,d){try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(e){return d}}
const store={get(k,d){try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
let saved=new Set(store.get("cltSaved",[])), savedDates=store.get("cltDates",[]);

function ymd(d){return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")}
function parseYmd(s){const [y,m,d]=s.split("-").map(Number);return new Date(y,m-1,d,12)}
function mins(t){const m=/(\d{1,2}):(\d{2})\s*(AM|PM)/i.exec(t||"");if(!m){return /evening|sunset/i.test(t||"")?18*60+30:/varies|week/i.test(t||"")?8*60:2000}let h=+m[1]%12;if(/PM/i.test(m[3]))h+=12;return h*60+ +m[2]}
function days(){const out=[];const t=new Date();t.setHours(12,0,0,0);for(let i=0;i<7;i++){const d=new Date(t);d.setDate(t.getDate()+i);out.push(d)}return out}
function stripDays(){const out=[];const t=new Date();t.setHours(12,0,0,0);for(let i=0;i<7;i++){const d=new Date(t);d.setDate(t.getDate()+i+7*wkOff);out.push(d)}return out}
function timesOn(e,d){if(e.timesByDay&&d){const t=e.timesByDay[DOW[d.getDay()]];if(t&&t.length)return t}if(e.times&&e.times.length)return e.times;return [e.time]}
function tOn(e,d){return timesOn(e,d)[0]}
function endM(e,d){const s=mins(tOn(e,d));if(!e.endTime||s>=2000)return null;let m=mins(e.endTime);if(m>=2000)return null;if(m<=s)m+=1440;return m}
function shortT(t){return String(t).replace(":00 "," ").replace(/ (AM|PM)$/," $1")}
function whenText(e){if(e.kind==="weekly")return `Every ${e.days.join(", ")} · ${e.time}${e.endTime?" – "+e.endTime:""}`;
  let t=`${fmtRange(e)} · `;if(e.timesByDay){t+=Object.entries(e.timesByDay).map(([k,v])=>`${k} ${v.join(" & ")}`).join("; ")}else t+=(e.times&&e.times.length?e.times.join(" & "):e.time)+(e.endTime?" – "+e.endTime:"");return t}
function ageDays(s){if(!s)return null;const t=new Date();t.setHours(12,0,0,0);return Math.round((t-parseYmd(s))/864e5)}
function geoOf(e){const P=DATA&&DATA.places;return P&&P.venues?P.venues[e.venue||e.name]||null:null}
function homePt(){const P=DATA&&DATA.places;return F.home&&P&&P.homes?P.homes[F.home]||null:null}
function kmBetween(a,b){const R=6371,t=Math.PI/180,dLa=(b.lat-a.lat)*t,dLo=(b.lon-a.lon)*t;const h=Math.sin(dLa/2)**2+Math.cos(a.lat*t)*Math.cos(b.lat*t)*Math.sin(dLo/2)**2;return 2*R*Math.asin(Math.sqrt(h))}
function distMi(e){const h=homePt(),g=geoOf(e);if(!h||!g)return null;return kmBetween(h,g)*0.6214}
function fmtMi(m){return m<0.95?m.toFixed(1):m<10?m.toFixed(1):Math.round(m)+""}
function railOk(e){const g=geoOf(e);if(g&&!g.approx)return !!(g.rail&&g.rail.mi<=0.75);return RAIL.has(e.area)}
function byNear(a,b,d){const x=distMi(a),y=distMi(b);if(x==null&&y==null)return mins(tOn(a,d))-mins(tOn(b,d));if(x==null)return 1;if(y==null)return -1;return x-y}
function sorter(d){return (F.near&&homePt())?(a,b)=>byNear(a,b,d):(a,b)=>mins(tOn(a,d))-mins(tOn(b,d))}
function adultOnly(e){return /^(18|21)\+/.test(e.ages||"")}
function toddlerOk(e){return /^(0|1|2|all)/i.test(e.ages||"")}
function onDate(e,d){const dw=DOW[d.getDay()],s=ymd(d);if(e.kind==="weekly")return e.days.includes(dw);if(s<e.start||s>e.end)return false;return !e.onDays||e.onDays.includes(dw)}
function key(e){return [e.kind,e.title,e.venue,e.start||e.days.join("")].join("|")}
function fmtD(s){return parseYmd(s).toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})}
function fmtRange(e){return e.start===e.end?fmtD(e.start):fmtD(e.start)+" – "+fmtD(e.end)}
function wx(d){return ((DATA.meta&&DATA.meta.forecast)||[]).find(f=>f.date===ymd(d))}
function wxText(f){if(!f)return"";return `${f.hi!=null?f.hi+"°":""}${f.lo!=null?" / "+f.lo+"°":""} · ${f.sky}${f.rain!=null?" · "+f.rain+"% rain":""}${f.wind?" · wind "+f.wind+(f.gust?", gusts "+f.gust:""):""}`}
function rainy(f){return !!f&&((f.rain!=null&&f.rain>=50)||/rain|storm|shower/i.test(f.sky||""))}
function slug(v){return "v-"+v.toLowerCase().replace(/&/g,"and").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")}
function dealsFor(venue,d){return (DATA.deals||[]).filter(x=>x.venue===venue&&x.days.includes(DOW[d.getDay()]))}

function passes(e){
  if(!!e.kidsOnly!==KIDS_VIEW)return false;
  if(!zoneOk(e))return false;
  if(F.hood&&e.area!==F.hood)return false;
  if(F.price&&(e.priceTier||(e.free?"free":"varies"))!==F.price)return false;
  if((F.baby||F.kids)&&adultOnly(e))return false;
  if(F.baby&&!((e.kids||e.cat==="family"||e.cat==="market"||toddlerOk(e))&&mins(e.time)<19*60))return false;
  if(F.kids&&!e.kids)return false;
  if(F.dogs&&!e.dogs)return false;
  if(F.late){const m=mins(e.time);if(m<18*60||m>=2000)return false}
  if(F.daytime){const m=mins(e.time);if(m>=17*60)return false}
  if(F.rail&&!railOk(e))return false;
  return true}
function zoneOk(e){const z=e.zone||"charlotte";return F.zone==="region"||(F.zone==="charlotte"?z==="charlotte":z!=="region")}
function anyFilter(){return !!(F.zone!=="nearby"||F.hood||F.price||F.daytime||F.late||F.kids||F.dogs||F.baby||F.rail||F.near)}
function hk(e){const s=key(e);let h=5381;for(let i=0;i<s.length;i++)h=((h<<5)+h+s.charCodeAt(i))>>>0;return "e-"+h.toString(36)}
function nowMin(){const n=new Date();return n.getHours()*60+n.getMinutes()}
function liveLabel(e,d){if(!d||ymd(d)!==ymd(new Date())||e.unconfirmedTime)return"";const n=nowMin();
  for(const t of timesOn(e,d)){const m=mins(t);if(m>=2000||!/\d/.test(t))continue;const end=(timesOn(e,d).length===1&&endM(e,d))||m+120;
    if(m<=n&&n<end)return e.endTime&&timesOn(e,d).length===1?`On now · until ${shortT(e.endTime)}`:"Happening now";
    if(m>n&&m-n<=120){const x=m-n;return x<60?`Starts in ${x} min`:`Starts in ${Math.floor(x/60)} hr${x%60>=30?" 30":""}`}}
  return""}

function gcal(e,d){
  const date=e.kind==="dated"?(d&&onDate(e,d)?d:parseYmd(e.start)):(d||nextOcc(e));
  const st=tOn(e,date);const m=mins(st);const ds=ymd(date).replace(/-/g,"");
  let dates;
  if(m<2000&&/\d/.test(st)){const pad=n=>String(n).padStart(2,"0");const sh=Math.floor(m/60),sm=m%60;let em=endM(e,date)||m+120;if(em>23*60+59)em=23*60+59;dates=`${ds}T${pad(sh)}${pad(sm)}00/${ds}T${pad(Math.floor(em/60))}${pad(em%60)}00`}
  else{const n=new Date(date);n.setDate(n.getDate()+1);dates=`${ds}/${ymd(n).replace(/-/g,"")}`}
  const p=new URLSearchParams({action:"TEMPLATE",text:e.title+" @ "+e.venue,dates,ctz:"America/New_York",location:e.venue+", "+e.area+", Charlotte NC",details:(e.note?e.note+"\n":"")+"Source: "+e.url});
  if(e.kind==="weekly")p.set("recur","RRULE:FREQ=WEEKLY");
  return "https://calendar.google.com/calendar/render?"+p.toString()}
function nextOcc(e){const ds=days();return ds.find(d=>onDate(e,d))||ds[0]}
function maps(e){return "https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(e.venue+" "+e.area+" Charlotte NC")}

function chips(e,d){let h="";const lv=liveLabel(e,d);if(lv)h+=`<span class="chip live">${lv}</span>`;if(NEWK.has(key(e)))h+=`<span class="chip new">New</span>`;
  h+=`<span class="chip">${esc(e.tag)}</span>`;
  if(e.gameKind&&e.gameKind!==e.tag)h+=`<span class="chip kind">${esc(e.gameKind)}</span>`;
  if(e.host)h+=`<span class="chip paid">Host: ${esc(e.host)}</span>`;
  h+=e.free?`<span class="chip free">${esc(e.price||"Free")}</span>`:`<span class="chip paid">${esc(e.price)}</span>`;
  if(e.kind==="weekly")h+=`<span class="chip paid">Every ${e.days.length>3?"week":e.days.join(", ")}</span>`;else if(e.start!==e.end)h+=`<span class="chip paid">${fmtRange(e)}</span>`;
  if(DATA.meta&&DATA.meta.featured&&Object.values(DATA.meta.featured).flat().some(x=>x.id===e.id))h+=`<span class="chip deal">★ Featured</span>`;
  if(e.outdoor)h+=`<span class="chip">Outdoors</span>`;
  if(e.kids)h+=`<span class="chip">Kid-friendly</span>`;if(e.dogs)h+=`<span class="chip">Dog-friendly</span>`;
  if(d)for(const x of dealsFor(e.venue,d))h+=`<span class="chip deal">${esc(x.deal)}</span>`;
  const dm=distMi(e);if(dm!=null)h+=`<span class="chip dist" title="Straight-line distance from ${esc(F.home)}">${geoOf(e).approx?"about ":"≈"}${fmtMi(dm)} mi</span>`;
  const gg=geoOf(e);if(gg&&gg.rail&&!gg.approx&&gg.rail.mi<=0.5)h+=`<span class="chip rail" title="Estimated walk to the station">${gg.rail.mi<0.2?"At":gg.rail.mi+" mi to"} ${esc(gg.rail.st)} station</span>`;
  if(e.ages)h+=`<span class="chip age">Ages ${esc(e.ages)}</span>`;
  if(e.unconfirmedTime)h+=`<span class="chip warn">Time not posted</span>`;
  const a=ageDays(e.checked);if(a!=null&&a>10)h+=`<span class="chip warn">Not rechecked in ${a} days</span>`;
  if(REPORTED.has(key(e)))h+=`<span class="chip rep" title="Someone reported a problem; the next refresh will check it">Reported · check before you go</span>`;
  return h}
function ckText(e){const a=ageDays(e.checked);if(a==null)return"";if(a<=0)return `<span class="ck fresh">✓ Confirmed today</span>`;if(a===1)return `<span class="ck fresh">✓ Confirmed yesterday</span>`;return `<span class="ck">Checked ${fmtD(e.checked)}</span>`}
function timeCell(e,d){const ts=d?timesOn(e,d):(e.timesByDay?[e.time]:(e.times&&e.times.length?e.times:[e.time]));
  let h=esc(ts[0]);if(ts.length>1)h+=`<small>& ${ts.slice(1).map(esc).join(", ")}</small>`;else if(e.endTime)h+=`<small>to ${esc(shortT(e.endTime))}</small>`;
  if(!d&&e.timesByDay)h+=`<small>times vary</small>`;return h}
function row(e,opt={}){const d=opt.date;const k=key(e);const on=saved.has(k);
  const when=opt.showDate&&e.kind==="dated"?`<div class="v">${fmtRange(e)}</div>`:"";
  const stale=(ageDays(e.checked)||0)>10;
  return `<div class="row${stale?" stale":""}"><div class="time${e.unconfirmedTime?" tba":""}">${timeCell(e,d)}</div><div style="min-width:0">
  <div class="head"><p class="t"><button class="tlink" type="button" data-ek="${hk(e)}">${esc(e.title)}</button></p><button class="star" type="button" data-k="${esc(k)}" aria-pressed="${on}" aria-label="${on?"Remove from saved":"Save"} ${esc(e.title)}">${on?"★":"☆"}</button></div>
  <div class="v"><button class="vlink" type="button" data-venue="${esc(e.venue)}">${esc(e.venue)}</button> · ${esc(e.area)}</div>${when}${e.note?`<div class="n">${esc(e.note)}</div>`:""}
  <div class="chips">${chips(e,d)}</div>
  <div class="acts"><a href="${esc(maps(e))}" target="_blank" rel="noopener">Map</a><a href="${esc(gcal(e,d))}" target="_blank" rel="noopener">Add to calendar</a><a href="${esc(e.url)}" target="_blank" rel="noopener">Source</a>${ckText(e)}<button class="linkbtn" type="button" data-rep="${hk(e)}">Report a problem</button></div></div></div>`}
function groupBlock(title,items,opt){if(!items.length)return"";return `<h3 class="group">${esc(title)} <i>${items.length}</i></h3><div class="list">${items.map(e=>row(e,opt)).join("")}</div>`}
function dealZone(x){const e=DATA.events.find(e=>e.venue===x.venue);return e?zoneOk(e):true}
function dealBlock(d){const ds=(DATA.deals||[]).filter(x=>x.days.includes(DOW[d.getDay()])&&(!F.hood||x.area===F.hood)&&dealZone(x));if(!ds.length||F.kids||F.dogs)return"";
  return `<h3 class="group">Deals today <i>${ds.length}</i></h3><div class="list">${ds.map(x=>`<div class="deal-row"><div class="k">Deal</div><div><b>${esc(x.venue)}</b> <span style="color:var(--muted)">· ${esc(x.area)}</span><div>${esc(x.deal)}</div><div class="acts"><a href="${esc(x.url)}" target="_blank" rel="noopener">Source</a></div></div></div>`).join("")}</div>`}
function emptyMsg(){return `<p class="empty">Nothing matches${anyFilter()?" these filters. Try clearing one":" yet"}.</p>`}

/* Day by day */
function renderWkSwitch(){const lbl=o=>{const t=new Date();t.setHours(12,0,0,0);const a=new Date(t);a.setDate(t.getDate()+7*o);const b=new Date(a);b.setDate(a.getDate()+6);const f=x=>x.toLocaleDateString("en-US",{month:"short",day:"numeric"});return `${o?"Next 7 days":"This week"} <span style="opacity:.7">${f(a)}–${f(b)}</span>`};
  $("wkSwitch").innerHTML=[0,1].map(o=>`<button class="tog" type="button" data-wk="${o}" aria-pressed="${o===wkOff}">${lbl(o)}</button>`).join("");
  $("wkSwitch").querySelectorAll("[data-wk]").forEach(b=>b.onclick=()=>{wkOff=+b.dataset.wk;selDay=0;renderWkSwitch();renderDays();renderDay();renderTonight()})}
function renderDays(){const ds=stripDays();
  let h=ds.map((d,i)=>`<button class="day" type="button" aria-pressed="${i===selDay}" data-i="${i}"><b>${i===0&&wkOff===0?"Today":DOW[d.getDay()]}</b><span>${d.getDate()}</span>${wx(d)&&wx(d).hi!=null?`<em class="wx" style="font-style:normal">${wx(d).hi}°${rainy(wx(d))?" ☂":""}</em>`:""}</button>`).join("");
  h+=`<button class="day wk" type="button" aria-pressed="${selDay==="wk"}" data-i="wk"><b>Fri–Sun</b><span>Weekend</span></button>`;
  $("days").innerHTML=h;
  $("days").querySelectorAll(".day").forEach(b=>b.onclick=()=>{selDay=b.dataset.i==="wk"?"wk":+b.dataset.i;renderDays();renderDay();renderTonight()})}
function dayBlock(d,heading){const items=DATA.events.filter(e=>onDate(e,d)&&passes(e)&&!e.ongoing).sort(sorter(d));
  const f=wx(d);
  let h=`<h2 class="dayh">${heading||d.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}</h2><div class="wxline">${f?esc(wxText(f))+" · ":""}Sunset ${sunset(d)}${f&&f.night?" · Tonight: "+esc(f.night):""}</div>${f&&f.detail?`<div class="wxdetail">NWS: ${esc(f.detail)}</div>`:(!f&&wkOff?`<div class="wxdetail">Forecast covers the next 7 days only.</div>`:"")}`;
  h+=dealBlock(d);h+=timeline(items,d);
  if(!items.length)h+=emptyMsg();return h}
function partOfDay(e,d){const m=mins(tOn(e,d));if(m>=2000||!/\d/.test(tOn(e,d)))return 3;return m<12*60?0:m<17*60?1:2}
function timeline(items,d){const parts=["Morning","Afternoon","Evening","Any time"];
  return parts.map((p,i)=>groupBlock(p,items.filter(e=>partOfDay(e,d)===i),{date:d})).join("")}
function renderDay(){const ds=stripDays();
  if(selDay==="wk"){const w=ds.filter(d=>[5,6,0].includes(d.getDay()));
    $("dayList").innerHTML=w.map(d=>dayBlock(d)).join("")}
  else $("dayList").innerHTML=dayBlock(ds[selDay]);
  renderPicks()}
function renderPicks(){if(wkOff){$("picksWrap").innerHTML="";return}const ids=(DATA.meta&&DATA.meta.picks)||[];const ds=days();
  const ps=ids.map(id=>DATA.events.find(e=>e.id===id)).filter(e=>e&&ds.some(d=>onDate(e,d)));
  $("picksWrap").innerHTML=ps.length?`<h3 class="group">This week's picks</h3><div class="picks" style="margin-top:8px">${ps.map(e=>{const d=ds.find(x=>onDate(e,x));return `<button class="pick" type="button" data-ek="${hk(e)}"><span class="k">${d.toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})} · ${esc(e.time)}</span><span class="t">${esc(e.title)}</span><span class="v">${esc(e.venue)} · ${esc(e.area)}</span></button>`}).join("")}</div>`:""}

/* Kids */
function renderKids(){KIDS_VIEW=true;try{const ds=[];const t=new Date();t.setHours(12,0,0,0);for(let i=0;i<14;i++){const x=new Date(t);x.setDate(t.getDate()+i);ds.push(x)}
  let h="";for(const d of ds){const it=DATA.events.filter(e=>onDate(e,d)&&passes(e)&&!e.ongoing).sort(sorter(d));if(!it.length)continue;
    h+=`<h2 class="dayh">${d.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}</h2>`+timeline(it,d)}
  const ong=DATA.events.filter(e=>e.ongoing&&passes(e));if(ong.length)h+=groupBlock("Running now",ong,{});
  $("kidsList").innerHTML=h||`<p class="empty">Nothing for kids matches${anyFilter()?" these filters. Try clearing one":" in the next two weeks yet"}.</p>`}finally{KIDS_VIEW=false}}

/* Food trucks */
function renderFood(){const g=DATA.events.filter(e=>e.cat==="food"&&passes(e));const ds=days();let h="";
  for(const dw of ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]){const d=ds.find(x=>DOW[x.getDay()]===dw);h+=groupBlock(DAYNAMES[dw],g.filter(e=>e.kind==="weekly"&&e.days.includes(dw)).sort(sorter(d)),{date:d})}
  h+=groupBlock("Coming up",g.filter(e=>e.kind==="dated").sort((a,b)=>a.start.localeCompare(b.start)||mins(a.time)-mins(b.time)),{showDate:true});
  $("foodList").innerHTML=h||emptyMsg()}

/* Bar games */
function renderGames(){const tags=["All","Trivia","Survey Says","Music Bingo","Game Night","Other"];
  $("gameFilters").innerHTML=tags.map(t=>`<button class="tog" type="button" aria-pressed="${t===gameF}" data-t="${t}">${t==="Survey Says"?"Survey Says / Family Feud":t}</button>`).join("");
  $("gameFilters").querySelectorAll("[data-t]").forEach(b=>b.onclick=()=>{gameF=b.dataset.t;if(gameF!=="All"&&gameF!=="Trivia")kindF="All";renderGames()});
  const KINDS=[["All","Any kind of trivia"],["General knowledge","General knowledge"],["Themed","Themed"],["Music","Music trivia"]];
  if(gameF==="All"||gameF==="Trivia"){$("gameFilters").insertAdjacentHTML("beforeend",`<span style="flex-basis:100%;height:0"></span>`+KINDS.map(([k,l])=>`<button class="tog" type="button" data-kind="${k}" aria-pressed="${k===kindF}">${l}</button>`).join(""));
    $("gameFilters").querySelectorAll("[data-kind]").forEach(b=>b.onclick=()=>{kindF=b.dataset.kind;if(kindF!=="All")gameF="Trivia";renderGames()})}
  const kindOk=e=>kindF==="All"||(kindF==="Music"?/music trivia|mixtape/i.test(e.gameKind||""):e.gameKind===kindF);
  const main=["Trivia","Survey Says","Music Bingo","Game Night"];
  const g=DATA.events.filter(e=>e.cat==="games"&&passes(e)&&(gameF==="All"||(gameF==="Other"?!main.includes(e.tag):e.tag===gameF))&&(kindF==="All"||(e.tag==="Trivia"&&kindOk(e))));
  const ds=days();let h="";
  for(const dw of ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]){const d=ds.find(x=>DOW[x.getDay()]===dw);const it=g.filter(e=>e.kind==="weekly"&&e.days.includes(dw)).sort(sorter(d));h+=groupBlock(DAYNAMES[dw],it,{date:d})}
  h+=groupBlock("Special one-night games",g.filter(e=>e.kind==="dated").sort((a,b)=>a.start.localeCompare(b.start)),{showDate:true});
  $("gameList").innerHTML=h||emptyMsg()}

/* All */
function renderAll(){const cats=["All",...CAT_ORDER];
  $("catFilters").innerHTML=cats.map(c=>`<button class="tog" type="button" aria-pressed="${c===catF}" data-c="${c}">${c==="All"?"All":CATS[c]}</button>`).join("");
  $("catFilters").querySelectorAll(".tog").forEach(b=>b.onclick=()=>{catF=b.dataset.c;renderAll()});
  const q=$("q").value.trim().toLowerCase();
  const f=DATA.events.filter(e=>(catF==="All"||CATS[e.cat]===CATS[catF])&&passes(e)&&(!newOnly||NEWK.has(key(e)))&&(!q||[e.title,e.venue,e.area,e.tag,e.note].join(" ").toLowerCase().includes(q)));
  if(NEWK.size){$("catFilters").insertAdjacentHTML("beforeend",`<button class="tog" type="button" id="newOnly" aria-pressed="${newOnly}">New since last visit (${NEWK.size})</button>`);$("newOnly").onclick=()=>{newOnly=!newOnly;renderAll()}}
  const dated=f.filter(e=>e.kind==="dated").sort((a,b)=>a.start.localeCompare(b.start)||mins(a.time)-mins(b.time));
  $("allList").innerHTML=(groupBlock("Dated events",dated,{showDate:true})+groupBlock("Every week",f.filter(e=>e.kind==="weekly"),{}))||emptyMsg()}

/* Trivia week helper */
const TEAM=["Quiz Khalifa","Les Quizerables","The Blue Line Brainiacs","NoDa Clue","Queen City Know-It-Alls","Rail Trail Mix","Cheerwine & Dine","Sweet Tea Party","Uptown Funk & Wagnalls","Plaza Midwood Wonders","The Crown Jewels","Light Rail Lightweights","Buzz City Brains","Optimist Prime","Smarty Pints","Let's Get Quizzical","Trivia Newton-John","Ctrl Alt Defeat","Agatha Quiztie","The South End Sages","Quizteama Aguilera","Tequila Mockingbird","Hops & Answers","The Wesley Heights Wits","Camp North Endgame","Pint of No Return","Beerly Getting By","The Usual Suspects of Dilworth","Hornet's Nest of Knowledge","Two Pints Short of a Point"];
function newTeam(){const t=$("teamName");let n;do{n=pick(TEAM)}while(n===t.textContent&&TEAM.length>1);t.textContent=n}
function renderNights(){const ds=days();
  $("nights").innerHTML=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(dw=>`<button class="tog" type="button" data-n="${dw}" aria-pressed="${freeNights.has(dw)}">${DAYNAMES[dw].replace(/s$/,"")}</button>`).join("");
  $("nights").querySelectorAll(".tog").forEach(b=>b.onclick=()=>{const n=b.dataset.n;freeNights.has(n)?freeNights.delete(n):freeNights.add(n);store.set("cltNights",[...freeNights]);renderNights()});
  if(!freeNights.size){$("nightPlan").innerHTML=`<p class="empty" style="padding:4px 0">Pick at least one night.</p>`;return}
  let h="";for(const dw of ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]){if(!freeNights.has(dw))continue;const d=ds.find(x=>DOW[x.getDay()]===dw);
    const it=DATA.events.filter(e=>e.cat==="games"&&passes(e)&&onDate(e,d)).sort((a,b)=>mins(a.time)-mins(b.time));
    h+=`<div style="display:grid;gap:4px"><b style="font:800 14px var(--display);font-stretch:110%">${d.toLocaleDateString("en-US",{weekday:"long",month:"short",day:"numeric"})} <span class="wx">${it.length} games${wx(d)&&wx(d).hi!=null?" · "+wx(d).hi+"°":""}</span></b>${it.length?`<div style="font-size:14px;color:var(--muted)">${it.slice(0,8).map(e=>`${esc(e.time)} ${esc(e.tag)} at <button class="vlink" type="button" data-venue="${esc(e.venue)}">${esc(e.venue)}</button>`).join(" · ")}${it.length>8?` · +${it.length-8} more`:""}</div>`:`<div style="font-size:14px;color:var(--muted)">No games match your filters that night.</div>`}</div>`}
  $("nightPlan").innerHTML=`<div style="display:grid;gap:10px">${h}</div>`}

/* Season guide */
function renderSeason(){const se=DATA.meta&&DATA.meta.season;const tab=$("seasonTab");
  if(!se||(se.until&&ymd(new Date())>se.until)){tab.hidden=true;return}
  tab.hidden=false;tab.textContent=se.title.replace(/ in CLT$/,"");
  $("seasonHero").innerHTML=`<h2>${esc(se.title)}</h2><p class="lede" style="color:var(--ink)">${esc(se.intro||"")}</p>`;
  const it=DATA.events.filter(e=>e.season===se.id&&passes(e));
  const dated=it.filter(e=>e.kind==="dated").sort((a,b)=>a.start.localeCompare(b.start)||mins(a.time)-mins(b.time));
  const fam=dated.filter(e=>e.kids||e.cat==="family"),grown=dated.filter(e=>!(e.kids||e.cat==="family"));
  $("seasonList").innerHTML=(groupBlock("For the family",fam,{showDate:true})+groupBlock("Grown-up plans",grown,{showDate:true})+groupBlock("Every week",it.filter(e=>e.kind==="weekly"),{}))||emptyMsg()}

/* Venues */
function venues(){const m=new Map();for(const e of DATA.events){if(!m.has(e.venue))m.set(e.venue,{name:e.venue,area:e.area,events:[],deals:[]});m.get(e.venue).events.push(e)}
  for(const x of (DATA.deals||[])){if(!m.has(x.venue))m.set(x.venue,{name:x.venue,area:x.area,events:[],deals:[]});m.get(x.venue).deals.push(x)}
  return [...m.values()]}
function renderVenues(){const all=venues();
  if(venueSel){const v=all.find(x=>x.name===venueSel);if(v){
    const weekly=v.events.filter(e=>e.kind==="weekly").sort((a,b)=>"MonTueWedThuFriSatSun".indexOf(a.days[0])-"MonTueWedThuFriSatSun".indexOf(b.days[0])||mins(a.time)-mins(b.time));
    const dated=v.events.filter(e=>e.kind==="dated").sort((a,b)=>a.start.localeCompare(b.start));
    const kids=v.events.some(e=>e.kids),dogs=v.events.some(e=>e.dogs),games=v.events.filter(e=>e.cat==="games").length;
    const mp=maps(v.events[0]||{venue:v.name,area:v.area});
    $("venueView").innerHTML=`<button class="clear" type="button" id="vBack">← All venues</button><div class="vhead"><h2>${esc(v.name)}</h2><div class="v" style="color:var(--muted)">${esc(v.area)}</div><div class="chips">${games?`<span class="chip">${games} game night${games>1?"s":""}</span>`:""}${v.deals.length?`<span class="chip deal">${v.deals.length} weekly deal${v.deals.length>1?"s":""}</span>`:""}${kids?`<span class="chip">Kid-friendly</span>`:""}${dogs?`<span class="chip">Dog-friendly</span>`:""}</div><div class="acts"><a href="${esc(mp)}" target="_blank" rel="noopener">Map</a></div></div>
    ${v.deals.length?`<h3 class="group">Weekly deals <i>${v.deals.length}</i></h3><div class="list">${v.deals.map(x=>`<div class="deal-row"><div class="k">${esc(x.days.join(", "))}</div><div>${esc(x.deal)}<div class="acts"><a href="${esc(x.url)}" target="_blank" rel="noopener">Source</a></div></div></div>`).join("")}</div>`:""}
    ${groupBlock("Every week",weekly,{})}${groupBlock("Coming up",dated,{showDate:true})}`;
    $("vBack").onclick=()=>{venueSel=null;renderVenues();try{history.replaceState(null,"","#venues")}catch(e){}};return}}
  const games=all.filter(v=>v.events.some(e=>e.cat==="games")||v.deals.length).sort((a,b)=>b.events.length-a.events.length||a.name.localeCompare(b.name));
  const other=all.filter(v=>!games.includes(v)).sort((a,b)=>a.name.localeCompare(b.name));
  const card=v=>`<button class="vcard" type="button" data-venue="${esc(v.name)}"><b>${esc(v.name)}</b><span>${esc(v.area)} · ${v.events.length} listing${v.events.length===1?"":"s"}${v.deals.length?` · ${v.deals.length} deal${v.deals.length>1?"s":""}`:""}</span></button>`;
  $("venueView").innerHTML=`<p class="lede">Every venue on the board. Tap one to see all its nights, deals and upcoming events.</p><h3 class="group">Breweries & bars <i>${games.length}</i></h3><div class="vgrid" style="margin-top:8px">${games.map(card).join("")}</div><h3 class="group">Other venues <i>${other.length}</i></h3><div class="vgrid" style="margin-top:8px">${other.map(card).join("")}</div>`}
function openVenue(name){venueSel=name;setTab("venues");renderVenues();try{history.replaceState(null,"","#"+slug(name))}catch(e){}window.scrollTo(0,0)}

/* Sunset (NOAA approximation) for Charlotte */
function sunset(d){const lat=35.2271,lng=-80.8431,rad=Math.PI/180;
  const start=new Date(d.getFullYear(),0,0);const N=Math.round((new Date(d.getFullYear(),d.getMonth(),d.getDate())-start)/864e5);
  const g=2*Math.PI/365*(N-1+(18-12)/24);
  const eq=229.18*(0.000075+0.001868*Math.cos(g)-0.032077*Math.sin(g)-0.014615*Math.cos(2*g)-0.040849*Math.sin(2*g));
  const decl=0.006918-0.399912*Math.cos(g)+0.070257*Math.sin(g)-0.006758*Math.cos(2*g)+0.000907*Math.sin(2*g)-0.002697*Math.cos(3*g)+0.00148*Math.sin(3*g);
  const ha=Math.acos(Math.cos(90.833*rad)/(Math.cos(lat*rad)*Math.cos(decl))-Math.tan(lat*rad)*Math.tan(decl))/rad;
  const utcMin=720-4*(lng-ha)-eq; // sunset is +ha
  const set=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate(),0,0,0)+utcMin*60000);
  return set.toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit",timeZone:"America/New_York"})}
function outdoorScore(f){if(!f)return -99;let s=0;const hi=f.hi;if(hi!=null)s-=Math.abs(hi-70)/2;if(f.rain!=null)s-=f.rain/8;if(/sunny|clear/i.test(f.sky))s+=4;else if(/partly/i.test(f.sky))s+=2;if(/rain|storm|shower/i.test(f.sky))s-=8;if(/breezy|wind/i.test(f.sky))s-=1;if(f.gust)s-=Math.max(0,f.gust-15)/3;return s}
let trailF={stroller:false,dogs:false,paved:false,free:false};
function renderOutdoors(){const ds=days();
  const scored=ds.map(d=>({d,f:wx(d),s:outdoorScore(wx(d))})).filter(x=>x.f);
  const best=scored.length?scored.reduce((a,b)=>b.s>a.s?b:a):null;
  if(best){const evs=DATA.events.filter(e=>e.outdoor&&onDate(e,best.d)&&passes(e)&&e.kind==="dated");
    $("bestDay").innerHTML=`<span class="k">Best outdoor day this week</span><h2>${best.d.toLocaleDateString("en-US",{weekday:"long",month:"short",day:"numeric"})}</h2><div>${esc(wxText(best.f))} · sunset ${sunset(best.d)}</div>${evs.length?`<div style="font-size:14px;color:var(--muted)">Happening outside that day: ${evs.slice(0,4).map(e=>esc(e.title)).join(" · ")}</div>`:""}`}
  else $("bestDay").innerHTML=`<span class="k">Outdoors</span><h2>Forecast not posted yet</h2><div>Sunset today: ${sunset(ds[0])}</div>`;
  $("wxStrip").innerHTML=ds.map(d=>{const f=wx(d);return `<div class="wxday${best&&d===best.d?" top":""}"><b>${d===ds[0]?"Today":DOW[d.getDay()]}</b><span>${f&&f.hi!=null?f.hi+"°":"–"}</span><em>${f?esc(f.sky.split(",")[0]):""}</em><em>Sunset ${sunset(d).replace(" PM","")}</em></div>`}).join("");
  // groups this week
  const groups=DATA.events.filter(e=>e.cat==="outdoors"&&e.kind==="weekly"&&passes(e));
  let gh="";for(const dw of ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]){const it=groups.filter(e=>e.days.includes(dw)).sort((a,b)=>mins(a.time)-mins(b.time));const d=ds.find(x=>DOW[x.getDay()]===dw);gh+=groupBlock(`${DAYNAMES[dw]}: run clubs & groups`,it,{date:d})}
  $("outGroups").innerHTML=gh;
  // trails
  const tf=[["stroller","Stroller-friendly"],["paved","Paved"],["dogs","Dogs OK"],["free","Free parking"]];
  $("trailFilters").innerHTML=tf.map(([k,l])=>`<button class="tog" type="button" data-tf="${k}" aria-pressed="${trailF[k]}">${l}</button>`).join("");
  $("trailFilters").querySelectorAll(".tog").forEach(b=>b.onclick=()=>{trailF[b.dataset.tf]=!trailF[b.dataset.tf];renderOutdoors()});
  const tr=(DATA.trails||[]).filter(t=>zoneOk(t)&&(!F.hood||t.area===F.hood)&&(!trailF.stroller&&!F.baby||t.stroller===true)&&(!trailF.paved||/paved/i.test(t.surface))&&(!trailF.dogs&&!F.dogs||/leashed dogs ok/i.test(t.dogs))&&(!trailF.free||!/fee/i.test(t.parking)));
  $("trailList").innerHTML=tr.length?tr.map(t=>`<div class="trail"><b>${esc(t.name)}</b><span class="meta">${esc(t.type)} · ${esc(t.area)} · ${esc(t.miles)}${/^[\d.]+$/.test(t.miles)?" mi":""}</span>
    <dl><dt>Surface</dt><dd>${esc(t.surface)}</dd><dt>Stroller</dt><dd>${t.stroller===true?"Yes":t.stroller===false?"No":"Not posted"}</dd><dt>Dogs</dt><dd>${esc(t.dogs)}</dd><dt>Parking</dt><dd>${esc(t.parking)}</dd><dt>Cost</dt><dd>${esc(t.cost)}</dd></dl>
    ${t.note?`<div style="font-size:13.5px;color:var(--muted)">${esc(t.note)}</div>`:""}<div class="acts"><a href="${esc(maps({venue:t.name,area:t.area}))}" target="_blank" rel="noopener">Map</a><a href="${esc(t.url)}" target="_blank" rel="noopener">Source</a></div></div>`).join(""):`<p class="empty">No trails match. Try clearing a filter.</p>`;
  // outdoor dated events
  const od=DATA.events.filter(e=>e.outdoor&&e.kind==="dated"&&passes(e)&&ds.some(d=>onDate(e,d))).sort((a,b)=>a.start.localeCompare(b.start)||mins(a.time)-mins(b.time));
  $("outEvents").innerHTML=groupBlock("Outdoor events this week",od,{showDate:true})}

/* Calendar */
let calMonth=0, calSel=null, calWeekly=false;
function monthStart(off){const t=new Date();return new Date(t.getFullYear(),t.getMonth()+off,1,12)}
function mkey(d){return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")}
function renderFeatured(){const f=(DATA.meta&&DATA.meta.featured)||{};
  const blocks=[0,1].map(off=>{const m=monthStart(off);const list=(f[mkey(m)]||[]).map(x=>({...x,e:DATA.events.find(e=>e.id===x.id)})).filter(x=>x.e&&(x.e.end>=ymd(new Date())));
    if(!list.length)return"";const label=(off===0?"This month":"Next month")+" · "+m.toLocaleDateString("en-US",{month:"long"});
    return `<h3 class="group">Featured ${esc(label)}</h3><div class="feat" style="margin-top:8px">${list.map(x=>`<button class="fcard" type="button" data-feat="${esc(x.e.id)}"><span class="k">★ ${esc(fmtRange(x.e))}${x.e.free?" · Free":""}</span><b>${esc(x.e.title)}</b><span>${esc(x.why)}</span></button>`).join("")}</div>`}).join("");
  $("featWrap").innerHTML=blocks;
  $("featWrap").querySelectorAll("[data-feat]").forEach(b=>b.onclick=()=>{const e=DATA.events.find(x=>x.id===b.dataset.feat);const t=new Date();t.setHours(12,0,0,0);let d=parseYmd(e.start);if(d<t)d=t;
    calMonth=(d.getFullYear()-t.getFullYear())*12+d.getMonth()-t.getMonth();if(calMonth>1)calMonth=1;calSel=ymd(d);renderCalendar();$("calDay").scrollIntoView({behavior:"smooth",block:"start"})})}
function featuredIds(){const f=(DATA.meta&&DATA.meta.featured)||{};return new Set(Object.values(f).flat().map(x=>x.id))}
function renderCalendar(){renderFeatured();
  const m=monthStart(calMonth);const first=new Date(m);const today=ymd(new Date());const fids=featuredIds();
  $("calTitle").textContent=m.toLocaleDateString("en-US",{month:"long",year:"numeric"});
  $("calMonths").innerHTML=[0,1].map(o=>`<button class="tog" type="button" data-m="${o}" aria-pressed="${o===calMonth}">${monthStart(o).toLocaleDateString("en-US",{month:"short"})}</button>`).join("");
  $("calMonths").querySelectorAll(".tog").forEach(b=>b.onclick=()=>{calMonth=+b.dataset.m;calSel=null;renderCalendar()});
  $("calOpts").innerHTML=`<button class="tog" type="button" id="calWk" aria-pressed="${calWeekly}">Include weekly nights</button><span style="font-size:13px;color:var(--muted)">Filters above apply here too.</span>`;
  $("calWk").onclick=()=>{calWeekly=!calWeekly;renderCalendar()};
  const used=new Set();
  const dim=new Date(m.getFullYear(),m.getMonth()+1,0).getDate();let h=DOW.map(d=>`<div class="dow">${d.slice(0,2)}</div>`).join("");
  for(let i=0;i<first.getDay();i++)h+=`<div class="cell blank" aria-hidden="true"></div>`;
  for(let day=1;day<=dim;day++){const d=new Date(m.getFullYear(),m.getMonth(),day,12);const k=ymd(d);
    const ev=DATA.events.filter(e=>onDate(e,d)&&passes(e)&&!e.ongoing&&(calWeekly||e.kind==="dated"));
    const cats=[...new Set(ev.map(e=>e.cat))].sort((a,b)=>CAT_ORDER.indexOf(a)-CAT_ORDER.indexOf(b));cats.forEach(c=>used.add(c));
    const star=ev.some(e=>fids.has(e.id)&&(e.start===k||(day===1&&e.start<k)));
    h+=`<button class="cell${k<today?" past":""}${k===today?" today":""}" type="button" data-d="${k}" aria-pressed="${calSel===k}" aria-label="${d.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}, ${ev.length} events"><span class="n">${day}</span>${star?`<span class="st">★</span>`:""}<span class="dots">${cats.slice(0,6).map(c=>`<span class="dot" style="background:${CAT_COLOR[c]||"var(--muted)"}"></span>`).join("")}${ev.length?`<span class="ct">${ev.length}</span>`:""}</span></button>`}
  $("calGrid").innerHTML=h;
  $("calLegend").innerHTML=CAT_ORDER.filter(c=>used.has(c)).map(c=>`<span><i style="background:${CAT_COLOR[c]}"></i>${CATS[c]}</span>`).join("")+(fids.size?`<span><span style="color:var(--gold)">★</span> Featured</span>`:"");
  $("calGrid").querySelectorAll(".cell[data-d]").forEach(b=>b.onclick=()=>{calSel=b.dataset.d;renderCalendar()});
  if(!calSel){const sameMonth=today.slice(0,7)===mkey(m);calSel=sameMonth?today:ymd(first);
    $("calGrid").querySelector(`[data-d="${calSel}"]`)?.setAttribute("aria-pressed","true")}
  const d=parseYmd(calSel);
  const items=DATA.events.filter(e=>onDate(e,d)&&passes(e)&&!e.ongoing&&(calWeekly||e.kind==="dated")).sort((a,b)=>mins(a.time)-mins(b.time));
  const wk=calWeekly?0:DATA.events.filter(e=>e.kind==="weekly"&&onDate(e,d)&&passes(e)).length;
  let out=`<h2 class="dayh">${d.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}</h2>`;const seen=new Set();
  for(const c of CAT_ORDER){const label=CATS[c];if(seen.has(label))continue;seen.add(label);out+=groupBlock(label,items.filter(e=>CATS[e.cat]===label),{date:d,showDate:true})}
  if(!items.length)out+=`<p class="empty">No dated events${anyFilter()?" match your filters":""} on this day yet.</p>`;
  if(wk)out+=`<p class="lede" style="margin-top:10px">Plus ${wk} weekly nights (trivia, run clubs, markets). <button class="clear" type="button" id="calShowWk">Show them</button></p>`;
  $("calDay").innerHTML=out;const sw=$("calShowWk");if(sw)sw.onclick=()=>{calWeekly=true;renderCalendar()}}

/* Museums & Arts */
function renderArts(){const ds=days();
  const freeNights=DATA.events.filter(e=>e.cat==="arts"&&e.kind==="weekly"&&passes(e));
  $("artsFree").innerHTML=groupBlock("Free museum nights",freeNights,{date:ds.find(d=>d.getDay()===3)});
  const ms=(DATA.museums||[]).filter(m=>zoneOk(m)&&(!F.hood||m.area===F.hood)&&(!F.kids&&!F.baby||m.kids===true)&&(F.price!=="free"||/free/i.test(m.freeTimes+m.cost)));
  $("museumList").innerHTML=ms.length?ms.map(m=>`<div class="mus"><b><button class="vlink" type="button" data-venue="${esc(m.name)}">${esc(m.name)}</button></b><span class="meta">${esc(m.type)} · ${esc(m.area)} · ${esc(m.address)}</span>${m.freeTimes?`<div class="free">${esc(m.freeTimes)}</div>`:""}${m.highlight?`<div style="font-size:14px">${esc(m.highlight)}</div>`:""}<div class="acts"><a href="${esc(maps({venue:m.name,area:m.area}))}" target="_blank" rel="noopener">Map</a><a href="${esc(m.url)}" target="_blank" rel="noopener">Source</a>${m.kids?`<span class="ck">Good for kids</span>`:""}</div></div>`).join(""):`<p class="empty">No museums match your filters.</p>`;
  const today=ymd(new Date());
  const ex=DATA.events.filter(e=>e.ongoing&&e.end>=today&&passes(e)).sort((a,b)=>a.end.localeCompare(b.end));
  const up=DATA.events.filter(e=>e.cat==="arts"&&e.kind==="dated"&&!e.ongoing&&e.end>=today&&passes(e)).sort((a,b)=>a.start.localeCompare(b.start)||mins(a.time)-mins(b.time));
  $("artsEvents").innerHTML=groupBlock("Exhibits on now (soonest closing first)",ex,{showDate:true})+groupBlock("Upcoming museum & arts events",up,{showDate:true})}

/* Saved */
function renderSaved(){const ev=DATA.events.filter(e=>saved.has(key(e)));
  const ct=$("savedCt");ct.textContent=saved.size+savedDates.length;ct.hidden=!(saved.size+savedDates.length);
  let h=groupBlock("Saved events",ev,{showDate:true});
  if(savedDates.length)h+=`<h3 class="group">Saved date plans <i>${savedDates.length}</i></h3><div class="stack" style="margin-top:8px">${savedDates.map((p,i)=>`<div class="saved-date"><span class="t">${esc(p.day)}</span><ol>${p.steps.map(s=>`<li><b>${esc(s.t)}</b> · ${esc(s.p)}</li>`).join("")}</ol><div class="btns" style="margin-top:6px"><button class="ghost" type="button" data-copy="${i}">Copy plan</button><button class="ghost" type="button" data-del="${i}">Remove</button></div></div>`).join("")}</div>`;
  $("savedList").innerHTML=h||`<p class="empty">Nothing saved yet. Tap ☆ on any event, or save a plan from Free Date Night.</p>`;
  $("savedList").querySelectorAll("[data-del]").forEach(b=>b.onclick=()=>{savedDates.splice(+b.dataset.del,1);store.set("cltDates",savedDates);renderSaved()});
  $("savedList").querySelectorAll("[data-copy]").forEach(b=>b.onclick=()=>copyText(planText(savedDates[+b.dataset.copy])))}

/* Date night */
let plan=null;const locks={spot:false,event:false};
function pick(a){return a[Math.floor(Math.random()*a.length)]}
let rainTouched=false, dbl=false;
function genPlan(){const ds=days();const vibe=$("dnVibe").value;const d=ds[+$("dnDay").value||0];
  const f=wx(d);if(!rainTouched)$("dnRain").setAttribute("aria-pressed",rainy(f));
  const rain=$("dnRain").getAttribute("aria-pressed")==="true";
  const ok=s=>(!rain||s.indoor)&&(!F.baby||s.stroller);
  let spots=DATA.freeSpots.filter(s=>(vibe==="any"||s.vibes.includes(vibe))&&ok(s));
  if(!spots.length)spots=DATA.freeSpots.filter(ok);if(!spots.length)spots=DATA.freeSpots;
  const spot=locks.spot&&plan?plan.spot:pick(spots);
  const free=DATA.events.filter(e=>e.free&&onDate(e,d)&&["games","music","festival","community","market"].includes(e.cat)&&(!rain||!["Run","Outdoor Movie","Parade","Fall Festival"].includes(e.tag)));
  let pool=free.filter(e=>!(spot.area==="Home"&&e.cat==="market")&&(!F.baby||mins(e.time)<19*60));
  if(dbl){const gp=pool.filter(e=>e.cat==="games");if(gp.length)pool=gp}
  const ev=locks.event&&plan?plan.ev:(pool.length?pick(pool):(free.length?pick(free):null));
  plan={d,spot,ev};renderPlan()}
function planSteps(){const {spot,ev}=plan;const out=[];const evM=ev?mins(ev.time):0;
  const sStep={k:spot.when==="evening"?"Before":"Afternoon",t:spot.name,p:spot.idea,lock:"spot"};
  const eStep=ev?{k:ev.time,t:ev.title,p:`${ev.venue} · ${ev.area}${ev.note?" · "+ev.note:""}`,lock:"event"}:null;
  if(eStep&&evM<15*60){eStep.k="Morning";sStep.k="Then";out.push(eStep,sStep)}else{out.push(sStep);if(eStep)out.push(eStep)}
  if(dbl&&ev&&ev.cat==="games")out.splice(out.length,0,{k:"Tip",t:"Play as one team of four",p:"Most trivia nights cap teams around 6, so four is a sweet spot. Grab a table early."});
  out.push({k:"Wrap up",t:"Rate the night",p:dbl?"Each couple names a favorite moment. The losing couple plans the next free double date.":"Each of you names your favorite moment. Loser plans the next free date."});return out}
function planText(p){return `CLT date night · ${p.day}\n`+p.steps.map(s=>`• ${s.k}: ${s.t} (${s.p})`).join("\n")}
function renderPlan(){const steps=planSteps();const dayLbl=plan.d.toLocaleDateString("en-US",{weekday:"long",month:"short",day:"numeric"});
  const f=wx(plan.d);
  $("dnOut").innerHTML=`<article class="ticket"><div class="top"><h2>${dayLbl}${dbl?" · Double date":""}</h2><span class="cost">$0 admission</span>${f?`<span class="wxline" style="width:100%;margin:0">${esc(wxText(f))}${rainy(f)&&!rainTouched?" · rain plan on":""}</span>`:""}</div><div class="steps">${steps.map(s=>`<div class="step"><div class="k">${esc(s.k)}</div><div><div class="t">${esc(s.t)}</div><p>${esc(s.p)}</p></div>${s.lock?`<button class="lock" type="button" data-lock="${s.lock}" aria-pressed="${locks[s.lock]}">${locks[s.lock]?"Locked":"Lock"}</button>`:""}</div>`).join("")}</div>
  <div class="foot"><small>${plan.ev?`<a href="${esc(plan.ev.url)}" target="_blank" rel="noopener" style="color:var(--teal)">Event details</a>. Check times before you go.`:"No free events listed that day, so this one keeps it simple."}</small>
  <div class="btns"><button class="ghost" type="button" id="dnReroll">Re-roll unlocked</button><button class="ghost" type="button" id="dnSave">Save this date</button><button class="ghost" type="button" id="dnCopy">Copy plan</button></div></div></article>`;
  $("dnOut").querySelectorAll("[data-lock]").forEach(b=>b.onclick=()=>{locks[b.dataset.lock]=!locks[b.dataset.lock];renderPlan()});
  $("dnReroll").onclick=genPlan;
  const obj={day:dayLbl,steps:steps.map(s=>({k:s.k,t:s.t,p:s.p}))};
  $("dnSave").onclick=()=>{savedDates.unshift(obj);savedDates=savedDates.slice(0,20);store.set("cltDates",savedDates);renderSaved();toast("Saved to your Saved tab")};
  $("dnCopy").onclick=()=>copyText(planText(obj))}

function copyText(t){const done=()=>toast("Plan copied");
  try{navigator.clipboard.writeText(t).then(done).catch(()=>fallbackCopy(t))}catch(e){fallbackCopy(t)}}
function fallbackCopy(t){const ta=document.createElement("textarea");ta.value=t;ta.style.position="fixed";ta.style.opacity="0";document.body.appendChild(ta);ta.select();let ok=false;try{ok=document.execCommand("copy")}catch(e){}ta.remove();toast(ok?"Copied":"Copy didn't work here. Long-press the text to copy it.")}
let tt;function toast(m){const el=$("toast");el.textContent=m;el.hidden=false;clearTimeout(tt);tt=setTimeout(()=>el.hidden=true,2200)}

/* Tonight dashboard */
function renderTonight(){const el=$("tonight");if(selDay!==0||wkOff!==0){el.innerHTML="";return}
  const d=days()[0];const n=nowMin();const f=wx(d);
  const todays=DATA.events.filter(e=>onDate(e,d)&&passes(e)&&!e.ongoing);
  const ahead=todays.filter(e=>{const t=tOn(e,d);const m=mins(t);if(m>=2000||!/\d/.test(t))return false;const last=mins(timesOn(e,d).slice(-1)[0]);return (endM(e,d)||Math.max(m,last)+60)>n}).sort((a,b)=>mins(tOn(a,d))-mins(tOn(b,d)));
  const games=todays.filter(e=>e.cat==="games"&&mins(e.time)>=n-60).length;
  const free=todays.filter(e=>e.free).length;
  const deals=(DATA.deals||[]).filter(x=>x.days.includes(DOW[d.getDay()])&&dealZone(x)).length;
  const late=n>=21*60+30;
  el.innerHTML=`<div class="tonight"><div class="hd"><h2>${late?"Late night in CLT":n<12*60?"Today in CLT":"Tonight in CLT"}</h2><span class="wxline" style="margin:0">${f?esc(wxText(f))+" · ":""}Sunset ${sunset(d)}</span></div>
  <div class="tiles"><button class="tile g" type="button" data-go="games"><b>${games}</b><span>game nights left today</span></button><button class="tile f" type="button" data-go="free"><b>${free}</b><span>free things today</span></button><button class="tile d" type="button" data-go="deals"><b>${deals}</b><span>deals today</span></button>${NEWK.size?`<button class="tile n" type="button" data-go="new"><b>${NEWK.size}</b><span>new since last visit</span></button>`:""}</div>
  ${ahead.length?`<div class="upnext"><h3 class="group" style="margin:0">Up next</h3>${ahead.slice(0,5).map(e=>`<div class="u"><span class="tm">${esc(tOn(e,d))}</span><span><button class="tlink" type="button" data-ek="${hk(e)}"><b>${esc(e.title)}</b></button> <span style="color:var(--muted)">· ${esc(e.venue)}</span>${liveLabel(e,d)?` <span class="chip live">${liveLabel(e,d)}</span>`:""}</span></div>`).join("")}</div>`:`<p class="lede" style="margin:0">Things are winding down for today. Tap a day below to plan ahead.</p>`}
  <div class="btns"><button class="go" type="button" id="surprise">Surprise me</button><button class="ghost" type="button" data-go="date">Free date idea</button><button class="ghost" type="button" data-go="weekend">Plan my weekend</button></div></div>`;
  el.querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>{const g=b.dataset.go;
    if(g==="games")setTab("games");
    else if(g==="free"){F.price="free";$("price").value="free";renderLists();document.querySelector("#dayList").scrollIntoView({behavior:"smooth"})}
    else if(g==="deals")document.querySelector("#dayList").scrollIntoView({behavior:"smooth"});
    else if(g==="new"){newOnly=true;setTab("all");renderAll()}
    else if(g==="date"){setTab("date");genPlan()}
    else if(g==="weekend"){setTab("date");buildWeekend();$("wkOut").scrollIntoView({behavior:"smooth"})}});
  $("surprise").onclick=()=>{let pool=ahead.length?ahead:todays;const best=pool.filter(e=>e.free||isFeatured(e));if(best.length>2)pool=best;
    if(!pool.length){toast("Nothing left today that matches your filters");return}openSheet(pick(pool),d)}}
function isFeatured(e){const f=(DATA.meta&&DATA.meta.featured)||{};return Object.values(f).flat().some(x=>x.id===e.id)}

/* Detail sheet */
let sheetEvent=null;
function openSheet(e,d){sheetEvent=e;const ds=days();d=d||(e.kind==="weekly"?nextOcc(e):(ds.find(x=>onDate(e,x))||parseYmd(e.start)));
  const f=wx(d);const dl=dealsFor(e.venue,d);
  const same=DATA.events.filter(x=>x!==e&&x.venue===e.venue&&!x.ongoing).slice(0,4);
  const like=DATA.events.filter(x=>x!==e&&x.venue!==e.venue&&x.tag===e.tag&&passes(x)&&!x.ongoing&&ds.some(y=>onDate(x,y))).slice(0,4);
  const when=whenText(e);
  const mini=list=>list.map(x=>`<div class="u"><span class="tm">${esc(x.kind==="weekly"?x.days.join("/"):fmtD(x.start).replace(/^\w+, /,""))}</span><span><button class="tlink" type="button" data-ek="${hk(x)}"><b>${esc(x.title)}</b></button> <span style="color:var(--muted)">· ${esc(x.venue)}</span></span></div>`).join("");
  $("sheet").innerHTML=`<button class="ghost x" type="button" id="shClose">Close</button>
  <div class="chips" style="margin:0">${chips(e,d)}</div>
  <h2 id="shTitle">${esc(e.title)}</h2>
  <dl class="meta"><dt>When</dt><dd>${esc(when)}</dd><dt>Where</dt><dd><button class="vlink" type="button" data-venue="${esc(e.venue)}">${esc(e.venue)}</button> · ${esc(e.area)}${(()=>{const g=geoOf(e);if(!g)return"";let s="";const dm=distMi(e);if(dm!=null)s+=`<div class="wxdetail">${g.approx?"About":"≈"} ${fmtMi(dm)} mi from ${esc(F.home)} (straight line)</div>`;if(g.rail&&!g.approx)s+=`<div class="wxdetail">About ${g.rail.mi} mi walk to ${esc(g.rail.st)} station (Blue Line)</div>`;if(g.approx)s+=`<div class="wxdetail">Map pin is approximate</div>`;return s+`<button class="linkbtn" type="button" data-mapv="${esc(e.venue)}" style="color:var(--teal)">Show on map</button>`})()}</dd><dt>Cost</dt><dd>${esc(e.price)}</dd>${e.note?`<dt>Details</dt><dd>${esc(e.note)}</dd>`:""}${(()=>{if(!e.gameKind&&!e.host)return"";const H=((DATA.meta||{}).hosts||{})[e.host]||{};const desc=(H.formats||{})[e.gameKind]||"";
    return `${e.gameKind?`<dt>Format</dt><dd>${esc(e.gameKind)}${desc?`<div class="wxdetail">${esc(desc)}</div>`:""}</dd>`:""}${e.host?`<dt>Host</dt><dd>${H.url?`<a href="${esc(H.url)}" target="_blank" rel="noopener" style="color:var(--teal)">${esc(e.host)}</a>`:esc(e.host)}${e.hostSrc?` <a href="${esc(e.hostSrc)}" target="_blank" rel="noopener" style="color:var(--muted);font-size:12px">(source)</a>`:""}</dd>`:""}`})()}${f?`<dt>Weather</dt><dd>${esc(wxText(f))} · sunset ${sunset(d)}${f.detail?`<div class="wxdetail">${esc(f.detail)}</div>`:""}</dd>`:""}${e.ages?`<dt>Ages</dt><dd>${esc(e.ages)}</dd>`:""}${dl.length?`<dt>Deals</dt><dd>${dl.map(x=>esc(x.deal)).join("; ")}</dd>`:""}${e.checked?`<dt>Checked</dt><dd>${fmtD(e.checked)}${(ageDays(e.checked)||0)>10?" (may be out of date)":""}</dd>`:""}${REPORTED.has(key(e))?`<dt>Reported</dt><dd style="color:var(--ember)">${esc([...new Set(REPORTED.get(key(e)))].join(", "))}. Check with the venue before you go.</dd>`:""}</dl>
  <div class="btns"><a class="ghost" href="${esc(maps(e))}" target="_blank" rel="noopener" style="text-decoration:none">Map</a><a class="ghost" href="${esc(gcal(e,d))}" target="_blank" rel="noopener" style="text-decoration:none">Add to calendar</a><a class="ghost" href="${esc(e.url)}" target="_blank" rel="noopener" style="text-decoration:none">Source</a><button class="ghost" type="button" id="shCopy">Copy details</button><button class="ghost" type="button" id="shSave">${saved.has(key(e))?"★ Saved":"☆ Save"}</button><button class="ghost" type="button" data-rep="${hk(e)}" style="color:var(--ember)">Report a problem</button></div>
  ${same.length?`<div class="upnext"><h3 class="group" style="margin:0">More at ${esc(e.venue)}</h3>${mini(same)}</div>`:""}
  ${like.length?`<div class="upnext"><h3 class="group" style="margin:0">Similar this week</h3>${mini(like)}</div>`:""}`;
  $("scrim").hidden=false;document.body.style.overflow="hidden";
  try{history.replaceState(null,"","#"+hk(e))}catch(x){}
  $("shClose").onclick=closeSheet;$("shClose").focus();
  $("shCopy").onclick=()=>copyText(`${e.title}\n${when}\n${e.venue}, ${e.area}\n${e.price}${e.note?"\n"+e.note:""}\nDetails: ${e.url}\n(via CLT This Week)`);
  $("shSave").onclick=()=>{const k=key(e);if(saved.has(k))saved.delete(k);else saved.add(k);store.set("cltSaved",[...saved]);$("shSave").textContent=saved.has(k)?"★ Saved":"☆ Save";
    document.querySelectorAll(".star").forEach(b=>{if(b.dataset.k===k){const on=saved.has(k);b.setAttribute("aria-pressed",on);b.textContent=on?"★":"☆"}});renderSaved()}}
function closeSheet(){$("scrim").hidden=true;document.body.style.overflow="";sheetEvent=null;try{history.replaceState(null,"",location.pathname+location.search)}catch(x){}}
$("scrim").addEventListener("click",ev=>{if(ev.target===$("scrim"))closeSheet()});
document.addEventListener("keydown",ev=>{if(ev.key==="Escape"&&!$("scrim").hidden)closeSheet();
  if(ev.key==="/"&&!/input|select|textarea/i.test((ev.target.tagName||""))){ev.preventDefault();openSearch()}});
document.addEventListener("click",ev=>{const t=ev.target.closest("[data-ek]");if(!t)return;const e=EVK.get(t.dataset.ek);if(e){ev.stopPropagation();openSheet(e)}},true);

/* Map */
let MAP=null,MK=null,HOMEL=null,mapWeekly=true,BASE_OK=false,focusVenue=null;
const MAPCATS={games:"Bar games",music:"Shows",arts:"Arts",festival:"Festivals",outdoors:"Outdoors",market:"Markets",family:"Family",sports:"Sports"};
function mapDays(){const out=[];const t=new Date();t.setHours(12,0,0,0);for(let i=0;i<14;i++){const d=new Date(t);d.setDate(t.getDate()+i);out.push(d)}return out}
function fillHomeSelects(){const P=DATA.places||{};const hs=Object.keys(P.homes||{}).sort();
  const opts=`<option value="">Distance from…</option>`+hs.map(h=>`<option${h===F.home?" selected":""}>${esc(h)}</option>`).join("");
  $("home").innerHTML=opts;}
function setHome(h){F.home=h;$("home").value=h;if(!h&&F.near){F.near=false;document.querySelector('#filterbar [data-f="near"]').setAttribute("aria-pressed","false")}renderLists()}
function initMap(){if(MAP||!window.L)return;
  MAP=L.map("map",{zoomControl:true,attributionControl:true,minZoom:9,maxZoom:16,zoomSnap:.5}).setView([35.24,-80.84],11);
  MAP.attributionControl.setPrefix(false);MAP.attributionControl.addAttribution("Base: US Census TIGER/Line · Places: © OpenStreetMap contributors");
  MAP.createPane("labels");MAP.getPane("labels").style.zIndex=450;MAP.getPane("labels").style.pointerEvents="none";
  fetch("basemap.json").then(r=>r.ok?r.json():null).then(gj=>{if(!gj)return;BASE_OK=true;const order={place:0,water:1,county:2,road:3,hwy:4};
    const fs=gj.features.slice().sort((a,b)=>(order[a.properties.k]??9)-(order[b.properties.k]??9));
    L.geoJSON({type:"FeatureCollection",features:fs},{interactive:false,style:f=>({className:"bm-"+f.properties.k+(f.properties.k==="place"&&f.properties.n===F.home?" home-town":""),weight:1})}).addTo(MAP).bringToBack();
    fs.filter(f=>f.properties.k==="place"&&f.properties.lx).forEach(f=>{const big=f.properties.n==="Charlotte";L.tooltip({permanent:true,direction:"center",className:"bm-label",pane:"labels"}).setLatLng(big?[35.30,-80.90]:[f.properties.ly,f.properties.lx]).setContent(esc(f.properties.n)).addTo(MAP)})
  }).catch(()=>{});
  const st=(DATA.places&&DATA.places.stations)||[];
  if(st.length){L.polyline(st.map(s=>[s.lat,s.lon]),{className:"bm-rail",interactive:false}).addTo(MAP);
    st.forEach(s=>L.circleMarker([s.lat,s.lon],{radius:3.5,className:"bm-st"}).bindTooltip(esc(s.name)+" station",{direction:"top"}).addTo(MAP))}
  MK=L.layerGroup().addTo(MAP)}
function renderMap(){if(!DATA)return;
  const ds=mapDays();const sel=$("mapDay");const cur=+sel.value||0;
  sel.innerHTML=ds.map((d,i)=>`<option value="${i}"${i===cur?" selected":""}>${i===0?"Today":i===1?"Tomorrow":d.toLocaleDateString("en-US",{weekday:"long",month:"short",day:"numeric"})}</option>`).join("");
  $("mapWeekly").setAttribute("aria-pressed",mapWeekly);
  const d=ds[cur];
  const evs=DATA.events.filter(e=>onDate(e,d)&&passes(e)&&!e.ongoing&&(mapWeekly||e.kind==="dated"));
  const byV=new Map();const unm=[];
  evs.forEach(e=>{const g=geoOf(e);if(!g){unm.push(e);return}if(!byV.has(e.venue))byV.set(e.venue,{g,list:[]});byV.get(e.venue).list.push(e)});
  const used=new Set();byV.forEach(v=>{v.list.sort((a,b)=>mins(tOn(a,d))-mins(tOn(b,d)));const c={};v.list.forEach(e=>c[e.cat]=(c[e.cat]||0)+1);v.cat=Object.entries(c).sort((a,b)=>b[1]-a[1])[0][0];used.add(v.cat==="community"?"festival":v.cat)});
  $("mapLegend").innerHTML=CAT_ORDER.filter(c=>used.has(c)).map(c=>`<span><i style="background:${CAT_COLOR[c]}"></i>${MAPCATS[c]}</span>`).join("")+`<span><i style="background:var(--sky);border-radius:2px;width:14px;height:4px"></i>LYNX Blue Line</span>`;
  if(!window.L){$("map").innerHTML=`<p class="empty" style="padding:16px">The map couldn't load. The list below still works; reopen the page to try the map again.</p>`}
  else{initMap();MK.clearLayers();const pts=[];
    byV.forEach((v,name)=>{const n=v.list.length;const m=L.circleMarker([v.g.lat,v.g.lon],{radius:Math.min(6+n*1.5,13),className:`mk mk-${v.cat}${v.g.approx?" approx":""}`});
      m.bindPopup(()=>`<div class="pop"><h4>${esc(name)}</h4><div class="a">${esc(v.list[0].area)}${v.g.approx?" · approximate pin":""}${(()=>{const x=distMi(v.list[0]);return x!=null?` · ≈${fmtMi(x)} mi from ${esc(F.home)}`:""})()}${v.g.rail&&!v.g.approx&&v.g.rail.mi<=0.75?` · ${v.g.rail.mi} mi to ${esc(v.g.rail.st)} station`:""}</div>${v.list.map(e=>`<div class="e"><span class="tm">${esc(tOn(e,d))}</span><button class="tlink" type="button" data-ek="${hk(e)}"><b>${esc(e.title)}</b></button></div>`).join("")}</div>`,{maxWidth:280});
      m.addTo(MK);m._venue=name;pts.push([v.g.lat,v.g.lon])});
    if(HOMEL){HOMEL.remove();HOMEL=null}const h=homePt();if(h){HOMEL=L.circleMarker([h.lat,h.lon],{radius:7,className:"mk-home"}).bindTooltip("Home base: "+esc(F.home),{direction:"top"}).addTo(MAP)}
    setTimeout(()=>{MAP.invalidateSize();
      if(focusVenue){const g=(DATA.places.venues||{})[focusVenue];if(g){MAP.setView([g.lat,g.lon],14);MK.eachLayer(l=>{if(l._venue===focusVenue)l.openPopup()})}focusVenue=null}
      else if(pts.length){const inner=pts.filter(p=>p[0]>34.95&&p[0]<35.45&&p[1]>-81.1&&p[1]<-80.6);MAP.fitBounds(L.latLngBounds(inner.length?inner:pts).pad(.08),{maxZoom:13})}},30)}
  const list=[...byV.values()].flatMap(v=>v.list).concat(unm);
  const sortF=homePt()?(a,b)=>byNear(a,b,d):(a,b)=>mins(tOn(a,d))-mins(tOn(b,d));
  $("mapList").innerHTML=groupBlock(homePt()?`Closest to ${F.home}`:"On the map",list.sort(sortF),{date:d})||`<p class="empty">Nothing matches on this day. Try another day or clear a filter.</p>`;
  $("mapNote").hidden=false}
$("mapDay").onchange=renderMap;
$("mapWeekly").onclick=()=>{mapWeekly=!mapWeekly;renderMap()};
document.addEventListener("click",ev=>{const t=ev.target.closest("[data-mapv]");if(!t)return;ev.preventDefault();ev.stopPropagation();focusVenue=t.dataset.mapv;closeSheet();
  const ds=mapDays();const e=sheetEvent;setTab("map");if(e){const i=ds.findIndex(x=>onDate(e,x));$("mapDay").value=String(i<0?0:i)}renderMap()},true);

/* Report a problem (shared db: reports collection, read by each scheduled refresh) */
const REASONS=[["time","Wrong time or date"],["cancelled","Cancelled or not happening"],["closed","Venue closed or no longer runs this"],["details","Wrong price, place or other details"],["other","Something else"]];
function openReport(e){if(!e)return;sheetEvent=e;
  const when=e.kind==="weekly"?"every "+e.days.join(", ")+" at "+e.time:fmtRange(e)+" at "+e.time;
  const q=new URLSearchParams({event:e.title+" at "+e.venue+", "+e.area+" ("+when+") ["+e.id+"]"});
  $("sheet").innerHTML=`<button class="ghost x" type="button" id="shClose">Close</button><h2 id="shTitle">Report a problem</h2><p class="lede" style="margin:0">${esc(e.title)}, ${esc(e.venue)}</p>
  <iframe class="repframe" title="Report a problem with this listing" src="${REPORT_FORM}?${q.toString()}" loading="lazy"></iframe>
  <p class="lede" style="font-size:13px;margin:0">Reports go straight to the CLT This Week team.</p>`;
  $("scrim").hidden=false;document.body.style.overflow="hidden";
  $("shClose").onclick=closeSheet;$("shClose").focus()}
document.addEventListener("click",ev=>{const t=ev.target.closest("[data-rep]");if(!t)return;ev.preventDefault();ev.stopPropagation();openReport(EVK.get(t.dataset.rep))},true);


/* My CLT + For You */
let ME=store.get("cltMe",null);
const INTERESTS=[["games","Trivia & bar games"],["music","Concerts & shows"],["arts","Museums & arts"],["festival","Festivals"],["outdoors","Outdoors"],["market","Markets"],["family","Family"],["sports","Sports"]];
function renderMe(){const me=ME||{interests:[],home:"",budget:"any"};
  const areas=[...new Set(DATA.events.filter(e=>(e.zone||"charlotte")!=="region").map(e=>e.area))].filter(a=>!/citywide|^charlotte$/i.test(a)).sort();
  $("mePrefs").innerHTML=`<h3>My CLT</h3><p class="lede" style="font-size:14px">Pick what you like and where you live. Day by Day will show "For you" picks. Saved on this device only.</p>
  <div class="chipsel" id="meInt">${INTERESTS.map(([k,l])=>`<button class="tog" type="button" data-i="${k}" aria-pressed="${me.interests.includes(k)}">${l}</button>`).join("")}</div>
  <div class="dn-controls"><label class="fld" for="meHome">Home area<select id="meHome"><option value="">Anywhere</option>${areas.map(a=>`<option${a===me.home?" selected":""}>${esc(a)}</option>`).join("")}</select></label>
  <label class="fld" for="meBudget">Usual budget<select id="meBudget"><option value="any"${me.budget==="any"?" selected":""}>Any</option><option value="under20"${me.budget==="under20"?" selected":""}>Under $20</option><option value="free"${me.budget==="free"?" selected":""}>Free</option></select></label>
  <button class="go" type="button" id="meSave">Save my picks</button>${ME?`<button class="clear" type="button" id="meReset">Reset</button>`:""}</div>`;
  $("meInt").querySelectorAll(".tog").forEach(b=>b.onclick=()=>b.setAttribute("aria-pressed",b.getAttribute("aria-pressed")!=="true"));
  $("meSave").onclick=()=>{ME={interests:[...$("meInt").querySelectorAll('[aria-pressed="true"]')].map(b=>b.dataset.i),home:$("meHome").value,budget:$("meBudget").value};store.set("cltMe",ME);renderForYou();renderMe();toast("Saved. Check Day by Day for your picks")};
  const rs=$("meReset");if(rs)rs.onclick=()=>{ME=null;try{localStorage.removeItem("cltMe")}catch(x){}renderMe();renderForYou()}}
function tierOk(e,b){if(b==="any")return true;const t=e.priceTier||(e.free?"free":"varies");return b==="free"?t==="free":(t==="free"||t==="under20")}
function renderForYou(){const el=$("forYou");if(!ME){el.innerHTML=`<div class="callout" style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:center"><span>Want picks just for you? Choose your interests and home area.</span><button class="ghost" type="button" id="meOpen">Set up My CLT</button></div>`;$("meOpen").onclick=()=>{setTab("saved");$("mePrefs").scrollIntoView({behavior:"smooth"})};return}
  const ds=days();const today=ymd(ds[0]);
  const cand=DATA.events.filter(e=>!e.ongoing&&passes(e)&&ds.some(d=>onDate(e,d))&&tierOk(e,ME.budget));
  const sc=e=>(ME.interests.includes(e.cat)?4:0)+(ME.home&&e.area===ME.home?3:0)+(isFeatured(e)?2:0)+(e.kind==="dated"?1.5:0)+(e.free?.5:0)+(NEWK.has(key(e))?1:0)-(e.unconfirmedTime?1:0);
  const seen=new Set();const top=cand.map(e=>({e,s:sc(e)})).filter(x=>x.s>=3).sort((a,b)=>b.s-a.s).filter(x=>{const k=x.e.title+x.e.venue;if(seen.has(k))return false;seen.add(k);return true}).slice(0,8);
  el.innerHTML=top.length?`<h3 class="group">For you this week</h3><div class="picks" style="margin-top:8px">${top.map(({e})=>{const d=ds.find(x=>onDate(e,x));return `<button class="pick" type="button" data-ek="${hk(e)}" style="background:var(--teal-soft)"><span class="k" style="color:var(--teal)">${ymd(d)===today?"Today":d.toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})} · ${esc(e.time)}</span><span class="t">${esc(e.title)}</span><span class="v">${esc(e.venue)} · ${esc(e.area)}</span></button>`}).join("")}</div>`:`<p class="lede">No strong matches this week. Try adding an interest in My CLT.</p>`}

/* Weekend planner */
function weekendDates(){const t=new Date();t.setHours(12,0,0,0);const dow=t.getDay();const late=new Date().getHours()>=15;
  let startOff;if(dow===5||dow===6)startOff=0;else if(dow===0)startOff=late?5:0;else startOff=5-dow;
  const out=[];for(let i=startOff;i<startOff+3;i++){const d=new Date(t);d.setDate(t.getDate()+i);if([5,6,0].includes(d.getDay()))out.push(d);if(d.getDay()===0)break}return out}
function spanDays(e){return e.kind==="dated"?Math.round((parseYmd(e.end)-parseYmd(e.start))/864e5):0}
function buildWeekend(){const wk=weekendDates();if(!wk.length){$("wkOut").innerHTML="";return}
  const budget=$("wkBudget").value, style=$("wkStyle").value;
  const scored=wk.map(d=>({d,s:outdoorScore(wx(d))}));const bestOut=scored.reduce((a,b)=>b.s>a.s?b:a).d;
  const used=new Set();
  const okE=e=>passes(e)&&!e.ongoing&&tierOk(e,budget)&&!used.has(key(e))&&!/all week|all day|varies/i.test(e.time)&&(spanDays(e)<=3||isFeatured(e)||/lights/i.test(e.tag));
  const prefDay={mix:["outdoors","market","arts","festival","family"],games:["market","outdoors","festival"],outdoors:["outdoors","market","festival"],culture:["arts","festival","market"],family:["family","market","outdoors","arts"]}[style];
  const prefNight={mix:["games","music","festival"],games:["games"],outdoors:["festival","games","music"],culture:["music","arts","festival"],family:["family","festival"]}[style];
  const choose=(d,cats,from,to,needOutdoor)=>{const r=wx(d);const wet=rainy(r);
    const c=DATA.events.filter(e=>okE(e)&&onDate(e,d)&&cats.includes(e.cat)&&mins(e.time)>=from&&mins(e.time)<to&&(!wet||!e.outdoor)&&(!needOutdoor||e.outdoor));
    c.sort((a,b)=>(isFeatured(b)-isFeatured(a))||((b.kind==="dated")-(a.kind==="dated"))||((a.unconfirmedTime?1:0)-(b.unconfirmedTime?1:0))||(cats.indexOf(a.cat)-cats.indexOf(b.cat)));
    const top=c.slice(0,Math.min(3,c.length));const e=top.length?pick(top):null;if(e)used.add(key(e));return e};
  const fallbackSpot=(d)=>{const wet=rainy(wx(d));const sp=DATA.freeSpots.filter(s=>(!wet||s.indoor)&&(!F.baby||s.stroller)&&s.area!=="Home");return sp.length?pick(sp):null};
  let html="",text="";
  for(const d of wk){const isBest=d===bestOut;const name=d.toLocaleDateString("en-US",{weekday:"long",month:"short",day:"numeric"});const f=wx(d);
    const day=d.getDay()===5?null:(choose(d,prefDay,7*60,17*60,isBest&&(style!=="culture"))||choose(d,prefDay,7*60,17*60,false));
    const night=choose(d,prefNight,17*60,23*60+59,false);
    const sp=!day&&d.getDay()!==5?fallbackSpot(d):null;
    const line=(k,e)=>e?`<div class="s"><span class="k">${k}</span><span><button class="tlink" type="button" data-ek="${hk(e)}"><b>${esc(e.title)}</b></button> · ${esc(e.time)} · ${esc(e.venue)} <span style="color:var(--muted)">(${esc(e.price)})</span></span></div>`:"";
    html+=`<div class="plan-day"><h4>${name}${isBest&&style!=="culture"?" · best outdoor day":""}</h4>${f?`<div class="wxline" style="margin:0">${esc(wxText(f))} · sunset ${sunset(d)}</div>`:""}
      ${line(d.getDay()===5?"":"Daytime",day)}${sp?`<div class="s"><span class="k">Daytime</span><span><b>${esc(sp.name)}</b> · ${esc(sp.idea)} <span style="color:var(--muted)">(free)</span></span></div>`:""}${line("Evening",night)}${!day&&!night&&!sp?`<p class="empty" style="padding:0">Nothing matched for ${esc(name.split(",")[0])} with this budget.</p>`:""}</div>`;
    text+=`${name}\n`+(day?`• Day: ${day.title} @ ${day.venue} (${day.time})\n`:"")+(sp?`• Day: ${sp.name}\n`:"")+(night?`• Night: ${night.title} @ ${night.venue} (${night.time})\n`:"")}
  $("wkOut").innerHTML=html+`<div class="btns" style="margin-top:8px"><button class="ghost" type="button" id="wkAgain">Shuffle</button><button class="ghost" type="button" id="wkCopy">Copy plan</button><button class="ghost" type="button" id="wkSave">Save plan</button></div>`;
  $("wkAgain").onclick=buildWeekend;$("wkCopy").onclick=()=>copyText("CLT weekend plan\n"+text);
  $("wkSave").onclick=()=>{const steps=text.trim().split("\n").filter(l=>l.startsWith("•")).map(l=>({k:"",t:l.replace(/^• /,""),p:""}));savedDates.unshift({day:"Weekend plan · "+wk.map(d=>d.toLocaleDateString("en-US",{month:"short",day:"numeric"})).join(", "),steps});savedDates=savedDates.slice(0,20);store.set("cltDates",savedDates);renderSaved();toast("Weekend plan saved")}}

/* Trivia scorecard */
let SCORES=store.get("cltScores",[]);
function renderScores(){const venuesG=[...new Set(DATA.events.filter(e=>e.cat==="games").map(e=>e.venue))].sort();
  const sel=$("scVenue");if(!sel.options.length)sel.innerHTML=venuesG.map(v=>`<option>${esc(v)}</option>`).join("");
  if(!$("scDate").value)$("scDate").value=ymd(new Date());
  const wins=SCORES.filter(s=>s.place==="1st").length,pod=SCORES.filter(s=>["1st","2nd","3rd"].includes(s.place)).length;
  const byV={};SCORES.forEach(s=>{byV[s.venue]=byV[s.venue]||{n:0,w:0};byV[s.venue].n++;if(s.place==="1st")byV[s.venue].w++});
  const best=Object.entries(byV).sort((a,b)=>b[1].w-a[1].w||b[1].n-a[1].n)[0];
  $("scoreRecord").innerHTML=SCORES.length?`<span><b>${SCORES.length}</b>nights played</span><span><b>${wins}</b>wins</span><span><b>${pod}</b>podiums</span>${best?`<span><b style="font-size:15px">${esc(best[0])}</b>${best[1].w?"most wins":"most played"}</span>`:""}`:"";
  $("scoreList").innerHTML=SCORES.length?`<div class="list">${SCORES.slice(0,15).map((s,i)=>`<div class="deal-row"><div class="k">${esc(s.place)}</div><div><b>${esc(s.venue)}</b> <span style="color:var(--muted)">· ${fmtD(s.date)}</span>${s.team?`<div style="font-size:13.5px">Team: ${esc(s.team)}</div>`:""}${s.note?`<div style="font-size:13.5px;color:var(--muted)">${esc(s.note)}</div>`:""}<div class="acts"><button class="clear" type="button" data-sdel="${i}">Remove</button></div></div></div>`).join("")}</div>`:`<p class="empty" style="padding:4px 0">No nights logged yet.</p>`;
  $("scoreList").querySelectorAll("[data-sdel]").forEach(b=>b.onclick=()=>{SCORES.splice(+b.dataset.sdel,1);store.set("cltScores",SCORES);renderScores()})}
$("scoreForm").addEventListener("submit",ev=>{ev.preventDefault();SCORES.unshift({venue:$("scVenue").value,date:$("scDate").value||ymd(new Date()),place:$("scPlace").value,note:$("scNote").value.trim(),team:$("teamName").textContent});SCORES=SCORES.slice(0,100);store.set("cltScores",SCORES);$("scNote").value="";renderScores();toast("Night logged")});

/* Header: search + theme */
function openSearch(){setTab("all");const q=$("q");q.focus();q.scrollIntoView({behavior:"smooth",block:"center"})}
$("hSearch").onclick=openSearch;
const THEMES=["system","light","dark"];let theme=store.get("cltTheme","system");
function applyTheme(){const r=document.documentElement;if(theme==="system")r.removeAttribute("data-theme");else r.setAttribute("data-theme",theme);$("hTheme").textContent=theme==="system"?"Theme: auto":theme==="light"?"Theme: light":"Theme: dark"}
$("hTheme").onclick=()=>{theme=THEMES[(THEMES.indexOf(theme)+1)%3];store.set("cltTheme",theme);applyTheme()};applyTheme();

/* Wiring */
function setTab(t){document.querySelectorAll(".tab").forEach(b=>{b.setAttribute("aria-selected",b.dataset.tab===t);b.tabIndex=b.dataset.tab===t?0:-1});document.querySelectorAll("[data-panel]").forEach(p=>p.hidden=p.dataset.panel!==t);$("filterbar").hidden=(t==="date"||t==="saved"||t==="venues");if(t==="venues")renderVenues();if(t==="map")renderMap();store.set("cltTab",t)}
document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>setTab(b.dataset.tab));
document.querySelector("nav.tabs").addEventListener("keydown",ev=>{const tabs=[...document.querySelectorAll("nav.tabs .tab:not([hidden])")];const i=tabs.indexOf(document.activeElement);if(i<0)return;
  const j=ev.key==="ArrowRight"?(i+1)%tabs.length:ev.key==="ArrowLeft"?(i-1+tabs.length)%tabs.length:ev.key==="Home"?0:ev.key==="End"?tabs.length-1:null;if(j==null)return;
  ev.preventDefault();tabs[j].focus();tabs[j].scrollIntoView({block:"nearest",inline:"nearest"});setTab(tabs[j].dataset.tab)});
function goTonight(){wkOff=0;selDay=0;setTab("week");renderWkSwitch();renderDays();renderDay();renderTonight();window.scrollTo(0,0)}
$("hTonight").onclick=goTonight;
(function(){const m=document.querySelector("header.mast");const setH=()=>document.documentElement.style.setProperty("--mastH",m.offsetHeight+"px");setH();try{new ResizeObserver(setH).observe(m)}catch(x){addEventListener("resize",setH)}})();
function renderLists(){renderKids();renderFood();if(document.querySelector('[data-panel="map"]')&&!document.querySelector('[data-panel="map"]').hidden)renderMap();renderTonight();renderForYou();renderOutdoors();renderCalendar();renderArts();renderDay();renderGames();renderNights();renderAll();renderSaved();renderSeason();$("clearF").hidden=!anyFilter();store.set("cltFilters",F)}
document.addEventListener("click",ev=>{const vl=ev.target.closest("[data-venue]");if(vl){openVenue(vl.dataset.venue);return}});
document.addEventListener("click",ev=>{const s=ev.target.closest(".star");if(!s)return;const k=s.dataset.k;if(saved.has(k))saved.delete(k);else saved.add(k);store.set("cltSaved",[...saved]);
  document.querySelectorAll(".star").forEach(b=>{if(b.dataset.k===k){const on=saved.has(k);b.setAttribute("aria-pressed",on);b.textContent=on?"★":"☆"}});renderSaved()});

function injectLd(){const items=DATA.events.filter(e=>e.kind==="dated").slice(0,60).map(e=>({"@context":"https://schema.org","@type":"Event",name:e.title,startDate:e.start,endDate:e.end,eventAttendanceMode:"https://schema.org/OfflineEventAttendanceMode",location:{"@type":"Place",name:e.venue,address:e.area+", Charlotte, NC"},isAccessibleForFree:!!e.free,url:e.url}));
  const s=document.createElement("script");s.type="application/ld+json";s.textContent=JSON.stringify(items);document.head.appendChild(s)}

function boot(data){DATA=data;const m=data.meta||{};
  data.events.forEach(e=>EVK.set(hk(e),e));
  const allKeys=data.events.map(key);const prev=store.get("cltSeen",null);
  if(prev&&prev.keys&&prev.keys.length){const ps=new Set(prev.keys);NEWK=new Set(allKeys.filter(k=>!ps.has(k)));
    if(prev.updated===m.updated&&prev.newKeys)NEWK=new Set(prev.newKeys.filter(k=>allKeys.includes(k)))}
  store.set("cltSeen",{updated:m.updated,keys:prev&&prev.updated===m.updated?prev.keys:allKeys,newKeys:[...NEWK]});
  Object.assign(F,store.get("cltFilters",{}));
  if(!["nearby","charlotte","region"].includes(F.zone))F.zone="nearby";$("zone").value=F.zone;
  const fillHoods=()=>{const areas=[...new Set(data.events.filter(zoneOk).map(e=>e.area))].sort();
    $("hood").innerHTML=`<option value="">${F.zone==="charlotte"?"All of Charlotte":"All neighborhoods & towns"}</option>`+areas.map(a=>`<option value="${esc(a)}">${esc(a)}</option>`).join("");
    if(!areas.includes(F.hood))F.hood="";$("hood").value=F.hood};
  fillHoods();
  $("zone").onchange=()=>{F.zone=$("zone").value;fillHoods();renderLists()};
  $("hood").onchange=()=>{F.hood=$("hood").value;renderLists()};
  if(!["","free","under20","ticketed"].includes(F.price))F.price="";$("price").value=F.price;
  $("price").onchange=()=>{F.price=$("price").value;renderLists()};
  if(F.home&&!((data.places||{}).homes||{})[F.home])F.home="";fillHomeSelects();
  $("home").onchange=()=>setHome($("home").value);
  $("teamNew").onclick=newTeam;$("teamCopy").onclick=()=>{const t=$("teamName").textContent;try{navigator.clipboard.writeText(t).then(()=>toast("Team name copied")).catch(()=>fallbackCopy(t))}catch(e){fallbackCopy(t)}};newTeam();
  document.querySelectorAll("#filterbar .tog").forEach(b=>{b.setAttribute("aria-pressed",!!F[b.dataset.f]);b.onclick=()=>{if(b.dataset.f==="near"&&!F.home&&!F.near){toast("Pick a home base in “Distance from” first");$("home").focus();return}F[b.dataset.f]=!F[b.dataset.f];b.setAttribute("aria-pressed",F[b.dataset.f]);renderLists()}});
  $("clearF").onclick=()=>{Object.assign(F,{zone:"nearby",hood:"",price:"",daytime:false,late:false,kids:false,dogs:false,baby:false,rail:false,near:false});$("zone").value="nearby";$("zone").onchange();$("price").value="";document.querySelectorAll("#filterbar .tog").forEach(b=>b.setAttribute("aria-pressed","false"));renderLists()};
  $("stamp").textContent=`Updated ${fmtD(m.updated)} · ${data.events.length} listings`;
  $("dnDay").innerHTML=days().map((d,i)=>`<option value="${i}">${i===0?"Tonight":d.toLocaleDateString("en-US",{weekday:"long",month:"short",day:"numeric"})}</option>`).join("");
  $("dnGo").onclick=()=>{locks.spot=false;locks.event=false;genPlan()};
  $("dnRain").onclick=()=>{rainTouched=true;const b=$("dnRain");b.setAttribute("aria-pressed",b.getAttribute("aria-pressed")!=="true")};
  $("dnDay").onchange=()=>{rainTouched=false};
  $("q").oninput=renderAll;
  $("dnDouble").onclick=()=>{dbl=!dbl;$("dnDouble").setAttribute("aria-pressed",dbl);genPlan()};
  $("wkGo").onclick=buildWeekend;renderMe();renderScores();
  renderWkSwitch();renderDays();renderLists();genPlan();buildWeekend();injectLd();
  renderFoot();
  let t="week";const h=(location.hash||"").slice(1);
  if(h==="tonight"){goTonight();return}
  if(h.startsWith("v-")){const v=venues().find(x=>slug(x.name)===h);if(v){openVenue(v.name);return}}
  if(h.startsWith("e-")&&EVK.get(h)){setTab(store.get("cltTab","week"));openSheet(EVK.get(h));return}
  if(["week","calendar","map","games","food","date","outdoors","arts","season","venues","all","kids","saved"].includes(h))t=h;else t=store.get("cltTab","week");
  if(t==="season"&&$("seasonTab").hidden)t="week";setTab(t)}
function renderFoot(){const m=DATA.meta||{};const src=m.sources||{};
  $("foot").innerHTML=`<div class="sign"><b>CLT This Week</b><span>Charlotte, NC. <a href="https://cltthisweek.com">cltthisweek.com</a></span></div>${REPORT_N?`<div style="color:var(--ember)">${REPORT_N} problem report${REPORT_N>1?"s":""} waiting for the next refresh.</div>`:""}<div>Covers ${esc(m.coverage||"")}: detailed for the next two weeks, big events through the end of next month. Next refresh: ${esc(m.nextUpdate||"")}.</div><div>Covers Charlotte plus nearby towns within about 10–13 miles (Harrisburg, Matthews, Mint Hill, Pineville, Huntersville, Belmont, Mount Holly). Switch to "Whole region" for the lake towns and beyond. Gathered from local listings (Mindless Minutia, HopCLT, Charlotte On The Cheap, Fun4Charlotte Kids, venue calendars). Kid- and dog-friendly tags come from <a href="${esc(src.kidsFriendly||"#")}" target="_blank" rel="noopener">local</a> <a href="${esc(src.dogsFriendly||"#")}" target="_blank" rel="noopener">guides</a>; policies change, so check with the venue. Times marked "to" are end times from the venue; faded listings haven't been rechecked in over 10 days. Distances are straight-line miles from the home base you pick; walks to Blue Line stations are estimates. Map: US Census TIGER/Line; venue locations © OpenStreetMap contributors.</div>`}
fetch("events.json",{cache:"no-store"}).then(r=>{if(!r.ok)throw new Error(r.status);return r.json()}).then(boot).catch(()=>{$("stamp").textContent="Couldn't load this week's events. Refresh to try again.";$("dayList").innerHTML=`<p class="empty">The event list didn't load. Refresh the page to try again.</p>`});
})();
