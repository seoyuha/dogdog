import React,{useEffect,useRef} from 'react';
import Phaser from 'phaser';
const MOTIONS=['idle','walk','attack','hurt','ko'];
const TYPES=['scout','guard','archer','mage','knight','dragon','boss'];
const COLOR={scout:0xffd476,guard:0x80c9ef,archer:0x8ed3a3,mage:0xc3a2f2,knight:0xffa47f,dragon:0xf5cc61};
export default function Battle({state,side=0}){
 const mount=useRef(null),scene=useRef(null),sideRef=useRef(side);sideRef.current=side;
 useEffect(()=>{if(!mount.current)return;
 class Arena extends Phaser.Scene{
  constructor(){super('DogArena');this.actors=new Map();this.lastHp=new Map();this.bases=[];this.sparkles=[];this.prevCd=new Map();this.fxClock=0;this.ambient=[];this.lastWave=0;this.lastEvent=0;this.eventHistoryReady=false;this.particles=[];this.lastFinished=false;this.destroyedBases=new Set();this.stageIndex=-1;}
  preload(){for(let i=1;i<=3;i++)this.load.image('remaster_stage'+i,'/remaster/stage'+i+'.webp');for(const id of ['slime','goblin','spider','shield','skeleton','darkmage','golem'])this.load.image('enemy_'+id,'/remaster/enemy_'+id+'.png');for(const id of ['guard','archer','mage','slime','goblin','spider','shield','skeleton','darkmage','golem'])this.load.spritesheet('sprite_'+id,'/sprites/'+id+'.png',{frameWidth:128,frameHeight:128});for(const id of TYPES){this.load.svg('dog_'+id,'/units/'+id+'.svg',{width:128,height:128});for(const motion of ['idle','walk','attack','hurt','ko'])for(let f=0;f<6;f++)this.load.svg(`anim_${id}_${motion}_${f}`,`/animations/${id}_${motion}_${f}.svg`,{width:160,height:180});}}
  create(){
   for(const id of ['guard','archer','mage','slime','goblin','spider','shield','skeleton','darkmage','golem'])for(let r=0;r<5;r++)this.anims.create({key:'motion_'+id+'_'+MOTIONS[r],frames:this.anims.generateFrameNumbers('sprite_'+id,{start:r*6,end:r*6+5}),frameRate:r===1?11:8,repeat:r<=1?-1:0});
   this.stageBg=this.add.image(480,180,'remaster_stage1').setDisplaySize(960,360).setDepth(-50);
   // Stage art is directly cropped from the user-provided illustrated asset board.
   this.add.rectangle(480,342,960,36,0x4b342d,.45).setDepth(-10);
   for(let s=0;s<2;s++){
    const x=s?911:49;const tower=this.add.container(x,236);
    tower.add([this.add.ellipse(0,82,96,20,0x36445e,.2),this.add.rectangle(0,9,74,126,s?0x62546d:0xffe3a8).setStrokeStyle(4,s?0x363449:0x9d7047),this.add.triangle(0,-78,-49,40,0,-14,49,40,s?0xa54e68:0xeaa05c).setStrokeStyle(3,0xffffff),this.add.text(0,15,s?'👾':'🐾',{fontSize:'37px'}).setOrigin(.5)]);
    this.bases.push({label:this.add.text(x,112,'1600 / 1600',{fontSize:'14px',fontStyle:'bold',color:'#25334d',stroke:'#ffffff',strokeThickness:4}).setOrigin(.5),bar:this.add.rectangle(x-39,132,78,8,s?0xee788b:0x54ce83).setOrigin(0,.5)});
   }
   for(let i=0;i<35;i++){let x=12+i*29;this.add.text(x,293+(i%4)*12,i%3===0?'✿':'✦',{fontSize:i%3===0?'12px':'7px',color:i%3===0?'#fff2b0':'#ffffff',stroke:'#74b67d',strokeThickness:1}).setAlpha(.7)}
   this.cinematic=this.add.rectangle(480,180,960,360,0xffffff,0).setDepth(950);
   this.waveText=this.add.text(480,25,'',{fontSize:'19px',fontFamily:'Arial',fontStyle:'bold',color:'#304466',stroke:'#ffffff',strokeThickness:4}).setOrigin(.5);
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
  triggerMotion(e,motion){const target=[...this.actors.values()].find(a=>a.unitId===e.unitId||a.unitId===e.id||a.unitId===e.attackerId);if(target){target.motion=motion;target.motionStart=this.time.now;}}
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
  update(time,delta){for(let i=0;i<this.ambient.length;i++){const c=this.ambient[i];c.x+=delta*(.002+i%3*.001);if(c.x>1060)c.x=-90;}}
  draw(data){if(!data)return;
   const stage=Math.min(2,Math.floor(Math.max(0,data.wave-1)/4));if(stage!==this.stageIndex){this.stageIndex=stage;this.stageBg.setTexture('remaster_stage'+(stage+1));this.flashAnnouncement(['🌳 ANCIENT FOREST GATEWAY','💎 CRYSTAL BADLANDS','🌑 DARK SORCERER ALTAR'][stage],0xffed9d);}
   if(data.finished&&!this.lastFinished){this.lastFinished=true;this.resultShade.setAlpha(.8);this.resultSubtitle.setText('영어 퀴즈와 댕댕이 전사들의 모험이 끝났습니다!');this.cameras.main.shake(380,.003);for(let i=0;i<35;i++){const star=this.add.text(Phaser.Math.Between(70,890),Phaser.Math.Between(20,330),i%2?'✦':'★',{fontSize:Phaser.Math.Between(14,29)+'px',color:i%2?'#ffe16d':'#b9f5ff'}).setDepth(925);this.tweens.add({targets:star,y:star.y-90,alpha:0,delay:i*25,duration:1300,onComplete:()=>star.destroy()});}}
   for(let i=0;i<2;i++){const base=data.teams[i];if(base&&base.hp<=0&&!this.destroyedBases.has(i)){this.destroyedBases.add(i);const x=i?911:49;this.cameras.main.shake(480,.007);for(let j=0;j<16;j++){const bit=this.add.circle(x,240,Phaser.Math.Between(3,9),[0xffdf82,0xff8666,0xffffff][j%3]).setDepth(850);const a=j*Math.PI/8;this.tweens.add({targets:bit,x:x+Math.cos(a)*Phaser.Math.Between(35,110),y:240+Math.sin(a)*Phaser.Math.Between(25,100),alpha:0,duration:750,onComplete:()=>bit.destroy()});}this.floatingText(x,165,'BASE DESTROYED!','#ffe38b');}}
   if(data.wave!==this.lastWave){this.lastWave=data.wave;if(data.wave>1){this.floatingText(480,120,'✦ WAVE '+data.wave+' ✦','#fff7b1');this.cameras.main.shake(120,.0015)}}
   this.waveText.setText(`WAVE ${data.wave}    ·    ${data.mode==='pvp'?'TEAM BATTLE':'DEFEND THE KINGDOM'}    ·    ${Math.floor(data.remaining/60)}:${String(data.remaining%60).padStart(2,'0')}`);
   this.bases.forEach((b,i)=>{const team=data.teams[i];if(!team)return;b.label.setText(`${Math.ceil(team.hp)} / ${team.maxHp}`);b.bar.width=78*Math.max(0,team.hp/team.maxHp)});
   if(Array.isArray(data.events)){if(!this.eventHistoryReady){this.lastEvent=data.events.at(-1)?.seq||0;this.eventHistoryReady=true;}else for(const e of data.events){if(e.seq>this.lastEvent){this.eventFx(e);this.lastEvent=e.seq;}}}
   const live=new Set();for(const u of data.units){live.add(u.id);let actor=this.actors.get(u.id);if(!actor){const container=this.add.container(u.x,281);const shadow=this.add.ellipse(0,36,63,13,0x26354d,.22);const artType=u.boss?'boss':u.type;const enemyType=u.enemyType||(u.boss?'golem':stage===0?(u.type==='scout'?'slime':'goblin'):stage===1?(u.type==='guard'?'shield':'spider'):(u.type==='mage'?'darkmage':'skeleton'));const spriteId=(u.side===1&&data.mode!=='pvp')?enemyType:artType;const animated=this.textures.exists('sprite_'+spriteId);const texture=animated?'sprite_'+spriteId:'dog_'+artType;const img=animated?this.add.sprite(0,-8,texture,0):this.add.image(0,-8,texture);img.setDisplaySize(u.boss?142:105,u.boss?157:116);if(animated)img.play('motion_'+spriteId+'_idle');
    const sword=this.add.text(29,-14,['scout','guard','knight'].includes(u.type)?'✦':u.type==='archer'?'➶':'✧',{fontSize:'21px',fontStyle:'bold',color:'#fff5ad',stroke:'#5b5670',strokeThickness:3}).setOrigin(.5);
    sword.setVisible(false);img.setFlipX(u.side===1);const glow=this.add.ellipse(0,-4,u.boss?100:72,u.boss?108:78,u.boss?0xff6677:(COLOR[u.type]||0xffffff),u.boss?.28:.13);if(u.boss){img.setDisplaySize(128,142);container.setScale(1.12)}const healthBg=this.add.rectangle(0,-64,61,8,0x26334a);const health=this.add.rectangle(-30,-64,60,6,u.side===1?0xff738a:0x4bda9b).setOrigin(0,.5);const level=this.add.text(0,43,u.type.toUpperCase(),{fontSize:'9px',fontStyle:'bold',color:'#2e3c55',stroke:'#ffffff',strokeThickness:3}).setOrigin(.5);container.add([shadow,glow,img,sword,healthBg,health,level]);container.setDepth(20+Math.round(u.x));actor={container,img,sword,health,lastHp:u.hp,lastX:u.x,lastCd:u.cd,bob:Math.random()*6.28,unitId:u.id,type:u.type,artType,spriteId,animated,motion:'idle',motionStart:0};this.actors.set(u.id,actor);container.setAlpha(0);this.tweens.add({targets:container,alpha:1,duration:180});}
    const delta=u.hp-actor.lastHp;if(delta<0){actor.motion='hurt';actor.motionStart=this.time.now;this.hit(u.x,249,0xff8e8e);this.cameras.main.shake(55,.0008);this.tweens.add({targets:actor.img,alpha:.4,duration:75,yoyo:true});}
    // Attack VFX are triggered by authoritative server events, not cooldown guesses.
    actor.lastCd=u.cd;
    actor.lastHp=u.hp;const moved=Math.abs(u.x-actor.lastX)>.2;actor.lastX=u.x;actor.health.width=60*Math.max(0,u.hp/u.maxHp);
    const moving=moved;
    this.tweens.add({targets:actor.container,x:u.x,duration:95,ease:'Linear'});
    actor.container.y=281+Math.sin(this.time.now/(moving?110:270)+actor.bob)*(moving?5:1.6);
    const elapsed=this.time.now-actor.motionStart;if(elapsed>440){actor.motion=moving?'walk':'idle';}const motion=actor.motion;const frame=motion==='walk'?Math.floor(this.time.now/105)%6:motion==='idle'?Math.floor(this.time.now/240)%6:Math.min(5,Math.floor(elapsed/90));const key=`anim_${actor.artType}_${motion}_${frame}`;if(actor.animated){const anim='motion_'+actor.spriteId+'_'+motion;if(actor.img.anims.currentAnim?.key!==anim)actor.img.play(anim,true);}else if(this.textures.exists(key)&&actor.img.texture.key!==key)actor.img.setTexture(key);actor.img.setDisplaySize(u.boss?142:105,u.boss?157:116);actor.container.setDepth(20+Math.round(u.x));
   }
   for(const [id,a] of this.actors)if(!live.has(id)){this.actors.delete(id);this.floatingText(a.container.x,230,"✦ KO ✦","#ffda78");if(a.animated)a.img.play('motion_'+a.spriteId+'_ko',true);else if(this.textures.exists(`anim_${a.artType}_ko_4`))a.img.setTexture(`anim_${a.artType}_ko_4`);this.tweens.add({targets:a.container,alpha:0,y:310,angle:18,scale:.6,duration:380,onComplete:()=>a.container.destroy()});}
   this.banner.setText(data.finished?(data.winner===null?'🤝 DRAW':data.winner===sideRef.current?'🏆 VICTORY!':'💫 DEFEAT'):'');
  }
 }
 const game=new Phaser.Game({type:Phaser.AUTO,parent:mount.current,width:960,height:360,backgroundColor:'#a5d7f5',scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},render:{antialias:true},scene:[Arena]});
 return()=>{scene.current=null;game.destroy(true)};
 },[]);
 useEffect(()=>{if(scene.current&&state)scene.current.draw(state)},[state]);
 return <div className="arena" ref={mount}/>;
}
