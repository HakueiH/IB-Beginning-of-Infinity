/* Beginning of Infinity: engraved 3D figures (three.js r160, local). Hatching on parchment, no shine, no colour.
   BOI3D(el,kind,opt) -> api or null (fallback shown). el must contain .fb (static SVG). */
(function(){
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
function hasGL(){try{const c=document.createElement('canvas');return !!(c.getContext('webgl2')||c.getContext('webgl'))}catch(e){return false}}
window.BOI3D=function(el,kind,opt){
 opt=opt||{};
 const fail=w=>{el.classList.add('fallback');el.dataset.mode='fallback';el.dataset.why=w;console.info('3D fallback:',w);return null};
 if(/[?&]fallback/.test(location.search))return fail('forced');
 if(RM)return fail('reduced motion');
 if(!window.THREE)return fail('three missing');
 if(!hasGL())return fail('no webgl');
 try{return build(el,kind,opt,fail)}catch(e){console.warn(e);return fail('init')}
};
function build(el,kind,opt,fail){
 const T=THREE;
 const R=new T.WebGLRenderer({antialias:true,alpha:false,preserveDrawingBuffer:true});
 if(!R.getContext())return fail('context');
 T.ColorManagement.enabled=false;R.outputColorSpace=T.LinearSRGBColorSpace;R.setPixelRatio(Math.min(devicePixelRatio,2));R.setClearColor(0xf3eee4);
 el.prepend(R.domElement);el.dataset.mode='webgl';
 const sc=new T.Scene(),cam=new T.PerspectiveCamera(32,4/3,.1,1000);
 const PAPER=new T.Color(0xf3eee4),INK=new T.Color(0x1c1914);
 const light=new T.Vector3(6,9,7);
 const hatch=(lit)=>new T.ShaderMaterial({uniforms:{uDpr:{value:R.getPixelRatio()},uLit:{value:lit?1:0},uPaper:{value:PAPER},uInk:{value:INK},uSun:{value:light}},
  vertexShader:`varying vec3 vN;varying vec3 vW;void main(){vN=normalize(mat3(modelMatrix)*normal);vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`,
  fragmentShader:`uniform float uDpr,uLit;uniform vec3 uPaper,uInk,uSun;varying vec3 vN;varying vec3 vW;
  float line(float v,float s,float w){float f=abs(mod(v,s)-s*.5);return 1.-smoothstep(w-.6,w+.6,f);}
  void main(){vec2 p=gl_FragCoord.xy/uDpr;vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;float d=max(dot(n,normalize(uSun-vW)),0.);if(!gl_FrontFacing)d=max(d,.4);
   if(uLit>.5)d=1.;float k=0.;
   if(d<.35)k=max(k,line(p.x+p.y,4.5,.55));
   if(d<.12)k=max(k,line(p.x-p.y,4.5,.55));
   if(d<.02)k=max(k,line(p.y,3.2,.5));
   if(d>=.35&&d<.6)k=max(k,line(p.x+p.y,9.,.45)*.6);
   gl_FragColor=vec4(mix(uPaper,uInk,k*.85),1.);}`,side:T.DoubleSide});
 const hullMat=new T.MeshBasicMaterial({color:INK,side:T.BackSide});
 const solid=(geo,s,lit)=>{const g=new T.Group();g.add(new T.Mesh(geo,hatch(lit)));const h=new T.Mesh(geo,hullMat);h.scale.setScalar(s||1.04);g.add(h);return g};
 const lineMat=o=>new T.LineBasicMaterial({color:INK,transparent:o<1,opacity:o});
 const line=(pts,o,dash)=>{const g=new T.BufferGeometry().setFromPoints(pts);if(dash){const l=new T.Line(g,new T.LineDashedMaterial({color:INK,dashSize:dash[0],gapSize:dash[1],transparent:true,opacity:o}));l.computeLineDistances();return l}return new T.Line(g,lineMat(o))};
 const segs=(pts,o)=>new T.LineSegments(new T.BufferGeometry().setFromPoints(pts),lineMat(o));
 const V=(x,y,z)=>new T.Vector3(x,y,z);
 const box=(w,h,d,s)=>{const g=new T.BoxGeometry(w,h,d);const m=new T.Group();m.add(new T.Mesh(g,hatch(0)));m.add(new T.LineSegments(new T.EdgesGeometry(g),lineMat(1)));return m};
 let dirty=true,dead=false,t0=performance.now();
 const IDLE=8000;let raf=0,running=false,lastAct=performance.now(),pausedAt=0,onStep=true,seen=true;
 // wkfix: one rAF handle per scene, never cancelled; stop/wake only flip state (idempotent). The pending frame sees running=false and simply does not reschedule.
 function stop(why){if(running){running=false;pausedAt=performance.now()}el.dataset.loop='paused';if(why)el.dataset.pause=why}
 function wake(){lastAct=performance.now();if(dead||!want())return;if(!running){running=true;if(pausedAt){t0+=performance.now()-pausedAt;pausedAt=0}el.dataset.loop='running';el.dataset.pause=''}if(!raf)raf=requestAnimationFrame(frame)}
 // step / visibility changes are coalesced: observers only record state; one timer settles it after the burst
 let settleT=0,settleWhy='';function settle(why){settleWhy=why;if(!settleT)settleT=setTimeout(()=>{settleT=0;if(want()){dirty=true;wake()}else stop(settleWhy)},60)}const api={el,dirty:()=>{dirty=true;wake()},fail:w=>{if(el.dataset.mode==='fallback')return;fail(w);dead=true;try{ro.disconnect();R.domElement.remove();R.dispose();R.forceContextLoss()}catch(e){}}};
 const S=SCENES[kind](T,{sc,cam,R,hatch,solid,line,segs,V,box,light,el,opt,api,INK,PAPER,lineMat,hullMat});
 api.set=v=>{S.set&&S.set(v);dirty=true;wake()};
 // drag to turn (all scenes that expose .turn)
 if(S.turn){let px=null;const c=R.domElement;c.style.touchAction='pan-y';
  c.addEventListener('pointerdown',e=>{px=e.clientX});addEventListener('pointerup',()=>px=null);
  c.addEventListener('pointermove',e=>{if(px===null)return;S.turn((e.clientX-px)/150);px=e.clientX;dirty=true});}
 function size(){const w=el.clientWidth,h=el.clientHeight;if(!w||!h)return;R.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix();dirty=true;wake()}
 const ro=new ResizeObserver(size);ro.observe(el);size();
 const cvs=R.domElement;let lost=false;
 cvs.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;el.dataset.ctx='lost';stop()});
 cvs.addEventListener('webglcontextrestored',()=>{lost=false;el.dataset.ctx='restored';
  // three re-inits GL state on restore; re-apply what lives outside it, re-upload textures, redraw now
  R.setClearColor(0xf3eee4,1);R.setPixelRatio(Math.min(devicePixelRatio,2));
  sc.traverse(o=>{const m=o.material;if(!m)return;(Array.isArray(m)?m:[m]).forEach(mm=>{if(mm.map)mm.map.needsUpdate=true;mm.needsUpdate=true})});
  size();dirty=true;wake();requestAnimationFrame(()=>{dirty=true})});
 // fix pass: the frame loop only runs while this figure's step is current, on screen, the tab is visible, and it is not idle.
 // Idle = no input, set() or finite animation for IDLE ms; ambient sway freezes in place and resumes (from the same phase) on input.
 function frame(now){raf=0;if(dead||!running)return;if(!want()){stop();return}raf=requestAnimationFrame(frame);if(!el.offsetWidth||lost)return;
  if(S.tick&&S.tick((now-t0)/1000))dirty=true;
  if(dirty){S.labels&&S.labels();R.render(sc,cam);dirty=false;el.dataset.frames=(+el.dataset.frames||0)+1}
  if(now-lastAct>IDLE)stop('idle')}
 ['pointerdown','pointermove','wheel','keydown','touchstart','focusin'].forEach(t=>el.addEventListener(t,wake,{passive:true}));
 document.addEventListener('visibilitychange',()=>settle('hidden'));
 const sec=el.closest('.sec');const cur=()=>!sec||sec.classList.contains('on');onStep=cur();
 if(sec)new MutationObserver(()=>{onStep=cur();settle('off-step')}).observe(sec,{attributes:true,attributeFilter:['class']});
 if(window.IntersectionObserver)new IntersectionObserver(es=>{seen=es[es.length-1].isIntersecting;settle(onStep?'off-screen':'off-step')}).observe(el);
 function want(){return !dead&&onStep&&seen&&!document.hidden}
 wake();
 return api;
}
const SCENES={};
/* slow-turning hero: the chapter's own drawing on an engraved card */
SCENES.hero=(T,c)=>{const{sc,cam,el,hatch,V}=c;
 cam.fov=30;cam.position.set(0,.4,9.6);cam.lookAt(0,0,0);
 const g=new T.Group();sc.add(g);
 const svg=el.querySelector('.fb svg');const vb=(svg.getAttribute('viewBox')||'0 0 560 420').split(/[ ,]+/).map(Number);const ar=vb[2]/vb[3];
 const H=3.6,W=H*ar;
 const slab=c.box(W,H,.14);g.add(slab);
 const cv=document.createElement('canvas');cv.width=1400;cv.height=Math.round(1400/ar);const x=cv.getContext('2d');x.fillStyle='#f3eee4';x.fillRect(0,0,cv.width,cv.height);
 const tex=new T.CanvasTexture(cv);tex.anisotropy=4;
 const face=new T.Mesh(new T.PlaneGeometry(W*.985,H*.985),new T.MeshBasicMaterial({map:tex}));face.position.z=.071;g.add(face);
 const back=face.clone();back.rotation.y=Math.PI;back.position.z=-.071;g.add(back);
 const s=new XMLSerializer().serializeToString(svg).replace(/currentColor/g,'#1c1914');
 const img=new Image();img.onload=()=>{try{x.drawImage(img,0,0,cv.width,cv.height);x.getImageData(0,0,1,1);tex.needsUpdate=true;c.api.dirty();el.dataset.tex='ok'}catch(e){c.api.fail('texture tainted')}};
 img.onerror=()=>c.api.fail('texture error');setTimeout(()=>{if(el.dataset.tex!=='ok')c.api.fail('texture timeout')},5000);img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(s.includes('xmlns=')?s:s.replace('<svg','<svg xmlns="http://www.w3.org/2000/svg"'));
 let off=0;
 return{turn:d=>{off+=d},tick:t=>{g.rotation.y=Math.sin(t*.35)*.42+off;g.rotation.x=Math.sin(t*.23)*.06;return true}};
};
/* ch1: tilted Earth around the Sun (from the approved prototype) */
SCENES.orbit=(T,c)=>{const{sc,cam,hatch,solid,line,segs,V,el}=c;
 cam.position.set(0,7.4,13.8);cam.lookAt(0,-.2,0);
 c.light.set(0,0,0);
 const sg=new T.SphereGeometry(.6,48,32);sc.add(solid(sg,1.035,1));
 const rays=[];for(let i=0;i<40;i++){const a=i/40*Math.PI*2,l=i%2?1.15:1.35;rays.push(V(Math.cos(a)*.72,0,Math.sin(a)*.72),V(Math.cos(a)*(l-.3),0,Math.sin(a)*(l-.3)))}
 const rl=segs(rays,.7);sc.add(rl);const rl2=rl.clone();rl2.rotation.x=Math.PI/2;sc.add(rl2);
 const A=4.2,e=.06;const orbitPt=a=>{const r=A*(1-e*e)/(1+e*Math.cos(a));return V(-r*Math.cos(a),0,r*Math.sin(a))};
 const op=[];for(let i=0;i<=256;i++)op.push(orbitPt(i/256*Math.PI*2));sc.add(line(op,1,[.05,.13]));
 const peri=orbitPt(0);sc.add(segs([peri.clone().multiplyScalar(.93),peri.clone().multiplyScalar(1.07)],1));
 const eg=new T.SphereGeometry(.5,64,40);const earth=new T.Group();earth.add(solid(eg,1.045,0));
 const tilt=new T.Group();tilt.add(line([V(0,-.85,0),V(0,.95,0)],1));const eq=[];for(let i=0;i<=96;i++){const a=i/96*Math.PI*2;eq.push(V(Math.cos(a)*.505,0,Math.sin(a)*.505))}tilt.add(line(eq,.55));earth.add(tilt);
 const jun=orbitPt(169/365*Math.PI*2).normalize().negate();tilt.quaternion.setFromAxisAngle(new T.Vector3().crossVectors(V(0,1,0),jun).normalize(),23.4*Math.PI/180);sc.add(earth);
 const L=k=>el.querySelector('[data-l='+k+']');const tip=V(0,0,0);
 const lab=(e,v)=>{if(!e)return;const p=v.clone().project(cam);e.style.left=((p.x+1)/2*100)+'%';e.style.top=((1-p.y)/2*100)+'%'};
 return{set:a=>earth.position.copy(orbitPt(a)),labels:()=>{lab(L('sun'),V(0,-1.25,0));lab(L('peri'),peri.clone().add(V(.15,-1.15,.55)));tip.set(0,1.12,0).applyQuaternion(tilt.quaternion).add(earth.position);lab(L('n'),tip)}};
};
/* ch3: one slider from the Earth out to the galaxy */
SCENES.zoom=(T,c)=>{const{sc,cam,solid,line,V}=c;
 c.light.set(-400,40,60);
 const earth=solid(new T.SphereGeometry(1,48,32),1.04,0);sc.add(earth);const eU=earth.children[0].material.uniforms.uSun,away=V(400,-40,-60);
 const moon=solid(new T.SphereGeometry(.27,24,16),1.06,0);moon.position.set(6,0,0);sc.add(moon);
 const ring=(r,cx,o,n)=>{const p=[];for(let i=0;i<=(n||160);i++){const a=i/(n||160)*Math.PI*2;p.push(V(cx+Math.cos(a)*r,0,Math.sin(a)*r))}return line(p,o,[r*.01,r*.025])};
 sc.add(ring(6,0,.8));const sun=solid(new T.SphereGeometry(9,40,24),1.03,1);sun.position.set(-400,0,0);sc.add(sun);
 for(const r of [160,300,400,610,2080,3800])sc.add(ring(r,-400,.5,256));
 // galaxy: two-armed spiral of points around a centre far away
 const G=-400-26000,P=[];let s=7;const rnd=()=>(s=(s*16807)%2147483647)/2147483647;
 for(let i=0;i<9000;i++){const arm=i%2,r=Math.pow(rnd(),.7)*48000,a=r/9000+arm*Math.PI+(rnd()-.5)*.55;P.push(G+Math.cos(a)*r,(rnd()-.5)*900,Math.sin(a)*r)}
 const pg=new T.BufferGeometry();pg.setAttribute('position',new T.Float32BufferAttribute(P,3));sc.add(new T.Points(pg,new T.PointsMaterial({color:c.INK,size:1.6,sizeAttenuation:false})));
 const dir=V(0,.55,1).normalize(),tgt=V();
 return{set:v=>{if(typeof v==='object'){eU.value=v.h?away:c.light;v=v.v}const d=3.2*Math.pow(10,v/100*4.6);const k=Math.max(0,Math.min(1,(v-58)/34));tgt.set(G*k*k*(3-2*k),0,0);
  cam.position.copy(dir).multiplyScalar(d).add(tgt);cam.near=d/200;cam.far=d*40;cam.updateProjectionMatrix();cam.lookAt(tgt)}};
};
/* ch6: steps, then one vertical leap, then a straight line into depth */
SCENES.stairs=(T,c)=>{const{sc,cam,box,line,V}=c;
 cam.position.set(4.6,3.4,6.4);cam.lookAt(.4,1.5,-1.2);
 for(let i=0;i<6;i++){const h=.35*(i+1),b=box(.8,h,1.4);b.position.set(-2+i*.8,h/2,0);sc.add(b)}
 const top=V(-2+5*.8,2.1,0),up=V(top.x,5.2,0);
 const leap=new T.Group();leap.add(line([top,up],1));leap.add(line([up,V(up.x,up.y,-900)],1));
 const dots=[];for(let i=1;i<40;i++)dots.push(V(up.x,up.y,-i*i*.6));leap.add(new T.Points(new T.BufferGeometry().setFromPoints(dots),new T.PointsMaterial({color:c.INK,size:3,sizeAttenuation:false})));
 sc.add(leap);leap.visible=false;
 sc.add(line([V(-3,0,.7),V(3,0,.7)],.4));
 return{set:v=>{leap.visible=!!v}};
};
/* ch8: the infinite hotel as a corridor going back into depth */
SCENES.hotel=(T,c)=>{const{sc,cam,line,solid,V}=c;
 cam.position.set(0,1.5,3.2);cam.lookAt(0,1.1,-20);
 const N=80,gap=1.6,doors=[];
 for(let i=0;i<N;i++)for(const sd of[-1,1]){const z=-i*gap,x=sd*1.5;doors.push(line([V(x,0,z-.25),V(x,2,z-.25),V(x,2,z-1.05),V(x,0,z-1.05)],Math.max(.15,1-i/40)))}
 doors.forEach(d=>sc.add(d));
 sc.add(line([V(-1.5,0,2),V(-1.5,0,-N*gap)],.6));sc.add(line([V(1.5,0,2),V(1.5,0,-N*gap)],.6));
 sc.add(line([V(-1.5,2.4,2),V(-1.5,2.4,-N*gap)],.35));sc.add(line([V(1.5,2.4,2),V(1.5,2.4,-N*gap)],.35));
 const gg=new T.SphereGeometry(.16,20,14),guests=[],ent=V(0,.16,2.4);const pos=k=>{if(k<0)return ent.clone();const i=Math.floor(k/2),sd=k%2?1:-1;return V(sd*1.15,.16,-i*gap-.65)};
 for(let k=0;k<N*2;k++){const g=solid(gg,1.08,0);g.position.copy(pos(k));sc.add(g);guests.push({g,from:k,to:k})}
 let a=1;
 return{set:v=>{guests.forEach(o=>{o.from=o.to;o.to++});const g=solid(gg,1.08,0);g.position.copy(ent);sc.add(g);guests.push({g,from:-1,to:0});a=0},
  tick:()=>{if(a>=1)return false;a=Math.min(1,a+.025);const e=a*a*(3-2*a);guests.forEach(o=>o.g.position.copy(pos(o.from).lerp(pos(o.to),e)));return true}};
};
/* ch10: the empty throne */
SCENES.throne=(T,c)=>{const{sc,cam,box,solid,V}=c;
 cam.position.set(0,2.6,7.4);cam.lookAt(0,1.1,0);
 const g=new T.Group();sc.add(g);
 const dais=solid(new T.CylinderGeometry(1.7,1.9,.3,48),1.02,0);dais.position.y=.15;g.add(dais);
 const add=(w,h,d,x,y,z)=>{const b=box(w,h,d);b.position.set(x,y,z);g.add(b)};
 add(1.3,.14,1.1,0,1.0,0);add(1.3,1.9,.14,0,2.0,-.5);add(.12,.7,.12,-.56,.65,.46);add(.12,.7,.12,.56,.65,.46);add(.12,.7,.12,-.56,.65,-.46);add(.12,.7,.12,.56,.65,-.46);
 add(.12,.12,1.1,-.62,1.45,0);add(.12,.12,1.1,.62,1.45,0);add(.1,.45,.1,-.62,1.24,.45);add(.1,.45,.1,.62,1.24,.45);
 const fin=solid(new T.SphereGeometry(.13,16,12),1.06,0);fin.position.set(-.55,3.05,-.5);g.add(fin);const f2=fin.clone();f2.position.x=.55;g.add(f2);
 let r=.5;g.rotation.y=r;
 return{set:v=>{r=v*Math.PI/180;g.rotation.y=r},turn:d=>{r+=d;g.rotation.y=r}};
};
/* ch11: two slits; a pattern builds dot by dot on the screen behind */
SCENES.slits=(T,c)=>{const{sc,cam,box,line,V,opt}=c;
 cam.position.set(5.2,2.6,6.2);cam.lookAt(0,.8,-1.6);
 const w=(x,ww)=>{const b=box(ww,2.4,.12);b.position.set(x,1.2,0);sc.add(b)};w(-1.75,2.3);w(0,.7);w(1.75,2.3);
 const scr=c.box(5.6,2.6,.06);scr.position.set(0,1.3,-4);sc.add(scr);
 sc.add(line([V(0,1.2,3.5),V(0,1.2,.4)],.5,[.08,.1]));
 const M=opt.max||3000,P=new Float32Array(M*3);let s=11;const rnd=()=>(s=(s*16807)%2147483647)/2147483647;
 for(let i=0;i<M;i++){let x;for(;;){x=(rnd()-.5)*5.2;const env=Math.exp(-x*x/3.2),I=Math.pow(Math.cos(x*3.1),2)*env;if(rnd()<I)break}
  P[i*3]=x;P[i*3+1]=1.3+(rnd()-.5)*2.2;P[i*3+2]=-3.95}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(P,3));g.setDrawRange(0,0);
 sc.add(new T.Points(g,new T.PointsMaterial({color:c.INK,size:2.2,sizeAttenuation:false})));
 return{set:v=>g.setDrawRange(0,v)};
};
/* ch14: one flower */
SCENES.flower=(T,c)=>{const{sc,cam,solid,line,V}=c;
 cam.position.set(0,3.4,6.6);cam.lookAt(0,1.4,0);
 const f=new T.Group();sc.add(f);
 const head=new T.Group();head.position.y=2;head.rotation.x=.5;f.add(head);
 const pg=new T.SphereGeometry(.5,32,20);for(let i=0;i<7;i++){const p=solid(pg,1.04,0);p.scale.set(.42,.08,1);p.position.set(Math.sin(i/7*Math.PI*2)*.52,0,Math.cos(i/7*Math.PI*2)*.52);p.rotation.y=i/7*Math.PI*2;head.add(p)}
 const ce=solid(new T.SphereGeometry(.22,24,16),1.06,0);ce.position.y=.06;head.add(ce);
 f.add(line([V(0,0,0),V(.06,.7,.04),V(0,1.4,.08),V(0,1.95,.1)],1));
 const lf=solid(pg,1.04,0);lf.scale.set(.18,.04,.62);lf.position.set(.3,.8,.2);lf.rotation.set(.3,.9,-.5);f.add(lf);
 let r=0;return{set:v=>{r=v*Math.PI/180;f.rotation.y=r},turn:d=>{r+=d;f.rotation.y=r}};
};
/* ch16: an egg tapped on the rim of a bowl */
SCENES.egg=(T,c)=>{const{sc,cam,solid,line,V}=c;
 const g=new T.Group();sc.add(g);
 const pr=[];for(let i=0;i<=24;i++){const a=i/24*Math.PI/2;pr.push(new T.Vector2(Math.sin(a)*1.5+.001,-Math.cos(a)*1.1))}
 const bowl=solid(new T.LatheGeometry(pr,64),1.0,0);bowl.position.y=1.1;g.add(bowl);
 const rim=[];for(let i=0;i<=96;i++){const a=i/96*Math.PI*2;rim.push(V(Math.cos(a)*1.5,1.1,Math.sin(a)*1.5))}g.add(line(rim,1));
 const egg=solid(new T.SphereGeometry(.5,40,28),1.05,0);egg.scale.set(.72,1,.72);egg.position.set(1.62,1.62,0);egg.rotation.z=.6;g.add(egg);
 g.add(line([V(1.36,1.22,.08),V(1.42,1.3,.02),V(1.38,1.36,-.05),V(1.45,1.43,-.1)],1));
 g.add(line([V(1.95,2.6,0),V(1.85,2.3,0)],.6));g.add(line([V(2.2,2.4,0),V(2.0,2.2,0)],.6));
 const cd=V(),tgt=V(.5,1.2,0);let r=.3,el=.42;const place=()=>{cam.position.set(Math.sin(r)*7.6,1.2+Math.sin(el)*6,Math.cos(r)*7.6);cam.lookAt(tgt)};place();
 return{set:v=>{r=v*Math.PI/180;place()},turn:d=>{r+=d;place()}};
};
/* fix pass: route a dotted leader (page px) around label boxes; shortest of straight / one bend / two bends that clears every box by PAD px. Returns an SVG path in the 0–100 overlay space. */
function route(a,b,els,ob){const PAD=4;const R=els.filter(Boolean).map(e=>{const r=e.getBoundingClientRect();return[r.left-PAD,r.top-PAD,r.right+PAD,r.bottom+PAD]}).filter(r=>r[2]>r[0]);
 const hit=(p,q)=>R.some(([l,t,r,bm])=>{for(let i=0;i<=60;i++){const x=p[0]+(q[0]-p[0])*i/60,y=p[1]+(q[1]-p[1])*i/60;if(x>l&&x<r&&y>t&&y<bm)return true}return false});
 const len=P=>P.reduce((s,q,i)=>i?s+Math.hypot(q[0]-P[i-1][0],q[1]-P[i-1][1]):0,0),ok=P=>P.every((q,i)=>!i||!hit(P[i-1],q));
 const C=[];R.forEach(([l,t,r,bm])=>{const e=1;C.push([l-e,t-e],[r+e,t-e],[l-e,bm+e],[r+e,bm+e])});
 const inR=q=>R.some(([l,t,r,bm])=>q[0]>l&&q[0]<r&&q[1]>t&&q[1]<bm);if(inR(b)){const d=Math.hypot(a[0]-b[0],a[1]-b[1])||1;for(let k=1;k<d&&inR(b);k++)b=[b[0]+(a[0]-b[0])/d,b[1]+(a[1]-b[1])/d]}
 let best=ok([a,b])?[a,b]:null;const tryP=P=>{if(ok(P)&&(!best||len(P)<len(best)))best=P};
 if(!best){C.forEach(k=>tryP([a,k,b]));if(!best)C.forEach(k=>C.forEach(m=>tryP([a,k,m,b])))}
 if(!best)best=[a,b];
 return best.map((q,i)=>(i?'L':'M')+((q[0]-ob.left)/ob.width*100).toFixed(2)+' '+((q[1]-ob.top)/ob.height*100).toFixed(2)).join('')}
/* ch18: Eratosthenes' two shadows on a sphere */
SCENES.globe=(T,c)=>{const{sc,cam,solid,line,V}=c;
 cam.position.set(0,1.2,9.4);cam.lookAt(0,.2,0);c.light.set(60,0,0);
 const g=new T.Group();sc.add(g);g.add(solid(new T.SphereGeometry(2,64,40),1.025,0));
 const A=7.2*Math.PI/180;const n0=V(1,0,0),n1=V(Math.cos(A),Math.sin(A),0);
 const stick=n=>line([n.clone().multiplyScalar(2),n.clone().multiplyScalar(2.7)],1);g.add(stick(n0));g.add(stick(n1));
 g.add(line([V(0,0,0),n0.clone().multiplyScalar(2)],1));g.add(line([V(0,0,0),n1.clone().multiplyScalar(2)],1));
 // shadow at Alexandria: sun rays parallel to -x
 const tip=n1.clone().multiplyScalar(2.7),base=n1.clone().multiplyScalar(2);const sh=V(base.x-(tip.y-base.y)*Math.tan(A)*.0,base.y,0);
 const shadowEnd=base.clone().add(V(0,0,0)).add(n1.clone().cross(V(0,0,1)).multiplyScalar(-(2.7-2)*Math.tan(A)));g.add(line([base,shadowEnd],1));
 const rays=new T.Group();[[2.7*Math.sin(A),2.7*Math.cos(A)+.05],[0,2.75],[-.4,2.25],[-.8,1.95]].forEach(([y,x])=>rays.add(line([V(7,y,0),V(x,y,0)],.6,[.04,.1])));sc.add(rays);
 const arc=[];for(let i=0;i<=20;i++){const a=i/20*A;arc.push(V(Math.cos(a)*.9,Math.sin(a)*.9,0))}g.add(line(arc,1));
 let r=1.1;const place=()=>{cam.position.set(Math.sin(r)*11.5,1.2,Math.cos(r)*11.5);cam.lookAt(0,.6,0);cam.updateMatrixWorld();cam.translateX(1.3)};place();
 const ld=c.el.querySelector('[data-l=lead]');
 return{set:v=>{r=v*Math.PI/180;place()},turn:d=>{r-=d;place()},labels:()=>{if(!ld)return;{const pl=(k,v,dx)=>{const q=c.el.querySelector('[data-l='+k+']');if(!q)return;const p=v.clone().project(cam);q.style.left=((p.x+1)/2*100)+'%';q.style.top=((1-p.y)/2*100)+'%';q.style.transform='translate('+dx+',-50%)'};pl('syene',n0.clone().multiplyScalar(2.15).add(V(0,-.28,0)),'-100%');pl('alex',n1.clone().multiplyScalar(2.15).add(V(0,.32,0)),'-100%')}const cl=c.el.querySelector('[data-l=c72]'),ld2=c.el.querySelector('[data-l=lead2]');{const q=V(1.15,-.12,0).project(cam);cl.style.left=((q.x+1)/2*100)+'%';cl.style.top=((1-q.y)/2*100)+'%';cl.style.transform='translate(0,-50%)';{const sy=c.el.querySelector('[data-l=syene]');if(sy){sy.style.transform='translate(-100%,-50%)';const A=sy.getBoundingClientRect(),B=cl.getBoundingClientRect();if(A.right>B.left-4&&A.left<B.right+4&&A.bottom>B.top-4&&A.top<B.bottom+4)sy.style.transform='translate(-100%,calc(-50% + '+(B.bottom+4-A.top).toFixed(1)+'px))'}}const ob=c.el.getBoundingClientRect(),cb=c.el.querySelector('.icap').getBoundingClientRect(),lb=cl.getBoundingClientRect();ld2.setAttribute('d',route([cb.left+cb.width*.3,cb.bottom+6],[lb.right+2,lb.top-3],[c.el.querySelector('[data-l=alex]'),c.el.querySelector('.icap'),c.el.querySelector('[data-l=syene]')],ob))}const p=tip.clone().project(cam);const ib=c.el.querySelector('.inset').getBoundingClientRect(),ob=c.el.getBoundingClientRect();ld.setAttribute('d',route([ib.left-6,ib.bottom+6],[ob.left+(p.x+1)/2*ob.width,ob.top+(1-p.y)/2*ob.height],[c.el.querySelector('[data-l=alex]'),c.el.querySelector('.icap'),cl,c.el.querySelector('[data-l=syene]')],ob))}};
};
/* ch4: a field of shells; each generation most crack, survivors bud varied copies */
SCENES.shells=(T,c)=>{const{sc,cam,solid,V,opt}=c;
 cam.position.set(0,5.4,9.6);cam.lookAt(0,.6,0);
 const GEN=opt.gens,slots=[];const prof=(w,h)=>{const p=[];for(let i=0;i<=14;i++){const t=i/14;p.push(new T.Vector2(Math.max(.002,w*Math.sin(Math.PI*(t*.86+.06))*(1-t*.35)),t*h))}return p};
 const geo=(w,h)=>new T.LatheGeometry(prof(w,h),28);
 for(let i=0;i<GEN[0].length;i++){const x=(i%5-2)*1.7,z=(Math.floor(i/5)-1.5)*1.55;const m=solid(geo(.5,1),1.04,0);m.position.set(x,0,z);sc.add(m);slots.push({m,s:1,dying:0,born:0})}
 const show=(gi,anim)=>{const G=GEN[gi];G.forEach((o,i)=>{const sl=slots[i];if(anim&&o.b){sl.dying=1}else{sl.m.children.forEach(ch=>{ch.geometry.dispose&&0;ch.geometry=geo(o.w,o.h)});sl.m.scale.setScalar(1)}sl.next=o});};
 let gi=0;show(0,false);let ph=0;
 return{set:v=>{const anim=v>gi;gi=v;show(v,anim);ph=0},
  tick:()=>{let busy=false;slots.forEach(sl=>{if(sl.dying){busy=true;sl.dying+=.05;if(sl.dying<1.6){sl.m.scale.set(1+(sl.dying-1)*.6,Math.max(.01,1-(sl.dying-1)*1.6),1+(sl.dying-1)*.6)}else{sl.dying=0;sl.m.children.forEach(ch=>ch.geometry=geo(sl.next.w,sl.next.h));sl.born=.02}}
   else if(sl.born){busy=true;sl.born=Math.min(1,sl.born+.05);sl.m.scale.setScalar(sl.born);if(sl.born>=1)sl.born=0}});return busy}};
};
})();
