/* eslint-disable */
/**
 * Dead Reckoning's sea: the chart you sail across, island to island, and the side-on view
 * ashore where each question is asked. Ported from the approved design mock with as few
 * changes as possible, so the drawing code stays easy to compare against it. Plain
 * JavaScript; the typed surface is in isles.d.ts.
 */
export function createIsles(canvas, root, els, seed, hooks = {}) {
const cv = canvas, ctx = canvas.getContext("2d");
const opt = { wipe: "fade" };
const timers = [];
let raf = 0, FD = "Georgia,serif";
const css = (k) => getComputedStyle(root).getPropertyValue(k.replace(/^--t/, "--dr-t")).trim();
const seedNum = (() => { let h = 2166136261; for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); } return h | 0; })();
function rng(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const SR=rng(seedNum);
const hash=(a,b)=>{let h=Math.imul((a|0)*374761393+(b|0)*668265263,1274126177);h^=h>>>13;h=Math.imul(h,1103515245);return((h^h>>>16)>>>0)/4294967296};
/* ---------- state ---------- */
let S;
function fresh(){S={leg:-1,phase:'intro',guesses:[],results:[],dist:0,node:0,done:0,u:0,ang:0,sail:null,flags:{},seen:new Set([0]),
  sh:0,T:0,total:0,row:null,cam:{x:0,y:200,z:1.5,ay:.3},camT:{x:0,y:200,z:1.5,ay:.3}}}
fresh();

/* ---------- the archipelago: a ring of islands, one per question, and home again ---------- */
/* a pool of islands; each voyage draws seven of them at random (the real game would seed this by date) */
const HOME={n:'home port',k:'port',r:58};
const POOL=[{n:'lantern rock',k:'light',r:30},{n:'palm cove',k:'cove',r:46},{n:"fisher's rest",k:'fisher',r:46},{n:'the high peak',k:'peak',r:56},
 {n:'wreck bay',k:'wreck',r:40},{n:'smoke isle',k:'volcano',r:50},{n:'the old fort',k:'fort',r:46},{n:'treasure isle',k:'treasure',r:44},{n:'whalebone isle',k:'bones',r:44},
 {n:'orchard isle',k:'orchard',r:50},{n:'windmill key',k:'mill',r:44},{n:'gull cay',k:'cay',r:30},{n:'the old temple',k:'temple',r:46}];
let ISLES=[];
/* treasure isle is kept for the treasure round: if the shuffle deals it, the next island takes its place */
function pickIsles(){const p=[...POOL];for(let i=p.length-1;i>0;i--){const j=Math.floor(SR()*(i+1));[p[i],p[j]]=[p[j],p[i]]}
  const t=p.findIndex(q=>q.k==='treasure');if(t<7)[p[t],p[7]]=[p[7],p[t]];ISLES=[HOME,...p.slice(0,7),p.find(q=>q.k==='treasure')]}
pickIsles();
const LAYOUTS={
 sea:{name:'open sea',bend:1,gen:()=>{const pts=[[0,0]];let h=-.5+SR()*.3;for(let i=1;i<9;i++){h+=(i%2?1:-1)*(.6+SR()*.5);const L=420+SR()*110,[x,y]=pts[i-1];pts.push([x+Math.cos(h)*L,y+Math.sin(h)*L])}return pts}}
};
let LAY=LAYOUTS.sea,ISL=[];const TREASURE=8;
function buildLayout(){
  if(LAY.gen)LAY.pts=LAY.gen();const pts=LAY.pts,N=pts.length;LAY.ctr=[0,1].map(k=>pts.reduce((a,p)=>a+p[k],0)/N);
  ISL=pts.map((c,i)=>{const s=ISLES[i];
    // the jetty faces the way the route comes and goes
    let tx=0,ty=0;[i-1,i+1].forEach(k=>{if(k<0||k>=N)return;tx+=pts[k][0]-c[0];ty+=pts[k][1]-c[1]});const L=Math.hypot(tx,ty)||1,to=[tx/L,ty/L],off=s.r*1.35+20;
    return{...s,c,to,a:Math.atan2(to[1],to[0]),d:[c[0]+to[0]*off,c[1]+to[1]*off]}});
  /* the treasure island stays off the chart until it is earned (dup hides an island everywhere) */
  ISL[TREASURE].dup=true;
}
buildLayout();
const nextOf=i=>Math.min(i+1,ISL.length-1);
/* every crossing is a smooth arc; a poor reckoning puts weather on the direct line and you bend round it */
/* every crossing is a straight line. how close you reckoned decides where you stop:
   right at the dock, anchored just offshore, or out in open water with a rowboat to paddle in */
const OFF=[0,45,85,135,185,225,260,280],WIND=[1,.85,.65,.45,.3,.2,.1,0];
const LANDTXT=['right up to the dock','alongside the dock','anchored just offshore','anchored offshore','anchored well out · rowing in','out in open water · rowing in','aground on the reef · rowing in','drifted in at last · rowing in'];
const WINDTXT=['full sails','a fair wind','a steady breeze','a light breeze','barely a breath','limp sails','a broken mast','not a breath of wind'];
function startOf(j){return j===0?ISL[0].d:anchorOf(j-1)}
function anchorOf(j){const A=startOf(j),D=ISL[nextOf(j)].d,r=S.results[j];if(!r)return D;const v=[D[0]-A[0],D[1]-A[1]],L=Math.hypot(v[0],v[1])||1,o=Math.min(OFF[r.i],L*.6);return[D[0]-v[0]/L*o,D[1]-v[1]/L*o]}
/* a wrong answer makes you tack: a few smooth, shallow swings either side of the straight line */
const TACK=[[0,0],[0,0],[2,10],[2,16],[3,20],[3,24],[4,26],[4,24]];
function segPt(j,u){const A=startOf(j),B=anchorOf(j),v=[B[0]-A[0],B[1]-A[1]],L=Math.hypot(v[0],v[1])||1,r=S.results[j],[n,amp]=r?TACK[r.i]:[0,0];let off=0;
  if(n>1)off=amp*Math.sin(Math.PI*n*u)
  return[A[0]+v[0]*u-v[1]/L*off,A[1]+v[1]*u+v[0]/L*off]}
function segAng(j,u){const a=segPt(j,Math.max(0,u-.01)),b=segPt(j,Math.min(1,u+.01));return Math.atan2(b[0]-a[0],-(b[1]-a[1]))}
const boatPos=()=>S.sail?segPt(S.sail.j,S.u):S.done?anchorOf(S.done-1):ISL[0].d;
/* the score: days at sea */
/* days per tier come from the game's scoring, so the two can't drift apart */
const DAYS=hooks.days||[1,2,2.5,3,3.5,4,4.5,5],BECALMED=DAYS.length-1;
const num=d=>{const w=Math.floor(d),h=d-w>=.5;return (w||!h?String(w):'')+(h?'½':'')};
const dayStr=d=>num(d)+(d===1?' day':' days');
/* ---------- palettes ---------- */
const PAL={
 dark:{sea0:'#0F3644',deep:'0,0,0',wave:'#4F8597',grid:'rgba(228,237,241,.06)',parch:'#060D12',hatch:'rgba(147,169,181,.10)',fog:'9,21,28',ink:'#E4EDF1',ink2:'#93A9B5'},
 light:{sea0:'#86CCD0',deep:'20,70,100',wave:'#FFFFFF',grid:'rgba(16,40,58,.09)',parch:'#ECE2C6',hatch:'rgba(120,92,40,.13)',fog:'236,226,198',ink:'#10283A',ink2:'#46606F'}
};
let theme='dark',P=PAL.dark,hatchPat=null;
function readTheme(){theme=document.documentElement.getAttribute('data-theme')==='dark'?'dark':'light';P=PAL[theme];FD=getComputedStyle(root).getPropertyValue('--dr-display').trim()||'Georgia,serif';
  const h=document.createElement('canvas');h.width=h.height=9;const g=h.getContext('2d');g.strokeStyle=P.hatch;g.lineWidth=1;g.beginPath();g.moveTo(0,9);g.lineTo(9,0);g.stroke();hatchPat=fctx.createPattern(h,'repeat')}

/* ---------- camera ---------- */
let W=0,H=0,DPR=1;
const fcv=document.createElement('canvas'),fctx=fcv.getContext('2d');
function resize(){DPR=Math.min(2,devicePixelRatio||1);const rc=cv.getBoundingClientRect();W=rc.width;H=rc.height;cv.width=fcv.width=W*DPR;cv.height=fcv.height=H*DPR;if(S.phase==='end')fitEnd()}
function worldT(){const c=S.cam;ctx.setTransform(DPR*c.z,0,0,DPR*c.z,DPR*(W/2-c.x*c.z),DPR*(c.ay*H-c.y*c.z))}
function toScreen(x,y){const c=S.cam;return{x:W/2+(x-c.x)*c.z,y:c.ay*H+(y-c.y)*c.z}}
function bounds(){const c=S.cam;return{x0:c.x-W/2/c.z,x1:c.x+W/2/c.z,y0:c.y-c.ay*H/c.z,y1:c.y+(1-c.ay)*H/c.z}}
const onScreen=(x,y,m)=>{const b=bounds();return x>b.x0-m&&x<b.x1+m&&y>b.y0-m&&y<b.y1+m};
function follow(){
  const ph=W<560;
  if(S.sail){const p=segPt(S.sail.j,S.u),B=ISL[nextOf(S.sail.j)].c;S.camT={x:p[0]+(B[0]-p[0])*.3,y:p[1]+(B[1]-p[1])*.3,z:ph?.7:1,ay:.36};return}
  // the voyage opens on the chart: home port, the ship at its jetty, the sea ahead
  if(S.phase==='intro'){const a=ISL[0].c,b=ISL[1].c;S.camT={x:a[0]+(b[0]-a[0])*.4,y:a[1]+(b[1]-a[1])*.4,z:ph?.8:1.05,ay:ph?.3:.34};return}
  // the treasure island has just appeared: pull back to show it beside the last island
  if(S.phase==='treasure'){const a=ISL[TREASURE-1].c,b=ISL[TREASURE].c,d=Math.hypot(b[0]-a[0],b[1]-a[1]);S.camT={x:(a[0]+b[0])/2,y:(a[1]+b[1])/2,z:ph?Math.min(.62,(W-170)/d):.9,ay:ph?.3:.34};return}
  // just arrived: hold on the chart a moment before stepping ashore
  if(S.phase==='landed'){const s=ISL[S.node];S.camT={x:s.c[0]*.7+s.d[0]*.3,y:s.c[1]*.7+s.d[1]*.3,z:ph?.85:1.15,ay:.36};return}
  // docked: close in on the island, the boat at its jetty
  const s=ISL[S.node];S.camT={x:s.c[0]*.55+s.d[0]*.45,y:s.c[1]*.55+s.d[1]*.45,z:(ph?1.45:1.8)*(1+S.sh*.8),ay:S.phase==='intro'?.32:ph?.2:.25}}
function fitEnd(){let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;const add=(x,y,r)=>{x0=Math.min(x0,x-r);x1=Math.max(x1,x+r);y0=Math.min(y0,y-r);y1=Math.max(y1,y+r)};
  ISL.forEach(s=>{if(!s.dup)add(s.c[0],s.c[1],s.r*1.5+10)});for(let j=0;j<S.done;j++)for(let u=0;u<=1;u+=.05){const p=segPt(j,u);add(p[0],p[1],14)}
  const top=104,bot=H*(W<560?.44:.48),pad=W<560?130:30,z=Math.min((W-pad)/(x1-x0),(bot-top)/(y1-y0),1);S.camT={x:(x0+x1)/2,y:(y0+y1)/2,z,ay:(top+bot)/2/H}}

/* ---------- the sea ---------- */
function drawSea(t){
  ctx.setTransform(DPR,0,0,DPR,0,0);ctx.fillStyle=P.sea0;ctx.fillRect(0,0,W,H);
  worldT();const b=bounds(),z=S.cam.z,cs=420;
  for(let j=Math.floor(b.y0/cs)-1;j<=Math.ceil(b.y1/cs);j++)for(let i=Math.floor(b.x0/cs)-1;i<=Math.ceil(b.x1/cs);i++){const x=(i+hash(i,j))*cs,y=(j+hash(j,i+9))*cs,r=cs*(.5+hash(i+3,j)*.6);
    const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,`rgba(${P.deep},${theme==='dark'?.22:.13})`);g.addColorStop(1,`rgba(${P.deep},0)`);ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2)}
  ctx.strokeStyle=P.grid;ctx.lineWidth=1/z;ctx.beginPath();const gs=220;
  for(let x=Math.floor(b.x0/gs)*gs;x<=b.x1;x+=gs){ctx.moveTo(x,b.y0);ctx.lineTo(x,b.y1)}for(let y=Math.floor(b.y0/gs)*gs;y<=b.y1;y+=gs){ctx.moveTo(b.x0,y);ctx.lineTo(b.x1,y)}ctx.stroke();
  if(z>.45){const ws=44;ctx.strokeStyle=P.wave;ctx.globalAlpha=theme==='dark'?.45:.5;ctx.lineWidth=1.1/z;ctx.lineCap='round';ctx.beginPath();
    for(let j=Math.floor(b.y0/ws)-1;j<=Math.ceil(b.y1/ws);j++)for(let i=Math.floor(b.x0/ws)-1;i<=Math.ceil(b.x1/ws);i++){const h=hash(i+500,j+500);if(h<.5)continue;
      const x=i*ws+hash(j+500,i+500)*ws,y=j*ws+hash(i+507,j+500)*ws,len=4+h*7,ph=Math.sin(t/900+h*20)*2;ctx.moveTo(x-len,y);ctx.quadraticCurveTo(x,y+ph,x+len,y)}
    ctx.stroke();ctx.globalAlpha=1}
}

function blobPath(cx,cy,r,seed,n=14,sx=1.3,sy=.85){const rr=rng(seed),pts=[];for(let i=0;i<n;i++){const a=i/n*6.283,k=r*(.72+rr()*.45);pts.push([cx+Math.cos(a)*k*sx,cy+Math.sin(a)*k*sy])}
  ctx.beginPath();pts.forEach(([x,y],i)=>{const [px,py]=pts[(i+n-1)%n];i?ctx.quadraticCurveTo(px,py,(px+x)/2,(py+y)/2):ctx.moveTo((px+x)/2,(py+y)/2)});ctx.closePath()}
function hullPath(){ctx.beginPath();ctx.moveTo(0,-26);ctx.bezierCurveTo(9.5,-16,10.5,6,7,18);ctx.quadraticCurveTo(0,22.5,-7,18);ctx.bezierCurveTo(-10.5,6,-9.5,-16,0,-26);ctx.closePath()}
function rrect(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath()}
function island(cx,cy,r,seed,t,palms,veg=true,sx=1.3,sy=.85){
  const dk=theme==='dark';
  const g=ctx.createRadialGradient(cx,cy,r*.7,cx,cy,r*2.6);g.addColorStop(0,dk?'rgba(70,170,160,.34)':'rgba(170,240,226,.85)');g.addColorStop(1,dk?'rgba(70,170,160,0)':'rgba(170,240,226,0)');
  ctx.fillStyle=g;ctx.fillRect(cx-r*2.7,cy-r*2.7,r*5.4,r*5.4);
  ctx.save();ctx.strokeStyle=dk?'rgba(220,245,240,.4)':'rgba(255,255,255,.95)';ctx.lineWidth=1.2;
  for(let k=1;k<=2;k++){ctx.globalAlpha=k===1?.9:.45;blobPath(cx,cy,r+k*5+Math.sin(t/650+k)*1.6,seed,14,sx,sy);ctx.stroke()}ctx.restore();
  ctx.save();ctx.translate(2,3);blobPath(cx,cy,r,seed,14,sx,sy);ctx.fillStyle='rgba(0,0,0,.12)';ctx.fill();ctx.restore();
  blobPath(cx,cy,r,seed,14,sx,sy);ctx.fillStyle=dk?'#6B6146':'#EEDFAA';ctx.fill();ctx.strokeStyle=dk?'#8C805C':'#C9B47A';ctx.lineWidth=1;ctx.stroke();
  if(veg){blobPath(cx+r*.06,cy-r*.08,r*.72,seed+1,14,sx,sy);const vg=ctx.createLinearGradient(cx-r,cy-r,cx+r,cy+r);
    vg.addColorStop(0,dk?'#2E5A3C':'#8CC074');vg.addColorStop(1,dk?'#17311F':'#5E9452');ctx.fillStyle=vg;ctx.fill();
    const rr=rng(seed+9);ctx.fillStyle=dk?'rgba(10,25,15,.45)':'rgba(40,90,40,.35)';for(let i=0;i<r*.9;i++){const a=rr()*6.28,d=rr()*r*.6;ctx.beginPath();ctx.arc(cx+Math.cos(a)*d*sx*.9,cy-r*.08+Math.sin(a)*d*sy*.8,1+rr()*1.6,0,7);ctx.fill()}}
  if(palms){const rr=rng(seed+3);for(let i=0;i<palms;i++)palm(cx+(rr()-.5)*r*sx,cy+(rr()-.5)*r*.6*sy/.85,7+rr()*3,t+i*400,rr()*6)}
}
function palm(x,y,s,t,rot){const dk=theme==='dark';ctx.save();ctx.translate(x+2,y+3);ctx.fillStyle='rgba(0,0,0,.18)';ctx.beginPath();ctx.arc(0,0,s*.9,0,7);ctx.fill();ctx.restore();
  ctx.save();ctx.translate(x,y);ctx.rotate(rot+Math.sin(t/1400)*.06);for(let k=0;k<7;k++){ctx.rotate(6.283/7);ctx.beginPath();ctx.moveTo(0,0);ctx.quadraticCurveTo(s*.45,-s*.35,s,-s*.08);ctx.quadraticCurveTo(s*.45,s*.12,0,0);
    ctx.fillStyle=k%2?(dk?'#3B7A4E':'#4F9A55'):(dk?'#2C6340':'#3E8547');ctx.fill()}
  ctx.fillStyle=dk?'#5A4630':'#8A6A44';ctx.beginPath();ctx.arc(0,0,1.6,0,7);ctx.fill();ctx.restore()}
function rock(x,y,r,seed,t){const dk=theme==='dark';
  ctx.strokeStyle=dk?'rgba(210,250,240,.45)':'rgba(255,255,255,.95)';ctx.lineWidth=1;ctx.beginPath();ctx.arc(x,y,r*1.4+3+Math.sin(t/480+seed)*1.8,0,7);ctx.stroke();
  ctx.save();ctx.translate(2,3);blobPath(x,y,r,seed,8,1.1,.9);ctx.fillStyle='rgba(0,0,0,.2)';ctx.fill();ctx.restore();
  blobPath(x,y,r,seed,8,1.1,.9);ctx.fillStyle=dk?'#2A3533':'#6F726A';ctx.fill();
  blobPath(x-r*.25,y-r*.25,r*.55,seed+1,7,1.1,.9);ctx.fillStyle=dk?'#45524E':'#9EA197';ctx.fill()}
function moored(x,y,a,c){ctx.save();ctx.translate(x,y);ctx.rotate(a);ctx.scale(.42,.42);hullPath();ctx.fillStyle=c;ctx.fill();ctx.strokeStyle='rgba(0,0,0,.4)';ctx.lineWidth=2;ctx.stroke();
  ctx.save();ctx.scale(.8,.86);hullPath();ctx.fillStyle=theme==='dark'?'#8B6A44':'#C8A372';ctx.fill();ctx.restore();ctx.fillStyle='#3A2A1C';ctx.beginPath();ctx.arc(0,-6,2.5,0,7);ctx.fill();ctx.restore()}
function gull(x,y,f){ctx.globalAlpha=.22;ctx.fillStyle='#000';ctx.beginPath();ctx.ellipse(x+6,y+10,5,1.5,0,0,7);ctx.fill();ctx.globalAlpha=.95;ctx.strokeStyle=theme==='dark'?'#E8F0F4':'#FFFFFF';ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(x-9,y+f);ctx.quadraticCurveTo(x-4,y-3,x,y);ctx.quadraticCurveTo(x+4,y-3,x+9,y+f);ctx.stroke();ctx.globalAlpha=1}



/* ---------- the islands, one for each kind of question ---------- */
const dkc=(d,l)=>theme==='dark'?d:l;
// a jetty from the shore out toward the boat
function jetty(x,y,r,a,keys){ctx.save();ctx.translate(x,y);ctx.rotate(a);const x0=r*.8,len=r*.55+14,w=keys?12:8;
  ctx.fillStyle='rgba(0,0,0,.22)';ctx.fillRect(x0+2,-w/2+3,len,w);
  if(keys){ctx.fillStyle='#F7F3EA';ctx.fillRect(x0,-w/2,len,w);ctx.strokeStyle='#333';ctx.lineWidth=.6;for(let k=0;k<=len;k+=5){ctx.beginPath();ctx.moveTo(x0+k,-w/2);ctx.lineTo(x0+k,w/2);ctx.stroke()}
    ctx.fillStyle='#1C1C1C';for(let k=0,n=0;k<len-4;k+=5,n++){if(n%7===2||n%7===6)continue;ctx.fillRect(x0+k+3,-w/2,3,w*.58)}}
  else{ctx.fillStyle=dkc('#5A4A36','#9C7A52');ctx.fillRect(x0,-w/2,len,w);ctx.strokeStyle='rgba(0,0,0,.3)';ctx.lineWidth=.6;for(let k=0;k<len;k+=4){ctx.beginPath();ctx.moveTo(x0+k,-w/2);ctx.lineTo(x0+k,w/2);ctx.stroke()}}
  ctx.restore()}
const LAND={
 mill(x,y,r,t,a){const dk=theme==='dark';island(x,y,r,31,t,0,true);jetty(x,y,r,a);
   ctx.save();blobPath(x+r*.06,y-r*.08,r*.6,32);ctx.clip();const cols=dk?['#5C5A2C','#3E5A30','#6A5A34']:['#E6C860','#A8C872','#D9A84E'];for(let k=0;k<9;k++){ctx.fillStyle=cols[k%3];ctx.save();ctx.translate(x,y);ctx.rotate(.5);ctx.fillRect(-r*1.5+k*r*.34,-r*1.5,r*.32,r*3);ctx.restore()}ctx.restore();
   [[x-r*.45,y-r*.15,0],[x+r*.5,y+r*.05,1.4]].forEach(([mx,my,p])=>{ctx.fillStyle=dk?'#CFC6B2':'#F4EFE3';ctx.beginPath();ctx.arc(mx,my,6,0,7);ctx.fill();ctx.save();ctx.translate(mx,my);ctx.rotate(t/700+p);for(let k=0;k<4;k++){ctx.rotate(Math.PI/2);ctx.fillStyle=dk?'#B8AE96':'#FBF8F0';ctx.fillRect(-2,-19,4,16)}ctx.restore()})},
 cay(x,y,r,t,a){island(x,y,r,21,t,2,false,2,.5);jetty(x,y,r,a);for(let i=0;i<4;i++){const q=t/2600+i*1.6,gx=x+Math.cos(q)*r*2,gy=y-r*.4+Math.sin(q)*r;gull(gx,gy,Math.sin(t/160+i)*3.5)}},
 temple(x,y,r,t,a){const dk=theme==='dark';island(x,y,r,401,t,1,true);jetty(x,y,r,a);ctx.fillStyle='rgba(0,0,0,.25)';ctx.fillRect(x-r*.38+2,y-r*.3+3,r*.76,r*.5);ctx.fillStyle=dk?'#8C8478':'#E8DFC8';ctx.fillRect(x-r*.38,y-r*.3,r*.76,r*.5);
   ctx.fillStyle=dk?'#5E584E':'#B8AA88';for(let k=0;k<5;k++)for(const yy of[-.3,.14]){ctx.beginPath();ctx.arc(x-r*.3+k*r*.15,y+yy*r+2,2.6,0,7);ctx.fill()}},
 light(x,y,r,t,a){jetty(x,y,r,a);const dk=theme==='dark',sw=t/1400;island(x,y,r,11,t,0,false);rock(x-r*1.3,y+r*.6,6,5,t);rock(x+r*1.2,y-r*.4,5,6,t);
   for(const off of[0,Math.PI]){const R=320,b=ctx.createRadialGradient(x,y,0,x,y,R);b.addColorStop(0,dk?'rgba(255,236,170,.34)':'rgba(255,255,255,.7)');b.addColorStop(1,'rgba(255,236,170,0)');
     ctx.save();if(dk)ctx.globalCompositeOperation='lighter';ctx.fillStyle=b;ctx.beginPath();ctx.moveTo(x,y);ctx.arc(x,y,R,sw+off-.12,sw+off+.12);ctx.closePath();ctx.fill();ctx.restore()}
   ctx.fillStyle='rgba(0,0,0,.25)';ctx.beginPath();ctx.arc(x+3,y+4,9,0,7);ctx.fill();ctx.fillStyle='#F4F0E6';ctx.beginPath();ctx.arc(x,y,9,0,7);ctx.fill();ctx.strokeStyle='#C2413B';ctx.lineWidth=2.4;ctx.beginPath();ctx.arc(x,y,6.6,0,7);ctx.stroke();
   ctx.fillStyle='#22262A';ctx.beginPath();ctx.arc(x,y,4.2,0,7);ctx.fill();const lg=ctx.createRadialGradient(x,y,0,x,y,4);lg.addColorStop(0,'#FFF6CF');lg.addColorStop(1,'#F2B640');ctx.fillStyle=lg;ctx.beginPath();ctx.arc(x,y,3,0,7);ctx.fill()},
 volcano(x,y,r,t,a){jetty(x,y,r,a);const dk=theme==='dark';island(x,y,r,41,t,0,false,1.2,1);
   const cg=ctx.createRadialGradient(x-r*.15,y-r*.2,r*.1,x,y,r*.95);cg.addColorStop(0,dk?'#5A3E30':'#9C7458');cg.addColorStop(1,dk?'#2C2420':'#6A5240');blobPath(x,y,r*.8,42,12,1.1,.95);ctx.fillStyle=cg;ctx.fill();
   ctx.strokeStyle='rgba(0,0,0,.28)';ctx.lineWidth=1;for(let k=0;k<22;k++){const a=k/22*6.283;ctx.beginPath();ctx.moveTo(x+Math.cos(a)*r*.26,y+Math.sin(a)*r*.24);ctx.lineTo(x+Math.cos(a)*r*.68,y+Math.sin(a)*r*.62);ctx.stroke()}
   const pulse=.6+.4*Math.sin(t/500);const lg=ctx.createRadialGradient(x,y,0,x,y,r*.3);lg.addColorStop(0,`rgba(255,190,90,${pulse})`);lg.addColorStop(.6,'rgba(220,70,40,.8)');lg.addColorStop(1,'rgba(60,20,10,1)');
   ctx.fillStyle=lg;ctx.beginPath();ctx.ellipse(x,y,r*.24,r*.2,0,0,7);ctx.fill();
   for(let k=0;k<8;k++){const u=((t/5200)+k/8)%1,px=x+u*r*1.6+Math.sin(u*6+k)*6,py=y-u*r*1.9,s=r*(.16+u*.4);ctx.fillStyle=dk?`rgba(150,150,160,${.42*(1-u)})`:`rgba(255,255,255,${.75*(1-u)})`;ctx.beginPath();ctx.arc(px,py,s,0,7);ctx.fill()}},
 wreck(x,y,r,t,a){jetty(x,y,r,a);const dk=theme==='dark';island(x,y,r*.55,61,t,0,false,1.6,.7);const rr=rng(62);for(let i=0;i<7;i++)rock(x+(rr()-.5)*r*3,y+(rr()-.5)*r*1.8,3+rr()*5,300+i,t);
   ctx.save();ctx.translate(x+r*.6,y-r*.2);ctx.rotate(1.1);ctx.scale(1.05,1.05);ctx.translate(2,3);hullPath();ctx.fillStyle='rgba(0,0,0,.25)';ctx.fill();ctx.translate(-2,-3);
   hullPath();ctx.fillStyle=dk?'#3A2A1E':'#6E4E30';ctx.fill();ctx.save();hullPath();ctx.clip();ctx.fillStyle=dk?'#1A2A30':'#4F7F8A';ctx.beginPath();ctx.moveTo(-12,4);ctx.lineTo(4,-2);ctx.lineTo(12,14);ctx.lineTo(-12,24);ctx.fill();ctx.restore();
   ctx.strokeStyle=dk?'#5A4430':'#8E6A44';ctx.lineWidth=.8;for(let k=-6;k<=6;k+=3){ctx.beginPath();ctx.moveTo(k,-20);ctx.lineTo(k,2);ctx.stroke()}ctx.strokeStyle='#2A1C12';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,-6);ctx.lineTo(16,-30);ctx.stroke();ctx.restore()},
 fort(x,y,r,t,a){jetty(x,y,r,a);const dk=theme==='dark';island(x,y,r,71,t,2,true);const n=10;ctx.beginPath();for(let k=0;k<n;k++){const a=k/n*6.283-Math.PI/2,R=k%2?r*.36:r*.58;ctx[k?'lineTo':'moveTo'](x+Math.cos(a)*R,y-r*.05+Math.sin(a)*R)}ctx.closePath();
   ctx.save();ctx.translate(2,3);ctx.fillStyle='rgba(0,0,0,.25)';ctx.fill();ctx.restore();ctx.fillStyle=dk?'#56544C':'#C9BFA6';ctx.fill();ctx.strokeStyle=dk?'#2E2C28':'#7A6E54';ctx.lineWidth=1.4;ctx.stroke();
   ctx.fillStyle=dk?'#3A3934':'#E3DAC2';ctx.fillRect(x-r*.2,y-r*.25,r*.4,r*.4);ctx.strokeRect(x-r*.2,y-r*.25,r*.4,r*.4);
   ctx.strokeStyle='#3A2A1C';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(x,y-r*.05);ctx.lineTo(x,y-r*.05-16);ctx.stroke();ctx.fillStyle='#C2413B';const fl=Math.sin(t/160)*1.5;ctx.beginPath();ctx.moveTo(x,y-r*.05-16);ctx.quadraticCurveTo(x+5,y-r*.05-14+fl,x+11,y-r*.05-15+fl);ctx.lineTo(x,y-r*.05-10);ctx.fill()},

 cove(x,y,r,t,a){island(x,y,r,181,t,5,true);jetty(x,y,r,a);const hx=x+r*.25,hy=y-r*.15;ctx.fillStyle='rgba(0,0,0,.25)';ctx.fillRect(hx-6,hy-4,16,14);ctx.fillStyle=dkc('#7A5A30','#C9A060');ctx.fillRect(hx-8,hy-7,16,14);ctx.strokeStyle='rgba(60,40,10,.5)';ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(hx-8,hy);ctx.lineTo(hx+8,hy);ctx.stroke()},
 fisher(x,y,r,t,a){island(x,y,r,191,t,1,true);jetty(x,y,r,a);[2.3,2.75,3.2].forEach((o,k)=>{const hx=x+Math.cos(a+o)*r*1.25,hy=y+Math.sin(a+o)*r*.95;ctx.fillStyle='rgba(0,0,0,.25)';ctx.fillRect(hx-5,hy-3,13,12);ctx.fillStyle=dkc('#6A4A2A','#B5875A');ctx.fillRect(hx-7,hy-6,13,12);ctx.strokeStyle='rgba(60,40,10,.6)';ctx.lineWidth=.8;ctx.strokeRect(hx-7,hy-6,13,12)});
   moored(x+Math.cos(a-.9)*r*1.35,y+Math.sin(a-.9)*r*1.05,a,'#2F5D7A');moored(x+Math.cos(a-1.3)*r*1.4,y+Math.sin(a-1.3)*r*1.1,a+.4,'#8A3B2E')},
 port(x,y,r,t,a){const dk=theme==='dark';island(x,y,r,7,t,0,false,1.5,.9);
   ctx.save();blobPath(x,y+4,r*.86,8,14,1.5,.9);ctx.clip();const rr=rng(21),roofs=dk?['#4A2E28','#3E3330','#33404A','#523A2A']:['#A9553E','#8E4B39','#66727E','#B9784C'];
   for(let row=0;row<6;row++){let xx=x-r*1.6+row*11;const ry=y-r*.85+row*20;while(xx<x+r*1.6){const w=14+rr()*14,h=14;
     ctx.fillStyle='rgba(0,0,0,.25)';ctx.fillRect(xx+2,ry+2,w,h);ctx.fillStyle=roofs[Math.floor(rr()*4)];ctx.fillRect(xx,ry,w,h);ctx.fillStyle='rgba(255,255,255,.12)';ctx.fillRect(xx,ry,w,h/2);
     if(dk&&rr()<.4){ctx.fillStyle=`rgba(255,205,120,${.55+.35*Math.sin(t/600+xx)})`;ctx.fillRect(xx+w*.4,ry+h+1,2.5,2.5)}xx+=w+3}}ctx.restore();
   jetty(x-22,y,r*.95,a);[[x-58,y-r*.78,.4,'#2F5D7A'],[x+34,y-r*.86,-.3,'#F0EDE4'],[x+64,y-r*.68,.2,'#8A3B2E'],[x-84,y-r*.58,-.2,'#3F6B4E']].forEach(([p,q,c,d])=>moored(p,q,c,d))},
 // music: a jetty of piano keys, a bandstand, notes on the breeze
 keys(x,y,r,t,a){island(x,y,r,111,t,2,true);jetty(x,y,r,a,true);
   const n=8,R=r*.36;ctx.fillStyle='rgba(0,0,0,.25)';ctx.beginPath();ctx.arc(x+2,y+3,R,0,7);ctx.fill();
   for(let k=0;k<n;k++){ctx.beginPath();ctx.moveTo(x,y);ctx.arc(x,y,R,k/n*6.283,(k+1)/n*6.283);ctx.closePath();ctx.fillStyle=k%2?'#F4EFE3':'#C2413B';ctx.fill()}
   ctx.fillStyle='#E9C46A';ctx.beginPath();ctx.arc(x,y,3,0,7);ctx.fill();
   ctx.fillStyle=dkc('rgba(255,236,190,.85)','rgba(40,40,60,.75)');ctx.font='16px serif';ctx.textAlign='center';
   for(let k=0;k<5;k++){const u=(t/4200+k/5)%1;ctx.globalAlpha=Math.sin(u*Math.PI);ctx.fillText(k%2?'♪':'♫',x+Math.sin(u*6+k*2)*r*.9+(k-2)*12,y-r*.3-u*r*1.4)}ctx.globalAlpha=1},
 // food: orchard rows and a market with striped awnings
 orchard(x,y,r,t,a){const dk=theme==='dark';island(x,y,r,121,t,0,true);jetty(x,y,r,a);
   ctx.save();blobPath(x+r*.06,y-r*.08,r*.66,122);ctx.clip();for(let i=-5;i<=5;i++)for(let j=-4;j<=4;j++){const px=x+i*12+(j%2)*6,py=y+j*11;ctx.fillStyle='rgba(0,0,0,.22)';ctx.beginPath();ctx.arc(px+1.5,py+2,5,0,7);ctx.fill();
     ctx.fillStyle=dk?'#2F6B3A':'#5FA052';ctx.beginPath();ctx.arc(px,py,5,0,7);ctx.fill();ctx.fillStyle=['#E8553E','#F2A33A','#E8553E'][(i+j+9)%3];ctx.beginPath();ctx.arc(px+1.5,py-1,1.4,0,7);ctx.fill()}ctx.restore();
   [[-.2,1],[.25,1.18]].forEach(([o,f])=>{const sx=x+Math.cos(a+o)*r*.78,sy=y+Math.sin(a+o)*r*.6;ctx.save();ctx.translate(sx,sy);ctx.fillStyle='rgba(0,0,0,.25)';ctx.fillRect(-7,-5,16,12);
     for(let k=0;k<4;k++){ctx.fillStyle=k%2?'#FBF8F0':f>1?'#2D7DA8':'#C2413B';ctx.fillRect(-9+k*4.5,-7,4.5,12)}ctx.restore()})},
 // body: a whale skeleton on the beach
 bones(x,y,r,t,a){island(x,y,r,131,t,2,false,1.4,.85);jetty(x,y,r,a);
   ctx.save();ctx.translate(x,y);ctx.rotate(-.3);ctx.strokeStyle=dkc('#E8E0CC','#FFFDF6');ctx.lineCap='round';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-r*.8,0);ctx.quadraticCurveTo(0,-6,r*.75,2);ctx.stroke();
   ctx.lineWidth=2;for(let k=0;k<9;k++){const px=-r*.55+k*r*.12,h=(1-Math.abs(k-3)/7)*13;ctx.beginPath();ctx.moveTo(px,-2-h);ctx.quadraticCurveTo(px+4,-2,px,h+2);ctx.stroke()}
   ctx.fillStyle=dkc('#E8E0CC','#FFFDF6');ctx.beginPath();ctx.ellipse(-r*.85,0,9,6,0,0,7);ctx.fill();ctx.beginPath();ctx.moveTo(r*.72,1);ctx.lineTo(r*.95,-8);ctx.lineTo(r*.95,10);ctx.closePath();ctx.fill();ctx.restore()},
 // geography: contour lines up to a snowy peak, and a river to the sea
 peak(x,y,r,t,a){island(x,y,r,141,t,0,true,1.25,.9);jetty(x,y,r,a);
   const px=x-r*.1,py=y-r*.1;for(let k=4;k>=1;k--){blobPath(px,py,r*.17*k,142+k,12,1.2,.95);ctx.fillStyle=k===1?'#F4F6F8':dkc(['','#7A6E58','#5E6B4A','#47603C','#3A5A35'][k],['','#C9BCA0','#B4B68A','#9DB77C','#8CB874'][k]);ctx.fill();ctx.strokeStyle=dkc('rgba(0,0,0,.35)','rgba(80,60,30,.35)');ctx.lineWidth=.8;ctx.stroke()}
   ctx.strokeStyle=dkc('#4FA0C0','#4A9CD0');ctx.lineWidth=2.4;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(px+4,py+6);const ex=x+Math.cos(a+.6)*r*1.05,ey=y+Math.sin(a+.6)*r*.8;ctx.bezierCurveTo(px+20,py+30,ex-24,ey-10,ex,ey);ctx.stroke()},
 // money: X marks the spot, an open chest of gold
 treasure(x,y,r,t,a){island(x,y,r,151,t,3,true);jetty(x,y,r,a);
   const cx=x-r*.15,cy=y-r*.05;blobPath(cx,cy,r*.34,152,10,1.2,.9);ctx.fillStyle=dkc('#7A6E4C','#EEDFAA');ctx.fill();
   ctx.strokeStyle='#C2413B';ctx.lineWidth=3.2;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(cx-7,cy-7);ctx.lineTo(cx+7,cy+7);ctx.moveTo(cx+7,cy-7);ctx.lineTo(cx-7,cy+7);ctx.stroke();
   const kx=cx+r*.42,ky=cy+4;ctx.fillStyle='rgba(0,0,0,.25)';ctx.fillRect(kx-8,ky-4,18,13);ctx.fillStyle='#6E4526';ctx.fillRect(kx-10,ky-6,18,12);ctx.fillStyle='#F2C230';ctx.fillRect(kx-8,ky-4,14,6);
   ctx.strokeStyle='#3A2412';ctx.lineWidth=1;ctx.strokeRect(kx-10,ky-6,18,12);for(let k=0;k<4;k++){const g=.5+.5*Math.sin(t/260+k*1.7);ctx.fillStyle=`rgba(255,250,200,${g})`;ctx.beginPath();ctx.arc(kx-6+k*4,ky-3+(k%2)*2,1.2+g,0,7);ctx.fill()}},
 // space: a domed observatory, its slit turning slowly, stars overhead
 observatory(x,y,r,t,a){const dk=theme==='dark';island(x,y,r,161,t,0,false,1.2,.95);rock(x+r*.7,y+r*.5,6,162,t);jetty(x,y,r,a);
   ctx.fillStyle='rgba(0,0,0,.28)';ctx.beginPath();ctx.arc(x+3,y+4,r*.42,0,7);ctx.fill();const dg=ctx.createRadialGradient(x-6,y-6,2,x,y,r*.42);dg.addColorStop(0,'#FFFFFF');dg.addColorStop(1,dk?'#9AA4AE':'#C9D0D6');ctx.fillStyle=dg;ctx.beginPath();ctx.arc(x,y,r*.42,0,7);ctx.fill();
   ctx.save();ctx.translate(x,y);ctx.rotate(t/3000);ctx.fillStyle='#26303A';ctx.fillRect(-3,-r*.42,6,r*.42);ctx.fillStyle='#8A949E';ctx.fillRect(-1.6,-r*.5,3.2,r*.3);ctx.restore();
   ctx.fillStyle=dk?'#FFF6CF':'#5E4E8E';for(let k=0;k<9;k++){const sx=x+(hash(k,161)-.5)*r*3,sy=y+(hash(k,162)-.5)*r*2.4,g=.4+.6*Math.abs(Math.sin(t/700+k));if(Math.hypot(sx-x,sy-y)<r*1.2)continue;ctx.globalAlpha=g;ctx.save();ctx.translate(sx,sy);ctx.rotate(.785);ctx.fillRect(-1,-4,2,8);ctx.fillRect(-4,-1,8,2);ctx.restore()}ctx.globalAlpha=1},
 // sports: a stadium with its pitch and floodlights
 stadium(x,y,r,t,a){const dk=theme==='dark';island(x,y,r,171,t,2,true,1.3,.9);jetty(x,y,r,a);
   const sx=r*.62,sy=r*.42;ctx.fillStyle='rgba(0,0,0,.28)';ctx.beginPath();ctx.ellipse(x+3,y+4,sx,sy,0,0,7);ctx.fill();ctx.fillStyle=dk?'#5A5E66':'#B9BEC6';ctx.beginPath();ctx.ellipse(x,y,sx,sy,0,0,7);ctx.fill();
   ctx.strokeStyle=dk?'rgba(0,0,0,.35)':'rgba(255,255,255,.6)';ctx.lineWidth=.7;for(let k=1;k<4;k++){ctx.beginPath();ctx.ellipse(x,y,sx-k*3,sy-k*3,0,0,7);ctx.stroke()}
   ctx.fillStyle=dk?'#2F7A3E':'#55A84E';ctx.fillRect(x-sx*.62,y-sy*.55,sx*1.24,sy*1.1);ctx.strokeStyle='rgba(255,255,255,.85)';ctx.lineWidth=.8;ctx.strokeRect(x-sx*.62,y-sy*.55,sx*1.24,sy*1.1);
   ctx.beginPath();ctx.moveTo(x,y-sy*.55);ctx.lineTo(x,y+sy*.55);ctx.stroke();ctx.beginPath();ctx.arc(x,y,sy*.25,0,7);ctx.stroke();
   [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([i,j])=>{const lx=x+i*sx*.92,ly=y+j*sy*.92;if(dk){const g=ctx.createRadialGradient(lx,ly,0,lx,ly,22);g.addColorStop(0,'rgba(255,250,220,.5)');g.addColorStop(1,'rgba(255,250,220,0)');ctx.fillStyle=g;ctx.fillRect(lx-22,ly-22,44,44)}ctx.fillStyle='#FFF8DC';ctx.fillRect(lx-2,ly-2,4,4)})}
};
function drawIsles(t){worldT();ISL.forEach((s,i)=>{if(!s.dup&&onScreen(s.c[0],s.c[1],s.r*3+120))LAND[s.k](s.c[0],s.c[1],s.r,t,s.a)});
  // a flag in the leg's colour on every island you've answered
  Object.entries(S.flags).forEach(([i,ti])=>{const s=ISL[i],x=s.c[0],y=s.c[1]-s.r*.15,c=css('--t'+ti),z=Math.max(S.cam.z,.35),R=s.r*1.2;const g=ctx.createRadialGradient(x,y,0,x,y,R);g.addColorStop(0,c);g.addColorStop(1,clear(c));ctx.globalAlpha=.5+.2*Math.sin(t/400+ +i);ctx.fillStyle=g;ctx.fillRect(x-R,y-R,R*2,R*2);ctx.globalAlpha=1;ctx.fillStyle=c;ctx.strokeStyle='#fff';ctx.lineWidth=1.5/z;ctx.beginPath();ctx.arc(x,y,5/z,0,7);ctx.fill();ctx.stroke()})}

/* ---------- your course: straight when you reckoned well, wandering when you didn't ---------- */
function trail(){
  worldT();const z=S.cam.z;ctx.lineCap='round';ctx.lineJoin='round';
  const seg=(j,u1)=>{ctx.beginPath();for(let u=0;;u=Math.min(u1,u+.01)){const p=segPt(j,u);u?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]);if(u>=u1)break}};
  const n=S.done+(S.sail?1:0);
  for(let j=0;j<n;j++){const u1=S.sail&&j===S.sail.j?S.u:1;if(u1<=0)continue;seg(j,u1);
    const r=S.results[j];ctx.strokeStyle=theme==='dark'?'rgba(0,0,0,.35)':'rgba(255,255,255,.7)';ctx.lineWidth=5.5/z;ctx.stroke();ctx.strokeStyle=css('--t'+r.i);ctx.lineWidth=3/z;
    if(r.i===BECALMED){ctx.save();ctx.setLineDash([2/z,5/z]);ctx.stroke();ctx.restore()}else ctx.stroke()}
}
function ship(t){const p=boatPos();windLines(t,p);if(S.sail)S.ang=segAng(S.sail.j,S.u);const s=toScreen(p[0],p[1]);shipAt(s.x,s.y,S.ang,t,false,Math.max(.62,(W<560?1.1:1.25)*Math.min(1.2,S.cam.z*.8)))}
/* the ship from above: a three-masted pirate ship, square sails bellied out, a black flag at the stern */
function pHull(){ctx.beginPath();ctx.moveTo(0,-36);ctx.bezierCurveTo(11,-27,13.5,6,10.5,26);ctx.lineTo(-10.5,26);ctx.bezierCurveTo(-13.5,6,-11,-27,0,-36);ctx.closePath()}
/* wind streaks racing past on a good crossing */
function windLines(t,p){if(!S.sail||!S.sail.wind||S.sail.wind<.3)return;worldT();const a=S.ang,dx=Math.sin(a),dy=-Math.cos(a),nx=-dy,ny=dx,w=S.sail.wind,z=S.cam.z;
  ctx.strokeStyle=theme==='dark'?'rgba(220,240,250,.5)':'rgba(255,255,255,.95)';ctx.lineCap='round';ctx.lineWidth=1.6/z;
  for(let k=0;k<Math.round(w*10);k++){const ph=((t/(700-w*300))+hash(k,31))%1,side=(hash(k,32)-.5)*120,along=90-ph*260,len=18+w*30;
    const x=p[0]+dx*along+nx*side,y=p[1]+dy*along+ny*side;ctx.globalAlpha=Math.sin(ph*Math.PI)*w;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-dx*len,y-dy*len);ctx.stroke()}ctx.globalAlpha=1}
/* the ship's boat, rowing in when you stopped short */
function rowboat(t){const r=S.row;if(!r)return;const u=Math.max(0,Math.min(1,(t-r.t0)/r.dur));if(u>=1&&S.phase!=='landed')return;const e=u*u*(3-2*u),x=r.a[0]+(r.b[0]-r.a[0])*e,y=r.a[1]+(r.b[1]-r.a[1])*e,p=toScreen(x,y),z=Math.max(.6,S.cam.z*.9);
  ctx.setTransform(DPR,0,0,DPR,0,0);ctx.save();ctx.translate(p.x,p.y);ctx.rotate(Math.atan2(r.b[0]-r.a[0],-(r.b[1]-r.a[1])));ctx.scale(z,z);
  const st=Math.sin(t/160);ctx.strokeStyle='#3A2414';ctx.lineWidth=1.6;for(const sd of[-1,1]){ctx.beginPath();ctx.moveTo(sd*4,0);ctx.lineTo(sd*(11+st*2),4+st*5);ctx.stroke()}
  ctx.fillStyle='#6E4526';ctx.beginPath();ctx.moveTo(0,-9);ctx.quadraticCurveTo(5,-4,4,7);ctx.lineTo(-4,7);ctx.quadraticCurveTo(-5,-4,0,-9);ctx.fill();ctx.fillStyle='#2D4E7A';ctx.beginPath();ctx.arc(0,1,2.4,0,7);ctx.fill();
  ctx.strokeStyle=theme==='dark'?'rgba(210,235,245,.5)':'rgba(255,255,255,.9)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-3,9);ctx.lineTo(-5,16);ctx.moveTo(3,9);ctx.lineTo(5,16);ctx.stroke();ctx.restore()}
function shipAt(x,y,a,t,ghost,k){
  const dk=theme==='dark';ctx.setTransform(DPR,0,0,DPR,0,0);ctx.save();ctx.translate(x,y+Math.sin(t/600)*.8);ctx.rotate(a+Math.sin(t/900)*.03);ctx.scale(k,k);
  const mv=S.sail?(S.sail.wind??1):.2,foam=dk?'210,235,245':'255,255,255';
  for(let i=0;i<20;i++){const f=i/20,yy=24+f*(60+mv*90),sp=7+f*(16+mv*28),al=(1-f)*(dk?.4:.85);ctx.fillStyle=`rgba(${foam},${al})`;
    for(const s of[-1,1]){const jx=Math.sin(t/110+i*1.7+s*2)*1.3;ctx.beginPath();ctx.ellipse(s*sp+jx,yy,Math.max(.6,2.6-f*1.7),1.3,0,0,7);ctx.fill()}}
  ctx.strokeStyle=`rgba(${foam},${dk?.6:.95})`;ctx.lineWidth=1.3;for(const s of[-1,1]){ctx.beginPath();ctx.moveTo(s*2,-34);ctx.quadraticCurveTo(s*(11+mv*2),-24,s*(15+mv*3),-6);ctx.stroke()}
  if(dk){const gl=ctx.createRadialGradient(0,20,0,0,20,70);gl.addColorStop(0,'rgba(245,196,107,.3)');gl.addColorStop(1,'rgba(245,196,107,0)');ctx.fillStyle=gl;ctx.fillRect(-70,-50,140,140)}
  ctx.save();ctx.translate(4,6);pHull();ctx.fillStyle='rgba(0,0,0,.3)';ctx.fill();ctx.restore();
  // bowsprit
  ctx.strokeStyle='#2A1A0E';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,-34);ctx.lineTo(0,-47);ctx.stroke();
  // cannons out of the gunports
  ctx.fillStyle='#15110E';for(const yy of[-16,-5,6])for(const s of[-1,1])ctx.fillRect(s>0?11:-15,yy,4,2.2);
  const hg=ctx.createLinearGradient(-12,0,12,0);hg.addColorStop(0,'#1E120A');hg.addColorStop(.5,dk?'#4E3220':'#5E3A20');hg.addColorStop(1,'#1E120A');
  pHull();ctx.fillStyle=hg;ctx.fill();ctx.strokeStyle='#C9A043';ctx.lineWidth=1.3;ctx.stroke();
  ctx.save();ctx.scale(.8,.88);pHull();ctx.fillStyle=dk?'#7A5A38':'#A07A4E';ctx.fill();ctx.clip();ctx.strokeStyle='rgba(40,20,5,.4)';ctx.lineWidth=.6;for(let px=-10;px<=10;px+=2.4){ctx.beginPath();ctx.moveTo(px,-40);ctx.lineTo(px,30);ctx.stroke()}ctx.restore();
  // the raised stern deck, with a lantern
  rrect(-9,14,18,11,2);ctx.fillStyle='#3A2414';ctx.fill();ctx.strokeStyle='#C9A043';ctx.lineWidth=.9;ctx.stroke();ctx.fillStyle='#FFE09A';ctx.beginPath();ctx.arc(0,24,1.8,0,7);ctx.fill();
  // three masts, each with a square sail on its yard
  const cloth=dk?'#D8CCB0':'#EFE6D0',shade=dk?'#A89C80':'#CFC3A6',swing=Math.sin(t/800)*.06;
  [[-20,30,.9],[-4,36,1],[11,28,.85]].forEach(([my,w,f])=>{ctx.save();ctx.translate(0,my);ctx.rotate(swing);const bel=1+mv*10,h=w*.5;
    ctx.fillStyle='rgba(0,0,0,.18)';ctx.beginPath();ctx.moveTo(-w/2+3,4);ctx.quadraticCurveTo(3,-bel+4,w/2+3,4);ctx.lineTo(w/2+3,6);ctx.quadraticCurveTo(3,-bel+8,-w/2+3,6);ctx.fill();
    const g=ctx.createLinearGradient(-w/2,0,w/2,0);g.addColorStop(0,shade);g.addColorStop(.5,cloth);g.addColorStop(1,shade);ctx.fillStyle=g;
    ctx.beginPath();ctx.moveTo(-w/2,0);ctx.quadraticCurveTo(0,-bel*1.6,w/2,0);ctx.lineTo(w/2,2.5);ctx.quadraticCurveTo(0,-bel*1.1,-w/2,2.5);ctx.closePath();ctx.fill();ctx.strokeStyle='#6E6450';ctx.lineWidth=.7;ctx.stroke();
    ctx.strokeStyle='#2A1A0E';ctx.lineWidth=1.6;ctx.beginPath();ctx.moveTo(-w/2-1,1.5);ctx.lineTo(w/2+1,1.5);ctx.stroke();ctx.restore();
    ctx.fillStyle='#2A1A0E';ctx.beginPath();ctx.arc(0,my+1.5,2.4*f,0,7);ctx.fill()});
  // the black flag, streaming aft
  const fl=Math.sin(t/140)*1.8;ctx.fillStyle='#111';ctx.beginPath();ctx.moveTo(-1,26);ctx.quadraticCurveTo(-4+fl,31,-2+fl,37);ctx.lineTo(4+fl,37);ctx.quadraticCurveTo(5+fl*.5,31,3,26);ctx.closePath();ctx.fill();
  ctx.fillStyle='#F4F0E6';ctx.beginPath();ctx.arc(1+fl*.7,31.5,1.3,0,7);ctx.fill();
  ctx.restore();
}



/* ---------- the uncharted: paper over everything you haven't sailed near ---------- */
/* light fog: how far you can see on a crossing depends on how well you reckoned */
const VIS=[560,470,390,310,240,190,165,150];
const visOf=j=>VIS[S.results[j].i];
function fog(){
  const f=fctx;f.setTransform(DPR,0,0,DPR,0,0);f.globalCompositeOperation='source-over';f.fillStyle=P.parch;f.fillRect(0,0,W,H);f.fillStyle=hatchPat;f.fillRect(0,0,W,H);
  f.globalCompositeOperation='destination-out';const z=S.cam.z;
  const hole=(x,y,r)=>{const p=toScreen(x,y),R=r*z;if(p.x<-R||p.x>W+R||p.y<-R||p.y>H+R)return;const g=f.createRadialGradient(p.x,p.y,R*.45,p.x,p.y,R);g.addColorStop(0,'rgba(0,0,0,1)');g.addColorStop(1,'rgba(0,0,0,0)');f.fillStyle=g;f.fillRect(p.x-R,p.y-R,R*2,R*2)};
  const n=S.done+(S.sail?1:0);for(let j=0;j<n;j++){const u1=S.sail&&j===S.sail.j?S.u:1,r=visOf(j);for(let u=0;u<u1;u+=.05){const p=segPt(j,u);hole(p[0],p[1],r*.8)}}
  const b=boatPos();hole(b[0],b[1],S.sail?visOf(S.sail.j):300);S.seen.forEach(i=>{const s=ISL[i];hole(s.c[0],s.c[1],s.r*1.7+120)});
  ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=S.phase==='end'?.45:theme==='dark'?.66:.7;ctx.drawImage(fcv,0,0);ctx.globalAlpha=1;
}
/* the next island, sketched in on the paper before you get there */
function nextUnseen(){for(let i=1;i<ISL.length;i++)if(!S.seen.has(i)&&!ISL[i].dup)return i;return -1}
function sketches(){const i=nextUnseen();if(i<0||S.phase==='end')return;worldT();const z=S.cam.z,s=ISL[i];ctx.save();ctx.setLineDash([5/z,4/z]);ctx.lineWidth=1.3/z;ctx.strokeStyle=P.ink2;ctx.globalAlpha=.6;blobPath(s.c[0],s.c[1],s.r,10+i,14,1.3,.85);ctx.stroke();ctx.restore()}
function labels(){
  ctx.setTransform(DPR,0,0,DPR,0,0);const end=S.phase==='end',nu=nextUnseen();ctx.textAlign='center';
  ISL.forEach((s,i)=>{if(s.dup||!S.seen.has(i))return;const seen=true;if(!end&&!S.sail&&i===S.node)return;const p=toScreen(s.c[0],s.c[1]+s.r*.95+(end?16:22)/S.cam.z);if(p.y<70||p.y>H+20)return;
    ctx.globalAlpha=seen?1:.55;ctx.fillStyle=P.ink;ctx.font=`italic 600 ${end?(W<560?12:15):17}px ${FD}`;ctx.fillText(seen?s.n:'uncharted',p.x,p.y);ctx.globalAlpha=1});
}
function compass(){if(W<560&&S.phase!=='end')return;ctx.setTransform(DPR,0,0,DPR,0,0);const x=W-46,y=S.phase==='end'?H*.47-10:130;ctx.save();ctx.translate(x,y);ctx.globalAlpha=.55;ctx.strokeStyle=P.ink;ctx.fillStyle=P.ink;ctx.lineWidth=1;
  ctx.beginPath();ctx.arc(0,0,20,0,7);ctx.stroke();for(let k=0;k<4;k++){ctx.rotate(Math.PI/2);ctx.beginPath();ctx.moveTo(0,-27);ctx.lineTo(4,0);ctx.lineTo(-4,0);ctx.closePath();k===3?ctx.fill():ctx.stroke()}
  ctx.font=`italic 600 12px ${FD}`;ctx.textAlign='center';ctx.fillText('N',0,-31);ctx.restore()}

/* ---------- ashore: a side-on view of the island you've landed on ---------- */
const ASH={hy:0,s:1,cx:0};
function ashoreGeom(){ASH.s=W<560?W/540:Math.min(1.45,W/760,H/560);ASH.cx=W/2;ASH.hy=W<560?H*.3:Math.min(H*.38,40+290*ASH.s*.62+120)}
function palmS(x,y,h,lean,t){const dk=theme==='dark',sw=Math.sin(t/1300+x)*.04;ctx.save();ctx.translate(x,y);
  ctx.strokeStyle=dk?'#4A3A28':'#8A6A44';ctx.lineWidth=h*.07;ctx.lineCap='round';const tx=lean*h*.35,ty=-h;ctx.beginPath();ctx.moveTo(0,0);ctx.quadraticCurveTo(lean*h*.05,-h*.6,tx,ty);ctx.stroke();
  ctx.strokeStyle=dk?'rgba(0,0,0,.25)':'rgba(60,40,20,.25)';ctx.lineWidth=1;for(let k=.15;k<.95;k+=.1){const px=lean*h*.35*k*k,py=-h*k;ctx.beginPath();ctx.moveTo(px-h*.035,py);ctx.lineTo(px+h*.035,py+2);ctx.stroke()}
  ctx.translate(tx,ty);ctx.rotate(sw);for(let k=0;k<7;k++){const a=-Math.PI+k*Math.PI/6+.0,len=h*(.45+.1*Math.sin(k*2)),ex=Math.cos(a)*len,ey=Math.sin(a)*len*.45+len*.32;
    ctx.fillStyle=k%2?(dk?'#2E6A44':'#4F9A55'):(dk?'#245638':'#3E8547');ctx.beginPath();ctx.moveTo(0,0);ctx.quadraticCurveTo(ex*.5,ey*.2-h*.12,ex,ey);ctx.quadraticCurveTo(ex*.55,ey*.35-h*.02,0,0);ctx.fill()}
  ctx.fillStyle=dk?'#3A2A1C':'#6A4A2A';ctx.beginPath();ctx.arc(0,3,h*.04,0,7);ctx.arc(h*.05,4,h*.035,0,7);ctx.fill();ctx.restore()}
/* the ship side-on, moored at the jetty */
function rowS(x,y,s,t){ctx.save();ctx.translate(x,y+Math.sin(t/600)*1.5*s);ctx.scale(s,s);ctx.fillStyle='#6E4526';ctx.beginPath();ctx.moveTo(-26,-4);ctx.lineTo(26,-4);ctx.quadraticCurveTo(20,6,0,7);ctx.quadraticCurveTo(-20,6,-26,-4);ctx.fill();
  ctx.strokeStyle='#C9A043';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-24,-2);ctx.lineTo(24,-2);ctx.stroke();ctx.strokeStyle='#3A2414';ctx.lineWidth=1.6;ctx.beginPath();ctx.moveTo(-6,-4);ctx.lineTo(-18,8);ctx.moveTo(6,-4);ctx.lineTo(16,8);ctx.stroke();ctx.restore()}
function boatS(x,y,s,t){const dk=theme==='dark';ctx.save();ctx.translate(x,y+Math.sin(t/700)*2*s);ctx.rotate(Math.sin(t/900)*.025);ctx.scale(s,s);
  ctx.fillStyle=dk?'rgba(0,0,0,.3)':'rgba(20,60,80,.18)';ctx.beginPath();ctx.ellipse(0,14,70,5,0,0,7);ctx.fill();
  // rigging, behind the sails
  ctx.strokeStyle=dk?'rgba(30,20,10,.7)':'rgba(40,25,10,.6)';ctx.lineWidth=.8;[[-34,-96],[0,-118],[30,-92]].forEach(([mx,top])=>{ctx.beginPath();ctx.moveTo(mx,top);ctx.lineTo(mx-26,-14);ctx.moveTo(mx,top);ctx.lineTo(mx+26,-14);ctx.stroke()});
  ctx.beginPath();ctx.moveTo(0,-118);ctx.lineTo(92,-34);ctx.stroke();
  // hull: high stern on the left, bow rising on the right
  const hg=ctx.createLinearGradient(0,-30,0,14);hg.addColorStop(0,dk?'#4A2E1A':'#5E3A20');hg.addColorStop(1,'#1E120A');ctx.fillStyle=hg;
  ctx.beginPath();ctx.moveTo(-74,-34);ctx.lineTo(-52,-34);ctx.lineTo(-48,-16);ctx.lineTo(44,-16);ctx.lineTo(66,-26);ctx.quadraticCurveTo(62,2,40,13);ctx.lineTo(-50,13);ctx.quadraticCurveTo(-70,4,-74,-34);ctx.closePath();ctx.fill();
  ctx.strokeStyle='#C9A043';ctx.lineWidth=1.6;ctx.beginPath();ctx.moveTo(-73,-30);ctx.lineTo(-50,-30);ctx.lineTo(-47,-12);ctx.lineTo(45,-12);ctx.lineTo(64,-21);ctx.stroke();
  ctx.beginPath();ctx.moveTo(-66,2);ctx.quadraticCurveTo(0,6,52,2);ctx.stroke();
  // gunports
  for(let k=0;k<6;k++){const gx=-38+k*15;ctx.fillStyle='#0E0A08';ctx.fillRect(gx,-8,7,6);ctx.strokeStyle='#C9A043';ctx.lineWidth=.8;ctx.strokeRect(gx,-8,7,6);ctx.fillStyle='#15110E';ctx.fillRect(gx+2,-6,5,2)}
  // stern windows, lit
  ctx.fillStyle=dk?'#FFD98A':'#F4E3B0';for(let k=0;k<3;k++)ctx.fillRect(-70+k*6,-28,4,6);
  // bowsprit and jib
  ctx.strokeStyle='#2A1A0E';ctx.lineWidth=2.4;ctx.beginPath();ctx.moveTo(62,-24);ctx.lineTo(94,-36);ctx.stroke();
  const cloth=dk?'#D8CCB0':'#EFE6D0',shade=dk?'#A89C80':'#CFC3A6',bel=Math.sin(t/900)*1.5+(S.node&&S.results[S.node-1]?WIND[S.results[S.node-1].i]*6-2:3);
  ctx.fillStyle=cloth;ctx.beginPath();ctx.moveTo(32,-88);ctx.quadraticCurveTo(68,-56+bel,90,-36);ctx.lineTo(44,-30);ctx.closePath();ctx.fill();ctx.strokeStyle='#8E8470';ctx.lineWidth=.8;ctx.stroke();
  // masts and square sails
  [[-34,-96,30],[0,-118,38],[30,-92,28]].forEach(([mx,top,w])=>{ctx.strokeStyle='#2A1A0E';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(mx,-16);ctx.lineTo(mx,top);ctx.stroke();
    const tiers=[[top+10,w*.72,(top+10)*.0+22],[top+38,w,30]];tiers.forEach(([yy,ww,hh])=>{const sg=ctx.createLinearGradient(mx-ww/2,0,mx+ww/2,0);sg.addColorStop(0,shade);sg.addColorStop(.55,cloth);sg.addColorStop(1,shade);ctx.fillStyle=sg;
      ctx.beginPath();ctx.moveTo(mx-ww/2,yy);ctx.lineTo(mx+ww/2,yy);ctx.quadraticCurveTo(mx+ww/2+5+bel,yy+hh/2,mx+ww/2,yy+hh);ctx.lineTo(mx-ww/2,yy+hh);ctx.quadraticCurveTo(mx-ww/2+5+bel,yy+hh/2,mx-ww/2,yy);ctx.closePath();ctx.fill();ctx.strokeStyle='#8E8470';ctx.lineWidth=.8;ctx.stroke();
      ctx.strokeStyle='#2A1A0E';ctx.lineWidth=1.8;ctx.beginPath();ctx.moveTo(mx-ww/2-2,yy);ctx.lineTo(mx+ww/2+2,yy);ctx.stroke()})});
  // crow's nest and the jolly roger
  ctx.fillStyle='#3A2414';ctx.fillRect(-5,-104,10,5);
  const fl=Math.sin(t/140)*2;ctx.fillStyle='#111';ctx.beginPath();ctx.moveTo(0,-118);ctx.quadraticCurveTo(12,-121+fl,26,-118+fl);ctx.lineTo(26,-102+fl);ctx.quadraticCurveTo(12,-105+fl,0,-103);ctx.closePath();ctx.fill();
  ctx.fillStyle='#F4F0E6';ctx.beginPath();ctx.arc(13,-112+fl*.6,3.2,0,7);ctx.fill();ctx.strokeStyle='#F4F0E6';ctx.lineWidth=1.3;ctx.beginPath();ctx.moveTo(8,-109+fl*.6);ctx.lineTo(18,-104+fl*.6);ctx.moveTo(18,-109+fl*.6);ctx.lineTo(8,-104+fl*.6);ctx.stroke();
  ctx.fillStyle='#111';ctx.beginPath();ctx.arc(11.8,-112.5+fl*.6,.8,0,7);ctx.arc(14.2,-112.5+fl*.6,.8,0,7);ctx.fill();
  ctx.restore()}
function jettyS(x0,x1,y,s,keys){ctx.fillStyle=theme==='dark'?'#3A2E22':'#6E5236';for(let x=x0;x<x1;x+=34*s)ctx.fillRect(x,y,4*s,22*s);
  if(keys){ctx.fillStyle='#F7F3EA';ctx.fillRect(x0,y-6*s,x1-x0,8*s);ctx.fillStyle='#1C1C1C';for(let x=x0,n=0;x<x1-6*s;x+=9*s,n++){ctx.strokeStyle='#555';ctx.lineWidth=.6;ctx.beginPath();ctx.moveTo(x,y-6*s);ctx.lineTo(x,y+2*s);ctx.stroke();if(n%7!==2&&n%7!==6)ctx.fillRect(x+6*s,y-6*s,5*s,4.5*s)}}
  else{ctx.fillStyle=theme==='dark'?'#5A4A36':'#9C7A52';ctx.fillRect(x0,y-5*s,x1-x0,6*s)}}
function signpost(x,y,s,name){ctx.save();ctx.font=`italic 600 ${Math.round(17*Math.max(.8,s))}px ${FD}`;const w=ctx.measureText(name).width+18;
  ctx.fillStyle='#5A3E26';ctx.fillRect(x-2*s,y-46*s,4*s,46*s);ctx.fillStyle=theme==='dark'?'#8A6A44':'#C8A06A';ctx.save();ctx.translate(x,y-50*s);ctx.rotate(-.04);
  ctx.fillStyle='rgba(0,0,0,.2)';ctx.fillRect(-w/2+2,-12+2,w,24);ctx.fillStyle=theme==='dark'?'#8A6A44':'#D9B47A';ctx.fillRect(-w/2,-12,w,24);ctx.strokeStyle='#5A3E26';ctx.lineWidth=1.2;ctx.strokeRect(-w/2,-12,w,24);
  ctx.fillStyle='#2A1C10';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(name,0,1);ctx.restore();ctx.restore()}

/* ---------- scene kit: soft rolling hills, light and shade, and a little life ---------- */
function hillY(cx,hy,s,h,seed,x){const u=(x-cx)/s;if(u<-250||u>280)return hy-20*s;const e=Math.pow(Math.sin(Math.PI*(u+250)/530),.45);
  return hy-20*s-(h-20)*s*e*(1+.06*Math.sin(u/41+seed)+.035*Math.sin(u/17+seed*1.7))}
function hillPath(cx,hy,s,h,seed,off=0){ctx.beginPath();ctx.moveTo(cx-262*s+off,hy-14*s);for(let x=cx-250*s;x<=cx+280*s;x+=5*s)ctx.lineTo(x+off,hillY(cx,hy,s,h,seed,x));ctx.lineTo(cx+292*s+off,hy-14*s);ctx.closePath()}
function beach(cx,hy,s,dk,seed,x0=-360,x1=370,top=31){const rr=rng(seed+90);let g=ctx.createLinearGradient(0,hy-top*s,0,hy+8);g.addColorStop(0,dk?'#7E7254':'#F6E9BE');g.addColorStop(.7,dk?'#6B6146':'#EAD9A2');g.addColorStop(1,dk?'#4A4432':'#C9B47E');ctx.fillStyle=g;
  ctx.beginPath();ctx.moveTo(cx+x0*s,hy+8);ctx.bezierCurveTo(cx+(x0+60)*s,hy-(top-8)*s,cx+(x0+140)*s,hy-top*s,cx+(x0+210)*s,hy-top*s);ctx.lineTo(cx+(x1-200)*s,hy-top*s);ctx.bezierCurveTo(cx+(x1-120)*s,hy-(top-3)*s,cx+(x1-50)*s,hy-(top-11)*s,cx+x1*s,hy+8);ctx.closePath();ctx.fill();
  for(let i=0;i<16;i++){const x=cx+(x0+40+rr()*(x1-x0-80))*s,y=hy-rr()*14*s;ctx.fillStyle=dk?'rgba(0,0,0,.18)':'rgba(150,120,70,.25)';ctx.beginPath();ctx.ellipse(x,y,(1.5+rr()*2.5)*s,(1+rr())*s,0,0,7);ctx.fill()}}
function hill(cx,hy,s,h,dk,seed){const rr=rng(seed),t=performance.now();beach(cx,hy,s,dk,seed);
  // a darker ridge behind gives the island some depth
  hillPath(cx,hy,s,h*.82,seed+3,-46*s);ctx.fillStyle=dk?'#16301F':'#6FA866';ctx.fill();
  let g=ctx.createLinearGradient(0,hy-h*s,0,hy);g.addColorStop(0,dk?'#376A48':'#A2D083');g.addColorStop(1,dk?'#17311F':'#5E9452');ctx.fillStyle=g;hillPath(cx,hy,s,h,seed);ctx.fill();
  ctx.save();hillPath(cx,hy,s,h,seed);ctx.clip();
  // sunlit crest
  ctx.strokeStyle=dk?'rgba(140,200,150,.3)':'rgba(236,252,206,.85)';ctx.lineWidth=4*s;ctx.beginPath();for(let x=cx-250*s;x<=cx+280*s;x+=5*s){const y=hillY(cx,hy,s,h,seed,x)+1.6*s;x===cx-250*s?ctx.moveTo(x,y):ctx.lineTo(x,y)}ctx.stroke();
  // round bushes, lit from above
  for(let i=0;i<16;i++){const x=cx+(-220+rr()*480)*s,top=hillY(cx,hy,s,h,seed,x),y=top+(5+rr()*Math.max(2,(hy-22*s-top)/s-5))*s,r=(4+rr()*5)*s;
    ctx.fillStyle=dk?'#122C1C':'#4A8445';ctx.beginPath();ctx.arc(x,y,r,0,7);ctx.arc(x-r*.8,y+r*.3,r*.7,0,7);ctx.arc(x+r*.8,y+r*.3,r*.7,0,7);ctx.fill();
    ctx.fillStyle=dk?'rgba(120,190,130,.22)':'rgba(205,238,165,.75)';ctx.beginPath();ctx.arc(x-r*.25,y-r*.4,r*.5,0,7);ctx.fill()}
  ctx.globalAlpha=SA*(dk?.5:.95);for(let i=0;i<20;i++){const x=cx+(-200+rr()*440)*s,top=hillY(cx,hy,s,h,seed,x),y=top+(6+rr()*Math.max(1,(hy-22*s-top)/s-6))*s;ctx.fillStyle=['#F2C14E','#F28AA0','#FFFFFF'][i%3];ctx.beginPath();ctx.arc(x,y,1.7*s,0,7);ctx.fill()}ctx.globalAlpha=SA;
  ctx.restore();
  // grass on the crest, moving in the breeze
  ctx.strokeStyle=dk?'#2E5A3C':'#79B866';ctx.lineWidth=1.3*s;ctx.lineCap='round';
  for(let i=0;i<22;i++){const x=cx+(-232+i*23+rr()*10)*s,y=hillY(cx,hy,s,h,seed,x)+2.5*s,sw=Math.sin(t/800+i*.7)*2.4*s;for(const d of[-3,0,3]){ctx.beginPath();ctx.moveTo(x+d*s,y);ctx.quadraticCurveTo(x+d*1.3*s,y-4*s,x+d*1.6*s+sw,y-(7+Math.abs(d))*s);ctx.stroke()}}}
function glowS(x,y,r,col='255,200,110',al=.55){if(!(r>0))return;const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,`rgba(${col},${al})`);g.addColorStop(1,`rgba(${col},0)`);ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2)}
function smoke(x,y,s,t,dk,n=6,k=1){for(let i=0;i<n;i++){const u=((t/4200)+i/n)%1,r=k*(3+u*9)*s;ctx.fillStyle=dk?`rgba(170,170,185,${.32*(1-u)*SA})`:`rgba(255,255,255,${.78*(1-u)*SA})`;ctx.beginPath();ctx.arc(x+u*30*s*k+Math.sin(u*5+i)*3*s,y-u*52*s*k,r,0,7);ctx.fill()}}
function birdS(x,y,s,f,dk){ctx.strokeStyle=dk?'rgba(220,230,240,.65)':'rgba(40,52,64,.7)';ctx.lineWidth=1.6*s;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x-8*s,y-f*s);ctx.quadraticCurveTo(x-3.5*s,y-3*s,x,y);ctx.quadraticCurveTo(x+3.5*s,y-3*s,x+8*s,y-f*s);ctx.stroke()}
function butterfly(x,y,s,t,col){const f=Math.abs(Math.sin(t/70));ctx.fillStyle=col;ctx.beginPath();ctx.ellipse(x-2.5*s*f,y,3*s*f+.4,2.4*s,0,0,7);ctx.ellipse(x+2.5*s*f,y,3*s*f+.4,2.4*s,0,0,7);ctx.fill()}
function cyl(x,y,w,h){const g=ctx.createLinearGradient(x,0,x+w,0);g.addColorStop(0,'rgba(255,255,255,.14)');g.addColorStop(.45,'rgba(255,255,255,0)');g.addColorStop(1,'rgba(0,0,0,.24)');ctx.fillStyle=g;ctx.fillRect(x,y,w,h)}
function win(x,y,s,t,lit,dk,w=6,h=7){if(lit)glowS(x+w/2*s,y+h/2*s,15*s);ctx.fillStyle=lit?`rgba(255,214,130,${.85+.15*Math.sin(t/600+x)})`:(dk?'#2A3A48':'#5A7A8E');rrect(x,y,w*s,h*s,1.2*s);ctx.fill();
  ctx.strokeStyle=dk?'rgba(30,22,16,.8)':'rgba(255,255,255,.9)';ctx.lineWidth=1*s;ctx.beginPath();ctx.moveTo(x+w/2*s,y);ctx.lineTo(x+w/2*s,y+h*s);ctx.moveTo(x,y+h/2*s);ctx.lineTo(x+w*s,y+h/2*s);ctx.stroke()}
/* a cottage: shaded walls, an overhanging shingled roof, lit windows, maybe a smoking chimney */
function house(x,b,w,h,s,t,dk,lit,wall,roof,chim){
  let g=ctx.createLinearGradient(0,b-h,0,b);g.addColorStop(0,mixH(wall,'#FFFFFF',.12));g.addColorStop(1,mixH(wall,'#000000',.14));ctx.fillStyle=g;rrect(x,b-h,w,h,1.5*s);ctx.fill();
  ctx.fillStyle='rgba(0,0,0,.13)';ctx.fillRect(x+w*.8,b-h,w*.2,h);
  const rh=12*s+w*.16;if(chim){const chx=x+w*.68;ctx.fillStyle=mixH(wall,'#000000',.3);ctx.fillRect(chx,b-h-rh*.75,6*s,rh*.6);ctx.fillStyle=mixH(wall,'#000000',.45);ctx.fillRect(chx-1*s,b-h-rh*.78,8*s,2.5*s);smoke(chx+3*s,b-h-rh*.8,s,t+x*41,dk,5,.8)}
  ctx.fillStyle=roof;ctx.beginPath();ctx.moveTo(x-4*s,b-h+1.5*s);ctx.lineTo(x+w/2,b-h-rh);ctx.lineTo(x+w+4*s,b-h+1.5*s);ctx.closePath();ctx.fill();
  ctx.save();ctx.clip();ctx.fillStyle='rgba(0,0,0,.17)';ctx.beginPath();ctx.moveTo(x+w/2,b-h-rh);ctx.lineTo(x+w+5*s,b-h+2*s);ctx.lineTo(x+w/2,b-h+2*s);ctx.fill();
  ctx.strokeStyle='rgba(0,0,0,.14)';ctx.lineWidth=1;for(let yy=b-h-rh+5*s;yy<b-h;yy+=3.5*s){ctx.beginPath();ctx.moveTo(x-4*s,yy);ctx.lineTo(x+w+4*s,yy);ctx.stroke()}ctx.restore();
  ctx.strokeStyle=mixH(roof,'#000000',.3);ctx.lineWidth=1.3*s;ctx.lineJoin='round';ctx.beginPath();ctx.moveTo(x-4*s,b-h+1.5*s);ctx.lineTo(x+w/2,b-h-rh);ctx.lineTo(x+w+4*s,b-h+1.5*s);ctx.stroke();
  win(x+w*.18,b-h*.72,s,t,lit,dk);if(w>36*s)win(x+w*.62,b-h*.72,s,t,lit,dk);
  if(h>24*s){ctx.fillStyle=mixH(roof,'#000000',.4);const dw=Math.min(9*s,w*.2),dx=w>36*s?x+w*.42:x+w*.6;ctx.beginPath();ctx.moveTo(dx,b);ctx.lineTo(dx,b-h*.34);ctx.arc(dx+dw/2,b-h*.34,dw/2,Math.PI,0);ctx.lineTo(dx+dw,b);ctx.fill()}}
function crab(x,y,s,t){const st=Math.sin(t/90),dir=Math.cos(t/2600)>0?1:-1;ctx.save();ctx.translate(x,y);ctx.strokeStyle='#B5402E';ctx.lineWidth=1.2*s;
  for(const d of[-1,1])for(let k=0;k<3;k++){ctx.beginPath();ctx.moveTo(d*3*s,0);ctx.lineTo(d*(6+k)*s,(2+st*(k%2?1:-1))*s);ctx.stroke()}
  ctx.fillStyle='#D9553E';ctx.beginPath();ctx.ellipse(0,-1*s,5*s,3.4*s,0,0,7);ctx.fill();ctx.beginPath();ctx.arc(-6*s,-4*s+st*.6*s,2*s,0,7);ctx.arc(6*s,-4*s-st*.6*s,2*s,0,7);ctx.fill();
  ctx.fillStyle='#1A1A1A';ctx.fillRect(-2*s,-5*s,1.2*s,1.6*s);ctx.fillRect(1*s,-5*s,1.2*s,1.6*s);ctx.restore()}
const REFL={volcano:'#4E3C30',peak:'#6E7A82',cay:'#D9C894'};
/* behind the island: far islands on the horizon, the sun's glitter on the water, the island's reflection, birds */
function sceneBack(cx,hy,s,t,dk,D,k,gx){
  ctx.fillStyle=dk?'rgba(20,40,52,.55)':'rgba(70,120,140,.28)';[[.07,70,11],[.9,110,15],[.97,50,8]].forEach(([fx,w,h])=>{const x=W*fx;ctx.beginPath();ctx.moveTo(x-w*s,hy+1);ctx.quadraticCurveTo(x-w*.3*s,hy-h*s,x,hy-h*s);ctx.quadraticCurveTo(x+w*.4*s,hy-h*s,x+w*s,hy+1);ctx.fill()});
  const rc=REFL[k]||(dk?'#17311F':'#5E9452');ctx.strokeStyle=rc;ctx.lineCap='round';for(let i=0;i<14;i++){const f=i/14,y=hy+12*s+f*70*s,w=(260-f*120)*s;ctx.globalAlpha=SA*(dk?.16:.14)*(1-f);ctx.lineWidth=(2.4-f*1.2)*s;
    for(let j=0;j<5;j++){const x0=cx-w+j*w*.42+Math.sin(t/700+i*1.3+j)*8*s;ctx.beginPath();ctx.moveTo(x0,y);ctx.lineTo(x0+w*.3,y);ctx.stroke()}}ctx.globalAlpha=SA;
  const gc=D>.6?'255,250,225':'255,255,240';for(let i=0;i<34;i++){const f=hash(i,71),y=hy+6+f*f*(H-hy)*.55,sp=(10+f*90)*s,x=gx+(hash(i,72)-.5)*sp,a=Math.max(0,Math.sin(t/260+i*2.1));ctx.fillStyle=`rgba(${gc},${a*.75*SA*(dk?.6:1)})`;ctx.fillRect(x-(3+f*9)*s,y,(6+f*18)*s,1.4*s)}
  if(D<.7)for(let i=0;i<3;i++){const x=((t*.018+i*290)%(W+240))-120,y=hy*.28+i*16+Math.sin(t/900+i)*6;birdS(x,y,s*.8,Math.sin(t/130+i*2)*3,dk)}}
/* in front: a fish jumps now and then, a crab works the beach, fireflies come out at night */
function sceneFront(cx,hy,s,t,dk,D,lit){
  const P=6200,u=(t%P)/1100,fx=cx+(140+hash(Math.floor(t/P),3)*140)*s,fy=hy+46*s;
  if(u<1){const x=fx+u*44*s,y=fy-Math.sin(u*Math.PI)*34*s,a=Math.atan2(-Math.cos(u*Math.PI)*34,44);ctx.save();ctx.translate(x,y);ctx.rotate(a);ctx.fillStyle=dk?'#8FB4C4':'#5E8EA6';ctx.beginPath();ctx.ellipse(0,0,7*s,2.6*s,0,0,7);ctx.fill();ctx.beginPath();ctx.moveTo(-6*s,0);ctx.lineTo(-11*s,-3.5*s);ctx.lineTo(-11*s,3.5*s);ctx.fill();ctx.restore()}
  for(const[c,u0]of[[fx,0],[fx+44*s,1]]){const v=(u-u0+.05)/.8;if(v>0&&v<1){ctx.strokeStyle=`rgba(255,255,255,${(1-v)*.8*SA})`;ctx.lineWidth=1.4*s;ctx.beginPath();ctx.ellipse(c,fy,(4+v*16)*s,(1.5+v*4)*s,0,0,7);ctx.stroke()}}
  crab(cx+(170+Math.sin(t/2600)*70)*s,hy-3*s,s,t);
  if(lit)for(let i=0;i<14;i++){const x=cx+(hash(i,81)-.45)*440*s+Math.sin(t/1300+i)*14*s,y=hy-(20+hash(i,82)*70)*s+Math.cos(t/1100+i*2)*8*s,a=Math.max(0,Math.sin(t/500+i*1.7));glowS(x,y,7*s,'220,255,150',.5*a);ctx.fillStyle=`rgba(240,255,190,${a*SA})`;ctx.fillRect(x-1,y-1,2,2)}}

/* the sailor: a striped shirt and a red bandana; walks, hops, rows, cheers or sulks */
function sailorP(x,y,s,t,pose,face,ph){const dk=theme==='dark',ink=dk?'#1A1410':'#2A2018';ctx.save();ctx.translate(x,y);ctx.scale(s*face,s);
  let hop=0,tilt=0,hd=0;if(pose==='cheer')hop=Math.abs(Math.sin(t/150))*8;if(pose==='walk')hop=Math.abs(Math.sin(ph))*1.6;if(pose==='slump'){tilt=.14;hd=2.5}
  ctx.translate(0,-hop);ctx.rotate(tilt);ctx.strokeStyle=ink;ctx.lineWidth=2.6;ctx.lineCap='round';ctx.lineJoin='round';
  if(pose==='sit'){ctx.beginPath();ctx.moveTo(-1,-12);ctx.lineTo(6,-11);ctx.lineTo(7,-4);ctx.stroke()}
  else{const a=pose==='walk'?Math.sin(ph)*5:pose==='jump'?3.5:0;ctx.beginPath();ctx.moveTo(-1,-12);ctx.lineTo(-3+a,pose==='jump'?-3:0);ctx.moveTo(1,-12);ctx.lineTo(3-a,0);ctx.stroke()}
  ctx.fillStyle='#F4F0E6';rrect(-4.5,-25,9,14,2.5);ctx.fill();ctx.save();ctx.clip();ctx.fillStyle='#2D4E7A';for(let k=0;k<4;k++)ctx.fillRect(-5,-23+k*3.6,10,1.6);ctx.restore();
  ctx.lineWidth=2.2;ctx.strokeStyle='#E8B98A';const arm=(sx,ex,ey,mx,my)=>{ctx.beginPath();ctx.moveTo(sx,-22);mx!=null?ctx.quadraticCurveTo(mx,my,ex,ey):ctx.lineTo(ex,ey);ctx.stroke()};
  if(pose==='wave'){arm(-3.5,-5,-12);const w=Math.sin(t/170)*3.5;arm(3.5,8+w,-34,9,-24)}
  else if(pose==='cheer'){const w=Math.sin(t/110)*2;arm(-3.5,-9-w,-35);arm(3.5,9+w,-35)}
  else if(pose==='walk'){const a=Math.sin(ph)*4;arm(-3.5,-4-a,-13);arm(3.5,4+a,-13)}
  else if(pose==='jump'){arm(-3.5,-10,-31);arm(3.5,10,-31)}
  else if(pose==='shrug'){arm(-3.5,-10,-27,-9,-18);arm(3.5,10,-27,9,-18)}
  else if(pose==='sit'){const r=Math.sin(t/260)*4;arm(3.5,11+r,-17)}
  else{arm(-3.5,-4.5,-12);arm(3.5,4.5,-12)}
  ctx.fillStyle='#E8B98A';ctx.beginPath();ctx.arc(0,-29+hd,4.3,0,7);ctx.fill();
  ctx.fillStyle='#C8473F';ctx.beginPath();ctx.arc(0,-30+hd,4.6,Math.PI,0);ctx.fill();ctx.beginPath();ctx.moveTo(-4,-31+hd);ctx.lineTo(-8.5,-28.5+hd+Math.sin(t/200)*1.2);ctx.lineTo(-6.5,-27+hd);ctx.closePath();ctx.fill();
  ctx.fillStyle=ink;ctx.fillRect(1.6,-29.6+hd,1.2,1.5);if(pose==='cheer'){ctx.beginPath();ctx.arc(1.5,-26.5,1.4,0,Math.PI);ctx.fill()}
  ctx.restore()}
/* where the sailor is, ashore: off the ship (or out of the rowboat), along the jetty, and back again */
function crew(t,s,hy,bx,by,bs,bx0,jx,o){
  const spot=jx-16*s,far=o>0,deck=far?[bx0+40*s,hy+15*s]:[bx-56*bs,by-34*bs],land=far?bx0+40*s:bx0-20*s,W_=S.walk;
  let px=spot,py=hy+1*s,pose='wave',face=1,ph=0,inBoat=false,rowDx=0;
  if(W_){const u=(t-W_.t0)/1500;
    if(W_.dir==='in'&&u<0){px=deck[0];py=deck[1];inBoat=far;pose=far?'sit':'wave';if(far)rowDx=-Math.min(1,-u/.7)*80*s}
    else if(u<1){const k=W_.dir==='in'?u:1-u,he=.28;face=W_.dir==='in'?1:-1;
      if(k<he){const v=k/he;px=deck[0]+(land-deck[0])*v;py=deck[1]+(hy+1*s-deck[1])*v-Math.sin(v*Math.PI)*18*s;pose='jump';inBoat=far&&v<.12}
      else{const v=(k-he)/(1-he);px=land+(spot-land)*v;pose='walk';ph=t/85}}
    else if(W_.dir==='out'){px=deck[0];py=deck[1];inBoat=far;pose=far?'sit':'wave';face=-1;if(far)rowDx=-Math.min(1,(u-1)/.5)*80*s}}
  if(!W_||(W_.dir==='in'&&t-W_.t0>1500)){const r=S.react;if(r&&S.phase!=='question'){const d=t-r.t0;pose=r.i<=1?(d<2200?'cheer':'wave'):r.i<=3?'wave':r.i===BECALMED?'shrug':'slump'}}
  px+=inBoat?rowDx:0;
  if(far){if(inBoat){sailorP(px,py,s,t,pose,face,ph);rowS(bx0+40*s+rowDx,hy+20*s,s,t)}else{rowS(bx0+40*s+rowDx,hy+20*s,s,t);sailorP(px,py,s,t,pose,face,ph)}}
  else sailorP(px,py,s,t,pose,face,ph)}
const SCENE={
 port(cx,hy,s,t,dk,lit){hill(cx,hy,s,58,dk,201);const rr=rng(202),roofs=dk?['#5A342C','#463936','#3A4652','#5E4230']:['#B85C42','#9A5240','#6E7C88','#C7845A'],walls=dk?['#8C8478','#7A7468','#948A7A']:['#F4EAD6','#EADCC0','#F8F0E0'];
   const hs=[];let x=cx-190*s;while(x<cx+200*s){const w=(30+rr()*22)*s,h=(26+rr()*22)*s,b=hy-30*s-rr()*14*s;hs.push([x,b,w,h,walls[Math.floor(rr()*3)],roofs[Math.floor(rr()*4)],rr()<.45]);x+=w+4*s;if(Math.abs(x-cx)<30*s){hs.push(['tower',x]);x+=30*s}}
   // bunting strung over the rooftops
   const by=hy-92*s,sw=Math.sin(t/900)*3*s;ctx.strokeStyle=dk?'rgba(200,190,170,.5)':'rgba(90,70,50,.6)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(cx-170*s,by);ctx.quadraticCurveTo(cx-80*s,by+22*s+sw,cx+10*s,by-18*s);ctx.stroke();
   for(let k=1;k<12;k++){const u=k/12,qx=(1-u)*(1-u)*(cx-170*s)+2*u*(1-u)*(cx-80*s)+u*u*(cx+10*s),qy=(1-u)*(1-u)*by+2*u*(1-u)*(by+22*s+sw)+u*u*(by-18*s);ctx.fillStyle=['#E8553E','#F2C14E','#2D7DA8','#FBF8F0'][k%4];ctx.beginPath();ctx.moveTo(qx-3*s,qy);ctx.lineTo(qx+3*s,qy);ctx.lineTo(qx+Math.sin(t/300+k)*1.5*s,qy+8*s);ctx.fill()}
   hs.forEach(q=>{if(q[0]!=='tower')return house(q[0],q[1],q[2],q[3],s,t,dk,lit,q[4],q[5],q[6]);
     const x=q[1],w=26*s,top=hy-120*s;let g=ctx.createLinearGradient(0,top,0,hy-30*s);g.addColorStop(0,walls[2]);g.addColorStop(1,mixH(walls[0],'#000000',.12));ctx.fillStyle=g;ctx.fillRect(x,top,w,90*s);cyl(x,top,w,90*s);
     ctx.fillStyle=roofs[2];ctx.beginPath();ctx.moveTo(x-4*s,top);ctx.lineTo(x+w/2,top-44*s);ctx.lineTo(x+w+4*s,top);ctx.fill();ctx.fillStyle='rgba(0,0,0,.2)';ctx.beginPath();ctx.moveTo(x+w/2,top-44*s);ctx.lineTo(x+w+4*s,top);ctx.lineTo(x+w/2,top);ctx.fill();
     ctx.fillStyle='#E9C46A';ctx.beginPath();ctx.arc(x+w/2,top-46*s,2.4*s,0,7);ctx.fill();
     // a clock with moving hands, and the bell in its arch
     const kx=x+w/2,ky=top+16*s;if(lit)glowS(kx,ky,20*s);ctx.fillStyle=lit?'#FFF0C8':'#FBF8F0';ctx.beginPath();ctx.arc(kx,ky,7*s,0,7);ctx.fill();ctx.strokeStyle='#2A2018';ctx.lineWidth=1.2*s;ctx.stroke();
     ctx.lineWidth=1.3*s;ctx.beginPath();ctx.moveTo(kx,ky);ctx.lineTo(kx+Math.sin(t/9000)*4*s,ky-Math.cos(t/9000)*4*s);ctx.moveTo(kx,ky);ctx.lineTo(kx+Math.sin(t/750)*5.5*s,ky-Math.cos(t/750)*5.5*s);ctx.stroke();
     ctx.fillStyle=dk?'#1A1814':'#3A3028';ctx.beginPath();ctx.moveTo(x+7*s,top+46*s);ctx.lineTo(x+7*s,top+36*s);ctx.arc(kx,top+36*s,6*s,Math.PI,0);ctx.lineTo(x+19*s,top+46*s);ctx.fill();
     ctx.save();ctx.translate(kx,top+32*s);ctx.rotate(Math.sin(t/700)*.25);ctx.fillStyle='#C9A043';ctx.beginPath();ctx.moveTo(-4*s,9*s);ctx.quadraticCurveTo(-4*s,0,0,0);ctx.quadraticCurveTo(4*s,0,4*s,9*s);ctx.fill();ctx.restore()})},
 fort(cx,hy,s,t,dk,lit){hill(cx,hy,s,60,dk,351);const st=dk?'#6E6A60':'#D6CCB2',sd=dk?'#45423B':'#A89C80',b=hy-54*s;
   const wall=(x,y,w,h)=>{const g=ctx.createLinearGradient(0,y,0,y+h);g.addColorStop(0,mixH(st,'#FFFFFF',.12));g.addColorStop(1,sd);ctx.fillStyle=g;ctx.fillRect(x,y,w,h);
     ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();ctx.strokeStyle='rgba(0,0,0,.13)';ctx.lineWidth=1;for(let r=0,yy=y+7*s;yy<y+h+7*s;yy+=7*s,r++){ctx.beginPath();ctx.moveTo(x,yy);ctx.lineTo(x+w,yy);ctx.stroke();for(let xx=x+(r%2?7:0)*s;xx<x+w;xx+=14*s){ctx.beginPath();ctx.moveTo(xx,yy-7*s);ctx.lineTo(xx,yy);ctx.stroke()}}ctx.restore()};
   const merl=(x,y,w,n)=>{const mw=w/(n*2-1);for(let k=0;k<n;k++){const g=ctx.createLinearGradient(0,y-9*s,0,y);g.addColorStop(0,mixH(st,'#FFFFFF',.15));g.addColorStop(1,st);ctx.fillStyle=g;rrect(x+k*2*mw,y-9*s,mw,10*s,1.8*s);ctx.fill()}};
   wall(cx-105*s,b-40*s,210*s,40*s);merl(cx-105*s,b-40*s,210*s,10);
   ctx.fillStyle=dk?'#1A1814':'#4A3E2C';ctx.beginPath();ctx.moveTo(cx-16*s,b);ctx.lineTo(cx-16*s,b-20*s);ctx.arc(cx,b-20*s,16*s,Math.PI,0);ctx.lineTo(cx+16*s,b);ctx.fill();
   ctx.strokeStyle=dk?'#4A3E30':'#7A5E40';ctx.lineWidth=1.6*s;for(let k=-12;k<=12;k+=6){ctx.beginPath();ctx.moveTo(cx+k*s,b-6*s);ctx.lineTo(cx+k*s,b-20*s-Math.sqrt(Math.max(0,256-k*k))*s+2*s);ctx.stroke()}ctx.beginPath();ctx.moveTo(cx-15*s,b-14*s);ctx.lineTo(cx+15*s,b-14*s);ctx.stroke();
   ctx.strokeStyle=sd;ctx.lineWidth=3*s;ctx.beginPath();ctx.arc(cx,b-20*s,18.5*s,Math.PI,0);ctx.stroke();
   [-1,1].forEach(d=>{const x=cx+d*118*s;wall(x-23*s,b-76*s,46*s,76*s);cyl(x-23*s,b-76*s,46*s,76*s);merl(x-25*s,b-76*s,50*s,4);
     win(x-4*s,b-58*s,s,t,lit,dk,8,13)});
   // cannons, one firing every couple of seconds
   [-70,-40,40,70].forEach((dx,i)=>{const x=cx+dx*s,y=b-27*s;ctx.fillStyle='#22201C';rrect(x-6*s,y-2.5*s,13*s,5*s,2.4*s);ctx.fill();ctx.beginPath();ctx.arc(x-6*s,y,3.2*s,0,7);ctx.fill();
     const u=((t+i*2300)%9200)/1500;if(u<1){if(u<.1)glowS(x+9*s,y,16*s,'255,220,140',(1-u/.1)*.9);for(let k=0;k<4;k++){ctx.fillStyle=`rgba(${dk?'190,190,195':'255,255,255'},${.7*(1-u)*SA})`;ctx.beginPath();ctx.arc(x+(10+u*28+k*5)*s,y-u*16*s-k*3*s,(4+u*13+k*2)*s,0,7);ctx.fill()}}});
   const fx=cx-118*s,ft=b-128*s;ctx.strokeStyle='#3A2A1C';ctx.lineWidth=2*s;ctx.beginPath();ctx.moveTo(fx,b-84*s);ctx.lineTo(fx,ft);ctx.stroke();
   ctx.fillStyle='#2D4E7A';ctx.beginPath();ctx.moveTo(fx,ft);for(let k=0;k<=8;k++){const u=k/8;ctx.lineTo(fx+u*28*s,ft+Math.sin(t/180-u*4)*3*s*u)}for(let k=8;k>=0;k--){const u=k/8;ctx.lineTo(fx+u*28*s,ft+16*s-u*3*s+Math.sin(t/180-u*4)*3*s*u)}ctx.closePath();ctx.fill()},
 temple(cx,hy,s,t,dk,lit){hill(cx,hy,s,64,dk,421);palmS(cx-200*s,hy-22*s,96*s,-.4,t);palmS(cx+220*s,hy-22*s,88*s,.4,t);const st=dk?'#9A9284':'#EFE7D2',sh=dk?'#5E584E':'#B8AA88',x=cx+10*s,b=hy-60*s;
   const blk=(X,Y,w,h)=>{const g=ctx.createLinearGradient(0,Y,0,Y+h);g.addColorStop(0,st);g.addColorStop(1,sh);ctx.fillStyle=g;rrect(X,Y,w,h,1.6*s);ctx.fill()};
   blk(x-106*s,b-10*s,212*s,12*s);blk(x-96*s,b-20*s,192*s,10*s);
   for(let k=0;k<6;k++){if(k===4)continue;const px=x-80*s+k*32*s,h=k===1?48*s:74*s,top=b-20*s-h;const g=ctx.createLinearGradient(px-7*s,0,px+7*s,0);g.addColorStop(0,sh);g.addColorStop(.35,st);g.addColorStop(1,mixH(sh,'#000000',.1));ctx.fillStyle=g;ctx.fillRect(px-7*s,top,14*s,h);
     ctx.strokeStyle='rgba(0,0,0,.12)';ctx.lineWidth=1;for(let l=-1;l<=1;l++){ctx.beginPath();ctx.moveTo(px+l*3.5*s,top+4*s);ctx.lineTo(px+l*3.5*s,top+h);ctx.stroke()}
     if(k===1){ctx.fillStyle=st;ctx.beginPath();ctx.moveTo(px-7*s,top);ctx.lineTo(px-3*s,top-6*s);ctx.lineTo(px+1*s,top-2*s);ctx.lineTo(px+7*s,top-7*s);ctx.lineTo(px+7*s,top);ctx.fill()}else blk(px-10*s,top-5*s,20*s,6*s)}
   blk(x-98*s,b-104*s,128*s,10*s);ctx.fillStyle=st;ctx.beginPath();ctx.moveTo(x-98*s,b-104*s);ctx.lineTo(x-34*s,b-129*s);ctx.lineTo(x+30*s,b-104*s);ctx.closePath();ctx.fill();ctx.strokeStyle=sh;ctx.lineWidth=2*s;ctx.lineJoin='round';ctx.stroke();
   ctx.fillStyle=mixH(st,sh,.4);ctx.beginPath();ctx.moveTo(x-80*s,b-106*s);ctx.lineTo(x-34*s,b-123*s);ctx.lineTo(x+12*s,b-106*s);ctx.fill();
   // fallen drums in the grass
   [[x+60*s,b-8*s,0],[x+84*s,b-4*s,.4]].forEach(([dx,dy,r])=>{ctx.save();ctx.translate(dx,dy);ctx.rotate(r);const g=ctx.createLinearGradient(0,-7*s,0,7*s);g.addColorStop(0,st);g.addColorStop(1,sh);ctx.fillStyle=g;rrect(-12*s,-7*s,24*s,14*s,3*s);ctx.fill();ctx.fillStyle=sh;ctx.beginPath();ctx.ellipse(12*s,0,3.5*s,7*s,0,0,7);ctx.fill();ctx.restore()});
   // vines that sway, and dust drifting in the light
   ctx.strokeStyle=dk?'#2E5A3C':'#5E9452';ctx.lineWidth=2*s;ctx.lineCap='round';for(let k=0;k<5;k++){const vx=x-84*s+k*30*s,sw=Math.sin(t/1100+k)*4*s,len=k===1?30:50;ctx.beginPath();ctx.moveTo(vx,b-96*s);ctx.bezierCurveTo(vx+6*s,b-84*s,vx-4*s+sw,b-70*s,vx+sw*1.5,b-(96-len)*s);ctx.stroke();
     for(let l=0;l<4;l++){const u=.2+l*.22,lx=vx+sw*u*1.5+(l%2?4:-4)*s,ly=b-96*s+u*len*s;ctx.fillStyle=dk?'#3E7A4E':'#7BB866';ctx.beginPath();ctx.ellipse(lx,ly,3.6*s,2*s,l%2?.6:-.6,0,7);ctx.fill()}}
   for(let k=0;k<12;k++){const u=((t/7000)+k/12)%1;ctx.fillStyle=`rgba(255,240,190,${Math.sin(u*Math.PI)*.8*SA})`;ctx.beginPath();ctx.arc(x-90*s+hash(k,5)*180*s+Math.sin(t/900+k)*6*s,b-20*s-u*90*s,1.4*s,0,7);ctx.fill()}
   if(!lit)for(let k=0;k<2;k++)butterfly(x+Math.sin(t/1700+k*3)*90*s,b-40*s+Math.cos(t/1300+k)*26*s,s,t+k*40,k?'#F2C14E':'#FBF8F0')},
 light(cx,hy,s,t,dk,lit){hill(cx,hy,s,44,dk,301);const rr=rng(302);for(let i=0;i<9;i++){const x=cx+(rr()-.3)*380*s,y=hy-(10+rr()*30)*s,w=(18+rr()*26)*s,g=ctx.createLinearGradient(0,y-w*.55,0,y);g.addColorStop(0,dk?'#5E6A66':'#BEC1B8');g.addColorStop(1,dk?'#2E3634':'#7E817A');ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(x,y,w,w*.55,0,Math.PI,0);ctx.fill();
     ctx.fillStyle=dk?'rgba(255,255,255,.07)':'rgba(255,255,255,.4)';ctx.beginPath();ctx.ellipse(x-w*.3,y-w*.34,w*.34,w*.11,-.15,0,7);ctx.fill()}
   const x=cx+50*s,b=hy-40*s,h=150*s,lamp=b-h-14*s;
   if(lit){const sw=Math.cos(t/1500);for(const d of[-1,1]){const len=W*.9,dir=d*sw;ctx.fillStyle=`rgba(255,240,180,${.28*Math.abs(dir)*SA})`;ctx.beginPath();ctx.moveTo(x,lamp);ctx.lineTo(x+dir*len,lamp-40*s);ctx.lineTo(x+dir*len,lamp+40*s);ctx.closePath();ctx.fill()}}
   house(cx-44*s,hy-38*s,52*s,30*s,s,t,dk,lit,dk?'#8C8478':'#F4EAD6','#B85C42',true);
   ctx.beginPath();ctx.moveTo(x-16*s,b);ctx.lineTo(x-11*s,b-h);ctx.lineTo(x+11*s,b-h);ctx.lineTo(x+16*s,b);ctx.closePath();ctx.fillStyle='#F6F2E8';ctx.fill();ctx.save();ctx.clip();ctx.fillStyle='#C8473F';for(let k=0;k<4;k++)ctx.fillRect(x-20*s,b-h+k*38*s+10*s,40*s,18*s);cyl(x-16*s,b-h,32*s,h);ctx.restore();
   win(x-3*s,b-h*.55,s,t,lit,dk,6,9);
   ctx.fillStyle='#2A2E33';rrect(x-18*s,b-h-4*s,36*s,5*s,1.5*s);ctx.fill();ctx.strokeStyle='#2A2E33';ctx.lineWidth=1*s;ctx.beginPath();ctx.moveTo(x-17*s,b-h-11*s);ctx.lineTo(x+17*s,b-h-11*s);for(let k=-16;k<=16;k+=5.3){ctx.moveTo(x+k*s,b-h-4*s);ctx.lineTo(x+k*s,b-h-11*s)}ctx.stroke();
   glowS(x,lamp,lit?44*s:16*s,'255,236,160',lit?.95:.6);ctx.fillStyle=lit?'#FFE9A0':'#CFE4EA';ctx.fillRect(x-8*s,lamp-8*s,16*s,14*s);ctx.strokeStyle='#2A2E33';ctx.lineWidth=1.2*s;ctx.strokeRect(x-8*s,lamp-8*s,16*s,14*s);ctx.beginPath();ctx.moveTo(x,lamp-8*s);ctx.lineTo(x,lamp+6*s);ctx.stroke();
   ctx.fillStyle='#C8473F';ctx.beginPath();ctx.moveTo(x-11*s,lamp-8*s);ctx.quadraticCurveTo(x-9*s,lamp-22*s,x,lamp-24*s);ctx.quadraticCurveTo(x+9*s,lamp-22*s,x+11*s,lamp-8*s);ctx.fill();ctx.fillStyle='#2A2E33';ctx.beginPath();ctx.arc(x,lamp-25*s,2*s,0,7);ctx.fill();
   for(let i=0;i<3;i++){const q=t/2600+i*2.1,gx=x+Math.cos(q)*(70+i*16)*s,gy=lamp+20*s+Math.sin(q)*22*s;birdS(gx,gy,s*.9,Math.sin(t/140+i)*3,dk)}},
 mill(cx,hy,s,t,dk,lit){hill(cx,hy,s,58,dk,411);ctx.save();hillPath(cx,hy,s,58,411);ctx.clip();
   const cols=dk?['#5C5A2C','#3E5A30','#6A5A34']:['#E8CA62','#A8C872','#DCAA50'];for(let k=0;k<8;k++){const x0=cx-300*s+k*78*s;ctx.fillStyle=cols[k%3];ctx.beginPath();ctx.moveTo(x0,hy);ctx.quadraticCurveTo(x0+34*s,hy-40*s,x0+80*s,hy-80*s);ctx.lineTo(x0+158*s,hy-80*s);ctx.quadraticCurveTo(x0+112*s,hy-40*s,x0+78*s,hy);ctx.closePath();ctx.fill();
     ctx.strokeStyle='rgba(0,0,0,.08)';ctx.lineWidth=1;for(let r=1;r<6;r++){const f=r/6;ctx.beginPath();ctx.moveTo(x0+78*s*f,hy);ctx.quadraticCurveTo(x0+(34+78*f)*s,hy-40*s,x0+(80+78*f)*s,hy-80*s);ctx.stroke()}}
   // a gust rolling across the wheat
   const gx=cx+((((t/5200)%1)*900)-450)*s,g=ctx.createLinearGradient(gx-90*s,0,gx+90*s,0);g.addColorStop(0,'rgba(255,255,220,0)');g.addColorStop(.5,dk?'rgba(255,255,220,.1)':'rgba(255,255,230,.32)');g.addColorStop(1,'rgba(255,255,220,0)');ctx.fillStyle=g;ctx.fillRect(gx-90*s,hy-90*s,180*s,90*s);ctx.restore();
   [[cx-40*s,1],[cx+90*s,.8]].forEach(([x,f],i)=>{const b=hy-48*s,h=96*s*f,wall=dk?'#CFC6B2':'#F6F1E6';let g=ctx.createLinearGradient(0,b-h,0,b);g.addColorStop(0,wall);g.addColorStop(1,mixH(wall,'#000000',.15));ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(x-16*s*f,b);ctx.lineTo(x-10*s*f,b-h);ctx.lineTo(x+10*s*f,b-h);ctx.lineTo(x+16*s*f,b);ctx.closePath();ctx.fill();cyl(x-16*s*f,b-h,32*s*f,h);
     ctx.fillStyle='#B05C44';ctx.beginPath();ctx.moveTo(x-13*s*f,b-h);ctx.quadraticCurveTo(x-10*s*f,b-h-16*s*f,x,b-h-19*s*f);ctx.quadraticCurveTo(x+10*s*f,b-h-16*s*f,x+13*s*f,b-h);ctx.fill();
     win(x-3*s*f,b-h*.55,s*f,t,lit,dk,6,8);ctx.fillStyle='#5A4632';ctx.beginPath();ctx.moveTo(x-5*s*f,b);ctx.lineTo(x-5*s*f,b-10*s*f);ctx.arc(x,b-10*s*f,5*s*f,Math.PI,0);ctx.lineTo(x+5*s*f,b);ctx.fill();
     ctx.save();ctx.translate(x,b-h+4*s*f);ctx.rotate(t/900+i);for(let k=0;k<4;k++){ctx.rotate(Math.PI/2);ctx.strokeStyle='#5A4632';ctx.lineWidth=2*s*f;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,-64*s*f);ctx.stroke();
       ctx.fillStyle=dk?'rgba(200,190,170,.85)':'rgba(255,252,244,.95)';rrect(1*s*f,-62*s*f,10*s*f,50*s*f,1.5*s*f);ctx.fill();ctx.strokeStyle='#8A7A60';ctx.lineWidth=.8;ctx.stroke();ctx.beginPath();for(let r=1;r<5;r++){ctx.moveTo(1*s*f,(-62+r*10)*s*f);ctx.lineTo(11*s*f,(-62+r*10)*s*f)}ctx.stroke()}ctx.restore();
     ctx.fillStyle='#5A4632';ctx.beginPath();ctx.arc(x,b-h+4*s*f,4*s*f,0,7);ctx.fill()});palmS(cx-210*s,hy-20*s,80*s,-.4,t);
   if(!lit)for(let k=0;k<3;k++)butterfly(cx+Math.sin(t/1900+k*2)*160*s,hy-50*s+Math.cos(t/1400+k*3)*18*s,s,t+k*55,['#FBF8F0','#F2A33A','#F28AA0'][k])},
 cay(cx,hy,s,t,dk,lit){beach(cx,hy,s,dk,601,-270,280,30);
   // tide pools catching the light
   [[-60,-8,26],[70,-12,18]].forEach(([dx,dy,w])=>{ctx.fillStyle=dk?'#2A5A66':'#8FD3DA';ctx.beginPath();ctx.ellipse(cx+dx*s,hy+dy*s,w*s,4*s,0,0,7);ctx.fill();ctx.fillStyle=`rgba(255,255,255,${(.4+.4*Math.sin(t/400+dx))*SA})`;ctx.fillRect(cx+(dx-w*.4)*s,hy+(dy-1.5)*s,w*.4*s,1.2*s)});
   [[-150,-6,14],[-134,-4,9],[190,-6,12]].forEach(([dx,dy,w])=>{const g=ctx.createLinearGradient(0,hy+(dy-w*.6)*s,0,hy+dy*s);g.addColorStop(0,dk?'#6A706C':'#B8BBB2');g.addColorStop(1,dk?'#3A403C':'#7E817A');ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(cx+dx*s,hy+dy*s,w*s,w*.6*s,0,Math.PI,0);ctx.fill()});
   palmS(cx+30*s,hy-24*s,120*s,.25,t);palmS(cx+80*s,hy-20*s,90*s,.5,t);palmS(cx-30*s,hy-22*s,70*s,-.35,t);
   ctx.fillStyle='#6A4A2A';[[cx+18*s,hy-22*s],[cx+28*s,hy-21*s]].forEach(([x,y])=>{ctx.beginPath();ctx.arc(x,y,4*s,0,7);ctx.fill()});
   ctx.fillStyle='#F28A5A';ctx.save();ctx.translate(cx+120*s,hy-10*s);ctx.rotate(t/9000);ctx.beginPath();for(let k=0;k<10;k++){const r=(k%2?2.2:6)*s,a=k*Math.PI/5;ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r)}ctx.fill();ctx.restore();
   ctx.fillStyle=dk?'#8A8478':'#F8F2E6';[[-120,-14],[150,-12],[-200,-4]].forEach(([dx,dy])=>{ctx.beginPath();ctx.ellipse(cx+dx*s,hy+dy*s,5*s,3*s,0,Math.PI,0);ctx.fill()});
   for(let i=0;i<6;i++){const q=t/3000+i*1.05,gx=cx+Math.cos(q)*220*s,gy=hy-120*s+Math.sin(q*1.3)*50*s;birdS(gx,gy,s,Math.sin(t/160+i)*4,dk)}},
 fisher(cx,hy,s,t,dk,lit){hill(cx,hy,s,46,dk,321);palmS(cx-190*s,hy-24*s,86*s,-.4,t);
   const px=cx-60*s,pb=hy-40*s,nw=Math.sin(t/1400)*3*s;ctx.strokeStyle='#5A3E26';ctx.lineWidth=3*s;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(px-50*s,pb);ctx.lineTo(px-50*s,pb-58*s);ctx.moveTo(px+50*s,pb);ctx.lineTo(px+50*s,pb-58*s);ctx.stroke();
   ctx.strokeStyle=dk?'rgba(200,190,160,.6)':'rgba(90,70,40,.55)';ctx.lineWidth=1;for(let k=0;k<=10;k++){const x=px-50*s+k*10*s;ctx.beginPath();ctx.moveTo(x,pb-54*s);ctx.quadraticCurveTo(x+nw*.5,pb-30*s,x+(k-5)*s+nw,pb-14*s-Math.sin(k/10*Math.PI)*6*s);ctx.stroke()}
   for(let k=0;k<5;k++){const y=pb-50*s+k*9*s,o=nw*k/5;ctx.beginPath();ctx.moveTo(px-50*s,y);ctx.quadraticCurveTo(px+o,y+12*s,px+50*s,y);ctx.stroke()}
   ctx.fillStyle='#F2C14E';for(const[a,b]of[[-30,-46],[20,-30]]){ctx.beginPath();ctx.arc(px+a*s+nw,pb+b*s,3.5*s,0,7);ctx.fill()}
   // fish hung out to dry, swinging on a line
   ctx.strokeStyle=dk?'rgba(200,190,160,.6)':'rgba(70,50,30,.7)';ctx.beginPath();ctx.moveTo(px+50*s,pb-50*s);ctx.quadraticCurveTo(px+75*s,pb-40*s,px+98*s,hy-74*s);ctx.stroke();
   for(let k=0;k<4;k++){const u=(k+1)/5,fx=px+50*s+u*48*s,fy=pb-50*s+u*(1-u)*20*s+u*(hy-74*s-pb+50*s),a=Math.sin(t/600+k)*.25;ctx.save();ctx.translate(fx,fy);ctx.rotate(a);ctx.fillStyle=dk?'#8FA4AC':'#7E9AA6';ctx.beginPath();ctx.ellipse(0,8*s,2.6*s,7*s,0,0,7);ctx.fill();ctx.beginPath();ctx.moveTo(0,14*s);ctx.lineTo(-3*s,18*s);ctx.lineTo(3*s,18*s);ctx.fill();ctx.restore()}
   [[90,0],[175,-6],[260,4]].forEach(([dx,dy],i)=>{const x=cx+dx*s,base=hy+12*s,top=hy-30*s+dy*s;ctx.fillStyle='#4A3420';for(const o of[-18,-6,6,18])ctx.fillRect(x+o*s,top,3*s,base-top);
     ctx.strokeStyle='#4A3420';ctx.lineWidth=1.4*s;ctx.beginPath();ctx.moveTo(x-18*s,top+8*s);ctx.lineTo(x+20*s,base-6*s);ctx.moveTo(x+20*s,top+8*s);ctx.lineTo(x-18*s,base-6*s);ctx.stroke();
     const wall=dk?'#6A4A2A':'#BC8E60';let g=ctx.createLinearGradient(0,top-34*s,0,top);g.addColorStop(0,mixH(wall,'#FFFFFF',.1));g.addColorStop(1,mixH(wall,'#000000',.15));ctx.fillStyle=g;rrect(x-24*s,top-34*s,48*s,35*s,1.5*s);ctx.fill();
     ctx.strokeStyle='rgba(0,0,0,.15)';ctx.lineWidth=1;for(let k=-18;k<24;k+=6){ctx.beginPath();ctx.moveTo(x+k*s,top-33*s);ctx.lineTo(x+k*s,top);ctx.stroke()}
     win(x-6*s,top-25*s,s,t,lit,dk,12,11);
     if(i===1)smoke(x+10*s,top-56*s,s,t,dk,5,.8);
     const th=dk?'#7A6038':'#CCA464';ctx.fillStyle=th;ctx.beginPath();ctx.moveTo(x-34*s,top-30*s);ctx.quadraticCurveTo(x-14*s,top-50*s,x,top-60*s);ctx.quadraticCurveTo(x+14*s,top-50*s,x+34*s,top-30*s);ctx.quadraticCurveTo(x,top-27*s,x-34*s,top-30*s);ctx.fill();
     ctx.strokeStyle='rgba(70,45,10,.35)';ctx.lineWidth=1;for(let k=-30;k<=30;k+=4){ctx.beginPath();ctx.moveTo(x+k*s,top-30*s+Math.abs(k)*.05*s);ctx.lineTo(x+k*.35*s,top-52*s+Math.abs(k)*.2*s);ctx.stroke()}
     ctx.fillStyle='rgba(0,0,0,.14)';ctx.beginPath();ctx.moveTo(x,top-60*s);ctx.quadraticCurveTo(x+14*s,top-50*s,x+34*s,top-30*s);ctx.lineTo(x,top-29*s);ctx.fill();
     if(i<2){ctx.fillStyle=dk?'#5A4A36':'#9C7A52';ctx.fillRect(x+24*s,top-4*s,(85-48)*s,4*s)}});
   ctx.save();ctx.translate(cx+20*s,hy-18*s);ctx.rotate(.06+Math.sin(t/1500)*.03);ctx.fillStyle='#2F5D7A';ctx.beginPath();ctx.moveTo(-34*s,-6*s);ctx.lineTo(34*s,-6*s);ctx.quadraticCurveTo(26*s,6*s,0,7*s);ctx.quadraticCurveTo(-26*s,6*s,-34*s,-6*s);ctx.fill();ctx.strokeStyle='#F4EFE3';ctx.lineWidth=1.3*s;ctx.beginPath();ctx.moveTo(-32*s,-3*s);ctx.lineTo(32*s,-3*s);ctx.stroke();ctx.restore()},
 cove(cx,hy,s,t,dk,lit){hill(cx,hy,s,48,dk,311);palmS(cx-200*s,hy-22*s,96*s,-.45,t);palmS(cx-120*s,hy-40*s,110*s,-.15,t);palmS(cx+110*s,hy-38*s,104*s,.2,t);palmS(cx+215*s,hy-24*s,98*s,.4,t);
   const sag=Math.sin(t/1200)*3*s;ctx.strokeStyle=dk?'#B8AE96':'#E8DCC0';ctx.lineWidth=3*s;ctx.beginPath();ctx.moveTo(cx+118*s,hy-92*s);ctx.quadraticCurveTo(cx+165*s,hy-58*s+sag,cx+212*s,hy-90*s);ctx.stroke();ctx.strokeStyle='#C2413B';ctx.lineWidth=1.5*s;ctx.beginPath();ctx.moveTo(cx+130*s,hy-84*s);ctx.quadraticCurveTo(cx+165*s,hy-60*s+sag,cx+200*s,hy-83*s);ctx.stroke();
   const x=cx-10*s,b=hy-44*s;ctx.fillStyle=dk?'#6A5236':'#C9A26A';ctx.fillRect(x-36*s,b-34*s,72*s,34*s);ctx.fillStyle=dk?'#2A1E14':'#4A3420';ctx.fillRect(x-8*s,b-22*s,16*s,22*s);if(lit){ctx.fillStyle='#FFD98A';ctx.fillRect(x+16*s,b-24*s,10*s,9*s)}
   ctx.fillStyle=dk?'#7A6038':'#B58A4A';ctx.beginPath();ctx.moveTo(x-50*s,b-30*s);ctx.lineTo(x,b-70*s);ctx.lineTo(x+50*s,b-30*s);ctx.closePath();ctx.fill();ctx.strokeStyle='rgba(60,40,10,.35)';ctx.lineWidth=1;for(let k=-46;k<=46;k+=6){ctx.beginPath();ctx.moveTo(x+k*s,b-30*s);ctx.lineTo(x+k*.4*s,b-44*s);ctx.stroke()}
   const fx=cx+40*s,fy=hy-34*s;ctx.strokeStyle='#5A3E26';ctx.lineWidth=3*s;ctx.beginPath();ctx.moveTo(fx-9*s,fy);ctx.lineTo(fx+9*s,fy-4*s);ctx.moveTo(fx+9*s,fy);ctx.lineTo(fx-9*s,fy-4*s);ctx.stroke();
   if(lit){const g=ctx.createRadialGradient(fx,fy-6*s,0,fx,fy-6*s,50*s);g.addColorStop(0,'rgba(255,170,80,.5)');g.addColorStop(1,'rgba(255,170,80,0)');ctx.fillStyle=g;ctx.fillRect(fx-50*s,fy-56*s,100*s,100*s)}
   const fl=1+.25*Math.sin(t/90);ctx.fillStyle='#F39A2E';ctx.beginPath();ctx.moveTo(fx-6*s,fy-2*s);ctx.quadraticCurveTo(fx,fy-20*s*fl,fx+6*s,fy-2*s);ctx.fill();ctx.fillStyle='#FFE08A';ctx.beginPath();ctx.moveTo(fx-3*s,fy-2*s);ctx.quadraticCurveTo(fx,fy-11*s*fl,fx+3*s,fy-2*s);ctx.fill()},
 wreck(cx,hy,s,t,dk,lit){hill(cx,hy,s,34,dk,331);palmS(cx-210*s,hy-22*s,90*s,-.4,t);palmS(cx+220*s,hy-20*s,84*s,.35,t);
   ctx.save();ctx.translate(cx+20*s,hy-30*s);ctx.rotate(-.16);const wood=dk?'#3A2414':'#6E4526';ctx.fillStyle=wood;ctx.beginPath();ctx.moveTo(-130*s,-40*s);ctx.lineTo(120*s,-52*s);ctx.quadraticCurveTo(110*s,-4*s,70*s,6*s);ctx.lineTo(-100*s,6*s);ctx.quadraticCurveTo(-126*s,-10*s,-130*s,-40*s);ctx.fill();
   ctx.strokeStyle='rgba(0,0,0,.35)';ctx.lineWidth=1.2;for(let k=0;k<4;k++){ctx.beginPath();ctx.moveTo(-124*s,-32*s+k*10*s);ctx.lineTo(112*s,-42*s+k*10*s);ctx.stroke()}
   ctx.fillStyle=dk?'#0A1418':'#2A1A10';[[-60,-22,14,10],[10,-28,18,12],[70,-30,12,9]].forEach(([x,y,w,h])=>{ctx.beginPath();ctx.ellipse(x*s,y*s,w*s,h*s,.3,0,7);ctx.fill()});
   ctx.strokeStyle='#2A1C12';ctx.lineWidth=6*s;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-10*s,-46*s);ctx.lineTo(-6*s,-110*s);ctx.stroke();ctx.beginPath();ctx.moveTo(60*s,-50*s);ctx.lineTo(150*s,-20*s);ctx.stroke();
   ctx.fillStyle=dk?'#B8AE96':'#E8DCC0';ctx.beginPath();ctx.moveTo(-6*s,-106*s);ctx.lineTo(40*s,-96*s);ctx.lineTo(32*s,-84*s);ctx.lineTo(38*s,-74*s);ctx.lineTo(24*s,-66*s);ctx.lineTo(-4*s,-60*s);ctx.closePath();ctx.fill();ctx.restore();
   gull(cx-10*s+Math.sin(t/2000)*60*s,hy-150*s+Math.cos(t/1700)*10*s,Math.sin(t/160)*4)},
 volcano(cx,hy,s,t,dk,lit){const top=hy-170*s,g=ctx.createLinearGradient(0,top,0,hy);g.addColorStop(0,dk?'#3A2A22':'#7A5A44');g.addColorStop(1,dk?'#2A2420':'#5E4A3C');ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(cx-290*s,hy-6*s);ctx.lineTo(cx-30*s,top);ctx.lineTo(cx+40*s,top+4*s);ctx.lineTo(cx+300*s,hy-6*s);ctx.closePath();ctx.fill();
   ctx.fillStyle='rgba(0,0,0,.18)';ctx.beginPath();ctx.moveTo(cx+5*s,top+2*s);ctx.lineTo(cx+40*s,top+4*s);ctx.lineTo(cx+300*s,hy-6*s);ctx.lineTo(cx+90*s,hy-6*s);ctx.closePath();ctx.fill();
   const pulse=.6+.4*Math.sin(t/500);ctx.strokeStyle=`rgba(255,${120+60*pulse},60,.95)`;ctx.lineWidth=4*s;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(cx-24*s,top+2*s);ctx.lineTo(cx+34*s,top+4*s);ctx.stroke();
   ctx.lineWidth=3*s;ctx.beginPath();ctx.moveTo(cx+10*s,top+6*s);ctx.bezierCurveTo(cx+30*s,top+50*s,cx-10*s,top+80*s,cx+20*s,top+120*s);ctx.stroke();
   if(lit){const lg=ctx.createRadialGradient(cx+5*s,top,0,cx+5*s,top,90*s);lg.addColorStop(0,'rgba(255,120,60,.45)');lg.addColorStop(1,'rgba(255,120,60,0)');ctx.fillStyle=lg;ctx.fillRect(cx-90*s,top-90*s,180*s,180*s)}
   for(let k=0;k<9;k++){const u=((t/6000)+k/9)%1,px=cx+5*s+u*120*s+Math.sin(u*6+k)*10*s,py=top-u*150*s,r=(10+u*34)*s;ctx.fillStyle=dk?`rgba(150,150,160,${.45*(1-u)*SA})`:`rgba(240,240,240,${.85*(1-u)*SA})`;ctx.beginPath();ctx.arc(px,py,r,0,7);ctx.fill()}
   hill(cx,hy,s,30,dk,341);palmS(cx-220*s,hy-20*s,80*s,-.4,t);palmS(cx+230*s,hy-20*s,76*s,.4,t)},
 orchard(cx,hy,s,t,dk){hill(cx,hy,s,66,dk,221);[[-120,-40,30],[-70,-62,34],[-15,-70,30],[40,-66,34],[-160,-28,24]].forEach(([dx,dy,r],i)=>{const x=cx+dx*s,y=hy+dy*s;ctx.fillStyle=dk?'#4A3A28':'#7A5A3A';ctx.fillRect(x-3*s,y,6*s,22*s);
     ctx.fillStyle=dk?'#2F6B3A':'#5FA052';ctx.beginPath();ctx.arc(x,y,r*s,0,7);ctx.arc(x-r*.5*s,y+r*.3*s,r*.7*s,0,7);ctx.arc(x+r*.55*s,y+r*.25*s,r*.7*s,0,7);ctx.fill();
     const rr=rng(230+i);for(let k=0;k<9;k++){ctx.fillStyle=['#E8553E','#F2A33A','#E8553E'][k%3];ctx.beginPath();ctx.arc(x+(rr()-.5)*r*1.6*s,y+(rr()-.3)*r*s,3*s,0,7);ctx.fill()}});
   const mx=cx+130*s,my=hy-26*s;ctx.fillStyle='#6E4526';ctx.fillRect(mx-50*s,my-48*s,4*s,48*s);ctx.fillRect(mx+46*s,my-48*s,4*s,48*s);ctx.fillStyle=dk?'#5A4A36':'#9C7A52';ctx.fillRect(mx-50*s,my-20*s,100*s,8*s);
   for(let k=0;k<4;k++){ctx.fillStyle=['#E8553E','#F2A33A','#9BC53D','#E8553E'][k];for(let j=0;j<4;j++){ctx.beginPath();ctx.arc(mx-38*s+k*25*s+j*4*s,my-24*s-(j%2)*4*s,4*s,0,7);ctx.fill()}}
   for(let k=0;k<8;k++){ctx.fillStyle=k%2?'#FBF8F0':'#2D7DA8';ctx.beginPath();ctx.moveTo(mx-56*s+k*14*s,my-64*s);ctx.lineTo(mx-42*s+k*14*s,my-64*s);ctx.lineTo(mx-42*s+k*14*s,my-48*s);ctx.arc(mx-49*s+k*14*s,my-48*s,7*s,0,Math.PI);ctx.closePath();ctx.fill()}},
 bones(cx,hy,s,t,dk){hill(cx,hy,s,40,dk,241);palmS(cx+200*s,hy-24*s,96*s,.35,t);palmS(cx-210*s,hy-20*s,78*s,-.4,t);
   const b=dk?'#E8E0CC':'#FFFDF6',x0=cx-140*s,x1=cx+130*s,y=hy-30*s;ctx.strokeStyle=b;ctx.lineCap='round';ctx.lineWidth=6*s;ctx.beginPath();ctx.moveTo(x0+30*s,y-30*s);ctx.quadraticCurveTo(cx,y-62*s,x1,y-24*s);ctx.stroke();
   ctx.lineWidth=4*s;for(let k=0;k<9;k++){const x=x0+60*s+k*22*s,top=y-32*s-Math.sin((k+1)/10*Math.PI)*24*s;ctx.beginPath();ctx.moveTo(x,top);ctx.quadraticCurveTo(x+16*s,(top+y)/2,x+4*s,y);ctx.stroke()}
   ctx.fillStyle=b;ctx.beginPath();ctx.moveTo(x0-30*s,y);ctx.quadraticCurveTo(x0-34*s,y-44*s,x0+20*s,y-38*s);ctx.lineTo(x0+40*s,y-26*s);ctx.lineTo(x0+30*s,y);ctx.closePath();ctx.fill();
   ctx.fillStyle=dk?'#1A1A1A':'#3A3A3A';ctx.beginPath();ctx.arc(x0+10*s,y-28*s,4*s,0,7);ctx.fill();
   ctx.fillStyle=b;ctx.beginPath();ctx.moveTo(x1,y-24*s);ctx.lineTo(x1+30*s,y-48*s);ctx.lineTo(x1+20*s,y-22*s);ctx.lineTo(x1+36*s,y-4*s);ctx.closePath();ctx.fill()},
 peak(cx,hy,s,t,dk){const px=cx+30*s,top=hy-185*s;ctx.fillStyle=dk?'#4A4E52':'#8E9AA0';ctx.beginPath();ctx.moveTo(cx-280*s,hy-10*s);ctx.lineTo(px-30*s,top+30*s);ctx.lineTo(px,top);ctx.lineTo(px+20*s,top+20*s);ctx.lineTo(cx+300*s,hy-10*s);ctx.closePath();ctx.fill();
   ctx.fillStyle=dk?'#363A3E':'#6E7A82';ctx.beginPath();ctx.moveTo(px,top);ctx.lineTo(px+20*s,top+20*s);ctx.lineTo(cx+300*s,hy-10*s);ctx.lineTo(px+40*s,hy-10*s);ctx.closePath();ctx.fill();
   ctx.fillStyle='#F4F6F8';ctx.beginPath();ctx.moveTo(px-30*s,top+30*s);ctx.lineTo(px,top);ctx.lineTo(px+20*s,top+20*s);ctx.lineTo(px+34*s,top+44*s);ctx.lineTo(px+16*s,top+38*s);ctx.lineTo(px,top+50*s);ctx.lineTo(px-14*s,top+40*s);ctx.lineTo(px-44*s,top+46*s);ctx.closePath();ctx.fill();
   hill(cx,hy,s,46,dk,251);ctx.strokeStyle=dk?'rgba(140,200,230,.8)':'rgba(255,255,255,.95)';ctx.lineWidth=3*s;ctx.beginPath();ctx.moveTo(px-8*s,top+56*s);ctx.bezierCurveTo(px-30*s,top+100*s,px+10*s,hy-60*s,px-20*s,hy-20*s);ctx.stroke();
   for(let k=0;k<7;k++){const x=cx+(-200+k*62)*s,y=hy-(28+((k*37)%20))*s;ctx.fillStyle=dk?'#1E4028':'#3E7A44';ctx.beginPath();ctx.moveTo(x,y-26*s);ctx.lineTo(x+9*s,y);ctx.lineTo(x-9*s,y);ctx.fill()}},
 treasure(cx,hy,s,t,dk){hill(cx,hy,s,52,dk,261);palmS(cx-120*s,hy-40*s,104*s,-.3,t);palmS(cx+180*s,hy-24*s,90*s,.45,t);
   const x=cx+30*s,y=hy-50*s;ctx.strokeStyle='#C2413B';ctx.lineWidth=5*s;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x-46*s,y-2*s);ctx.lineTo(x-26*s,y+6*s);ctx.moveTo(x-26*s,y-2*s);ctx.lineTo(x-46*s,y+6*s);ctx.stroke();
   const gl=ctx.createRadialGradient(x+20*s,y-16*s,0,x+20*s,y-16*s,60*s);gl.addColorStop(0,'rgba(255,220,100,.55)');gl.addColorStop(1,'rgba(255,220,100,0)');ctx.fillStyle=gl;ctx.fillRect(x-40*s,y-76*s,120*s,120*s);
   ctx.fillStyle='#6E4526';ctx.fillRect(x,y-22*s,42*s,24*s);ctx.fillStyle='#F2C230';ctx.beginPath();ctx.ellipse(x+21*s,y-22*s,19*s,7*s,0,Math.PI,0);ctx.fill();
   ctx.fillStyle='#5A3A1E';ctx.save();ctx.translate(x,y-22*s);ctx.rotate(-.5);ctx.fillRect(0,-20*s,42*s,20*s);ctx.restore();ctx.strokeStyle='#3A2412';ctx.lineWidth=1.5;ctx.strokeRect(x,y-22*s,42*s,24*s);
   for(let k=0;k<5;k++){const g=.5+.5*Math.sin(t/260+k*1.7);ctx.fillStyle=`rgba(255,250,210,${g*SA})`;ctx.save();ctx.translate(x+8*s+k*7*s,y-34*s-(k%2)*8*s);ctx.rotate(.785);ctx.fillRect(-1,-4*s*g,2,8*s*g);ctx.fillRect(-4*s*g,-1,8*s*g,2);ctx.restore()}},
};
/* a little extra life layered on the remaining scenes */
{const wrap=(k,f)=>{const g=SCENE[k];SCENE[k]=function(cx,hy,s,t,dk,lit){g(cx,hy,s,t,dk,lit);f(cx,hy,s,t,dk,lit)}};
 wrap('peak',(cx,hy,s,t,dk)=>{for(let k=0;k<3;k++){const x=cx+((((t/90+k*260)%760))-380)*s,y=hy-(122-k*26)*s;ctx.fillStyle=dk?'rgba(200,215,230,.1)':'rgba(255,255,255,.5)';ctx.beginPath();ctx.ellipse(x,y,90*s,8*s,0,0,7);ctx.ellipse(x+40*s,y-5*s,50*s,6*s,0,0,7);ctx.fill()}
   const q=t/3200;birdS(cx+30*s+Math.cos(q)*90*s,hy-215*s+Math.sin(q)*16*s,s*1.2,Math.sin(t/300)*2,dk)});
 wrap('volcano',(cx,hy,s,t,dk)=>{const top=hy-170*s;for(let k=0;k<14;k++){const u=((t/1800)+k/14)%1,x=cx+5*s+(hash(k,7)-.5)*60*s*u+Math.sin(u*8+k)*4*s,y=top-u*90*s+u*u*30*s;ctx.fillStyle=`rgba(255,${150+hash(k,8)*80|0},70,${(1-u)*SA})`;ctx.beginPath();ctx.arc(x,y,(1.2+hash(k,9)*1.8)*s,0,7);ctx.fill()}
   ctx.strokeStyle=dk?'rgba(0,0,0,.18)':'rgba(40,20,10,.14)';ctx.lineWidth=1.2*s;ctx.lineCap='round';for(let k=1;k<5;k++){const y=top+k*26*s,w=k*36*s;ctx.beginPath();ctx.moveTo(cx-10*s-w*.9,y);ctx.quadraticCurveTo(cx,y+5*s,cx+20*s+w*.6,y-2*s);ctx.stroke()}});
 wrap('orchard',(cx,hy,s,t,dk,lit)=>{[[-120,-40,30],[-70,-62,34],[-15,-70,30],[40,-66,34]].forEach(([dx,dy,r],k)=>{const u=((t+k*1700)%6800)/1000;if(u<1){const x=cx+(dx+r*.4)*s,y0=hy+(dy+r*.5)*s,y=Math.min(hy-24*s,y0+u*u*70*s);ctx.fillStyle=k%2?'#F2A33A':'#E8553E';ctx.beginPath();ctx.arc(x,y,3*s,0,7);ctx.fill()}});
   if(!lit)for(let k=0;k<3;k++)butterfly(cx+Math.sin(t/1800+k*2)*150*s,hy-60*s+Math.cos(t/1300+k*3)*22*s,s,t+k*55,['#FBF8F0','#F2C14E','#9BC5E8'][k])});
 wrap('cove',(cx,hy,s,t,dk,lit)=>{smoke(cx+40*s,hy-58*s,s,t,dk,6,.7);if(!lit)for(let k=0;k<2;k++)butterfly(cx-60*s+Math.sin(t/1600+k*3)*110*s,hy-70*s+Math.cos(t/1200+k)*20*s,s,t+k*40,k?'#F28AA0':'#FBF8F0')});
 wrap('wreck',(cx,hy,s,t,dk)=>{ctx.strokeStyle=dk?'#2E5A3C':'#4E8A4A';ctx.lineWidth=2*s;ctx.lineCap='round';for(let k=0;k<6;k++){const x=cx+(-100+k*36)*s,y=hy-22*s+k*s,sw=Math.sin(t/900+k)*4*s;ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+sw,y-8*s,x+sw*1.6,y-16*s);ctx.stroke()}});
 wrap('bones',(cx,hy,s,t,dk)=>{const hop=Math.max(0,Math.sin(t/260))*(Math.sin(t/2100)>.6?5:0);ctx.save();ctx.translate(cx-140*s,hy-66*s-hop*s);ctx.fillStyle=dk?'#D8D8D8':'#FFFFFF';ctx.beginPath();ctx.ellipse(0,0,7*s,4.5*s,0,0,7);ctx.fill();ctx.beginPath();ctx.arc(6*s,-4*s,3.2*s,0,7);ctx.fill();ctx.fillStyle='#F2A33A';ctx.beginPath();ctx.moveTo(9*s,-4*s);ctx.lineTo(13*s,-3*s);ctx.lineTo(9*s,-2.5*s);ctx.fill();ctx.fillStyle='#8A8A8A';ctx.beginPath();ctx.ellipse(-2*s,-1*s,5*s,2.5*s,-.2,0,7);ctx.fill();ctx.restore()});
}
let SA=1;
/* ---------- each island shows your result its own way, in the tier's colour ---------- */
const clear=c=>/^#[0-9a-f]{6}$/i.test(c)?c+'00':'rgba(0,0,0,0)';
function glow(x,y,r,col,al){if(!(r>0))return;const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,col);g.addColorStop(1,clear(col));ctx.globalAlpha=SA*al;ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);ctx.globalAlpha=SA}
function flame(x,y,h,col,t){const f=1+.22*Math.sin(t/80)+.1*Math.sin(t/37);ctx.fillStyle=col;ctx.beginPath();ctx.moveTo(x-h*.32,y);ctx.quadraticCurveTo(x-h*.2,y-h*.6*f,x,y-h*f);ctx.quadraticCurveTo(x+h*.2,y-h*.6*f,x+h*.32,y);ctx.closePath();ctx.fill();
  ctx.fillStyle='rgba(255,250,220,.85)';ctx.beginPath();ctx.moveTo(x-h*.13,y);ctx.quadraticCurveTo(x,y-h*.55*f,x+h*.13,y);ctx.fill()}
const MARK={
 treasure(cx,hy,s,t,col,u){const x=cx+51*s,y=hy-72*s;glow(x,y,110*s*u+1,col,.8);ctx.fillStyle=col;for(let k=0;k<14;k++){const p=((t/1200)+k/14)%1,a=-Math.PI/2+(hash(k,9)-.5)*1.6;ctx.globalAlpha=SA*(1-p)*u;ctx.beginPath();ctx.arc(x+Math.cos(a)*p*90*s,y+Math.sin(a)*p*90*s+p*p*60*s,3.2*s,0,7);ctx.fill()}ctx.globalAlpha=SA;return[x,y]},
 torch(cx,hy,s,t,col,u){const x=cx+250*s,b=hy-22*s,top=b-74*s;ctx.strokeStyle='#4A3420';ctx.lineWidth=4*s;ctx.beginPath();ctx.moveTo(x,b);ctx.lineTo(x,top);ctx.stroke();ctx.fillStyle='#2A1C10';ctx.fillRect(x-7*s,top-4*s,14*s,8*s);
   glow(x,top-14*s,90*s*u+1,col,.8);flame(x,top-2*s,(12+26*u)*s,col,t);return[x,top-20*s]},
 // the lamp burns in your colour and the beam sweeps it across the sea
 light(cx,hy,s,t,col,u){const x=cx+50*s,lamp=hy-40*s-150*s-14*s,sw=Math.cos(t/1500);
   for(const d of[-1,1]){const dir=d*sw;ctx.globalAlpha=SA*.35*Math.abs(dir)*u;ctx.fillStyle=col;ctx.beginPath();ctx.moveTo(x,lamp);ctx.lineTo(x+dir*W*.9,lamp-46*s);ctx.lineTo(x+dir*W*.9,lamp+46*s);ctx.closePath();ctx.fill()}ctx.globalAlpha=SA;
   glow(x,lamp,70*s*u+1,col,.9);ctx.fillStyle=col;ctx.fillRect(x-8*s,lamp-8*s,16*s,14*s);return[x,lamp]},
 // the campfire flares up in your colour, throwing sparks
 cove(cx,hy,s,t,col,u){const x=cx+40*s,y=hy-36*s;glow(x,y-14*s,90*s*u+1,col,.7);flame(x,y,(18+30*u)*s,col,t);
   for(let k=0;k<10;k++){const p=((t/1400)+k/10)%1;ctx.globalAlpha=SA*(1-p)*u;ctx.fillStyle=col;ctx.beginPath();ctx.arc(x+Math.sin(p*7+k)*16*s,y-30*s-p*110*s,2.2*s,0,7);ctx.fill()}ctx.globalAlpha=SA;return[x,y-40*s]},
 // a string of lanterns lights up between the huts, one by one
 fisher(cx,hy,s,t,col,u){const x0=cx+60*s,x1=cx+290*s,n=8;ctx.strokeStyle='rgba(40,25,10,.7)';ctx.lineWidth=1;ctx.beginPath();for(let k=0;k<=20;k++){const x=x0+(x1-x0)*k/20,y=hy-96*s+Math.sin(k/20*Math.PI)*22*s;k?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.stroke();
   for(let k=0;k<n;k++){if(k/n>u)break;const f=(k+.5)/n,x=x0+(x1-x0)*f,y=hy-96*s+Math.sin(f*Math.PI)*22*s+6*s,sw=Math.sin(t/700+k)*2*s;glow(x+sw,y,22*s,col,.7);ctx.fillStyle=col;rrect(x+sw-4*s,y-6*s,8*s,11*s,3*s);ctx.fill()}return[cx+175*s,hy-80*s]},
 // a beacon is lit on the summit
 peak(cx,hy,s,t,col,u){const x=cx+30*s,y=hy-183*s;glow(x,y-10*s,110*s*u+1,col,.75);flame(x,y,(14+34*u)*s,col,t);return[x,y-20*s]},
 // a new sail goes up the wreck's broken mast
 wreck(cx,hy,s,t,col,u){ctx.save();ctx.translate(cx+20*s,hy-30*s);ctx.rotate(-.16);const top=-108*s,bot=top+56*s*u,bel=Math.sin(t/600)*3*s;
   ctx.fillStyle=col;ctx.beginPath();ctx.moveTo(-4*s,top);ctx.quadraticCurveTo(-40*s+bel,(top+bot)/2,-4*s,bot);ctx.closePath();ctx.fill();ctx.strokeStyle='rgba(0,0,0,.35)';ctx.lineWidth=1;ctx.stroke();ctx.restore();return[cx-4*s,hy-120*s]},
 // the volcano's smoke turns your colour
 volcano(cx,hy,s,t,col,u){const top=hy-170*s;glow(cx+5*s,top,90*s*u+1,col,.55);ctx.fillStyle=col;
   for(let k=0;k<8;k++){const p=((t/5000)+k/8)%1,px=cx+5*s+p*110*s+Math.sin(p*6+k)*10*s,py=top-p*150*s,r=(9+p*30)*s;ctx.globalAlpha=SA*.55*(1-p)*u;ctx.beginPath();ctx.arc(px,py,r,0,7);ctx.fill()}ctx.globalAlpha=SA;return[cx+20*s,top-40*s]},
 // your flag runs up the fort's tower
 fort(cx,hy,s,t,col,u){const x=cx+120*s,b=hy-56*s-84*s,top=b-46*s;ctx.strokeStyle='#3A2A1C';ctx.lineWidth=2.2*s;ctx.beginPath();ctx.moveTo(x,b);ctx.lineTo(x,top);ctx.stroke();
   const fy=b-14*s-(32*s-2*s)*u,fl=Math.sin(t/150)*3*s;ctx.fillStyle=col;ctx.beginPath();ctx.moveTo(x,fy);ctx.quadraticCurveTo(x+16*s,fy+3*s+fl,x+32*s,fy+5*s+fl);ctx.lineTo(x,fy+18*s);ctx.fill();return[x+14*s,fy+8*s]},
};
/* days and nights: 0 is morning, and a crossing that takes a day brings you to the next morning */
function darkAt(T){const f=((T%1)+1)%1;if(f<.38)return 0;if(f<.55)return (f-.38)/.17;if(f<.88)return 1;return 1-(f-.88)/.12}
const SKY={light:{day:['#9ED6EA','#F6EBD2'],dusk:['#5E6F9C','#F2A877'],night:['#1E2A4A','#3E4E72'],sea:[['#7CC8D2','#2F7E96'],['#2A4460','#16263A']],cloud:['#FFFFFF','#5A6684']},
 dark:{day:['#2A4E66','#7E9EAE'],dusk:['#2A2E50','#A86A58'],night:['#06101A','#1D3448'],sea:[['#1E5266','#0A2230'],['#173E4E','#06141C']],cloud:['#B8C8D4','#3A4A5A']}};
const hx=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
const mixH=(a,b,t)=>{const A=hx(a),B=hx(b);return'#'+A.map((v,i)=>Math.round(v+(B[i]-v)*t).toString(16).padStart(2,'0')).join('')};
const mix2=(a,b,u)=>[mixH(a[0],b[0],u),mixH(a[1],b[1],u)];
function ashore(t){
  const p=S.sh;if(p<.002)return;ashoreGeom();const {s,cx,hy}=ASH,dk=theme==='dark',isl=ISL[S.node],D=darkAt(S.T),lit=D>.45,K=SKY[theme],fade=opt.wipe==='fade',a=fade?p:1;SA=a;
  const e=fade?p:p<.5?4*p*p*p:1-Math.pow(-2*p+2,3)/2,ic=toScreen(isl.c[0],isl.c[1]),ir=e*Math.hypot(Math.max(ic.x,W-ic.x),Math.max(ic.y,H-ic.y))+1;
  ctx.setTransform(DPR,0,0,DPR,0,0);ctx.save();ctx.globalAlpha=a;if(!fade&&p<.999){ctx.beginPath();ctx.arc(ic.x,ic.y,ir,0,7);ctx.clip()}const pk=S.punchT?(S.punchK||0)*Math.exp(-(t-S.punchT)/200)*Math.cos((t-S.punchT)/60):0,k=1+(1-e)*(fade?.18:.06)+pk;ctx.translate(cx,hy);ctx.scale(k,k);ctx.translate(-cx,-hy);
  const sky=D<.6?mix2(K.day,K.dusk,D/.6):mix2(K.dusk,K.night,(D-.6)/.4);
  let g=ctx.createLinearGradient(0,0,0,hy);g.addColorStop(0,sky[0]);g.addColorStop(1,sky[1]);ctx.fillStyle=g;ctx.fillRect(-W*.2,-H*.2,W*1.4,hy+H*.2+1);
  const st=Math.max(0,(D-.5)*2);if(st>0){for(let i=0;i<70;i++){const x=hash(i,301)*W,y=hash(i,302)*hy*.9;ctx.globalAlpha=a*st*(.3+.6*Math.abs(Math.sin(t/900+i)));ctx.fillStyle='#FFFFFF';ctx.fillRect(x,y,1.4,1.4)}ctx.globalAlpha=a}
  const sx=W<560?W-70:cx+340*s;
  if(D<.85){const sy=hy*(.3+D*.75),sc=mixH('#FFF4CC','#FF9A5A',Math.min(1,D*1.4));g=ctx.createRadialGradient(sx,sy,0,sx,sy,80);g.addColorStop(0,sc+'E6');g.addColorStop(.3,sc+'80');g.addColorStop(1,sc+'00');ctx.globalAlpha=a*(1-D/.85);ctx.fillStyle=g;ctx.fillRect(sx-80,sy-80,160,160);ctx.fillStyle=sc;ctx.beginPath();ctx.arc(sx,sy,16,0,7);ctx.fill();ctx.globalAlpha=a}
  if(D>.6){const mx=W<560?70:cx-330*s,my=hy*.32;ctx.globalAlpha=a*(D-.6)/.4;ctx.fillStyle='#F4EFD8';ctx.beginPath();ctx.arc(mx,my,17,0,7);ctx.fill();ctx.fillStyle=sky[0];ctx.beginPath();ctx.arc(mx+8,my-5,14,0,7);ctx.fill();ctx.globalAlpha=a}
  for(let i=0;i<5;i++){const x=((hash(i,311)*W*1.5+t*.01*(1+hash(i,312)))%(W*1.5))-W*.25,y=hy*(.18+hash(i,313)*.45),w=60+hash(i,314)*70;ctx.fillStyle=mixH(K.cloud[0],K.cloud[1],D);ctx.globalAlpha=a*(dk?.3:.8);
    ctx.beginPath();ctx.ellipse(x,y,w,w*.22,0,0,7);ctx.ellipse(x-w*.35,y-w*.12,w*.4,w*.22,0,0,7);ctx.ellipse(x+w*.25,y-w*.16,w*.35,w*.2,0,0,7);ctx.fill()}ctx.globalAlpha=a;
  const sea=mix2(K.sea[0],K.sea[1],D);g=ctx.createLinearGradient(0,hy,0,H);g.addColorStop(0,sea[0]);g.addColorStop(.6,sea[1]);g.addColorStop(1,sea[1]);ctx.fillStyle=g;ctx.fillRect(-W*.2,hy,W*1.4,H);
  ctx.strokeStyle=dk||D>.5?'rgba(200,230,240,.22)':'rgba(255,255,255,.7)';ctx.lineCap='round';for(let i=0;i<46;i++){const d=hash(i,321),y=hy+6+d*d*(H-hy)*.7,x=((hash(i,322)*W*1.3+t*.012*(1+d))%(W*1.3))-W*.15,l=(8+d*40)*s;ctx.lineWidth=1+d*1.5;ctx.beginPath();ctx.moveTo(x-l,y);ctx.quadraticCurveTo(x,y-2-d*3,x+l,y);ctx.stroke()}
  sceneBack(cx,hy,s,t,dk,D,isl.k,D<.85?sx:(W<560?70:cx-330*s));
  SCENE[isl.k](cx,hy,s,t,dk,lit);
  sceneFront(cx,hy,s,t,dk,D,lit);
  ctx.strokeStyle=dk?'rgba(220,240,245,.55)':'rgba(255,255,255,.95)';ctx.lineWidth=2.2;ctx.beginPath();for(let x=cx-380*s;x<=cx+380*s;x+=8){const y=hy+6+Math.sin(x/18+t/500)*1.6;x===cx-380*s?ctx.moveTo(x,y):ctx.lineTo(x,y)}ctx.stroke();
  signpost(cx-150*s,hy-24*s,s,isl.n);
  const fi=S.flags[S.node];if(fi!=null){const u=1-Math.pow(1-Math.min(1,Math.max(0,(t-(S.flagT||0))/1100)),3);(MARK[isl.k]||MARK.torch)(cx,hy,s,t,css('--t'+fi),u)}
  fireworks(t,s,cx,hy);
  const ar=S.node?S.results[S.node-1]:null,o=ar?OFF[ar.i]/280:0,bx0=Math.max(cx-300*s,60),bx=Math.max(34,bx0-o*60*s),jx=cx-150*s,by=hy+30*s-o*22*s,bs=s*.78*(1-o*.5);
  boatS(bx,by,bs,t);jettyS(bx0-30*s,jx,hy+6*s,s,false);
  crew(t,s,hy,bx,by,bs,bx0,jx,o);
  // the light goes down over everything as evening comes
  if(D>0){ctx.setTransform(DPR,0,0,DPR,0,0);ctx.globalAlpha=a*D*(dk?.18:.32);ctx.fillStyle='#0E1838';ctx.fillRect(0,0,W,H)}
  ctx.restore();SA=1;
  // a thin rim on the wipe's edge, like looking through a spyglass
  if(!fade&&p<.999){ctx.setTransform(DPR,0,0,DPR,0,0);ctx.strokeStyle=dk?'rgba(245,196,107,.55)':'rgba(16,40,58,.45)';ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(ic.x,ic.y,ir,0,7);ctx.stroke()}
}
let lastT=0;
function frame(t){const dt=Math.min(50,t-(lastT||t));lastT=t;
  if(S.sail){const s=S.sail,u=Math.max(0,Math.min(1,(t-s.t0)/s.dur));S.u=u<.5?2*u*u:1-Math.pow(-2*u+2,2)/2;S.T=s.T0+s.days*u;
    if(u>=1){S.sail=null;S.done=s.j+1;S.node=nextOf(s.j);S.ang=segAng(s.j,1);S.seen.add(S.node);S.phase='landed';{const r=S.results[s.j],o=r?OFF[r.i]:0;if(r)hooks.onLanded?.(LANDTXT[r.i]);
      if(o>0){const dur=600+o*6;S.row={t0:t+350,dur,a:anchorOf(s.j),b:ISL[S.node].d};timers.push(setTimeout(s.done,350+dur+700))}else{S.row=null;timers.push(setTimeout(s.done,1100))}}}}
  if(S.phase!=='end')follow();
  const c=S.cam,ct=S.camT,k=S.sail?.08:.06;c.x+=(ct.x-c.x)*k;c.y+=(ct.y-c.y)*k;c.z+=(ct.z-c.z)*k;c.ay+=(ct.ay-c.ay)*.06;
  {const tg=/question|reveal|board/.test(S.phase)?1:0,st=dt/620;if(opt.wipe==='fade'){S.sh+=(tg-S.sh)*.06;if(Math.abs(tg-S.sh)<.002)S.sh=tg}else S.sh=tg>S.sh?Math.min(1,S.sh+st):Math.max(0,S.sh-st)}
  drawSea(t);drawIsles(t);trail();ship(t);rowboat(t);fog();labels();compass();
  if(S.phase!=='end'){const D=darkAt(S.T);if(D>0){ctx.setTransform(DPR,0,0,DPR,0,0);ctx.fillStyle=`rgba(8,16,40,${D*(theme==='dark'?.4:.42)})`;ctx.fillRect(0,0,W,H)}}
  ashore(t);drawFx(t);odoTick();
  raf=requestAnimationFrame(frame);
}
let hudA='',hudB='';function odoTick(){const d=Math.floor(S.T*2+1e-6)/2,a=dayStr(d)+' at sea',D=darkAt(S.T),b=S.sail?(S.sail.days?(D>.5?'at sea · night':'at sea · day '+(Math.floor(S.T)+1)):'setting out'):ISL[S.node].n;if(a!==hudA){hudA=a;els.odo.textContent=a}if(b!==hudB){hudB=b;els.where.textContent=b}}
/* splash, sparks and flash around the ship when a tier lands */
/* fireworks over the island for a good reckoning, a passing rain cloud for a poor one */
function celebrate(i){const now=performance.now();S.punchT=now;S.punchK=[.07,.055,.04,.025,.015,.012,.011,.01][i];S.fw=[];
  const n=[6,4,3,1,0,0,0,0][i];for(let k=0;k<n;k++)S.fw.push({fx:(Math.random()-.5)*.9,fy:.55+Math.random()*.45,t0:now+220+k*260+Math.random()*120,col:k%3===2?'#FFE7A3':css('--t'+i),seed:Math.random()*1e4});
  S.rainT=i>=4?now:0;try{navigator.vibrate?.(i===0?[30,50,40]:i<=2?25:0)}catch(e){}
  const o=els.odo;o.classList.remove('bump');void o.offsetWidth;o.classList.add('bump')}
function fireworks(t,s,cx,hy){
  (S.fw||[]).forEach(r=>{const u=t-r.t0;if(u<0||u>2400)return;const x=cx+r.fx*480*s,ty=hy-(120+r.fy*120)*s;
    if(u<620){const e=u/620,y=hy-(hy-ty)*(1-Math.pow(1-e,2));ctx.fillStyle='#FFF4D0';ctx.beginPath();ctx.arc(x,y,2.4,0,7);ctx.fill();ctx.strokeStyle='rgba(255,230,170,.5)';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y+18);ctx.stroke();return}
    const d=(u-620)/1000,rr=rng(r.seed|0);if(d<.12){ctx.globalAlpha=SA*(1-d/.12)*.6;ctx.fillStyle='#FFFFFF';ctx.beginPath();ctx.arc(x,ty,30*s,0,7);ctx.fill()}
    for(let k=0;k<40;k++){const a=k/40*6.283+rr()*.2,sp=(70+rr()*70)*s,px=x+Math.cos(a)*sp*Math.min(d,1.2)*1.1,py=ty+Math.sin(a)*sp*Math.min(d,1.2)+d*d*60*s;ctx.globalAlpha=SA*Math.max(0,1-d/1.8);ctx.fillStyle=k%4?r.col:'#FFFFFF';ctx.beginPath();ctx.arc(px,py,(2.4-d)*s+.6,0,7);ctx.fill()}ctx.globalAlpha=SA});
  if(S.rainT){const u=(t-S.rainT)/2800;if(u>0&&u<1){const al=Math.min(1,u*5,(1-u)*4),x=cx+20*s,y=hy-170*s;ctx.globalAlpha=SA*al;ctx.fillStyle=theme==='dark'?'#3A4450':'#7A8694';
    [[0,0,70],[-50,10,46],[55,8,50],[-20,-20,44],[25,-18,40]].forEach(([dx,dy,r])=>{ctx.beginPath();ctx.ellipse(x+dx*s,y+dy*s,r*s,r*.55*s,0,0,7);ctx.fill()});
    ctx.strokeStyle='rgba(150,180,210,.8)';ctx.lineWidth=1.4;for(let k=0;k<34;k++){const rx=x+(hash(k,71)-.5)*200*s,ph=((t/380)+hash(k,72))%1,ry=y+20*s+ph*120*s;ctx.beginPath();ctx.moveTo(rx,ry);ctx.lineTo(rx-3,ry+12);ctx.stroke()}ctx.globalAlpha=SA}}
}
function burst(i){
  const p=S.sh>.5?(()=>{ashoreGeom();ctx.save();ctx.globalAlpha=0;const sa=SA;SA=0;const m=(MARK[ISL[S.node].k]||MARK.torch)(ASH.cx,ASH.hy,ASH.s,performance.now(),'#000000',1);SA=sa;ctx.restore();return{x:m[0],y:m[1]}})():(()=>{const q0=boatPos();return toScreen(q0[0],q0[1])})(),c=css('--t'+i),now=performance.now();
  const rings=i<=1?3:i<=3?2:1;for(let k=0;k<rings;k++)FX.push({type:'ring',x:p.x,y:p.y,t0:now+k*140,life:1100,max:i===0?190:i<=2?130:80,c:k===0?c:(theme==='dark'?P.ink:'#FFFFFF')});
  const n=[60,40,22,10,0,0,0,0][i];for(let k=0;k<n;k++){const a=Math.random()*6.283,sp=2+Math.random()*(i===0?7:5);
    FX.push({type:'spark',x:p.x,y:p.y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-2,t0:now,life:900+Math.random()*700,c:Math.random()<.5?c:(theme==='dark'?'#FFE7A3':'#FFFFFF'),r:1.5+Math.random()*2.5})}
  if(i<=1){const f=els.flash;f.style.background=`radial-gradient(circle at ${p.x}px ${p.y}px, ${c}, transparent 60%)`;f.classList.remove('on');void f.offsetWidth;f.classList.add('on')}
  if(i===0){cv.classList.remove('shake');void cv.offsetWidth;cv.classList.add('shake')}
}
const FX=[];
function drawFx(t){
  ctx.setTransform(DPR,0,0,DPR,0,0);
  for(let k=FX.length-1;k>=0;k--){const f=FX[k],u=(t-f.t0)/f.life;if(u<0)continue;if(u>=1){FX.splice(k,1);continue}
    if(f.type==='ring'){const e=1-Math.pow(1-u,3);ctx.strokeStyle=f.c;ctx.globalAlpha=(1-u)*.9;ctx.lineWidth=3*(1-u)+.5;ctx.beginPath();ctx.ellipse(f.x,f.y,f.max*e,f.max*e*.62,0,0,7);ctx.stroke()}
    else{f.x+=f.vx;f.y+=f.vy;f.vx*=.96;f.vy=f.vy*.96+.12;ctx.fillStyle=f.c;ctx.globalAlpha=1-u;ctx.beginPath();ctx.arc(f.x,f.y,f.r*(1-u*.5),0,7);ctx.fill()}}
  ctx.globalAlpha=1;
}
/* back aboard before the ship leaves: walk the jetty and hop on, or row back out */
function board(go){if(S.phase==='board')return;const ar=S.node?S.results[S.node-1]:null,far=ar&&OFF[ar.i]>0;S.phase='board';S.react=null;S.walk={t0:performance.now(),dir:'out'};timers.push(setTimeout(go,far?2150:1700))}
function setSail(j,done){S.phase='sail';const r=S.results[j];
  if(j===TREASURE-1){S.sail={j,t0:performance.now()+200,dur:2600,done,T0:S.T,days:-S.saved,wind:1};return}
  const days=r?DAYS[r.i]:0;S.sail={j,t0:performance.now()+200,dur:r?500+days*1150:2200,done,T0:S.T,days,wind:r?WIND[r.i]:.8}}
/* ---------- the handle the game drives ---------- */
const ro = new ResizeObserver(() => resize());
ro.observe(cv);
const mo = new MutationObserver(() => readTheme());
mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
readTheme();
resize();
raf = requestAnimationFrame(frame);
const resultOf = (i) => ({ i });
return {
  /** The islands of this voyage, home port first. */
  names: () => ISL.map((s) => s.n),
  /**
   * Picks up a voyage part-way: the tiers so far, in order. An eighth tier is the treasure
   * island's, and `saved` the days it took off; `unlocked` shows the treasure island.
   */
  place(tiers, saved = 0, unlocked = tiers.length > TREASURE - 1) {
    S.results = tiers.map(resultOf);
    S.done = tiers.length;
    S.node = Math.min(tiers.length, ISL.length - 1);
    S.saved = saved;
    S.T = tiers.slice(0, TREASURE - 1).reduce((a, i) => a + DAYS[i], 0) - (tiers.length > TREASURE - 1 ? saved : 0);
    S.total = S.T;
    for (let j = 0; j <= S.node; j++) S.seen.add(j);
    tiers.forEach((i, j) => { S.flags[j] = i; });
    if (unlocked) ISL[TREASURE].dup = false;
  },
  /** The voyage came in under par: the treasure island appears on the chart, with a flourish. */
  unlock() {
    ISL[TREASURE].dup = false;
    S.treasureT = performance.now();
    S.phase = "treasure";
    S.seen.add(TREASURE);
  },
  /** The treasure guess lands: its tier marks the island, and `saved` days come off the voyage. */
  landTreasure(i, saved) {
    S.results[S.node] = resultOf(i);
    S.saved = saved;
    burst(saved ? Math.min(i, 1) : 3);
    S.total -= saved;
    S.flags[S.node] = i;
    S.flagT = performance.now();
    celebrate(i);
    S.react = { t0: performance.now(), i };
  },
  intro() { S.phase = "intro"; },
  /** Ashore for a question; the sailor walks up from the boat. */
  ask() {
    S.leg = S.done;
    S.phase = "question";
    const ar = S.node ? S.results[S.node - 1] : null;
    S.walk = S.node ? { t0: performance.now() + (ar && OFF[ar.i] > 0 ? 1300 : 550), dir: "in" } : null;
    S.react = null;
  },
  /** The guess is in: hold ashore while the answer is revealed. */
  reveal() { S.phase = "reveal"; },
  /** The tier lands: the island marks it, fireworks or rain, the sailor reacts. */
  land(i) {
    S.results[S.node] = resultOf(i);
    burst(i);
    S.total += DAYS[i];
    S.flags[S.node] = i;
    S.flagT = performance.now();
    celebrate(i);
    S.react = { t0: performance.now(), i };
  },
  /** The sailor goes back aboard, then the ship crosses to the next island. */
  sail(arrived) { board(() => setSail(S.node, arrived)); },
  /** The voyage is over: pull back to show the whole route. */
  end() { S.phase = "end"; S.sail = null; fitEnd(); },
  destroy() {
    cancelAnimationFrame(raf);
    timers.forEach((id) => clearTimeout(id));
    ro.disconnect();
    mo.disconnect();
  },
};
}
