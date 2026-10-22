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
 assert.equal(spawn(b,0,'scout','student'),true);
 assert.equal(b.teams[0].gold,gold-TYPES[0].cost);
 assert.equal(spawn(b,0,'not-a-unit','student'),false);
 assert.equal(spawn(b,0,'dragon','student'),false);
 assert.equal(spawn(b,2,'scout','student'),false);
});
test('정지와 종료 상태에서 소환 및 진행 불가',()=>{
 const b=createBattle('coop',2);b.started=true;b.paused=true;
 assert.equal(spawn(b,0,'scout','student'),false);
 const remaining=b.remaining;tick(b,.1);assert.equal(b.remaining,remaining);
 b.paused=false;b.finished=true;assert.equal(spawn(b,0,'scout','student'),false);
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
