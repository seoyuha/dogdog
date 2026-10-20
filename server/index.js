import express from 'express';import http from 'node:http';import {Server} from 'socket.io';import {createBattle,spawn,tick,snapshot,TYPES,setPlayers} from './engine.js';import {bank,parseQuestions,publicQuestion,selectQuestion,shuffled} from './questions.js';import path from 'node:path';import {fileURLToPath} from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const app=express();const server=http.createServer(app);const io=new Server(server,{cors:{origin:true}});const rooms=new Map();
app.use(express.json({limit:'4mb'}));app.get('/api/health',(req,res)=>res.json({ok:true,rooms:rooms.size}));app.get('/api/units',(req,res)=>res.json(TYPES));
app.use(express.static(path.join(ROOT,'dist')));
const code=()=>Math.random().toString(36).slice(2,8).toUpperCase();
function createRoom(socket,{name,mode='solo',teacher=false}){let id=code();while(rooms.has(id))id=code();const room={id,mode,host:socket.id,players:new Map(),matches:new Map(),started:false,paused:false,created:Date.now()};rooms.set(id,room);join(socket,room,{name:name||'교사',teacher:true});return id}
function join(socket,room,{name,teacher=false}){const nm=String(name||'학생').slice(0,16);const same=[...room.players.values()].find(p=>p.name===nm);
 if(same&&same.offline)return rejoin(socket,room,same);
 if(same)return {error:'같은 이름이 이미 있습니다. 이름 뒤에 번호를 붙여 주세요.'};
 if(room.players.size>=31)return {error:'최대 인원을 초과했습니다.'};if(room.started&&!room.players.has(socket.id))return {error:'이미 시작한 방입니다.'};const player={id:socket.id,name:String(name||'학생').slice(0,16),teacher,team:0,solved:new Set(),correct:0,attempts:0,current:null,answered:false,matchId:null};room.players.set(socket.id,player);socket.join(room.id);socket.data.room=room.id;socket.emit('joined',{room:room.id,id:socket.id,teacher,mode:room.mode});broadcastLobby(room);return {ok:true}}
/* 와이파이가 잠깐 끊기거나 태블릿 화면이 꺼졌다 켜져도 같은 이름으로 다시 들어오면 이어서 해요 */
function rejoin(socket,room,p){room.players.delete(p.id);for(const b of room.matches.values())for(const u of b.units)if(u.owner===p.id)u.owner=socket.id;if(room.host===p.id)room.host=socket.id;p.id=socket.id;p.offline=false;room.players.set(socket.id,p);socket.join(room.id);socket.data.room=room.id;socket.emit('joined',{room:room.id,id:socket.id,teacher:p.teacher,mode:room.mode});if(room.started&&p.matchId){socket.emit('matchReady',{side:room.mode==='pvp'?p.team%2:0,matchId:p.matchId});p.current=null;sendQuestion(socket,p);}broadcastLobby(room);return {ok:true,rejoined:true}}
function broadcastLobby(room){io.to(room.id).emit('lobby',{room:room.id,mode:room.mode,started:room.started,paused:room.paused,players:[...room.players.values()].map(p=>({id:p.id,name:p.name,teacher:p.teacher,team:p.team,correct:p.correct,attempts:p.attempts,offline:!!p.offline}))});}
function get(socket){const r=rooms.get(socket.data.room);return [r,r?.players.get(socket.id)];}
function sendQuestion(socket,p){if(p.teacher||!p.matchId)return;const r=rooms.get(socket.data.room);const q=shuffled(selectQuestion(p,r?.bank||bank));p.current=q;p.answered=false;socket.emit('question',publicQuestion(q));}
function matchOf(r,p){return r?.matches.get(p?.matchId)}
function start(r){const students=[...r.players.values()].filter(p=>!p.teacher);if(!students.length)return {error:'학생이 한 명 이상 들어와야 시작할 수 있습니다.'};
if(r.mode==='pvp'){const teams=new Set(students.map(p=>p.team));for(const t of teams){if(!teams.has(t%2?t-1:t+1))return {error:`${t+1}팀의 상대인 ${(t%2?t-1:t+1)+1}팀에 학생이 없습니다. 대항전은 1팀 vs 2팀, 3팀 vs 4팀, 5팀 vs 6팀이에요.`};}}
r.started=true;r.paused=false;r.matches.clear();
if(r.mode==='solo'){for(const p of students){const id=p.id;p.matchId=id;r.matches.set(id,createBattle('solo',2));}}
else if(r.mode==='coop'){for(const p of students){const id='T'+p.team;p.matchId=id;if(!r.matches.has(id))r.matches.set(id,createBattle('coop',2));}}
else {for(const p of students){const pair=Math.floor(p.team/2);const id='P'+pair;p.matchId=id;if(!r.matches.has(id))r.matches.set(id,createBattle('pvp',2));}}
for(const [id,b] of r.matches){setPlayers(b,students.filter(p=>p.matchId===id).length);b.started=true;if(b.mode!=='pvp')b.teams[1].gold=9999;}
for(const p of students){const s=io.sockets.sockets.get(p.id);if(s){s.emit('matchReady',{side:r.mode==='pvp'?p.team%2:0,matchId:p.matchId});sendQuestion(s,p);}}
broadcastLobby(r);return {ok:true};}
io.on('connection',socket=>{
socket.on('createRoom',(data,cb)=>{const id=createRoom(socket,data||{});cb?.({ok:true,room:id});});
socket.on('joinRoom',(data,cb)=>{const room=rooms.get(String(data?.room||'').toUpperCase());if(!room){cb?.({error:'방 코드를 찾을 수 없습니다.'});return;}cb?.(join(socket,room,data||{}));});
socket.on('setMode',(mode)=>{const [r,p]=get(socket);if(!r||!p?.teacher||r.started)return;if(['solo','coop','pvp'].includes(mode)){r.mode=mode;broadcastLobby(r)}});
socket.on('setTeam',(data)=>{const [r,p]=get(socket);if(!r||!p?.teacher||r.started)return;const target=r.players.get(data?.id);if(target&&!target.teacher){target.team=Math.max(0,Math.min(5,Number(data.team)||0));broadcastLobby(r)}});
socket.on('start',(_,cb)=>{const [r,p]=get(socket);if(!r||!p?.teacher||r.started)return;const res=start(r);if(typeof cb==='function')cb(res);});
socket.on('pause',()=>{const [r,p]=get(socket);if(!r||!p?.teacher||!r.started)return;r.paused=!r.paused;for(const b of r.matches.values())b.paused=r.paused;broadcastLobby(r)});
socket.on('reset',()=>{const [r,p]=get(socket);if(!r||!p?.teacher)return;for(const [id,q] of r.players)if(q.offline)r.players.delete(id);r.started=false;r.paused=false;r.matches.clear();for(const q of r.players.values()){q.solved.clear();q.correct=0;q.attempts=0;q.current=null;q.matchId=null;}broadcastLobby(r);});
socket.on('spawn',(typeId,cb)=>{const [r,p]=get(socket);const b=matchOf(r,p);if(!r||!p||p.teacher||!b){cb?.({ok:false});return;}const side=r.mode==='pvp'?p.team%2:0;const ok=spawn(b,side,typeId,p.id);cb?.({ok});});
socket.on('special',(_,cb)=>{const [r,p]=get(socket);const b=matchOf(r,p);if(!r||!p||p.teacher||!b||!b.started||b.finished||b.paused){cb?.({ok:false});return;}const side=r.mode==='pvp'?p.team%2:0;const team=b.teams[side];if(team.gold<250){cb?.({ok:false});return;}team.gold-=250;b.events.push({seq:++b.eventSeq,kind:'special',side,x:side===0?680:280,y:230});const enemySide=1-side;for(const u of b.units){if(u.side===enemySide)u.hp=Math.max(0,u.hp-100);}b.teams[enemySide].hp=Math.max(0,b.teams[enemySide].hp-80);cb?.({ok:true});});
socket.on('answer',(choice,cb)=>{const [r,p]=get(socket);const b=matchOf(r,p);if(!p||!b||!p.current||p.answered||b.finished||b.paused){cb?.({ok:false});return;}const q=p.current;p.answered=true;p.attempts++;const right=Number(choice)===q.answer;const side=r.mode==='pvp'?p.team%2:0;const t=b.teams[side];t.attempts++;if(right){p.correct++;t.correct++;p.solved.add(q.id);t.gold=Math.min(800,t.gold+q.reward);}cb?.({ok:true,right,correctAnswer:q.answer,reward:right?q.reward:0});p.current=null;setTimeout(()=>{const s=io.sockets.sockets.get(p.id);if(s&&r.started&&!b.finished)sendQuestion(s,p)},900);broadcastLobby(r);});
socket.on('uploadQuestions',(payload,cb)=>{const [r,p]=get(socket);if(!p?.teacher||r.started){cb?.({error:'교사가 게임 시작 전에 업로드해야 합니다.'});return;}try{const buffer=Buffer.from(payload,'base64');if(buffer.length>3e6)throw Error('3MB 이하 파일만 업로드할 수 있습니다.');const list=parseQuestions(buffer);r.bank=list;for(const q of r.players.values())q.solved.clear();cb?.({ok:true,count:list.length});}catch(e){cb?.({error:e.message})}});
socket.on('disconnect',()=>{const [r,p]=get(socket);if(!r||!p)return;
 /* 자리를 바로 지우지 않고 '연결 끊김'으로 남겨 둬요. 같은 이름으로 다시 들어오면 이어서 해요 */
 p.offline=true;p.current=null;broadcastLobby(r);
 const all=()=>[...r.players.values()];
 if(all().every(x=>x.offline))setTimeout(()=>{if(rooms.get(r.id)===r&&all().every(x=>x.offline))rooms.delete(r.id)},30*60*1000);
 /* 대기실에서 나간 학생은 1분 뒤 목록에서 빼요 */
 if(!r.started&&!p.teacher)setTimeout(()=>{if(p.offline&&!r.started&&r.players.get(p.id)===p){r.players.delete(p.id);broadcastLobby(r)}},60*1000);
 /* 교사가 1분 넘게 돌아오지 않을 때만 접속 중인 학생에게 관리 권한을 넘겨요 */
 if(p.teacher)setTimeout(()=>{if(!p.offline||all().some(x=>x.teacher&&!x.offline))return;const next=all().find(x=>!x.offline);if(!next)return;next.teacher=true;r.host=next.id;io.to(next.id).emit('promoted');broadcastLobby(r)},60*1000);
});
});
setInterval(()=>{for(const r of rooms.values()){if(!r.started)continue;for(const [id,b] of r.matches){tick(b,.1);const state=snapshot(b);for(const p of r.players.values())if(p.matchId===id)io.to(p.id).emit('state',state);}const summary=[...r.matches.entries()].map(([id,b])=>({id,name:[...r.players.values()].find(p=>p.matchId===id&&!p.teacher)?.name,mode:b.mode,remaining:Math.ceil(b.remaining),hp:b.teams.map(t=>Math.ceil(t.hp)),wave:b.wave,finished:b.finished}));for(const p of r.players.values())if(p.teacher)io.to(p.id).emit('overview',summary);}},100);
const port=Number(process.env.PORT)||3001;server.listen(port,'0.0.0.0',()=>console.log('DaengDaeng Battle server: http://localhost:'+port));
