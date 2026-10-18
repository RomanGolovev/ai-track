// Next.js may normalize Request.url to the bind hostname (0.0.0.0).
// The HTTP Host header retains the browser-facing authority, including port.
export function sameOrigin(req:Request){
 const origin=req.headers.get('origin');
 if(!origin)return true;
 try{return new URL(origin).host===req.headers.get('host')}catch{return false}
}
