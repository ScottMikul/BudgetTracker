console.log("Hi from your service-worker.js file!");
const FILES_TO_CACHE = [
    "/",
    '/manifest.webmanifest',
    "/index.html",
    "/index.js",
    "/styles.css",
    "/icons/icon-192x192.png",
    "/icons/icon-512x512.png",


]

  
  const CACHE_NAME = "static-cache-v2";
  const DATA_CACHE_NAME = "data-cache-v1";
  
  // install
  self.addEventListener("install", function(evt) {
      console.log("install");
    evt.waitUntil(
      caches.open(CACHE_NAME).then(cache => {
        console.log("Your files were pre-cached successfully!");
        console.log(cache);
        return cache.addAll(FILES_TO_CACHE);
      })
    );
    console.log("we loaded the files we couldn't find successfully!");
    self.skipWaiting();
  });
  
  // activate
  self.addEventListener("activate", function(evt) {
      console.log("activate");
    evt.waitUntil(
      caches.keys().then(keyList => {
        return Promise.all(
          keyList.map(key => {
            if (key !== CACHE_NAME && key !== DATA_CACHE_NAME) {
              console.log("Removing old cache data", key);
              return caches.delete(key);
            }
          })
        );
      })
    );
  
    //check to see if there's an indexdb thing

    self.clients.claim();
  });
  
 // fetch api transaction data...
  self.addEventListener("fetch",  function(evt) {
    console.log("trying to fetch: "+evt.request);

    evt.respondWith(
      caches.open(CACHE_NAME).then(cache => {
        return cache.match(evt.request).then(response => {
          return response || fetch(evt.request);
        });
      })
    );
  });





  // const request = window.indexedDB.open("budgetdb", 1);

  // // Create schema
  // request.onupgradeneeded = event => {
  //   const db = event.target.result;
    
  //   // Creates an object store with a listID keypath that can be used to query on.
  //   const toDoListStore = db.createObjectStore("budget", {keyPath: {auto_increment}});
  //   // Creates a statusIndex that we can query on.
  //   toDoListStore.createIndex("statusIndex", "status"); 
  // }

  // // Opens a transaction, accesses the toDoList objectStore and statusIndex.
  // request.onsuccess = () => {
  //   const db = request.result;
  //   const transaction = db.transaction(["toDoList"], "readwrite");
  //   const toDoListStore = transaction.objectStore("toDoList");
  //   const statusIndex = toDoListStore.index("statusIndex");

  //   // Adds data to our objectStore
  //   toDoListStore.add({ listID: "1", status: "complete" });
  //   toDoListStore.add({ listID: "2", status: "in-progress" });
  //   toDoListStore.add({ listID: "3", status: "complete" });
  //   toDoListStore.add({ listID: "4", status: "backlog" });
   
  //   // Return an item by keyPath
  //   const getRequest = toDoListStore.get("1");
  //   getRequest.onsuccess = () => {
  //     console.log(getRequest.result);
  //   };

  //   // Return an item by index
  //   const getRequestIdx = statusIndex.getAll("complete");
  //   getRequestIdx.onsuccess = () => {
  //     console.log(getRequestIdx.result); 
  //   }; 
  // };