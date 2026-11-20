import {db} from './data';
export function fileSize(bytes:number){if(bytes<1024)return `${bytes} B`;if(bytes<1024**2)return `${(bytes/1024).toFixed(1)} KB`;if(bytes<1024**3)return `${(bytes/1024**2).toFixed(1)} MB`;return `${(bytes/1024**3).toFixed(2)} GB`;}
export function downloadURL(value: string, name: string) {
  try {
    const url = new URL(value);
    if (url.username || url.password) return '';
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && url.hostname === '127.0.0.1')) return '';

    if (['drive.google.com', 'drive.usercontent.google.com'].includes(url.host)) {
      const pathId = url.pathname.match(/^\/file\/d\/([\w-]+)(?:\/|$)/)?.[1];
      const queryId = ['/open', '/uc', '/download'].includes(url.pathname) ? url.searchParams.get('id') : null;
      const id = pathId || queryId;
      if (id && /^[\w-]+$/.test(id)) {
        const download = new URL('https://drive.google.com/uc');
        download.searchParams.set('export', 'download');
        download.searchParams.set('id', id);
        const resourceKey = url.searchParams.get('resourcekey');
        if (resourceKey) download.searchParams.set('resourcekey', resourceKey);
        return download.href;
      }
    }

    if (url.origin === process.env.NEXT_PUBLIC_SUPABASE_URL && url.pathname.startsWith('/storage/v1/object/public/media/')) {
      url.searchParams.set('download', name);
    }
    return url.href;
  } catch {
    return '';
  }
}
export function previewKind(file:File):'image'|'video'{if(/^image\/(png|jpeg|gif|webp|avif)$/.test(file.type))return 'image';if(/^video\/(mp4|webm)$/.test(file.type))return 'video';throw Error('Screenshots must be PNG, JPEG, GIF, WebP, AVIF, MP4 or WebM.');}
export function storageName(name:string){return name.normalize('NFKD').replace(/[^a-zA-Z0-9._-]/g,'-').replace(/^\.+/,'').slice(-120)||'download';}
export async function uploadProjectFile(file:File,path:string,onProgress:(loaded:number,total:number)=>void){
  if (file.size > 6 * 1024 ** 2) {
    const { data: { session } } = await db.auth.getSession();
    if (!session) throw new Error('Sign in again before uploading.');
    const { Upload } = await import('tus-js-client');
    const origin = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!);
    origin.hostname = origin.hostname.replace(/\.supabase\.co$/, '.storage.supabase.co');
    await new Promise<void>((resolve, reject) => {
      new Upload(file, {
        endpoint: origin.origin + '/storage/v1/upload/resumable',
        headers: { authorization: 'Bearer ' + session.access_token },
        metadata: { bucketName: 'media', objectName: path, contentType: file.type || 'application/octet-stream' },
        chunkSize: 6 * 1024 ** 2,
        retryDelays: [0, 1000, 3000, 5000, 10000],
        removeFingerprintOnSuccess: true,
        onProgress,
        onSuccess: () => resolve(),
        onError: error => reject(/413|maximum allowed size|file size limit/i.test(error.message)
          ? new Error('This exceeds your Supabase file limit. Use Add external download link or increase your storage limit.')
          : error),
      }).start();
    });
    return db.storage.from('media').getPublicUrl(path).data.publicUrl;
  }
  const {data,error}=await db.storage.from('media').createSignedUploadUrl(path);if(error)throw error;
  await new Promise<void>((resolve,reject)=>{const xhr=new XMLHttpRequest();xhr.open('PUT',data.signedUrl);xhr.setRequestHeader('Content-Type',file.type||'application/octet-stream');xhr.timeout=1800000;xhr.upload.onprogress=e=>onProgress(e.loaded,e.lengthComputable?e.total:file.size);xhr.onload=()=>{if(xhr.status>=200&&xhr.status<300){onProgress(file.size,file.size);resolve();return;}let detail='';try{const r=JSON.parse(xhr.responseText);detail=r.message||r.error||'';}catch{}reject(Error(`Upload failed (${xhr.status}). ${detail}`));};xhr.onerror=()=>reject(Error('Network error. Your project has not been published; please retry.'));xhr.ontimeout=()=>reject(Error('Upload timed out. Please retry with a stable connection.'));xhr.send(file);});
  return db.storage.from('media').getPublicUrl(path).data.publicUrl;
}
