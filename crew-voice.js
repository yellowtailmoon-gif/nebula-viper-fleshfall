/* SHIRAYUKI: LAST LIGHT — cinematic crew voice-pack player, v10.6.
 * ONLY plays authored audio clips. Never uses browser TTS or artificial pitch changes.
 * For public GitHub Pages: host MP3/OGG files under voices/, and index them in
 * voices/manifest.json. For one-file offline builds: set window.SHIRA_VOICE_PACK
 * before this script with equivalent data:audio/*;base64 URLs.
 */
(()=>{'use strict';
const PREF='shirayuki_crew_voicepack_v106';
const CAST={
 captain:{name:'艦長 アキヤマ',direction:'年長の男性。落ち着いた重み、余裕のある間。決して大声で威圧しない。',line:'白雪、発艦を許可する。必ず帰ってこい。'},
 control:{name:'オペレーター ミナ',direction:'知的な成人女性。澄んだ声、聞き取りやすい滑舌、心配は少しだけ表に出る。',line:'こちらアステリオン。敵機の位置を送信します。'},
 engineer:{name:'整備長 ユイ',direction:'温かい成人女性。少しハスキーで親しみがあり、パイロットを気遣う。',line:'機体の状態は良好よ。無茶だけはしないで。'},
 tactics:{name:'戦術士官 ハヤセ',direction:'男性。歯切れよく端的で冷静、緊急時も叫びすぎない。',line:'敵影を確認。各機、迎撃態勢に移れ。'},
 wing1:{name:'僚機 フブキ',direction:'頼もしい成人男性。やや低めで明るい、経験豊かな先輩。',line:'こちらフブキ。白雪、前方は任せろ。'},
 wing2:{name:'僚機 カゲロウ',direction:'クールな成人女性。落ち着いた低めの声、冷静さの中に芯の強さ。',line:'こちらカゲロウ。右舷から援護します。'},
 wing3:{name:'僚機 ハヤテ',direction:'若い成人男性。軽快で機敏、自信はあるが甲高くしない。',line:'こちらハヤテ。敵の後ろを取った！'}
};
let enabled=true;
try{enabled=localStorage.getItem(PREF)!=='off'}catch(_){}
let active=null,playing=false,serial=0,latestError='';
let clips=new Map(),previews=new Map(),ready=false;
const get=id=>document.getElementById(id);
function norm(s){return String(s||'').normalize('NFKC').replace(/\s+/g,'').replace(/[!！?？、。．・,，\/／:：―ー〜~…「」『』（）()\[\]]/g,'').toLowerCase()}
function clipKey(role,line){return role+'\u0001'+norm(line)}
function safeAudioSource(src){
 if(typeof src!=='string'||!src||src.length>15000000)return null;
 if(src.startsWith('data:audio/'))return src;
 // Local assets only: no third-party calls, no embedded API keys.
 if(/^(?:https?:|\/\/|javascript:|blob:)/i.test(src))return null;
 if(!/^(?:\.\/)?voices\/[a-zA-Z0-9_/-]+\.(?:mp3|ogg|m4a|wav)(?:\?[a-zA-Z0-9=&._-]+)?$/.test(src))return null;
 return src;
}
function loadPack(pack){
 if(!pack||typeof pack!=='object')return false;
 const nextClips=new Map(),nextPreviews=new Map();
 const samples=pack.previews&&typeof pack.previews==='object'?pack.previews:{};
 for(const [role,src] of Object.entries(samples)){
  if(!CAST[role])continue;const path=safeAudioSource(src);if(path)nextPreviews.set(role,path);
 }
 for(const clip of Array.isArray(pack.clips)?pack.clips:[]){
  if(!clip||!CAST[clip.role]||typeof clip.text!=='string')continue;
  const path=safeAudioSource(clip.src);if(path)nextClips.set(clipKey(clip.role,clip.text),path);
 }
 clips=nextClips;previews=nextPreviews;ready=clips.size>0||previews.size>0;
 refresh();return ready;
}
function isSpeaking(){return playing}
function stop(){serial++;const a=active;active=null;playing=false;
 if(a){try{a.pause();a.removeAttribute('src');a.load()}catch(_){}}refresh();}
function playSource(src){
 if(!src||typeof Audio!=='function')return false;
 stop();const id=++serial;
 try{
  const a=new Audio();a.preload='auto';a.src=src;a.volume=.94;active=a;playing=true;
  a.onended=()=>{if(serial===id){active=null;playing=false;refresh()}};
  a.onerror=()=>{if(serial===id){active=null;playing=false;latestError='音声ファイルを再生できませんでした。';refresh()}};
  const p=a.play();if(p&&typeof p.catch==='function')p.catch(()=>{if(serial===id){active=null;playing=false;latestError='再生するには画面をタップしてください。';refresh()}});
  refresh();return true;
 }catch(_){active=null;playing=false;refresh();return false}
}
function speak(role,line,opts={}){
 if(!ready||(!enabled&&!opts.force)||!CAST[role]||!line)return false;
 const src=clips.get(clipKey(role,line));
 // Dynamic dialogue without an individually recorded clip stays subtitled.
 return src?playSource(src):false;
}
function preview(role){if(!CAST[role])return false;const src=previews.get(role)||clips.get(clipKey(role,CAST[role].line));return src?playSource(src):false}
function toggle(){if(!ready)return false;enabled=!enabled;
 try{localStorage.setItem(PREF,enabled?'on':'off')}catch(_){}
 if(!enabled)stop();refresh();return enabled}
function refresh(){
 const btn=get('voiceBtn'),status=get('voiceStatus'),tools=get('voiceTools');
 if(btn){btn.textContent=ready?(enabled?'CV ON':'CV OFF'):'CV --';btn.disabled=!ready;btn.title=ready?'収録済みキャラクターボイスのON/OFF':'音声キャストは制作待ち。棒読み音声は無効です。';btn.setAttribute('aria-pressed',String(ready&&enabled));}
 if(status)status.textContent=ready?`収録音声 ${clips.size}台詞 / 試聴 ${previews.size}役。${latestError}`:'7人の専用AI音声はまだ未収録です。機械読み上げは使いません。';
 if(tools){tools.querySelectorAll('[data-crew-preview]').forEach(b=>{const role=b.getAttribute('data-crew-preview');b.disabled=!previews.has(role)&&!clips.has(clipKey(role,CAST[role]?.line||''));b.title=b.disabled?'この役の音声は未収録です':'クリックしてキャラクターの声を試聴';})}
}
function activate(){refresh()}
function init(){
 get('voiceBtn')?.addEventListener('click',toggle);
 document.querySelectorAll('[data-crew-preview]').forEach(b=>b.addEventListener('click',()=>{if(!preview(b.getAttribute('data-crew-preview'))){latestError='この役の音声は未収録です。';refresh()}}));
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop()});window.addEventListener('pagehide',stop);
 refresh();
}
// Pages mode: no authentication, just static voice assets. One-file mode can
// provide window.SHIRA_VOICE_PACK with embedded data URLs.
if(window.SHIRA_VOICE_PACK){loadPack(window.SHIRA_VOICE_PACK)}
else if(typeof fetch==='function')fetch('./voices/manifest.json',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(data=>{if(data)loadPack(data)}).catch(()=>{});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.SHIRA_CREW_VOICE={speak,stop,activate,toggle,preview,refresh,isSpeaking,enabled:()=>enabled&&ready,roles:CAST,voiceCount:()=>clips.size,ready:()=>ready,loadPack};
})();