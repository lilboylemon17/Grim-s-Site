import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
const types={html:'text/html; charset=utf-8',htm:'text/html; charset=utf-8',js:'text/javascript; charset=utf-8',mjs:'text/javascript; charset=utf-8',css:'text/css; charset=utf-8',json:'application/json',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',gif:'image/gif',webp:'image/webp',svg:'image/svg+xml',ico:'image/x-icon',mp3:'audio/mpeg',ogg:'audio/ogg',wav:'audio/wav',wasm:'application/wasm',woff:'font/woff',woff2:'font/woff2',ttf:'font/ttf',mp4:'video/mp4',webm:'video/webm',txt:'text/plain; charset=utf-8'};
export function validPath(value){return typeof value==='string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\//i.test(value) && value.length<1024 && !/[\\%?#:\x00-\x1f]/.test(value) && value.split('/').every(p=>p && p!=='.' && p!=='..');}
export async function serve(request, env, fetcher=fetch){
  if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405,headers:{Allow:'GET, HEAD'}});
  if(request.path==='health')return Response.json({service:'GRIM isolated game host',ready:!!env.SUPABASE_URL});
  if(!validPath(request.path))return new Response('Invalid game asset path',{status:400});
  if(!env.SUPABASE_URL)return new Response('Storage not configured',{status:503});
  const headers=new Headers();if(request.range)headers.set('Range',request.range);
  const target=env.SUPABASE_URL+'/storage/v1/object/public/media/'+request.path.split('/').map(encodeURIComponent).join('/');
  const upstream=await fetcher(target,{method:request.method,headers,redirect:'error',signal:AbortSignal.timeout(25000)});
  if(!upstream.ok)return new Response('Game asset unavailable',{status:upstream.status===404?404:502});
  const h=new Headers();for(const key of ['etag','last-modified','accept-ranges','content-range']){if(upstream.headers.has(key))h.set(key,upstream.headers.get(key));}
  h.set('Content-Type',types[request.path.split('.').pop().toLowerCase()]||'application/octet-stream');
  h.set('Content-Disposition','inline');h.set('X-Content-Type-Options','nosniff');h.set('Referrer-Policy','no-referrer');
  h.set('Cache-Control',/\.html?$/i.test(request.path)?'public, max-age=0, must-revalidate':'public, max-age=3600');
  // Uploaded games run on an isolated origin. Allow their observed CDN assets,
  // in-memory bundles, and Eaglercraft relays without granting main-site access.
  const cdn='https://cdn.jsdelivr.net';
  h.set('Content-Security-Policy',"default-src 'self' data: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: "+cdn+"; style-src 'self' 'unsafe-inline' "+cdn+" https://fonts.googleapis.com; font-src 'self' data: "+cdn+" https://fonts.gstatic.com; img-src 'self' data: blob: "+cdn+"; media-src 'self' data: blob: "+cdn+"; connect-src 'self' data: blob: "+cdn+" wss://relay.deev.is wss://relay.lax1dude.net wss://relay.shhnowisnottheti.me; worker-src 'self' blob: "+cdn+"; frame-src 'self' blob:; frame-ancestors "+env.FRAME_ORIGINS+"; object-src 'none'; base-uri 'self'; form-action 'none'");
  h.set('Permissions-Policy','camera=(), microphone=(), geolocation=()');
  return new Response(request.method==='HEAD'?null:upstream.body,{status:upstream.status,headers:h});
}
export default async function handler(req,res){
  try{
    const parsed=new URL(req.url,'https://games.invalid');
    const path=typeof req.query?.asset==='string'?req.query.asset:parsed.searchParams.get('asset');
    const result=await serve({method:req.method,path,range:req.headers.range},process.env);
    res.statusCode=result.status;result.headers.forEach((v,k)=>res.setHeader(k,v));
    if(result.body)await pipeline(Readable.fromWeb(result.body),res);else res.end();
  }catch(error){if(!res.headersSent){res.statusCode=502;res.setHeader('Content-Type','text/plain');res.end('Game storage temporarily unavailable.');}else res.destroy();}
}
