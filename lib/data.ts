import { createClient } from '@supabase/supabase-js';
export const configured=!!process.env.NEXT_PUBLIC_SUPABASE_URL;
export const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL||'https://placeholder.supabase.co',process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||'unconfigured');
export type Content={id:string;type:'game'|'film';title:string;description:string;thumbnail_url:string;file_url:string;entry_path:string;subtitle_url:string;status:'draft'|'published';display_order:number;duration:string;created_at:string;updated_at:string};
export const asset=(path:string)=>db.storage.from('media').getPublicUrl(path).data.publicUrl;
export function safePath(path:string){if(!path||path.length>240||path.startsWith('/')||path.includes('\\')||path.split('/').some(x=>!x||x==='.'||x==='..')||/[%?#:\x00-\x1f]/.test(path))throw new Error('Unsafe package path: '+path);return path;}
export const gameURL=(id:string,entry:string)=>{const origin=process.env.NEXT_PUBLIC_GAME_ORIGIN;if(!origin)throw new Error('Configure the separate game origin before uploading games.');if(typeof location!=='undefined'&&new URL(origin).origin===location.origin)throw new Error('Games require a separate origin.');return `${origin}/${id}/${entry.split('/').map(encodeURIComponent).join('/')}`;};
