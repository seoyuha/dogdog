import React,{useEffect,useRef} from 'react';
import Phaser from 'phaser';
/* ───────── 캐릭터 그림과 자연스러운 움직임 ─────────
   각 캐릭터는 첨부해 준 일러스트 한 장(/hd/*.png)을 쓰고,
   대기(숨쉬기)·걷기(통통 걸음)·공격(준비→찌르기/쏘기→돌아오기)·피격(뒤로 밀림)·쓰러짐을
   매 프레임 부드럽게 섞어서(보간) 동작이 끊기지 않고 이어지도록 만들어요. */
const DOGS=['scout','guard','archer','mage','knight','dragon'];
const ENEMIES=['slime','goblin','spider','shield','skeleton','darkmage','golem'];
const DRAWN_RIGHT=new Set(['goblin','shield','skeleton','golem']); // 그림이 오른쪽을 보는 캐릭터 (강아지들은 왼쪽을 봐요)
const HEIGHT={scout:96,guard:94,archer:100,mage:102,knight:110,dragon:118,slime:62,goblin:86,spider:74,shield:90,skeleton:76,darkmage:94,golem:150};
const RANGED=new Set(['archer','mage','darkmage','goblin','spider']);
const COLOR={scout:0xffd476,guard:0x80c9ef,archer:0x8ed3a3,mage:0xc3a2f2,knight:0xffa47f,dragon:0xf5cc61};
const GROUND=304;
const ease=(t)=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
export default function Battle({state,side=0}){
 const mount=useRef(null),scene=useRef(null),sideRef=useRef(side);sideRef.current=side;
 useEffect(()=>{if(!mount.current)return;
 class Arena extends Phaser.Scene{
  constructor(){super('DogArena');this.actors=new Map();this.bases=[];this.lastWave=0;this.lastEvent=0;this.eventHistoryReady=false;this.lastFinished=false;this.destroyedBases=new Set();this.stageIndex=-1;}
  preload(){
   for(let i=1;i<=3;i++)this.load.image('remaster_stage'+i,'/remaster/stage'+i+'.webp');
   for(const id of [...DOGS,...ENEMIES])this.load.image('hd_'+id,'/hd/'+id+'.png');
  }
  create(){
   /* 화면을 1.5배 크기로 그려서 태블릿에서도 그림이 또렷하게 보여요 (좌표는 960×360 그대로) */
   this.cameras.main.setZoom(1.5).centerOn(480,180);
   this.stageBg=this.add.image(480,180,'remaster_stage1').setDisplaySize(960,360).setDepth(-50);
   this.add.rectangle(480,346,960,28,0x2d2320,.35).setDepth(-10);
   for(let s=0;s<2;s++){
    const x=s?911:49;const tower=this.add.container(x,236);
    tower.add([this.add.ellipse(0,82,96,20,0x36445e,.2),this.add.rectangle(0,9,74,126,s?0x62546d:0xffe3a8).setStrokeStyle(4,s?0x363449:0x9d7047),this.add.triangle(0,-78,-49,40,0,-14,49,40,s?0xa54e68:0xeaa05c).setStrokeStyle(3,0xffffff),this.add.text(0,15,s?'👾':'🐾',{fontSize:'37px'}).setOrigin(.5)]);
    this.bases.push({label:this.add.text(x,112,'1600 / 1600',{fontSize:'14px',fontStyle:'bold',color:'#25334d',stroke:'#ffffff',strokeThickness:4}).setOrigin(.5),bar:this.add.rectangle(x-39,132,78,8,s?0xee788b:0x54ce83).setOrigin(0,.5)});
   }
   this.waveText=this.add.text(480,22,'',{fontSize:'17px',fontFamily:'Arial',fontStyle:'bold',color:'#304466',stroke:'#ffffff',strokeThickness:4}).setOrigin(.5).setDepth(900);
   this.announcement=this.add.text(480,104,'',{fontSize:'31px',fontStyle:'bold',color:'#fff2a8',stroke:'#27364f',strokeThickness:7}).setOrigin(.5).setDepth(910);
   this.resultShade=this.add.rectangle(480,180,960,360,0x101b35,.0).setDepth(920);
   this.resultSubtitle=this.add.text(480,239,'',{fontSize:'18px',fontStyle:'bold',color:'#ffffff',stroke:'#17233d',strokeThickness:4}).setOrigin(.5).setDepth(932);
   this.banner=this.add.text(480,177,'',{fontSize:'49px',fontStyle:'bold',color:'#fff',stroke:'#34405b',strokeThickness:9}).setOrigin(.5).setDepth(931);
   scene.current=this;
  }
  hit(x,y,color=0xffd36c){const circ=this.add.circle(x,y,8,color,.9).setDepth(500);this.tweens.add({targets:circ,scale:3,alpha:0,duration:220,onComplete:()=>circ.destroy()});for(let i=0;i<4;i++){const dot=this.add.circle(x,y,3,color).setDepth(500);const a=i*Math.PI/2+Math.random()*.4;this.tweens.add({targets:dot,x:x+Math.cos(a)*25,y:y+Math.sin(a)*25,alpha:0,duration:260,onComplete:()=>dot.destroy()})}}
  projectile(x,y,toX,toY,color=0xffd15a,kind='archer'){
   const isMagic=kind==='mage'||kind==='dragon'||kind==='darkmage';
   const ball=this.add.circle(x,y,isMagic?11:6,color,1).setDepth(600).setStrokeStyle(2,0xffffff,.9);
   const trail=this.add.circle(x,y,isMagic?18:10,color,.24).setDepth(590);
   this.tweens.add({targets:[ball,trail],x:toX,y:toY,duration:isMagic?340:210,ease:'Sine.easeIn',onComplete:()=>{this.hit(toX,toY,color);ball.destroy();trail.destroy()}});
  }
  floatingText(x,y,msg,color='#fff6a3'){
   const t=this.add.text(x,y,msg,{fontSize:'17px',fontStyle:'bold',color,stroke:'#26374b',strokeThickness:4}).setOrigin(.5).setDepth(800);
   this.tweens.add({targets:t,y:y-35,alpha:0,duration:650,onComplete:()=>t.destroy()});
  }
  triggerMotion(e,motion){const target=this.actors.get(e.unitId);if(target&&motion==='attack'){target.motion='attack';target.motionStart=this.time.now;}}
  enemyAttackFx(e){
    const k=e.enemyType, x=e.x, y=e.y-22, tx=e.toX, ty=e.toY-18;
    if(k==='slime'){
      const blob=this.add.ellipse(x,y,19,15,0x7de85e).setStrokeStyle(3,0xc5ff8c).setDepth(650);
      this.tweens.add({targets:blob,x:tx,y:ty-12,angle:340,scale:.75,duration:380,ease:'Quad.easeIn',onComplete:()=>{blob.destroy();this.hit(tx,ty,0x8ff36e)}});
    }else if(k==='goblin'){
      const rock=this.add.circle(x,y,7,0x9c7659).setStrokeStyle(2,0xf1d9a8).setDepth(650);
      this.tweens.add({targets:rock,x:tx,y:ty-12,duration:300,ease:'Sine.easeIn',onComplete:()=>{rock.destroy();this.hit(tx,ty,0xc2a47c)}});
    }else if(k==='spider'){
      for(let i=-1;i<=1;i++){const shard=this.add.triangle(x,y,0,-11,-5,7,5,7,0xc87dff).setStrokeStyle(1,0xffffff).setDepth(650);this.tweens.add({targets:shard,x:tx,y:ty+i*17,angle:240,duration:330,onComplete:()=>{shard.destroy();this.hit(tx,ty+i*17,0xb879ff)}})}
    }else if(k==='shield'){
      const wave=this.add.arc(x,y,22,220,320,false,0xcbd7e8,.75).setStrokeStyle(4,0xffffff).setDepth(650);
      this.tweens.add({targets:wave,x:tx,y:ty,scale:1.4,alpha:0,duration:230,onComplete:()=>{wave.destroy();this.hit(tx,ty,0xa8b9d2)}});
    }else if(k==='skeleton'){
      const bone=this.add.text(x,y,'🦴',{fontSize:'26px'}).setOrigin(.5).setDepth(650);this.tweens.add({targets:bone,x:tx,y:ty,angle:240,duration:310,onComplete:()=>{bone.destroy();this.hit(tx,ty,0xf1e6d4)}});
    }else if(k==='darkmage'){
      const orb=this.add.circle(x,y,12,0xb74dff).setStrokeStyle(3,0xffc5ff).setDepth(650);const halo=this.add.circle(x,y,20,0x8d3df6,.25).setDepth(640);
      this.tweens.add({targets:[orb,halo],x:tx,y:ty,duration:430,onComplete:()=>{orb.destroy();halo.destroy();this.hit(tx,ty,0xce6bff)}});
    }else if(k==='golem'){
      const rock=this.add.circle(x,y,23,0x663b42).setStrokeStyle(5,0xff7355).setDepth(650);this.tweens.add({targets:rock,x:tx,y:ty,scale:.7,duration:450,onComplete:()=>{rock.destroy();this.hit(tx,ty,0xff5f3c);this.cameras.main.shake(190,.004)}});
    }else this.hit(tx,ty,0xffd36c);
  }
  eventFx(e){
    const color=COLOR[e.type]||0xffd66c;
    if(e.kind==='attack'){
      this.triggerMotion(e,'attack');
      if(e.enemyType)this.enemyAttackFx(e);
      else if(['archer','mage','dragon'].includes(e.type))this.projectile(e.x,e.y-20,e.toX,e.toY-15,color,e.type);
      else this.hit(e.toX,e.toY-15,color);
      if(e.damage>=30)this.floatingText(e.toX,e.toY-40,'-'+Math.round(e.damage),'#ffeeb3');
    }else if(e.kind==='baseHit'){
      if(e.enemyType)this.enemyAttackFx({...e,toX:e.x,toY:e.y});
      this.hit(e.x,e.y,0xffad7a);this.cameras.main.shake(65,.0014);this.floatingText(e.x,e.y-65,'-'+Math.round(e.damage),'#ff9f92');
    }else if(e.kind==='ko'){this.triggerMotion(e,'ko');this.hit(e.x,e.y,0xffdca0);if(e.boss)this.flashAnnouncement('BOSS DEFEATED!',0xffed99);}
    else if(e.kind==='special'){
      this.flashAnnouncement('⚡ PAW THUNDER ⚡',0xffef8e);this.cameras.main.flash(270,255,242,157);this.cameras.main.shake(300,.004);
      for(let i=0;i<9;i++){const x=110+i*90;const bolt=this.add.text(x,140+(i%3)*32,'⚡',{fontSize:'42px'}).setDepth(800).setOrigin(.5);this.tweens.add({targets:bolt,y:265,alpha:0,duration:420+i*20,onComplete:()=>bolt.destroy()})}
    }else if(e.kind==='boss'){this.flashAnnouncement('⚠ BOSS WAVE '+e.wave+' ⚠',0xffa6a2);this.cameras.main.shake(240,.003)}
    else if(e.kind==='wave'&&e.wave>1){this.flashAnnouncement('WAVE '+e.wave,0xfff0b0)}
  }
  flashAnnouncement(message,color){this.announcement.setText(message).setColor('#'+color.toString(16).padStart(6,'0')).setAlpha(1).setScale(.65);this.tweens.add({targets:this.announcement,scale:1.12,alpha:0,duration:1150,ease:'Back.Out'});}
  /* 캐릭터 만들기: 발밑을 기준점으로 해서 숨쉬기·찌그러짐이 자연스럽게 보이게 */
  makeActor(u,data){
   const enemy=u.side===1&&data.mode!=='pvp';
   const id=enemy?(u.boss?'golem':(u.enemyType||'slime')):u.type;
   const key=this.textures.exists('hd_'+id)?'hd_'+id:'hd_scout';
   const h=(u.boss?150:HEIGHT[id]||96);
   const dir=u.side===0?1:-1;               // 앞으로 가는 방향 (+1 오른쪽)
   const container=this.add.container(u.x,GROUND);
   const shadow=this.add.ellipse(0,2,h*.62,h*.12,0x1c2433,.28);
   const glow=u.boss?this.add.ellipse(0,-h*.45,h*.95,h*1.05,0xff5566,.18):null;
   const rig=this.add.container(0,0);
   const img=this.add.image(0,0,key).setOrigin(.5,1);
   img.setScale(h/img.height);
   if(dir===1&&!DRAWN_RIGHT.has(id))img.setFlipX(true); else if(dir===-1&&DRAWN_RIGHT.has(id))img.setFlipX(true); else img.setFlipX(false);
   rig.add(img);
   const barW=Math.max(46,Math.min(80,h*.62));
   const hpBg=this.add.rectangle(0,-h-10,barW+2,7,0x26334a,.9);
   const hp=this.add.rectangle(-barW/2,-h-10,barW,5,u.side===1?0xff6f86:0x4bda9b).setOrigin(0,.5);
   container.add([shadow,...(glow?[glow]:[]),rig,hpBg,hp]);
   container.setDepth(20+Math.round(u.x));
   container.setAlpha(0);container.setScale(.7);
   this.tweens.add({targets:container,alpha:1,scale:1,duration:260,ease:'Back.Out'});
   return {container,rig,img,hp,barW,shadow,id,dir,h,ranged:RANGED.has(id)||(!enemy&&RANGED.has(u.type)),
     lastHp:u.hp,lastX:u.x,moving:false,movedAt:0,motion:'idle',motionStart:0,hurtAt:-9999,
     phase:Math.random()*10,pose:{dx:0,dy:0,rot:0,sx:1,sy:1},boss:!!u.boss};
  }
  /* 동작별 목표 자세 → 지금 자세를 부드럽게 따라가게 해요 */
  targetPose(a,now){
   const t=(now/1000)+a.phase, d=a.dir;
   let p={dx:0,dy:0,rot:0,sx:1,sy:1};
   const walking=a.moving&&now-a.movedAt<260;
   if(walking){const w=(t/ (a.boss?.75:.48))%1;const s=Math.sin(w*Math.PI*2);
     p.dy=-Math.abs(Math.sin(w*Math.PI*2))*(a.boss?3:5);p.rot=d*2.2*s;p.sy=1+.025*Math.cos(w*Math.PI*4);p.sx=2-p.sy;}
   else{const b=Math.sin(t*Math.PI*2/1.7);p.sy=1+.022*b;p.sx=1-.012*b;p.dy=0;}
   if(a.motion==='attack'){const k=Math.min(1,(now-a.motionStart)/(a.ranged?520:480));
     if(a.ranged){ // 활·마법: 몸을 뒤로 젖혔다가 쏘면서 반동
       if(k<.45){const q=ease(k/.45);p.rot=-d*7*q;p.sx=1-.03*q;p.sy=1+.04*q;p.dx=-d*3*q;}
       else if(k<.62){const q=(k-.45)/.17;p.rot=-d*7+d*12*q;p.dx=-d*3-d*4*q;p.sy=1.04-.08*q;p.sx=.97+.07*q;}
       else{const q=ease((k-.62)/.38);p.rot=d*5*(1-q);p.dx=-d*7*(1-q);p.sy=.96+.04*q;p.sx=1.04-.04*q;}}
     else{ // 근접: 웅크렸다가 앞으로 찌르고 돌아오기
       if(k<.38){const q=ease(k/.38);p.rot=-d*9*q;p.dx=-d*6*q;p.sx=1-.04*q;p.sy=1+.05*q;}
       else if(k<.58){const q=(k-.38)/.2;p.rot=-d*9+d*22*q;p.dx=-d*6+d*22*q;p.sx=.96+.1*q;p.sy=1.05-.11*q;p.dy=-3*Math.sin(q*Math.PI);}
       else{const q=ease((k-.58)/.42);p.rot=d*13*(1-q);p.dx=d*16*(1-q);p.sx=1.06-.06*q;p.sy=.94+.06*q;}}
     if(k>=1)a.motion='idle';}
   const hk=(now-a.hurtAt)/320;
   if(hk<1){const q=1-hk;p.dx-=d*9*q;p.rot-=d*7*q*Math.sin(hk*Math.PI);p.sx*=1+.05*q;p.sy*=1-.05*q;}
   return p;
  }
  update(time,delta){
   const f=1-Math.exp(-delta/1000*16);
   for(const a of this.actors.values()){
    const tp=this.targetPose(a,time);const p=a.pose;
    for(const k of ['dx','dy','rot','sx','sy'])p[k]+= (tp[k]-p[k])*f;
    a.rig.x=p.dx;a.rig.y=p.dy;a.rig.angle=p.rot;a.rig.scaleX=p.sx;a.rig.scaleY=p.sy;
    a.shadow.scaleX=1-Math.min(.25,-p.dy/30);
    if(time-a.hurtAt>140&&a.tinted){a.img.clearTint();a.tinted=false;}
   }
  }
  draw(data){if(!data)return;
   const stage=Math.min(2,Math.floor(Math.max(0,data.wave-1)/4));if(stage!==this.stageIndex){this.stageIndex=stage;this.stageBg.setTexture('remaster_stage'+(stage+1));this.flashAnnouncement(['🌳 ANCIENT FOREST GATEWAY','💎 CRYSTAL BADLANDS','🌑 DARK SORCERER ALTAR'][stage],0xffed9d);}
   if(data.finished&&!this.lastFinished){this.lastFinished=true;this.resultShade.setAlpha(.8);this.resultSubtitle.setText('영어 퀴즈와 댕댕이 전사들의 모험이 끝났습니다!');this.cameras.main.shake(380,.003);for(let i=0;i<35;i++){const star=this.add.text(Phaser.Math.Between(70,890),Phaser.Math.Between(20,330),i%2?'✦':'★',{fontSize:Phaser.Math.Between(14,29)+'px',color:i%2?'#ffe16d':'#b9f5ff'}).setDepth(925);this.tweens.add({targets:star,y:star.y-90,alpha:0,delay:i*25,duration:1300,onComplete:()=>star.destroy()});}}
   for(let i=0;i<2;i++){const base=data.teams[i];if(base&&base.hp<=0&&!this.destroyedBases.has(i)){this.destroyedBases.add(i);const x=i?911:49;this.cameras.main.shake(480,.007);for(let j=0;j<16;j++){const bit=this.add.circle(x,240,Phaser.Math.Between(3,9),[0xffdf82,0xff8666,0xffffff][j%3]).setDepth(850);const ang=j*Math.PI/8;this.tweens.add({targets:bit,x:x+Math.cos(ang)*Phaser.Math.Between(35,110),y:240+Math.sin(ang)*Phaser.Math.Between(25,100),alpha:0,duration:750,onComplete:()=>bit.destroy()});}this.floatingText(x,165,'BASE DESTROYED!','#ffe38b');}}
   if(data.wave!==this.lastWave){this.lastWave=data.wave;if(data.wave>1){this.floatingText(480,120,'✦ WAVE '+data.wave+' ✦','#fff7b1');this.cameras.main.shake(120,.0015)}}
   this.waveText.setText(`WAVE ${data.wave}    ·    ${data.mode==='pvp'?'TEAM BATTLE':'DEFEND THE KINGDOM'}    ·    ${Math.floor(data.remaining/60)}:${String(data.remaining%60).padStart(2,'0')}`);
   this.bases.forEach((b,i)=>{const team=data.teams[i];if(!team)return;b.label.setText(`${Math.ceil(team.hp)} / ${team.maxHp}`);b.bar.width=78*Math.max(0,team.hp/team.maxHp)});
   const now=this.time.now;
   const live=new Set();
   for(const u of data.units){live.add(u.id);let a=this.actors.get(u.id);if(!a){a=this.makeActor(u,data);this.actors.set(u.id,a);}
    if(u.hp<a.lastHp){a.hurtAt=now;a.img.setTint(0xff9c9c);a.tinted=true;}
    if(Math.abs(u.x-a.lastX)>.2){a.moving=true;a.movedAt=now;}else if(now-a.movedAt>260)a.moving=false;
    a.lastHp=u.hp;a.lastX=u.x;a.hp.width=a.barW*Math.max(0,u.hp/u.maxHp);
    this.tweens.add({targets:a.container,x:u.x,duration:100,ease:'Linear'});
    a.container.setDepth(20+Math.round(u.x));
   }
   /* 이벤트(공격·쓰러짐 등)는 캐릭터를 만든 뒤에 처리해야 공격 동작이 바로 보여요 */
   if(Array.isArray(data.events)){if(!this.eventHistoryReady){this.lastEvent=data.events.at(-1)?.seq||0;this.eventHistoryReady=true;}else for(const e of data.events){if(e.seq>this.lastEvent){this.eventFx(e);this.lastEvent=e.seq;}}}
   for(const [id,a] of this.actors)if(!live.has(id)){this.actors.delete(id);this.floatingText(a.container.x,GROUND-a.h-20,'✦ KO ✦','#ffda78');
    /* 쓰러짐: 뒤로 넘어지면서 사라져요 */
    a.img.setTint(0xd9d9d9);
    this.tweens.add({targets:a.rig,angle:-a.dir*82,y:-4,x:-a.dir*14,duration:420,ease:'Quad.easeIn'});
    this.tweens.add({targets:a.container,alpha:0,delay:260,duration:420,onComplete:()=>a.container.destroy()});}
   this.banner.setText(data.finished?(data.winner===null?'🤝 DRAW':data.winner===sideRef.current?'🏆 VICTORY!':'💫 DEFEAT'):'');
  }
 }
 /* 실제 그리는 크기 1440×540 (1.5배) → 태블릿 화면에 맞게 줄어들어 또렷해요 */
 const game=new Phaser.Game({type:Phaser.AUTO,parent:mount.current,width:1440,height:540,backgroundColor:'#a5d7f5',scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},render:{antialias:true,roundPixels:false},scene:[Arena]});
 return()=>{scene.current=null;game.destroy(true)};
 },[]);
 useEffect(()=>{if(scene.current&&state)scene.current.draw(state)},[state]);
 return <div className="arena" ref={mount}/>;
}
