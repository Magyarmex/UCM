
window.addEventListener('error',e=>{window.__bootError=e.error?.stack||e.message||String(e.error);console.error('Tajín boot error',window.__bootError)});
window.addEventListener('unhandledrejection',e=>{window.__bootError=e.reason?.stack||String(e.reason);console.error('Tajín boot rejection',window.__bootError)});
import { createCharacterStage } from './character.js?v=11';
import { createAudioController } from './audio.js?v=2';

const NUTRIENTS=[
 {id:'energia',name:'Energía',unit:'kcal',target:2570,targetMujer:2010,targetHombre:2570,max:3800,color:'#e46e56',importance:'La energía sostiene las funciones y la actividad cotidianas. Esta cifra solo ejemplifica a una persona adulta sedentaria; la necesidad real varía.',short:'energía'},
 {id:'proteina',name:'Proteína',unit:'g',target:56,targetMujer:48,targetHombre:56,max:112,color:'#547f91',importance:'La referencia depende del peso: 0.8 g/kg/día; aquí se usan ejemplos de 70 kg y 60 kg.',short:'proteína'},
 {id:'agua',name:'Agua total',unit:'L',target:3.7,targetMujer:2.7,targetHombre:3.7,max:5,color:'#5d9ca7',importance:'El agua total incluye agua simple, otras bebidas y agua de alimentos; no es una cuota de agua simple.',short:'agua'},
 {id:'fibra',name:'Fibra',unit:'g',target:38,targetMujer:25,targetHombre:38,max:76,color:'#91aa77',importance:'La fibra ayuda al tránsito intestinal; aumentarla gradualmente y acompañarla con líquidos puede ayudar a prevenir o aliviar estreñimiento.',short:'fibra'},
 {id:'hierro',name:'Hierro',unit:'mg',target:8,targetMujer:18,targetHombre:8,max:60,ul:45,color:'#bd7653',importance:'El hierro ayuda a transportar oxígeno; la referencia para adultos cambia según edad y sexo. El UL de 45 mg aplica a adultos y no es una recomendación de ingesta.',short:'hierro'},
 {id:'vitC',name:'Vitamina C',unit:'mg',target:90,targetMujer:75,targetHombre:90,max:2500,ul:2000,color:'#d59a45',importance:'La vitamina C participa en la formación de colágeno y ayuda a absorber hierro de origen vegetal. El UL de 2,000 mg aplica a adultos.',short:'vitamina C'},
 {id:'calcio',name:'Calcio',unit:'mg',target:1000,max:3000,ul:2500,color:'#8286a4',importance:'El calcio es necesario para huesos y otras funciones. No hay un cambio visible del hueso tras una comida; importa el patrón y otros factores. El UL de 2,500 mg aplica a adultos hasta 50 años.',short:'calcio'},
 {id:'sodio',name:'Sodio',unit:'mg',target:2300,max:4600,color:'#b27486',importance:'2,300 mg es el nivel CDRR: si la ingesta habitual lo supera, reducirla se espera que baje el riesgo crónico. No es un límite de intoxicación ni un UL.',short:'sodio',inverse:true}
];
const FOOD=[
 {id:'avena',name:'Avena seca',portion:'½ taza · 40 g',icon:'🥣',v:{energia:150,proteina:5,agua:.003,fibra:4,hierro:1.7,vitC:0,calcio:22,sodio:2}},
 {id:'frijoles',name:'Frijoles cocidos',portion:'½ taza · 86 g',icon:'🫘',v:{energia:110,proteina:7.6,agua:.058,fibra:6.1,hierro:1.3,vitC:0,calcio:25,sodio:2}},
 {id:'tortilla',name:'Tortilla de maíz',portion:'1 pieza · 25 g',icon:'🫓',v:{energia:52,proteina:1.4,agua:.01,fibra:1.3,hierro:.4,vitC:0,calcio:20,sodio:10}},
 {id:'huevo',name:'Huevo grande',portion:'1 pieza · 50 g',icon:'🥚',v:{energia:72,proteina:6.3,agua:.038,fibra:0,hierro:.9,vitC:0,calcio:28,sodio:71}},
 {id:'pollo',name:'Pollo cocido',portion:'3 oz · 85 g',icon:'🍗',v:{energia:140,proteina:26,agua:.055,fibra:0,hierro:.8,vitC:0,calcio:12,sodio:65}},
 {id:'leche',name:'Leche 2%',portion:'1 taza · 244 g',icon:'🥛',v:{energia:122,proteina:8,agua:.21,fibra:0,hierro:0,vitC:0,calcio:293,sodio:115}},
 {id:'naranja',name:'Naranja mediana',portion:'1 pieza · 131 g',icon:'🍊',v:{energia:62,proteina:1.2,agua:.112,fibra:3.1,hierro:.1,vitC:70,calcio:52,sodio:0}},
 {id:'brocoli',name:'Brócoli cocido',portion:'½ taza · 78 g',icon:'🥦',v:{energia:27,proteina:1.9,agua:.06,fibra:2.6,hierro:.5,vitC:50,calcio:31,sodio:25}},
 {id:'arroz',name:'Arroz cocido',portion:'½ taza · 79 g',icon:'🍚',v:{energia:103,proteina:2.1,agua:.056,fibra:.3,hierro:.2,vitC:0,calcio:8,sodio:1}},
 {id:'cacahuates',name:'Cacahuates sin sal',portion:'1 oz · 28 g',icon:'🥜',v:{energia:165,proteina:7,agua:.002,fibra:2.4,hierro:1.3,vitC:0,calcio:27,sodio:6}},
 {id:'sopa',name:'Sopa instantánea',portion:'1 paquete preparado',icon:'🍜',v:{energia:380,proteina:8,agua:.3,fibra:2,hierro:3,vitC:0,calcio:30,sodio:1750}},
 {id:'agua',name:'Agua simple',portion:'1 taza · 237 ml',icon:'💧',max:16,v:{energia:0,proteina:0,agua:.237,fibra:0,hierro:0,vitC:0,calcio:0,sodio:0}}
];
const PRESETS=[
 {id:'balanceado',label:'Variado',items:['avena','avena','frijoles','frijoles','tortilla','tortilla','tortilla','tortilla','huevo','huevo','pollo','leche','leche','naranja','naranja','brocoli','brocoli','arroz','arroz','cacahuates','agua','agua','agua','agua','agua','agua']},
 {id:'pocavariedad',label:'Poca variedad',items:['tortilla','tortilla','tortilla','tortilla','arroz','arroz','arroz','arroz','agua','agua']},
 {id:'salado',label:'Sodio alto',items:['sopa','sopa','agua','agua','agua','agua']},
 {id:'pocaenergia',label:'Poca energía',items:['naranja','brocoli','agua','agua','agua','agua']}
];
const compactSceneMedia=matchMedia('(max-width:700px) and (max-height:700px), (orientation:landscape) and (max-width:900px) and (max-height:600px)');
const state={selected:PRESETS[0].items.slice(),manual:false,manualValues:null,profile:'hombre',horizon:'patron',patternDays:30,projectedMassKg:70,comparison:null,captionTrail:[],ignoreRevivedPresentation:false,routine:false,focusedNutrient:null,activeNutrient:null,sceneCauseCue:null,absurd:false,levels:{},cause:null,dead:false,playing:false,neutral:false,caption:'Leo espera turno con una cuchara.',massKg:70,massEdited:false,paused:matchMedia('(prefers-reduced-motion: reduce)').matches,ready:false};
const $=s=>document.querySelector(s);const $$=s=>[...document.querySelectorAll(s)];let stage;
let audio;
function syncAudioControls(){if(!audio)return;const current=audio.getState(),button=$('#soundToggle'),volumeControl=$('#soundVolume'),status=$('#soundStatus');if(button){const active=current.armed&&!current.muted;button.disabled=!current.available;button.textContent=!current.available?'Sonido no disponible':active?'Silenciar':'Activar sonido';button.setAttribute('aria-label',!current.available?'Sonido no disponible':active?'Silenciar sonido':'Activar sonido');button.setAttribute('aria-pressed',String(active));button.title=current.lastError||(!current.armed?'El sonido comienza solo al activar este botón.':'')}if(volumeControl){volumeControl.value=String(Math.round(current.volume*100));volumeControl.disabled=!current.available}if(status)status.textContent=current.lastError||(!current.available?'El simulador funciona sin audio en este navegador.':'')}
audio=createAudioController({getStageState:()=>stage?.getState?.()||null,onChange:syncAudioControls});
function setAudioComparison(){audio.setComparisonBefore(!!(state.dead&&state.comparison==='before'))}
syncAudioControls();
function targetOf(n){return state.profile==='mujer'&&n.targetMujer?n.targetMujer:state.profile==='hombre'&&n.targetHombre?n.targetHombre:n.target}
function stepOf(n){return n.id==='energia'?10:n.id==='agua' ? .001:n.id==='hierro'||n.id==='calcio'||n.unit==='g' ? .1:1}
function cleanValue(n,value){return Number(Number(value).toFixed(3))}
function totals(){if(state.manual&&state.manualValues)return{...state.manualValues};const sum=Object.fromEntries(NUTRIENTS.map(n=>[n.id,0]));for(const id of state.selected){const f=FOOD.find(x=>x.id===id);if(f)for(const n of NUTRIENTS)sum[n.id]+=f.v[n.id]||0}return sum}
function projectedMass(){if(state.horizon!=='patron')return state.massKg;const intake=totals().energia||0,reference=targetOf(NUTRIENTS.find(n=>n.id==='energia'));let kg=state.massKg;for(let day=0;day<state.patternDays;day++){const delta=kg-state.massKg;const estimatedMaintenance=reference+delta*18;kg=Math.max(40,Math.min(160,kg+(intake-estimatedMaintenance)/7700))}return Math.round(kg*10)/10}
function enterManual(){if(!state.manualValues)state.manualValues=totals();state.manual=true;$('#app').classList.add('manual');$('#foodsMode').setAttribute('aria-pressed','false');$('#manualMode').setAttribute('aria-pressed','true')}
function pct(n,vals=totals()){return vals[n.id]/targetOf(n)*100}
function fmt(n,x){const digits=n.unit==='mg'?0:n.unit==='g'?1:n.unit==='L'?2:0;return `${Number(x).toFixed(digits).replace(/\.0$/,'')} ${n.unit}`}
function renderFoods(){const root=$('#foodList');root.innerHTML='';for(const food of FOOD){const count=state.selected.filter(id=>id===food.id).length,limit=food.max||4;const card=document.createElement('div');card.className='food-card';card.dataset.count=count;card.setAttribute('role','group');card.setAttribute('aria-label',`${food.name}, ${food.portion}, ${count} porciones`);card.innerHTML=`<span class="food-icon" aria-hidden="true">${food.icon}</span><span class="food-title">${food.name}</span><span class="food-portion">${food.portion}</span><div class="food-controls"><button type="button" class="qty-btn" data-food="${food.id}" data-step="-1" aria-label="Quitar una porción de ${food.name}" ${count===0?'disabled':''}>−</button><span class="qty-count ${count?'active':''}" aria-live="polite">×${count}</span><button type="button" class="qty-btn" data-food="${food.id}" data-step="1" aria-label="Añadir una porción de ${food.name}" ${count===limit?'disabled':''}>+</button></div>`;card.querySelectorAll('.qty-btn').forEach(btn=>btn.addEventListener('click',()=>{const step=Number(btn.dataset.step);if(step>0&&count<limit)state.selected.push(food.id);else if(count>0){const i=state.selected.lastIndexOf(food.id);if(i>=0)state.selected.splice(i,1)}render();document.querySelector(`[data-food="${food.id}"][data-step="${step}"]`)?.focus()}));root.appendChild(card)}$('#menuCount').textContent=`${state.selected.length} porci${state.selected.length===1?'ón':'ones'}`;}
function buildNutrients(){
 const root=$('#nutrientList');root.innerHTML='';
 for(const n of NUTRIENTS){
  const step=stepOf(n),row=document.createElement('div');row.className='nutrient-row';
  row.innerHTML=`<div class="nutrient-top"><label class="nutrient-label" for="input-${n.id}">${n.name}</label><span class="nutrient-amount"><span class="record-label">Registro</span><input class="amount-input" id="number-${n.id}" type="number" min="0" max="${n.max*2}" step="${step}" value="0" aria-label="Aporte real registrado de ${n.name} en ${n.unit}"><span>${n.unit}</span><span id="amount-${n.id}"></span></span></div><div class="nutrient-sub"><input id="input-${n.id}" type="range" min="0" max="${n.max*2}" step="${step}" value="0" style="--tone:${n.color}" aria-label="${n.name}: aporte registrado en ${n.unit}; el porcentaje compara con la referencia"><span class="nutrient-pct" id="pct-${n.id}"></span></div><div class="fiction-level" id="scene-level-${n.id}" hidden></div><div class="flag" id="flag-${n.id}" aria-live="polite"></div>`;
  root.appendChild(row);const slider=$('#input-'+n.id),number=$('#number-'+n.id);
  for(const control of [slider,number])control.addEventListener('focus',()=>{state.focusedNutrient=n.id;render(false)});
  slider.addEventListener('input',()=>{$('#labNotice').hidden=false;enterManual();state.manualValues[n.id]=Number(slider.value);number.value=cleanValue(n,slider.value);state.focusedNutrient=n.id;state.activeNutrient=n.id;if(!state.absurd)state.levels=Object.fromEntries(NUTRIENTS.map(item=>[item.id,100]));state.absurd=true;state.levels[n.id]=Math.round(Number(slider.value)/targetOf(n)*100);state.cause=inferCause();resumeHealthyPoseIfBalanced();render(false)});
  slider.addEventListener('change',()=>{clearTimeout(window.__tajinExtremeTimer);if(isCriticalScene())window.__tajinExtremeTimer=setTimeout(()=>playEnding(),700)});
  number.addEventListener('change',()=>{$('#labNotice').hidden=false;number.value=Math.max(0,Math.min(n.max*2,Number(number.value)||0));enterManual();state.manualValues[n.id]=Number(number.value);slider.value=number.value;state.focusedNutrient=n.id;state.activeNutrient=n.id;if(!state.absurd)state.levels=Object.fromEntries(NUTRIENTS.map(item=>[item.id,100]));state.absurd=true;state.levels[n.id]=Math.round(Number(number.value)/targetOf(n)*100);state.cause=inferCause();resumeHealthyPoseIfBalanced();render(false)});
 }
}
function renderPresets(){const root=$('#absurdPresets');root.innerHTML='';for(const [id,label] of [['energy','Sin comer'],['salt','Demasiada sal'],['water','Agua a lo bestia'],['chaos','Cóctel del caos']]){const b=document.createElement('button');b.className='preset absurd-preset';b.type='button';b.dataset.absurd=id;b.textContent=label;b.addEventListener('click',()=>chooseAbsurd(id));root.appendChild(b)}}
function insights(vals){
 const pctMap=Object.fromEntries(NUTRIENTS.map(n=>[n.id,pct(n,vals)]));
 const limited=NUTRIENTS.filter(n=>n.id!=='sodio'&&pctMap[n.id]<65).sort((a,b)=>pctMap[a.id]-pctMap[b.id]);
 const low=limited[0],high=pctMap.sodio>100,today=state.horizon==='hoy',strong=NUTRIENTS.filter(n=>n.id!=='sodio'&&pctMap[n.id]>125);
 const pattern=!today,ironScene=pattern&&pctMap.hierro<35,vitCScene=pattern&&vals.vitC<10,vitCHigh=pattern&&vals.vitC>2000,fiberScene=pattern&&pctMap.fibra<45&&pctMap.agua<45,energyPause=pctMap.energia<45;
 let label='UNA RUTINA, MUCHAS VARIABLES',text='Selecciona una variable para leer qué representa. El personaje actúa solo en algunos patrones marcados; las barras nunca diagnostican.';
 if(today){if(high){label='SODIO SOBRE EL CDRR EN ESTE REGISTRO';text='La suma de hoy supera 2,300 mg. El CDRR orienta a reducir una ingesta habitual por encima de ese nivel para bajar riesgo crónico a nivel poblacional; un día no predice presión arterial.'}else if(low){label=`APORTE BAJO DE ${low.name.toUpperCase()}`;text=`${low.importance} Hoy queda bajo en este registro. Un solo día debajo de una RDA o AI no significa deficiencia, y la escena no reacciona a ese dato.`}else if(strong.length){label='REGISTRO CON VARIOS APORTES';text=`${strong[0].importance} El porcentaje compara con una referencia poblacional, no mide si la alimentación es “buena” ni personalizada.`}else{label='REGISTRO DE UNA JORNADA';text='Las cifras son una suma aproximada de las porciones seleccionadas. El día puede variar y no determina una deficiencia.'}}
 else if(vitCScene||fiberScene||ironScene){const associations=[];if(vitCScene)associations.push('Vitamina C casi ausente durante muchas semanas puede causar escorbuto, con signos como encías inflamadas.');if(fiberScene)associations.push('Fibra y líquidos muy bajos pueden contribuir al estreñimiento; aumentar fibra gradualmente puede ayudar.');if(ironScene)associations.push('Hierro muy bajo sostenido puede agotar reservas y, si progresa a anemia, asociarse con cansancio o debilidad.');if(vitCHigh)associations.push('Una dosis alta de vitamina C puede causar malestar digestivo; superar 2,000 mg/día eleva el riesgo, pero no confirma síntomas.');label=[ironScene?'HIERRO':null,fiberScene?'FIBRA + LÍQUIDOS':null,vitCScene?'VITAMINA C BAJA':null,vitCHigh?'VITAMINA C ALTA':null].filter(Boolean).join(' · ')+' · ESCENA ILUSTRATIVA';text=associations.join(' ')+' La fatiga tiene muchas causas; la ingesta del ejemplo no predice síntomas ni diagnostica.'}
 else if(vitCHigh){label='VITAMINA C SOBRE EL UL · ESCENA POSIBLE';text='Una ingesta alta de vitamina C puede causar diarrea, náuseas o cólicos; superar el UL adulto de 2,000 mg eleva ese riesgo, pero no confirma un síntoma. La mueca solo ilustra esa posibilidad.'}
 else if(high){label='SODIO SOBRE EL CDRR · TENDENCIA';text='Este patrón supera 2,300 mg. Reducir una ingesta habitual por encima del CDRR se espera que baje el riesgo crónico a nivel poblacional; no representa hipertensión en este personaje.'}
 else if(energyPause){label='ENERGÍA BAJA EN EL EJEMPLO · PAUSA';text='Este aporte queda muy por debajo del ejemplo de referencia, así que la rutina incluye una pausa visible. La cifra no calcula tu necesidad ni predice cansancio.'}
 else if(low?.id==='calcio'){label='CALCIO · EFECTO NO VISIBLE';text='El calcio participa en la salud ósea, pero un hueso no cambia de forma visible después de una comida. La barra es una comparación de ingesta, no un diagnóstico.'}
 else if(low){label=`APORTE BAJO DE ${low.name.toUpperCase()} EN EL PATRÓN`;text=`${low.importance} La comparación ilustra un patrón, no confirma una deficiencia ni cuándo aparecería un efecto.`}
 else{label='PATRÓN DE EJEMPLO';text='La escena combina los datos elegidos. Las referencias ayudan a explorar porciones; no juzgan a la persona ni definen una dieta ideal.'}
 return{label,text,pctMap,low,high,strong,ironScene,vitCScene,vitCHigh,fiberScene,energyPause,pattern};
}
const nutrientContext={
 energia:'La referencia energética es un ejemplo sedentario, no una meta personal.',
 proteina:'La referencia usa el ejemplo del perfil; la masa visual no la recalcula.',
 agua:'Agua total incluye bebidas y humedad de alimentos.',
 fibra:'Un registro de un día no diagnostica una deficiencia.',
 hierro:'Un día bajo no significa deficiencia de hierro.',
 vitC:'La referencia y el UL no predicen síntomas de una persona.',
 calcio:'El hueso no cambia visiblemente después de una comida.',
 sodio:'El CDRR describe ingesta habitual; no es un límite de intoxicación.'
};
function nutrientDetail(id,vals,ins){
 const n=NUTRIENTS.find(item=>item.id===id);if(!n)return ins;
 const amount=fmt(n,vals[n.id]),reference=fmt(n,targetOf(n)),percent=Math.round(ins.pctMap[n.id]);
 const timeNote=state.horizon==='hoy'?' Un día es solo un registro.':state.horizon==='patron'?' El patrón es ilustrativo; no diagnostica.':'';
 const stageNote=state.absurd?' El gesto es ficción y va separado de esta cantidad.':'';
 return{label:`APORTE · ${n.name.toUpperCase()}`,text:`${amount} frente a ${reference} (${percent}% de referencia). ${nutrientContext[id]}${timeNote}${stageNote}`};
}
const gestureByCue={
 waterLow:{region:'boca',gesture:'lengua fuera; cabeza inclinada'},
 waterHigh:{region:'cara y cuerpo',gesture:'mejillas infladas; labios fruncidos y balanceo'},
 energy:{region:'postura',gesture:'hombros y rodillas flexionados'},
 gut:{region:'vientre',gesture:'se encorva y lleva la mano al abdomen'},
 salt:{region:'cabeza',gesture:'se inclina para tragar'},
 sodiumLow:{region:'brazos',gesture:'tiemblan'},
 iron:{region:'piernas',gesture:'rodilla asimétrica; tambaleo'}
};
function cueForNutrient(id,levels){
 const l=levels||{};
 if(id==='agua'&&l.agua<60)return'waterLow';
 if(id==='agua'&&l.agua>160)return'waterHigh';
 if((id==='energia'&&l.energia<65)||(id==='proteina'&&l.proteina<65)||(id==='hierro'&&l.hierro>160))return'energy';
 if((id==='fibra'&&(l.fibra<65||l.fibra>170))||(id==='vitC'&&(l.vitC<65||l.vitC>180))||(['energia','proteina'].includes(id)&&l[id]>160))return'gut';
 if((id==='hierro'&&l.hierro<60)||(id==='calcio'&&(l.calcio<65||l.calcio>160)))return'iron';
 if(id==='sodio'&&l.sodio>140)return'salt';
 if(id==='sodio'&&l.sodio<65)return'sodiumLow';
 return null;
}
function effectName(effect,fictional){
 const n=NUTRIENTS.find(item=>item.id===effect.nutrient);if(!n)return'';
 const feminine=['energia','proteina','agua','fibra','vitC'].includes(effect.nutrient),direction=effect.direction==='low'?(feminine?'baja':'bajo'):(feminine?'alta':'alto');
 return `${n.name} ${direction}${fictional?' · ficción':' en el patrón'}`;
}
function sceneMoment(engineState){
 if((state.dead&&state.comparison==='before')||engineState?.comparison==='before')return{kind:'still',text:'Antes · personaje vivo; la comparación pausa el desenlace.'};
 if(engineState?.tasting||engineState?.phase==='tasting')return{kind:'still',text:'Prueba tranquila · el personaje sigue estable.'};
 if(engineState?.phase==='reviving')return{kind:'still',text:'Recuperación · vuelve a incorporarse.'};
 if(state.neutral)return{kind:'still',text:'Pose neutral · sin gesto corporal.'};
 if(state.playing&&engineState?.phase==='anticipation')return{kind:'still',text:'Está por probar la cucharada; el gesto aún no aparece.'};
 if(state.playing&&engineState?.phase==='fall')return{kind:'fall',text:'Desenlace en curso · cae hacia la cuchara.'};
 if(state.dead&&engineState?.phase==='resigned')return{kind:'ghost',text:'Fantasma · acepta turnarse; deja de alcanzar la cuchara.'};
 if(state.dead&&['ghost','retry1','retry2'].includes(engineState?.phase))return{kind:'ghost',text:'Fantasma · vuelve a intentar alcanzar la cuchara.'};
 if(state.dead){
   const terminal={energy:'Remate · cuerpo vencido.',waterLow:'Remate · cuerpo encogido; lengua fuera.',waterHigh:'Remate · torso hinchado.',salt:'Remate · cuerpo rígido.'};
   return{kind:'dead',text:terminal[state.cause]||'Remate · queda inmóvil tras la caída.'};
 }
 return{kind:'gesture',text:''};
}
function renderStageCauses(engineState){
 const root=$('#stageCauses');if(!root)return;root.replaceChildren();root.classList.remove('has-cause-nav');
 const levels=state.levels||{},effects=(engineState?.effects||[]).filter(e=>e&&NUTRIENTS.some(n=>n.id===e.nutrient));
 const moment=sceneMoment(engineState);
 if(moment.kind==='still'){
   const note=document.createElement('div');note.className='scene-stability-note';note.textContent=moment.text;root.append(note);return;
 }
 const active=state.absurd&&state.activeNutrient?state.activeNutrient:state.focusedNutrient;
 const grouped=new Map();
 if((engineState?.stress||0)>.15){for(const effect of effects){const cue=cueForNutrient(effect.nutrient,levels);if(!cue)continue;const config=gestureByCue[cue];if(!config)continue;const group=grouped.get(cue)||{cue,config,effects:[],strength:0};group.effects.push(effect);group.strength=Math.max(group.strength,effect.strength||0);grouped.set(cue,group)}}
 const engineCue=engineState?.currentCue||engineState?.cue||null;
 const groups=[...grouped.values()].sort((a,b)=>{
   const aFocus=active&&a.effects.some(e=>e.nutrient===active)?1:0,bFocus=active&&b.effects.some(e=>e.nutrient===active)?1:0;
   const aEngineCue=engineCue&&a.cue===engineCue?1:0,bEngineCue=engineCue&&b.cue===engineCue?1:0;
   const aDominant=engineState?.dominantNutrient&&a.effects.some(e=>e.nutrient===engineState.dominantNutrient)?1:0,bDominant=engineState?.dominantNutrient&&b.effects.some(e=>e.nutrient===engineState.dominantNutrient)?1:0;
   return bFocus-aFocus||bEngineCue-aEngineCue||bDominant-aDominant||b.strength-a.strength;
 }).slice(0,3);
 if(!groups.length){
   const note=document.createElement('div');note.className='scene-stability-note';
   if(moment.text){note.textContent=moment.text;root.append(note);return}
   if(state.absurd&&state.activeNutrient){const n=NUTRIENTS.find(item=>item.id===state.activeNutrient);note.textContent=n?`${n.name}: sin gesto específico; el ajuste solo inclina la postura.`:'Sin gesto específico; el ajuste solo inclina la postura.'}
   else if(state.focusedNutrient){const n=NUTRIENTS.find(item=>item.id===state.focusedNutrient);note.textContent=n?`${n.name}: ${state.horizon==='hoy'?'hoy solo lees el aporte; la postura no cambia.':'sin gesto específico visible en este patrón.'}`:'No hay gesto específico visible en este nivel.'}
   else note.innerHTML=`${state.horizon==='hoy'&&!state.absurd?'Hoy: suma del registro. El cuerpo sigue estable.':'Postura estable · sin gesto específico'}<small>${state.horizon==='patron'?'Este patrón no activa un gesto visible.':'El gesto de escena no es un síntoma.'}</small>`;
   root.append(note);return;
 }
  const compactViewport=compactSceneMedia.matches;
 const visibleGroups=moment.kind==='gesture'?groups:groups.slice(0,1);
 let displayedGroups=visibleGroups;
 if(compactViewport&&visibleGroups.length>1){
   let selected=(active&&visibleGroups.find(group=>group.effects.some(e=>e.nutrient===active)))||
     visibleGroups.find(group=>group.cue===state.sceneCauseCue)||
     (engineCue&&visibleGroups.find(group=>group.cue===engineCue))||visibleGroups[0];
   state.sceneCauseCue=selected.cue;
   const nav=document.createElement('div');nav.className='scene-cause-nav';nav.setAttribute('role','group');nav.setAttribute('aria-label','Otros efectos visibles');root.classList.add('has-cause-nav');
   for(const group of visibleGroups){
     const first=group.effects[0],nutrient=NUTRIENTS.find(n=>n.id===first.nutrient),feminine=['energia','proteina','agua','fibra','vitC'].includes(first.nutrient),direction=first.direction==='low'?(feminine?'baja':'bajo'):(feminine?'alta':'alto');
     const tab=document.createElement('button');tab.type='button';tab.className='scene-cause-tab';tab.dataset.cue=group.cue;tab.setAttribute('aria-pressed',String(group.cue===selected.cue));tab.setAttribute('aria-label',`${nutrient?.name||'Efecto'} ${direction}; mostrar gesto y enfocar control`);tab.textContent=`${nutrient?.name||'Efecto'} ${first.direction==='low'?'↓':'↑'}`;
     tab.addEventListener('click',()=>{state.sceneCauseCue=group.cue;state.focusedNutrient=group.effects[0].nutrient;if(state.absurd)state.activeNutrient=state.focusedNutrient;const control=$('#input-'+state.focusedNutrient);if(control)control.focus({preventScroll:true});render(false)});nav.append(tab);
   }
   root.append(nav);displayedGroups=[selected];
 }else if(!compactViewport&&state.sceneCauseCue&&!visibleGroups.some(group=>group.cue===state.sceneCauseCue))state.sceneCauseCue=null;
 const cueNames=new Set();
 for(const [index,group] of displayedGroups.entries()){
   const names=[...new Set(group.effects.map(e=>effectName(e,state.absurd)))];
   const title=names.join(' + ');
   const sentence=moment.kind==='gesture'?`${group.config.region}: ${group.config.gesture}`:moment.text;
   const button=document.createElement('button');button.type='button';button.className='scene-cause-tag';button.dataset.priority=index===0?'main':'secondary';
   const focused=active&&group.effects.some(e=>e.nutrient===active);button.dataset.focused=String(!!focused);button.dataset.nutrient=group.effects[0].nutrient;button.setAttribute('aria-pressed',String(!!focused));
   button.setAttribute('aria-label',`${title}. ${sentence}. Enfocar el nutriente relacionado.`);
   button.innerHTML=`<span class="scene-tag-label"></span><span class="scene-tag-body"></span>`;button.querySelector('.scene-tag-label').textContent=title;button.querySelector('.scene-tag-body').textContent=sentence;
   button.addEventListener('click',()=>{const nutrient=button.dataset.nutrient;state.focusedNutrient=nutrient;if(state.absurd)state.activeNutrient=nutrient;const control=$('#input-'+nutrient);if(control){control.focus({preventScroll:true});render(false)}});
   root.append(button);group.effects.forEach(e=>cueNames.add(e.nutrient));
 }
 if(active&&!cueNames.has(active)&&root.children.length<(compactViewport?2:3)){const n=NUTRIENTS.find(item=>item.id===active);if(n){const note=document.createElement('div');note.className='scene-stability-note';note.dataset.kind='focus';note.textContent=state.absurd?`${n.name}: sin gesto específico; el ajuste solo inclina la postura.`:`${n.name}: ${state.horizon==='hoy'?'hoy solo lees el aporte; la postura no cambia.':'sin gesto específico visible en este patrón.'}`;root.append(note)}}
}
function shortReading(vals,ins){
 if(state.focusedNutrient)return nutrientDetail(state.focusedNutrient,vals,ins);
 if(state.absurd)return{label:state.horizon==='patron'?`ESCENA FICTICIA · PATRÓN ${state.patternDays} DÍAS`:'ESCENA FICTICIA · HOY',text:'Los niveles de escena están separados de las cantidades del menú; cambia el gesto del personaje, no el aporte calculado.'};
 if(state.horizon==='patron')return{label:`PATRÓN · ${state.patternDays} DÍAS · ILUSTRATIVO`,text:'Este ejemplo repite los aportes seleccionados. La evolución y los gestos son ilustrativos, no síntomas ni pronósticos.'};
 return{label:'HOY · APORTE DEL REGISTRO',text:'Hoy suma las porciones aproximadas. El cuerpo sigue estable; un solo día no diagnostica una deficiencia.'};
}
function modeStatus(){const horizon=state.horizon==='hoy'?'HOY':`PATRÓN · ${state.patternDays} DÍAS`;return state.absurd?`${horizon} · FICCIÓN`:state.horizon==='hoy'?'HOY · REGISTRO':`${horizon} · ILUSTRATIVO`}
function render(writeSliders=true){renderFoods();const vals=totals();for(const n of NUTRIENTS){const el=$('#input-'+n.id),number=$('#number-'+n.id),row=el.closest('.nutrient-row');el.max=n.max*2;const p=pct(n,vals);if(writeSliders&&!state.manual)el.value=Math.min(n.max*2,vals[n.id]);if(document.activeElement!==number)number.value=cleanValue(n,vals[n.id]);$('#amount-'+n.id).textContent=`ref. ${fmt(n,targetOf(n))}`;$('#pct-'+n.id).textContent=`${Math.round(p)}%`;el.style.setProperty('--fill',`${Math.min(100,vals[n.id]/(n.max*2)*100)}%`);row.style.setProperty('--tone',n.color);row.classList.toggle('is-focused',state.focusedNutrient===n.id);const flag=$('#flag-'+n.id);const low=n.id!=='sodio'&&p<65,high=n.id==='sodio'&&p>100,ul=n.ul&&vals[n.id]>=n.ul;flag.textContent=ul?'Supera UL de referencia':low?'Bajo en este ejemplo':high?'Sobre CDRR en este ejemplo':''}
  for(const n of NUTRIENTS){const row=$('#input-'+n.id).closest('.nutrient-row'),sceneLevel=$('#scene-level-'+n.id),level=Number(state.levels?.[n.id]??100);row.classList.toggle('is-fictional',state.absurd);sceneLevel.hidden=!state.absurd;const descriptor=level<=10?'muy bajo teatral':level<65?'bajo teatral':level>=280?'extremo alto teatral':level>=160?'alto teatral':'neutro';sceneLevel.textContent=`Escena ficticia: ${Math.round(level)} · ${descriptor}`}
  const ins=insights(vals),detail=shortReading(vals,ins);$('#effectKicker').textContent=detail.label;$('#effectCopy').textContent=detail.text;$('#captionKicker').textContent=state.dead?'DESENLACE FICTICIO · REMATE':state.absurd?`ESCENA FICTICIA · ${state.horizon==='patron'?`PATRÓN ${state.patternDays} DÍAS`:'HOY'}`:state.horizon==='patron'?`PATRÓN · ${state.patternDays} DÍAS · ILUSTRATIVO`:'HOY · SOLO APORTE';$('#modePill').textContent=modeStatus();const foods=state.manual?[]:state.selected.map(id=>FOOD.find(f=>f.id===id)).filter(Boolean);const energy=vals.energia;const summary=foods.length?`${fmt(NUTRIENTS[0],energy)} · ${foods.length} porción${foods.length===1?'':'es'}`:'elige una porción';$('#summaryText').textContent=summary;if(!state.routine&&!state.playing&&!state.dead){const profileName=state.profile==='mujer'?'Vera':'Leo';$('#captionLine').textContent=state.absurd?(state.caption||'El personaje ensaya un gesto con mucha seguridad.'):state.horizon==='patron'?'Repite el menú; cambia las porciones y observa el cuerpo.':`${profileName} está tranquilo. La cuchara puede esperar.`}
 // La rutina ilustra solo una jornada con poca energía/hidratación. El resto de nutrientes abre contexto, sin atribuirles fuerza o síntomas instantáneos.
 sim.mood=ins.ironScene?1:ins.energyPause ? .35 : 0;sim.fiber=ins.fiberScene;sim.vitC=ins.vitCScene;sim.vitCHigh=ins.vitCHigh;sim.energyPause=ins.energyPause;sim.missing=NUTRIENTS.filter(n=>n.id!=='sodio'&&ins.pctMap[n.id]<65).length;sim.sodium=ins.high;sim.energy=ins.pctMap.energia;sim.water=ins.pctMap.agua;sim.profile=state.profile;sim.horizon=state.horizon;sim.vars=ins.pctMap;state.levels=state.absurd?state.levels:(state.horizon==='patron'?deriveLevels():Object.fromEntries(NUTRIENTS.map(n=>[n.id,100])));state.cause=state.absurd?state.cause:(state.horizon==='patron'?inferCause():null);syncStage();
}
function clear(){state.selected=[];state.manual=false;state.manualValues=null;state.horizon='hoy';state.focusedNutrient=null;state.routine=false;state.routinePhase=-1;$('#routineBtn').disabled=false;$('#routineBtn').innerHTML='Ver rutina <span aria-hidden="true">↗</span>';$('#routineBar').style.width='0%';$$('#nutrientList input').forEach(e=>e.value=0);$('#app').classList.remove('manual');$('#foodsMode').setAttribute('aria-pressed','true');$('#manualMode').setAttribute('aria-pressed','false');$('#todayBtn').setAttribute('aria-pressed','true');$('#patternBtn').setAttribute('aria-pressed','false');render()}
$('#foodsMode').addEventListener('click',()=>{clearTimeout(window.__tajinExtremeTimer);if(state.dead||state.playing){reviveForTransition();state.dead=false;state.playing=false}state.manual=false;state.manualValues=null;state.absurd=false;state.activeNutrient=null;state.caption=state.profile==='mujer'?'Vera espera turno con una cuchara.':'Leo espera turno con una cuchara.';$('#app').classList.remove('manual');$('#foodsMode').setAttribute('aria-pressed','true');$('#manualMode').setAttribute('aria-pressed','false');render()});$('#manualMode').addEventListener('click',()=>{enterManual();$('#labNotice').hidden=false;render()});$('#manualClear').addEventListener('click',()=>{clearTimeout(window.__tajinExtremeTimer);if(state.dead||state.playing){reviveForTransition();state.dead=false;state.playing=false}enterManual();state.manualValues=Object.fromEntries(NUTRIENTS.map(n=>[n.id,0]));state.absurd=true;state.levels=Object.fromEntries(NUTRIENTS.map(n=>[n.id,0]));state.cause='waterLow';state.caption='Los deslizadores llegaron al suelo. El cuerpo hace teatro.';$$('#nutrientList input').forEach(e=>e.value=0);render(false)});
$('#foodsMode').addEventListener('click',()=>{state.captionTrail=[];renderCaptionTrail()});
$('#todayBtn').addEventListener('click',()=>{state.horizon='hoy';$('#todayBtn').setAttribute('aria-pressed','true');$('#patternBtn').setAttribute('aria-pressed','false');render()});$('#patternBtn').addEventListener('click',()=>{state.horizon='patron';$('#todayBtn').setAttribute('aria-pressed','false');$('#patternBtn').setAttribute('aria-pressed','true');render()});
$$('[data-profile]').forEach(b=>b.addEventListener('click',()=>{state.profile=b.dataset.profile;if(!state.absurd&&!state.playing&&!state.dead)state.caption=state.profile==='mujer'?'Vera espera turno con una cuchara.':'Leo espera turno con una cuchara.';if(!state.massEdited){state.massKg=state.profile==='mujer'?60:70;$('#massSlider').value=state.massKg;$('#massValue').textContent=state.massKg}$$('[data-profile]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));render(!state.manual)}));$('#resetBtn').addEventListener('click',restore);
function setPaused(value){state.paused=value;const b=$('#motionBtn');b.setAttribute('aria-pressed',String(value));b.setAttribute('aria-label',value?'Reanudar movimiento':'Pausar movimiento');b.textContent=value?'Reanudar':'Pausar';stage?.setPaused(value);audio.setPaused(value)}$('#motionBtn').addEventListener('click',()=>setPaused(!state.paused));setPaused(state.paused);
const helpRoot=$('#helpRoot');function closeHelp(){helpRoot.innerHTML='';$('#helpBtn').focus()}$('#helpBtn').addEventListener('click',()=>{helpRoot.innerHTML=`<div class="help-backdrop" role="presentation"><section class="help-card" role="dialog" aria-modal="true" aria-labelledby="helpTitle"><div class="eyebrow">ANTES DE MOVER LOS CONTROLES</div><h2 id="helpTitle">Una maqueta, no un veredicto.</h2><p>Las porciones usan cifras aproximadas basadas en alimentos de referencia. El modo absurdo modifica niveles teatrales aparte; no representa dosis letales ni equivalencias clínicas. Los ejemplos de energía/proteína son para adultos sedentarios de 30 años, 178 cm/70 kg y 163 cm/60 kg; no personalizan necesidades.</p><ul><li><b>Un día</b> muestra la suma estimada de las porciones que seleccionaste.</li><li><b>Patrón sostenido</b> imagina que esa selección se repite. Las escenas de efecto muestran asociaciones educativas de patrones muy marcados; no predicen plazos ni diagnostican.</li><li>El agua total incluye agua simple, otras bebidas y agua de alimentos. El sodio usa el CDRR de 2,300 mg, una referencia poblacional de reducción de riesgo, no un límite de intoxicación.</li><li>Los UL adultos mostrados para hierro (45 mg), vitamina C (2,000 mg) y calcio (2,500 mg) no son metas. La apariencia del personaje no mide la salud de una persona.</li></ul><p>Referencias: <a href="https://ods.od.nih.gov/HealthInformation/nutrientrecommendations.aspx" target="_blank" rel="noopener">NIH ODS — recomendaciones</a> y <a href="https://fdc.nal.usda.gov/" target="_blank" rel="noopener">USDA FoodData Central</a>.</p><div class="help-foot"><button id="closeHelp">Entendido</button></div></section></div>`;$('#closeHelp').addEventListener('click',closeHelp);$('.help-backdrop').addEventListener('click',e=>{if(e.target===e.currentTarget)closeHelp()});$('#closeHelp').focus()});document.addEventListener('keydown',e=>{if(!$('#closeHelp'))return;if(e.key==='Escape'){closeHelp();return}if(e.key==='Tab'){const focusables=[...$('.help-card').querySelectorAll('a[href],button:not([disabled])')],first=focusables[0],last=focusables.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}});

const stageHost=$('#stage');const sim={mood:0,missing:0,sodium:false,energy:100,water:100,profile:'hombre',horizon:'hoy',vars:{}};
function deriveLevels(){
 const vals=totals();
 return Object.fromEntries(NUTRIENTS.map(n=>{
   let level=Math.max(0,Math.min(400,Math.round(vals[n.id]/targetOf(n)*100)));
   if(state.absurd||state.horizon!=='patron')return[n.id,level];
   // Keep pattern gestures only where the documented association matches the visible pose.
   // Raw food totals, reference percentages, and nutrient details are computed separately.
   if(n.id==='calcio')return[n.id,100];
   if(n.id==='vitC'&&level<100)return[n.id,100];
   if(n.id==='hierro'&&level>100)return[n.id,100];
   // Pattern cues are illustrative: ordinary adult ULs gate micronutrient excess cues.
   // The displayed nutrient amounts and reference percentages remain untouched.
   if(['energia','proteina'].includes(n.id)&&level>100)level=n.id==='proteina'?100:Math.min(level,140);
   if(n.id==='sodio'&&level<100)level=100; // CDRR is not a minimum or a low-sodium symptom threshold.
   if(n.ul){
     if(vals[n.id]<=n.ul)level=Math.min(level,140);
     else level=Math.min(260,140+Math.round((vals[n.id]/n.ul-1)*60));
   }
   return[n.id,level];
 }));
}
function inferCause(){const L=state.levels;if(L.agua<60)return'waterLow';if(L.agua>160)return'waterHigh';if(L.sodio<65)return'mixed';if(L.energia<65||L.proteina<65)return'energy';if(L.sodio>140)return'salt';if(L.fibra<65||L.fibra>170||L.vitC<65||L.vitC>180||L.energia>140||L.proteina>140)return'gut';if(L.hierro<60||L.calcio<65||L.calcio>140)return'iron';if(L.hierro>140)return'energy';if(Math.max(...Object.values(L))>220)return'mixed';return null}
function isCriticalScene(){if(!state.absurd||state.neutral)return false;const levels=Object.values(state.levels||{});return levels.length>0&&(Math.min(...levels)<=10||Math.max(...levels)>=280)}
function resumeHealthyPoseIfBalanced(){if((state.dead||state.playing)&&!isCriticalScene()){clearTimeout(window.__tajinExtremeTimer);reviveForTransition();state.dead=false;state.playing=false}}
function sceneSeverity(){if(state.horizon!=='patron'&&!state.absurd)return'balanced';if(isCriticalScene())return'critical';const levels=Object.values(state.levels||{});return levels.some(x=>x<=60||x>=160)?'altered':'balanced'}
function renderCaptionTrail(){const root=$('#captionHistory');if(!root)return;const current=$('#captionLine')?.textContent||state.caption;const history=state.captionTrail.filter(text=>text!==state.caption&&text!==current).slice(-2);root.replaceChildren(...history.map(text=>{const row=document.createElement('div');row.className='caption-history-line';row.textContent=text;return row}))}
function rememberCaption(text){if(!text)return;const clean=String(text).trim();if(clean&&state.captionTrail.at(-1)!==clean){state.captionTrail.push(clean);state.captionTrail=state.captionTrail.slice(-4)}renderCaptionTrail()}
function reviveForTransition(){
 const hasOutcome=state.dead||state.playing;
 if(hasOutcome){state.ignoreRevivedPresentation=true;clearTimeout(window.__tajinIgnoreRevivedTimer);window.__tajinIgnoreRevivedTimer=setTimeout(()=>{state.ignoreRevivedPresentation=false},1500)}
 stage?.revive();
}
function phaseKicker(phase){
 const labels={anticipation:'1 · Prueba',reaction:'2 · Reacción',fall:'3 · Caída',dead:'4 · Desenlace',ghost:'5 · Fantasma',retry1:'Insiste por la cuchara',retry2:'Insiste por la cuchara',resigned:'Se resigna',reviving:'Recuperación',tasting:'Prueba tranquila',idle:'Escena lista'};
 const label=labels[phase]||'Escena en curso';return state.absurd?`ESCENA FICTICIA · ${label}`:state.horizon==='patron'?`PATRÓN ILUSTRATIVO · ${label}`:label;
}
function stageDisplay(){
 const profileName=state.profile==='mujer'?'Vera':'Leo';
 if(state.dead&&state.comparison==='before')return{kicker:`ANTES · ${state.profile==='mujer'?'VERA VIVA':'LEO VIVO'}`,caption:'Postura previa al desenlace.'};
 const phase=stage?.getState?.().phase;
 const quietPattern=state.horizon==='patron'&&!state.absurd&&!state.playing&&!state.dead&&(phase==='idle'||phase==='revived');
 return{kicker:(state.dead||state.playing)?phaseKicker(phase):state.absurd?`ESCENA FICTICIA · ${state.horizon==='patron'?`PATRÓN ${state.patternDays} DÍAS`:'HOY'}`:state.horizon==='patron'?`PATRÓN · ${state.patternDays} DÍAS · ILUSTRATIVO`:'HOY · SOLO APORTE',caption:quietPattern?'Repite el menú; cambia las porciones y observa el cuerpo.':state.caption||`${profileName} está tranquilo.`};
}
function syncStage(){
 if(!stage)return;
 const severity=sceneSeverity();state.projectedMassKg=projectedMass();
 $('#massValue').textContent=state.massKg;$('#massProjection').hidden=state.horizon!=='patron';$('#massProjection').textContent=`Evolución ilustrativa · ${state.massKg.toFixed(1)} → ${state.projectedMassKg.toFixed(1)} kg · ${state.patternDays} días`;
 $('#patternDuration').hidden=state.horizon!=='patron';$('#patternDaysValue').textContent=state.patternDays;
 stage.setState({profile:state.profile,levels:state.levels,intensity:Math.max(...Object.values(state.levels||{x:0}))/100,paused:state.paused,neutral:state.neutral,massKg:state.projectedMassKg,activeNutrient:state.absurd?state.activeNutrient:null});
 if(state.dead&&state.comparison)stage.setComparison?.(state.comparison);
 setAudioComparison();
 const stageState=stage.getState?.();renderStageCauses(stageState);
  const display=stageDisplay();$('#captionLine').textContent=display.caption;$('#captionKicker').textContent=display.kicker;renderCaptionTrail();
 $('#modePill').textContent=modeStatus();
 $('#routineBtn').textContent=state.dead?'Resucitar':state.playing?'En escena…':isCriticalScene()?'Ver desenlace':'Ver reacción';
 $('#neutralBtn').textContent=state.dead?(state.comparison==='before'?'Ver después · muerto':'Ver antes · vivo'):'Antes / Después';
 $('#fictionStatus').dataset.level=state.absurd?severity:'balanced';$('#fictionStatus').textContent=!state.absurd?'Registro real · sin desenlace fatal':severity==='critical'?'Extremo ficticio · desenlace disponible':severity==='altered'?'Alterado · reacción teatral':'Equilibrado · sin desenlace';
 $('#stagePanel').dataset.scene=state.absurd?'fiction':state.horizon;$('#stagePanel').classList.toggle('is-dead',state.dead);
}
function chooseAbsurd(id){clearTimeout(window.__tajinExtremeTimer);if(state.dead||state.playing){reviveForTransition();state.dead=false;state.playing=false}state.comparison=null;stage.setComparison?.(null);const scenes={energy:{cause:'energy',levels:{energia:0,proteina:10,agua:100,fibra:35,hierro:30,vitC:30,calcio:50,sodio:10},caption:'La siguiente cucharada la levanto mañana.'},salt:{cause:'salt',levels:{energia:100,proteina:100,agua:100,fibra:100,hierro:100,vitC:100,calcio:100,sodio:350},caption:'Me quedó un poco… ¿dónde está el agua?'},water:{cause:'waterHigh',levels:{energia:100,proteina:100,agua:350,fibra:100,hierro:100,vitC:100,calcio:100,sodio:100},caption:'Ya. No me cabe ni el hipo.'},chaos:{cause:'mixed',levels:{energia:5,proteina:85,agua:15,fibra:350,hierro:100,vitC:350,calcio:100,sodio:350},caption:'Perfecto. Ahora todo me pasa a la vez.'}};const x=scenes[id];if(!x)return;state.absurd=true;state.dead=false;state.playing=false;state.cause=x.cause;state.levels={...x.levels};state.caption=x.caption;state.captionTrail=[];rememberCaption(x.caption);state.neutral=false;state.activeNutrient=null;render(false)}
function playReaction(){if(state.playing)return;state.playing=true;state.cause=inferCause()||'mixed';stage.play({fatal:false,cause:state.cause});syncStage()}
function playEnding(){clearTimeout(window.__tajinExtremeTimer);if(state.dead){stage.revive();state.dead=false;state.playing=false;state.comparison=null;stage.setComparison?.(null);render(false);return}if(state.playing)return;if(!isCriticalScene()){playReaction();return}state.cause=state.cause||inferCause()||'mixed';state.playing=true;stage.setState({profile:state.profile,levels:state.levels,intensity:1,paused:state.paused,neutral:state.neutral,massKg:state.projectedMassKg});stage.play({fatal:true,cause:state.cause});syncStage()}
function restore(){clearTimeout(window.__tajinExtremeTimer);reviveForTransition();state.selected=PRESETS[0].items.slice();state.manual=false;state.manualValues=null;state.absurd=false;state.dead=false;state.playing=false;state.activeNutrient=null;state.neutral=false;state.comparison=null;state.captionTrail=[];state.horizon='patron';state.patternDays=30;state.focusedNutrient=null;state.caption=state.profile==='mujer'?'Vera tiene hambre razonable y la cuchara en la mira.':'Leo tiene hambre razonable y la cuchara en la mira.';state.massKg=state.profile==='mujer'?60:70;state.massEdited=false;$('#massSlider').value=state.massKg;$('#massValue').textContent=state.massKg;$('#patternDays').value=30;$('#patternDaysValue').textContent='30';$('#todayBtn').setAttribute('aria-pressed','false');$('#patternBtn').setAttribute('aria-pressed','true');$('#app').classList.remove('manual');$('#foodsMode').setAttribute('aria-pressed','true');$('#manualMode').setAttribute('aria-pressed','false');$$('#nutrientList input').forEach(e=>e.value=0);stage?.setComparison?.(null);rememberCaption(state.caption);render()}
function tryFewPortions(){clearTimeout(window.__tajinExtremeTimer);reviveForTransition();const preset=PRESETS.find(p=>p.id==='pocaenergia');if(!preset)return;state.selected=preset.items.slice();state.manual=false;state.manualValues=null;state.absurd=false;state.dead=false;state.playing=false;state.routine=false;state.activeNutrient=null;state.neutral=false;state.comparison=null;state.captionTrail=[];state.caption='';state.horizon='patron';state.focusedNutrient=null;state.sceneCauseCue=null;state.cause=null;$('#todayBtn').setAttribute('aria-pressed','false');$('#patternBtn').setAttribute('aria-pressed','true');$('#app').classList.remove('manual');$('#foodsMode').setAttribute('aria-pressed','true');$('#manualMode').setAttribute('aria-pressed','false');$('#labNotice').hidden=true;stage?.setComparison?.(null);render()}
function onStageEvent(e){audio.handleStageEvent(e,stage?.getState?.(),state.cause);if(e.type==='revived'&&state.ignoreRevivedPresentation){state.ignoreRevivedPresentation=false;clearTimeout(window.__tajinIgnoreRevivedTimer);syncStage();return}if(e.type==='phase'){if(e.caption)state.caption=e.caption;if(e.caption)rememberCaption(e.caption);if(e.phase==='idle'){state.playing=false;state.dead=false}const display=stageDisplay();$('#captionLine').textContent=display.caption;$('#captionKicker').textContent=display.kicker;renderStageCauses(stage?.getState?.());if(e.phase==='idle')syncStage()}if(e.type==='dead'){state.dead=true;state.playing=false;state.comparison='after';stage.setComparison?.('after');state.caption=e.caption||'Fin de la función. La cuchara sigue en servicio.';rememberCaption(state.caption);syncStage()}if(e.type==='revived'){state.dead=false;state.playing=false;state.comparison=null;stage.setComparison?.(null);state.caption=state.horizon==='patron'?'De vuelta; el patrón sigue igual.':state.absurd?'De vuelta; la escena sigue igual.':'De vuelta; la cuchara sigue en servicio.';rememberCaption(state.caption);syncStage()}}
try{stage=createCharacterStage(stageHost,{onEvent:onStageEvent,onReady:()=>{state.ready=true;window.appReady=true},onError:e=>{window.__stageError=e?.stack||String(e);console.error('Tajín stage error',window.__stageError);$('#stageError').style.display='block';window.appReady=true}})}catch(e){window.__stageError=e?.stack||String(e);console.error('Tajín stage creation error',window.__stageError);throw e}
$$('[data-absurd]').forEach(b=>b.addEventListener('click',()=>chooseAbsurd(b.dataset.absurd)));$('#restoreBtn').addEventListener('click',restore);$('#routineBtn').addEventListener('click',()=>state.dead?playEnding():state.playing?null:isCriticalScene()?playEnding():playReaction());$('#neutralBtn').addEventListener('click',()=>{if(state.dead){state.comparison=state.comparison==='before'?'after':'before';stage.setComparison?.(state.comparison);syncStage();return}if(!state.neutral&&state.playing){clearTimeout(window.__tajinExtremeTimer);reviveForTransition();state.dead=false;state.playing=false}state.neutral=!state.neutral;syncStage()});$('#massSlider').addEventListener('input',e=>{state.massKg=Number(e.target.value);state.massEdited=true;$('#massValue').textContent=state.massKg;syncStage()});$('#patternDays').addEventListener('input',e=>{state.patternDays=Number(e.target.value);$('#patternDaysValue').textContent=state.patternDays;syncStage()});
compactSceneMedia.addEventListener('change',()=>renderStageCauses(stage?.getState?.()));
$('#fewPortionsBtn').addEventListener('click',tryFewPortions);
$('#soundToggle').addEventListener('click',()=>{audio.toggleFromGesture()});$('#soundVolume').addEventListener('input',e=>audio.setVolume(e.target.value));
try{
 buildNutrients();renderPresets();render();window.appReady=!!state.ready;
 window.appTest=Object.freeze({getAudioState:()=>audio.getState(),startAudioCapture:()=>audio.startCapture(),stopAudioCapture:()=>audio.stopCapture(),runOfflineAudioCheck:()=>audio.runOfflineAudioCheck(),getState:()=>({
  ready:state.ready,mode:state.manual?'manual':'comidas',absurd:state.absurd,profile:state.profile,horizon:state.horizon,paused:state.paused,
  dead:state.dead,playing:state.playing,cause:state.cause,neutral:state.neutral,fictionalLevel:sceneSeverity(),fatalAvailable:isCriticalScene(),
  massKg:state.massKg,baseMassKg:state.massKg,projectedMassKg:state.projectedMassKg,patternDays:state.patternDays,comparison:state.comparison,
  caption:state.caption,displayCaption:$('#captionLine').textContent,displayKicker:$('#captionKicker').textContent,captionTrail:[...state.captionTrail],focusedNutrient:state.focusedNutrient,activeNutrient:state.absurd?state.activeNutrient:null,sceneCauseCue:state.sceneCauseCue,sceneReadings:Object.fromEntries(NUTRIENTS.map(n=>[n.id,$('#scene-level-'+n.id).textContent])),
  label:$('#effectKicker').textContent,copy:$('#effectCopy').textContent,sceneTags:[...$$('#stageCauses .scene-cause-tag')].map(el=>({text:el.innerText,nutrient:el.dataset.nutrient,focused:el.dataset.focused==='true'})),sceneCauseOptions:[...$$('#stageCauses .scene-cause-tab')].map(el=>({text:el.textContent,cue:el.dataset.cue,selected:el.getAttribute('aria-pressed')==='true'})),
  sceneStabilityNote:$('#stageCauses .scene-stability-note')?.innerText||null,selected:[...state.selected],
  portions:Object.fromEntries(FOOD.map(f=>[f.id,state.selected.filter(id=>id===f.id).length])),
  values:Object.fromEntries(Object.entries(totals()).map(([key,value])=>[key,Number(value.toFixed(6))])),
  percentages:Object.fromEntries(NUTRIENTS.map(n=>[n.id,Math.round(pct(n))])),levels:{...state.levels},audio:audio.getState(),cinematic:stage?.getState?.()||null
 })})
}catch(e){window.__bootError=e?.stack||String(e);console.error('Tajín app boot error',window.__bootError);throw e}







