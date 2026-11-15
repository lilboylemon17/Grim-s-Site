import {db} from './data';
export function fileSize(bytes:number){if(bytes<1024)return `${bytes} B`;if(bytes<1024**2)return `${(bytes/1024).toFixed(1)} KB`;if(bytes<1024**3)return `${(bytes/1024**2).toFixed(1)} MB`;return `${(bytes/1024**3).toFixed(2)} GB`;}
export function downloadURL(value:string,name:string){try{const u=new URL(value);if(u.protocol!=='https:'&&!(u.protocol==='http:'&&u.hostname==='127.0.0.1'))return '';u.searchParams.set('download',name);return u.href;}catch{return '';}}
export function previewKind(file:File):'image'|'video'{if(/^image\/(png|jpeg|gif|webp|avif)$/.test(file.type))return 'image';if(/^video\/(mp4|webm)$/.test(file.type))return 'video';throw Error('Screenshots must be PNG, JPEG, GIF, WebP, AVIF, MP4 or WebM.');}
export function storageName(name:string){return name.normalize('NFKD').replace(/[^a-zA-Z0-9._-]/g,'-').replace(/^\.+/,'').slice(-120)||'download';}
export async function uploadProjectFile(file:File,path:string,onProgress:(loaded:number,total:number)=>void){
  const {data,error}=await db.storage.from('media').createSignedUploadUrl(path);if(error)throw error;
  await new Promise<void>((resolve,reject)=>{const xhr=new XMLHttpRequest();xhr.open('PUT',data.signedUrl);xhr.setRequestHeader('Content-Type',file.type||'application/octet-stream');xhr.timeout=1800000;xhr.upload.onprogress=e=>onProgress(e.loaded,e.lengthComputable?e.total:file.size);xhr.onload=()=>{if(xhr.status>=200&&xhr.status<300){onProgress(file.size,file.size);resolve();return;}let detail='';try{const r=JSON.parse(xhr.responseText);detail=r.message||r.error||'';}catch{}reject(Error(`Upload failed (${xhr.status}). ${detail}`));};xhr.onerror=()=>reject(Error('Network error. Your project has not been published; please retry.'));xhr.ontimeout=()=>reject(Error('Upload timed out. Please retry with a stable connection.'));xhr.send(file);});
  return db.storage.from('media').getPublicUrl(path).data.publicUrl;
}
