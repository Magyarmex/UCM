const PREF_KEY='a-punto.audio.v1';
const DEFAULT_VOLUME=.45;
const MUSIC_BASE_GAIN=.45;
const MUSIC_DUCK_GAIN=.13;
const MUSIC_NOTES=[293.66,0,392,493.88,0,440,349.23,0,329.63,392,0,523.25,440,0,392,293.66,0,349.23,440,0,392,329.63,0,261.63];
const SFX_NAMES=['spoon','waterLow','waterHigh','salt','energy','gut','iron','mixed','fall','impact','ghost','retry','revive'];
const clamp=(value,min,max)=>Math.min(max,Math.max(min,Number(value)||0));

function createTone(context,bus,{frequency=440,endFrequency=null,wave='sine',duration=.14,attack=.008,level=.12,delay=0,detune=0,onSource=()=>{}}={}){
 const start=context.currentTime+Math.max(0,delay),end=start+Math.max(.035,duration),osc=context.createOscillator(),gain=context.createGain();
 osc.type=wave;osc.frequency.setValueAtTime(Math.max(30,frequency),start);if(endFrequency!==null)osc.frequency.exponentialRampToValueAtTime(Math.max(30,endFrequency),end);
 osc.detune.setValueAtTime(detune,start);gain.gain.setValueAtTime(.0001,start);gain.gain.linearRampToValueAtTime(Math.max(.0002,level),start+Math.min(attack,duration*.4));gain.gain.exponentialRampToValueAtTime(.0001,end);
 osc.connect(gain);gain.connect(bus);onSource(osc,gain);osc.start(start);osc.stop(end+.012);return{osc,gain};
}

function synthCue(context,bus,name,onSource=()=>{}){
 const tone=(opts)=>createTone(context,bus,{...opts,onSource});
 switch(name){
  case'spoon':
   tone({frequency:1120,endFrequency:880,wave:'sine',duration:.085,level:.17});tone({frequency:1568,endFrequency:1320,wave:'sine',duration:.065,level:.095,delay:.028});tone({frequency:210,endFrequency:165,wave:'triangle',duration:.095,level:.075,delay:.11});break;
  case'waterLow':
   tone({frequency:850,endFrequency:620,wave:'triangle',duration:.09,level:.11});tone({frequency:510,endFrequency:390,wave:'sine',duration:.12,level:.07,delay:.09});break;
  case'waterHigh':
   tone({frequency:250,endFrequency:165,wave:'sine',duration:.16,level:.15});tone({frequency:310,endFrequency:190,wave:'sine',duration:.18,level:.12,delay:.105});tone({frequency:205,endFrequency:135,wave:'triangle',duration:.19,level:.105,delay:.23});break;
  case'salt':
   tone({frequency:1480,endFrequency:1180,wave:'triangle',duration:.055,level:.1});tone({frequency:1040,endFrequency:820,wave:'triangle',duration:.05,level:.07,delay:.075});break;
  case'energy':
   tone({frequency:445,endFrequency:330,wave:'sine',duration:.23,level:.135});tone({frequency:352,endFrequency:245,wave:'triangle',duration:.25,level:.105,delay:.12});tone({frequency:268,endFrequency:185,wave:'sine',duration:.28,level:.09,delay:.24});break;
  case'gut':
   tone({frequency:188,endFrequency:119,wave:'sine',duration:.25,level:.16});tone({frequency:142,endFrequency:95,wave:'triangle',duration:.22,level:.12,delay:.19});tone({frequency:175,endFrequency:112,wave:'sine',duration:.24,level:.105,delay:.39});break;
  case'iron':
   tone({frequency:360,endFrequency:320,wave:'triangle',duration:.15,level:.105});tone({frequency:410,endFrequency:365,wave:'sine',duration:.14,level:.08,delay:.13});tone({frequency:310,endFrequency:280,wave:'triangle',duration:.18,level:.08,delay:.27});break;
  case'mixed':
   tone({frequency:250,endFrequency:174,wave:'sine',duration:.22,level:.12});tone({frequency:390,endFrequency:275,wave:'triangle',duration:.22,level:.09,delay:.15});tone({frequency:160,endFrequency:115,wave:'sine',duration:.22,level:.085,delay:.31});break;
  case'fall':
   tone({frequency:370,endFrequency:125,wave:'sine',duration:.44,level:.135});tone({frequency:245,endFrequency:175,wave:'triangle',duration:.28,level:.07,delay:.16});break;
  case'impact':
   tone({frequency:112,endFrequency:62,wave:'sine',duration:.23,level:.2});tone({frequency:230,endFrequency:145,wave:'triangle',duration:.13,level:.07,delay:.035});break;
  case'ghost':
   tone({frequency:523.25,endFrequency:587.33,wave:'sine',duration:.52,level:.042});tone({frequency:659.25,endFrequency:698.46,wave:'sine',duration:.58,level:.034,delay:.08});tone({frequency:783.99,endFrequency:698.46,wave:'sine',duration:.48,level:.025,delay:.18});break;
  case'retry':
   tone({frequency:704,endFrequency:630,wave:'triangle',duration:.105,level:.09});tone({frequency:528,endFrequency:470,wave:'sine',duration:.13,level:.075,delay:.14});break;
  case'revive':
   tone({frequency:392,endFrequency:392,wave:'sine',duration:.28,level:.11});tone({frequency:493.88,endFrequency:493.88,wave:'sine',duration:.32,level:.095,delay:.12});tone({frequency:587.33,endFrequency:587.33,wave:'sine',duration:.4,level:.085,delay:.25});tone({frequency:880,endFrequency:784,wave:'sine',duration:.12,level:.07,delay:.36});break;
 }
}

function readPrefs(storage){try{const raw=storage?.getItem(PREF_KEY);if(!raw)return{volume:DEFAULT_VOLUME,muted:false};const data=JSON.parse(raw);return{volume:clamp(data.volume,.0,1)||0,muted:!!data.muted}}catch{return{volume:DEFAULT_VOLUME,muted:false}}}

export function createAudioController({onChange=()=>{},getStageState=()=>null,AudioContextClass=null,OfflineAudioContextClass=null,documentRef=null,storage=null,requestFrame=null,cancelFrame=null,setTimer=null,clearTimer=null}={}){
 const doc=documentRef??globalThis.document??null;
 let localStorageRef=storage;try{if(!localStorageRef)localStorageRef=globalThis.localStorage}catch{}
 const Context=AudioContextClass??globalThis.AudioContext??globalThis.webkitAudioContext??null;
 const OfflineContext=OfflineAudioContextClass??globalThis.OfflineAudioContext??globalThis.webkitOfflineAudioContext??null;
 const raf=requestFrame??globalThis.requestAnimationFrame?.bind(globalThis)??(fn=>setTimeout(()=>fn(Date.now()),16));
 const caf=cancelFrame??globalThis.cancelAnimationFrame?.bind(globalThis)??clearTimeout;
 const timeout=setTimer??globalThis.setTimeout.bind(globalThis),clearTimeoutRef=clearTimer??globalThis.clearTimeout.bind(globalThis);
 const prefs=readPrefs(localStorageRef);
 let context=null,musicBus=null,sfxBus=null,master=null,limiter=null,captureNode=null,musicTimer=null,frameId=0,resumePromise=null;
 let armed=false,muted=true,volume=prefs.volume,paused=false,comparisonBefore=false,hidden=doc?.visibilityState==='hidden',disposed=false,musicIndex=0,musicCycle=0,ducked=false,lastError='',lastSound='',sequence=null;
 const activeSources=new Set(),soundLog=[];
 const safeChange=()=>{try{onChange(getState())}catch{}};
 const canPlay=()=>!!(armed&&!muted&&!paused&&!hidden&&!comparisonBefore&&volume>0&&context&&context.state!=='closed'&&!disposed);
 function savePrefs(){try{localStorageRef?.setItem(PREF_KEY,JSON.stringify({volume,muted}))}catch{}}
 function setParam(param,value,time=.025){if(!param||!context)return;try{param.cancelScheduledValues(context.currentTime);param.setTargetAtTime(value,context.currentTime,time)}catch{try{param.value=value}catch{}}}
 function logSound(name){lastSound=name;if(context)soundLog.push({name,time:Number(context.currentTime.toFixed(3))});else soundLog.push({name,time:null});if(soundLog.length>32)soundLog.splice(0,soundLog.length-32);}
 function trackSource(source,gain){const entry={source,gain};activeSources.add(entry);source.onended=()=>{activeSources.delete(entry);try{source.disconnect();gain.disconnect()}catch{}}}
 function stopSources(){for(const entry of activeSources){try{entry.source.stop()}catch{}try{entry.source.disconnect();entry.gain.disconnect()}catch{}}activeSources.clear()}
 function stopMusicTimer(){if(musicTimer!==null){clearTimeoutRef(musicTimer);musicTimer=null}}
 function stopMonitor(){if(frameId){caf(frameId);frameId=0}}
 function startMonitor(){if(!frameId&&sequence&&canPlay())frameId=raf(pollScene)}
 function stopGraph(){stopMusicTimer();stopMonitor();stopSources();if(context&&context.state==='running')context.suspend().catch(()=>{})}
 function createGraph(){
  if(context)return true;if(!Context){lastError='Este navegador no ofrece Web Audio.';return false}
  try{
   context=new Context();musicBus=context.createGain();sfxBus=context.createGain();master=context.createGain();limiter=context.createDynamicsCompressor();
   musicBus.gain.value=MUSIC_BASE_GAIN;sfxBus.gain.value=.9;master.gain.value=0;limiter.threshold.value=-9;limiter.knee.value=5;limiter.ratio.value=12;limiter.attack.value=.004;limiter.release.value=.14;
   musicBus.connect(master);sfxBus.connect(master);master.connect(limiter);limiter.connect(context.destination);setParam(master.gain,volume*.74,.01);
   context.onstatechange=()=>{if(context?.state==='closed'&&armed){lastError='El dispositivo de audio cerró la sesión.';stopMusicTimer();stopMonitor();stopSources()}safeChange()};
   return true;
  }catch(error){lastError=String(error?.message||error);try{context?.close()}catch{}context=null;musicBus=sfxBus=master=limiter=null;return false}
 }
 function scheduleMusicStep(){
  musicTimer=null;if(!canPlay())return;
  const note=MUSIC_NOTES[musicIndex];const phraseFactor=[1,.9439,1.0595][musicCycle%3];
  if(note)createTone(context,musicBus,{frequency:note*phraseFactor,endFrequency:note*phraseFactor*.997,wave:musicIndex%5===0?'triangle':'sine',duration:.28,attack:.025,level:.22,onSource:trackSource});
  if(musicIndex%4===0){const bass=[146.83,130.81,164.81,110][Math.floor(musicIndex/4)%4]*phraseFactor;createTone(context,musicBus,{frequency:bass,endFrequency:bass*.99,wave:'sine',duration:.34,attack:.04,level:.085,onSource:trackSource})}
  musicIndex++;if(musicIndex>=MUSIC_NOTES.length){musicIndex=0;musicCycle++}
  musicTimer=timeout(scheduleMusicStep,650);
 }
 function startMusic(){if(musicTimer===null&&canPlay())scheduleMusicStep()}
 async function updateRunState(){
  if(disposed||!context)return;
  if(canPlay()){
   if(context.state==='suspended'){
    if(resumePromise)return resumePromise;
    resumePromise=context.resume().then(()=>{resumePromise=null;if(canPlay()){setParam(master?.gain,volume*.74,.02);startMusic();startMonitor()}else stopGraph()}).catch(error=>{resumePromise=null;lastError=String(error?.message||error);safeChange()});return resumePromise;
   }
   setParam(master?.gain,volume*.74,.02);startMusic();startMonitor();return;
  }
  setParam(master?.gain,0,.01);stopGraph();
 }
 function playCue(name){if(!canPlay()||!sfxBus)return false;try{synthCue(context,sfxBus,name,trackSource);logSound(name);return true}catch(error){lastError=String(error?.message||error);safeChange();return false}}
 function schedulePoll(){if(sequence&&canPlay()&&!frameId)frameId=raf(pollScene)}
 function pollScene(){
  frameId=0;if(!sequence||!canPlay())return;
  let view;try{view=getStageState()}catch{view=null}
  if(view?.comparison==='before'){setComparisonBefore(true);return}
  if(view?.paused){schedulePoll();return}
  const elapsed=Number(view?.timing?.elapsed)||0,trajectory=view?.trajectory||{};
  if(sequence.type==='tasting'){
   const biteAt=sequence.biteAt??1750;if(!sequence.bite&&elapsed>=biteAt){sequence.bite=true;if(elapsed-biteAt<=250)playCue('spoon')}
   if(elapsed>=Number(trajectory.duration||3500)){sequence=null;return}
  }else{
   const biteAt=Math.max(0,Number(trajectory.anticipationEnd||3500)-160),impactAt=Number(trajectory.fallStart||8000)+2500;
   if(!sequence.bite&&elapsed>=biteAt){sequence.bite=true;if(elapsed-biteAt<=250)playCue('spoon')}
   const fallAt=Number(trajectory.fallStart||8000);
   if(!sequence.fall&&elapsed>=fallAt){sequence.fall=true;if(elapsed-fallAt<=250)playCue('fall')}
   if(!sequence.impact&&elapsed>=impactAt){sequence.impact=true;if(elapsed-impactAt<=250)playCue('impact')}
   if(elapsed>=Number(trajectory.duration||25500)){sequence=null;return}
  }
  schedulePoll();
 }
 function beginSequence(type,cause,view){
  stopMonitor();sequence={type,cause,bite:false,fall:false,impact:false,biteAt:type==='tasting'?1750:null};
  if(type==='cinematic')setMusicDucking(false);schedulePoll();
 }
 function setMusicDucking(value){ducked=!!value;if(musicBus&&context)setParam(musicBus.gain,ducked?MUSIC_DUCK_GAIN:MUSIC_BASE_GAIN,.12)}
 function handleStageEvent(event,view=null,causeHint='mixed'){
  if(disposed||!event)return;
  try{
   const phase=String(event.phase||''),cause=view?.cause||causeHint||'mixed';
   if(phase==='anticipation')beginSequence('cinematic',cause,view);
   else if(phase==='tasting')beginSequence('tasting',cause,view);
   if(phase==='reaction')playCue(['waterLow','waterHigh','salt','energy','gut','iron','mixed'].includes(cause)?cause:'mixed');
   if(phase==='ghost'){setMusicDucking(true);playCue('ghost')}
   if(phase==='retry1'||phase==='retry2'){setMusicDucking(true);playCue('retry')}
   if(phase==='resigned'){setMusicDucking(true);if(!sequence?.impact)playCue('spoon');sequence=null;stopMonitor()}
   if(phase==='reviving'){playCue('revive');sequence=null;stopMonitor()}
   if(phase==='idle'){sequence=null;stopMonitor();setMusicDucking(false)}
   if(event.type==='revived'){sequence=null;stopMonitor();setMusicDucking(false);playCue('revive')}
   if(event.type==='dead')setMusicDucking(true);
  }catch(error){lastError=String(error?.message||error);safeChange()}
 }
 async function activateFromGesture(){
  if(disposed)return false;
  if(!createGraph()){safeChange();return false}
  armed=true;muted=false;savePrefs();lastError='';setParam(master?.gain,volume*.74,.01);await updateRunState();safeChange();return true;
 }
 async function toggleFromGesture(){
  if(!armed)return activateFromGesture();
  muted=!muted;savePrefs();await updateRunState();safeChange();return true;
 }
 function setVolume(value){volume=clamp(Number(value)/100,0,1);savePrefs();if(master&&armed&&!muted)setParam(master.gain,volume*.74,.02);updateRunState();safeChange()}
 function setPaused(value){paused=!!value;updateRunState();safeChange()}
 function setComparisonBefore(value){const next=!!value;if(comparisonBefore===next)return;comparisonBefore=next;updateRunState();safeChange()}
 function onVisibility(){hidden=doc?.visibilityState==='hidden';updateRunState();safeChange()}
 function startCapture(){if(!armed||!context||context.state==='closed'||!limiter||typeof context.createMediaStreamDestination!=='function')return null;try{stopCapture();captureNode=context.createMediaStreamDestination();limiter.connect(captureNode);return captureNode.stream}catch(error){lastError=String(error?.message||error);captureNode=null;safeChange();return null}}
 function stopCapture(){if(!captureNode)return false;try{limiter?.disconnect(captureNode);for(const track of captureNode.stream?.getTracks?.()||[])track.stop()}catch{}captureNode=null;return true}
 async function runOfflineAudioCheck(){
  if(!OfflineContext)return{available:false,passed:null,reason:'OfflineAudioContext no está disponible en este entorno.'};
  const names=SFX_NAMES,results=[];const sampleRate=22050,duration=1.1;
  for(const name of names){
   try{
    const offline=new OfflineContext(1,Math.ceil(sampleRate*duration),sampleRate),bus=offline.createGain(),lim=offline.createDynamicsCompressor();bus.gain.value=.65;lim.threshold.value=-9;lim.knee.value=5;lim.ratio.value=12;lim.attack.value=.004;lim.release.value=.14;bus.connect(lim);lim.connect(offline.destination);synthCue(offline,bus,name);const rendered=await offline.startRendering(),data=rendered.getChannelData(0);let peak=0,sum=0,finite=true;for(const sample of data){if(!Number.isFinite(sample)){finite=false;break}const v=Math.abs(sample);peak=Math.max(peak,v);sum+=sample*sample}const rms=Math.sqrt(sum/data.length);results.push({name,finite,peak:Number(peak.toFixed(5)),rms:Number(rms.toFixed(6)),passed:finite&&peak>0&&peak<.98&&rms>0});
   }catch(error){results.push({name,passed:false,error:String(error?.message||error)})}
  }
  return{available:true,passed:results.length===names.length&&results.every(item=>item.passed),sampleRate,cues:results};
 }
 function getState(){return{available:!!Context,offlineAvailable:!!OfflineContext,initialized:!!context,armed,muted:armed?muted:true,volume:Number(volume.toFixed(2)),paused,hidden,comparisonBefore,musicPlaying:!!musicTimer&&canPlay(),activeSources:activeSources.size,captureActive:!!captureNode,lastSound,lastError,eventLog:soundLog.slice(-12)}}
 function dispose(){if(disposed)return;disposed=true;doc?.removeEventListener?.('visibilitychange',onVisibility);doc?.defaultView?.removeEventListener?.('pagehide',dispose);stopCapture();stopMusicTimer();stopMonitor();stopSources();try{context?.close()}catch{}context=null}
 doc?.addEventListener?.('visibilitychange',onVisibility);doc?.defaultView?.addEventListener?.('pagehide',dispose,{once:true});
 return{activateFromGesture,toggleFromGesture,setVolume,setPaused,setComparisonBefore,handleStageEvent,startCapture,stopCapture,runOfflineAudioCheck,getState,destroy:dispose};
}
