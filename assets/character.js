import * as THREE from './three.module.js';

const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t)};
const mix=(a,b,t)=>a+(b-a)*t;
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
const PALETTE={paper:'#e9e1d2',floor:'#d9ceb9',ink:'#283b43',coral:'#df765d',gold:'#e8bd62'};
const TIMELINE={anticipationEnd:3500,reactionEnd:8000,fallStart:8000,fallEnd:11500,impactEnd:11500,deadEnd:15000,ghostEnd:18500,retry1End:20250,retry2End:22000,finish:25500,nonfatalFinish:14000};

export function createCharacterStage(container,{onEvent=()=>{},onReady=()=>{},onError=()=>{}}={}){
  let renderer,scene,camera,resizeObs,raf=0,disposed=false,lastNow=null,clock=0;
  const state={profile:'hombre',phase:'idle',dead:false,playing:false,tasting:false,deadEventSent:false,progress:0,paused:false,neutral:false,intensity:0,massKg:70,activeNutrient:null,comparison:null,comparisonAvatar:null,levels:{energia:100,proteina:100,agua:100,fibra:100,hierro:100,vitC:100,calcio:100,sodio:100},cause:'mixed',fatal:false,critical:false,dominantNutrient:null,effects:[],started:0};let lastAppliedMorphMass=70;
  const mats={}; const geometries=[];const materials=[];const events=[];
  const mat=(color,roughness=.78,extra={})=>{const m=new THREE.MeshStandardMaterial({color,roughness,...extra});materials.push(m);return m};
  const sph=(parent,name,pos,scale,material,segments=28)=>{const m=new THREE.Mesh(new THREE.SphereGeometry(1,segments,Math.max(14,Math.floor(segments*.7))),material);m.name=name;m.position.set(...pos);m.scale.set(...scale);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m};
  const box=(parent,name,pos,scale,material,r=.08)=>{const g=new THREE.Group();g.position.set(...pos);const m=new THREE.Mesh(new THREE.BoxGeometry(...scale),material);m.name=name;m.castShadow=m.receiveShadow=true;g.add(m);parent.add(g);return g};
  const capsule=(parent,name,a,b,r,material,radial=16)=>{const va=V(...a),vb=V(...b),d=vb.clone().sub(va);const m=new THREE.Mesh(new THREE.CapsuleGeometry(r,Math.max(.015,d.length()-2*r),7,radial),material);m.name=name;m.position.copy(va).add(vb).multiplyScalar(.5);m.quaternion.setFromUnitVectors(V(0,1,0),d.normalize());m.castShadow=m.receiveShadow=true;parent.add(m);return m};
  const curveTube=(parent,name,points,r,material)=>{const curve=new THREE.CatmullRomCurve3(points.map(p=>V(...p)));const m=new THREE.Mesh(new THREE.TubeGeometry(curve,24,r,8,false),material);m.name=name;m.castShadow=true;parent.add(m);return m};
  const pivot=(parent,name,pos)=>{const p=new THREE.Group();p.name=name;p.position.set(...pos);parent.add(p);return p};
  const makeLook=(profile)=>{
    const female=profile==='mujer', skin=mat(female?'#e9ad89':'#d99a76'), skinShade=mat(female?'#cc816b':'#b97560'), hair=mat(female?'#342b35':'#3b332d'), hairLight=mat(female?'#58424c':'#59463a'), shirt=mat(female?'#b46c60':'#547f91'), shirtLight=mat(female?'#c77f72':'#668d98'), pants=mat(female?'#405966':'#394b53'), trim=mat(female?'#e7b974':'#e8c48a'), shoes=mat('#eee3cf'), white=mat('#fff8eb'), iris=mat(female?'#476775':'#3f5d55'), pupil=mat('#24353b'), mouthMat=mat('#633c3b'), blush=mat('#d77e72'), metal=mat('#ba9b6d',.35,{metalness:.35});
    const rig={profile};const pivotActor=pivot(scene,'actor-'+profile,[0,1.22,0]);const body=pivot(pivotActor,'body',[0,-1.22,0]);rig.actor=pivotActor;rig.body=body;rig.materials={skin,skinShade,hair,hairLight,shirt,shirtLight,pants,trim,shoes,white,iris,pupil,mouthMat,blush,metal};
    const hipWidth=female?.34:.39, shoulderWidth=female?.39:.46;
    // Continuous torso under an articulated jacket/top, with a clear waist and hem.
    const torso=sph(body,'torso',[0,1.48,0],[female?.40:.47,.55,.285],shirt,36);rig.torso=torso;
    rig.shirtFront=sph(body,'shirtFront',[0,1.49,.235],[female?.32:.375,.37,.045],shirtLight,30);
    const collar=curveTube(body,'collar',[[0,1.93,.21],[-.12,1.84,.275],[0,1.76,.29],[.12,1.84,.275],[0,1.93,.21]],.025,trim);
    rig.waist=sph(body,'waist',[0,1.02,0],[hipWidth*1.04,.10,.24],pants,32);
    // Hem, placket and understated garment detail.
    curveTube(body,'shirtHem',[[-.34,1.1,.20],[-.2,1.08,.26],[0,1.08,.27],[.2,1.08,.26],[.34,1.1,.20]],.018,trim);
    for(let y=1.56;y<1.8;y+=.1)sph(body,'button',[.015,y,.292],[.022,.022,.01],metal,12);
    const hairMeshes=[];
    if(female){
      sph(body,'scarf-knot',[0,1.82,.29],[.085,.09,.045],trim,20);
      // Neck-length hair has a distinct silhouette and stays behind the face.
      hairMeshes.push(sph(body,'hair-back',[0,2.52,-.095],[.43,.49,.28],hair,32));
      hairMeshes.push(sph(body,'hair-sideL',[-.36,2.29,-.015],[.13,.44,.22],hairLight,26),sph(body,'hair-sideR',[.36,2.28,-.015],[.13,.43,.22],hair,26));
      hairMeshes.push(sph(body,'hair-top',[-.015,2.83,-.035],[.405,.22,.31],hair,30));
      hairMeshes.push(sph(body,'fringe',[-.12,2.72,.205],[.25,.105,.12],hairLight,24));
      hairMeshes.push(sph(body,'clip',[-.28,2.79,.18],[.09,.035,.025],trim,18));
    }else{
      hairMeshes.push(sph(body,'hair-cap',[0,2.77,-.015],[.39,.22,.31],hair,30));
      hairMeshes.push(sph(body,'hair-sweep',[-.13,2.83,.105],[.24,.12,.22],hairLight,26));
      hairMeshes.push(sph(body,'sideburnL',[-.36,2.47,.015],[.075,.22,.19],hair,22),sph(body,'sideburnR',[.36,2.47,.015],[.075,.22,.19],hair,22));
    }
    const neck=sph(body,'neck',[0,2.01,0],[.15,.22,.15],skin,24);rig.neck=neck;
    const head=pivot(body,'head',[0,2.39,.005]);rig.head=head;
    hairMeshes.forEach(h=>{body.remove(h);h.position.y-=2.39;head.add(h)});
    const headShape=sph(head,'face',[0,.075,0],[female?.355:.39,.43,.32],skin,38);rig.headShape=headShape;
    sph(head,'earL',[-.37,.045,0],[.075,.12,.07],skin,20);sph(head,'earR',[.37,.045,0],[.075,.12,.07],skin,20);
    rig.cheeks=[];
    for(const [s,id] of [[-1,'L'],[1,'R']]){
      const eye=sph(head,'eye'+id,[s*.137,.12,.283],[.076,.09,.045],white,24);rig['eye'+id]=eye;
      const irisMesh=sph(head,'iris'+id,[s*.13,.12,.321],[.038,.049,.018],iris,20);rig['iris'+id]=irisMesh;
      rig['pupil'+id]=sph(head,'pupil'+id,[s*.13,.118,.336],[.019,.03,.01],pupil,16);
      rig['glint'+id]=sph(head,'glint'+id,[s*.139,.139,.345],[.009,.011,.006],white,12);
      const brow=pivot(head,'browPivot'+id,[s*.14,.25,.30]);curveTube(brow,'brow'+id,[[s*-.065,-.005,-.01],[0,.02,0],[s*.07,-.005,-.01]],.025,hairLight);rig['brow'+id]=brow;
      const lid=sph(head,'lid'+id,[s*.137,.16,.296],[.078,.018,.05],skin,20);rig['lid'+id]=lid;
      const deadCross=pivot(head,'deadCross'+id,[s*.137,.12,.343]);deadCross.visible=false;capsule(deadCross,'xbar1',[ -.035,-.035,0],[.035,.035,0],.012,mouthMat,8);capsule(deadCross,'xbar2',[ -.035,.035,.002],[.035,-.035,.002],.012,mouthMat,8);rig['deadCross'+id]=deadCross;
      rig.cheeks.push(sph(head,'cheek'+id,[s*.22,-.055,.268],[.075,.04,.024],blush,18));
    }
    sph(head,'nose',[0,.01,.32],[.06,.086,.07],skinShade,20);
    const smile=pivot(head,'smilePivot',[0,-.145,.30]);curveTube(smile,'smile',[[-.09,.025,-.01],[-.045,0,.015],[0,-.005,.02],[.045,0,.015],[.09,.025,-.01]],.013,mouthMat);rig.smile=smile;
    const mouthPivot=pivot(head,'mouthPivot',[0,-.145,.30]);const mouth=sph(mouthPivot,'mouth',[0,0,0],[.03,.018,.018],mouthMat,20);rig.mouth=mouth;rig.mouthPivot=mouthPivot;rig.tongue=sph(head,'tongue',[0,-.205,.324],[.045,.025,.018],mat('#d96e73'),18);rig.tongue.visible=false;
    // Neck scarf/collar anchors head to torso visually.
    if(female)curveTube(body,'neckline',[[-.14,1.98,.13],[0,1.9,.2],[.14,1.98,.13]],.035,trim);
    // Arms: overlapping shoulder cloth is sculpted into sleeves; forearms and palms join at wrists.
    rig.arms=[];
    for(const [side,id] of [[-1,'L'],[1,'R']]){
      const sh=pivot(body,'shoulder'+id,[side*shoulderWidth,1.77,0]);
      const upper=capsule(sh,'upper'+id,[0,.10,0],[side*.025,-.44,.01],.14,shirt,18);
      const cuff=sph(sh,'cuff'+id,[side*.03,-.39,.015],[.122,.085,.125],shirtLight,20);
      const elbow=pivot(sh,'elbow'+id,[side*.025,-.43,.015]);
      const fore=capsule(elbow,'forearm'+id,[0,0,0],[side*.018,-.39,.035],.085,skin,18);
      sph(elbow,'wrist'+id,[side*.018,-.365,.035],[.083,.09,.085],skin,20);
      const palm=sph(elbow,'palm'+id,[side*.018,-.465,.045],[.115,.12,.065],skin,22);
      for(let f=0;f<4;f++)capsule(elbow,'finger'+id+f,[side*(.018+(f-1.5)*.043),-.51,.09],[side*(.018+(f-1.5)*.05),-.59,.095],.022,skin,10);
      capsule(elbow,'thumb'+id,[side*.105,-.445,.075],[side*.16,-.49,.09],.03,skin,12);
      rig.arms.push({side,id,sh,elbow,upper,fore,cuff,palm});
    }
    // Legs form one readable trouser silhouette through the hips, knee darts and joined feet.
    rig.legs=[];
    rig.trousers=capsule(body,'trousers',[0,.84,0],[0,1.08,0],female?.29:.32,pants,20);
    for(const [side,id] of [[-1,'L'],[1,'R']]){
      const hip=pivot(body,'leg'+id,[side*hipWidth*.52,1.05,0]);
      const thigh=capsule(hip,'thigh'+id,[0,-.08,0],[side*.015,-.55,0],female?.145:.16,pants,20);
      const seam=curveTube(hip,'seam'+id,[[side*.08,-.12,.12],[side*.085,-.31,.13],[side*.07,-.48,.11]],.012,trim);
      const knee=pivot(hip,'knee'+id,[side*.015,-.48,.005]);
      const shin=capsule(knee,'shin'+id,[0,.07,0],[side*.012,-.43,0],.105,pants,18);
      const sock=sph(knee,'sock'+id,[0,-.37,.015],[.11,.09,.11],shirtLight,18);
      const foot=pivot(knee,'foot'+id,[0,-.46,.025]);
      sph(foot,'shoe'+id,[0,-.005,.07],[.16,.09,.28],shoes,24);
      sph(foot,'sole'+id,[0,-.06,.08],[.163,.032,.275],trim,20);
      rig.legs.push({side,id,hip,knee,foot,thigh,shin});
    }
    // Prop is already in hand at rest and remains visibly trapped after the fall.
    const rightArm=rig.arms.find(a=>a.id==='R');const spoon=pivot(rightArm.elbow,'spoon',[.018,-.45,.11]);spoon.scale.setScalar(1.45);rig.spoon=spoon;
    const bowl=sph(spoon,'spoonBowl',[0,.28,.01],[.075,.085,.019],metal,20);bowl.rotation.z=-.25;
    capsule(spoon,'spoonHandle',[0,-.08,.01],[0,.23,.01],.022,metal,12);
    // Contact shadow is a soft translucent sprite-like ellipse on the floor.
    const shadow=new THREE.Mesh(new THREE.CircleGeometry(1,48),mat('#6d675d',1,{transparent:true,opacity:.16,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.set(0,.012,.03);shadow.scale.set(.85,.38,1);shadow.receiveShadow=true;scene.add(shadow);rig.shadow=shadow;
    rig.base={actorPos:pivotActor.position.clone(),bodyPos:body.position.clone(),torsoScale:torso.scale.clone(),shirtFrontScale:rig.shirtFront.scale.clone(),waistScale:rig.waist.scale.clone(),trousersScale:rig.trousers.scale.clone(),headPos:head.position.clone(),headRot:head.rotation.clone(),headShapeScale:headShape.scale.clone(),cheekScales:rig.cheeks.map(c=>c.scale.clone()),spoonPos:spoon.position.clone(),shadowScale:shadow.scale.clone()};
    return rig;
  }
  let rigs={};let active;
  const makeProp=(parent,name,pos,scale,color)=>sph(parent,name,pos,scale,mat(color,.55,{transparent:true,opacity:.78,emissive:color,emissiveIntensity:.07}),18);
  let sweat=[],stars=[],ghost,ghostParts=[];
  let ghostArm,ghostHand,ghostEyes=[],ghostStyleParts={};
  function setGhostProfile(profile){for(const [key,obj] of Object.entries(ghostStyleParts))obj.visible=key.startsWith(profile==='mujer'?'female':'male');}
  function setupScene(){
    scene=new THREE.Scene();scene.background=new THREE.Color(PALETTE.paper);scene.fog=new THREE.Fog(PALETTE.paper,10,24);
    camera=new THREE.OrthographicCamera(-3,3,3,-3,.1,40);camera.position.set(0,4.0,10);camera.lookAt(0,1.55,0);
    renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.6));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;renderer.setClearColor(PALETTE.paper);container.appendChild(renderer.domElement);renderer.domElement.setAttribute('aria-label','Escena ilustrada con un personaje caricaturesco');
    scene.add(new THREE.HemisphereLight('#fff7ea','#7d827e',2.1));const key=new THREE.DirectionalLight('#fff4dc',3.1);key.position.set(-3.8,7,5);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-4;key.shadow.camera.right=4;key.shadow.camera.top=5;key.shadow.camera.bottom=-3;key.shadow.bias=-.00035;scene.add(key);const fill=new THREE.DirectionalLight('#a6ced1',1.05);fill.position.set(4,3,2);scene.add(fill);const rim=new THREE.DirectionalLight('#f0a58e',1.1);rim.position.set(0,4,-4);scene.add(rim);
    const floor=new THREE.Mesh(new THREE.PlaneGeometry(80,80),mat(PALETTE.floor));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;floor.position.y=-.03;scene.add(floor);
    const dais=new THREE.Mesh(new THREE.CircleGeometry(1.55,64),mat('#cbbda5'));dais.rotation.x=-Math.PI/2;dais.position.set(0,-.012,0);dais.scale.set(1,.62,1);dais.receiveShadow=true;scene.add(dais);
    for(const profile of ['hombre','mujer'])rigs[profile]=makeLook(profile);active=rigs[state.profile];rigs.mujer.actor.visible=false;
    ghost=pivot(scene,'ghost',[0,1,0]);const ghostSkin=mat('#fff5df',.32,{transparent:true,opacity:.78,emissive:'#fff2d6',emissiveIntensity:.35});const ghostCloth=mat('#9fc3c1',.35,{transparent:true,opacity:.72,emissive:'#97c3bd',emissiveIntensity:.25});
    sph(ghost,'ghostBody',[0,-.25,0],[.24,.37,.16],ghostCloth,26);sph(ghost,'ghostHead',[0,.18,0],[.31,.34,.24],ghostSkin,30);
    ghostStyleParts.maleHair=sph(ghost,'ghostMaleHair',[0,.39,-.04],[.30,.15,.22],mat('#665b5b',.55,{transparent:true,opacity:.64}),24);
    ghostStyleParts.femaleBack=sph(ghost,'ghostFemaleBack',[0,.12,-.09],[.31,.40,.17],mat('#513f4c',.55,{transparent:true,opacity:.68}),26);
    ghostStyleParts.femaleSideL=sph(ghost,'ghostFemaleSideL',[-.27,.03,.01],[.105,.31,.13],mat('#624a57',.55,{transparent:true,opacity:.68}),20);
    ghostStyleParts.femaleSideR=sph(ghost,'ghostFemaleSideR',[.27,.03,.01],[.105,.31,.13],mat('#624a57',.55,{transparent:true,opacity:.68}),20);
    ghostStyleParts.femaleClip=sph(ghost,'ghostFemaleClip',[-.18,.38,.17],[.075,.025,.018],mat('#e8bd62',.4,{transparent:true,opacity:.8}),16);
    for(const part of Object.values(ghostStyleParts))part.visible=false;
    for(const s of [-1,1])ghostEyes.push(sph(ghost,'ghostEye'+s,[s*.105,.22,.22],[.035,.045,.02],mat('#58696a',.4,{transparent:true,opacity:.75}),16));
    ghostArm=pivot(ghost,'ghostArm',[-.06,-.04,.14]);capsule(ghostArm,'ghostUpperArm',[0,0,0],[-.48,-.08,.015],.075,ghostCloth,14);capsule(ghostArm,'ghostForearm',[-.43,-.075,.015],[-.78,-.12,.035],.055,ghostSkin,14);ghostHand=sph(ghostArm,'ghostHand',[-.82,-.12,.04],[.09,.065,.05],ghostSkin,18);
    ghostParts.push(...ghost.children);ghost.visible=false;
    for(let i=0;i<7;i++){const drop=makeProp(scene,'sweat',[0,0,0],[.035,.06,.02],'#78a9b3');drop.visible=false;sweat.push(drop)}
    for(let i=0;i<7;i++){const star=pivot(scene,'impact-star',[0,0,0]);const g=new THREE.OctahedronGeometry(.09,.0);const m=new THREE.Mesh(g,mat(i%2?'#e8bd62':'#df765d',.45,{emissive:i%2?'#b6853a':'#a64c3c',emissiveIntensity:.16}));star.add(m);m.castShadow=true;star.visible=false;stars.push(star)}
    resizeObs=new ResizeObserver(resize);resizeObs.observe(container);resize();
  }
  function resize(){if(!renderer||disposed)return;const w=container.clientWidth,h=container.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);const aspect=w/h;const viewH=Math.max(4.8,4.45/aspect);camera.left=-viewH*aspect/2;camera.right=viewH*aspect/2;camera.top=viewH/2;camera.bottom=-viewH/2;camera.updateProjectionMatrix();}
  const profileStress=()=>{
    const l=state.levels, keys=['energia','proteina','agua','fibra','hierro','vitC','calcio','sodio'];
    // The whole dashboard controls the caricature, with a broad calm band around 100.
    // These are theatrical response curves, not physiological thresholds.
    const lowByKey=Object.fromEntries(keys.map(k=>[k,clamp((65-(l[k]??100))/65)]));
    const highByKey=Object.fromEntries(keys.map(k=>[k,clamp(((l[k]??100)-160)/190)]));
    const deficit=Math.max(...Object.values(lowByKey));
    const imbalance=Math.max(...Object.values(highByKey),clamp((l.agua??100)-140,0,160)/160,clamp((l.sodio??100)-135,0,165)/165,clamp((l.fibra??100)-170,0,180)/180,clamp((l.vitC??100)-180,0,190)/190,clamp((l.calcio??100)-190,0,200)/200);
    const stress=state.neutral?0:clamp(Math.max(deficit,imbalance)*(.48+.72*state.intensity));
    const cues=[];if((l.agua??100)<60)cues.push('waterLow');if((l.agua??100)>160)cues.push('waterHigh');if((l.energia??100)<65||(l.proteina??100)<65)cues.push('energy');if((l.sodio??100)>140)cues.push('salt');if((l.fibra??100)<65||(l.fibra??100)>170||(l.vitC??100)>180||(l.vitC??100)<65||(l.energia??100)>160||(l.proteina??100)>160)cues.push('gut');if((l.hierro??100)<60||(l.calcio??100)<65)cues.push('iron');if((l.hierro??100)>160)cues.push('energy');if((l.sodio??100)<65)cues.push('sodiumLow');if((l.calcio??100)>160)cues.push('iron');
    const effects=state.neutral?[]:keys.flatMap(nutrient=>{const value=Number(l[nutrient]??100);if(value<=65)return[{nutrient,direction:'low',strength:clamp((65-value)/65)}];if(value>=160)return[{nutrient,direction:'high',strength:clamp((value-160)/190)}];return[];});
    const strongest=effects.reduce((best,e)=>!best||e.strength>best.strength?e:best,null),selected=effects.find(e=>e.nutrient===state.activeNutrient),dominant=selected&&strongest&&selected.strength>=strongest.strength-.08?selected:strongest;
    const critical=!state.neutral&&keys.some(n=>Number(l[n]??100)<=10||Number(l[n]??100)>=280);
    return{stress,deficit,imbalance,cue:cues[0]||'mixed',cues,effects,critical,dominantNutrient:dominant?.nutrient||null};
  };
  function captureComparisonAvatar(){
    if(state.comparisonAvatar){scene.remove(state.comparisonAvatar);state.comparisonAvatar=null;}
    const clone=active.actor.clone(true);clone.name='comparison-before-'+state.profile;clone.position.copy(active.base.actorPos);clone.rotation.set(0,0,0);clone.scale.set(1,1,1);
    const body=clone.getObjectByName('body');if(body){body.position.copy(active.base.bodyPos);body.rotation.set(0,0,0);}
    const torso=clone.getObjectByName('torso');if(torso)torso.rotation.set(0,0,0);
    const head=clone.getObjectByName('head');if(head)head.rotation.set(0,0,0);
    const morph=state.massKg<70?(state.massKg-70)/30:(state.massKg-70)/90;
    const resetScale=(name,base,xFactor,yFactor,zFactor)=>{const o=clone.getObjectByName(name);if(o)o.scale.set(base.x*(1+morph*xFactor),base.y*(1+morph*yFactor),base.z*(1+morph*zFactor));};
    resetScale('torso',active.base.torsoScale,morph<0?.25:.5,.12,morph<0?.3:.75);resetScale('shirtFront',active.base.shirtFrontScale,morph<0?.25:.5,.12,morph<0?.3:.75);resetScale('waist',active.base.waistScale,.48,.12,.46);resetScale('trousers',active.base.trousersScale,.4,.08,.42);
    const shirtFront=clone.getObjectByName('shirtFront');if(shirtFront)shirtFront.position.z=.285*(1+morph*(morph<0?.3:.75))-.02;
    const face=clone.getObjectByName('face');if(face)face.scale.set((state.profile==='mujer'?.355:.39)*(1+morph*.09),active.base.headShapeScale.y,active.base.headShapeScale.z*(1+morph*.07));
    for(let i=0;i<2;i++){const cheek=clone.getObjectByName('cheek'+(i===0?'L':'R'));if(cheek)cheek.scale.copy(active.base.cheekScales[i]);}
    clone.traverse(o=>{if(o.isGroup&&/^shoulder/.test(o.name)){const side=o.name.endsWith('L')?-1:1;o.rotation.set(0,0,side*.30);}else if(o.isGroup&&(/^(elbow|leg|knee|foot)/.test(o.name)))o.rotation.set(0,0,0);if(o.name.startsWith('deadCross'))o.visible=false;if(o.name==='tongue'||o.name==='mouth')o.visible=false;if(o.name==='smilePivot'){o.rotation.set(0,0,0);o.visible=true;}if(o.name==='mouthPivot')o.rotation.set(0,0,0);if(o.name.startsWith('browPivot'))o.rotation.set(0,0,0);if(o.name.startsWith('lid'))o.scale.y=.018;if(o.name.startsWith('iris')){o.position.set(o.position.x<0?-.13:.13,.12,.321);o.visible=true;}if(o.name.startsWith('pupil')){const side=o.name.endsWith('L')?-1:1;o.position.set(side*.13,.118,.336);o.visible=true;}if(o.name.startsWith('glint')){const side=o.name.endsWith('L')?-1:1;o.position.set(side*.139,.139,.345);o.visible=true;}if(o.isMesh)o.castShadow=false;});
    state.comparisonAvatar=clone;clone.visible=false;scene.add(clone);
  }
  function setComparison(mode=null){
    if(![null,'before','after'].includes(mode))return getState();
    if(mode==='before'&&!state.comparisonAvatar)captureComparisonAvatar();
    state.comparison=mode;
    if(mode==='before'){active.actor.visible=false;state.comparisonAvatar.visible=true;ghost.visible=false;stars.forEach(s=>s.visible=false);sweat.forEach(p=>p.visible=false);}
    else{if(state.comparisonAvatar)state.comparisonAvatar.visible=false;active.actor.visible=true;}
    return getState();
  }
  function expression(rig,stress,cause,t){
    const head=rig.head;const closed=smooth(.36,.9,stress);const worry=smooth(.12,.7,stress);const alive=!state.dead;
    const blink=Math.max(0,1-Math.abs((t%4)-2.15)/.13);
    for(const id of ['L','R']){rig['deadCross'+id].visible=state.dead&&['dead','ghost'].includes(state.phase);rig['lid'+id].scale.y=.005+closed*.105+blink*.085;const side=id==='L'?-1:1;let gx=.02,gy=-.012;if(cause==='waterLow')gy=.045;if(cause==='gut'){gx=-side*.022;gy=-.026;}if(cause==='waterHigh')gx=side*.022;if(cause==='energy'||cause==='iron')gy=-.02;rig['iris'+id].position.set(side*.13+gx,.12+gy,.321);rig['iris'+id].visible=!rig['deadCross'+id].visible;rig['pupil'+id].visible=!state.dead;rig['glint'+id].visible=!state.dead;rig['brow'+id].rotation.z=side*(.075+worry*.28)+(cause==='gut'?side*.12:0);rig['brow'+id].scale.x=1+worry*.2;}
    const uncomfortable=['waterLow','waterHigh','salt','gut','energy','iron','sodiumLow'].includes(cause);rig.smile.visible=stress<.26&&alive&&!uncomfortable;rig.mouth.visible=stress>=.26||!alive||uncomfortable;rig.mouth.scale.set(.03+stress*.052,.018+stress*.07,.018);
    head.rotation.z=Math.sin(t*.45)*.018+(stress>.5?-.16:0);head.rotation.x=stress>.57?.2:0;
    const morph=state.massKg<70?(state.massKg-70)/30:(state.massKg-70)/90;const waterPuff=state.neutral?0:clamp(((state.levels.agua??100)-140)/210);rig.torso.scale.x=(rig.profile==='mujer'?.40:.47)*(1+morph*(morph<0?.25:.5))*(1-stress*.12)*(1+waterPuff*.055);rig.torso.scale.y=.55*(1+morph*.12)*(1-stress*.1)*(1+waterPuff*.025);rig.torso.scale.z=.285*(1+morph*(morph<0?.3:.75))*(1+waterPuff*.24);rig.shirtFront.scale.set(rig.base.shirtFrontScale.x*(1+morph*(morph<0?.25:.5))*(1+waterPuff*.055),rig.base.shirtFrontScale.y*(1+morph*.12)*(1+waterPuff*.025),rig.base.shirtFrontScale.z*(1+morph*(morph<0?.3:.75))*(1+waterPuff*.24));rig.shirtFront.position.z=.285*(1+morph*(morph<0?.3:.75))-.02+waterPuff*.028;rig.cheeks.forEach((cheek,i)=>{const b=rig.base.cheekScales[i];cheek.scale.set(b.x*(1+waterPuff*.12),b.y*(1+waterPuff*.1),b.z*(1+waterPuff*.1));});rig.torso.rotation.z=stress>.35?.085:0;
    rig.tongue.scale.set(.045,.025,.018);rig.tongue.visible=alive&&!state.neutral&&cause==='waterLow'&&stress>.15;rig.tongue.position.y=-.205+Math.sin(t*5.2)*.006*(rig.tongue.visible?1:0);if(rig.tongue.visible){rig.mouth.visible=true;rig.mouth.scale.set(.055+stress*.025,.045+stress*.035,.022);head.rotation.y=Math.sin(t*3.2)*(.1+stress*.14);for(const id of ['L','R']){const side=id==='L'?-1:1;rig['iris'+id].position.x=side*.13+Math.sin(t*2.8+(id==='L'?0:Math.PI))*.025;rig['iris'+id].position.y=.12-.025*Math.abs(Math.sin(t*2.8));}}
  }
  function solveArmToTarget(rig,arm,target,amount,endOffset){
    if(amount<=0)return null;
    rig.actor.updateMatrixWorld(true);
    const body=rig.body,shoulder=arm.sh.position.clone(),upperLength=arm.elbow.position.length(),gripOffset=endOffset.clone(),foreLength=gripOffset.length();
    const upperRadius=.14*Math.max(arm.upper.scale.x,arm.upper.scale.z),foreRadius=.085*Math.max(arm.fore.scale.x,arm.fore.scale.z),handClearance=Math.max(foreRadius,arm.palm.scale.z)+.018;
    const toTarget=target.clone().sub(shoulder),distance=toTarget.length(),axis=toTarget.clone().normalize();
    const d=clamp(distance,Math.abs(upperLength-foreLength)+.002,upperLength+foreLength-.006),along=(upperLength*upperLength-foreLength*foreLength+d*d)/(2*d),bend=Math.sqrt(Math.max(0,upperLength*upperLength-along*along));
    const front=V(0,0,1).addScaledVector(axis,-axis.z).normalize();if(front.lengthSq()<.1)front.set(1,0,0).addScaledVector(axis,-axis.x).normalize();
    const side=new THREE.Vector3().crossVectors(axis,front).normalize();
    const signedEllipsoid=(point,mesh,radius)=>{const p=mesh.position,s=mesh.scale,v=point.clone().sub(p).applyQuaternion(mesh.quaternion.clone().invert()),sx=Math.max(.001,s.x),sy=Math.max(.001,s.y),sz=Math.max(.001,s.z),q=Math.sqrt((v.x/sx)**2+(v.y/sy)**2+(v.z/sz)**2),grad=q>1e-5?Math.sqrt((v.x/(sx*sx))**2+(v.y/(sy*sy))**2+(v.z/(sz*sz))**2)/q:0;return(grad>1e-5?(q-1)/grad:-Math.min(sx,sy,sz))-radius;};
    const clearanceAt=(point,radius)=>Math.min(signedEllipsoid(point,rig.torso,radius),signedEllipsoid(point,rig.shirtFront,radius));
    // A small proximal joint overlap is allowed in elbow selection so the distal forearm wins when the shoulder seam cannot clear both ellipsoids; reported clearances remain unmodified.
    const proximalJointAllowance=.02,pathClearance=(elbowPoint)=>{let upperClearance=Infinity,foreClearance=Infinity;for(let i=1;i<=6;i++){const p=shoulder.clone().lerp(elbowPoint,.25+i*.125);upperClearance=Math.min(upperClearance,clearanceAt(p,upperRadius));}for(let i=0;i<=6;i++){const p=elbowPoint.clone().lerp(target,i/6);foreClearance=Math.min(foreClearance,clearanceAt(p,foreRadius));}return Math.min(foreClearance,upperClearance+proximalJointAllowance);};
    let bestElbow=null,bestClearance=-Infinity;
    for(let i=0;i<36;i++){const angle=i*Math.PI*2/36,perp=front.clone().multiplyScalar(Math.cos(angle)).addScaledVector(side,Math.sin(angle)),candidate=shoulder.clone().addScaledVector(axis,along).addScaledVector(perp,bend),clearance=pathClearance(candidate);if(clearance>bestClearance){bestClearance=clearance;bestElbow=candidate;}}
    const shoulderVector=bestElbow.clone().sub(shoulder),shoulderTarget=new THREE.Quaternion().setFromUnitVectors(arm.elbow.position.clone().normalize(),shoulderVector.clone().normalize());
    const shoulderInverse=shoulderTarget.clone().invert(),foreVector=target.clone().sub(bestElbow).applyQuaternion(shoulderInverse),elbowTarget=new THREE.Quaternion().setFromUnitVectors(gripOffset.clone().normalize(),foreVector.normalize());
    const shoulderBase=arm.sh.quaternion.clone(),elbowBase=arm.elbow.quaternion.clone();arm.sh.quaternion.copy(shoulderBase).slerp(shoulderTarget,amount);arm.elbow.quaternion.copy(elbowBase).slerp(elbowTarget,amount);
    rig.actor.updateMatrixWorld(true);
    const bodyPoint=worldPoint=>body.worldToLocal(worldPoint.clone()),shoulderNow=bodyPoint(arm.sh.getWorldPosition(V())),elbowNow=bodyPoint(arm.elbow.getWorldPosition(V()));let upperClearance=Infinity,foreClearance=Infinity;
    for(let i=1;i<=6;i++){const p=shoulderNow.clone().lerp(elbowNow,.25+i*.125);upperClearance=Math.min(upperClearance,clearanceAt(p,upperRadius));}
    const endpointNow=bodyPoint(arm.elbow.localToWorld(gripOffset.clone()));for(let i=0;i<=6;i++){const p=elbowNow.clone().lerp(endpointNow,i/6);foreClearance=Math.min(foreClearance,clearanceAt(p,foreRadius));}
    const clearance={upper:Number(upperClearance.toFixed(3)),fore:Number(foreClearance.toFixed(3)),units:'scene units',signed:true,shoulderZoneExcluded:.25};
    rig.armClearance=rig.armClearance||{};rig.armClearance[arm.id]=clearance;return clearance;
  }
  function gripSpoonAtMouth(rig,amount){
    if(amount<=0)return;const arm=rig.arms.find(a=>a.id==='R');if(!arm)return;
    rig.actor.updateMatrixWorld(true);
    const body=rig.body,mouth=body.worldToLocal(rig.mouth.getWorldPosition(V())),bowlOffset=.28*rig.spoon.scale.y,handX=clamp(arm.sh.position.x*.62,.2,.34),handClearance=Math.max(.085*Math.max(arm.fore.scale.x,arm.fore.scale.z),arm.palm.scale.z)+.018;
    const frontAt=(mesh,x,y)=>{const s=mesh.scale,p=mesh.position,q=mesh.quaternion.clone().invert(),origin=V(x-p.x,y-p.y,-p.z).applyQuaternion(q),direction=V(0,0,1).applyQuaternion(q),a=(direction.x/s.x)**2+(direction.y/s.y)**2+(direction.z/s.z)**2,b=2*(origin.x*direction.x/(s.x*s.x)+origin.y*direction.y/(s.y*s.y)+origin.z*direction.z/(s.z*s.z)),c=(origin.x/s.x)**2+(origin.y/s.y)**2+(origin.z/s.z)**2-1,disc=b*b-4*a*c;if(disc<0)return p.z;return(-b+Math.sqrt(disc))/(2*a);};
    let handY=mouth.y-.36,gripZ=.2;for(let i=0;i<8;i++){const surface=Math.max(frontAt(rig.torso,handX,handY),frontAt(rig.shirtFront,handX,handY));gripZ=surface+handClearance;const dx=mouth.x-handX,dz=mouth.z-gripZ,vertical=Math.sqrt(Math.max(.008,bowlOffset*bowlOffset-dx*dx-dz*dz));handY=mix(handY,mouth.y-vertical,.58);}
    const target=V(handX,handY,gripZ);rig.actor.updateMatrixWorld(true);const baseGrip=rig.body.worldToLocal(arm.elbow.localToWorld(rig.base.spoonPos.clone())),route=amount*2,wayX=Math.max(handX+.18,arm.sh.position.x*.88),wayY=mix(baseGrip.y,handY,.72),wayZ=Math.max(frontAt(rig.torso,wayX,wayY),frontAt(rig.shirtFront,wayX,wayY))+handClearance+.09,waypoint=V(wayX,wayY,wayZ),rawPathTarget=route<1?baseGrip.clone().lerp(waypoint,smooth(0,1,route)):waypoint.lerp(target,smooth(0,1,route-1)),shoulder=arm.sh.position.clone(),maxReach=arm.elbow.position.length()+rig.base.spoonPos.length()-.012,pathTarget=rawPathTarget.clone();
    // The straight interpolation between safe endpoints can cut through the belly. Keep each frame's grip on the rotated torso/shirt front and inside the arm's reachable sphere.
    const routeClearance=.02*Math.sin(Math.PI*clamp(route/2));for(let i=0;i<6;i++){const surface=Math.max(frontAt(rig.torso,pathTarget.x,pathTarget.y),frontAt(rig.shirtFront,pathTarget.x,pathTarget.y));pathTarget.z=Math.max(pathTarget.z,surface+handClearance+routeClearance);const delta=pathTarget.clone().sub(shoulder),dz=pathTarget.z-shoulder.z,planar=Math.hypot(delta.x,delta.y),maxPlanar=Math.sqrt(Math.max(0,maxReach*maxReach-dz*dz));if(planar>maxPlanar&&planar>1e-6){const k=maxPlanar/planar;pathTarget.x=shoulder.x+delta.x*k;pathTarget.y=shoulder.y+delta.y*k;}}const finalSurface=Math.max(frontAt(rig.torso,pathTarget.x,pathTarget.y),frontAt(rig.shirtFront,pathTarget.x,pathTarget.y));pathTarget.z=Math.max(pathTarget.z,finalSurface+handClearance+routeClearance);
    const solved=solveArmToTarget(rig,arm,pathTarget,1,rig.base.spoonPos);
    if(!solved)return;const jointNow=arm.sh.quaternion.clone().multiply(arm.elbow.quaternion),mouthVector=mouth.clone().sub(target).normalize(),aim=new THREE.Quaternion().setFromUnitVectors(V(0,1,0),mouthVector),spoonTarget=jointNow.clone().invert().multiply(aim);
    rig.spoon.position.copy(rig.base.spoonPos);rig.spoon.quaternion.identity().slerp(spoonTarget,amount);
    rig.actor.updateMatrixWorld(true);
    const bodyPoint=worldPoint=>body.worldToLocal(worldPoint.clone()),shoulderNow=bodyPoint(arm.sh.getWorldPosition(V())),elbowNow=bodyPoint(arm.elbow.getWorldPosition(V())),endpointNow=bodyPoint(rig.spoon.getWorldPosition(V()));
    const radius=.085*Math.max(arm.fore.scale.x,arm.fore.scale.z),signedEllipsoid=(point,mesh)=>{const p=mesh.position,s=mesh.scale,inv=mesh.quaternion.clone().invert(),v=point.clone().sub(p).applyQuaternion(inv),sx=Math.max(.001,s.x),sy=Math.max(.001,s.y),sz=Math.max(.001,s.z),q=Math.sqrt((v.x/sx)**2+(v.y/sy)**2+(v.z/sz)**2),grad=q>1e-5?Math.sqrt((v.x/(sx*sx))**2+(v.y/(sy*sy))**2+(v.z/(sz*sz))**2)/q:0;return(grad>1e-5?(q-1)/grad:-Math.min(sx,sy,sz))-radius;};
    const clear=(p)=>Math.min(signedEllipsoid(p,rig.torso),signedEllipsoid(p,rig.shirtFront));let upper=Infinity,fore=Infinity;for(let i=1;i<=8;i++)upper=Math.min(upper,clear(shoulderNow.clone().lerp(elbowNow,.25+i*.09375)));for(let i=0;i<=8;i++)fore=Math.min(fore,clear(elbowNow.clone().lerp(endpointNow,i/8)));
    rig.armClearance=rig.armClearance||{};rig.armClearance.R={upper:Number(upper.toFixed(3)),fore:Number(fore.toFixed(3)),units:'scene units',signed:true,shoulderZoneExcluded:.25,sampled:true};
  }
  function measureArmClearance(rig,arm){
    const body=rig.body;rig.actor.updateMatrixWorld(true);body.updateMatrixWorld(true);
    const bodyPoint=p=>body.worldToLocal(p.clone()),shoulder=bodyPoint(arm.sh.getWorldPosition(V())),elbow=bodyPoint(arm.elbow.getWorldPosition(V())),endpoint=bodyPoint(arm.id==='R'?rig.spoon.getWorldPosition(V()):arm.palm.getWorldPosition(V())),upperRadius=.14*Math.max(arm.upper.scale.x,arm.upper.scale.z),foreRadius=.085*Math.max(arm.fore.scale.x,arm.fore.scale.z);
    const signed=(p,mesh,radius)=>{const c=mesh.position,s=mesh.scale,v=p.clone().sub(c).applyQuaternion(mesh.quaternion.clone().invert()),sx=Math.max(.001,s.x),sy=Math.max(.001,s.y),sz=Math.max(.001,s.z),q=Math.sqrt((v.x/sx)**2+(v.y/sy)**2+(v.z/sz)**2),grad=q>1e-5?Math.sqrt((v.x/(sx*sx))**2+(v.y/(sy*sy))**2+(v.z/(sz*sz))**2)/q:0;return(grad>1e-5?(q-1)/grad:-Math.min(sx,sy,sz))-radius;},clear=p=>Math.min(signed(p,rig.torso,0),signed(p,rig.shirtFront,0));
    let upper=Infinity,fore=Infinity,upperAt=.25,foreAt=0;for(let i=1;i<=8;i++){const u=.25+i*.09375,value=clear(shoulder.clone().lerp(elbow,u))-upperRadius;if(value<upper){upper=value;upperAt=u;}}for(let i=0;i<=8;i++){const u=i/8,value=clear(elbow.clone().lerp(endpoint,u))-foreRadius;if(value<fore){fore=value;foreAt=u;}}
    rig.armClearance=rig.armClearance||{};rig.armClearance[arm.id]={upper:Number(upper.toFixed(3)),fore:Number(fore.toFixed(3)),upperAt:Number(upperAt.toFixed(3)),foreAt:Number(foreAt.toFixed(3)),units:'scene units',signed:true,shoulderZoneExcluded:.25,sampled:true};return rig.armClearance[arm.id];
  }
  function guardArmAgainstTorso(rig,arm,bellyGesture=false,gesture=null){
    const current=measureArmClearance(rig,arm);if(!gesture&&current.fore>=.012&&current.upper>=-.012)return;
    const body=rig.body,usesSpoon=arm.id==='R',endObject=usesSpoon?rig.spoon:arm.palm,hand=body.worldToLocal(endObject.getWorldPosition(V())),frontAt=(mesh,x,y)=>{const s=mesh.scale,p=mesh.position,q=mesh.quaternion.clone().invert(),origin=V(x-p.x,y-p.y,-p.z).applyQuaternion(q),direction=V(0,0,1).applyQuaternion(q),a=(direction.x/s.x)**2+(direction.y/s.y)**2+(direction.z/s.z)**2,b=2*(origin.x*direction.x/(s.x*s.x)+origin.y*direction.y/(s.y*s.y)+origin.z*direction.z/(s.z*s.z)),c=(origin.x/s.x)**2+(origin.y/s.y)**2+(origin.z/s.z)**2-1,disc=b*b-4*a*c;return disc<0?p.z:(-b+Math.sqrt(disc))/(2*a);},frontSurface=(mesh,x,y)=>{const s=mesh.scale,p=mesh.position,q=mesh.quaternion.clone().invert(),origin=V(x-p.x,y-p.y,-p.z).applyQuaternion(q),direction=V(0,0,1).applyQuaternion(q),a=(direction.x/s.x)**2+(direction.y/s.y)**2+(direction.z/s.z)**2,b=2*(origin.x*direction.x/(s.x*s.x)+origin.y*direction.y/(s.y*s.y)+origin.z*direction.z/(s.z*s.z)),c=(origin.x/s.x)**2+(origin.y/s.y)**2+(origin.z/s.z)**2-1,disc=b*b-4*a*c;return disc<0?null:(-b+Math.sqrt(disc))/(2*a);};
    const surface=Math.max(frontAt(rig.torso,hand.x,hand.y),frontAt(rig.shirtFront,hand.x,hand.y)),sideExtent=rig.torso.scale.x*Math.sqrt(Math.max(0,1-((hand.y-rig.torso.position.y)/Math.max(.01,rig.torso.scale.y))**2)),offset=usesSpoon?rig.base.spoonPos.clone():arm.palm.position.clone(),safeX=arm.side*Math.max(Math.abs(hand.x),sideExtent+(usesSpoon?.045:arm.palm.scale.x)+.025),handClearance=Math.max(.085*Math.max(arm.fore.scale.x,arm.fore.scale.z),arm.palm.scale.z)+.018;
    const shoulder=arm.sh.position.clone(),maxReach=arm.elbow.position.length()+offset.length()-.012;let target=gesture==='throat'?V(-.1,2.06,Math.max(frontAt(rig.torso,-.1,2.06),frontAt(rig.shirtFront,-.1,2.06))+handClearance):V(bellyGesture&&!usesSpoon?hand.x:safeX,hand.y,Math.max(hand.z,surface+(usesSpoon?.04:arm.palm.scale.z)+.05));
    if(arm.id!=='L'){
      const delta=target.clone().sub(shoulder);if(delta.length()>maxReach)target.copy(shoulder.addScaledVector(delta.normalize(),maxReach));solveArmToTarget(rig,arm,target,1,offset);return;
    }
    // Search a small set of reachable hand contacts along the actual side/front silhouette.
    // Keep z fixed while checking reach: radial clamping can pull a safe hand back through the torso.
    const sideRadiusAt=y=>rig.torso.scale.x*Math.sqrt(Math.max(0,1-((y-rig.torso.position.y)/Math.max(.01,rig.torso.scale.y))**2));
    const sideContact=(y,lateral,margin)=>{const sy=Math.max(.01,rig.torso.scale.y),yy=clamp(y,rig.torso.position.y-.78*sy,rig.torso.position.y+.78*sy),sideRadius=sideRadiusAt(yy),surfaceX=arm.side*sideRadius*.985,fronts=[frontSurface(rig.torso,surfaceX,yy),frontSurface(rig.shirtFront,surfaceX,yy)].filter(Number.isFinite),front=fronts.length?Math.max(...fronts):frontAt(rig.torso,surfaceX,yy);return V(arm.side*(sideRadius+lateral+.015),yy,front+handClearance+margin);};
    const solutionKey=bellyGesture?'belly':gesture||'side',sy=Math.max(.01,rig.torso.scale.y),centerY=rig.torso.position.y,palmRadius=Math.max(.065,arm.palm.scale.x);
    // Reuse the last local surface contact while it remains safe. This keeps the
    // articulated guard light enough for RAF and avoids endpoint chatter.
    const cached=arm.guardSolution;
    if(cached?.key===solutionKey){const cachedTarget=sideContact(centerY+cached.yRatio*sy,palmRadius*cached.lateralFactor,cached.margin),distance=cachedTarget.distanceTo(shoulder),minReach=Math.abs(arm.elbow.position.length()-offset.length())+.006;
      if(distance<=maxReach-.006&&distance>=minReach){const clearance=solveArmToTarget(rig,arm,cachedTarget,1,offset);if(clearance?.fore>=.025&&clearance.upper>=-.02){rig.armClearance[arm.id]=clearance;const debug={point:cachedTarget.toArray(),distance:Number(distance.toFixed(3)),maxReach:Number(maxReach.toFixed(3)),withinReach:true,contact:solutionKey,score:Number(Math.min(clearance.fore,clearance.upper+.02).toFixed(3)),fore:Number(clearance.fore.toFixed(3)),upper:Number(clearance.upper.toFixed(3)),cached:true};rig.bellyTargetDebug=bellyGesture?debug:null;rig.armGuardDebug=debug;return;}}
    }
    if(cached&&cached.key!==solutionKey)arm.guardSolution=null;
    const candidates=[{target:target.clone(),kind:gesture||'side'}];
    if(gesture==='throat')candidates.unshift({target:V(-.1,2.06,Math.max(frontAt(rig.torso,-.1,2.06),frontAt(rig.shirtFront,-.1,2.06))+handClearance),kind:'throat'});
    const yValues=[hand.y,...[-.3,-.05,0,.18,.35,.4,.5,.7].map(ratio=>centerY+ratio*sy)];
    const uniqueYs=[];for(const y of yValues){const yy=clamp(y,centerY-.78*sy,centerY+.78*sy);if(!uniqueYs.some(v=>Math.abs(v-yy)<.025))uniqueYs.push(yy);}
    for(const y of uniqueYs)for(const factor of [.7,1,1.3])candidates.push({target:sideContact(y,palmRadius*factor,.05),kind:bellyGesture?'belly-side':'side'});
    let bestSafe=null,bestAny=null;
    const minReach=Math.abs(arm.elbow.position.length()-offset.length())+.006;
    const reachable=candidates.map(item=>({...item,distance:item.target.distanceTo(shoulder),movement:item.target.distanceTo(hand)})).filter(item=>item.distance<=maxReach-.006&&item.distance>=minReach).sort((a,b)=>a.movement-b.movement);
    for(const item of reachable){const candidate=item.target,distance=item.distance,movement=item.movement;
      const clearance=solveArmToTarget(rig,arm,candidate,1,offset);if(!clearance)continue;const score=Math.min(clearance.fore,clearance.upper+.02),entry={target:candidate.clone(),kind:item.kind,clearance:{...clearance},score,movement,shoulderQ:arm.sh.quaternion.clone(),elbowQ:arm.elbow.quaternion.clone()};
      const distalScore=clearance.fore,betterDistal=!bestAny||distalScore>bestAny.clearance.fore+1e-5||(Math.abs(distalScore-bestAny.clearance.fore)<1e-5&&(clearance.upper>bestAny.clearance.upper+1e-5||(Math.abs(clearance.upper-bestAny.clearance.upper)<1e-5&&movement<bestAny.movement)));
      if(betterDistal)bestAny=entry;
      if(clearance.fore>=.025&&clearance.upper>=-.02){bestSafe=entry;break;}
    }
    const best=bestSafe||bestAny;if(best){arm.sh.quaternion.copy(best.shoulderQ);arm.elbow.quaternion.copy(best.elbowQ);rig.armClearance[arm.id]=best.clearance;const debug={point:best.target.toArray(),distance:Number(best.target.distanceTo(shoulder).toFixed(3)),maxReach:Number(maxReach.toFixed(3)),withinReach:true,contact:best.kind,score:Number(best.score.toFixed(3)),fore:Number(best.clearance.fore.toFixed(3)),upper:Number(best.clearance.upper.toFixed(3))};rig.bellyTargetDebug=bellyGesture?debug:null;rig.armGuardDebug=debug;
      const deltaY=best.target.y-centerY,sideRadius=sideRadiusAt(best.target.y),lateralFactor=clamp((Math.abs(best.target.x)-sideRadius-.015)/palmRadius,.4,1.8);arm.guardSolution={key:solutionKey,yRatio:deltaY/sy,lateralFactor,margin:.05};
    }else{rig.armGuardDebug={point:target.toArray(),distance:Number(target.distanceTo(shoulder).toFixed(3)),maxReach:Number(maxReach.toFixed(3)),withinReach:false,contact:gesture||'side',score:null};}
  }
  function changePhase(phase,caption){if(state.phase===phase)return;state.phase=phase;if(phase==='dead'&&state.fatal)state.dead=true;const deadEvent=phase==='dead'&&state.dead&&!state.deadEventSent;if(deadEvent)state.deadEventSent=true;events.push({type:deadEvent?'dead':'phase',phase,caption});}
  const captions={anticipation:'Todavía cabe una cucharadita.',reaction:{energy:'La siguiente cucharada la levanto mañana.',waterLow:'Puedo decir “croqueta”. Tragarla ya es otra cosa.',waterHigh:'Ya. No me cabe ni el hipo.',salt:'Me quedó un poco… ¿dónde está el agua?',gut:'No te agaches. Repito: no te agaches.',iron:'Las rodillas se sentaron antes que yo.',mixed:'Perfecto. Ahora todo me pasa a la vez.'},fall:'La cuchara arriba. La dignidad, abajo.',impact:'Todavía la tengo.',dead:'Morirse, sí. Soltar el postre, jamás.',ghost:'Eh. Esa cuchara venía conmigo.',retry:'Venga. Suelta…',resigned:'Vale. Nos turnamos.'};
  function resetTransient(){for(const p of sweat)p.visible=false;for(const p of stars)p.visible=false;ghost.visible=false;}
  function updateAnimation(dt){
    if(disposed)return;const t=clock/1000;const rig=active;rig.armClearance={};rig.bellyTargetDebug=null;const {stress,deficit,imbalance,cue,cues,effects,critical,dominantNutrient}=profileStress();let phaseTime=state.playing?Math.max(0,clock-state.started):0;
    if(!state.playing){rig.actor.position.copy(rig.base.actorPos);rig.body.position.copy(rig.base.bodyPos);rig.actor.rotation.set(0,0,0);rig.actor.scale.set(1,1,1);rig.shadow.visible=true;rig.shadow.material.opacity=.15+stress*.09;
      const morph=state.massKg<70?(state.massKg-70)/30:(state.massKg-70)/90;lastAppliedMorphMass=state.massKg;
      // Local shape changes keep the skeleton's reach intact: belly, hips, limbs and face morph together.
      rig.torso.scale.set(rig.base.torsoScale.x*(1+morph*(morph<0?.25:.5)),rig.base.torsoScale.y*(1+morph*.12),rig.base.torsoScale.z*(1+morph*(morph<0?.3:.75)));
      rig.shirtFront.scale.set(rig.base.shirtFrontScale.x*(1+morph*(morph<0?.25:.5)),rig.base.shirtFrontScale.y*(1+morph*.12),rig.base.shirtFrontScale.z*(1+morph*(morph<0?.3:.75)));
      rig.shirtFront.position.z=.285*(1+morph*(morph<0?.3:.75))-.02;
      rig.waist.scale.set(rig.base.waistScale.x*(1+morph*.48),rig.base.waistScale.y*(1+morph*.12),rig.base.waistScale.z*(1+morph*.46));
      rig.trousers.scale.set(rig.base.trousersScale.x*(1+morph*.40),rig.base.trousersScale.y*(1+morph*.08),rig.base.trousersScale.z*(1+morph*.42));
      rig.headShape.scale.set((rig.profile==='mujer'?.355:.39)*(1+morph*.09),rig.base.headShapeScale.y,rig.base.headShapeScale.z*(1+morph*.07));
      const shoulderSpread=Math.max((rig.profile==='mujer'?.39:.46)*(1+morph*.45),rig.torso.scale.x+.02),hipSpread=(rig.profile==='mujer'?.34:.39)*(1+morph*.3);
      rig.arms.forEach(a=>{a.sh.position.x=a.side*shoulderSpread;a.upper.scale.set(1+morph*.32,1,1+morph*.38);a.cuff.scale.set(.122*(1+morph*.3),.085,.125*(1+morph*.36));a.fore.scale.set(1+morph*.28,1,1+morph*.34);a.palm.scale.set(.115*(1+morph*.2),.12,.065*(1+morph*.23));});
      rig.legs.forEach(a=>{a.hip.position.x=a.side*hipSpread*.52;a.thigh.scale.set(1+morph*.35,1,1+morph*.42);a.shin.scale.set(1+morph*.23,1,1+morph*.3);});
      const c=cue;rig.torso.rotation.x=0;rig.headShape.scale.y=rig.base.headShapeScale.y;rig.tongue.scale.set(.045,.025,.018);rig.tongue.visible=false;rig.smile.rotation.z=0;expression(rig,stress,c,t);
      const breath=Math.sin(t*1.35)*.012;rig.body.position.y=-1.22+breath-stress*.12;rig.body.rotation.set(0,0,0);rig.head.rotation.y=Math.sin(t*.3)*.018;
      rig.arms.forEach(({side,sh,elbow,id})=>{sh.rotation.set(0,-.02,side*(.30+Math.sin(t*1.1+(id==='L'?0:Math.PI))*.018));elbow.rotation.set(0,0,side*(stress*.2));if(stress>.3){sh.rotation.z+=side*.12*stress;elbow.rotation.z-=side*.22*stress;}});
      rig.legs.forEach(({side,hip,knee,foot})=>{hip.rotation.set(0,0,side*(stress*.08));knee.rotation.set(stress*.18,0,0);foot.rotation.set(0,0,0);});
      // Each imbalance has a readable, immediate physical tell.
      const sway=stress*(c==='waterHigh'?.16:.045);
      rig.actor.rotation.z=Math.sin(t*2.2)*sway+(stress>.58?.025:0);
      if(stress>.15&&cues.includes('waterLow')){rig.head.rotation.x=Math.max(rig.head.rotation.x,.22+stress*.18);rig.head.rotation.y=Math.sin(t*3.2)*(.1+stress*.14);}
      if(stress>.15&&cues.includes('gut')){rig.body.rotation.x=.08+stress*.12;const hand=rig.arms[0];hand.sh.rotation.set(-(.24+stress*.15),0,.34+stress*.18);hand.elbow.rotation.set(0,0,.5+stress*.28);}
      if(stress>.15&&cues.includes('energy')){const sink=.025+stress*.045;rig.actor.position.y-=sink+Math.max(0,Math.sin(t*1.35))*.012*stress;rig.head.rotation.x=Math.max(rig.head.rotation.x,.18+stress*.18);rig.arms.forEach(a=>a.sh.rotation.x=Math.max(a.sh.rotation.x,.2+stress*.24));rig.legs.forEach(a=>{a.hip.rotation.z=a.side*(.08+stress*.17);a.knee.rotation.z=-a.side*(.14+stress*.3);a.knee.rotation.x=.12+stress*.12;});}
      if(stress>.15&&cues.includes('iron')){const step=Math.sin(t*4.5)*stress*.035;rig.actor.position.x+=step;rig.actor.rotation.z+=step*.8;const leg=rig.legs[1];leg.hip.rotation.z+=leg.side*(.08+stress*.12);leg.knee.rotation.x+=.24+stress*.2;}
      if(stress>.15&&cues.includes('waterHigh')){rig.actor.rotation.z+=Math.sin(t*5)*stress*.14;rig.arms.forEach((a,i)=>a.sh.rotation.z+=(i?1:-1)*(.32+stress*.25));rig.cheeks.forEach(c=>c.scale.multiplyScalar(1+stress*.16));rig.mouth.visible=true;rig.mouth.scale.set(.04,.022,.018);}
      if(stress>.15&&cues.includes('salt')){rig.head.rotation.x-=.1+stress*.08;rig.arms[0].sh.rotation.set(-.32,0,.24);rig.arms[0].elbow.rotation.z=.42;}
      if(stress>.15&&cues.includes('sodiumLow')){rig.arms.forEach((a,i)=>{a.sh.rotation.x+=Math.sin(t*18+i*Math.PI)*stress*.13;a.elbow.rotation.z+=Math.sin(t*22+i*Math.PI)*stress*.09;});rig.actor.rotation.z+=Math.sin(t*18)*stress*.018;}
      rig.spoon.rotation.z=stress>.3?-.22:0;
      rig.shadow.scale.copy(rig.base.shadowScale).multiplyScalar(1+stress*.12);
      if(!state.neutral&&state.activeNutrient&&state.levels[state.activeNutrient]!==undefined){const delta=state.levels[state.activeNutrient]-100;if(delta!==0){const sign=Math.sign(delta),signal=clamp(Math.abs(delta)/130);const side=(['energia','agua','hierro','calcio'].includes(state.activeNutrient)?-1:1);rig.actor.rotation.z+=sign*(.045+signal*.11);rig.body.rotation.z+=sign*(.035+signal*.08);rig.arms[side<0?0:1].sh.rotation.x+=sign*(.06+signal*.13);rig.head.rotation.z+=side*(.025+signal*.055);rig['brow'+(side<0?'L':'R')].rotation.z+=sign*.07;}}
      const fiberCue=effects.find(e=>e.nutrient==='fibra'&&e.strength>.12),bellyGesture=cues.includes('gut')||!!fiberCue;rig.arms.forEach(arm=>{if(arm.id==='L'&&bellyGesture)guardArmAgainstTorso(rig,arm,true,'belly');else if(arm.id==='L'&&cues.includes('salt'))guardArmAgainstTorso(rig,arm,false,'throat');else guardArmAgainstTorso(rig,arm,false);});
      sweat.forEach((p,i)=>{p.visible=stress>.3&&i<Math.ceil(stress*5);const q=(t*.65+i*.21)%1,f=.55+q*.4;p.position.set((i%2?1:-1)*(.3+q*.18),2.48-q*.52,.38);p.scale.set(.035*f,.06*f,.02*f);});
      return;
    }
    if(state.tasting){
      const tTaste=phaseTime,lift=smooth(120,1150,tTaste)*(1-smooth(2050,2900,tTaste));
      rig.actor.position.copy(rig.base.actorPos);rig.actor.rotation.set(0,0,0);rig.actor.scale.set(1,1,1);rig.body.position.set(0,-1.22+Math.sin(t*.9)*.012,0);rig.body.rotation.set(0,0,0);rig.shadow.visible=true;rig.shadow.material.opacity=.16;
      rig.arms.forEach(({side,sh,elbow})=>{sh.rotation.set(0,0,side*.30);elbow.rotation.set(0,0,0);});gripSpoonAtMouth(rig,lift);
      rig.legs.forEach(({hip,knee,foot})=>{hip.rotation.set(0,0,0);knee.rotation.set(0,0,0);foot.rotation.set(0,0,0);});
      rig.spoon.position.copy(rig.base.spoonPos);rig.head.rotation.set(.02*lift,0,-.04*lift);rig.headShape.scale.copy(rig.base.headShapeScale);rig.torso.rotation.set(0,0,0);rig.tongue.visible=false;rig.mouth.visible=false;rig.smile.visible=true;rig.smile.rotation.z=.08*lift;
      for(const id of ['L','R']){rig['lid'+id].scale.y=.018;rig['brow'+id].rotation.z=id==='R'?.11:-.04;rig['deadCross'+id].visible=false;}
      guardArmAgainstTorso(rig,rig.arms[0],false);
      if(tTaste<400)changePhase('tasting','Todavía cabe una cucharadita.');else if(tTaste<2450)changePhase('tasting','A ver… sí quedaba sitio.');else changePhase('tasting','He vuelto. ¿Queda postre?');
      state.progress=clamp(tTaste/3500);
      if(tTaste>=3500){state.playing=false;state.tasting=false;changePhase('idle','He vuelto. ¿Queda postre?');}
      return;
    }
    // Cinematic phases use elapsed real time. Each pose is recomputed from rig bases every frame.
    const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const anticipation=smooth(180,TIMELINE.anticipationEnd-250,phaseTime),react=smooth(TIMELINE.anticipationEnd,TIMELINE.reactionEnd,phaseTime),rawFall=reduced?Number(phaseTime>=TIMELINE.fallEnd):clamp((phaseTime-TIMELINE.fallStart)/(TIMELINE.fallEnd-TIMELINE.fallStart));
    const shapedFall=state.cause==='energy'?Math.pow(rawFall,2.15):state.cause==='waterLow'?Math.pow(rawFall,1.22):state.cause==='waterHigh'?smooth(.04,.88,rawFall):state.cause==='salt'?smooth(.16,1,rawFall):state.cause==='gut'?Math.pow(rawFall,1.18):state.cause==='iron'?Math.pow(rawFall,1.08):Math.pow(rawFall,1.35);
    const stumble=reduced?Number(phaseTime>=TIMELINE.fallEnd):shapedFall,impact=reduced?0:smooth(TIMELINE.fallStart+2400,TIMELINE.fallStart+3000,phaseTime),ghostOut=reduced?Number(phaseTime>=TIMELINE.deadEnd):smooth(TIMELINE.deadEnd,TIMELINE.ghostEnd,phaseTime);
    if(phaseTime<TIMELINE.anticipationEnd){changePhase('anticipation',captions.anticipation)}
    else if(phaseTime<TIMELINE.reactionEnd){changePhase('reaction',captions.reaction[state.cause]||captions.reaction.mixed)}
    else if(phaseTime<TIMELINE.fallEnd){changePhase('fall',captions.fall)}
    else if(!state.fatal&&phaseTime<TIMELINE.nonfatalFinish){changePhase('reviving','He vuelto. ¿Queda postre?')}
    else if(state.fatal&&phaseTime<TIMELINE.deadEnd){changePhase('dead',captions.dead)}
    else if(state.fatal&&phaseTime<TIMELINE.ghostEnd){changePhase('ghost',captions.ghost)}
    else if(state.fatal&&phaseTime<TIMELINE.retry1End){changePhase('retry1',captions.retry)}
    else if(state.fatal&&phaseTime<TIMELINE.retry2End){changePhase('retry2',captions.retry)}
    else if(state.fatal&&phaseTime<TIMELINE.finish){changePhase('resigned',captions.resigned)}
    else if(state.fatal){changePhase('dead',captions.resigned);}
    else {changePhase('idle','He vuelto. ¿Queda postre?');state.playing=false;}
    const rise=state.fatal?0:smooth(TIMELINE.fallEnd,TIMELINE.nonfatalFinish,phaseTime);const fall=stumble*(1-rise);const roll=mix(0,Math.PI/2,fall);const impactBounce=state.fatal&&phaseTime<TIMELINE.fallStart+3000?Math.sin(clamp((phaseTime-(TIMELINE.fallStart+2400))/600)*Math.PI)*.17:0;const massMorph=state.massKg<70?(state.massKg-70)/30:(state.massKg-70)/90;const floorHeight=state.massKg<49?Math.max(.36,.5+massMorph*.2):.5+massMorph*.2;
    const stagger=state.cause==='iron'&&!reduced?Math.sin(t*8)*.14*(1-fall):0,wobble=state.cause==='waterHigh'&&!reduced?Math.sin(t*7)*.18*(1-fall):0;
    rig.actor.position.set(stagger+wobble,mix(1.22,floorHeight,fall)+(reduced?0:impactBounce),0);rig.actor.rotation.set(state.cause==='waterLow'?.08*fall:state.cause==='waterHigh'&&!reduced?Math.sin(t*7)*.09*(1-fall):0,0,roll);rig.body.position.set(0,-1.22,0);rig.body.rotation.set(0,0,0);rig.actor.scale.set(1,1,1);rig.torso.rotation.set(0,0,0);
    rig.torso.rotation.z=state.cause==='gut'?.20*(1-fall)*react:0;rig.arms.forEach(({side,sh,elbow,id},i)=>{sh.rotation.set(0,0,0);elbow.rotation.set(0,0,0);const swing=smooth(TIMELINE.anticipationEnd,TIMELINE.reactionEnd,phaseTime);sh.rotation.z=side*.30+side*mix(.02,.65,swing);if(phaseTime<TIMELINE.anticipationEnd&&id!=='R')sh.rotation.z=side*(.30-.12*anticipation);if(phaseTime>=TIMELINE.fallStart)sh.rotation.z=side*(mix(.65,1.4,fall));elbow.rotation.z+=side*(mix(.1,.9,fall));});if(phaseTime<TIMELINE.anticipationEnd)gripSpoonAtMouth(rig,anticipation);
    if(phaseTime>=TIMELINE.fallStart){const left=rig.arms[0];left.sh.rotation.z=mix(left.sh.rotation.z,1.15,fall);left.elbow.rotation.z=mix(left.elbow.rotation.z,1.05,fall);}
    rig.legs.forEach(({side,hip,knee,foot,id},i)=>{hip.rotation.set(0,0,0);knee.rotation.set(0,0,0);foot.rotation.set(0,0,0);if(phaseTime>TIMELINE.reactionEnd-200){const step=phaseTime<TIMELINE.fallEnd?Math.sin(clamp((phaseTime-(TIMELINE.reactionEnd-200))/1800)*Math.PI):0;hip.rotation.z=side*(mix(0,.28,fall)+step*.24);knee.rotation.x=mix(0,.72,fall)+step*.48;if(state.cause==='iron'&&i===1)knee.rotation.x+=.35*(1-fall);}});
    rig.head.rotation.set(mix(.0,.18,react),0,mix(0,.08,fall));
    const preFall=(1-smooth(TIMELINE.fallStart,TIMELINE.fallStart+400,phaseTime))*smooth(TIMELINE.fallStart-450,TIMELINE.fallStart,phaseTime);rig.actor.rotation.z=roll+(phaseTime<TIMELINE.fallEnd?-.045*Math.sin(phaseTime/TIMELINE.fallEnd*Math.PI):0)-preFall*.17;
    // Establish facial and body baselines before cause and nutrient layers add their acting.
    expression(rig,stress,state.cause,t);
    const recovery=1-fall;
    if(state.cause==='energy'){rig.body.position.y=-1.22-.14*recovery;rig.head.rotation.x+=.16*recovery;rig.legs.forEach(l=>{l.knee.rotation.x+=.16*recovery;});}
    if(state.cause==='waterLow'){rig.actor.rotation.x=.16*fall;rig.head.rotation.x+=.22*recovery;rig.head.rotation.y+=reduced?0:Math.sin(t*2.6)*.1*recovery;}
    if(state.cause==='waterHigh'){rig.actor.rotation.x+=(reduced?0:Math.sin(t*7)*.12*recovery);rig.actor.position.x+=(reduced?0:Math.sin(t*7)*.08*recovery);rig.torso.rotation.z+=(reduced?0:Math.sin(t*5)*.09*recovery);}
    if(state.cause==='salt'){rig.actor.rotation.x-=.11*fall;rig.head.rotation.x-=.12*recovery;rig.arms.forEach(a=>{a.elbow.rotation.z*=.55;});}
    if(state.cause==='gut'){rig.torso.rotation.x=.12*recovery;rig.legs.forEach(l=>{l.knee.rotation.x+=.22*recovery;});}
    if(state.cause==='iron'){rig.actor.position.x+=stagger;rig.actor.rotation.x+=stagger*.7;}
    if(phaseTime>=TIMELINE.anticipationEnd&&phaseTime<TIMELINE.reactionEnd){
      if(state.cause==='waterLow'){rig.head.rotation.x=.28;rig.arms[0].sh.rotation.x=-.55;rig.arms[0].elbow.rotation.z=-.65;}
      if(state.cause==='gut'){rig.torso.rotation.x=.18;const hand=rig.arms[0];hand.sh.rotation.set(-.28,0,.46);hand.elbow.rotation.z=.62;}
      if(state.cause==='energy'){rig.head.rotation.x=.24;rig.arms.forEach(x=>x.sh.rotation.x=.34);rig.legs.forEach(x=>x.knee.rotation.x=.42);}
      if(state.cause==='iron'){rig.head.rotation.z+=.18;rig.arms[0].sh.rotation.x=.2;rig.legs[1].hip.rotation.z+=.22;rig.legs[1].knee.rotation.x=.7;rig.actor.position.x+=.04;}
      if(state.cause==='waterHigh'){rig.arms.forEach((x,i)=>{x.sh.rotation.z+=(i?1:-1)*.5;x.sh.rotation.x=.2;});rig.actor.rotation.z=Math.sin(t*9)*.12;rig.cheeks.forEach((cheek,i)=>cheek.scale.copy(rig.base.cheekScales[i]).multiplyScalar(1+stress*.26));}
      if(state.cause==='salt'){rig.head.rotation.x=-.24;rig.arms[0].sh.rotation.set(-.2,0,.18);rig.arms[0].elbow.rotation.z=.5;}
    }
    // Independent nutrient signals layer over the selected cause in reaction and fall.
    const layerWindow=clamp(smooth(TIMELINE.anticipationEnd-100,TIMELINE.anticipationEnd+300,phaseTime)*(1-smooth(TIMELINE.fallEnd-300,TIMELINE.fallEnd+200,phaseTime))*.85);
    for(const effect of effects){const q=effect.strength*layerWindow;if(q<.025)continue;const low=effect.direction==='low';
      if(effect.nutrient==='energia'){rig.body.position.y-=q*.11;rig.head.rotation.x+=q*.17;rig.legs.forEach(l=>{l.knee.rotation.x+=q*.22;l.hip.rotation.z+=l.side*q*.1;});}
      if(effect.nutrient==='proteina'){rig.arms.forEach(a=>{a.sh.rotation.x+=q*.2;a.elbow.rotation.z-=a.side*q*.15;});rig.body.rotation.z+=q*.04;}
      if(effect.nutrient==='agua'&&low){rig.head.rotation.x+=q*.15;rig.head.rotation.y+=(reduced?0:Math.sin(t*2.7))*q*.12;rig.tongue.visible=true;rig.mouth.visible=true;rig.mouth.scale.set(.06,.06,.02);}
      if(effect.nutrient==='agua'&&!low){const puff=1+q*.13;rig.torso.scale.z*=puff;rig.shirtFront.scale.z*=puff;rig.shirtFront.position.z=rig.torso.scale.z-.02;rig.cheeks.forEach(c=>c.scale.multiplyScalar(1+q*.08));rig.actor.rotation.z+=(reduced?0:Math.sin(t*7))*q*.12;}
      if(effect.nutrient==='fibra'){rig.body.rotation.z+=q*(low?.12:.1);rig.arms[0].sh.rotation.x-=q*.32;rig.arms[0].elbow.rotation.z+=q*.36;}
      if(effect.nutrient==='hierro'){rig.head.rotation.x+=q*.1;rig.legs.forEach((l,i)=>{l.knee.rotation.x+=q*(i===0?.42:.16);l.hip.rotation.z+=l.side*q*.12;});}
      if(effect.nutrient==='vitC'){rig.head.rotation.x+=q*.08;rig.mouth.visible=true;rig.mouth.scale.set(.04+q*.05,.025+q*.045,.018);rig.arms[0].sh.rotation.x-=q*.14;}
      if(effect.nutrient==='calcio'&&!reduced){rig.legs.forEach((l,i)=>{l.knee.rotation.z+=Math.sin(t*17+i*Math.PI)*q*.11;l.knee.rotation.x+=q*.08;});rig.arms.forEach((a,i)=>a.elbow.rotation.z+=Math.sin(t*19+i*Math.PI)*q*.08);}
      if(effect.nutrient==='calcio'&&reduced){rig.legs.forEach(l=>l.knee.rotation.x+=q*.08);}
      if(effect.nutrient==='sodio'&&low&&!reduced){rig.arms.forEach((a,i)=>{a.sh.rotation.x+=Math.sin(t*16+i*Math.PI)*q*.18;a.elbow.rotation.z+=Math.sin(t*21+i*Math.PI)*q*.12;});rig.actor.rotation.z+=Math.sin(t*16)*q*.035;}
      if(effect.nutrient==='sodio'&&low&&reduced){rig.arms.forEach(a=>a.sh.rotation.x+=q*.08);}
      if(effect.nutrient==='sodio'&&!low){rig.arms[0].sh.rotation.x-=q*.3;rig.arms[0].elbow.rotation.z-=q*.3;rig.head.rotation.x+=q*.12;}
    }
    rig.shadow.visible=true;rig.shadow.material.opacity=.18;rig.shadow.scale.set(.95+fall*.7,.37,1);
    // Spoon remains pinched in the right hand, angled upward for the absurd final beat.
    rig.spoon.position.copy(rig.base.spoonPos);if(phaseTime>=TIMELINE.anticipationEnd)rig.spoon.rotation.set(0,0,phaseTime>TIMELINE.fallStart+2500?-.42:mix(0,-.24,fall));
    rig.tongue.visible=state.cause==='waterLow'&&phaseTime>=TIMELINE.anticipationEnd&&phaseTime<TIMELINE.reactionEnd;rig.smile.visible=phaseTime<TIMELINE.anticipationEnd;rig.mouth.visible=phaseTime>=TIMELINE.anticipationEnd;rig.mouth.scale.set(phaseTime<TIMELINE.anticipationEnd?.025:.075,phaseTime<TIMELINE.anticipationEnd?.012:.085,.018);rig.smile.rotation.z=phaseTime<TIMELINE.anticipationEnd?.12:0;
    if(phaseTime<TIMELINE.anticipationEnd){rig.head.rotation.z=-.08*anticipation;rig['irisR'].position.y=.12+anticipation*.04;rig['irisR'].position.x=.13+anticipation*.025;rig['browR'].rotation.z=-.18*anticipation;}
    else if(phaseTime<TIMELINE.reactionEnd){for(const id of ['L','R']){rig['lid'+id].scale.y=.004;rig['brow'+id].rotation.z=id==='L'?.32:-.32;}rig.mouth.scale.set(.085,.08,.018);}
    else if(phaseTime<TIMELINE.fallEnd){for(const id of ['L','R']){rig['lid'+id].scale.y=.003;rig['brow'+id].rotation.z=id==='L'?.48:-.48;}rig.mouth.scale.set(.085,.095,.018);}
    else if(state.dead&&phaseTime>=TIMELINE.impactEnd){for(const id of ['L','R']){rig['deadCross'+id].visible=true;rig['iris'+id].visible=false;rig['brow'+id].rotation.z=id==='L'?-.4:.4;}rig.mouth.scale.set(.055,.07,.018);}
    else {const squash=impact*.18;rig.torso.scale.y*=1-squash;rig.headShape.scale.y=rig.base.headShapeScale.y*(1-squash*.24);}
    if(state.cause==='waterHigh'&&phaseTime>=TIMELINE.anticipationEnd&&phaseTime<TIMELINE.fallStart){rig.cheeks.forEach((cheek,i)=>cheek.scale.copy(rig.base.cheekScales[i]).multiplyScalar(1+stress*.26));rig.mouth.scale.set(.045,.025,.018);}
    if(state.cause==='salt'&&phaseTime>=TIMELINE.anticipationEnd&&phaseTime<TIMELINE.fallStart)rig.mouth.scale.set(.04,.025,.018);
    if(layerWindow>0){
      const waterLow=effects.find(e=>e.nutrient==='agua'&&e.direction==='low'),vitC=effects.find(e=>e.nutrient==='vitC'&&e.direction==='low');
      if(waterLow&&waterLow.strength*layerWindow>.12&&!state.dead){rig.tongue.visible=true;rig.mouth.visible=true;rig.mouth.scale.set(.06,.055,.02);}
      if(vitC&&vitC.strength*layerWindow>.12&&!state.dead){rig.mouth.visible=true;rig.mouth.scale.set(.04,.035,.018);rig['browL'].rotation.z-=.08;}
      const calcium=effects.find(e=>e.nutrient==='calcio'),protein=effects.find(e=>e.nutrient==='proteina');
      if(calcium&&calcium.strength*layerWindow>.12){rig['browL'].rotation.z+=Math.sin(t*18)*.04;rig['browR'].rotation.z-=Math.sin(t*18)*.04;}
      if(protein&&protein.direction==='low'&&protein.strength*layerWindow>.12){rig['browL'].rotation.z+=.1;rig['browR'].rotation.z-=.1;}
    }
    // Cause-specific terminal silhouettes remain legible after the common floor roll.
    // Blend only joint rotations in the last part of the fall; actor pivot, roll and floor stay fixed.
    const terminal=smooth(.58,.96,fall);
    if(terminal>0){
      const blendRotation=(object,axis,target)=>{object.rotation[axis]=mix(object.rotation[axis],target,terminal);};
      const leftArm=rig.arms[0];
      if(state.cause==='energy'){
        rig.torso.scale.y*=mix(1,.72,terminal);rig.shirtFront.scale.y*=mix(1,.72,terminal);
        rig.legs.forEach(l=>{blendRotation(l.hip,'z',l.side*.035);blendRotation(l.knee,'x',.12);blendRotation(l.knee,'z',-l.side*.035);});
        blendRotation(rig.head,'z',rig.head.rotation.z+.45);
      }else if(state.cause==='waterLow'){
        rig.torso.scale.x*=mix(1,.70,terminal);rig.torso.scale.z*=mix(1,.70,terminal);rig.shirtFront.scale.x*=mix(1,.70,terminal);rig.shirtFront.scale.z*=mix(1,.70,terminal);rig.cheeks.forEach(c=>c.scale.multiplyScalar(mix(1,.65,terminal)));
        rig.shirtFront.position.z=mix(rig.shirtFront.position.z,rig.torso.scale.z-.02,terminal);
        blendRotation(rig.head,'z',rig.head.rotation.z-.2);
        if(terminal>.15){rig.tongue.visible=true;rig.tongue.scale.set(.11,.055,.025);rig.mouth.visible=true;rig.mouth.scale.set(.06,.055,.02);}
      }else if(state.cause==='waterHigh'){
        rig.torso.scale.x*=mix(1,1.3,terminal);rig.torso.scale.z*=mix(1,1.45,terminal);rig.shirtFront.scale.x*=mix(1,1.3,terminal);rig.shirtFront.scale.z*=mix(1,1.45,terminal);rig.cheeks.forEach(c=>c.scale.multiplyScalar(mix(1,1.7,terminal)));
        rig.shirtFront.position.z=mix(rig.shirtFront.position.z,rig.torso.scale.z-.02,terminal);
        rig.legs.forEach(l=>{blendRotation(l.hip,'z',l.side*.3);blendRotation(l.knee,'z',l.side*-.18);blendRotation(l.knee,'x',.48);});
      }else if(state.cause==='salt'){
        blendRotation(rig.head,'z',0);rig.mouth.visible=true;rig.mouth.scale.set(.034,.016,.018);
        rig.legs.forEach(l=>{blendRotation(l.hip,'z',l.side*.025);blendRotation(l.knee,'x',.06);blendRotation(l.knee,'z',0);blendRotation(l.foot,'z',l.side*.04);});
      }else if(state.cause==='gut'){
        rig.legs.forEach(l=>{blendRotation(l.hip,'z',.72);blendRotation(l.knee,'z',.66);blendRotation(l.knee,'x',.2);});
        leftArm.sh.rotation.z=mix(leftArm.sh.rotation.z,1.15,terminal);leftArm.elbow.rotation.z=mix(leftArm.elbow.rotation.z,1.05,terminal);
      }else if(state.cause==='iron'){
        rig.legs.forEach((l,i)=>{blendRotation(l.hip,'z',i===1?.68:l.side*.025);blendRotation(l.knee,'z',i===1?.62:0);blendRotation(l.knee,'x',i===1?.42:.06);});
      }else if(state.cause==='mixed'){
        rig.legs.forEach(l=>{blendRotation(l.hip,'z',.72);blendRotation(l.knee,'z',.66);blendRotation(l.knee,'x',.2);});
        leftArm.sh.rotation.z=mix(leftArm.sh.rotation.z,1.15,terminal);leftArm.elbow.rotation.z=mix(leftArm.elbow.rotation.z,1.05,terminal);
        if(terminal>.15){rig.tongue.visible=true;rig.tongue.scale.set(.11,.055,.025);rig.mouth.visible=true;rig.mouth.scale.set(.06,.055,.02);}
      }
      const fiberEffect=effects.find(e=>e.nutrient==='fibra');
      if(fiberEffect){rig.legs.forEach(l=>{l.knee.rotation.z=clamp(l.knee.rotation.z+fiberEffect.strength*terminal*.22,-1.2,1.45);});}
      const lowWaterEffect=effects.find(e=>e.nutrient==='agua'&&e.direction==='low');
      if(lowWaterEffect&&terminal>.15){rig.tongue.visible=true;rig.tongue.scale.set(.11,.055,.025);rig.mouth.visible=true;rig.mouth.scale.set(.06,.055,.02);}
    }
    const bellyEffect=effects.find(e=>e.nutrient==='fibra'&&e.strength>.12),bellyGesture=state.cause==='gut'||!!bellyEffect,feedActive=phaseTime<TIMELINE.anticipationEnd;rig.arms.forEach(arm=>{if(feedActive&&arm.id==='R')return;if(arm.id==='L'&&bellyGesture)guardArmAgainstTorso(rig,arm,true,'belly');else if(arm.id==='L'&&state.cause==='salt'&&phaseTime<TIMELINE.fallStart)guardArmAgainstTorso(rig,arm,false,'throat');else guardArmAgainstTorso(rig,arm,false);});
    // Impact stars have a short orbit, while the ghost rises and makes two futile reaches.
    stars.forEach((s,i)=>{const starStart=TIMELINE.fallStart+2500,progress=clamp((phaseTime-starStart)/1000);s.visible=!reduced&&phaseTime>=starStart&&phaseTime<TIMELINE.fallEnd;s.position.set(Math.cos(i/7*Math.PI*2)*(0.45+progress*.65),.75+Math.sin(i/7*Math.PI*2)*(0.18+progress*.2),.45);s.rotation.z=t*1.5+i;s.scale.setScalar((1-progress)*(.8+(i%3)*.12));});
    ghost.visible=state.fatal&&phaseTime>TIMELINE.deadEnd&&phaseTime<TIMELINE.finish;
    const retry1=smooth(TIMELINE.ghostEnd,TIMELINE.ghostEnd+350,phaseTime)*(1-smooth(TIMELINE.retry1End-300,TIMELINE.retry1End,phaseTime));const retry2=smooth(TIMELINE.retry1End,TIMELINE.retry1End+350,phaseTime)*(1-smooth(TIMELINE.retry2End-300,TIMELINE.retry2End,phaseTime));const reach=retry1+retry2;
    if(reach>0){const tug=Math.sin(t*24)*reach;rig.arms[1].elbow.rotation.z+=tug*.08;rig.spoon.rotation.z+=tug*.15;}
    ghost.position.set(mix(.25,.5,ghostOut)+(reduced?0:Math.sin(t*2)*.035),mix(.8,1.55,ghostOut)+(reduced?0:Math.sin(t*2.3)*.045),.05);
    ghost.rotation.z=reduced?0:reach*-.25;ghostArm.quaternion.identity();ghostArm.scale.setScalar(1);ghost.scale.setScalar(1);
    if(reach>0){scene.updateMatrixWorld(true);const bowlTarget=rig.spoon.localToWorld(V(0,.28,.01));const ghostTarget=ghost.worldToLocal(bowlTarget.clone()).sub(ghostArm.position);const distance=ghostTarget.length();const restDirection=V(-.82,-.12,.04).normalize();const targetDirection=ghostTarget.normalize();const reachRotation=new THREE.Quaternion().setFromUnitVectors(restDirection,targetDirection);ghostArm.quaternion.slerp(reachRotation,reach);ghostArm.scale.setScalar(mix(1,clamp(distance/.83,.7,1.25),reach));}
    ghostEyes.forEach((eye,i)=>eye.position.set((i===0?-.105:.105)-reach*.025,.22-reach*.035,.22));
    ghost.traverse(part=>{if(part.material&&'opacity'in part.material)part.material.opacity=.74*(1-.15*smooth(TIMELINE.retry2End,TIMELINE.finish,phaseTime));});
    if(phaseTime>TIMELINE.finish){ghost.visible=false;}
    state.progress=clamp(phaseTime/(state.fatal?TIMELINE.finish:TIMELINE.nonfatalFinish));
  }
  function flushEvents(){while(events.length)onEvent(events.shift());}
  function syncFace(rig){for(const id of ['L','R']){const side=id==='L'?-1:1,iris=rig['iris'+id],pupil=rig['pupil'+id],glint=rig['glint'+id];pupil.position.set(iris.position.x,iris.position.y-.002,.336);glint.position.set(iris.position.x+side*.009,iris.position.y+.019,.345);pupil.visible=glint.visible=!state.dead;}}
  function animate(now=0){raf=requestAnimationFrame(animate);if(lastNow===null)lastNow=now;const dt=Math.max(0,now-lastNow);lastNow=now;if(!state.paused&&state.comparison!=='before')clock+=dt;updateAnimation(dt);if(state.comparison==='before'){ghost.visible=false;stars.forEach(s=>s.visible=false);sweat.forEach(p=>p.visible=false);}syncFace(active);active.arms.forEach(arm=>measureArmClearance(active,arm));flushEvents();if(renderer)renderer.render(scene,camera);}
  function setState(next={}){
    if(next.profile&&next.profile!==state.profile&&(next.profile==='hombre'||next.profile==='mujer')){active.actor.visible=false;state.profile=next.profile;active=rigs[state.profile];active.actor.visible=true;setGhostProfile(state.profile);}
    if(next.levels)state.levels={...state.levels,...next.levels};if(next.activeNutrient!==undefined)state.activeNutrient=Object.hasOwn(state.levels,next.activeNutrient)?next.activeNutrient:null;if(next.intensity!==undefined)state.intensity=clamp(Number(next.intensity)||0);if(next.paused!==undefined){state.paused=!!next.paused;lastNow=null;}if(next.neutral!==undefined){state.neutral=!!next.neutral;if(state.neutral&&(state.dead||state.playing)&&state.fatal)revive();}if(next.massKg!==undefined)state.massKg=clamp(Number(next.massKg)||70,40,160);return getState();
  }
  function play({fatal=true,cause='mixed'}={}){if(disposed)return;setComparison(null);state.dead=false;state.playing=false;state.phase='idle';resetTransient();updateAnimation(0);captureComparisonAvatar();setGhostProfile(state.profile);const profile=profileStress(),requested=!!fatal;state.fatal=requested&&profile.critical&&!state.neutral;state.tasting=!state.fatal&&(state.neutral||profile.stress<.16);state.critical=profile.critical;state.dominantNutrient=profile.dominantNutrient;state.effects=profile.effects;state.cause=['energy','waterLow','waterHigh','salt','gut','iron','mixed'].includes(cause)?cause:'mixed';state.dead=false;state.playing=true;state.deadEventSent=false;state.started=clock;state.progress=0;state.phase='idle';resetTransient();active.actor.visible=true;}
  function revive(){if(disposed)return;setComparison(null);state.dead=false;state.fatal=false;state.tasting=false;state.playing=false;state.deadEventSent=false;state.started=clock;state.progress=0;state.phase='revived';active.actor.position.copy(active.base.actorPos);active.actor.rotation.set(0,0,0);active.body.position.copy(active.base.bodyPos);resetTransient();events.push({type:'revived',phase:'idle',caption:'He vuelto. ¿Queda postre?'});}
  function setPaused(value){state.paused=!!value;lastNow=null;}
  function getState(){const p=profileStress();active.actor.updateMatrixWorld(true);const bowl=active.spoon?.getObjectByName('spoonBowl'),mouth=active.mouth,palm=active.arms.find(a=>a.id==='R')?.palm,bowlPosition=bowl?.getWorldPosition(V()),mouthPosition=mouth?.getWorldPosition(V()),gripPosition=active.spoon?.getWorldPosition(V()),palmPosition=palm?.getWorldPosition(V()),spoonMouthDistance=bowlPosition&&mouthPosition?Number(bowlPosition.distanceTo(mouthPosition).toFixed(3)):null,spoonGripDistance=gripPosition&&palmPosition?Number(gripPosition.distanceTo(palmPosition).toFixed(3)):null;return{profile:state.profile,phase:state.phase,dead:state.dead,progress:state.progress,pose:state.dead?'falling':state.playing?(state.tasting?'tasting':'acting'):'standing',fatal:state.fatal,tasting:state.tasting,critical:p.critical,cause:state.cause,currentCue:state.playing&&!state.tasting?state.cause:p.cue,dominantNutrient:p.dominantNutrient,effects:p.effects,comparison:state.comparison,trajectory:{...TIMELINE,duration:state.tasting?3500:state.fatal?TIMELINE.finish:TIMELINE.nonfatalFinish},timing:{elapsed:state.playing?Math.max(0,clock-state.started):0,duration:state.tasting?3500:state.fatal?TIMELINE.finish:TIMELINE.nonfatalFinish,clock},poseDebug:{actorPosition:active.actor.position.toArray(),bodyRotation:active.body.rotation.toArray(),torsoScale:active.torso.scale.toArray(),requestedMassKg:state.massKg,lastAppliedMorphMass,shoulderAnchors:Object.fromEntries(active.arms.map(a=>[a.id,a.sh.position.toArray()])),spoonMouthDistance,spoonGripDistance,armClearance:active.armClearance||{},bellyTarget:active.bellyTargetDebug||null,comparisonAvatarVisible:!!state.comparisonAvatar?.visible},paused:state.paused,stress:p.stress,massKg:state.massKg};}
  function getArmGeometrySnapshot(){
    active.actor.updateMatrixWorld(true);scene.updateMatrixWorld(true);
    const body=active.body,bodyInverse=body.matrixWorld.clone().invert(),localTransform=object=>{const matrix=bodyInverse.clone().multiply(object.matrixWorld),position=V(),quaternion=new THREE.Quaternion(),scale=V();matrix.decompose(position,quaternion,scale);return{matrix:matrix.toArray(),position:position.toArray(),quaternion:quaternion.toArray(),scale:scale.toArray()};},localPoint=(object,point=V())=>body.worldToLocal(object.localToWorld(point.clone())).toArray();
    const capsuleInfo=mesh=>{const params=mesh.geometry.parameters||{},length=Number(params.length)||0,radius=Number(params.radius)||0,transform=localTransform(mesh),start=localPoint(mesh,V(0,-length*.5,0)),end=localPoint(mesh,V(0,length*.5,0)),direction=V(...end).sub(V(...start)).normalize();return{center:transform.position,quaternion:transform.quaternion,scale:transform.scale,matrix:transform.matrix,centerline:{start,end,direction:direction.toArray()},geometryRadius:radius,cylinderLength:length,radiusX:radius*transform.scale[0],radiusZ:radius*transform.scale[2],radialAxes:'mesh-local X and Z'};};
    const ellipsoidInfo=mesh=>({unitSphere:true,...localTransform(mesh)}),arms=Object.fromEntries(active.arms.map(arm=>[arm.id,{shoulder:localPoint(arm.sh),elbow:localPoint(arm.elbow),palm:localPoint(arm.palm),palmTransform:localTransform(arm.palm),upper:capsuleInfo(arm.upper),fore:capsuleInfo(arm.fore)}]));
    return{coordinateFrame:'body-local',units:'scene units',matrixLayout:'Three.js Matrix4.toArray column-major',bodyWorldTransform:{position:body.getWorldPosition(V()).toArray(),quaternion:body.getWorldQuaternion(new THREE.Quaternion()).toArray(),scale:body.getWorldScale(V()).toArray()},arms,obstacles:{torso:ellipsoidInfo(active.torso),shirtFront:ellipsoidInfo(active.shirtFront)},existingClearance:active.armClearance||{}};
  }
  function onVisibility(){lastNow=null;}
  function destroy(){if(disposed)return;disposed=true;cancelAnimationFrame(raf);resizeObs?.disconnect();document.removeEventListener('visibilitychange',onVisibility);materials.forEach(m=>m.dispose());scene?.traverse(o=>{if(o.geometry)o.geometry.dispose();});renderer?.dispose();renderer?.domElement.remove();}
  try{setupScene();document.addEventListener('visibilitychange',onVisibility);raf=requestAnimationFrame(animate);onReady();}catch(error){onError(error);}
  return{setState,play,revive,setPaused,setComparison,getState,getArmGeometrySnapshot,destroy};
}
