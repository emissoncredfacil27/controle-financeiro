/* Cache offline de arquivos locais. Navegação usa rede primeiro para receber atualizações. */
'use strict';
const CACHE='meu-financeiro-static-v3-1';
const ASSETS=['./','./index.html','./styles.css','./core.js','./app.js','./manifest.json','./icon-192.png','./icon-512.png','./icon.svg'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('meu-financeiro-static-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin)return; // Chart.js usa CDN e não bloqueia o uso offline dos totais.
  event.respondWith(fetch(event.request).then(response=>{if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(event.request,copy)));}return response;}).catch(async()=>{const cached=await caches.match(event.request);if(cached)return cached;if(event.request.mode==='navigate')return caches.match('./index.html');return Response.error();}));
});
self.addEventListener('notificationclick',event=>{event.notification.close();event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(clients=>{const own=clients.find(client=>client.url.startsWith(self.registration.scope));return own?own.focus():self.clients.openWindow(self.registration.scope);}));});
