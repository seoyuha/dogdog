import {defineConfig} from 'vite';
export default defineConfig({publicDir:'client/public',server:{host:'0.0.0.0',port:5173,proxy:{'/socket.io':{target:'http://localhost:3001',ws:true},'/api':{target:'http://localhost:3001'}}},build:{outDir:'dist'}});
