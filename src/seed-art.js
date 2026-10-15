// Presentation-only seed skins. No simulation values or attack decisions live here.
export const SEED_STYLES=Object.freeze([
 {name:'돌격 완두콩',shell:'#8fac68',light:'#c7dc8d',shade:'#688851',edge:'#49684a',germ:'#48754b'},
 {name:'곡사 수수알',shell:'#dbb76b',light:'#f6d995',shade:'#b28c4c',edge:'#846b43',germ:'#84914d'},
 {name:'도약 콩알',shell:'#b58b9c',light:'#e5b4bd',shade:'#906d87',edge:'#6c556e',germ:'#87a35b'}
]);
const ellipse=(c,x,y,rx,ry,color,a=0)=>{c.fillStyle=color;c.beginPath();c.ellipse(x,y,Math.max(.01,rx),Math.max(.01,ry),a,0,Math.PI*2);c.fill()};
const line=(c,points,color,width)=>{c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke()};
function pose(u,time,extra=0){
 const dead=u.hp<=0||u.down>0,phase=u.ability?.phase||'idle',e=u.ability?.elapsed||0,kind=u.species,walk=dead?0:Math.min(1,Math.hypot(u.vx||0,u.vy||0));
 let sx=1,sy=1,tilt=Math.sin(time*9+(u.seed||0))*.04*walk,open=0;
 if(dead){sx=1.17;sy=u.z>.1?.76:.57;tilt=u.z>.1?.48:.20}
 else if(phase==='windup'){
  const q=Math.min(1,e/[.28,.38,.32][kind]);sy=1-q*[.23,.10,.32][kind];sx=1/Math.sqrt(sy);tilt=-q*.10;
  if(kind===1)open=q;
 }else if(phase==='active'){
  if(kind===0){sx=1.25;sy=.8;tilt=Math.cos(u.angle||0)*-.12}
  if(kind===2){sy=1.2;sx=.88;tilt=Math.cos(u.angle||0)*.12}
 }else if(phase==='recover'){
  const q=Math.max(0,1-e/.3);sy=1-q*.12;sx=1/Math.sqrt(sy);if(kind===1)open=q;
 }
 if(!dead){sy=Math.max(.55,sy-(u.bounce||0)*.6-extra);sx*=Math.sqrt(1/Math.max(.75,1-extra));}
 return {sx,sy,tilt,open,dead};
}
function face(c,r,expression,pixelRatio=1){
 const ink='#293e36',ey=-r*.07,gap=r*.30,stroke=Math.max(pixelRatio*.65,r*.085);
 for(const side of [-1,1]){
  const x=side*gap;
  if(expression==='dead'){
   line(c,[[x-r*.10,ey-r*.11],[x+r*.10,ey+r*.11]],ink,stroke);
   line(c,[[x-r*.10,ey+r*.11],[x+r*.10,ey-r*.11]],ink,stroke);
  }else if(expression==='happy')line(c,[[x-r*.1,ey],[x,ey-r*.095],[x+r*.1,ey]],ink,stroke);
  else{ellipse(c,x,ey,r*.092,r*(expression==='surprised'?.15:.13),ink);if(r>9*pixelRatio)ellipse(c,x-r*.018,ey-r*.045,r*.025,r*.035,'#fffae7')}
 }
 if(expression==='surprised')ellipse(c,0,r*.24,r*.10,r*.13,ink);
 else if(expression==='dead')line(c,[[-r*.12,r*.25],[r*.12,r*.25]],ink,stroke);
 else line(c,[[-r*.14,r*.18],[0,r*(expression==='hungry'?.12:.29)],[r*.14,r*.18]],ink,stroke);
 if(expression==='happy')for(const side of [-1,1])ellipse(c,side*r*.48,r*.17,r*.11,r*.055,'#e9a39c');
}
function draw(c,species,x,y,r,u,time,options={}){
 const style=options.boss?{shell:'#ae7853',light:'#dfad79',shade:'#885d47',edge:'#614b3c',germ:'#77915a'}:SEED_STYLES[species];
 const p=pose(u,time,options.extra||0),pixel=options.pixelRatio||1;
 c.save();c.translate(x,y-r*.79);c.rotate(p.tilt);c.scale(p.sx,p.sy);c.globalAlpha=p.dead?.84:1;
 const expression=p.dead?'dead':options.expression||'normal';
 if(options.faceOnly){face(c,r,expression,pixel);c.restore();return}
 // Husk/germ stay attached to the round body. Open hulls make the lob windup readable.
 if(species===1&&!options.boss){
  for(const side of [-1,1]){
   ellipse(c,side*r*(.56+p.open*.24),-r*(.09+p.open*.12),r*.40,r*(.83+p.open*.10),style.edge,side*(.17+p.open*.52));
   ellipse(c,side*r*(.57+p.open*.24),-r*(.12+p.open*.12),r*.32,r*.75,style.shade,side*(.17+p.open*.52));
  }
 }
 if(!p.dead){
  const fold=species===2&&u.ability?.phase==='windup'?.65:0;
  line(c,[[0,-r*.70],[r*.06,-r*(1.12-fold)]],style.germ,r*.095);
  const leaves=Math.max(1,Math.min(4,u.tier||1));
  for(let k=0;k<leaves;k++){const side=k%2?-1:1,yy=-r*(1.05-fold)+k*r*.12;ellipse(c,side*r*(.19+k*.015),yy,r*(.24-k*.018),r*.10,style.germ,side*-.48)}
 }
 // Continuous round shell: the expression is ink directly on the lit body.
 ellipse(c,0,0,r,r*.87,style.edge);
 ellipse(c,0,-r*.035,r*.93,r*.80,style.shade);
 ellipse(c,-r*.055,-r*.16,r*.88,r*.68,u.flash>.09?'#f4edc4':style.shell);
 ellipse(c,-r*.25,-r*.43,r*.39,r*.18,style.light,-.32);
 if(species===2&&!options.boss){
  ellipse(c,r*.66,r*.17,r*.18,r*.36,style.shade,-.22);
  ellipse(c,r*.69,r*.15,r*.09,r*.24,'#e6d0a5',-.22);
 }else if(options.boss){
  // Chestnut crown and woody grain replace the old mushroom costume.
  c.fillStyle=style.shell;c.beginPath();c.moveTo(-r*.36,-r*.62);c.quadraticCurveTo(0,-r*1.16,r*.27,-r*.69);c.closePath();c.fill();
  for(const side of [-1,1])line(c,[[side*r*.73,-r*.23],[side*r*.81,r*.1],[side*r*.64,r*.49]],style.light,r*.035);
 }
 // Tier marks are shell freckles; no floating diamonds or stacked equipment.
 for(let k=0;k<(u.tier||1)-1;k++)for(const side of [-1,1])ellipse(c,side*r*(.57-k*.035),r*(.28+k*.14),r*.045,r*.065,style.light,side*-.3);
 if(!options.hideFace)face(c,r,expression,pixel);
 c.restore();
}
export const SeedArt=Object.freeze({draw,pose,face,styles:SEED_STYLES});
