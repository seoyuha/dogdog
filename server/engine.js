/* 유닛 능력치 (값은 그대로, 비싼 유닛도 값어치를 하도록 조정 — 원래 값은 오른쪽 주석) */
export const TYPES=[
{id:'scout',name:'시바 견습병',cost:50,hp:105,atk:11,range:31,speed:25,rate:1.1,icon:'🐕'},      // 원래 atk 13
{id:'guard',name:'코기 방패병',cost:90,hp:330,atk:10,range:32,speed:16,rate:1.4,icon:'🛡️'},     // 원래 hp 280, atk 9
{id:'archer',name:'허스키 궁수',cost:120,hp:120,atk:26,range:145,speed:19,rate:1.5,icon:'🏹'},  // 원래 hp 95, atk 23, rate 1.7
{id:'mage',name:'푸들 마법사',cost:170,hp:150,atk:45,range:125,speed:16,rate:2.0,icon:'🔮'},    // 원래 hp 115, atk 39, rate 2.2
{id:'knight',name:'리트리버 기사',cost:210,hp:420,atk:36,range:38,speed:22,rate:1.2,icon:'⚔️'}, // 원래 hp 220, atk 33, rate 1.3
{id:'dragon',name:'늑대 용사',cost:320,hp:700,atk:70,range:95,speed:14,rate:2.0,icon:'🐉'}];    // 원래 hp 360, atk 61, rate 2.5
const ENEMY_STATS={slime:{hp:.85,atk:.8,speed:.85},goblin:{hp:1,atk:1.1,speed:1.1},spider:{hp:.9,atk:1.15,speed:1.3},shield:{hp:1.9,atk:.7,speed:.65},skeleton:{hp:1.2,atk:1.2,speed:1.2},darkmage:{hp:1.1,atk:1.45,speed:.8},golem:{hp:3.2,atk:1.7,speed:.55}};
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
 enemyAtk:.7, enemyHp:.75               // 적 종류(슬라임·고블린 등) 공격력·체력 전체 배율
};
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
/* 협동 팀전: 함께 싸우는 학생 수만큼 적 기지와 적을 튼튼하게 */
export function setPlayers(b,P){b.players=Math.max(1,P|0);if(b.mode!=='pvp'&&b.teams[1]){b.teams[1].hp=b.teams[1].maxHp=Math.round(AI.baseHp*(1+(b.players-1)*AI.basePerPlayer));}}
export function createBattle(mode,teams=1){const b=createRaw(mode,teams);if(mode!=='pvp'&&b.teams[1]){b.teams[1].hp=b.teams[1].maxHp=AI.baseHp;}return b}
function createRaw(mode,teams){return {mode,started:false,finished:false,paused:false,remaining:600,teams:Array.from({length:teams},(_,i)=>({id:i,hp:1600,maxHp:1600,gold:140,units:[],kills:0,correct:0,attempts:0})),units:[],nextWave:4,wave:0,winner:null,logs:[],events:[],eventSeq:0,lastUpdate:Date.now()}}
export function spawn(b,side,typeId,playerId='AI'){
const type=TYPES.find(t=>t.id===typeId);if(!type)return false;const team=b.teams[side];if(!team||b.finished||!b.started||b.paused)return false;
if(playerId!=='AI'){if(team.gold<type.cost)return false;team.gold-=type.cost;}
const x=side===0?90:870;
b.units.push({id:nextId++,side,owner:playerId,type:type.id,x,hp:type.hp,maxHp:type.hp,cd:0,boss:false});b.events.push({seq:++b.eventSeq,kind:'spawn',x,side,type:type.id});return true;
}
export function tick(b,dt){if(!b.started||b.finished||b.paused)return;dt=Math.max(0,Math.min(.25,Number.isFinite(dt)?dt:0));b.remaining=Math.max(0,b.remaining-dt);b.nextWave-=dt;
for(const t of b.teams)t.gold=Math.min(800,t.gold+dt*(b.mode!=='pvp'&&t.id===0?AI.passive:1.2));
if(b.nextWave<=0){b.wave++;b.events.push({seq:++b.eventSeq,kind:'wave',wave:b.wave});b.nextWave=Math.max(AI.minGap,AI.gap-b.wave*AI.gapStep);if(b.mode!=='pvp'){
/* 적(AI) 세기: 함께 싸우는 학생 수(b.players)에 맞춰 조절 */
const P=Math.max(1,b.players||1);const difficulty=Math.min(AI.maxDiff,1+b.wave*AI.diffStep)*(1+(P-1)*AI.hpPerPlayer);let count=Math.min(AI.maxCount,1+Math.floor(b.wave/AI.countEvery));for(let i=0;i<count;i++){let enemy=b.wave<=4?(i%2?'goblin':'slime'):b.wave<=8?(i%2?'shield':'spider'):(i%2?'darkmage':'skeleton');let id=({slime:'scout',goblin:'archer',spider:'archer',shield:'guard',skeleton:'scout',darkmage:'mage'})[enemy];spawn(b,1,id);let u=b.units.at(-1);if(u){u.enemyType=enemy;u.hp=Math.round(u.hp*difficulty*ENEMY_STATS[enemy].hp*AI.enemyHp);u.maxHp=u.hp;}
}
if(b.wave>=AI.bossFrom&&b.wave%5===0&&spawn(b,1,'dragon')){const boss=b.units.at(-1);boss.boss=true;boss.enemyType='golem';boss.hp=Math.round(boss.hp*AI.bossHp*(1+(Math.max(1,b.players||1)-1)*AI.hpPerPlayer));boss.maxHp=boss.hp;b.events.push({seq:++b.eventSeq,kind:'boss',x:boss.x,side:1,wave:b.wave});}
}}
for(const u of b.units){const type=TYPES.find(t=>t.id===u.type)||TYPES[0];const enemy=(u.enemyType&&b.mode!=='pvp')?ENEMY_STATS[u.enemyType]:null;const attack=type.atk*(enemy?(enemy.atk*AI.enemyAtk):1);const speed=type.speed*(enemy?.speed||1);u.cd-=dt;const enemies=b.units.filter(e=>e.side!==u.side&&e.hp>0);const dir=u.side===0?1:-1;const target=enemies.filter(e=>Math.abs(e.x-u.x)<=type.range).sort((a,c)=>Math.abs(a.x-u.x)-Math.abs(c.x-u.x))[0];const baseX=u.side===0?870:90;const enemyBase=b.teams[1-u.side];
if(target){if(u.cd<=0){target.hp-=attack;b.events.push({seq:++b.eventSeq,kind:'attack',unitId:u.id,x:u.x,y:255,toX:target.x,toY:255,side:u.side,type:u.type,enemyType:u.enemyType||null,targetId:target.id,damage:attack,boss:u.boss});u.cd=type.rate;}}
else if(Math.abs(baseX-u.x)<type.range+24){if(u.cd<=0&&enemyBase){enemyBase.hp=Math.max(0,enemyBase.hp-attack);b.events.push({seq:++b.eventSeq,kind:'baseHit',x:baseX,y:240,side:u.side,type:u.type,enemyType:u.enemyType||null,damage:attack});u.cd=type.rate;}}
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
export function snapshot(b){return {mode:b.mode,started:b.started,finished:b.finished,paused:b.paused,remaining:Math.ceil(b.remaining),teams:b.teams.map(t=>({...t,units:undefined})),units:b.units.map(u=>({...u})),wave:b.wave,winner:b.winner,events:b.events.slice(-30)}}
