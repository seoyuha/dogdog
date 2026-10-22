/* 🐶 내 기록 (이 기기에 이름별로 저장): 레벨·경험치·저금 코인·아이템·스테이지 별
   - 경험치(EXP): 정답 +10, 승리 +50, 별 1개마다 +20  →  일정 점수가 모이면 레벨 업!
   - 레벨이 오르면 전투 시작 코인이 늘어나요 (레벨마다 +10, 최대 +150)
   - 저금 코인: 정답 +10 · 승리하면 별 × 100 (처음 깬 스테이지는 +100 더) → 🛒 상점에서 아이템 사기 */
export const STAGE_NAMES=['초원 마을','숲속 길','맛있는 음식점 거리','해변','사막 유적지','눈 덮인 마을','화산 지대','동굴','성과 마을','신비한 섬'];
export const SHOP=[
 {id:'heal',name:'체력 회복',desc:'우리 기지 체력 +400',price:300},
 {id:'power',name:'공격력 강화',desc:'30초 동안 공격력 1.3배',price:200},
 {id:'shield',name:'방어력 강화',desc:'30초 동안 기지가 받는 피해 절반',price:250},
 {id:'charge',name:'스킬 충전',desc:'전투 코인 +250 (발사 OK!! 한 번)',price:400},
];
const KEY=n=>'dd-profile-'+String(n||'').trim();
/* 🃏 카드: 처음엔 6장을 가지고 시작, 나머지는 상점에서 열어요. 카드 레벨(1~5)은 코인으로 강화 */
export const STARTER=['army','ninja','archer','detective','nurse','chef'];
export const CARD_PRICE={surfer:300,angel:400,knight:500,mage:500,cannon:700,king:1000};
export const upgradeCost=lv=>[0,150,300,500,800][lv]||0;   // Lv1→2: 150 … Lv4→5: 800
export const ROLE_NAME={attack:'공격형',tank:'방어형',ranged:'원거리',support:'지원형',special:'특수형'};
const blank=()=>({xp:0,level:1,coins:0,items:{heal:0,power:0,shield:0,charge:0},stars:{},owned:[...STARTER],cardLv:{},deck:[...STARTER]});
export const needFor=level=>100+(level-1)*50;           // 다음 레벨까지 필요한 경험치
export const bonusGold=level=>Math.min(150,(level-1)*10);
export function load(name){if(!String(name||'').trim())return blank();try{const p={...blank(),...JSON.parse(localStorage.getItem(KEY(name))||'{}')};
 /* 예전 기록에는 카드가 없어요 → 기본 카드 넣기 */
 if(!Array.isArray(p.owned)||!p.owned.length)p.owned=[...STARTER];p.deck=(Array.isArray(p.deck)?p.deck:[]).filter(id=>p.owned.includes(id)).slice(0,6);if(!p.deck.length)p.deck=p.owned.slice(0,6);p.cardLv=p.cardLv||{};return p}catch(e){return blank()}}
export function save(name,p){if(!String(name||'').trim())return;try{localStorage.setItem(KEY(name),JSON.stringify(p))}catch(e){}}
/* 경험치 더하기 → 올라간 레벨 수 */
export function addXp(p,n){p.xp+=n;let up=0;while(p.xp>=needFor(p.level)){p.xp-=needFor(p.level);p.level++;up++;}return up;}
export const unlocked=(p,st)=>st===0||(p.stars[st-1]||0)>0;
/* 전투 끝 보상 계산 */
export function finishReward(p,{win,stage,hpRatio,correct}){
 const stars=win?(1+(hpRatio>=.5?1:0)+(hpRatio>=.8?1:0)):0;
 const first=win&&Number.isInteger(stage)&&!(p.stars[stage]>0);
 let coins=stars*100+(first?100:0), xp=(win?50:10)+stars*20;
 if(win&&Number.isInteger(stage))p.stars[stage]=Math.max(p.stars[stage]||0,stars);
 p.coins+=coins;const up=addXp(p,xp);
 return {stars,coins,xp,up,first,correct};
}
