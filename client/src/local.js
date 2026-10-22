/* 🎮 혼자 연습(오프라인): 서버 없이 이 기기 안에서 전투를 돌려요.
   GitHub Pages·Netlify처럼 서버가 없는 주소나, 와이파이가 불안할 때도 혼자 연습은 할 수 있어요.
   전투 규칙은 서버와 같은 engine.js를 그대로 써요. */
import {createBattle,spawn,tick,snapshot,setPlayers} from '../../server/engine.js';
import BANK from './lesson10.json';

const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};

export function createLocalGame(name,fire){
 let b=null,timer=null,current=null,next=null;const solved=new Set();let correct=0,attempts=0;
 const lobby=()=>fire('lobby',{room:'연습',mode:'solo',started:true,paused:false,practice:true,local:true,
   players:[{id:'local',name,teacher:false,team:0,correct,attempts,offline:false}]});
 /* 서버와 같은 방식: 맞힌 개수에 따라 쉬움 → 보통 → 어려움 */
 function pick(){const rank=solved.size;const diff=rank<5?'쉬움':rank<12?'보통':'어려움';
  let pool=BANK.filter(q=>q.difficulty===diff&&!solved.has(q.id));if(!pool.length)pool=BANK.filter(q=>!solved.has(q.id));
  if(!pool.length){solved.clear();pool=BANK;}
  const q=pool[Math.floor(Math.random()*pool.length)];const order=shuffle([0,1,2,3]);
  return {...q,choices:order.map(i=>q.choices[i]),answer:order.indexOf(q.answer-1)+1};}
 function sendQ(){if(!b||b.finished)return;current=pick();const {answer,...pub}=current;fire('question',pub);}
 function start(){clearInterval(timer);clearTimeout(next);solved.clear();correct=0;attempts=0;
  b=createBattle('solo',2);setPlayers(b,1);b.started=true;b.teams[1].gold=9999;
  fire('joined',{room:'연습',id:'local',teacher:false,mode:'solo'});lobby();
  fire('matchReady',{side:0,matchId:'local'});fire('state',snapshot(b));sendQ();
  timer=setInterval(()=>{tick(b,.1);fire('state',snapshot(b));},100);}
 function stop(){clearInterval(timer);clearTimeout(next);b=null;}
 function emit(ev,data,cb){
  const ok=x=>typeof cb==='function'&&cb(x);
  if(ev==='spawn'){ok({ok:!!b&&spawn(b,0,data,'local')});return;}
  if(ev==='special'){
   if(!b||b.finished||b.teams[0].gold<250){ok({ok:false});return;}
   b.teams[0].gold-=250;b.events.push({seq:++b.eventSeq,kind:'special',side:0,x:680,y:230});
   for(const u of b.units)if(u.side===1)u.hp=Math.max(0,u.hp-100);b.teams[1].hp=Math.max(0,b.teams[1].hp-80);ok({ok:true});return;}
  if(ev==='answer'){
   if(!b||!current||b.finished){ok({ok:false});return;}
   const q=current;current=null;attempts++;const right=Number(data)===q.answer;
   if(right){correct++;solved.add(q.id);b.teams[0].gold=Math.min(800,b.teams[0].gold+q.reward);}
   ok({ok:true,right,correctAnswer:q.answer,reward:right?q.reward:0});lobby();
   next=setTimeout(sendQ,900);return;}
  if(ev==='soloRestart'||ev==='restartMine'){start();ok({ok:true});return;}
  if(ev==='leaveRoom'){stop();ok({ok:true});return;}
  ok({error:'혼자 연습에서는 쓸 수 없는 기능이에요.'});
 }
 return {start,stop,emit};
}
