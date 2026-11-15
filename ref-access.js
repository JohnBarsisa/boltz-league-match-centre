(() => {
 const pagesHost = location.origin === 'https://johnbarsisa.github.io';
 const service = pagesHost ? 'https://boltz-league-matchday.jpiyady.chatgpt.site' : location.origin;
 const route = () => /^#ref(?:[/?]|$)/.test(location.hash);
 const storageKey = 'boltz-league/ref-session';
 const shell = document.getElementById('refWorkspace');
 const entry = document.getElementById('refAccess');
 const logout = document.getElementById('refLogout');
 const formDialog = document.getElementById('refLogin');
 const form = formDialog.querySelector('form');
 const password = form.elements.password;
 const feedback = form.querySelector('[role=status]');
 let signedIn = false, token = '', frame, lastTarget, initialState;
 function setToken(value) {
  token=value;
  try { if(value)sessionStorage.setItem(storageKey,value);else sessionStorage.removeItem(storageKey); } catch {}
 }
 try {token=sessionStorage.getItem(storageKey)||''} catch {}
 function ask() {
  feedback.textContent = ''; password.value = '';
  if (!formDialog.open) formDialog.showModal();
  password.focus();
 }
 async function api(path, options = {}) {
  if (!['api/access','api/ref-state','api/state','api/login','api/logout'].includes(path)) throw Error('Unknown match control action.');
  const headers = new Headers(options.headers);
  headers.set('X-Boltz-Client','match-centre');
  if(token)headers.set('X-Boltz-Session',token);
  const response = await fetch(service+'/referee/'+path, {...options,headers,credentials:pagesHost?'omit':'same-origin',cache:'no-store'});
  if (path==='api/state' && options.method==='PUT' && response.ok) window.syncLeague?.();
  return response;
 }
 window.boltzRefFetch = api;
 async function readDesk() {
  const res=await api('api/ref-state');
  if(res.status===401)throw Object.assign(Error('Your referee session has expired. Sign in to continue.'),{expired:true});
  if(!res.ok)throw Error('Could not load match controls. Try again.');
  const data=await res.json();
  if(data.role!=='referee'||!data.state||!Number.isInteger(data.revision))throw Error('The match service could not confirm the referee session.');
  return data;
 }
 window.boltzRefReady = async () => {
  if(initialState){const state=initialState;initialState=null;return state}
  try{return await readDesk()}catch(error){if(error.expired){disconnect();ask();feedback.textContent=error.message}throw error}
 };
 function frameTheme() {
  if (!frame?.contentDocument?.body) return;
  const doc=frame.contentDocument, styles=getComputedStyle(document.body);
  for(const key of ['bg','surface','ink','muted','rule','brand','accent-fill','accent-ink']) {
   doc.documentElement.style.setProperty('--'+key,styles.getPropertyValue('--'+key));
  }
  doc.documentElement.style.colorScheme=document.body.dataset.mode || 'light';
 }
 function show() {
  const active = route();
  shell.hidden = !active;
  document.body.classList.toggle('in-ref',active);
  document.body.classList.toggle('ref-active',signedIn);
  entry.textContent = signedIn?'Ref desk':'Ref Access';
  logout.hidden = !signedIn;
  if (!active) return;
  document.getElementById('refLocked').hidden = signedIn;
  const target = location.hash;
  if (!signedIn || (frame && lastTarget===target)) return;
  if(frame?.contentWindow?.boltzRefDirty?.() && !confirm('Discard the unpublished draft and open a different fixture?')){
   history.replaceState(null,'',lastTarget || '#ref');return;
  }
  frame?.remove(); frame=document.createElement('iframe'); frame.title='Referee match controls';
  frame.id='refDeskFrame'; lastTarget=target;
  const src=new URL('ref-desk/index.html',document.baseURI);
  src.searchParams.set('embedded','1');
  const [path,query='']=target.split('?');
  let matchId='';
  try {matchId=decodeURIComponent(path.slice('#ref/'.length))} catch {}
  const section=new URLSearchParams(query).get('section');
  if(['teams','fixtures','live','database'].includes(section))src.searchParams.set('section',section);
  if(matchId)src.searchParams.set('match',matchId);
  frame.addEventListener('load',frameTheme);frame.src=src;shell.append(frame);
 }
 function disconnect() {
  signedIn=false;setToken('');initialState=null;frame?.remove();frame=null;lastTarget=undefined;
  show();
 }
 entry.addEventListener('click',e=>{e.preventDefault();if(signedIn){location.hash='ref';show()}else ask()});
 document.getElementById('refUnlock').onclick=ask;
 formDialog.querySelector('[data-cancel]').onclick=()=>formDialog.close();
 formDialog.addEventListener('close',()=>{password.value=''});
 form.onsubmit=async e=>{
  e.preventDefault();const submit=form.querySelector('[type=submit]');submit.disabled=true;
  feedback.textContent='Checking password…';
  try {
   const res=await api('api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:password.value})});
   const result=await res.json();if(!res.ok || result.role!=='referee')throw Error(result.error||'Sign-in failed.');
   if(!/^[a-f0-9-]{72}$/.test(result.token||''))throw Error('Could not start the referee session.');
   setToken(result.token);initialState=await readDesk();signedIn=true;formDialog.close();
   if(!route())location.hash='ref';show();
  }catch(err){if(err.expired)setToken('');feedback.textContent=err.message;password.select()}finally{submit.disabled=false}
 };
 logout.onclick=async()=>{
  if(frame?.contentWindow?.boltzRefDirty?.() && !confirm('Discard unpublished changes and log out?'))return;
  try{const res=await api('api/logout',{method:'POST'});if(!res.ok)throw Error();disconnect();location.hash='matches'}
  catch{alert('Could not log out. Please try again.')}
 };
 window.addEventListener('hashchange',show);
 window.addEventListener('boltz-appearance',frameTheme);
 new MutationObserver(frameTheme).observe(document.body,{attributes:true,attributeFilter:['data-mode','data-palette','data-theme']});
 window.addEventListener('message',e=>{
  if(e.origin!==location.origin||e.source!==frame?.contentWindow)return;
  if(e.data?.type==='boltz-ref-height' && Number.isFinite(e.data.height))frame.style.height=Math.max(350,e.data.height+6)+'px';
 });
 show();
 if(token){
  const restoring=token;
  readDesk().then(data=>{
   if(token!==restoring||signedIn)return;
   initialState=data;signedIn=true;show();
   if(formDialog.open)formDialog.close();
  }).catch(err=>{if(err.expired&&token===restoring)setToken('')});
 }
})();
