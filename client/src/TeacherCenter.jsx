/* 👑 교사 관리실 (TEACHER CONTROL CENTER)
   - 위: 방 코드 · 참가 학생 · 진행 전장 · 평균 정답률 · 경과 시간
   - 왼쪽 메뉴: 전장 현황 / 학생 현황 / 팀 배정 / 게임 설정 / 문제 관리 / 결과 보기
   - 아래: 게임 시작 · 일시정지 · 대기실로 · 결과 CSV 다운로드 (+ 자동 배정 · 방 코드 복사 · 처음부터)
   - 전장마다 '관전하기'로 학생 전투 화면을 실시간으로 볼 수 있어요. */
import React,{useEffect,useState} from 'react';
import Battle from './Battle.jsx';
import * as PF from './profile.js';

const TEAM_COLOR=['#2f6fe0','#e03a3a','#8a3fd1','#27a33a','#f07a1a','#d9a514'];
const TEAM_DOG=['knight','ninja','archer','mage','army','angel'];
const MODE_NAME={solo:'개인전',coop:'5인 협동 팀전',pvp:'5:5 팀 대항전'};
const fmt=s=>{s=Math.max(0,Math.floor(s||0));return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`};
const rate=p=>p.attempts?Math.round(p.correct/p.attempts*100):0;
const TABS=[['battle','🎮','전장 현황'],['students','👥','학생 현황'],['teams','🔀','팀 배정'],['settings','⚙️','게임 설정'],['questions','📖','문제 관리'],['results','📊','결과 보기']];

function HpBar({ratio}){const r=Math.max(0,Math.min(1,ratio||0));return <div className={"tc-hp"+(r<.34?' low':r<.67?' mid':'')}><i style={{width:r*100+'%'}}/><b>HP {Math.round(r*100)}%</b></div>}
function TeamTag({team}){return <span className="tc-tag" style={{background:TEAM_COLOR[team%6]}}>{team+1}팀</span>}

export default function TeacherCenter({room,lobby,mode,members,overview,emit,error,setError,upload,fileRef,exportResults,exitRoom,watchState}){
 const [tab,setTab]=useState('battle'),[now,setNow]=useState(Date.now()),[watch,setWatch]=useState(null),[toast,setToast]=useState('');
 useEffect(()=>{const t=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(t)},[]);
 useEffect(()=>{if(!toast)return;const t=setTimeout(()=>setToast(''),2200);return()=>clearTimeout(t)},[toast]);
 useEffect(()=>{if(error)setToast(error)},[error]);
 const students=members.filter(p=>!p.teacher),started=!!lobby?.started,paused=!!lobby?.paused;
 const tot=students.reduce((a,p)=>[a[0]+p.correct,a[1]+p.attempts],[0,0]);
 const avg=tot[1]?Math.round(tot[0]/tot[1]*100):0;
 const ranking=[...students].sort((a,b)=>b.correct-a.correct||rate(b)-rate(a)||a.name.localeCompare(b.name));
 const live=(overview||[]).filter(o=>!o.finished).length;
 const elapsed=started&&lobby?.startedAt?(now-lobby.startedAt)/1000:0;
 const say=m=>{setError('');setToast(m)};
 const cb=okMsg=>d=>{if(d?.error)say(d.error);else if(okMsg)say(okMsg)};
 const copyCode=()=>{try{navigator.clipboard?.writeText(room);say('방 코드 '+room+'를 복사했어요')}catch(e){say('방 코드: '+room)}};
 const openWatch=id=>{setWatch(id);emit('watch',id)};
 const closeWatch=()=>{setWatch(null);emit('watch',null)};
 const autoTeams=()=>emit('autoTeams',null,d=>say(d?.error||`학생을 ${d.teams}팀으로 고르게 나눴어요`));
 const usedTeams=[...new Set(students.map(p=>p.team))].sort((a,b)=>a-b);

 /* 전장 카드 이름·팀 */
 const fieldInfo=o=>{if(mode==='solo')return {label:o.name||'학생',team:(students.find(s=>s.name===o.name)?.team)??0};
  const n=Number(String(o.id).slice(1))||0;if(mode==='pvp')return {label:`${n*2+1}팀 vs ${n*2+2}팀`,team:n*2,vs:true};return {label:`${n+1}팀`,team:n};};

 const battleTab=<div className="tc-fields">
  {!started?(students.length?(mode==='solo'?students:usedTeams.map(t=>({team:t,name:null}))).map((x,i)=>{const team=mode==='solo'?x.team:x.team;return <div className="tc-field wait" key={i}>
    <img className="tc-dog" src={'/card/'+TEAM_DOG[team%6]+'.png'} alt=""/>
    <div className="tc-fbody"><div className="tc-fhead">{mode==='solo'?<b className="tc-fname">{x.name}</b>:<TeamTag team={team}/>}<span className="tc-wave">대기 중</span></div>
    <small>{mode==='solo'?`${team+1}팀`:students.filter(s=>s.team===team).map(s=>s.name).join(', ')}</small></div></div>})
   :<div className="tc-empty"><img src="/tc/mascot.png" alt=""/><p>학생들이 방 코드 <b>{room}</b>로 들어오기를 기다리고 있어요…</p></div>)
  :(overview||[]).map(o=>{const f=fieldInfo(o);const r0=o.maxHp?o.hp[0]/o.maxHp[0]:1,r1=o.maxHp?o.hp[1]/o.maxHp[1]:1;return <div className={"tc-field"+(o.finished?' done':'')} key={o.id}>
    <img className="tc-dog" src={'/card/'+TEAM_DOG[f.team%6]+'.png'} alt=""/>
    <div className="tc-fbody"><div className="tc-fhead">{mode==='solo'?<b className="tc-fname">{f.label}</b>:f.vs?<span className="tc-vs"><TeamTag team={f.team}/>vs<TeamTag team={f.team+1}/></span>:<TeamTag team={f.team}/>}<span className="tc-wave">WAVE {o.wave||1}{o.round>1?` · ${o.round}판`:''}</span></div>
     {f.vs?<><HpBar ratio={r0}/><HpBar ratio={r1}/></>:<HpBar ratio={r0}/>}
     <small>⏱ {fmt(o.remaining)} {o.finished?'· ⏩ 곧 다음 전투':''}{mode!=='solo'&&o.members?.length?' · '+o.members.map(m=>m.name).join(', '):''}</small></div>
    <button className="tc-watch" onClick={()=>openWatch(o.id)}>▶<small>관전하기</small></button></div>})}
 </div>;

 const rankRows=list=><div className="tc-table"><div className="tc-tr th"><span>순위</span><span>학생 이름</span><span>팀</span><span>정답</span><span>정답률</span></div>
  {list.length?list.map((p,i)=><div className="tc-tr" key={p.id}><span className="tc-rank">{i<3?<img src={`/tc/medal${i+1}.png`} alt={i+1+'등'}/>:i+1}</span><span className="tc-name">{p.name}{p.offline?' 📴':''}</span><span><TeamTag team={p.team}/></span><span>{p.correct} / {p.attempts}</span><span>{p.attempts?<em className={rate(p)>=80?'g':rate(p)>=50?'y':'r'}>{rate(p)}%</em>:<em>-</em>}</span></div>)
  :<p className="tc-none">아직 학생이 없어요</p>}</div>;

 const content={battle:battleTab,
  students:<div className="tc-pad">{rankRows([...students].sort((a,b)=>a.team-b.team||a.name.localeCompare(b.name)))}</div>,
  teams:<div className="tc-pad">{mode==='solo'?<p className="tc-note">개인전은 팀이 없어요. 학생마다 각자 전투를 해요. <b>게임 설정</b>에서 팀전으로 바꾸면 팀을 나눌 수 있어요.</p>:<>
   <p className="tc-note">{mode==='pvp'?'대항전은 1팀 vs 2팀, 3팀 vs 4팀, 5팀 vs 6팀으로 싸워요.':'협동전은 같은 팀끼리 한 전장에서 함께 막아요.'} 팀당 최대 5명 · 학생 이름 옆에서 팀을 바꿀 수 있어요.</p>
   <div className="tc-teamgrid">{[0,1,2,3,4,5].map(t=><div className="tc-teamcol" key={t} style={{'--tc':TEAM_COLOR[t]}}><img src={`/tc/flag${t+1}.png`} alt={`${t+1}팀`}/><small>{students.filter(s=>s.team===t).length} / 5명</small>
    {students.filter(s=>s.team===t).map(s=><div className="tc-mem" key={s.id}><span>{s.name}</span><select value={s.team} disabled={started} onChange={e=>emit('setTeam',{id:s.id,team:Number(e.target.value)},cb())}>{[0,1,2,3,4,5].map(i=><option key={i} value={i}>{i+1}팀</option>)}</select></div>)}</div>)}</div>
   {started&&<p className="tc-note">게임 중에는 팀을 바꿀 수 없어요. 늦게 온 학생은 자리가 남은 팀에 자동으로 들어가요.</p>}</>}</div>,
  settings:<div className="tc-pad"><h4>게임 방식</h4><div className="tc-modes">{['solo','coop','pvp'].map(m=><button key={m} disabled={started} className={mode===m?'on':''} onClick={()=>emit('setMode',m,cb(MODE_NAME[m]+'(으)로 바꿨어요'))}><b>{{solo:'⚔️',coop:'🤝',pvp:'🏆'}[m]}</b>{MODE_NAME[m]}<small>{{solo:'학생마다 각자 전투',coop:'팀끼리 함께 방어',pvp:'두 팀이 서로 대결'}[m]}</small></button>)}</div>
   <h4>스테이지</h4><div className="tc-stages"><button className={(lobby?.stage??-1)<0?'on':''} onClick={()=>emit('setStage',-1,cb('스테이지: 자동'))}><span className="auto">AUTO</span><b>자동</b><small>웨이브마다 바뀜</small></button>
    {PF.STAGE_NAMES.map((n,i)=><button key={i} className={lobby?.stage===i?'on':''} onClick={()=>emit('setStage',i,cb(`스테이지 ${i+1} · ${n}`))}><img src={`/stage/s${i+1}.webp`} alt=""/><b>{i+1}. {n}</b></button>)}</div>
   {started&&<p className="tc-note">게임 방식은 <b>대기실로</b> 돌아간 뒤 바꿀 수 있어요. 스테이지는 다음 전투부터 적용돼요.</p>}</div>,
  questions:<div className="tc-pad"><div className="tc-qbox"><div className="tc-qcount"><b>{lobby?.bankSize??'-'}</b><small>문제</small></div><div><h4>문제 파일 올리기 (XLSX / CSV)</h4><p className="tc-note">첫 줄: <code>question, choice1, choice2, choice3, choice4, answer, difficulty</code> · 정답은 1~4 · 난이도는 쉬움/보통/어려움</p>
   <label className={"tc-btn blue"+(started?' dis':'')}>📂 파일 고르기<input type="file" ref={fileRef} accept=".xlsx,.xls,.csv" onChange={upload} disabled={started} hidden/></label>{started&&<p className="tc-note">문제는 게임 시작 전에만 바꿀 수 있어요.</p>}</div></div></div>,
  results:<div className="tc-pad">{rankRows(ranking)}<button className="tc-btn gold" onClick={exportResults}>⬇ 결과 CSV 다운로드</button></div>};

 return <main className="tcenter">
  <div className="tc-top"><img className="tc-mascot" src="/tc/mascot.png" alt=""/><img className="tc-logo" src="/ui2/logo.png" alt="댕댕대작전"/>
   <img className="tc-title" src="/tc/title.png" alt="교사 관리실 TEACHER CONTROL CENTER"/>
   <div className="tc-topbtns"><span className={"tc-modechip "+mode}>{MODE_NAME[mode]}</span><button className="tc-ico" title="전체화면" onClick={()=>{if(!document.fullscreenElement)document.documentElement.requestFullscreen?.();else document.exitFullscreen?.()}}><img src="/ui2/b_full.png" alt="전체화면"/></button><button className="tc-ico" title="방 닫고 처음 화면으로" onClick={exitRoom}><img src="/ui2/b_home.png" alt="끝내기"/></button></div></div>
  <div className="tc-stats">
   <div className="tc-stat"><span className="ic">🔑</span><div><small>방 코드 <i>(학생 접속용)</i></small><b className="code">{room}<button onClick={copyCode} title="복사">⧉</button></b></div></div>
   <div className="tc-stat"><span className="ic">👥</span><div><small>참가 학생</small><b>{students.length}명 <i>/ 30명</i></b></div></div>
   <div className="tc-stat"><span className="ic">⚔️</span><div><small>진행 전장</small><b>{started?live:0}개 <i>({started?(overview||[]).length:0} 전체)</i></b></div></div>
   <div className="tc-stat"><span className="ic">📊</span><div><small>평균 정답률</small><b>{avg}%</b></div></div>
   <div className="tc-stat"><span className="ic">⏳</span><div><small>경과 시간</small><b>{started?fmt(elapsed):'00:00'}{paused&&<i> ⏸</i>}</b></div></div>
  </div>
  <div className="tc-body">
   <nav className="tc-side">{TABS.map(([k,ic,n])=><button key={k} className={tab===k?'on':''} onClick={()=>setTab(k)}><span>{ic}</span>{n}</button>)}</nav>
   <section className="tc-main"><img className="tc-rib" src={tab==='battle'?'/tc/rib_battle.png':'/tc/rib_live.png'} alt=""/>{tab!=='battle'&&<h3 className="tc-ribtext">{TABS.find(t=>t[0]===tab)[2]}</h3>}<div className="tc-scroll">{content[tab]}</div></section>
   <section className="tc-rankbox"><img className="tc-rib" src="/tc/rib_rank.png" alt="영어 퀴즈 랭킹"/><div className="tc-scroll">{rankRows(ranking)}</div></section>
  </div>
  <div className="tc-bottom">
   <div className="tc-big">
    {!started?<button className="tc-btn green big" onClick={()=>emit('start',null,cb('⚔️ 전투 시작!'))}>▶ 게임 시작</button>
     :<button className="tc-btn green big" onClick={()=>{if(confirm('모든 전투를 처음부터 다시 시작할까요?'))emit('restartAll',null,cb('처음부터 다시 시작했어요'))}}>🔄 처음부터</button>}
    <button className="tc-btn blue big" disabled={!started} onClick={()=>emit('pause')}>{paused?'▶ 다시 진행':'❚❚ 일시정지'}</button>
    <button className="tc-btn purple big" disabled={!started} onClick={()=>{if(confirm('게임을 멈추고 대기실로 돌아갈까요?'))emit('reset')}}>⟳ 대기실로</button>
    <button className="tc-btn gold big" onClick={exportResults}>⬇ 결과 CSV 다운로드</button>
   </div>
   <div className="tc-small">
    {mode!=='solo'&&<button className="tc-btn orange" disabled={started} onClick={autoTeams}>🔀 자동 배정</button>}
    <button className="tc-btn blue" onClick={()=>setTab('teams')}>👥 수동 배정</button>
    <button className="tc-btn blue" onClick={copyCode}>⧉ 방 코드 복사</button>
    <button className="tc-btn blue" onClick={()=>setTab('settings')}>⚙️ 게임 설정</button>
   </div>
  </div>
  {toast&&<div className="tc-toast" onClick={()=>setToast('')}>{toast}</div>}
  {watch&&<div className="tc-watchovl" onClick={e=>{if(e.target===e.currentTarget)closeWatch()}}><div className="tc-watchbox">
   <div className="tc-watchhead"><b>👀 관전 중 · {(()=>{const o=(overview||[]).find(x=>x.id===watch);return o?fieldInfo(o).label:''})()}</b><button onClick={closeWatch}>✕ 닫기</button></div>
   <div className="tc-watcharena">{watchState?.id===watch?<Battle key={watch+'-'+(watchState.state?.round||1)} state={watchState.state} side={0}/>:<p>화면을 불러오는 중…</p>}</div>
  </div></div>}
 </main>;
}
