const TAU=Math.PI*2,ARC_STEP=Math.PI/36;

function point(out,count,x,y){out[count*2]=x;out[count*2+1]=y;return count+1;}
function arc(out,count,x,y,r,start,end){
  const segments=Math.max(1,Math.ceil(Math.abs(end-start)/ARC_STEP));
  for(let i=0;i<=segments;i++){const a=start+(end-start)*i/segments;count=point(out,count,x+Math.cos(a)*r,y+Math.sin(a)*r);}
  return count;
}

// One boundary for a swept body capsule united with its (possibly larger)
// landing disk. Analytic intersections remove internal circle/rectangle seams;
// this is not a convex hull, which would invent danger beside the landing disk.
function bodyLandingContour(out,x,y,endX,endY,r,landingRadius){
  const dx=endX-x,dy=endY-y,d=Math.hypot(dx,dy),angle=Math.atan2(dy,dx),R=Math.max(r,landingRadius);
  if(d<=R-r+1e-9)return arc(out,0,endX,endY,R,0,TAU);
  const join=Math.sqrt(Math.max(0,R*R-r*r));let n=0;
  if(d>=join){
    const a=Math.acos(-join/R);
    n=arc(out,n,x,y,r,angle-Math.PI/2,angle-Math.PI*1.5);
    n=arc(out,n,endX,endY,R,angle+a,angle-a);
  }else{
    const cross=(r*r-R*R+d*d)/(2*d),height=Math.sqrt(Math.max(0,r*r-cross*cross));
    const small=Math.atan2(height,cross),large=Math.atan2(height,cross-d);
    n=arc(out,n,x,y,r,angle-small,angle+small-TAU);
    n=arc(out,n,endX,endY,R,angle+large,angle-large);
  }
  return n;
}

// Writes world XY coordinates into the caller's reusable buffer. The contour is
// the horizontal damage footprint; model height/airborne checks remain intact.
export function bossDangerContour(area,out){
  let n=0;
  if(area.kind==='sweep')return arc(out,0,area.x,area.y,area.reach,0,TAU);
  if(area.kind==='sector'){
    n=point(out,n,area.x,area.y);
    return arc(out,n,area.x,area.y,area.reach,area.angle-area.sector/2,area.angle+area.sector/2);
  }
  if(area.kind==='charge')return bodyLandingContour(out,area.x,area.y,area.endX,area.endY,area.width,area.width);
  if(area.kind==='leap')return bodyLandingContour(out,area.x,area.y,area.targetX,area.targetY,area.width,area.reach);
  if(area.kind==='fan'){
    const start=area.angle-area.sector/2,end=area.angle+area.sector/2,r=area.reach,w=area.width;
    n=arc(out,n,area.x,area.y,r+w,start,end);
    n=arc(out,n,area.x+Math.cos(end)*r,area.y+Math.sin(end)*r,w,end,end+Math.PI);
    n=arc(out,n,area.x,area.y,Math.max(0,r-w),end,start);
    return arc(out,n,area.x+Math.cos(start)*r,area.y+Math.sin(start)*r,w,start+Math.PI,start+TAU);
  }
  return 0;
}
