"use strict";
const CACHE_NAME="pulpito-bible-pwa-v1";
const CORE_ASSETS=[
  "/",
  "/index.html",
  "/styles.css",
  "/app.js",
  "/pulpito-manifest.webmanifest",
  "/pulpito-icon-192.png",
  "/pulpito-icon-512.png"
];
const CDN_HOSTS=new Set([
  "cdn.jsdelivr.net",
  "cdnjs.cloudflare.com",
  "fonts.googleapis.com",
  "fonts.gstatic.com"
]);

self.addEventListener("install",event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE_NAME);
    await Promise.all(CORE_ASSETS.map(async path=>{
      try{
        const response=await fetch(path,{cache:"reload"});
        if(response.ok)await cache.put(path,response);
      }catch(_){}
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate",event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys
      .filter(key=>key.startsWith("pulpito-bible-pwa-")&&key!==CACHE_NAME)
      .map(key=>caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch",event=>{
  const request=event.request;
  if(request.method!=="GET")return;
  const url=new URL(request.url);

  if(url.origin!==self.location.origin){
    if(!CDN_HOSTS.has(url.hostname))return;
    event.respondWith((async()=>{
      const cache=await caches.open(CACHE_NAME);
      const cached=await cache.match(request);
      if(cached)return cached;
      try{
        const response=await fetch(request);
        if(response.ok||response.type==="opaque")await cache.put(request,response.clone());
        return response;
      }catch(_){
        return new Response("",{status:504,statusText:"Offline"});
      }
    })());
    return;
  }

  if(request.mode==="navigate"){
    event.respondWith((async()=>{
      const cache=await caches.open(CACHE_NAME);
      try{
        const response=await fetch(request);
        if(response.ok)await cache.put(request,response.clone());
        return response;
      }catch(_){
        return (await cache.match(request))||
          (await cache.match("/index.html"))||
          new Response("Púlpito Bible: abra o aplicativo online uma vez para preparar o cache.",{
            status:503,headers:{"Content-Type":"text/plain;charset=utf-8"}
          });
      }
    })());
    return;
  }

  event.respondWith((async()=>{
    const cache=await caches.open(CACHE_NAME);
    const cached=await cache.match(request);
    const critical=["/","/index.html","/app.js","/styles.css"].includes(url.pathname);
    if(cached&&!critical)return cached;
    try{
      const response=await fetch(request);
      if(response.ok)await cache.put(request,response.clone());
      return response;
    }catch(_){
      return cached||new Response("",{status:504,statusText:"Offline"});
    }
  })());
});