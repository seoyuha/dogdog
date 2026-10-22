import {randomBytes,timingSafeEqual} from 'node:crypto';
import express from 'express';import http from 'node:http';import {Server} from 'socket.io';import {createBattle,spawn,tick,snapshot,TYPES,setPlayers} from './engine.js';import {bank,parseQuestions,publicQuestion,selectQuestion,shuffled} from './questions.js';import path from 'node:path';import {fileURLToPath} from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const app=express();const server=http.createServer(app);const io=new Server(server,{cors:{origin:true}});const rooms=new Map();
app.use(express.json({limit:'4mb'}));app.get('/api/health',(req,res)=>res.json({ok:true,rooms:rooms.size,version:'17.0.0'}));app.get('/api/units',(req,res)=>res.json(TYPES));
app.get('/api/status',(req,res)=>res.json({version:'17.0.0',activeRooms:rooms.size,connectedSockets:io.engine.clientsCount,uptimeSeconds:Math.floor(process.uptime())}));
app.use(express.static(path.join(ROOT,'dist')));
const code=()=>Math.random().toString(36).slice(2,8).toUpperCase();
const token=()=>randomBytes(24).toString('hex');
const pinOk=(pin)=>{const expected=String(process.env.TEACHER_PIN||'').trim();if(!expected)return false;const a=Buffer.from(String(pin||''));const b=Buffer.from(expected);return a.length===b.length&&timingSafeEqual(a,b)};
function createRoom(socket,{name,mode='solo',pin}={}){
 if(!pinOk(pin))return {error:'교사 PIN이 올바르지 않습니다. 서버의 TEACHER_PIN 설정을 확인하세요.'};
 let id=code();while(rooms.has(id))id=code();
 const room={id,mode:['solo','coop','pvp'].includes(mode)?mode:'solo',host:socket.id,players:new Map(),matches:new Map(),started:false,paused:false,created:Date.now()};
 rooms.set(id,room);const result=join(socket,room,{name:name||'교사',teacher:true});
 return {...result,room:id};
}
function join(socket,room,{name,teacher=false,sessionToken}={}){
 const nm=String(name||'학생').trim().slice(0,16);
 if(!nm)return {error:'이름을 입력하세요.'};
 if(sessionToken){if(typeof sessionToken!=='string'||sessionToken.length!==48)return {error:'재접속 인증 정보 형식이 올바르지 않습니다.'};const existing=[...room.players.values()].find(p=>p.sessionToken===sessionToken);
  if(!existing){if(!room.started&&name)return join(socket,room,{name,teacher:false});return {error:'복구 정보가 올바르지 않습니다. 다른 이름으로 새로 참가하세요.',staleToken:true};}
  /* 와이파이가 끊기면 서버는 최대 수십 초 동안 '접속 중'으로 알고 있어요. 올바른 토큰이면 새 연결로 넘겨받고, 예전 연결은 끊어요. */
  if(!existing.offline&&existing.id!==socket.id){const old=io.sockets.sockets.get(existing.id);const res=rejoin(socket,room,existing);old?.disconnect(true);return res;}
  return rejoin(socket,room,existing);
 }
 if(room.started)return {error:'이미 시작한 방입니다. 기존 참가자는 복구 정보로 재접속하세요.'};
 if([...room.players.values()].some(p=>p.name===nm))return {error:'같은 이름이 이미 있습니다. 이름 뒤에 번호를 붙여 주세요.'};
 if(!teacher&&[...room.players.values()].filter(p=>!p.teacher).length>=30)return {error:'학생은 최대 30명입니다.'};
 const player={id:socket.id,name:nm,teacher,team:0,sessionToken:token(),solved:new Set(),correct:0,attempts:0,current:null,answered:false,matchId:null,offline:false};
 room.players.set(socket.id,player);socket.join(room.id);socket.data.room=room.id;
 socket.emit('joined',{room:room.id,id:socket.id,teacher,mode:room.mode,sessionToken:player.sessionToken});
 broadcastLobby(room);return {ok:true,room:room.id,sessionToken:player.sessionToken};
}
function rejoin(socket,room,p){
 room.players.delete(p.id);for(const b of room.matches.values())for(const u of b.units)if(u.owner===p.id)u.owner=socket.id;
 if(room.host===p.id)room.host=socket.id;
 p.id=socket.id;p.offline=false;room.players.set(socket.id,p);socket.join(room.id);socket.data.room=room.id;
 socket.emit('joined',{room:room.id,id:socket.id,teacher:p.teacher,mode:room.mode,sessionToken:p.sessionToken});
 if(room.started&&p.matchId){const b=room.matches.get(p.matchId);socket.emit('matchReady',{side:room.mode==='pvp'?p.team%2:0,matchId:p.matchId});if(b)socket.emit('state',snapshot(b));p.current=null;if(b&&!b.finished)sendQuestion(socket,p);}
 broadcastLobby(room);return {ok:true,rejoined:true,room:room.id,sessionToken:p.sessionToken};
}
function broadcastLobby(room){io.to(room.id).emit('lobby',{room:room.id,mode:room.mode,started:room.started,paused:room.paused,practice:!!room.practice,players:[...room.players.values()].map(p=>({id:p.id,name:p.name,teacher:p.teacher,team:p.team,correct:p.correct,attempts:p.attempts,offline:!!p.offline}))});}
function get(socket){const r=rooms.get(socket.data.room);return [r,r?.players.get(socket.id)];}
function sendQuestion(socket,p){if(p.teacher||!p.matchId)return;const r=rooms.get(socket.data.room);const q=shuffled(selectQuestion(p,r?.bank||bank));p.current=q;p.answered=false;socket.emit('question',publicQuestion(q));}
function matchOf(r,p){return r?.matches.get(p?.matchId)}
function start(r){const students=[...r.players.values()].filter(p=>!p.teacher);if(!students.length)return {error:'학생이 한 명 이상 들어와야 시작할 수 있습니다.'};
if(r.mode==='pvp'){const teams=new Set(students.map(p=>p.team));for(const t of teams){if(!teams.has(t%2?t-1:t+1))return {error:`${t+1}팀의 상대인 ${(t%2?t-1:t+1)+1}팀에 학생이 없습니다. 대항전은 1팀 vs 2팀, 3팀 vs 4팀, 5팀 vs 6팀이에요.`};}}
if(['coop','pvp'].includes(r.mode)&&[...new Set(students.map(p=>p.team))].some(team=>students.filter(p=>p.team===team).length>5))return {error:'팀별 최대 5명입니다.'};
r.started=true;r.paused=false;r.matches.clear();
if(r.mode==='solo'){for(const p of students){const id=p.id;p.matchId=id;r.matches.set(id,createBattle('solo',2));}}
else if(r.mode==='coop'){for(const p of students){const id='T'+p.team;p.matchId=id;if(!r.matches.has(id))r.matches.set(id,createBattle('coop',2));}}
else {for(const p of students){const pair=Math.floor(p.team/2);const id='P'+pair;p.matchId=id;if(!r.matches.has(id))r.matches.set(id,createBattle('pvp',2));}}
for(const [id,b] of r.matches){setPlayers(b,students.filter(p=>p.matchId===id).length);b.started=true;if(b.mode!=='pvp')b.teams[1].gold=9999;}
for(const p of students){const s=io.sockets.sockets.get(p.id);if(s){s.emit('matchReady',{side:r.mode==='pvp'?p.team%2:0,matchId:p.matchId});sendQuestion(s,p);}}
broadcastLobby(r);return {ok:true};}
io.on('connection',socket=>{
socket.on('createRoom',(data,cb)=>{cb?.(createRoom(socket,data||{}));});
socket.on('joinRoom',(data,cb)=>{const room=rooms.get(String(data?.room||'').toUpperCase());if(!room){cb?.({error:'방 코드를 찾을 수 없습니다.'});return;}cb?.(join(socket,room,data||{}));});
socket.on('setMode',(mode)=>{const [r,p]=get(socket);if(!r||!p?.teacher||r.started)return;if(['solo','coop','pvp'].includes(mode)){r.mode=mode;broadcastLobby(r)}});
socket.on('setTeam',(data)=>{const [r,p]=get(socket);if(!r||!p?.teacher||r.started)return;const target=r.players.get(data?.id);if(target&&!target.teacher){const newTeam=Math.max(0,Math.min(5,Number(data.team)||0));if(['coop','pvp'].includes(r.mode)&&[...r.players.values()].filter(q=>!q.teacher&&q!==target&&q.team===newTeam).length>=5){socket.emit('roomError','한 팀에는 최대 5명까지 배정할 수 있습니다.');return;}target.team=newTeam;broadcastLobby(r)}});
/* 🎮 혼자 연습(개인전): 교사 방 없이 학생 혼자 바로 시작해요 (교사 PIN 필요 없음, 교사 화면에는 안 보여요) */
socket.on('soloPlay',(data,cb)=>{const nm=String(data?.name||'').trim().slice(0,16);if(!nm){cb?.({error:'이름을 입력하세요.'});return;}
 const [old]=get(socket);if(old?.practice){rooms.delete(old.id);}
 let id=code();while(rooms.has(id))id=code();
 const room={id,mode:'solo',practice:true,host:null,players:new Map(),matches:new Map(),started:false,paused:false,created:Date.now()};rooms.set(id,room);
 const res=join(socket,room,{name:nm});if(res.error){rooms.delete(id);cb?.(res);return;}
 const st=start(room);cb?.({...res,...st});});
socket.on('soloRestart',(_,cb)=>{const [r,p]=get(socket);if(!r?.practice||!p){cb?.({error:'혼자 연습 중일 때만 할 수 있습니다.'});return;}
 r.started=false;p.solved.clear();p.correct=0;p.attempts=0;p.current=null;p.matchId=null;cb?.(start(r));});
socket.on('leaveRoom',(_,cb)=>{const [r,p]=get(socket);if(r&&p){r.players.delete(p.id);socket.leave(r.id);socket.data.room=null;if(r.practice||r.players.size===0)rooms.delete(r.id);else broadcastLobby(r);}cb?.({ok:true});});
/* 🔄 개인전: 학생이 자기 전투만 처음부터 */
socket.on('restartMine',(_,cb)=>{const [r,p]=get(socket);if(!r||!p||p.teacher||!r.started||r.mode!=='solo'||!p.matchId){cb?.({error:'개인전에서만 혼자 다시 시작할 수 있어요.'});return;}
 const b=createBattle('solo',2);setPlayers(b,1);b.started=true;b.teams[1].gold=9999;if(r.paused)b.paused=true;r.matches.set(p.matchId,b);p.current=null;
 socket.emit('matchReady',{side:0,matchId:p.matchId});sendQuestion(socket,p);cb?.({ok:true});});
/* 🔄 교사: 모든 전투를 처음부터 다시 */
socket.on('restartAll',(_,cb)=>{const [r,p]=get(socket);if(!r||!p?.teacher){cb?.({error:'교사만 할 수 있어요.'});return;}
 r.started=false;r.matches.clear();for(const q of r.players.values()){q.current=null;q.matchId=null;}cb?.(start(r));});
/* ⏹ 교사: 방 닫기 → 학생들도 처음 화면으로 */
socket.on('closeRoom',(_,cb)=>{const [r,p]=get(socket);if(!r||!p?.teacher){cb?.({error:'교사만 할 수 있어요.'});return;}
 io.to(r.id).except(socket.id).emit('roomClosed');for(const q of r.players.values()){const s=io.sockets.sockets.get(q.id);if(s){s.leave(r.id);s.data.room=null;}}rooms.delete(r.id);cb?.({ok:true});});
socket.on('autoTeams',(_,cb)=>{const [r,p]=get(socket);if(!r||!p?.teacher||r.started){cb?.({error:'대기실에서 교사만 할 수 있습니다.'});return;}
 const students=[...r.players.values()].filter(x=>!x.teacher);let n=Math.max(1,Math.min(6,Math.ceil(students.length/5)));if(r.mode==='pvp'){n=Math.max(2,n%2?n+1:n);n=Math.min(6,n);}
 /* 섞어서 팀마다 고르게 (최대 5명) */
 const order=students.sort(()=>Math.random()-.5);order.forEach((x,i)=>{x.team=i%n});broadcastLobby(r);cb?.({ok:true,teams:n});});
socket.on('start',(_,cb)=>{const [r,p]=get(socket);if(!r||!p?.teacher||r.started)return;const res=start(r);if(typeof cb==='function')cb(res);});
socket.on('pause',()=>{const [r,p]=get(socket);if(!r||!p?.teacher||!r.started)return;r.paused=!r.paused;for(const b of r.matches.values())b.paused=r.paused;broadcastLobby(r)});
socket.on('reset',()=>{const [r,p]=get(socket);if(!r||!p?.teacher)return;for(const [id,q] of r.players)if(q.offline)r.players.delete(id);r.started=false;r.paused=false;r.matches.clear();for(const q of r.players.values()){q.solved.clear();q.correct=0;q.attempts=0;q.current=null;q.matchId=null;}broadcastLobby(r);});
socket.on('spawn',(typeId,cb)=>{const [r,p]=get(socket);const b=matchOf(r,p);if(!r||!p||p.teacher||!b||r.paused){cb?.({ok:false});return;}const side=r.mode==='pvp'?p.team%2:0;const ok=spawn(b,side,typeId,p.id);cb?.({ok});});
socket.on('special',(_,cb)=>{const [r,p]=get(socket);const b=matchOf(r,p);if(!r||!p||p.teacher||!b||!b.started||b.finished||b.paused){cb?.({ok:false});return;}const side=r.mode==='pvp'?p.team%2:0;const team=b.teams[side];if(team.gold<250){cb?.({ok:false});return;}team.gold-=250;b.events.push({seq:++b.eventSeq,kind:'special',side,x:side===0?680:280,y:230});const enemySide=1-side;for(const u of b.units){if(u.side===enemySide)u.hp=Math.max(0,u.hp-100);}b.teams[enemySide].hp=Math.max(0,b.teams[enemySide].hp-80);cb?.({ok:true});});
socket.on('answer',(choice,cb)=>{const [r,p]=get(socket);const b=matchOf(r,p);if(!p||!b||!p.current||p.answered||!b.started||b.finished||b.paused){cb?.({ok:false});return;}const q=p.current;p.answered=true;p.attempts++;const right=Number(choice)===q.answer;const side=r.mode==='pvp'?p.team%2:0;const t=b.teams[side];t.attempts++;if(right){p.correct++;t.correct++;p.solved.add(q.id);t.gold=Math.min(800,t.gold+q.reward);}cb?.({ok:true,right,correctAnswer:q.answer,reward:right?q.reward:0});p.current=null;setTimeout(()=>{const s=io.sockets.sockets.get(p.id);if(s&&r.started&&p.matchId&&r.matches.get(p.matchId)===b&&!b.finished)sendQuestion(s,p)},900);broadcastLobby(r);});
socket.on('exportResults',(_,cb)=>{const [r,p]=get(socket);if(!r||!p?.teacher){cb?.({error:'교사만 다운로드할 수 있습니다.'});return;}const students=[...r.players.values()].filter(x=>!x.teacher);const rows=[['이름','팀','정답수','시도수','정답률(%)','연결상태','게임모드'],...students.map(x=>[x.name,x.team+1,x.correct,x.attempts,x.attempts?Math.round(x.correct/x.attempts*100):0,x.offline?'끊김':'접속',r.mode])];const escape=v=>'"'+String(v).replaceAll('"','""')+'"';cb?.({ok:true,csv:'\ufeff'+rows.map(row=>row.map(escape).join(',')).join('\r\n')});});
socket.on('uploadQuestions',(payload,cb)=>{const [r,p]=get(socket);if(!p?.teacher||r.started){cb?.({error:'교사가 게임 시작 전에 업로드해야 합니다.'});return;}try{const buffer=Buffer.from(payload,'base64');if(buffer.length>3e6)throw Error('3MB 이하 파일만 업로드할 수 있습니다.');const list=parseQuestions(buffer);r.bank=list;for(const q of r.players.values())q.solved.clear();cb?.({ok:true,count:list.length});}catch(e){cb?.({error:e.message})}});
socket.on('disconnect',()=>{const [r,p]=get(socket);if(!r||!p)return;
 /* 자리를 바로 지우지 않고 '연결 끊김'으로 남겨 둬요. 같은 이름으로 다시 들어오면 이어서 해요 */
 p.offline=true;p.current=null;broadcastLobby(r);
 const all=()=>[...r.players.values()];
 if(all().every(x=>x.offline))setTimeout(()=>{if(rooms.get(r.id)===r&&all().every(x=>x.offline))rooms.delete(r.id)},30*60*1000);
 /* 대기실에서 나간 학생은 1분 뒤 목록에서 빼요 */
 if(!r.started&&!p.teacher)setTimeout(()=>{if(p.offline&&!r.started&&r.players.get(p.id)===p){r.players.delete(p.id);broadcastLobby(r)}},60*1000);
 /* 보안: 교사가 접속을 잃더라도 학생에게 관리 권한을 자동으로 부여하지 않습니다. */
});
});
setInterval(()=>{for(const r of rooms.values()){if(!r.started)continue;for(const [id,b] of r.matches){tick(b,.1);const state=snapshot(b);for(const p of r.players.values())if(p.matchId===id)io.to(p.id).emit('state',state);}const summary=[...r.matches.entries()].map(([id,b])=>({id,name:[...r.players.values()].find(p=>p.matchId===id&&!p.teacher)?.name,mode:b.mode,remaining:Math.ceil(b.remaining),hp:b.teams.map(t=>Math.ceil(t.hp)),wave:b.wave,finished:b.finished}));for(const p of r.players.values())if(p.teacher)io.to(p.id).emit('overview',summary);}},100);
const port=Number(process.env.PORT)||3001;server.listen(port,'0.0.0.0',()=>console.log('DaengDaeng Battle server: http://localhost:'+port));
