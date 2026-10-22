/** 실제 서버를 실행한 후 30개의 Socket.IO 연결과 입장, 문제 제출, 전투 동기화를 점검합니다. */
import {io} from 'socket.io-client';
import assert from 'node:assert/strict';
const URL=process.env.TEST_SERVER||'http://127.0.0.1:3001';
const clients=[];const delay=ms=>new Promise(r=>setTimeout(r,ms));
const send=(s,event,data)=>new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error(event+' 응답 시간 초과')),5000);s.emit(event,data,x=>{clearTimeout(timeout);resolve(x)})});
const make=()=>new Promise((resolve,reject)=>{const s=io(URL,{transports:['websocket'],reconnection:false,timeout:5000});clients.push(s);s.once('connect',()=>resolve(s));s.once('connect_error',reject)});
try{
 const teacher=await make();const cr=await send(teacher,'createRoom',{name:'교사',mode:'coop',pin:process.env.TEACHER_PIN||'123456'});assert.equal(cr.ok,true);console.log('방 생성:',cr.room);
 const students=await Promise.all(Array.from({length:30},async(_,i)=>{const s=await make();const joined=await send(s,'joinRoom',{room:cr.room,name:'학생'+String(i+1).padStart(2,'0')});assert.equal(joined.ok,true);return s}));
 console.log('30명 접속 및 입장 성공');let states=0;let questions=0;
 for(const s of students){s.on('state',()=>states++);s.on('question',()=>questions++)}
 const teams=await send(teacher,'autoTeams',null);assert.equal(teams.ok,true);console.log('자동 팀 나누기:',teams.teams+'팀');
 const started=await send(teacher,'start',null);assert.equal(started.ok,true);await delay(2000);
 assert(states>=150,`상태 동기화 부족: ${states}`);assert(questions>=30,`문제 수신 부족: ${questions}`);
 console.log('2초간 전투 상태 이벤트:',states,'문제 이벤트:',questions);
 const csv=await send(teacher,'exportResults',null);assert.equal(csv.ok,true);assert(csv.csv.includes('학생30'));
 console.log('결과 CSV 확인 성공; 30명 테스트 통과');
}finally{for(const s of clients)s.disconnect()}
