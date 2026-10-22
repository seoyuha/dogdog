import React,{useEffect,useRef} from 'react';
import Phaser from 'phaser';
/* ───────── 18단계: 새 디자인 전투 화면 ─────────
   · 배경: 스테이지 10곳 (웨이브 2개마다 바뀜) — /stage/s1~s10.webp
   · 적 9종 + 늑대 용사: 프레임 애니메이션 시트(대기·걷기·공격·피격·쓰러짐) — /sheets/*.png
   · 우리 편 댕댕이 12종: 포즈 7장(대기·걷기·달리기·공격·스킬·피격·쓰러짐) + 캐릭터별 효과 — /sheets2/dogs, fx
   화면 좌표는 960×250 (그림은 1.5배로 그려서 또렷하게) */
const W=960,H=250,GROUND=214;
export const STAGE_NAMES=['초원 마을','숲속 길','맛있는 음식점 거리','해변','사막 유적지','눈 덮인 마을','화산 지대','동굴','성과 마을','신비한 섬'];
export const stageOf=w=>Math.min(9,Math.floor(Math.max(0,w-1)/2));
const SHEETS=['golem','spider','slime','skeleton','goblin','darkmage','vampire','bat','wolf'];
const FRAMES={idle:[0,7],walk:[8,15],attack:[16,24],hurt:[25,28],die:[29,35]};
const BROKEN_ATTACK=new Set(['wolf','vampire','bat']);       // 이 캐릭터들은 공격 프레임 대신 몸동작으로 공격
/* 🐶 우리 편 댕댕이 12종: 포즈 그림(대기·걷기·달리기·공격·스킬·피격·쓰러짐)을 이어 붙여 움직여요 */
const DOGS=['king','chef','archer','angel','knight','detective','army','mage','cannon','ninja','nurse','surfer'];
const DOG_H={king:80,chef:72,archer:70,angel:72,knight:76,detective:70,army:72,mage:76,cannon:74,ninja:68,nurse:70,surfer:70};
/* 화면에 보이는 키(좌표 단위) */
const SIZE={scout:66,guard:64,archer:70,mage:72,knight:78,wolf:88,slime:66,goblin:80,spider:72,shield:80,skeleton:72,darkmage:82,vampire:82,bat:70,golem:118};
const RANGED=new Set(['archer','mage','darkmage','goblin','spider','bat']);
const COLOR={scout:0xffd476,guard:0x80c9ef,archer:0x8ed3a3,mage:0xc3a2f2,knight:0xffa47f,dragon:0xf5cc61};
const ease=t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
export default function Battle({state,side=0}){
 const mount=useRef(null),scene=useRef(null),sideRef=useRef(side);sideRef.current=side;
 useEffect(()=>{if(!mount.current)return;
 class Arena extends Phaser.Scene{
  constructor(){super('DogArena');this.actors=new Map();this.lastWave=0;this.lastEvent=0;this.eventHistoryReady=false;this.lastFinished=false;this.destroyedBases=new Set();this.stageIndex=-1;}
  preload(){
   for(let i=1;i<=10;i++)this.load.image('stage'+i,'/stage/s'+i+'.webp');
   for(const id of SHEETS)this.load.spritesheet('sh_'+id,'/sheets/'+id+'.png',{frameWidth:116,frameHeight:192});
   this.load.atlas('dogs','/sheets2/dogs.png','/sheets2/dogs.json');
   this.load.atlas('fx','/sheets2/fx.png','/sheets2/fx.json');
  }
  create(){
   this.cameras.main.setZoom(1.5).centerOn(W/2,H/2);
   for(const id of SHEETS)for(const [m,[a,b]] of Object.entries(FRAMES))
    this.anims.create({key:id+'_'+m,frames:this.anims.generateFrameNumbers('sh_'+id,{start:a,end:b}),frameRate:m==='idle'?7:m==='walk'?10:m==='attack'?15:10,repeat:(m==='idle'||m==='walk')?-1:0});
   this.stageBg=this.add.image(W/2,H/2,'stage1').setDisplaySize(W,H).setDepth(-50);
   /* 스테이지 이름판 (그림 속 이름표 자리를 덮어요) */
   this.plate=this.add.graphics().setDepth(5);
   this.plate.fillStyle(0xfff1d0,1).fillRoundedRect(5,5,268,40,10).lineStyle(3,0x5b3a1e,1).strokeRoundedRect(5,5,268,40,10);
   this.plateText=this.add.text(139,25,'',{fontSize:'17px',fontStyle:'bold',color:'#3a2412',fontFamily:'Noto Sans KR, sans-serif'}).setOrigin(.5).setDepth(6);
   /* 기지 체력 막대 */
   this.bases=[0,1].map(s=>{const x=s?872:80;
    const bg=this.add.rectangle(x,76,110,13,0x1d2433,.85).setStrokeStyle(2,0xffffff,.9).setDepth(7);
    const bar=this.add.rectangle(x-53,76,106,9,s?0xff5a5a:0x5ee06a).setOrigin(0,.5).setDepth(8);
    const label=this.add.text(x,62,'',{fontSize:'12px',fontStyle:'bold',color:'#ffffff',stroke:'#1d2433',strokeThickness:4}).setOrigin(.5).setDepth(8);
    return {bg,bar,label,x};});
   this.waveText=this.add.text(W/2,18,'',{fontSize:'14px',fontStyle:'bold',color:'#ffffff',stroke:'#1f2d45',strokeThickness:4}).setOrigin(.5).setDepth(900);
   this.announcement=this.add.text(W/2,92,'',{fontSize:'28px',fontStyle:'bold',color:'#fff2a8',stroke:'#27364f',strokeThickness:7}).setOrigin(.5).setDepth(910);
   this.resultShade=this.add.rectangle(W/2,H/2,W,H,0x101b35,0).setDepth(920);
   this.banner=this.add.text(W/2,H/2-6,'',{fontSize:'46px',fontStyle:'bold',color:'#fff',stroke:'#34405b',strokeThickness:9}).setOrigin(.5).setDepth(931);
   this.resultSubtitle=this.add.text(W/2,H/2+38,'',{fontSize:'15px',fontStyle:'bold',color:'#ffffff',stroke:'#17233d',strokeThickness:4}).setOrigin(.5).setDepth(932);
   scene.current=this;
  }
  hit(x,y,color=0xffd36c){const c=this.add.circle(x,y,7,color,.9).setDepth(500);this.tweens.add({targets:c,scale:3,alpha:0,duration:220,onComplete:()=>c.destroy()});for(let i=0;i<4;i++){const d=this.add.circle(x,y,2.5,color).setDepth(500);const a=i*Math.PI/2+Math.random()*.4;this.tweens.add({targets:d,x:x+Math.cos(a)*20,y:y+Math.sin(a)*20,alpha:0,duration:260,onComplete:()=>d.destroy()})}}
  projectile(x,y,toX,toY,color=0xffd15a,kind='archer'){
   const magic=kind==='mage'||kind==='dragon'||kind==='darkmage';
   const ball=this.add.circle(x,y,magic?9:5,color,1).setDepth(600).setStrokeStyle(2,0xffffff,.9);
   const trail=this.add.circle(x,y,magic?15:8,color,.24).setDepth(590);
   this.tweens.add({targets:[ball,trail],x:toX,y:toY,duration:magic?320:200,ease:'Sine.easeIn',onComplete:()=>{this.hit(toX,toY,color);ball.destroy();trail.destroy()}});
  }
  floatingText(x,y,msg,color='#fff6a3'){const t=this.add.text(x,y,msg,{fontSize:'15px',fontStyle:'bold',color,stroke:'#26374b',strokeThickness:4}).setOrigin(.5).setDepth(800);this.tweens.add({targets:t,y:y-28,alpha:0,duration:650,onComplete:()=>t.destroy()});}
  enemyAttackFx(e){
   const k=e.enemyType,x=e.x,y=GROUND-34,tx=e.toX,ty=GROUND-30;
   const shot=(obj,dur,col)=>this.tweens.add({targets:obj,x:tx,y:ty,angle:200,duration:dur,ease:'Sine.easeIn',onComplete:()=>{obj.destroy();this.hit(tx,ty,col)}});
   if(k==='slime')shot(this.add.ellipse(x,y,15,12,0x7de85e).setStrokeStyle(2,0xc5ff8c).setDepth(650),360,0x8ff36e);
   else if(k==='goblin')shot(this.add.circle(x,y,5,0x9c7659).setStrokeStyle(2,0xf1d9a8).setDepth(650),280,0xc2a47c);
   else if(k==='spider')shot(this.add.triangle(x,y,0,-9,-4,6,4,6,0xc87dff).setDepth(650),300,0xb879ff);
   else if(k==='darkmage'||k==='bat'||k==='vampire')shot(this.add.circle(x,y,8,k==='darkmage'?0xb74dff:0xd8204a).setStrokeStyle(2,0xffc5ff).setDepth(650),380,k==='darkmage'?0xce6bff:0xff4d6d);
   else if(k==='skeleton')shot(this.add.text(x,y,'🦴',{fontSize:'20px'}).setOrigin(.5).setDepth(650),300,0xf1e6d4);
   else if(k==='golem'){const r=this.add.circle(x,y,16,0x663b42).setStrokeStyle(4,0xff7355).setDepth(650);this.tweens.add({targets:r,x:tx,y:ty,scale:.7,duration:420,onComplete:()=>{r.destroy();this.hit(tx,ty,0xff5f3c);this.cameras.main.shake(180,.004)}})}
   else this.hit(tx,ty,0xffd36c);
  }
  eventFx(e){
   const color=COLOR[e.type]||0xffd66c;
   if(e.kind==='attack'){
    const a=this.actors.get(e.unitId);if(a){a.motion=e.skill?'skill':'attack';a.motionStart=this.time.now;if(a.sheet&&!BROKEN_ATTACK.has(a.id))a.img.play(a.id+'_attack',true);}
    if(a&&a.dog){this.dogFx(e,a);if(e.crit)this.floatingText(e.toX,GROUND-88,'CRITICAL!','#ff5a5a');if(e.damage>=30)this.floatingText(e.toX,GROUND-70,'-'+Math.round(e.damage),'#ffeeb3');return;}
    if(e.unitId===-1){this.projectile(e.x,GROUND-60,e.toX,GROUND-30,0xffe28a,'archer');}
    else if(e.enemyType)this.enemyAttackFx(e);
    else if(['archer','mage','dragon'].includes(e.type))this.projectile(e.x,GROUND-34,e.toX,GROUND-30,color,e.type);
    else this.hit(e.toX,GROUND-30,color);
    if(e.damage>=30)this.floatingText(e.toX,GROUND-70,'-'+Math.round(e.damage),'#ffeeb3');
   }else if(e.kind==='heal'){this.healFx(e);
   }else if(e.kind==='baseHit'){
    {const a=this.actors.get(e.unitId);if(a&&a.dog){a.motion=e.skill?'skill':'attack';a.motionStart=this.time.now;this.dogFx({...e,toX:e.x,targets:[]},a);}}
    if(e.enemyType)this.enemyAttackFx({...e,toX:e.x});
    this.hit(e.x,GROUND-45,0xffad7a);this.cameras.main.shake(60,.0014);this.floatingText(e.x,GROUND-95,'-'+Math.round(e.damage),'#ff9f92');
   }else if(e.kind==='special'){
    this.flashAnnouncement('⚡ 발사 OK!! ⚡',0xffef8e);this.cameras.main.flash(260,255,242,157);this.cameras.main.shake(280,.004);
    for(let i=0;i<9;i++){const x=110+i*90;const bolt=this.add.text(x,40+(i%3)*24,'⚡',{fontSize:'34px'}).setDepth(800).setOrigin(.5);this.tweens.add({targets:bolt,y:GROUND-20,alpha:0,duration:420+i*20,onComplete:()=>bolt.destroy()})}
   }else if(e.kind==='item'){
    const x=e.side?872:80;const msg={heal:'❤️ 체력 회복!',power:'💪 공격력 UP!',shield:'🛡️ 방어력 UP!',charge:'⚡ 코인 충전!'}[e.item]||'';
    this.flashAnnouncement(msg,0xfff1a8);const ring=this.add.circle(x,GROUND-50,20,e.item==='heal'?0x5ee06a:e.item==='shield'?0x5db2ff:0xffd54a,.5).setDepth(700);
    this.tweens.add({targets:ring,scale:4,alpha:0,duration:600,onComplete:()=>ring.destroy()});
   }else if(e.kind==='boss'){this.flashAnnouncement('⚠ BOSS WAVE '+e.wave+' ⚠',0xffa6a2);this.cameras.main.shake(240,.003)}
   else if(e.kind==='wave'&&e.wave>1){this.flashAnnouncement('WAVE '+e.wave,0xfff0b0)}
  }
  /* ───── 효과 그림 도우미 ───── */
  fxImg(name,x,y,o={}){const im=this.add.image(x,y,'fx',name).setDepth(o.depth||650).setScale(o.scale||.5).setFlipX(!!o.flip);if(o.angle)im.setAngle(o.angle);if(o.alpha!=null)im.setAlpha(o.alpha);return im;}
  burst(name,x,y,{scale=.6,to=1.2,dur=420,flip=false,angle=0,spin=0}={}){const im=this.fxImg(name,x,y,{scale,flip,angle});this.tweens.add({targets:im,scale:to,alpha:0,angle:angle+spin,duration:dur,ease:'Quad.Out',onComplete:()=>im.destroy()});return im;}
  shoot(name,x,y,tx,ty,{scale=.45,dur=300,spin=0,arc=0,flip=false,onHit}={}){const im=this.fxImg(name,x,y,{scale,flip});const o={t:0};
   this.tweens.add({targets:o,t:1,duration:dur,ease:'Sine.In',onUpdate:()=>{im.x=x+(tx-x)*o.t;im.y=y+(ty-y)*o.t-arc*Math.sin(o.t*Math.PI);if(spin)im.angle+=spin;},onComplete:()=>{im.destroy();onHit&&onHit();}});}
  arrow(x,y,tx,ty,color=0xfff1c1,dur=200,onHit){const g=this.add.container(x,y).setDepth(650);g.add([this.add.rectangle(0,0,22,2.5,0x8b5a2b),this.add.triangle(12,0,0,-4,7,0,0,4,color),this.add.rectangle(-11,0,5,5,0xffffff,.8)]);if(tx<x)g.setScale(-1,1);
   this.tweens.add({targets:g,x:tx,y:ty,duration:dur,onComplete:()=>{g.destroy();onHit&&onHit()}});}
  textPop(x,y,msg,color='#fff'){const t=this.add.text(x,y,msg,{fontSize:'14px',fontStyle:'bold',color,stroke:'#1f2d45',strokeThickness:4}).setOrigin(.5).setDepth(820);this.tweens.add({targets:t,y:y-22,alpha:0,duration:800,ease:'Quad.Out',onComplete:()=>t.destroy()});}
  posOf(id){const a=this.actors.get(id);return a?{x:a.container.x,y:GROUND-a.h*.5,h:a.h}:null;}
  /* ───── 댕댕이별 공격·스킬 효과 ───── */
  dogFx(e,a){
   const d=a.dir,x=a.container.x+d*a.h*.35,y=GROUND-a.h*.5,tx=e.toX,ty=GROUND-30,sk=!!e.skill,flip=d<0,id=a.id;
   if(sk){this.textPop(a.container.x,GROUND-a.h-24,{king:'왕의 일격!',chef:'요리 폭탄!',archer:'화살 3연발!',angel:'축복의 빛!',knight:'회전 베기!',detective:'약점 발견!',army:'수류탄!',mage:'마법 폭발!',cannon:'거대 포탄!',ninja:'그림자 수리검!',nurse:'사랑의 하트!',surfer:'거대 파도!'}[id]||'스킬!','#ffe36b');}
   const tgts=(e.targets||[]).map(i=>this.posOf(i)).filter(Boolean);
   switch(id){
    case 'king':
     if(sk){for(let i=0;i<3;i++)this.time.delayedCall(i*90,()=>this.burst('slash_gold',tx-d*10+d*i*14,ty-6,{scale:.7,to:1.6,flip,angle:-20+i*20}));this.cameras.main.flash(120,255,230,140);this.cameras.main.shake(140,.003);}
     else this.burst('slash_gold',tx,ty,{scale:.5,to:.9,flip});break;
    case 'knight':
     if(sk){const im=this.fxImg('crescent_blue',a.container.x,y,{scale:.8,flip});this.tweens.add({targets:im,angle:flip?-360:360,scale:1.5,alpha:0,duration:520,onComplete:()=>im.destroy()});this.burst('crescent_ice',tx,ty,{scale:.6,to:1.3,flip});}
     else this.burst('crescent_blue',tx,ty,{scale:.45,to:.9,flip});break;
    case 'army':
     if(sk){this.shoot('smoke',x,y,tx,ty,{scale:.25,dur:420,arc:40,spin:12,onHit:()=>{this.burst('explosion',tx,ty-6,{scale:.5,to:1.5,dur:500});this.burst('dirt',tx,GROUND-8,{scale:.5,to:1,dur:600});this.cameras.main.shake(160,.003);}});}
     else this.burst('dirt',tx,GROUND-10,{scale:.3,to:.6,dur:300});break;
    case 'ninja':
     {const n=sk?3:1;for(let i=0;i<n;i++)this.time.delayedCall(i*80,()=>this.shoot('slash_dark',x,y-4+i*6,tx,ty+(i-1)*6,{scale:sk?.45:.3,dur:220,spin:28,onHit:()=>this.burst('slash_dark',tx,ty,{scale:.3,to:.7,dur:200,flip})}));}break;
    case 'archer':
     {const list=sk&&tgts.length?tgts:[{x:tx,y:ty}];list.forEach((t,i)=>this.time.delayedCall(i*70,()=>this.arrow(x,y-4,t.x,t.y,sk?0xffb340:0xfff1c1,sk?240:200,()=>{if(sk)this.burst('fireball',t.x,t.y,{scale:.4,to:.8,dur:300,flip});else this.hit(t.x,t.y,0xfff1c1);})));}break;
    case 'mage':
     this.shoot('cloud',x,y-6,tx,ty,{scale:sk?.35:.22,dur:320,spin:6,onHit:()=>{const r=this.add.circle(tx,ty,10,0xb05cff,.45).setStrokeStyle(3,0xe7c8ff).setDepth(640);this.tweens.add({targets:r,scale:(e.splash||50)/10*(sk?1.4:1),alpha:0,duration:420,onComplete:()=>r.destroy()});this.hit(tx,ty,0xc78bff);}});
     break;
    case 'cannon':
     this.shoot('smoke',x+d*10,y-8,tx,ty,{scale:sk?.32:.22,dur:sk?520:420,arc:sk?70:45,onHit:()=>{this.burst('explosion',tx,ty-6,{scale:sk?.7:.45,to:sk?1.9:1.2,dur:520});this.burst('smoke',tx,ty-16,{scale:.4,to:1,dur:700});this.cameras.main.shake(sk?220:90,sk?.005:.002);}});
     this.burst('cloud',x,y-8,{scale:.25,to:.5,dur:300});break;
    case 'chef':
     this.shoot(sk?'pan_food':'food',x,y-6,tx,ty,{scale:sk?.6:.4,dur:360,arc:30,spin:sk?0:14,onHit:()=>{this.burst(sk?'fireball':'food',tx,ty,{scale:.4,to:sk?1.2:.7,dur:320,flip});}});break;
    case 'surfer':
     {const w=this.fxImg(sk?'water':'crescent_ice',x,GROUND-24,{scale:sk?.7:.45,flip});this.tweens.add({targets:w,x:tx+d*20,scale:sk?1.2:.7,alpha:.2,duration:sk?480:320,onComplete:()=>{w.destroy();this.burst('water',tx,GROUND-20,{scale:.4,to:.9,dur:300,flip})}});}break;
    case 'detective':
     this.shoot('star',x,y-6,tx,ty,{scale:.25,dur:260,spin:20,onHit:()=>{this.burst('star',tx,ty-20,{scale:.3,to:.8,dur:400});this.textPop(tx,GROUND-a.h-10,sk?'🔍 약점 2배!':'🔍 약점','#d8b4fe');}});break;
    case 'angel': case 'nurse':
     this.shoot(id==='nurse'?'heart':'star',x,y-6,tx,ty,{scale:.25,dur:260,spin:id==='angel'?18:0,onHit:()=>this.hit(tx,ty,id==='nurse'?0xff8fc7:0xfff3a0)});break;
    default:this.hit(tx,ty,0xffd66c);
   }
  }
  /* 치료 효과 */
  healFx(e){const a=this.actors.get(e.unitId);if(a&&!e.quiet){a.motion=e.skill?'skill':'attack';a.motionStart=this.time.now;}
   const kind=e.type==='nurse'?'heart':'star';
   if(e.type==='angel'&&a&&!e.quiet){const pillar=this.add.rectangle(a.container.x,GROUND-60,26,120,0xfff4b0,.0).setDepth(600);this.tweens.add({targets:pillar,fillAlpha:.45,scaleX:e.skill?3:1.6,duration:220,yoyo:true,onComplete:()=>pillar.destroy()});}
   if(e.skill&&a)this.burst(kind,a.container.x,GROUND-a.h-10,{scale:.4,to:1.1,dur:600});
   for(const id of e.targets||[]){const p=this.posOf(id);if(!p)continue;
    for(let i=0;i<(e.quiet?1:2);i++){const im=this.fxImg(e.type==='chef'?'food':kind,p.x+(i?10:-8),p.y,{scale:.2,depth:700});this.tweens.add({targets:im,y:p.y-26-i*6,alpha:0,duration:700+i*120,onComplete:()=>im.destroy()});}
    if(!e.quiet)this.textPop(p.x,p.y-p.h*.5,'+'+e.amount,'#7dff8a');}
  }
  flashAnnouncement(m,color){this.announcement.setText(m).setColor('#'+color.toString(16).padStart(6,'0')).setAlpha(1).setScale(.65);this.tweens.add({targets:this.announcement,scale:1.1,alpha:0,duration:1150,ease:'Back.Out'});}
  /* 캐릭터 만들기 */
  makeActor(u,data){
   const enemy=u.side===1&&data.mode!=='pvp';
   let id=enemy?(u.boss?'golem':(u.enemyType||'slime')):u.type;
   if(id==='shield')id='goblin';
   if(id==='dragon')id='wolf';
   const dog=DOGS.includes(id)&&!enemy;
   const sheet=!dog&&SHEETS.includes(id);
   const dir=u.side===0?1:-1;
   const h=u.boss?118:dog?DOG_H[id]:(SIZE[id]||70);
   const lane=((u.id%3)-1)*6;  // 같은 자리에 겹치지 않게 앞뒤 줄을 살짝 나눠요
   const container=this.add.container(u.x,GROUND+lane);
   const shadow=this.add.ellipse(0,1,h*.6,h*.11,0x1c2433,.3);
   const glow=u.boss?this.add.ellipse(0,-h*.42,h*.95,h*.95,0xff5566,.16):null;
   const rig=this.add.container(0,0);
   let img;
   if(dog){img=this.add.image(0,2,'dogs',id+'_idle').setOrigin(.5,1);const f=this.textures.getFrame('dogs',id+'_idle');img.setScale(h/f.height);img.setFlipX(dir===-1);}  // 댕댕이 그림은 오른쪽을 봐요
   else if(sheet){img=this.add.sprite(0,6,'sh_'+id,0).setOrigin(.5,1);img.setScale(h/150);img.play(id+'_idle');img.setFlipX(dir===-1);} // 시트 그림은 오른쪽을 봐요
   else{img=this.add.image(0,0,'hd_'+id).setOrigin(.5,1);img.setScale(h/img.height);img.setFlipX(dir===1);}          // 강아지 일러스트는 왼쪽을 봐요
   if(u.enemyType==='shield')img.setTint(0xd8e4ff);
   rig.add(img);
   const barW=Math.max(38,Math.min(70,h*.6));
   const hpBg=this.add.rectangle(0,-h-6,barW+2,6,0x26334a,.9);
   const hp=this.add.rectangle(-barW/2,-h-6,barW,4,u.side===1?0xff6f86:0x4bda9b).setOrigin(0,.5);
   container.add([shadow,...(glow?[glow]:[]),rig,hpBg,hp]);
   container.setDepth(20+Math.round(u.x));container.setAlpha(0);container.setScale(.7);
   this.tweens.add({targets:container,alpha:1,scale:1,duration:260,ease:'Back.Out'});
   if(dog&&u.lv>1){const st=this.add.text(0,-h-15,'★'.repeat(u.lv-1),{fontSize:'9px',color:'#ffd54a',stroke:'#3b2410',strokeThickness:3}).setOrigin(.5);container.add(st);}
   return {container,rig,img,hp,barW,shadow,id,sheet,dog,dir,h,pose2:'idle',ranged:RANGED.has(id),lastHp:u.hp,lastX:u.x,moving:false,movedAt:0,motion:'idle',motionStart:0,hurtAt:-9999,
    phase:Math.random()*10,pose:{dx:0,dy:0,rot:0,sx:1,sy:1},boss:!!u.boss,anim:'idle'};
  }
  /* 동작별 목표 자세 (프레임 그림이 있는 캐릭터는 몸동작을 작게) */
  targetPose(a,now){
   const t=now/1000+a.phase,d=a.dir,k0=a.sheet?.45:a.dog?.6:1;
   const p={dx:0,dy:0,rot:0,sx:1,sy:1};
   const walking=a.moving&&now-a.movedAt<260;
   if(walking){const w=(t/(a.boss?.75:.48))%1;p.dy=-Math.abs(Math.sin(w*Math.PI*2))*4*k0;p.rot=d*2*Math.sin(w*Math.PI*2)*k0;p.sy=1+.022*Math.cos(w*Math.PI*4)*k0;p.sx=2-p.sy;}
   else{const b=Math.sin(t*Math.PI*2/1.7)*k0;p.sy=1+.02*b;p.sx=1-.011*b;}
   const lunge=!a.sheet||BROKEN_ATTACK.has(a.id);
   if(a.motion==='skill'){const k=Math.min(1,(now-a.motionStart)/620);if(k<.25){const q=ease(k/.25);p.dy=-10*q;p.sx=1+.06*q;p.sy=1+.06*q;p.rot=-d*6*q;}else if(k<.6){const q=(k-.25)/.35;p.dy=-10+6*q;p.dx=d*14*Math.sin(q*Math.PI);p.rot=-d*6+d*14*q;p.sx=p.sy=1.08;}else{const q=ease((k-.6)/.4);p.dy=-4*(1-q);p.rot=d*8*(1-q);p.sx=p.sy=1.08-.08*q;}if(k>=1)a.motion='idle';}
   else if(a.motion==='attack'){const k=Math.min(1,(now-a.motionStart)/(a.ranged?520:480));
    if(lunge){
     if(a.ranged){if(k<.45){const q=ease(k/.45);p.rot=-d*7*q;p.dx=-d*3*q;p.sy=1+.04*q;}else if(k<.62){const q=(k-.45)/.17;p.rot=-d*7+d*12*q;p.dx=-d*3-d*4*q;}else{const q=ease((k-.62)/.38);p.rot=d*5*(1-q);p.dx=-d*7*(1-q);}}
     else{if(k<.38){const q=ease(k/.38);p.rot=-d*9*q;p.dx=-d*5*q;p.sx=1-.04*q;p.sy=1+.05*q;}else if(k<.58){const q=(k-.38)/.2;p.rot=-d*9+d*22*q;p.dx=-d*5+d*18*q;p.dy=-3*Math.sin(q*Math.PI);}else{const q=ease((k-.58)/.42);p.rot=d*13*(1-q);p.dx=d*13*(1-q);}}}
    if(k>=1)a.motion='idle';}
   const hk=(now-a.hurtAt)/320;if(hk<1){const q=1-hk;p.dx-=d*7*q;p.rot-=d*5*q*Math.sin(hk*Math.PI);}
   return p;
  }
  /* 프레임 애니메이션 고르기: 공격 중이면 공격, 맞으면 피격, 움직이면 걷기, 아니면 대기 */
  pickAnim(a,now){
   if(a.dog){let pose='idle';const el=now-a.motionStart;
    if(a.motion==='skill'&&el<620)pose='skill';
    else if(a.motion==='attack'&&el<380)pose=el<120?'run':'attack';
    else if(now-a.hurtAt<260)pose='hurt';
    else if(a.moving&&now-a.movedAt<260)pose=(Math.floor((now/1000+a.phase)/.16)%2)?'walk':'run';
    if(pose!==a.pose2){a.pose2=pose;a.img.setFrame(a.id+'_'+pose);}
    return;}
   if(!a.sheet)return;
   let want=a.moving&&now-a.movedAt<260?'walk':'idle';
   if(now-a.hurtAt<300)want='hurt';
   if(a.motion==='attack'&&!BROKEN_ATTACK.has(a.id))want='attack';
   const cur=a.img.anims.currentAnim?.key, playing=a.img.anims.isPlaying;
   if((want==='attack'||want==='hurt')){if(cur!==a.id+'_'+want)a.img.play(a.id+'_'+want);return;}
   if(cur&&(cur.endsWith('_attack')||cur.endsWith('_hurt'))&&playing)return;  // 공격·피격 동작은 끝까지 보여 주고 이어서
   if(cur!==a.id+'_'+want)a.img.play(a.id+'_'+want);
  }
  update(time,delta){
   const f=1-Math.exp(-delta/1000*16);
   for(const a of this.actors.values()){
    const tp=this.targetPose(a,time),p=a.pose;
    for(const k of ['dx','dy','rot','sx','sy'])p[k]+=(tp[k]-p[k])*f;
    a.rig.x=p.dx;a.rig.y=p.dy;a.rig.angle=p.rot;a.rig.scaleX=p.sx;a.rig.scaleY=p.sy;
    a.shadow.scaleX=1-Math.min(.25,-p.dy/30);
    this.pickAnim(a,time);
    if(a.tinted&&time-a.hurtAt>140){a.img.clearTint();if(a.id==='goblin'&&a.shieldTint)a.img.setTint(0xd8e4ff);a.tinted=false;}
   }
  }
  draw(data){if(!data)return;
   const st=Number.isInteger(data.stage)?data.stage:stageOf(data.wave);
   if(st!==this.stageIndex){this.stageIndex=st;this.stageBg.setTexture('stage'+(st+1));this.plateText.setText(`스테이지 ${st+1}   ${STAGE_NAMES[st]}`);if(data.wave>1)this.flashAnnouncement(`🚩 스테이지 ${st+1} · ${STAGE_NAMES[st]}`,0xffed9d);}
   if(data.finished&&!this.lastFinished){this.lastFinished=true;this.resultShade.setAlpha(.72);this.resultSubtitle.setText('영어 퀴즈와 댕댕이 전사들의 모험이 끝났어요!');this.cameras.main.shake(380,.003);for(let i=0;i<30;i++){const s=this.add.text(Phaser.Math.Between(60,900),Phaser.Math.Between(20,230),i%2?'✦':'★',{fontSize:Phaser.Math.Between(12,24)+'px',color:i%2?'#ffe16d':'#b9f5ff'}).setDepth(925);this.tweens.add({targets:s,y:s.y-70,alpha:0,delay:i*25,duration:1300,onComplete:()=>s.destroy()});}}
   for(let i=0;i<2;i++){const base=data.teams[i];if(base&&base.hp<=0&&!this.destroyedBases.has(i)){this.destroyedBases.add(i);const x=this.bases[i].x;this.cameras.main.shake(480,.007);for(let j=0;j<16;j++){const bit=this.add.circle(x,GROUND-50,Phaser.Math.Between(3,8),[0xffdf82,0xff8666,0xffffff][j%3]).setDepth(850);const an=j*Math.PI/8;this.tweens.add({targets:bit,x:x+Math.cos(an)*Phaser.Math.Between(30,90),y:GROUND-50+Math.sin(an)*Phaser.Math.Between(20,70),alpha:0,duration:750,onComplete:()=>bit.destroy()});}this.floatingText(x,GROUND-110,'BASE DESTROYED!','#ffe38b');}}
   if(data.wave!==this.lastWave)this.lastWave=data.wave;
   this.waveText.setText(`WAVE ${data.wave}  ·  ${data.mode==='pvp'?'TEAM BATTLE':'DEFEND THE KINGDOM'}`);
   this.bases.forEach((b,i)=>{const t=data.teams[i];if(!t)return;b.label.setText(`${t.shieldT>0?'🛡️ ':''}${t.powerT>0?'💪 ':''}${Math.ceil(t.hp)} / ${t.maxHp}`);b.bar.width=106*Math.max(0,t.hp/t.maxHp)});
   const now=this.time.now,live=new Set();
   for(const u of data.units){live.add(u.id);let a=this.actors.get(u.id);if(!a){a=this.makeActor(u,data);a.shieldTint=u.enemyType==='shield';this.actors.set(u.id,a);}
    if(u.hp<a.lastHp){a.hurtAt=now;a.img.setTint(0xff9c9c);a.tinted=true;}
    if(Math.abs(u.x-a.lastX)>.2){a.moving=true;a.movedAt=now;}else if(now-a.movedAt>260)a.moving=false;
    a.lastHp=u.hp;a.lastX=u.x;a.hp.width=a.barW*Math.max(0,u.hp/u.maxHp);
    this.tweens.add({targets:a.container,x:u.x,duration:100,ease:'Linear'});a.container.setDepth(20+Math.round(u.x)+(u.id%3)*1000);
   }
   if(Array.isArray(data.events)){if(!this.eventHistoryReady){this.lastEvent=data.events.at(-1)?.seq||0;this.eventHistoryReady=true;}else for(const e of data.events){if(e.seq>this.lastEvent){this.eventFx(e);this.lastEvent=e.seq;}}}
   for(const [id,a] of this.actors)if(!live.has(id)){this.actors.delete(id);this.floatingText(a.container.x,GROUND-a.h-16,'✦ KO ✦','#ffda78');
    a.hp.setVisible(false);
    if(a.dog){a.img.clearTint();a.img.setFrame(a.id+'_die');a.pose2='die';a.motion='dead';this.add.image(a.container.x,GROUND-a.h*.6,'fx','star').setScale(.6).setDepth(700).setAlpha(.9);this.tweens.add({targets:a.container,alpha:0,y:GROUND+4,delay:520,duration:380,onComplete:()=>a.container.destroy()});}
    else if(a.sheet){a.img.clearTint();a.img.play(a.id+'_die');this.tweens.add({targets:a.container,alpha:0,delay:650,duration:350,onComplete:()=>a.container.destroy()});}
    else{a.img.setTint(0xd9d9d9);this.tweens.add({targets:a.rig,angle:-a.dir*82,y:-3,x:-a.dir*12,duration:420,ease:'Quad.easeIn'});this.tweens.add({targets:a.container,alpha:0,delay:260,duration:420,onComplete:()=>a.container.destroy()});}}
   this.banner.setText(data.finished?(data.winner===null?'🤝 DRAW':data.winner===sideRef.current?'🏆 VICTORY!':'💫 DEFEAT'):'');
  }
 }
 const game=new Phaser.Game({type:Phaser.AUTO,parent:mount.current,width:W*1.5,height:H*1.5,backgroundColor:'#7fc4e8',scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},render:{antialias:true},scene:[Arena]});
 return()=>{scene.current=null;game.destroy(true)};
 },[]);
 useEffect(()=>{if(scene.current&&state)scene.current.draw(state)},[state]);
 return <div className="arena" ref={mount}/>;
}
