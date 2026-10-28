import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const worker=(await import('data:text/javascript;base64,'+Buffer.from(await readFile(new URL('./worker.js',import.meta.url),'utf8')).toString('base64'))).default;
const env={SUPABASE_URL:'https://storage.example',SITE_ORIGIN:'https://grim.example'};
let hits=0;globalThis.fetch=async()=>{hits++;return new Response('<h1>Game</h1>',{headers:{'set-cookie':'sensitive=value','content-disposition':'attachment'}});};
for(const path of ['/no-id/game.html','/12345678-1234-1234-1234-123456789012/%252e%252e/game.html','/12345678-1234-1234-1234-123456789012/a%5Cb.html']){const r=await worker.fetch(new Request('https://games.example'+path),env);assert.ok(r.status>=400);}
assert.equal(hits,0);
const r=await worker.fetch(new Request('https://games.example/12345678-1234-1234-1234-123456789012/version/index.html'),env);
assert.equal(r.status,200);assert.equal(r.headers.get('content-type'),'text/html; charset=utf-8');assert.equal(r.headers.get('set-cookie'),null);assert.equal(r.headers.get('content-disposition'),'inline');assert.ok(r.headers.get('content-security-policy').includes('frame-ancestors https://grim.example'));assert.equal(await r.text(),'<h1>Game</h1>');
assert.equal((await worker.fetch(new Request('https://games.example/test',{method:'POST'}),env)).status,405);
console.log('Game delivery checks passed: invalid paths rejected, executable HTML served inline, cookies stripped, frame policy enforced, writes rejected.');
