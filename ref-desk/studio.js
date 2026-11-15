'use strict';
const $=id=>document.getElementById(id);
const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const query = new URLSearchParams(location.search);
const embedded = query.get('embedded') === '1' && window.parent !== window;
function deskFetch(path, options) {
 if (embedded && typeof window.parent.boltzRefFetch === 'function') return window.parent.boltzRefFetch(path, options);
 return fetch(path, options);
}
function notifyParent(message) {
 if (embedded) window.parent.postMessage(message, location.origin);
}
if (embedded) {
 document.body.classList.add('embedded');
 new ResizeObserver(() => notifyParent({type:'boltz-ref-height',height:Math.ceil(document.body.getBoundingClientRect().height)})).observe(document.body);
}
const collator = new Intl.Collator('en', {sensitivity:'base', numeric:true});
const eventIcons={'goal':'⚽','own goal':'↩','clean sheet':'🛡','yellow card':'🟨','red card':'🟥'};
let editingPlayer=null;
let role='guest';
const tabs=['Match control','Clubs & squads','Database control','Homepage','Navigation'];
let state,revision,dirty=false,busy=false,tab=tabs[0],club='Foxes',matchId,feature=0,eventSide,editEvent;
window.boltzRefDirty=()=>dirty;
const say=v=>$('feedback').textContent=v;
const match=()=>state.matches.find(m=>m.id===matchId);
const base='https://boltz-league-matchday.jpiyady.chatgpt.site';
const field=(label,id,v,type='text')=>'<label>'+label+'<input id="'+id+'" type="'+type+'" value="'+escape(v)+'"></label>';
const area=(label,id,v)=>'<label>'+label+'<textarea id="'+id+'">'+escape(v)+'</textarea></label>';
const opts=(items,value)=>items.map(n=>'<option '+(n===value?'selected':'')+'>'+escape(n)+'</option>').join('');
const select=(label,id,items,value)=>'<label>'+label+'<select id="'+id+'">'+opts(items,value)+'</select></label>';
const chooseClub=n=>n.replace(/ FC$/,'');
function changed(){dirty=true;notifyParent({type:'boltz-ref-dirty',dirty:true});$('revision').textContent='Unpublished changes';$('publish').disabled=busy}
function render(){
 $('tabs').innerHTML=(role==='owner'?tabs:tabs.slice(0,3)).map(t=>'<button data-tab="'+t+'" class="'+(tab===t?'on':'')+'">'+t+'</button>').join('');
 $('workspace').innerHTML='<h2>'+tab+'</h2>'+({'Match control':matchView,'Clubs & squads':clubView,'Database control':databaseView,Homepage:featureView,Navigation:menuView}[tab]());
 if($('assist')) $('assist').closest('label').hidden=$('type').value!=='goal';
 if(role==='referee' && $('stream')) $('stream').closest('label').hidden=true;
}
function uploadControl(path){return '<img class="art" src="'+escape(path.startsWith('/media/')?path:base+path)+'" alt="Current artwork"><label>Replace artwork<input id="upload" type="file" accept="image/jpeg,image/png,image/webp"></label><p class="hint">JPEG, PNG or WebP, up to 3 MB. Publish to display it in the match centre.</p>'}
function sceneEditor(c){
 const media=c.scene||{};
 return '<section class="card"><h3>Season 6 player film</h3><p>'+escape(sceneBriefs[club])+'</p><p>Frame one selected club player in their own kit, with boots and one football visible. Upload a short muted MP4 and a still of the same player.</p>'+
 field('Selected player','scenePlayer',media.player||'')+
 '<label>Player still<input type="file" data-scene="poster" accept="image/jpeg,image/png,image/webp"></label>'+
 '<label>Player clip<input type="file" data-scene="clip" accept="video/mp4"></label>'+
 '<p>'+[media.poster?'Still ready':'No player still',media.clip?'Clip ready':'No player clip'].join(' · ')+'</p>'+
 '<button type="button" id="clearScene">Clear player slot</button></section>';
}
function rosterEditor(c) {
 const upcoming=state.matches.filter(m=>m.status!=='completed'&&[m.home,m.away].includes(club+' FC'));
 const lineupLink=upcoming.length?'<label>Fixture lineup<select id="squadFixture">'+upcoming.map(m=>'<option value="'+escape(m.id)+'">'+escape(m.round+' · '+m.home+' v '+m.away)+'</option>').join('')+'</select></label><button id="openSquadLineup">Set lineup</button>':'';
 const names=[...c.players].sort(collator.compare);
 return '<section class="card"><h3>'+escape(club)+' FC squad</h3>'+
   field('Squad name','squadName',c.squadName||club+' FC')+
   '<form id="rosterForm" class="rosterForm"><label>Player name<input id="rosterInput" maxlength="70" autocomplete="off" required value="'+escape(editingPlayer||'')+'"></label>'+
   '<button type="submit">'+(editingPlayer?'Save name':'Add player')+'</button>'+
   (editingPlayer?'<button type="button" id="cancelRename">Cancel</button>':'')+'</form>'+
   (names.length?'<ul class="rosterList">'+names.map(name=>'<li><span>'+escape(name)+'</span>'+
   '<button data-rename-player="'+escape(name)+'" aria-label="Rename '+escape(name)+'">Rename</button>'+
   '<button data-remove-player="'+escape(name)+'" aria-label="Remove '+escape(name)+'">Remove</button></li>').join('')+'</ul>':'<p class="hint">No players added yet.</p>')+lineupLink+
   '</section>';
}
function clubView() {
 const c=state.clubs[club], picker=select('Club','club',Object.keys(state.clubs).sort(collator.compare),club);
 if(role==='referee') return picker+rosterEditor(c);
 return picker+rosterEditor(c)+'<div class="card">'+field('Club headline','title',c.title)+field('Kit colours','kit',c.kit)+area('Club bio','bio',c.bio)+uploadControl(c.image)+'</div>'+sceneEditor(c);
}
function databaseView() {
 const playerCount=Object.values(state.clubs).reduce((sum,c)=>sum+c.players.length,0);
 return '<section class="card"><h3>Season 6 records</h3><p>'+state.matches.length+' fixtures · '+playerCount+' registered players · revision '+revision+'</p>'+
   '<div class="row"><button id="dbSave">Save changes</button><button id="reloadRecords">Reload published records</button></div></section>'+
   '<section class="card"><h3>Reset season data</h3><p>Clear this season’s squads, fixtures, scores, lineups and events. Club profiles and league archives stay available.</p>'+
   '<button id="resetSeason" class="danger">Reset season data</button></section>';
}
function editRoster(oldName,newName) {
 const c=state.clubs[club];
 const other=c.players.filter(n=>n!==oldName);
 if(newName && (newName.length>70 || other.some(n=>collator.compare(n,newName)===0))){say('Enter a unique name of up to 70 characters.');return false}
 if(newName && other.length>=80){say('A squad can contain up to 80 players.');return false}
 c.players=(newName?[...other,newName]:other).sort(collator.compare);
 for(const m of state.matches) {
   const side=club+' FC';
   if(!oldName || m.status==='completed' || ![m.home,m.away].includes(side))continue;
   if(m.lineups?.[side])m.lineups[side]=[...new Set(m.lineups[side].flatMap(n=>n===oldName?(newName?[newName]:[]):[n]))];
   if(m.positions?.[side]){
    const seen=new Set();
    m.positions[side]=m.positions[side].flatMap(point=>{
     const name=point.name===oldName?newName:point.name;
     if(!name||seen.has(name))return [];
     seen.add(name);return [{...point,name}];
    });
   }
   if(newName) for(const e of m.events) if(e.team===side){if(e.player===oldName)e.player=newName;if(e.assist===oldName)e.assist=newName}
 }
 editingPlayer=null;changed();render();return true;
}
document.addEventListener('submit', async e=>{
 if(e.target.id!=='rosterForm')return;
 e.preventDefault();
 const name=$('rosterInput').value.trim();
 if(!name){say('Enter a player name.');return}
 const saveNow=!dirty;
 if(editRoster(editingPlayer,name)){
  if(saveNow)await publishDraft();else say('Squad updated in draft.');
  $('rosterInput')?.focus();
 }
});
function featureView(){const f=state.features[feature];return select('Homepage slide','feature',['Season 26','Foxes champions'],feature?'Foxes champions':'Season 26')+'<div class="card">'+field('Headline','title',f.title)+area('Description','description',f.description)+uploadControl(f.image)+'</div>'}
function menuView(){return '<div class="card"><h3>Main navigation labels</h3>'+Object.entries(state.menu).map(([id,n])=>field(id.charAt(0).toUpperCase()+id.slice(1),'menu-'+id,n)).join('')+'</div>'}
function players(side){return state.clubs[chooseClub(side)]?.players||[]}
function score(m){return [m.home,m.away].map(n=>m.events.filter(e=>(e.type==='goal'&&e.team===n)||(e.type==='own goal'&&e.team!==n)).length).join(' – ')}
function fixtureActions() {
 return '<div class="row fixtureActions"><button id="newMatch">Add fixture</button><button class="danger" id="deleteFixture">Delete selected fixture</button></div>';
}
function matchView(){const m=match();if(!m)return '<button id="newMatch">Add fixture</button>';
 const sides=[m.home,m.away],clubs=Object.keys(state.clubs).map(n=>n+' FC');if(!sides.includes(eventSide))eventSide=m.home;
 const e=m.events.find(x=>x.id===editEvent)||{team:eventSide,minute:'',player:'',assist:'',type:'goal'};
 return '<label>Fixture<select id="fixture">'+state.matches.map(x=>'<option value="'+escape(x.id)+'" '+(m===x?'selected':'')+'>'+escape(x.round+' · '+x.kickoff+' · '+x.home+' v '+x.away)+'</option>').join('')+'</select></label>'+fixtureActions()+'<div class="card"><div class="row"><h3>'+escape(m.home+' v '+m.away)+'</h3><span class="score">'+(m.status==='scheduled'?'—':score(m))+'</span></div>'+(m.status==='completed'?'':'<button id="matchClock">'+(m.status==='scheduled'?'Start match':'Finish match')+' &amp; publish</button>')+'<div class="grid">'+select('Home club','home',clubs,m.home)+select('Away club','away',clubs,m.away)+'<label>Round or stage<input id="round" list="roundNames" maxlength="50" value="'+escape(m.round)+'"></label><datalist id="roundNames">'+opts([...new Set([...state.matches.map(m=>m.round),...Array.from({length:12},(_,i)=>'Week '+(i+1)),'Semi-final','Final'])],m.round)+'</datalist>'+field('Kickoff','kickoff',m.kickoff,'time')+field('Pitch','venue',m.venue)+select('Status','status',['scheduled','live','completed'],m.status)+'</div>'+field('Stream URL','stream',m.stream||'','url')+'</div><div class="card"><h3>Match timeline</h3><ol class="events">'+m.events.map(x=>'<li>'+escape([x.minute===''?'':x.minute+'′',eventIcons[x.type]+' '+x.type,x.team,x.player,x.assist?'assist '+x.assist:''].filter(Boolean).join(' · '))+' <button data-edit="'+escape(x.id)+'">Edit</button><button data-remove="'+escape(x.id)+'">Remove</button></li>').join('')+'</ol><div class="grid">'+'<label>Event<select id="type">'+Object.entries(eventIcons).map(([value,icon])=>'<option value="'+value+'" '+(value===e.type?'selected':'')+'>'+icon+' '+value+'</option>').join('')+'</select></label>'+select('Club','eventSide',sides,eventSide)+field('Minute (optional)','minute',e.minute,'number')+'<label>Player<input maxlength="70" id="player" list="rosterNames" value="'+escape(e.player)+'"></label><label>Assist (optional)<input id="assist" list="rosterNames" value="'+escape(e.assist)+'"></label></div><datalist id="rosterNames">'+opts(players(eventSide),'')+'</datalist><button id="addEvent">'+(editEvent?'Update event':'Add event')+'</button></div><div class="card" id="startingLineups"><h3>Starting lineups</h3><div class="grid">'+sides.map((n,i)=>'<div><h4>'+escape(n)+'</h4>'+select('Formation','shape-'+i,['Unannounced','2-3-1','3-2-1','2-2-1','2-1-1','4-3-3','4-4-2','3-5-2','4-2-3-1'],m.formations?.[n]||'Unannounced')+'<p class="hint">Drag a jersey or focus it and use the arrow keys to position a player.</p>'+shirtPitch(n,pitchPoints(m.lineups[n]||[],m.formations?.[n],m.positions?.[n]),escape,i)+'<label>Starter name<input id="starter-'+i+'" maxlength="70"></label><button type="button" data-starter="'+i+'">Add starter</button>'+[...new Set([...players(n),...(m.lineups[n]||[])])].map(v=>'<label class="check"><input type="checkbox" data-line="'+i+'" value="'+escape(v)+'" '+((m.lineups[n]||[]).includes(v)?'checked':'')+'>'+escape(v)+'</label>').join('')+(!players(n).length?'':'')+'</div>').join('')+'</div></div>'}
function capture(el){
 const k=el.id,v=el.value;
 if(tab==='Clubs & squads'&&k==='squadName'){state.clubs[club].squadName=v.trim()||club+' FC'}
 else if(tab==='Clubs & squads'&&k==='scenePlayer'){(state.clubs[club].scene??={}).player=v.trim()}
 else if(tab==='Navigation'&&k.startsWith('menu-'))state.menu[k.slice(5)]=v;
 else if(tab==='Homepage'&&['title','description'].includes(k))state.features[feature][k]=v;
 else if(tab==='Clubs & squads'&&['title','kit','bio','players'].includes(k))state.clubs[club][k]=k==='players'?v.split('\n').map(n=>n.trim()).filter(Boolean):v;
 else if(tab==='Match control'&&['home','away','round','kickoff','venue','status','stream'].includes(k)){
  const m=match();if(['home','away'].includes(k)&&v!==m[k]){if(m.status!=='scheduled'||m.events.length||Object.values(m.lineups).some(a=>a.length)||Object.keys(m.formations||{}).length||Object.keys(m.positions||{}).length){say('Clubs can change only on a scheduled fixture with no events or lineup setup.');el.value=m[k];return}if(v===m[k==='home'?'away':'home']){say('Choose two different clubs.');el.value=m[k];return}}
  if(k==='status'&&v==='scheduled'&&m.events.length){say('A match with events must be live or completed.');el.value=m.status;return}m[k]=v;
 }else return;
 changed();
}
document.addEventListener('input',e=>{if(e.target.matches('input:not([type=file]):not([type=checkbox]),textarea'))capture(e.target)});
document.addEventListener('change',async e=>{const el=e.target,v=el.value;
 if(el.dataset.scene&&el.files[0]){
  const c=state.clubs[club],kind=el.dataset.scene,file=el.files[0];
  busy=true;document.querySelector('.layout').inert=true;$('publish').disabled=true;
  try{
   if(file.size>(kind==='clip'?16:3)*1024*1024)throw Error(kind==='clip'?'Choose an MP4 under 16 MB.':'Choose a still under 3 MB.');
   const r=await deskFetch(kind==='clip'?'api/clip':'api/upload',{method:'POST',body:file});
   const d=await r.json();if(!r.ok)throw Error(d.error);
   (c.scene??={})[kind]=d.path;changed();render();say('Media attached to draft.');
  }catch(err){say(err.message)}finally{busy=false;document.querySelector('.layout').inert=false;$('publish').disabled=!dirty}
  return;
 }
 if(el.id.startsWith('shape-')){const m=match(),side=[m.home,m.away][Number(el.id.slice(-1))];m.formations??={};if(m.positions)delete m.positions[side];if(v==='Unannounced')delete m.formations[side];else m.formations[side]=v;changed();render();return}
 if(el.id==='upload'&&el.files[0]){
 const target=tab==='Homepage'?state.features[feature]:state.clubs[club];try{const file=el.files[0];if(file.size>3145728)throw Error('Choose a file under 3 MB.');const r=await deskFetch('api/upload',{method:'POST',body:file});const d=await r.json();if(!r.ok)throw Error(d.error);target.image=d.path;changed();render();say('Image uploaded. Publish changes to use it.')}catch(err){say(err.message)}return}
 if(el.id==='type'){$('assist').closest('label').hidden=v!=='goal';if(v!=='goal')$('assist').value='';return}
 if(el.id==='club'){club=v;editingPlayer=null;}else if(el.id==='feature')feature=v==='Season 26'?0:1;else if(el.id==='fixture'){matchId=v;editEvent=null;eventSide=null}else if(el.id==='eventSide'){eventSide=v;$('rosterNames').innerHTML=opts(players(v),'');return}
 else if(el.dataset.line!==undefined){const m=match(),side=[m.home,m.away][+el.dataset.line],a=m.lineups[side]||[];if(el.checked&&a.length===11){el.checked=false;say('Select up to eleven starters.');return}if(!el.checked && m.positions?.[side])m.positions[side]=m.positions[side].filter(p=>p.name!==v);m.lineups[side]=el.checked?[...a,v]:a.filter(n=>n!==v);changed()}
 else if(el.tagName==='SELECT'){capture(el);if(!['status','home','away'].includes(el.id))return}else return;
 render();
});
document.addEventListener('click',async e=>{const b=e.target.closest('button');if(!b||busy)return;
 if(b.id==='openSquadLineup'){
  matchId=$('squadFixture').value;eventSide=club+' FC';editEvent=null;tab='Match control';render();
  $('startingLineups')?.scrollIntoView({block:'start'});return;
 }
 if(b.id==='matchClock'){
  const m=match();
  if(!m||m.status==='completed')return;
  m.status=m.status==='scheduled'?'live':'completed';changed();render();await publishDraft();return;
 }
 if(b.id==='reloadRecords'){
  if(dirty&&!confirm('Discard these unpublished changes and reload the last saved records?'))return;
  try{await start();say('Loaded published records.')}catch(err){say(err.message)}return;
 }
 if(b.id==='resetSeason'){
  if(prompt('Clear all Season 6 squads and matches? Type RESET SEASON to stage the reset.')!=='RESET SEASON')return;
  for(const c of Object.values(state.clubs))c.players=[];
  state.matches=[];matchId=null;editEvent=null;editingPlayer=null;changed();render();say('Reset staged. Save changes to publish, or reload to discard.');return;
 }
 if(b.id==='deleteFixture'){
  const m=match();
  if(!confirm('Delete '+m.round+' · '+m.home+' v '+m.away+' with its lineup and timeline?'))return;
  state.matches=state.matches.filter(n=>n.id!==m.id);matchId=state.matches[0]?.id;eventSide=null;editEvent=null;changed();render();say('Fixture removed from draft. Save changes to publish.');return;
 }
 if(b.hasAttribute('data-rename-player')){editingPlayer=b.dataset.renamePlayer;render();$('rosterInput').focus();return}
 if(b.id==='cancelRename'){editingPlayer=null;render();return}
 if(b.hasAttribute('data-remove-player')){
  const name=b.dataset.removePlayer;
  if(!confirm('Remove '+name+' from '+club+' FC and its unfinished lineups?'))return;
  const saveNow=!dirty;
  if(editRoster(name,null)&&saveNow)await publishDraft();
  return;
 }
 if(b.id==='clearScene'){delete state.clubs[club].scene;changed();render();return}
 if(b.dataset.tab){tab=b.dataset.tab;editingPlayer=null;editEvent=null;say('');render();return}
 if(b.id==='newMatch'){if(state.matches.length>=150){say('Season fixture limit reached.');return}const m={id:crypto.randomUUID(),round:'Round 1',kickoff:'13:00',venue:'Pitch 1',home:'Stacey FC',away:'Foxes FC',status:'scheduled',events:[],lineups:{},stream:''};state.matches.push(m);matchId=m.id;changed();render();return}
 if(b.dataset.remove){match().events=match().events.filter(x=>x.id!==b.dataset.remove);editEvent=null;changed();render();return}
 if(b.dataset.edit){editEvent=b.dataset.edit;eventSide=match().events.find(x=>x.id===editEvent).team;render();$('player').focus();return}
 if(b.id==='addEvent'){const m=match();if(m.status==='scheduled'){say('Set the fixture to live before logging an event.');return}
 const x={id:editEvent||crypto.randomUUID(),minute:$('minute').value===''?'':Number($('minute').value),type:$('type').value,team:eventSide,player:$('player').value.trim(),assist:$('assist').value.trim()};
 if(!x.player||x.minute!==''&&(!Number.isInteger(x.minute)||x.minute<0||x.minute>150)||x.assist&&(x.type!=='goal'||x.player===x.assist)){say('Check the player, minute and assist.');return}
 if(editEvent)m.events[m.events.findIndex(y=>y.id===editEvent)]=x;else m.events.push(x);editEvent=null;changed();render();say('Event recorded in draft. Publish to update the match centre.');return}
 if(b.id==='publish'||b.id==='dbSave'){await publishDraft()}
});
async function publishDraft(){
 if(!dirty||busy)return;
 busy=true;$('publish').disabled=true;document.querySelector('.layout').inert=true;
 try{
  const r=await deskFetch('api/state',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision,state})});
  const d=await r.json();if(!r.ok)throw Error(d.error||'Unable to save.');
  revision=d.revision;dirty=false;notifyParent({type:'boltz-ref-dirty',dirty:false});notifyParent({type:'boltz-ref-published',revision});
  $('revision').textContent='Published · revision '+revision;
  if(tab==='Database control')render();
  say('Saved to the match centre.');
 }catch(err){say(err.message)}
 finally{busy=false;$('publish').disabled=!dirty;document.querySelector('.layout').inert=false}
}
addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue=''}});
function lockDesk(){
 $('revision').textContent='Locked';$('tabs').replaceChildren();$('publish').hidden=true;
 $('workspace').innerHTML='<form class="card loginCard" id="loginForm"><div class="eyebrow">MATCH OFFICIALS</div><h2>Referee sign-in</h2><label>Referee password<input id="refpass" type="password" autocomplete="current-password" required></label><button>Unlock match control</button></form>';
 $('loginForm').onsubmit=async e=>{e.preventDefault();try{const r=await deskFetch('api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:$('refpass').value})});const d=await r.json();$('refpass').value='';if(!r.ok)throw Error(d.error);await start()}catch(err){say(err.message)}};
}
async function start(){
 if(location.pathname.startsWith('/referee')){document.querySelector('header h1').textContent='Ref Area';document.title='Ref Area · Boltz League'}
 const access=await deskFetch('api/access').then(r=>r.json());role=access.role;
 if(role==='guest'){lockDesk();return}
 const r=await deskFetch('api/state');if(!r.ok)throw Error('Unable to load season.');const d=await r.json();state=d.state;revision=d.revision;dirty=false;notifyParent({type:'boltz-ref-dirty',dirty:false});$('publish').disabled=true;
 const requested=new URLSearchParams(location.search).get('match');matchId=state.matches.find(m=>m.id===requested)?.id||state.matches[0]?.id;
 $('publish').hidden=false;$('signout').hidden=embedded||role!=='referee';$('revision').textContent=(role==='owner'?'Owner':'Referee')+' · revision '+revision;say('');render();
}
$('signout').onclick=async()=>{if(dirty&&!confirm('Discard unpublished changes and lock?'))return;const r=await deskFetch('api/logout',{method:'POST'});if(r.ok){dirty=false;location.reload()}};
start().catch(e=>say(e.message));
const shirtColours = {Stacey:'#8dc9ef', Angels:'#fafafa', CityMen:'#c42c35', Infinity:'#234eac', Foxes:'#e27419', Darkfang:'#292e35', Typhoon:'#257457'};
function pitchPoints(names, formation, saved = []) {
  const counts = formation ? [1,...formation.split('-').map(Number)] : [1,2,3,2,3];
  const rows = [];
  let used = 0;
  for (const count of counts) {
    const row = names.slice(used, used + count);
    if (row.length) rows.push(row);
    used += count;
  }
  if (used < names.length) rows.push(names.slice(used));
  return rows.flatMap((row,r) => row.map((name,i) => saved.find(p=>p.name===name) ||
    {name, x:100*(i+1)/(row.length+1), y:rows.length===1?50:85-r*70/(rows.length-1)}));
}
function shirtPitch(team, points, encode, editSide) {
  const editable = editSide !== undefined;
  const tag = editable ? 'button' : 'span';
  const shirt = '<svg viewBox="0 0 64 52" aria-hidden="true"><path d="M21 4 8 9 2 24 13 29 17 22 16 48 48 48 47 22 51 29 62 24 56 9 43 4Q32 14 21 4Z" fill="currentColor" stroke="#dee8ee" stroke-width="2"/><path d="M22 5Q32 17 42 5" fill="none" stroke="#66717a" stroke-width="2"/></svg>';
  return '<div class="jerseyPitch" style="--shirt:'+ (shirtColours[team.replace(/ FC$/,'')]||'#788bb7')+'">'+
    points.map(({name,x,y},i)=>'<'+tag+' class="jersey" '+(editable?'type="button" data-position="'+editSide+'" data-index="'+i+'" aria-label="Move '+encode(name)+'"':'')+' style="left:'+x+'%;top:'+y+'%">'+shirt+'<b>'+encode(name)+'</b></'+tag+'>').join('')+
    (points.length?'':'<span class="pitchEmpty">Lineup pending</span>')+'</div>';
}
document.addEventListener('click', e=>{
 const add=e.target.closest('[data-starter]');if(!add)return;
 const i=Number(add.dataset.starter), m=match(), side=[m.home,m.away][i];
 const value=$('starter-'+i).value.trim(), starters=m.lineups[side]||[];
 if(!value||starters.includes(value)||starters.length>=11){say('Enter a new name, up to eleven starters.');return}
 m.lineups[side]=[...starters,value];changed();render();
});
function positionJersey(el,x,y) {
 const m=match(),side=[m.home,m.away][Number(el.dataset.position)];
 const points=pitchPoints(m.lineups[side],m.formations?.[side],m.positions?.[side]);
 const point=points[Number(el.dataset.index)];
 point.x=Math.max(7,Math.min(93,Math.round(x)));point.y=Math.max(7,Math.min(93,Math.round(y)));
 m.positions??={};m.positions[side]=points;
 el.style.left=point.x+'%';el.style.top=point.y+'%';changed();
}
let moving;
document.addEventListener('pointerdown',e=>{
 const el=e.target.closest('button.jersey');if(!el||!e.isPrimary||e.button!==0)return;
 moving=el;el.setPointerCapture(e.pointerId);
});
document.addEventListener('pointermove',e=>{
 if(!moving?.hasPointerCapture(e.pointerId))return;
 const r=moving.parentElement.getBoundingClientRect();
 positionJersey(moving,100*(e.clientX-r.left)/r.width,100*(e.clientY-r.top)/r.height);
});
for(const event of ['pointerup','pointercancel','lostpointercapture'])document.addEventListener(event,()=>moving=null);
document.addEventListener('keydown',e=>{
 const el=e.target.closest('button.jersey');if(!el||!['ArrowLeft','ArrowRight','ArrowDown','ArrowUp'].includes(e.key))return;
 e.preventDefault();positionJersey(el,parseFloat(el.style.left)+(e.key==='ArrowRight'?2:e.key==='ArrowLeft'?-2:0),parseFloat(el.style.top)+(e.key==='ArrowDown'?2:e.key==='ArrowUp'?-2:0));
});
