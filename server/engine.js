/* ───────── 유닛 ─────────
   · enemyOnly: 적(AI)이 쓰는 기본 틀 (슬라임·고블린 등은 이 틀에 ENEMY_STATS 배율을 곱해요)
   · 나머지 12종: 학생이 카드덱에 넣어 소환하는 댕댕이 (카드 레벨 1~5: 레벨마다 체력·공격 +12%)
   role: 공격형 attack · 방어형 tank · 원거리 ranged · 지원형 support · 특수형 special
   skill: 공격 4번마다 1번 스킬(피해 1.8배 + 특수 효과) */
export const TYPES=[
{id:'scout',enemyOnly:1,cost:50,hp:105,atk:11,range:31,speed:25,rate:1.1},
{id:'guard',enemyOnly:1,cost:90,hp:330,atk:10,range:32,speed:16,rate:1.4},
{id:'archer_e',enemyOnly:1,cost:120,hp:120,atk:26,range:145,speed:19,rate:1.5},
{id:'mage_e',enemyOnly:1,cost:170,hp:150,atk:45,range:125,speed:16,rate:2.0},
{id:'knight_e',enemyOnly:1,cost:210,hp:420,atk:36,range:38,speed:22,rate:1.2},
{id:'dragon',enemyOnly:1,cost:320,hp:700,atk:70,range:95,speed:14,rate:2.0},
{id:'army',     name:'군댕이',   role:'tank',    cost:80, hp:430,atk:10,range:34, speed:15,rate:1.4,desc:'튼튼한 몸으로 앞에서 막아요. 스킬: 수류탄 폭발(주변 피해)',splashSkill:60},
{id:'ninja',    name:'닌자댕이', role:'attack',  cost:100,hp:150,atk:23,range:34, speed:36,rate:0.7,crit:.25,desc:'아주 빠르고, 4번에 1번 꼴로 치명타(2배)! 스킬: 수리검'},
{id:'archer',   name:'궁수댕이', role:'ranged',  cost:120,hp:120,atk:24,range:150,speed:19,rate:1.4,desc:'멀리서 화살을 쏴요. 스킬: 화살 3연발(3명 공격)',multiSkill:3},
{id:'detective',name:'탐정댕이', role:'special', cost:120,hp:170,atk:16,range:120,speed:19,rate:1.4,mark:5,desc:'맞힌 적의 약점을 찾아 5초 동안 받는 피해 +30%'},
{id:'nurse',    name:'간호댕이', role:'support', cost:130,hp:220,atk:8, range:110,speed:18,rate:1.6,heal:45,healMode:'single',desc:'가장 다친 친구 한 명을 치료해요(+45). 스킬: 사랑의 하트'},
{id:'chef',     name:'요리댕이', role:'support', cost:140,hp:270,atk:18,range:80, speed:18,rate:1.6,heal:14,healMode:'area',healAndHit:1,desc:'공격하면서 맛있는 음식으로 주변 친구를 조금씩 치료(+14)'},
{id:'surfer',   name:'서퍼댕이', role:'special', cost:150,hp:260,atk:25,range:60, speed:24,rate:1.5,knock:24,desc:'파도로 적을 뒤로 밀고 느리게 해요'},
{id:'angel',    name:'천사댕이', role:'support', cost:170,hp:210,atk:10,range:120,speed:17,rate:1.9,heal:24,healMode:'area',desc:'주변 친구 모두를 치료해요(+24). 스킬: 축복의 빛'},
{id:'mage',     name:'마법댕이', role:'ranged',  cost:190,hp:150,atk:38,range:130,speed:16,rate:2.1,splash:60,desc:'마법 구슬로 여러 적에게 피해(범위 공격)'},
{id:'knight',   name:'기사댕이', role:'tank',    cost:200,hp:470,atk:32,range:40, speed:20,rate:1.2,guard:.25,desc:'단단한 기사: 받는 피해 25% 감소. 스킬: 회전 베기'},
{id:'cannon',   name:'대포댕이', role:'ranged',  cost:240,hp:200,atk:58,range:175,speed:13,rate:2.8,splash:50,siege:1.6,desc:'아주 멀리 대포! 범위 공격, 기지에 1.6배 피해'},
{id:'king',     name:'왕댕이',   role:'attack',  cost:280,hp:540,atk:42,range:42, speed:18,rate:1.2,aura:.15,desc:'용감한 리더: 주변 친구 공격력 +15%. 스킬: 왕의 일격'},
];
export const DOG_IDS=TYPES.filter(t=>!t.enemyOnly).map(t=>t.id);
export const typeOf=id=>TYPES.find(t=>t.id===id);
export const LV_MULT=lv=>1+(Math.max(1,Math.min(5,lv|0||1))-1)*.12;
/* 스테이지(배경)는 웨이브 2개마다 바뀌어요: 1 초원 마을 → … → 10 신비한 섬 */
export const stageOf=w=>Math.min(9,Math.floor(Math.max(0,w-1)/2));
/* 스테이지를 고르면(b.stage 0~9) 그 스테이지의 배경·적으로 싸워요. 고르지 않으면 웨이브 2개마다 바뀌어요 */
export const stageNow=b=>Number.isInteger(b.stage)?b.stage:stageOf(b.wave);
/* 스테이지가 높을수록 적이 조금씩 강해져요 */
export const STAGE_HARD=st=>0.9+st*AI.stageStep;
/* 🛒 상점 아이템 효과 */
export const ITEMS={heal:{name:'체력 회복',price:300},power:{name:'공격력 강화',price:200},shield:{name:'방어력 강화',price:250},charge:{name:'스킬 충전',price:400}};
export function useItem(b,side,id){const t=b.teams[side];if(!t||!b.started||b.finished||!ITEMS[id])return false;
 if(id==='heal'){if(t.hp>=t.maxHp)return false;t.hp=Math.min(t.maxHp,t.hp+400);}
 else if(id==='power')t.powerT=30;
 else if(id==='shield')t.shieldT=30;
 else if(id==='charge')t.gold=Math.min(800,t.gold+250);
 b.events.push({seq:++b.eventSeq,kind:'item',item:id,side});return true;}
export const STAGE_ENEMIES=[['slime','goblin'],['slime','goblin','spider'],['goblin','spider'],['slime','skeleton'],['skeleton','spider'],['shield','skeleton'],['darkmage','skeleton'],['spider','bat'],['vampire','darkmage'],['vampire','bat']];
const ENEMY_STATS={vampire:{hp:1.1,atk:1.2,speed:1},bat:{hp:.7,atk:.9,speed:1.6},slime:{hp:.85,atk:.8,speed:.85},goblin:{hp:1,atk:1.1,speed:1.1},spider:{hp:.9,atk:1.15,speed:1.3},shield:{hp:1.9,atk:.7,speed:.65},skeleton:{hp:1.2,atk:1.2,speed:1.2},darkmage:{hp:1.1,atk:1.45,speed:.8},golem:{hp:3.2,atk:1.7,speed:.55}};
let nextId=1;
/* ───── 난이도 설정 (6학년이 적당히 이길 수 있게 조정) ─────
   더 쉽게: gap↑(웨이브 간격), bossHp↓, passive↑(저절로 쌓이는 코인), towerAtk↑(우리 기지 방어탑)
   더 어렵게: 반대로. 원래 게임 값: gap 13, minGap 5.5, gapStep .35, maxCount 5, countEvery 3, diffStep .06, maxDiff 1.9, bossHp 3, baseHp 1600, passive 1.2, towerAtk 0 */
export const AI={
 gap:30, minGap:18, gapStep:.2,          // 적 웨이브 간격(초): 처음 30초 → 점점 줄어 최소 18초
 maxCount:2, countEvery:6,               // 한 웨이브 적 수: 1마리, 6웨이브마다 +1 (최대 2)
 diffStep:.025, maxDiff:1.4,             // 웨이브마다 적 체력 +2.5% (최대 1.4배)
 bossFrom:5, bossHp:.6,                  // 5웨이브마다 보스 1마리 (늑대 용사 체력의 0.6배 × 웨이브 배율)
 baseHp:2400,                            // 적 기지 체력 (우리 기지 1600)
 passive:4.5,                            // 개인전·협동전: 우리 팀 코인 초당 +4.5 (원래 1.2)
 towerAtk:45, towerRange:190, towerRate:1.2, enemyTower:.5, // 기지 방어탑 (적 기지는 절반 세기)
 hpPerPlayer:.3, basePerPlayer:.9,       // 협동 팀전: 학생 1명 늘 때마다 적 체력 +30%, 적 기지 +90%
 enemyAtk:.9, enemyHp:1.05, stageStep:.07               // 적 종류(슬라임·고블린 등) 공격력·체력 전체 배율
};
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
/* 협동 팀전: 함께 싸우는 학생 수만큼 적 기지와 적을 튼튼하게 */
export function setPlayers(b,P){b.players=Math.max(1,P|0);if(b.mode!=='pvp'&&b.teams[1]){b.teams[1].hp=b.teams[1].maxHp=Math.round(AI.baseHp*(1+(b.players-1)*AI.basePerPlayer));}}
export function createBattle(mode,teams=1,opts={}){const b=createRaw(mode,teams);if(Number.isInteger(opts.stage)&&opts.stage>=0&&opts.stage<=9)b.stage=opts.stage;if(opts.bonusGold)b.teams[0].gold+=Math.max(0,Math.min(150,opts.bonusGold|0));if(mode!=='pvp'&&b.teams[1]){b.teams[1].hp=b.teams[1].maxHp=AI.baseHp;}return b}
function createRaw(mode,teams){return {mode,started:false,finished:false,paused:false,remaining:600,teams:Array.from({length:teams},(_,i)=>({id:i,hp:1600,maxHp:1600,gold:140,units:[],kills:0,correct:0,attempts:0})),units:[],nextWave:4,wave:0,winner:null,logs:[],events:[],eventSeq:0,lastUpdate:Date.now()}}
export function spawn(b,side,typeId,playerId='AI',lv=1){
const type=typeOf(typeId);if(!type)return false;if(playerId!=='AI'&&type.enemyOnly)return false;
const team=b.teams[side];if(!team||b.finished||!b.started||b.paused)return false;
if(playerId!=='AI'){if(team.gold<type.cost)return false;team.gold-=type.cost;}
const m=playerId==='AI'?1:LV_MULT(lv);const x=side===0?90:870;
b.units.push({id:nextId++,side,owner:playerId,type:type.id,lv:playerId==='AI'?1:Math.max(1,Math.min(5,lv|0||1)),m,x,hp:Math.round(type.hp*m),maxHp:Math.round(type.hp*m),cd:0,hits:0,boss:false});
b.events.push({seq:++b.eventSeq,kind:'spawn',x,side,type:type.id});return true;
}
export function tick(b,dt){if(!b.started||b.finished||b.paused)return;dt=Math.max(0,Math.min(.25,Number.isFinite(dt)?dt:0));b.remaining=Math.max(0,b.remaining-dt);b.nextWave-=dt;
for(const t of b.teams){t.gold=Math.min(800,t.gold+dt*(b.mode!=='pvp'&&t.id===0?AI.passive:1.2));if(t.powerT)t.powerT=Math.max(0,t.powerT-dt);if(t.shieldT)t.shieldT=Math.max(0,t.shieldT-dt);}
if(b.nextWave<=0){b.wave++;b.events.push({seq:++b.eventSeq,kind:'wave',wave:b.wave});b.nextWave=Math.max(AI.minGap,AI.gap-b.wave*AI.gapStep);if(b.mode!=='pvp'){
/* 적(AI) 세기: 함께 싸우는 학생 수(b.players)에 맞춰 조절 */
const P=Math.max(1,b.players||1);const difficulty=Math.min(AI.maxDiff,1+b.wave*AI.diffStep)*(1+(P-1)*AI.hpPerPlayer)*(Number.isInteger(b.stage)?STAGE_HARD(b.stage):1);let count=Math.min(AI.maxCount,1+Math.floor(b.wave/AI.countEvery));for(let i=0;i<count;i++){const pool=STAGE_ENEMIES[stageNow(b)];let enemy=pool[(i+b.wave)%pool.length];let id=({slime:'scout',goblin:'archer_e',spider:'archer_e',shield:'guard',skeleton:'scout',darkmage:'mage_e',vampire:'knight_e',bat:'scout'})[enemy];spawn(b,1,id);let u=b.units.at(-1);if(u){u.enemyType=enemy;u.hp=Math.round(u.hp*difficulty*ENEMY_STATS[enemy].hp*AI.enemyHp);u.maxHp=u.hp;}
}
if(b.wave>=AI.bossFrom&&b.wave%5===0&&spawn(b,1,'dragon')){const boss=b.units.at(-1);boss.boss=true;boss.enemyType='golem';boss.hp=Math.round(boss.hp*AI.bossHp*(1+(Math.max(1,b.players||1)-1)*AI.hpPerPlayer));boss.maxHp=boss.hp;b.events.push({seq:++b.eventSeq,kind:'boss',x:boss.x,side:1,wave:b.wave});}
}}
/* 왕댕이 오라: 주변 친구 공격력 +15% */
const kings=b.units.filter(u=>u.hp>0&&typeOf(u.type)?.aura);
const ev=o=>b.events.push({seq:++b.eventSeq,...o});
const hurt=(t,dmg)=>{const tt=typeOf(t.type);const g=(tt&&tt.guard)||0;const mk=t.markT>0?1.3:1;const d=dmg*mk*(1-g);t.hp-=d;return d;};
for(const u of b.units){if(u.hp<=0)continue;const type=typeOf(u.type)||TYPES[0];u.markT=Math.max(0,(u.markT||0)-dt);u.slowT=Math.max(0,(u.slowT||0)-dt);
 const enemy=(u.enemyType&&b.mode!=='pvp')?ENEMY_STATS[u.enemyType]:null;const myTeam=b.teams[u.side];
 const aura=kings.some(k=>k.side===u.side&&Math.abs(k.x-u.x)<=130)?1+typeOf(kings.find(k=>k.side===u.side&&Math.abs(k.x-u.x)<=130).type).aura:1;
 let attack=type.atk*(u.m||1)*(enemy?(enemy.atk*AI.enemyAtk*(Number.isInteger(b.stage)?Math.sqrt(STAGE_HARD(b.stage)):1)):1)*(myTeam&&myTeam.powerT>0?1.3:1)*aura;
 const speed=type.speed*(enemy?.speed||1)*(u.slowT>0?.5:1);u.cd-=dt;
 const dir=u.side===0?1:-1;const baseX=u.side===0?870:90;const enemyBase=b.teams[1-u.side];
 /* 지원형: 다친 친구가 있으면 먼저 치료 */
 if(type.heal&&u.cd<=0&&!type.healAndHit){const allies=b.units.filter(a=>a.side===u.side&&a.hp>0&&a.hp<a.maxHp&&Math.abs(a.x-u.x)<=type.range);
  if(allies.length){u.hits++;const sk=u.hits%4===0;const amt=type.heal*(u.m||1)*(sk?1.8:1);
   const tg=type.healMode==='single'?[allies.sort((p,q)=>p.hp/p.maxHp-q.hp/q.maxHp)[0]]:allies;
   for(const a of tg)a.hp=Math.min(a.maxHp,a.hp+amt);
   ev({kind:'heal',unitId:u.id,x:u.x,side:u.side,type:u.type,skill:sk,targets:tg.map(a=>a.id),amount:Math.round(amt)});u.cd=type.rate;continue;}}
 const enemies=b.units.filter(e=>e.side!==u.side&&e.hp>0);
 const inRange=enemies.filter(e=>Math.abs(e.x-u.x)<=type.range).sort((a,c)=>Math.abs(a.x-u.x)-Math.abs(c.x-u.x));const target=inRange[0];
 if(target){if(u.cd<=0){
   const isDog=!type.enemyOnly;if(isDog)u.hits++;const sk=isDog&&u.hits%4===0;
   let dmg=attack*(sk?1.8:1);let crit=false;if(type.crit&&Math.random()<type.crit){dmg*=2;crit=true;}
   const hitList=[target];
   if(sk&&type.multiSkill)hitList.push(...inRange.slice(1,type.multiSkill));
   let dealt=0;for(const t of hitList)dealt+=hurt(t,dmg);
   const rad=type.splash||(sk&&type.splashSkill)||0;
   if(rad)for(const e of enemies)if(!hitList.includes(e)&&Math.abs(e.x-target.x)<=rad)hurt(e,dmg*.6);
   if(type.mark)target.markT=type.mark;
   if(type.knock){target.x=clamp(target.x+dir*type.knock*(sk?2:1),50,910);target.slowT=sk?3:1.5;}
   if(type.healAndHit){const allies=b.units.filter(a=>a.side===u.side&&a.hp>0&&a.hp<a.maxHp&&Math.abs(a.x-u.x)<=120);for(const a of allies)a.hp=Math.min(a.maxHp,a.hp+type.heal*(u.m||1)*(sk?1.8:1));if(allies.length)ev({kind:'heal',unitId:u.id,x:u.x,side:u.side,type:u.type,skill:false,targets:allies.map(a=>a.id),amount:Math.round(type.heal*(u.m||1)),quiet:1});}
   ev({kind:'attack',unitId:u.id,x:u.x,y:255,toX:target.x,toY:255,side:u.side,type:u.type,enemyType:u.enemyType||null,targetId:target.id,damage:dmg,boss:u.boss,skill:sk,crit,targets:hitList.map(t=>t.id),splash:rad});
   u.cd=type.rate;}}
 else if(Math.abs(baseX-u.x)<type.range+24){if(u.cd<=0&&enemyBase){const isDog=!type.enemyOnly;if(isDog)u.hits++;const sk=isDog&&u.hits%4===0;const dmg=attack*(type.siege||1)*(sk?1.8:1);
   enemyBase.hp=Math.max(0,enemyBase.hp-dmg*(enemyBase.shieldT>0?.5:1));ev({kind:'baseHit',unitId:u.id,x:baseX,y:240,side:u.side,type:u.type,enemyType:u.enemyType||null,damage:dmg,skill:sk});u.cd=type.rate;}}
 else u.x=clamp(u.x+dir*speed*dt,50,910);
}
/* 기지 방어탑: 기지 가까이 온 적을 쏴요 (그림은 기존 화살 효과를 써요) */
if(!b.towerCd)b.towerCd=[0,0];
for(let s=0;s<2;s++){const team=b.teams[s];if(!team||team.hp<=0)continue;const atk=s===1&&b.mode!=='pvp'?AI.towerAtk*AI.enemyTower:AI.towerAtk;if(atk<=0)continue;b.towerCd[s]-=dt;if(b.towerCd[s]>0)continue;
 const tx=s===0?90:870;const tg=b.units.filter(e=>e.side!==s&&e.hp>0&&Math.abs(e.x-tx)<=AI.towerRange).sort((a,c)=>Math.abs(a.x-tx)-Math.abs(c.x-tx))[0];
 if(tg){tg.hp-=atk;b.towerCd[s]=AI.towerRate;b.events.push({seq:++b.eventSeq,kind:'attack',unitId:-1,x:tx,y:225,toX:tg.x,toY:255,side:s,type:'archer',damage:atk});}}
const alive=[];for(const u of b.units){if(u.hp>0)alive.push(u);else{const other=b.teams[1-u.side];if(other)other.kills++;b.events.push({seq:++b.eventSeq,kind:'ko',unitId:u.id,x:u.x,y:255,side:u.side,boss:u.boss});}}b.units=alive;
if(b.events.length>100)b.events=b.events.slice(-100);
if(b.teams.some(t=>t.hp<=0)||b.remaining<=0){b.finished=true;const a=b.teams[0],c=b.teams[1];const ra=a.hp/a.maxHp,rc=c.hp/c.maxHp;b.winner=Math.abs(ra-rc)<.001?null:(ra>rc?0:1);/* 시간이 끝나면 남은 체력 비율로 비교 (적 기지 체력이 더 커도 공평하게) */if(b.mode!=='pvp'&&a.hp>0&&c.hp<=0)b.winner=0;}
}
export function snapshot(b){return {mode:b.mode,started:b.started,finished:b.finished,paused:b.paused,remaining:Math.ceil(b.remaining),teams:b.teams.map(t=>({...t,units:undefined})),units:b.units.map(u=>({...u})),wave:b.wave,stage:stageNow(b),fixedStage:Number.isInteger(b.stage),winner:b.winner,events:b.events.slice(-30)}}
