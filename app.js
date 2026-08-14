const STORAGE_KEY = 'krutar_master_score_card_v4';
const MANUAL_STORAGE_KEY = 'krutar_master_score_card_v4_manual';
const LEGACY_STORAGE_KEYS=['krutar_master_score_card_v2'];

const translations={
  en:{sessionInfo:'Session Information',sessionType:'Session Type',tournamentName:'Tournament / Training Name',playerName:'Player Name',division:'Division',venue:'Venue',startDate:'Start Date',endDate:'End Date',numberGames:'Number of Games',summary:'Tournament / Training Summary'},
  th:{sessionInfo:'ข้อมูลรายการ',sessionType:'ประเภทการบันทึก',tournamentName:'ชื่อการแข่งขัน / การฝึกซ้อม',playerName:'ชื่อผู้เล่น',division:'รุ่นการแข่งขัน',venue:'สถานที่',startDate:'วันที่เริ่ม',endDate:'วันที่สิ้นสุด',numberGames:'จำนวนเกม',summary:'สรุปการแข่งขัน / การฝึกซ้อม'}
};

function makeClientSessionKey(){
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return 'cs-'+Date.now()+'-'+Math.random().toString(36).slice(2)+'-'+Math.random().toString(36).slice(2);
}
const defaultState=()=>({
  meta:{sessionType:'TRAINING',tournamentName:'',playerName:'',division:'',venue:'',startDate:'',endDate:'',numberGames:4,clientSessionKey:makeClientSessionKey()},
  settings:{language:'en',resultFormat:'short',decimalPlaces:2,showOpponent:'yes',showRaw:'no',showRunning:'yes',showCharts:'yes',printOrientation:'portrait',apiUrl:'',eloStart:1500,eloK:32,theme:'light'},
  games:Array.from({length:4},()=>newGame()),
  approval:{status:'DRAFT',sessionId:'',approvedAt:''}
});

function newGame(){return {date:'',myScore:'',oppScore:'',myBingo:0,oppBingo:0,opponentName:'',selected:false}}
let state=defaultState();
let charts={};

const $=id=>document.getElementById(id);
const metaIds=['sessionType','tournamentName','playerName','division','venue','startDate','endDate','numberGames'];
const settingIds=['language','resultFormat','decimalPlaces','showOpponent','showRaw','showRunning','showCharts','printOrientation','apiUrl','eloStart','eloK'];

function parseNonNegInt(v){ if(v===''||v===null||v===undefined)return null; const n=Number(v); return Number.isInteger(n)&&n>=0?n:null; }
function computedGame(g){
  const my=parseNonNegInt(g.myScore), opp=parseNonNegInt(g.oppScore), mb=parseNonNegInt(g.myBingo)??0, ob=parseNonNegInt(g.oppBingo)??0;
  if(my===null||opp===null)return {...g,complete:false,result:'',rawSpread:null,officialSpread:null,myBingo:mb,oppBingo:ob};
  const raw=my-opp, official=Math.max(-350,Math.min(350,raw));
  return {...g,complete:true,result:raw>0?'W':raw<0?'L':'T',rawSpread:raw,officialSpread:official,myScore:my,oppScore:opp,myBingo:mb,oppBingo:ob};
}
function fmtSigned(n){return n===null||n===undefined?'':n>0?`+${n}`:`${n}`}
function fmtNum(n,d=0){return Number(n).toLocaleString(undefined,{minimumFractionDigits:d,maximumFractionDigits:d})}
function resultLabel(r){ if(!r)return ''; if(state.settings.resultFormat==='short')return r; return {W:'WIN',T:'TIE',L:'LOSE'}[r]; }

function setStateToInputs(){
  metaIds.forEach(id=>$(id).value=state.meta[id]??'');
  settingIds.forEach(id=>$(id).value=state.settings[id]??'');
  document.body.classList.toggle('dark',state.settings.theme==='dark');
  applySettingsVisibility(); applyLanguage();
}
function readInputsToState(){
  metaIds.forEach(id=>state.meta[id]=id==='numberGames'?Number($(id).value||0):$(id).value);
  settingIds.forEach(id=>state.settings[id]=['decimalPlaces','eloStart','eloK'].includes(id)?Number($(id).value):$(id).value);
}
function applyLanguage(){
  const t=translations[state.settings.language]||translations.en;
  document.querySelectorAll('[data-i18n]').forEach(el=>el.textContent=t[el.dataset.i18n]||el.textContent);
}
function applySettingsVisibility(){
  document.querySelectorAll('.opp-name-col').forEach(el=>el.classList.toggle('hidden',state.settings.showOpponent!=='yes'));
  document.querySelectorAll('.raw-col').forEach(el=>el.classList.toggle('hidden',state.settings.showRaw!=='yes'));
  $('runningPanel').classList.toggle('hidden',state.settings.showRunning!=='yes');
  $('chartsPanel').classList.toggle('hidden',state.settings.showCharts!=='yes');
}

function renderGames(){
  const body=$('gamesBody'); body.innerHTML='';
  state.games.forEach((g,i)=>{
    const c=computedGame(g), tr=document.createElement('tr');
    if(c.complete)tr.className=c.result==='W'?'row-win':c.result==='L'?'row-loss':'row-tie';
    tr.innerHTML=`
      <td><input type="date" data-f="date" data-i="${i}" value="${g.date||''}"></td>
      <td>${i+1}</td>
      <td><b>${resultLabel(c.result)}</b></td>
      <td><input type="number" min="0" step="1" data-f="myScore" data-i="${i}" value="${g.myScore}"></td>
      <td><input type="number" min="0" step="1" data-f="oppScore" data-i="${i}" value="${g.oppScore}"></td>
      <td><b>${fmtSigned(c.officialSpread)}</b></td>
      <td class="raw-col ${state.settings.showRaw==='yes'?'':'hidden'}">${fmtSigned(c.rawSpread)}</td>
      <td><input type="number" min="0" step="1" data-f="myBingo" data-i="${i}" value="${g.myBingo??0}"></td>
      <td><input type="number" min="0" step="1" data-f="oppBingo" data-i="${i}" value="${g.oppBingo??0}"></td>
      <td class="opp-name-col ${state.settings.showOpponent==='yes'?'':'hidden'}"><input type="text" data-f="opponentName" data-i="${i}" value="${escapeHtml(g.opponentName||'')}"></td>
      <td class="no-print"><input type="checkbox" data-f="selected" data-i="${i}" ${g.selected?'checked':''}></td>`;
    body.appendChild(tr);
  });
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}

function stats(){
  const completed=state.games.map(computedGame).filter(g=>g.complete), n=completed.length;
  const sum=(key)=>completed.reduce((a,g)=>a+(Number(g[key])||0),0);
  const wins=completed.filter(g=>g.result==='W').length, ties=completed.filter(g=>g.result==='T').length, losses=completed.filter(g=>g.result==='L').length;
  const vals=key=>completed.map(g=>g[key]).filter(v=>v!==null&&v!==undefined);
  const min=key=>vals(key).length?Math.min(...vals(key)):0, max=key=>vals(key).length?Math.max(...vals(key)):0;
  const winningMargins=completed.filter(g=>g.rawSpread>0).map(g=>g.rawSpread), losingMargins=completed.filter(g=>g.rawSpread<0).map(g=>Math.abs(g.rawSpread));
  return {completed,n,wins,ties,losses,
    winPct:n?wins/n*100:0,tiePct:n?ties/n*100:0,lossPct:n?losses/n*100:0,
    sumMy:sum('myScore'),sumOpp:sum('oppScore'),sumOff:sum('officialSpread'),sumRaw:sum('rawSpread'),sumMB:sum('myBingo'),sumOB:sum('oppBingo'),
    avgMy:n?sum('myScore')/n:0,avgOpp:n?sum('oppScore')/n:0,avgOff:n?sum('officialSpread')/n:0,avgRaw:n?sum('rawSpread')/n:0,avgMB:n?sum('myBingo')/n:0,avgOB:n?sum('oppBingo')/n:0,
    highMy:max('myScore'),lowMy:min('myScore'),highOpp:max('oppScore'),lowOpp:min('oppScore'),highOff:max('officialSpread'),lowOff:min('officialSpread'),
    highRaw:max('rawSpread'),lowRaw:min('rawSpread'),largestWin:winningMargins.length?Math.max(...winningMargins):0,largestLoss:losingMargins.length?Math.max(...losingMargins):0,
    highMB:max('myBingo'),highOB:max('oppBingo'),bingoDiff:sum('myBingo')-sum('oppBingo')
  };
}
function renderSummary(){
  const s=stats(), d=Number(state.settings.decimalPlaces)||0;
  const items=[
    ['Games Played',s.n],['Wins',`${s.wins} (${fmtNum(s.winPct,2)}%)`],['Ties',`${s.ties} (${fmtNum(s.tiePct,2)}%)`],['Losses',`${s.losses} (${fmtNum(s.lossPct,2)}%)`],
    ['Sum My Score',fmtNum(s.sumMy)],['Sum Opp Score',fmtNum(s.sumOpp)],['Sum Official Spread',fmtSigned(s.sumOff)],['Sum My Bingo',s.sumMB],['Sum Opp Bingo',s.sumOB],['Bingo Diff',fmtSigned(s.bingoDiff)],
    ['Avg My Score',fmtNum(s.avgMy,d)],['Avg Opp Score',fmtNum(s.avgOpp,d)],['Avg Official Spread',fmtNum(s.avgOff,d)],['Avg My Bingo',fmtNum(s.avgMB,d)],['Avg Opp Bingo',fmtNum(s.avgOB,d)]
  ];
  $('summaryCards').innerHTML=items.map(([k,v])=>`<div class="stat-card"><span>${k}</span><b>${v}</b></div>`).join('');
  const adv=[['Highest My Score',s.highMy],['Lowest My Score',s.lowMy],['Highest Opp Score',s.highOpp],['Lowest Opp Score',s.lowOpp],
    ['Highest Official Spread',fmtSigned(s.highOff)],['Lowest Official Spread',fmtSigned(s.lowOff)],['Highest Raw Spread',fmtSigned(s.highRaw)],['Lowest Raw Spread',fmtSigned(s.lowRaw)],
    ['Largest Winning Margin',s.largestWin],['Largest Losing Margin',s.largestLoss],['Highest My Bingo',s.highMB],['Highest Opp Bingo',s.highOB],['Average Raw Spread',fmtNum(s.avgRaw,d)]];
  $('advancedCards').innerHTML=adv.map(([k,v])=>`<div class="stat-card"><span>${k}</span><b>${v}</b></div>`).join('');
}
function runningStats(){
  let cm=0,co=0,cs=0,cr=0,cmb=0,cob=0,w=0,count=0; const out=[];
  state.games.map(computedGame).forEach((g,i)=>{
    if(!g.complete)return;
    count++; cm+=g.myScore;co+=g.oppScore;cs+=g.officialSpread;cr+=g.rawSpread;cmb+=g.myBingo;cob+=g.oppBingo;if(g.result==='W')w++;
    out.push({game:i+1,cm,co,cs,cr,cmb,cob,avgMy:cm/count,avgOpp:co/count,avgSpread:cs/count,winPct:w/count*100,my:g.myScore,opp:g.oppScore,spread:g.officialSpread,mb:g.myBingo,ob:g.oppBingo});
  }); return out;
}
function renderRunning(){
  const d=Number(state.settings.decimalPlaces)||0;
  $('runningBody').innerHTML=runningStats().map(r=>`<tr><td>${r.game}</td><td>${r.cm}</td><td>${r.co}</td><td>${fmtSigned(r.cs)}</td><td>${fmtSigned(r.cr)}</td><td>${r.cmb}</td><td>${r.cob}</td><td>${fmtNum(r.avgMy,d)}</td><td>${fmtNum(r.avgOpp,d)}</td><td>${fmtNum(r.avgSpread,d)}</td><td>${fmtNum(r.winPct,2)}%</td></tr>`).join('');
}
function makeChart(id,type,data,options={}){
  if(charts[id])charts[id].destroy();
  const el=$(id); if(!el||typeof Chart==='undefined')return;
  charts[id]=new Chart(el,{type,data,options:{responsive:true,maintainAspectRatio:false,...options}});
}
function renderCharts(){
  if(state.settings.showCharts!=='yes')return;
  const r=runningStats(), labels=r.map(x=>`G${x.game}`);
  makeChart('scoreChart','line',{labels,datasets:[{label:'My Score',data:r.map(x=>x.my)},{label:'Opp Score',data:r.map(x=>x.opp)}]});
  makeChart('spreadChart','bar',{labels,datasets:[{label:'Official Spread',data:r.map(x=>x.spread),backgroundColor:r.map(x=>x.spread>0?'#2563eb':x.spread<0?'#dc2626':'#d97706')}]});
  makeChart('runningChart','line',{labels,datasets:[{label:'Run Avg My',data:r.map(x=>x.avgMy)},{label:'Run Avg Opp',data:r.map(x=>x.avgOpp)}]});
  makeChart('bingoChart','bar',{labels,datasets:[{label:'My Bingo',data:r.map(x=>x.mb)},{label:'Opp Bingo',data:r.map(x=>x.ob)}]});
}
function renderApproval(){
  const completeCount=state.games.map(computedGame).filter(g=>g.complete).length, required=state.games.length;
  const metaOk=state.meta.playerName.trim()&&state.meta.tournamentName.trim();
  const approved=state.approval.status==='APPROVED';
  $('approveBtn').disabled=!(completeCount===required&&required>0&&metaOk)||approved;
  $('approvalHint').textContent=approved
    ?`Approved ${state.approval.sessionId} at ${state.approval.approvedAt}. This session is locked; use New Session to enter another session.`
    :`Complete ${required} of ${required} games before approval. Current complete games: ${completeCount}. Player and Session Name are required.`;
  $('saveBadge').textContent=state.approval.status;
  $('saveBadge').className='badge '+(approved?'saved':'draft');
  document.querySelectorAll('#sessionType,#tournamentName,#playerName,#division,#venue,#startDate,#endDate,#numberGames,#gamesBody input').forEach(el=>el.disabled=approved);
  ['addGameBtn','deleteLastBtn','deleteSelectedBtn'].forEach(id=>{if($(id))$(id).disabled=approved;});
}
function renderAll(){readInputsToState();renderGames();renderSummary();renderRunning();applySettingsVisibility();renderCharts();renderApproval();autosave();}

function ensureStateIdentity(){
  if(!state.meta)state.meta={};
  if(!state.meta.clientSessionKey)state.meta.clientSessionKey=makeClientSessionKey();
  if(!state.approval)state.approval={status:'DRAFT',sessionId:'',approvedAt:''};
}
function autosave(){
  ensureStateIdentity();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
function loadLocal(){
  try{
    const raw = localStorage.getItem(MANUAL_STORAGE_KEY);

    if(!raw){
      alert('No manually saved data found.');
      return;
    }

    const ok = confirm(
      'Load the last manually saved data?\n\n' +
      'Current unsaved changes will be replaced.'
    );

    if(!ok) return;

    state = JSON.parse(raw);

    ensureStateIdentity();
    setStateToInputs();
    renderGames();
    renderSummary();
    renderRunning();
    renderCharts();
    renderApproval();

    alert('Saved data loaded.');
  }catch(e){
    alert('Unable to load saved data: ' + e.message);
  }
}
function adjustGames(n){
  if(state.approval && state.approval.status==='APPROVED') return;

  n=Math.max(1,Math.min(100,Number(n)||1));
  while(state.games.length<n)state.games.push(newGame());
  while(state.games.length>n)state.games.pop();

  state.meta.numberGames=state.games.length;
  $('numberGames').value=state.games.length;

  renderAll();
}
function validateRowInput(target){
  const f=target.dataset.f,i=Number(target.dataset.i); if(Number.isNaN(i)||!state.games[i])return;
  if(f==='selected'){state.games[i][f]=target.checked;return;}
  if(['myScore','oppScore','myBingo','oppBingo'].includes(f)){
    const n=parseNonNegInt(target.value);
    if(target.value!==''&&n===null){target.value='';alert('Please enter a non-negative integer.');}
    state.games[i][f]=target.value===''?'':n;
    if((f==='myBingo'||f==='oppBingo')&&n>20)alert('Warning: Bingo count is unusually high (>20). Please verify.');
  }else state.games[i][f]=target.value;
}
function sessionPayload(){
  const s=stats();
  return {
    action:'approveSession',
    clientVersion:'4.0.0',
    meta:{...state.meta,numberGames:state.games.length,clientSessionKey:state.meta.clientSessionKey},
    settings:{eloStart:Number(state.settings.eloStart)||1500,eloK:Number(state.settings.eloK)||32},
    games:state.games.map((g,i)=>{const c=computedGame(g);return {gameNumber:i+1,date:g.date||'',result:c.result,myScore:c.myScore,opponentScore:c.oppScore,rawSpread:c.rawSpread,officialSpread:c.officialSpread,myBingo:c.myBingo,opponentBingo:c.oppBingo,opponentName:(g.opponentName||'').trim()}}),
    summary:{gamesPlayed:s.n,wins:s.wins,ties:s.ties,losses:s.losses,sumMyScore:s.sumMy,sumOpponentScore:s.sumOpp,sumOfficialSpread:s.sumOff,sumRawSpread:s.sumRaw,sumMyBingo:s.sumMB,sumOpponentBingo:s.sumOB,averageMyScore:s.avgMy,averageOpponentScore:s.avgOpp,averageOfficialSpread:s.avgOff,bingoDifference:s.bingoDiff}
  };
}
async function approveSubmit(){
  readInputsToState();
  const incomplete=state.games.map(computedGame).some(g=>!g.complete);
  if(incomplete||!state.meta.playerName.trim()||!state.meta.tournamentName.trim()){alert('Please complete all games, Player Name, and Session Name first.');return;}
  if(!confirm('Approve and submit this session? After approval, this session is treated as finalized.'))return;
  const url=(state.settings.apiUrl||'').trim();
  if(!url){alert('Please open Settings and paste your deployed Google Apps Script Web App URL first.');return;}
  $('approveBtn').disabled=true; $('approveBtn').textContent='Submitting...';
  try{
    const res=await fetch(url,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(sessionPayload()),redirect:'follow'});
    const raw=await res.text();
    let data;
    try{data=JSON.parse(raw);}catch(parseErr){
      const preview=raw.replace(/\s+/g,' ').slice(0,180);
      throw new Error(`Web App did not return JSON (HTTP ${res.status}). ${preview.startsWith('<')?'Google returned an HTML page. Check that Settings uses the CURRENT deployed /exec URL and that access is set to Everyone.':'Response: '+preview}`);
    }

if (data.duplicate) {
  state.approval = {
    status: 'APPROVED',
    sessionId: data.sessionId,
    approvedAt: data.approvedAt || new Date().toISOString()
  };

  autosave();
  renderApproval();

  alert(
    `This session was already submitted.\n` +
    `Existing Session ID: ${data.sessionId}`
  );
  return;
}

if (!data.ok) {
  throw new Error(data.error || 'Unknown server error');
}
    state.approval={status:'APPROVED',sessionId:data.sessionId,approvedAt:data.approvedAt||new Date().toISOString()};
    autosave(); renderApproval();
    alert(`Saved to Google Sheets.\nSession ID: ${data.sessionId}${data.eloUpdates?`\nElo updates: ${data.eloUpdates.length}`:''}`);
  }catch(e){alert('Submit failed: '+e.message);}
  finally{$('approveBtn').textContent='✅ APPROVE & SUBMIT';renderApproval();}
}
function startNewSession(){
  if(!confirm('Start a new session? The current local session will be cleared. Approved data already saved to Google Sheets will not be deleted.')) return;
  const keepSettings={...state.settings};
  state=defaultState();
  state.settings=keepSettings;
  setStateToInputs();
  renderGames(); renderSummary(); renderRunning(); renderCharts(); renderApproval();
  autosave();
}
function exportJSON(){
  const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});downloadBlob(blob,`master-score-card-${Date.now()}.json`);
}
function exportCSV(){
  const headers=['Game','Date','Result','My Score','Opponent Score','Raw Spread','Official Spread','My Bingo','Opponent Bingo','Opponent Name'];
  const rows=state.games.map((g,i)=>{const c=computedGame(g);return [i+1,g.date||'',c.result,c.myScore??'',c.oppScore??'',c.rawSpread??'',c.officialSpread??'',c.myBingo,c.oppBingo,g.opponentName||'']});
  const csv=[headers,...rows].map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\r\n');
  downloadBlob(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}),`master-score-card-${Date.now()}.csv`);
}
function downloadBlob(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
function importJSON(file){
  const reader=new FileReader();reader.onload=()=>{try{const obj=JSON.parse(reader.result);if(!obj.meta||!Array.isArray(obj.games)||!obj.settings)throw new Error('Invalid structure');if(confirm('Replace current data with imported data?')){state=obj;ensureStateIdentity();setStateToInputs();renderAll();}}catch(e){alert('Import failed: '+e.message)}};reader.readAsText(file);
}
function applyPrintOrientation(){
  let style=$('printOrientationStyle');if(!style){style=document.createElement('style');style.id='printOrientationStyle';document.head.appendChild(style);}
  style.textContent=`@media print{@page{size:A4 ${state.settings.printOrientation};margin:10mm}}`;
}
function runTests(){
  const tests=[[700,200,350],[200,700,-350],[650,300,350],[300,650,-350],[601,250,350],[250,601,-350],[500,151,349],[151,500,-349]];
  const passed=tests.every(([a,b,e])=>Math.max(-350,Math.min(350,a-b))===e);
  console.info('Maximum Difference tests:',passed?'PASS':'FAIL');
}
document.addEventListener('input',e=>{
  if(e.target.dataset.f){
  validateRowInput(e.target);
  autosave();
  return;
}
  if(metaIds.includes(e.target.id)){
  if(state.approval?.status === 'APPROVED'){
    setStateToInputs();
    return;
  }

  readInputsToState();

  if(e.target.id==='numberGames'){
    adjustGames(e.target.value);
  }else{
    renderApproval();
    autosave();
  }
}
  if(settingIds.includes(e.target.id)){readInputsToState();applyLanguage();applySettingsVisibility();renderGames();renderSummary();renderRunning();renderCharts();autosave();}
});
document.addEventListener('change',e=>{if(e.target.dataset.f){validateRowInput(e.target);renderAll();}});
$('addGameBtn').onclick=()=>adjustGames(state.games.length+1);
$('deleteLastBtn').onclick=()=>{if(state.games.length>1&&confirm('Delete last game?'))adjustGames(state.games.length-1)};
$('deleteSelectedBtn').onclick=()=>{if(confirm('Delete selected game(s)?')){state.games=state.games.filter(g=>!g.selected);if(!state.games.length)state.games=[newGame()];adjustGames(state.games.length)}};
$('approveBtn').onclick=approveSubmit;
$('newSessionBtn').onclick=startNewSession;
$('saveBtn').onclick=()=>{
  readInputsToState();
  ensureStateIdentity();

  localStorage.setItem(
    MANUAL_STORAGE_KEY,
    JSON.stringify(state)
  );

  alert('Saved locally.');
};
$('loadBtn').onclick=loadLocal;
$('exportJsonBtn').onclick=exportJSON;$('exportCsvBtn').onclick=exportCSV;
$('importJsonInput').onchange=e=>e.target.files[0]&&importJSON(e.target.files[0]);
$('printBtn').onclick=()=>{applyPrintOrientation();window.print()};
$('settingsBtn').onclick=()=>$('settingsPanel').classList.toggle('hidden');
$('themeBtn').onclick=()=>{state.settings.theme=state.settings.theme==='dark'?'light':'dark';document.body.classList.toggle('dark',state.settings.theme==='dark');autosave()};
$('langBtn').onclick=()=>{state.settings.language=state.settings.language==='en'?'th':'en';$('language').value=state.settings.language;applyLanguage();autosave()};

loadLocal();runTests();
