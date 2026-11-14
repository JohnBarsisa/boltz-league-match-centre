const frames=[...document.querySelectorAll('article')];
const links=[...document.querySelectorAll('nav a')];
function show(){
 const i=Math.max(0,frames.findIndex(f=>f.id===location.hash.slice(1)));
 frames.forEach((f,k)=>{f.hidden=k!==i;links[k].setAttribute('aria-current',String(k===i))});
 const adjacent=step=>'#'+frames[(i+step+frames.length)%frames.length].id;
 document.querySelector('#prev').href=adjacent(-1);
 document.querySelector('#next').href=adjacent(1);
 document.title=frames[i].id+' FC · Seven Strikes';
}
addEventListener('hashchange',show);
addEventListener('keydown',e=>{
 if(e.altKey||e.ctrlKey||e.metaKey)return;
 if(e.key==='ArrowRight'||e.key==='ArrowLeft'){
  e.preventDefault();document.querySelector(e.key==='ArrowRight'?'#next':'#prev').click();
 }
});
show();
