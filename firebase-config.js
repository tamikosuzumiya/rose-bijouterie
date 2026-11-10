// ============================================================
//  CONFIGURACIÓN DE LA CONEXIÓN (Firebase + Cloudinary)
//  Seguí la guía GUIA-ADMIN.md y pegá tus datos donde dice PEGAR_AQUI.
//  Estos datos NO son secretos: la seguridad la dan las reglas de Firebase.
// ============================================================
window.ROSE_CONFIG = {

  // Firebase → Configuración del proyecto → Tus apps → Configuración del SDK
  firebase: {
    apiKey:     "PEGAR_AQUI",
    authDomain: "PEGAR_AQUI",   // ej: mi-tienda.firebaseapp.com
    projectId:  "PEGAR_AQUI",   // ej: mi-tienda
    appId:      "PEGAR_AQUI"
  },

  // 📍 FOTO DEL LOCAL / UBICACIÓN (aparece en la sección Info)
  //   mostrar: true  → se ve  |  false → se oculta
  //   foto:    guardá tu foto en la carpeta img/ y poné su nombre
  //   titulo:  el texto que se ve sobre la foto (la dirección)
  //   mapa:    link exacto → Google Maps → buscá el lugar → Compartir → Copiar vínculo
  local: {
    mostrar: true,
    foto:   "img/local.jpg",
    titulo: "📍 Ciudad de Rafaela, Santa Fe",
    mapa:   "https://www.google.com/maps/search/?api=1&query=Rafaela%2C+Santa+Fe",
    ayuda:  "Tocá la foto para ver cómo llegar 🗺️"
  },

  // Cloudinary → guarda las fotos (gratis, sin tarjeta)
  cloudinary: {
    cloudName:    "PEGAR_AQUI",
    uploadPreset: "PEGAR_AQUI"  // preset de tipo "Unsigned"
  }
};
