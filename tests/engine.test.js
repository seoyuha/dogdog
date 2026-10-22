import test from 'node:test';
import assert from 'node:assert/strict';
import {createBattle,spawn,tick,snapshot,setPlayers,TYPES} from '../server/engine.js';

test('모드별 10분 전투 및 기지 생성',()=>{
 for(const mode of ['solo','coop','pvp']){
  const b=createBattle(mode,2);assert.equal(b.remaining,600);assert.equal(b.teams.length,2);
  assert.equal(b.started,false);b.started=true;tick(b,0.1);assert.ok(b.remaining<600);
 }
});
test('코인 차감, 유닛 소환 및 잘못된 유닛 차단',()=>{
 const b=createBattle('solo',2);b.started=true;
 const gold=b.teams[0].gold;
 assert.equal(spawn(b,0,'army','student'),true);
 assert.equal(b.teams[0].gold,gold-TYPES.find(t=>t.id==='army').cost);
 assert.equal(spawn(b,0,'not-a-unit','student'),false);
 assert.equal(spawn(b,0,'scout','student'),false,'적 전용 유닛은 학생이 소환할 수 없음');
 assert.equal(spawn(b,0,'king','student'),false,'코인이 부족하면 소환 불가');
 assert.equal(spawn(b,2,'army','student'),false);
});
test('정지와 종료 상태에서 소환 및 진행 불가',()=>{
 const b=createBattle('coop',2);b.started=true;b.paused=true;
 assert.equal(spawn(b,0,'army','student'),false);
 const remaining=b.remaining;tick(b,.1);assert.equal(b.remaining,remaining);
 b.paused=false;b.finished=true;assert.equal(spawn(b,0,'army','student'),false);
});
test('스테이지별 적 출현과 보스 생성',()=>{
 const b=createBattle('solo',2);b.started=true;
 for(let wave=1;wave<=10;wave++){
  b.nextWave=0;tick(b,0.01);
  assert.equal(b.wave,wave);
 }
 assert.ok(b.events.some(e=>e.kind==='boss'));
 assert.ok(b.units.some(u=>u.enemyType==='golem'));
 assert.ok(b.units.some(u=>u.enemyType==='skeleton'));
});
test('팀원 수에 따른 AI 기지 체력 조절',()=>{
 const b=createBattle('coop',2);const before=b.teams[1].maxHp;
 setPlayers(b,5);assert.ok(b.teams[1].maxHp>before);
});
test('시간 종료시 승패 판정과 상태 스냅샷',()=>{
 const b=createBattle('pvp',2);b.started=true;b.remaining=.05;
 b.teams[1].hp=400;tick(b,.1);
 assert.equal(b.finished,true);assert.equal(b.winner,0);
 assert.equal(snapshot(b).finished,true);
});

test('댕댕이 능력: 치료·범위·카드 레벨',async()=>{
 const {DOG_IDS,LV_MULT}=await import('../server/engine.js');
 assert.equal(DOG_IDS.length,12);assert.ok(LV_MULT(5)>LV_MULT(1));
 const b=createBattle('solo',2);b.started=true;b.teams[0].gold=800;
 spawn(b,0,'army','s',1);spawn(b,0,'nurse','s',1);const army=b.units[0];army.hp=100;
 for(let i=0;i<30;i++)tick(b,.1);
 assert.ok(army.hp>100,'간호댕이가 군댕이를 치료');
 const b2=createBattle('solo',2);b2.started=true;b2.teams[0].gold=800;spawn(b2,0,'army','s',5);
 assert.ok(b2.units[0].maxHp>TYPES.find(t=>t.id==='army').hp,'레벨 5 카드는 체력이 더 높음');
});
