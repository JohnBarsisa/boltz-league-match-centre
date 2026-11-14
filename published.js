let leagueState,leagueRevision=-1,pendingLeague=false;
function applyLeague(s){
 leagueState=s;data.upcoming=s.matches.map(m=>{
  const scores=[m.home,m.away].map(n=>m.events.filter(e=>(e.type==='goal'&&e.team===n)||(e.type==='own goal'&&e.team!==n)).length);
  return {...m,home_score:scores[0],away_score:scores[1]};
 });renderSlide();draw();
}
async function syncLeague() {
 if (pendingLeague || document.hidden) return;
 pendingLeague = true;
 try {
  const response = await fetch('https://boltz-league-matchday.jpiyady.chatgpt.site/api/league', {cache:'no-store', credentials:'omit'});
  if (!response.ok) return;
  const {revision,state} = await response.json();
  if (revision === leagueRevision) return;
  const clubs = Object.fromEntries(Object.entries(seasonDefaults.clubs).map(([name,club]) =>
   [name, {...club, players:state.clubs[name].players}]));
  applyLeague({...seasonDefaults, clubs, matches:state.matches});
  leagueRevision = revision;
 } catch {
  // The bundled programme stays available if the live feed is offline.
 } finally {
  pendingLeague = false;
 }
}
function publishedLeaders(metric){
 const players=new Map();
 for(const m of data.upcoming){for(const e of m.events){
  if(e.type!=='goal')continue;const n=metric==='goals'?e.player:e.assist;if(!n)continue;
  const key=JSON.stringify([e.team,n]);const entry=players.get(key)||[n,clean(e.team),0];entry[2]++;players.set(key,entry);
 }}
 return [...players.values()].sort((a,b)=>b[2]-a[2]||a[0].localeCompare(b[0]));
}
function clubProfile(name){
 const c=leagueState?.clubs[name];if(!c)return '';
 const defaults=seasonDefaults.clubs[name], prior=priorClubCopy[name];
 const title=c.title===prior[0]?defaults.title:c.title,bio=c.bio===prior[1]?defaults.bio:c.bio;
 const scene=c.scene||{};
 const selected=Boolean(scene.player && scene.poster);
 const poster=selected?scene.poster:'/boltz-league-match-centre/storyboard/'+name+'.webp';
 const clip=selected?scene.clip:null;
 const label=selected?scene.player+' · '+name+' FC':'Season 6 campaign artwork';
 const frame='<figure class="profileFilm"><div class="filmFrame"><img class="filmStill" src="'+esc(poster)+'" alt="'+esc(selected?scene.player+' in the '+name+' FC kit':name+' FC scene preview')+'">'+
 (clip?'<video hidden muted playsinline loop preload="none" poster="'+esc(poster)+'" data-src="'+esc(clip)+'" aria-label="'+esc(label)+'"></video>':'')+'</div><figcaption>'+esc(label)+'</figcaption></figure>';
 return '<article class="clubprofile"><header class="profileHeading"><div class="kicker">SEASON 6 · CLUB PROFILE</div><h2>'+esc(name)+' FC</h2><h3 class="clubmotto">'+esc(title)+'</h3></header>'+frame+'<section class="profileStory"><p>'+esc(bio)+'</p><h3>Squad</h3>'+(c.players.length?'<ul class="roster">'+c.players.map(n=>'<li>'+esc(n)+'</li>').join('')+'</ul>':'<p class="note">The club’s squad has yet to be announced.</p>')+'</section></article>';
}
function lineupView(m,source){
 return '<div class="formationGrid">'+[m.home,m.away].map(side=>{
 const archived=source!=='upcoming';
 const saved=archived?rows('lineups',source).filter(r=>clean(r.team)===clean(side)):[];
 const names=archived?saved.map(r=>r.player):m.lineups?.[side]||[];
 const shape=m.formations?.[side]||'';
 const points=pitchPoints(names,shape,m.positions?.[side]);
 return '<div><h4>'+esc(side)+'</h4><small>'+esc(shape||(archived?'Archived club lineup':'Starting lineup'))+'</small>'+shirtPitch(side,points,esc)+'</div>';
 }).join('')+'</div>';
}
