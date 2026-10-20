import fs from 'node:fs';import path from 'node:path';import XLSX from 'xlsx';
const headers=['번호','단원','영역','난이도','문제','보기1','보기2','보기3','보기4','정답번호','보상코인','교과서쪽','비고'];
import {fileURLToPath} from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const defaultFile=path.join(ROOT,'questions','lesson10.xlsx');
function normalize(rows){return rows.map((r,i)=>({id:i+1,unit:String(r['단원']||'10'),area:String(r['영역']||''),difficulty:String(r['난이도']||'쉬움'),question:String(r['문제']||'').trim(),choices:[1,2,3,4].map(n=>String(r['보기'+n]??'').trim()),answer:Number(r['정답번호']),reward:Number(r['보상코인'])||50})).filter(q=>q.question&&q.choices.every(Boolean)&&q.answer>=1&&q.answer<=4)}
export function loadQuestions(file=defaultFile){const workbook=XLSX.readFile(file);const rows=XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]],{defval:''});return normalize(rows)}
export let bank=loadQuestions();
/* 엑셀에서 'CSV'로 저장하면 한글이 ANSI(EUC-KR)로 저장돼요 → 깨지지 않게 읽기 */
function readBook(buffer){const isZip=buffer[0]===0x50&&buffer[1]===0x4b,isOle=buffer[0]===0xd0&&buffer[1]===0xcf;if(isZip||isOle)return XLSX.read(buffer,{type:'buffer'});let text;try{text=new TextDecoder('utf-8',{fatal:true}).decode(buffer)}catch(e){text=new TextDecoder('euc-kr').decode(buffer)}return XLSX.read(text.replace(/^\uFEFF/,''),{type:'string'})}
export function parseQuestions(buffer){const wb=readBook(buffer);const rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:''});const out=normalize(rows);if(out.length<1)throw Error('문제/보기1~4/정답번호 열을 확인하세요.');return out;}
export function importQuestions(buffer){const wb=readBook(buffer);const rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:''});const out=normalize(rows);if(out.length<1)throw Error('문제/보기1~4/정답번호 열을 확인하세요.');bank=out;return out.length;}
/* 보기 순서를 매번 섞어요 (원래 문제 파일은 정답이 1,2,3,4번 순서로 반복돼서 규칙만 외워도 맞힐 수 있었어요) */
export function shuffled(q){const order=[0,1,2,3];for(let i=3;i>0;i--){const j=Math.floor(Math.random()*(i+1));[order[i],order[j]]=[order[j],order[i]];}return {...q,choices:order.map(i=>q.choices[i]),answer:order.indexOf(q.answer-1)+1};}
export function publicQuestion(q){return {id:q.id,area:q.area,difficulty:q.difficulty,question:q.question,choices:q.choices,reward:q.reward}}
export function selectQuestion(player,list=bank){const bank=list;const rank=player.solved.size;let difficulty=rank<5?'쉬움':rank<12?'보통':'어려움';let pool=bank.filter(q=>q.difficulty===difficulty&&!player.solved.has(q.id));if(!pool.length)pool=bank.filter(q=>!player.solved.has(q.id));if(!pool.length){player.solved.clear();pool=bank.filter(q=>q.difficulty===difficulty);if(!pool.length)pool=bank;}return pool[Math.floor(Math.random()*pool.length)]}
