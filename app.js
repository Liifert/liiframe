import {rooms} from './gallery-data.js';

const $=s=>document.querySelector(s);
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
document.documentElement.classList.add('js');
const revealObserver=new IntersectionObserver(entries=>{for(const entry of entries){if(entry.isIntersecting){entry.target.classList.add('is-visible');revealObserver.unobserve(entry.target);}}},{threshold:.12});
document.querySelectorAll('[data-reveal]').forEach(el=>revealObserver.observe(el));

const host=$('#gallery-rooms');
const stage=$('.gallery-stage');
let activeRoom=0;
let mobileIndex=0;
const mobileLayout=matchMedia('(max-width:700px)');
const frameAssets=new Set(['bc4e6.png','00f4c.png']);
const assetUrl=name=>new URL('./assets/'+name,import.meta.url).href;
const previewUrl=name=>name.endsWith('.png')?new URL('./assets/preview/'+name.replace(/\.png$/,'.webp'),import.meta.url).href:assetUrl(name);
const roomElements=rooms.map((room,roomIndex)=>{
  const el=document.createElement('div');el.className='gallery-room'+(roomIndex===0?' is-active':'');
  el.setAttribute('role','group');el.setAttribute('aria-roledescription','зал');el.setAttribute('aria-label',`${roomIndex+1} из ${rooms.length}: ${room.title}`);
  el.inert=roomIndex!==0;el.setAttribute('aria-hidden',String(roomIndex!==0));
  let artIndex=0;
  let frame=null;
  for(const item of room.images){const isFrame=frameAssets.has(item.asset);const node=document.createElement(isFrame?'img':'button');
    node.style.cssText=`left:${item.x/14.4}%;top:${item.y/13.26}%;width:${item.width/14.4}%;height:${item.height/13.26}%;`;
    node.dataset.nodeId=item.nodeId;
    if(isFrame){frame=item;node.className='art-frame';node.src=previewUrl(item.asset);node.alt='';node.setAttribute('aria-hidden','true');node.loading=roomIndex<2?'eager':'lazy';}
    else{const index=artIndex++;node.type='button';node.className='artwork';node.dataset.artIndex=index;node.setAttribute('aria-label',`${room.title} — работа ${index+1}. Открыть на весь экран`);node.setAttribute('aria-describedby','gallery-hint');
      const img=document.createElement('img');img.src=previewUrl(item.asset);img.alt=`${room.title} — работа ${index+1}`;img.loading=roomIndex<2?'eager':'lazy';img.decoding='async';node.append(img);
      if(frame){
        node.classList.add('has-mobile-frame');
        node.style.setProperty('--mobile-frame',`url("${previewUrl(frame.asset)}")`);
        node.style.setProperty('--frame-ratio',frame.width/frame.height);
        node.style.setProperty('--art-x',(item.x-frame.x)/frame.width*100+'%');
        node.style.setProperty('--art-y',(item.y-frame.y)/frame.height*100+'%');
        node.style.setProperty('--art-w',item.width/frame.width*100+'%');
        node.style.setProperty('--art-h',item.height/frame.height*100+'%');
      }
      const lens=document.createElement('span');lens.className='artwork-loupe';lens.setAttribute('aria-hidden','true');lens.innerHTML='<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="10" cy="10" r="6.5" stroke="currentColor" stroke-width="1.7"/><path d="m15 15 5.5 5.5M10 7v6M7 10h6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';node.append(lens);
      node.addEventListener('pointermove',event=>{const r=node.getBoundingClientRect();node.style.setProperty('--lens-x',(event.clientX-r.left)+'px');node.style.setProperty('--lens-y',(event.clientY-r.top)+'px');});node.addEventListener('click',()=>openViewer(roomIndex,index,node));}
    el.append(node);
  }host.append(el);return el;
});

function roomArts(index){return rooms[index].images.filter(item=>!frameAssets.has(item.asset));}
function showMobileArtwork(){
  const room=roomElements[activeRoom];
  room.querySelectorAll('.artwork').forEach(button=>{
    const selected=Number(button.dataset.artIndex)===mobileIndex;
    button.classList.toggle('is-mobile-current',selected);
    if(selected&&mobileLayout.matches)button.querySelector('img').loading='eager';
  });
  $('#mobile-art-count').textContent=mobileLayout.matches?`${mobileIndex+1} / ${roomArts(activeRoom).length}`:'';
}
function stepGallery(direction){
  if(!mobileLayout.matches){setRoom(activeRoom+direction);return;}
  const next=mobileIndex+direction;
  if(next>=0&&next<roomArts(activeRoom).length){mobileIndex=next;showMobileArtwork();return;}
  const room=(activeRoom+direction+rooms.length)%rooms.length;
  setRoom(room,direction<0?roomArts(room).length-1:0);
}
mobileLayout.addEventListener('change',showMobileArtwork);
showMobileArtwork();
function setRoom(index,artIndex=0){const next=(index+rooms.length)%rooms.length;if(next===activeRoom)return;
  const previous=roomElements[activeRoom];previous.classList.toggle('is-leaving-left',index>activeRoom);previous.classList.remove('is-active');previous.inert=true;previous.setAttribute('aria-hidden','true');
  activeRoom=next;const current=roomElements[next];current.classList.remove('is-leaving-left');current.classList.add('is-active');current.inert=false;current.setAttribute('aria-hidden','false');
  current.querySelectorAll('img').forEach(img=>{img.loading='eager';img.decode().catch(()=>{});});
  $('#room-index').textContent=`${String(next+1).padStart(2,'0')} / ${String(rooms.length).padStart(2,'0')}`;$('#room-name').textContent=rooms[next].title;
  mobileIndex=artIndex;
  showMobileArtwork();
  stage.style.setProperty('--gallery-shift',next%2?1:-1);
  const preloadRoom=(next+1)%rooms.length;roomElements[preloadRoom].querySelectorAll('img').forEach(img=>img.loading='eager');
}
$('.gallery-arrow.previous').addEventListener('click',()=>stepGallery(-1));$('.gallery-arrow.next').addEventListener('click',()=>stepGallery(1));
stage.addEventListener('keydown',event=>{if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();stepGallery(event.key==='ArrowRight'?1:-1);}});
let swipeStart=null;
stage.addEventListener('pointerdown',event=>{if(event.pointerType==='touch')swipeStart={x:event.clientX,y:event.clientY};});
stage.addEventListener('pointerup',event=>{if(!swipeStart)return;const dx=event.clientX-swipeStart.x,dy=event.clientY-swipeStart.y;swipeStart=null;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.35){stepGallery(dx<0?1:-1);}});
stage.addEventListener('pointercancel',()=>swipeStart=null);

const viewer=$('#artwork-viewer'),viewerImage=$('#viewer-image'),canvas=$('#viewer-canvas');
let viewedRoom=0,viewedIndex=0,zoom=1,pan={x:0,y:0},drag=null,lastFocus=null,viewSwipe=null,viewerRequest=0,sourceArtwork=null,viewerClosing=false;
function updateZoom(){zoom=Math.max(1,Math.min(4,zoom));canvas.style.setProperty('--zoom',zoom);canvas.style.setProperty('--pan-x',pan.x+'px');canvas.style.setProperty('--pan-y',pan.y+'px');canvas.classList.toggle('is-zoomed',zoom>1);$('#zoom-reset').textContent=Math.round(zoom*100)+'%';$('#zoom-out').disabled=zoom===1;$('#zoom-in').disabled=zoom===4;}
function resetZoom(){zoom=1;pan={x:0,y:0};updateZoom();}
function showArtwork(index){const arts=roomArts(viewedRoom);viewedIndex=(index+arts.length)%arts.length;resetZoom();viewerImage.classList.add('is-loading');$('#viewer-error').hidden=true;
  const original=assetUrl(arts[viewedIndex].asset),request=++viewerRequest;
  viewerImage.src=previewUrl(arts[viewedIndex].asset);viewerImage.dataset.quality='preview';viewerImage.alt=`${rooms[viewedRoom].title} — работа ${viewedIndex+1}`;
  $('#viewer-title').textContent=rooms[viewedRoom].title;$('#viewer-counter').textContent=`${viewedIndex+1} / ${arts.length}`;
  $('#viewer-download').href=original;$('#viewer-download').download=`liiframe-${rooms[viewedRoom].slug}-${viewedIndex+1}.png`;
  $('#viewer-prev').hidden=arts.length<2;$('#viewer-next').hidden=arts.length<2;
  const highResolution=new Image();highResolution.onload=async()=>{await highResolution.decode().catch(()=>{});if(request!==viewerRequest)return;viewerImage.src=original;viewerImage.dataset.quality='original';$('#viewer-counter').textContent=`${viewedIndex+1} / ${arts.length} · ${highResolution.naturalWidth} × ${highResolution.naturalHeight}`;};highResolution.src=original;
  if(arts.length>1){const preload=new Image();preload.src=previewUrl(arts[(viewedIndex+1)%arts.length].asset);}
}
function fittedImageRect(width,height){const box=canvas.getBoundingClientRect(),scale=Math.min(box.width/width,box.height/height);return {left:box.left+(box.width-width*scale)/2,top:box.top+(box.height-height*scale)/2,width:width*scale,height:height*scale};}
async function animateFromArtwork(button,opening=true){if(reducedMotion||!button?.isConnected)return;const thumb=button.querySelector('img'),small=button.getBoundingClientRect(),large=fittedImageRect(thumb.naturalWidth||small.width,thumb.naturalHeight||small.height),ghost=document.createElement('img');ghost.className='viewer-zoom-ghost';ghost.src=opening?thumb.src:viewerImage.src;ghost.alt='';ghost.style.cssText=`position:fixed;left:0;top:0;width:${large.width}px;height:${large.height}px;transform-origin:0 0;object-fit:contain;pointer-events:none;z-index:10;`;
 const a={transform:`translate(${small.left}px,${small.top}px) scale(${small.width/large.width},${small.height/large.height})`,opacity:1},b={transform:`translate(${large.left}px,${large.top}px) scale(1,1)`,opacity:1};viewer.append(ghost);viewerImage.style.visibility='hidden';try{await ghost.animate(opening?[a,b]:[b,a],{duration:opening?650:380,easing:'cubic-bezier(.22,1,.36,1)',fill:'both'}).finished;}catch{}finally{ghost.remove();viewerImage.style.visibility='';}}
function openViewer(room,index,button){lastFocus=document.activeElement;sourceArtwork=button;viewedRoom=room;showArtwork(index);viewer.showModal();document.body.classList.add('viewer-open');viewerClosing=false;animateFromArtwork(button);$('.viewer-toolbar').animate([{opacity:0},{opacity:1}],{duration:350,delay:reducedMotion?0:220,fill:'both'});$('#viewer-close').focus();}
async function closeViewer(){if(viewerClosing)return;viewerClosing=true;if(document.fullscreenElement===viewer)await document.exitFullscreen().catch(()=>{});if(zoom===1)await animateFromArtwork(sourceArtwork,false);viewer.close();viewerClosing=false;}
viewer.addEventListener('close',()=>{document.body.classList.remove('viewer-open');resetZoom();lastFocus?.focus({preventScroll:true});});
viewer.addEventListener('cancel',event=>{event.preventDefault();closeViewer();});
viewerImage.addEventListener('load',()=>viewerImage.classList.remove('is-loading'));
viewerImage.addEventListener('error',()=>{$('#viewer-error').hidden=false;viewerImage.classList.remove('is-loading');});
$('#viewer-close').addEventListener('click',closeViewer);$('#viewer-prev').addEventListener('click',()=>showArtwork(viewedIndex-1));$('#viewer-next').addEventListener('click',()=>showArtwork(viewedIndex+1));
$('#zoom-in').addEventListener('click',()=>{zoom+=.5;updateZoom();});$('#zoom-out').addEventListener('click',()=>{zoom-=.5;if(zoom<=1)pan={x:0,y:0};updateZoom();});$('#zoom-reset').addEventListener('click',resetZoom);
$('#viewer-fullscreen').hidden=!viewer.requestFullscreen;$('#viewer-fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await viewer.requestFullscreen();}catch{}});
viewer.addEventListener('keydown',event=>{if(event.key==='ArrowRight'){event.preventDefault();showArtwork(viewedIndex+1);}if(event.key==='ArrowLeft'){event.preventDefault();showArtwork(viewedIndex-1);}if(event.key==='+'||event.key==='='){event.preventDefault();zoom+=.5;updateZoom();}if(event.key==='-'){event.preventDefault();zoom-=.5;if(zoom<=1)pan={x:0,y:0};updateZoom();}if(event.key==='0'){event.preventDefault();resetZoom();}});
canvas.addEventListener('dblclick',event=>{event.preventDefault();if(zoom>1)resetZoom();else{zoom=2;updateZoom();}});
canvas.addEventListener('pointerdown',event=>{if(zoom>1){drag={x:event.clientX-pan.x,y:event.clientY-pan.y};canvas.setPointerCapture(event.pointerId);canvas.classList.add('is-dragging');}else if(event.pointerType==='touch')viewSwipe={x:event.clientX,y:event.clientY};});
canvas.addEventListener('pointermove',event=>{if(!drag)return;const limitX=canvas.clientWidth*(zoom-1)/2,limitY=canvas.clientHeight*(zoom-1)/2;pan={x:Math.max(-limitX,Math.min(limitX,event.clientX-drag.x)),y:Math.max(-limitY,Math.min(limitY,event.clientY-drag.y))};updateZoom();});
canvas.addEventListener('pointerup',event=>{drag=null;canvas.classList.remove('is-dragging');if(viewSwipe){const dx=event.clientX-viewSwipe.x,dy=event.clientY-viewSwipe.y;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.35)showArtwork(viewedIndex+(dx<0?1:-1));viewSwipe=null;}});
canvas.addEventListener('pointercancel',()=>{drag=null;viewSwipe=null;canvas.classList.remove('is-dragging');});

if(!reducedMotion&&matchMedia('(hover:hover)').matches){const hero=$('.hero');let pointerFrame=0;hero.addEventListener('pointermove',event=>{if(pointerFrame)return;pointerFrame=requestAnimationFrame(()=>{const rect=hero.getBoundingClientRect();hero.style.setProperty('--pointer-x',((event.clientX-rect.left)/rect.width-.5)*2);hero.style.setProperty('--pointer-y',((event.clientY-rect.top)/rect.height-.5)*2);pointerFrame=0;});});hero.addEventListener('pointerleave',()=>{hero.style.setProperty('--pointer-x',0);hero.style.setProperty('--pointer-y',0);});}
const sectionObserver=new IntersectionObserver(entries=>{for(const e of entries)if(e.isIntersecting)document.querySelectorAll('.navigation a').forEach(a=>{if(a.hash==='#'+e.target.id)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');});},{rootMargin:'-10% 0px -65% 0px'});['artist','exhibition','contact'].forEach(id=>sectionObserver.observe(document.getElementById(id)));

// The perforated ticket stubs separate as the visitor scrolls past each card.
const tickets=[...document.querySelectorAll('.ticket')];
const ticketStack=$('.tickets');
const ticketTrack=document.createElement('div');
ticketTrack.className='ticket-track';
ticketStack.before(ticketTrack);
ticketTrack.append(ticketStack);
const motionPreference=matchMedia('(prefers-reduced-motion: reduce)');

for(const ticket of tickets){
  const upper=document.createElement('div');
  upper.className='ticket-upper';
  for(const child of [...ticket.children]){
    if(!child.classList.contains('ticket-stub'))upper.append(child);
  }
  ticket.prepend(upper);
}

const clamp01=value=>Math.max(0,Math.min(1,value));
function updateTicketSequence(){
  const enabled=mobileLayout.matches&&!motionPreference.matches;
  ticketTrack.classList.toggle('is-scroll-sequence',enabled);
  if(!enabled){
    for(const ticket of tickets)ticket.removeAttribute('aria-hidden');
    return;
  }
  const stickyTop=parseFloat(getComputedStyle(ticketStack).top);
  const distance=ticketTrack.offsetHeight-ticketStack.offsetHeight;
  const position=clamp01((stickyTop-ticketTrack.getBoundingClientRect().top)/Math.max(1,distance))*tickets.length;
  const index=Math.min(tickets.length-1,Math.floor(position));
  const phase=position-index;
  const split=index<tickets.length-1?clamp01((phase-.30)/.62):0;
  const next=clamp01((split-.10)/.74);

  tickets.forEach((ticket,i)=>{
    const current=i===index;
    const entering=i===index+1&&next>0;
    ticket.classList.toggle('is-current-ticket',current);
    ticket.classList.toggle('is-entering-ticket',entering);
    ticket.setAttribute('aria-hidden',String(next>=.5?!entering:!current));
    if(current){
      ticket.style.setProperty('--upper-y',(-150*split)+'%');
      ticket.style.setProperty('--stub-y',(460*split)+'%');
      ticket.style.setProperty('--part-opacity',1-clamp01((split-.62)/.36));
    }else if(entering){
      ticket.style.setProperty('--upper-y','0%');
      ticket.style.setProperty('--stub-y','0%');
      ticket.style.setProperty('--part-opacity',next);
      ticket.style.setProperty('--arrive-scale',.95+.05*next);
    }
  });
}
mobileLayout.addEventListener('change',queueTicketTears);
motionPreference.addEventListener('change',queueTicketTears);

const audience=$('.gallery-visitors');
const flashes=document.createElement('div');
flashes.className='gallery-flashes';
flashes.setAttribute('aria-hidden','true');
audience.after(flashes);
const audienceObserver=new IntersectionObserver(entries=>{
  if(!entries.some(entry=>entry.isIntersecting))return;
  stage.classList.add('audience-arrived');
  audienceObserver.disconnect();
},{rootMargin:'0px 0px -12% 0px'});
audienceObserver.observe(audience);
let scrollFrame=0;
function updateTicketTears(){scrollFrame=0;updateTicketSequence();if(ticketTrack.classList.contains('is-scroll-sequence'))return;for(const ticket of tickets){const rect=ticket.getBoundingClientRect(),stubTop=rect.top+ticket.clientWidth*586/410;const progress=Math.max(0,Math.min(1,(innerHeight*.92-stubTop)/(innerHeight*.52)));ticket.style.setProperty('--tear',progress.toFixed(4));ticket.classList.toggle('is-torn',progress>.08);}}
function queueTicketTears(){if(!scrollFrame)scrollFrame=requestAnimationFrame(updateTicketTears);}
addEventListener('scroll',queueTicketTears,{passive:true});addEventListener('resize',queueTicketTears);updateTicketTears();
document.fonts.ready.then(()=>{updateTicketTears();const title=$('.hero-title'),portrait=$('.hero-portrait');if(reducedMotion){title.animate([{opacity:.15},{opacity:1}],{duration:450});return;}title.animate([{opacity:0,translate:'0 24px'},{opacity:1,translate:'0 0'}],{duration:1100,easing:'cubic-bezier(.22,1,.36,1)',fill:'both'});portrait.animate([{opacity:0,translate:'0 45px'},{opacity:1,translate:'0 0'}],{duration:1500,delay:100,easing:'cubic-bezier(.22,1,.36,1)',fill:'both'});});

// A failed local request can recover when the preview server comes back online.
document.querySelectorAll('img').forEach(img=>img.addEventListener('error',()=>{if(img.dataset.retried)return;img.dataset.retried='1';const url=new URL(img.src);url.searchParams.set('retry','1');setTimeout(()=>{img.src=url.href;},800);},{once:true}));
