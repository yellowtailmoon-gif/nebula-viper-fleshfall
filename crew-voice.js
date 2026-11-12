/* SHIRAYUKI: LAST LIGHT — crew radio voices, v10.5
   Uses ONLY the device's built-in Japanese speech voices. No fake 'radio' synthesis,
   remote server, data collection, or impersonation of an actor. */
(()=>{'use strict';
const synth=typeof window!=='undefined'&&window.speechSynthesis;
const Speech=typeof window!=='undefined'&&window.SpeechSynthesisUtterance;
const PREF='shirayuki_crew_voice_v105';
const ROLES={
 captain:{name:'艦長 アキヤマ',sex:'m',rate:.91,pitch:.94,preferred:['keita','otoya','ichiro','takumi'],line:'白雪、発艦を許可する。必ず帰ってこい。'},
 control:{name:'オペレーター ミナ',sex:'f',rate:1.02,pitch:1.02,preferred:['nanami','ayumi','haruka','kyoko'],line:'こちらアステリオン。敵機の位置を送信します。'},
 engineer:{name:'整備長 ユイ',sex:'f',rate:.94,pitch:.99,preferred:['kyoko','sayaka','mizuki','nanami'],line:'機体の状態は良好よ。無茶だけはしないで。'},
 tactics:{name:'戦術士官 ハヤセ',sex:'m',rate:1.04,pitch:.98,preferred:['keita','takumi','otoya','ichiro'],line:'敵影を確認。各機、迎撃態勢に移れ。'},
 wing1:{name:'僚機 フブキ',sex:'m',rate:1.02,pitch:.99,preferred:['takumi','keita','ichiro'],line:'こちらフブキ。白雪、前方は任せろ。'},
 wing2:{name:'僚機 カゲロウ',sex:'f',rate:.98,pitch:1.03,preferred:['haruka','ayumi','nanami'],line:'こちらカゲロウ。右舷から援護します。'},
 wing3:{name:'僚機 ハヤテ',sex:'m',rate:1.07,pitch:1.01,preferred:['keita','takumi','otoya'],line:'こちらハヤテ。敵の後ろを取った！'}
};
let enabled=true;
try{enabled=localStorage.getItem(PREF)!=='off'}catch(_){/* private mode */}
let active=false,serial=0,loaded=false,latestError='';
let currentRole=null;
const bad=/espeak|mbrola|flite|robot|compact|eloquence|festival/i;
const male=/keita|otoya|ichiro|takumi|daichi|naoki|hiroshi|daisuke|osamu|satoshi|\bmale\b|男性/i;
const female=/nanami|kyoko|haruka|ayumi|sayaka|mizuki|aoi|sakura|shiori|hikari|kaori|\bfemale\b|女性/i;
const natural=/natural|neural|enhanced|premium|online|高品質/i;
function japaneseVoices(){
 if(!synth||!Speech)return [];
 try{return synth.getVoices().filter(v=>/^ja(?:[-_]|$)/i.test(v.lang||'')&&!bad.test(v.name||''))}catch(_){return []}
}
function voiceSex(v){const n=v.name||'';return male.test(n)?'m':female.test(n)?'f':'?' }
function scoreVoice(v,role){
 const p=ROLES[role]||ROLES.control,n=(v.name||'').toLowerCase(),sex=voiceSex(v);
 if(sex!=='?'&&sex!==p.sex)return -1e5;
 let score=40;
 if(natural.test(n))score+=90;
 if(/google|microsoft|apple|siri/i.test(n))score+=22;
 if(/日本語|japanese/i.test(n))score+=8;
 if(v.localService===false&&natural.test(n))score+=6;
 if(sex===p.sex)score+=40;
 const i=p.preferred.findIndex(w=>n.includes(w));if(i>=0)score+=60-i*9;
 return score;
}
function pick(role){
 const vs=japaneseVoices();if(!vs.length)return null;
 return vs.slice().sort((a,b)=>scoreVoice(b,role)-scoreVoice(a,role))[0]||null;
}
function normalize(line){
 return String(line||'').replace(/SHIRAYUKI/gi,'白雪').replace(/FUBUKI[-–‐]?2/gi,'フブキ、ツー').replace(/KAGEROU[-–‐]?3/gi,'カゲロウ、スリー').replace(/HAYATE[-–‐]?4/gi,'ハヤテ、フォー').replace(/AEGIS/gi,'イージス').replace(/ASTERION/gi,'アステリオン').replace(/CVN[-‐–]?0?1/gi,'シーブイエヌ、ゼロワン').replace(/\s*\/\/\s*/g,'、').replace(/…+/g,'、').trim();
}
function refresh(){
 const vs=japaneseVoices(),btn=document.getElementById('voiceBtn'),status=document.getElementById('voiceStatus');
 loaded=loaded||vs.length>0;
 if(btn){btn.textContent=enabled?'CV ON':'CV OFF';btn.setAttribute('aria-pressed',String(enabled));btn.title='クルーの日本語キャラクターボイスを切替';}
 if(status){status.textContent=!synth||!Speech?'このブラウザは音声読み上げに対応していません。':vs.length?`日本語ボイス ${vs.length}種類を検出。役ごとに最適な声を選びます。${latestError}`:'日本語ボイスが未検出です。端末の日本語読み上げ音声を有効にしてください。';}
}
function stop(){serial++;active=false;currentRole=null;try{synth?.cancel()}catch(_){/* unsupported */}refresh()}
function isSpeaking(){return active}
function speak(role,line,options={}){
 if((!enabled&&!options.force)||!synth||!Speech||!line)return false;
 const v=pick(role);if(!v||scoreVoice(v,role)<0)return false; // never use a wrong-gender labelled voice
 stop();const id=++serial,profile=ROLES[role]||ROLES.control;
 try{
  const u=new Speech(normalize(line));u.voice=v;u.lang='ja-JP';
  u.rate=Math.min(1.10,Math.max(.88,profile.rate+(options.urgent?.02:0)));
  u.pitch=Math.min(1.07,Math.max(.92,profile.pitch));u.volume=.95;
  currentRole=role;active=true;
  u.onend=()=>{if(serial===id){active=false;currentRole=null;refresh()}};
  u.onerror=e=>{if(serial===id){active=false;currentRole=null;if(e.error&&e.error!=='canceled'&&e.error!=='interrupted'){latestError='音声を再生できない場合は端末の音声設定を確認してください。'}refresh()}};
  synth.speak(u);return true;
 }catch(_){active=false;currentRole=null;refresh();return false}
}
function activate(){// Called inside the first user gesture, to populate browsers' lazy voice lists.
 try{synth?.getVoices()}catch(_){/* unsupported */}
 refresh();
}
function toggle(){enabled=!enabled;try{localStorage.setItem(PREF,enabled?'on':'off')}catch(_){/* private mode */}
 if(!enabled)stop();refresh();return enabled}
function preview(role){if(!ROLES[role])return false;activate();
 // Preview is an explicit user action even if ordinary radio is switched off.
 return speak(role,ROLES[role].line,{force:true});
}
function init(){
 document.getElementById('voiceBtn')?.addEventListener('click',()=>{activate();toggle()});
 document.querySelectorAll('[data-crew-preview]').forEach(button=>button.addEventListener('click',()=>{
  if(!preview(button.getAttribute('data-crew-preview'))){latestError='この役に適した日本語音声がありません。';refresh()}
 }));
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop()});
 window.addEventListener('pagehide',stop);
 refresh();
}
if(synth){if(typeof synth.addEventListener==='function')synth.addEventListener('voiceschanged',refresh);else synth.onvoiceschanged=refresh;}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.SHIRA_CREW_VOICE={speak,stop,activate,toggle,preview,refresh,isSpeaking,enabled:()=>enabled,voices:()=>japaneseVoices().map(v=>({name:v.name,lang:v.lang})),roles:ROLES,currentRole:()=>currentRole};
})();