@echo off
chcp 65001 >nul
if "%TEACHER_PIN%"=="" set "TEACHER_PIN=123456"
echo [Teacher PIN] Default 123456 - change TEACHER_PIN before classroom use.

chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
 echo Node.js LTS를 먼저 설치하세요: https://nodejs.org/
 pause
 exit /b 1
)
if not exist node_modules (
 echo [1/2] 필요한 패키지를 설치합니다...
 call npm install
 if errorlevel 1 (pause & exit /b 1)
)
echo [2/2] 게임 서버를 실행합니다...
echo 교사 PC: http://localhost:5173
call npm run dev
pause
