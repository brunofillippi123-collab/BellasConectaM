// Caché solo de archivos de presentación; NO almacena fichas, RUT, sesiones ni respuestas de Supabase.
const CACHE = 'bellas-conecta-v3-acceso-primero';
const ASSETS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './supabase-config.js', './registro-clientes.js'];
self.addEventListener('install', e => {e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));self.skipWaiting()});
self.addEventListener('activate', e => {e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim()});
self.addEventListener('fetch', e=>{
  const req=e.request,url=new URL(req.url);
  if(req.method!=='GET'||url.origin!==self.location.origin||url.pathname.includes('/auth/')||url.pathname.includes('/rest/'))return;
  if(req.mode==='navigate'){e.respondWith(fetch(req).then(res=>{if(res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put('./index.html',copy))}return res}).catch(()=>caches.match('./index.html')));return;}
  e.respondWith(caches.match(req).then(old=>old||fetch(req)));
});
