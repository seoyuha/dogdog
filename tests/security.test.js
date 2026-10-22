import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const server=readFileSync(new URL('../server/index.js',import.meta.url),'utf8');
const client=readFileSync(new URL('../client/src/main.jsx',import.meta.url),'utf8');
test('교사 PIN은 서버 환경변수로 확인',()=>{assert.match(server,/process\.env\.TEACHER_PIN/);assert.match(server,/timingSafeEqual/);assert.match(server,/if\(!pinOk\(pin\)\)/)});
test('이름만으로는 세션을 복구하지 않음',()=>{assert.match(server,/p\.sessionToken===sessionToken/);assert.doesNotMatch(server,/same&&same\.offline/)});
test('학생 30명 및 팀당 5명 제한 코드 존재',()=>{assert.match(server,/length>=30/);assert.match(server,/length>=5/)});
test('클라이언트가 세션 토큰을 저장해 재연결',()=>{assert.match(client,/localStorage\.setItem\('dd-session-'/);assert.match(client,/sessionToken/)});
