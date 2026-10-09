
function actualizarManifestDesdeFirebase(){
 let logo=localStorage.getItem("logoPWA");
 if(!logo) return;

 let manifest={
   name:"Tienda Artesanal",
   short_name:"Tienda",
   start_url:"inicio.html",
   display:"standalone",
   background_color:"#fff7fb",
   theme_color:"#d96c9d",
   icons:[
    {src:logo,sizes:"512x512",type:"image/png"},
    {src:logo,sizes:"192x192",type:"image/png"}
   ]
 };

 let blob=new Blob([JSON.stringify(manifest)],{type:"application/manifest+json"});
 let url=URL.createObjectURL(blob);
 let link=document.querySelector('link[rel="manifest"]');
 if(link) link.href=url;

 let apple=document.getElementById("iconoTiendaApple");
 if(apple) apple.href=logo;
}


// Firebase Cloud Sync - V15
// Mantiene el funcionamiento actual y agrega copia a Firestore

const firebaseConfig = {
 apiKey: "AIzaSyAQ14rrHZzTqEr9Dhg9rK8cx17MlKupSNI",
 authDomain: "detallesmaite-a4ca6.firebaseapp.com",
 projectId: "detallesmaite-a4ca6",
 storageBucket: "detallesmaite-a4ca6.firebasestorage.app",
 messagingSenderId: "999993778073",
 appId: "1:999993778073:web:03f764bd709da484a17d08"
};

firebase.initializeApp(firebaseConfig);
const cloudDB = firebase.firestore();
const cloudStorage = firebase.storage();
let ultimoErrorProductosFirebase = null;

async function sincronizarProductoFirebase(producto){
 try{
   await cloudDB.collection("productos").doc(String(producto.id)).set(producto);
 }catch(e){ console.error("Firebase producto ERROR:",e.code,e.message,e); throw e; }
}

// No importar productos antiguos de localStorage: Firebase es la fuente de verdad.
async function sincronizarProductosFirebase(){
 console.warn("Migración local desactivada para evitar restaurar productos eliminados.");
 return false;
}

async function sincronizarTiendaFirebase(){
 try{
   const datosTienda={
    nombreTienda: localStorage.getItem("nombreTienda")||"",
    contactoTienda: localStorage.getItem("contactoTienda")||"",
    mensajeTienda: localStorage.getItem("mensajeTienda")||"",
    mensajeTicket: localStorage.getItem("mensajeTicket")||"",
    claveAdmin: localStorage.getItem("claveAdmin")||"1234",
    logo: localStorage.getItem("logoTienda") || "",
    logoURL: localStorage.getItem("logoTiendaURL") || localStorage.getItem("logoURL") || "",
    // No borrar el logo PWA existente si este dispositivo no lo tiene cargado
    logoPWA: localStorage.getItem("logoPWA") || null,
    actualizado: Date.now()
   };
   console.log("Guardando configuración en Firebase");
   Object.keys(datosTienda).forEach(k=>{
      if(datosTienda[k]===undefined || datosTienda[k]==="" || datosTienda[k]===null){
         delete datosTienda[k];
      }
    });
   await cloudDB.collection("configuracion").doc("tienda").set(datosTienda,{merge:true});
   console.log("Tienda guardada en Firebase correctamente");
   return true;
 }catch(e){console.error("Firebase tienda:",e); throw e;}
}


// Cargar configuracion de tienda desde Firebase al iniciar
async function cargarTiendaDesdeFirebase(){
 try{
   const doc = await cloudDB.collection("configuracion").doc("tienda").get();
   if(doc.exists){
     const t = doc.data();

     if(t.nombreTienda!==undefined) localStorage.setItem("nombreTienda", t.nombreTienda);
     if(t.contactoTienda!==undefined) localStorage.setItem("contactoTienda", t.contactoTienda);
     if(t.mensajeTienda!==undefined) localStorage.setItem("mensajeTienda", t.mensajeTienda);
     if(t.mensajeTicket!==undefined) localStorage.setItem("mensajeTicket", t.mensajeTicket);
     if(t.claveAdmin!==undefined) localStorage.setItem("claveAdmin", t.claveAdmin);
     if(t.logo!==undefined) { localStorage.setItem("logoTienda", t.logo); }
     if(t.logoURL!==undefined) { 
        localStorage.setItem("logoTiendaURL", t.logoURL); 
        localStorage.setItem("logoURL", t.logoURL); 
     }
     if(t.logoPWA!==undefined) {
        localStorage.setItem("logoPWA", t.logoPWA);
        actualizarManifestDesdeFirebase();
     }

     console.log("Tienda cargada desde Firebase");
   }
 }catch(e){
   console.error("Firebase cargar tienda ERROR:", e);
 }
}

async function actualizarProductoFirebase(producto){
 try{
   await cloudDB.collection("productos").doc(String(producto.id)).set(producto,{merge:true});
   console.log("Producto actualizado en Firebase:", producto.id);
 }catch(e){
   console.error("Firebase actualizar producto ERROR:", e.code, e.message, e);
   throw e;
 }
}

async function eliminarProductoFirebase(id){
 try{
   await cloudDB.collection("productos").doc(String(id)).delete();
   console.log("Producto eliminado de Firebase:", id);
 }catch(e){
   console.error("Firebase eliminar producto ERROR:", e.code, e.message, e);
   throw e;
 }
}

// ---------------- PEDIDOS FIREBASE V16 ----------------

async function sincronizarPedidoFirebase(pedido){
 try{
   await cloudDB.collection("pedidos").doc(String(pedido.numero)).set(pedido);
   console.log("Pedido guardado en Firebase");
 }catch(e){
   console.log("Firebase pedido:",e);
 }
}

async function cargarPedidosFirebase(){
 try{
   let snap=await cloudDB.collection("pedidos").get();
   let pedidos=[];
   snap.forEach(doc=>pedidos.push(doc.data()));
   if(pedidos.length){
      localStorage.setItem("pedidos",JSON.stringify(pedidos));
   }
 }catch(e){
   console.log("Cargar pedidos Firebase:",e);
 }
}

async function actualizarEstadoPedidoFirebase(pedido){
 try{
   await cloudDB.collection("pedidos").doc(String(pedido.numero)).set(pedido);
 }catch(e){
   console.log("Actualizar pedido:",e);
 }
}


// ---------------- LOGO FIREBASE STORAGE V23 ----------------
async function subirLogoFirebase(dataURL){
 try{
   if(!dataURL) return "";
   localStorage.setItem("logoTienda", dataURL);
   await cloudDB.collection("configuracion").doc("tienda").set({
      logo: dataURL,
      actualizado: Date.now()
   }, {merge:true});
   console.log("Logo guardado en Firestore");
   return dataURL;
 }catch(e){
   console.error("Logo Firebase ERROR:",e);
   return "";
 }
}


// ---------------- SINCRONIZACION MULTIDISPOSITIVO V32 ----------------
// Escucha unica en tiempo real: una sola suscripcion por pagina.
// No se muestran snapshots locales antes de confirmar los datos del servidor.
let promesaPrimeraCargaProductos = null;
let cancelarEscuchaProductos = null;
let productosConfirmadosPorServidor = false;
// Copia verificada: solo se crea a partir de respuestas confirmadas por Firestore.
// Nunca leer el antiguo localStorage.productos para arrancar la tienda.
const CLAVE_CATALOGO_VERIFICADO = "detallesmaite_catalogo_confirmado_v1";
function leerCatalogoVerificado(){
 try {
  const valor=JSON.parse(localStorage.getItem(CLAVE_CATALOGO_VERIFICADO)||"null");
  return valor && valor.proyecto===firebaseConfig.projectId && Array.isArray(valor.productos) ? valor.productos : null;
 } catch(e){ return null; }
}
let productosVigentesFirebase = leerCatalogoVerificado();
let catalogoVerificadoDisponible = productosVigentesFirebase !== null;
function guardarCatalogoVerificado(productos){
 try {localStorage.setItem(CLAVE_CATALOGO_VERIFICADO,JSON.stringify({proyecto:firebaseConfig.projectId,productos}));}
 catch(e){console.warn("No se pudo guardar el catálogo para desconexión",e);}
}
let huellaProductosFirebase = null;
function cargarProductosDesdeFirebase(){
 if(productosConfirmadosPorServidor) return Promise.resolve(true);
 if(promesaPrimeraCargaProductos) return promesaPrimeraCargaProductos;
 promesaPrimeraCargaProductos = new Promise(resolve => {
  ultimoErrorProductosFirebase = null;
  let primeraRespuesta = false;
  const finalizar = ok => {
   if(!primeraRespuesta){ primeraRespuesta = true; resolve(ok); }
  };
  try {
   cancelarEscuchaProductos = cloudDB.collection("productos").onSnapshot(
    {includeMetadataChanges:true},
    snap => {
     // Nunca reponer productos borrados desde la persistencia local de Firestore.
     if(snap.metadata.fromCache) return;
     const productos = [];
     snap.forEach(doc => {
      const p = doc.data();
      productos.push({...p,id:p.id ?? doc.id});
     });
     // Solo procesar la primera confirmación o cambios reales en los documentos.
     const nuevosDatos = JSON.stringify(productos);
     const cambioReal = nuevosDatos !== huellaProductosFirebase;
     productosVigentesFirebase = productos;
     catalogoVerificadoDisponible = true;
     productosConfirmadosPorServidor = true;
     ultimoErrorProductosFirebase = null;
     if(cambioReal){
      huellaProductosFirebase = nuevosDatos;
      // Mantener compatibilidad con edición, búsqueda y pedidos existentes.
      // Nunca se toma el contenido local como origen de la lista visible.
      guardarCatalogoVerificado(productos);
      if(typeof window.catalogoOfflineGuardar === "function") window.catalogoOfflineGuardar(productos);
      try { localStorage.setItem("productos",nuevosDatos); }
      catch(e){console.warn("Almacenamiento local completo; se mantiene el catálogo en memoria",e);}
      if(typeof cargarProductos === "function") cargarProductos();
      if(typeof renderizarInicioCache === "function") renderizarInicioCache();
     }
     finalizar(true);
    },
    e => {
     ultimoErrorProductosFirebase = e;
     console.error("LECTURA FIRESTORE FALLIDA",firebaseConfig.projectId,e.code,e.message,e);
     productosConfirmadosPorServidor = false;
     cancelarEscuchaProductos = null;
     promesaPrimeraCargaProductos = null;
     finalizar(false);
    }
   );
  } catch(e) {
   ultimoErrorProductosFirebase = e;
   promesaPrimeraCargaProductos = null;
   finalizar(false);
  }
 });
 return promesaPrimeraCargaProductos;
}
function mensajeErrorProductosFirebase(){
 const e=ultimoErrorProductosFirebase;
 if(!e) return "No se pudo obtener la lista de productos desde Firebase.";
 const pistas={
   "permission-denied":"Firestore no permite leer productos. Revisa las reglas de seguridad o el inicio de sesión.",
   "unavailable":"No se puede contactar con Firestore. Verifica la conexión y el dominio permitido.",
   "failed-precondition":"Firestore requiere una configuración adicional para la consulta.",
   "unauthenticated":"Firebase requiere iniciar sesión para acceder a los productos."
 };
 return (pistas[e.code] || "Error de Firestore")+" ("+(e.code||"sin código")+"): "+e.message;
}

// Solo lectura automática; nunca sobrescribir Firestore con datos locales al abrir.
window.addEventListener("load", ()=>{
  // Inicio y administración ya consultan productos en sus propias funciones.
  // En las demás vistas se mantiene la carga habitual.
  if(!document.getElementById("productosInicio") && !document.getElementById("listaProductos")){
   cargarTiendaDesdeFirebase();
   cargarProductosDesdeFirebase();
  }
});

async function subirLogoPWAFirebase(file){
 try{
   const ref = cloudStorage.ref("tienda/logoPWA_"+Date.now()+"_"+file.name);
   await ref.put(file);
   const url = await ref.getDownloadURL();
   localStorage.setItem("logoPWA", url);

   await cloudDB.collection("configuracion").doc("tienda").set({
      logoPWA:url,
      logoURLPWA:url,
      actualizado:Date.now()
   },{merge:true});

   // mantener sincronizada la configuración local y el manifest
   localStorage.setItem("logoPWA", url);
   actualizarManifestDesdeFirebase();

   return url;
 }catch(e){
   console.error("Logo PWA Firebase:",e);
   throw e;
 }
}
