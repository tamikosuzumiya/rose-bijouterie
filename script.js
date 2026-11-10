document.addEventListener("DOMContentLoaded", () => {

  // Protege el texto que se escribe dentro de la página
  const esc = s => String(s).replace(/[&<>"']/g,
    ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));

  let carrito = [];
  const enc = encodeURIComponent;

  // 🔹 NAVEGACIÓN
  function mostrarHome() {
    document.getElementById("home").style.display = "block";
    document.getElementById("contacto").style.display = "none";
  }

  function mostrarContacto() {
    document.getElementById("home").style.display = "none";
    document.getElementById("contacto").style.display = "block";
  }

  // 🔹 BUSCADOR
  let categoriaActiva = "";   // "" = todas

  function buscarProducto() {
    let texto = document.getElementById("buscador").value.toLowerCase();
    let productosHTML = document.getElementsByClassName("producto");

    for (let i = 0; i < productosHTML.length; i++) {
      let nombre = productosHTML[i].querySelector("h3").textContent.toLowerCase();
      let cat = productosHTML[i].dataset.cat || "";
      let coincide = nombre.includes(texto) && (!categoriaActiva || cat === categoriaActiva);
      productosHTML[i].style.display = coincide ? "block" : "none";
    }
  }

  // 🔹 ENVÍO
  function toggleEnvio() {
    let tipo = document.getElementById("envio").value;

    let retiro = document.getElementById("datos-retiro");
    let envio = document.getElementById("datos-envio");

    if (tipo === "domicilio") {
      envio.style.display = "block";
      retiro.style.display = "none";
    } else {
      envio.style.display = "none";
      retiro.style.display = "block";
    }
  }

  // ============================================================
  // 🔹 PRODUCTOS DE RESPALDO (lista inicial)
  //  Estos son los productos que se muestran mientras Firebase está vacío
  //  o sin conexión. Una vez importados a Firebase se editan desde la página.
  // ============================================================
  //
  // Cada producto tiene:
  //   id, nombre, precio
  //   categoria → agrupa los productos en los botones de arriba (opcional)
  //   estado    → "nuevo" o "agotado" (opcional)
  //   boton    → texto del botón (opcional, por defecto "Agregar")
  //   campos   → lista de lo que se muestra en el cuadrito. Podés
  //              agregar, quitar, reordenar o renombrar cada uno.
  //   imagenes → fotos del producto:
  //                · lista fija:  ["img/a.jpg", "img/b.jpg"]
  //                · o función que cambia según lo elegido:
  //                  sel => [`img/Anillo_1-${sel.modelo}-${sel.color}.png`]
  //
  // Tipos de campo:
  //   numero  → casillero de número   (usar id: "cantidad" para el total)
  //   select  → lista desplegable     (con "opciones")
  //   texto   → texto libre           (ej: nombre para grabar)
  //
  // Atajos para no repetir código (cada llamada crea un campo NUEVO,
  // así que cambiar uno nunca afecta a los demás productos):
  //   cantidad({...}), modelo({...}), color({...})
  //   Dentro de {...} podés pisar: etiqueta, opciones, valor, min, max
  // ============================================================

  function cantidad(extra = {}) {
    return { id: "cantidad", tipo: "numero", etiqueta: "Cantidad", valor: 1, min: 1, ...extra };
  }
  function modelo(extra = {}) {
    return { id: "modelo", tipo: "select", etiqueta: "Modelo", opciones: ["1","2","3","4","5"], ...extra };
  }
  function color(extra = {}) {
    return { id: "color", tipo: "select", etiqueta: "Color", opciones: ["Dorado","Plateado","Negro"], ...extra };
  }

  let productosBase = [

    // 1 ─ ANILLO: la foto cambia según modelo y color
    {
      id: 1, nombre: "Anillo", categoria: "Anillos", precio: 20000,
      campos: [ cantidad(), modelo(), color() ],
      imagenes: sel => [1, 2, 3].map(n => `img/Anillo_${n}-${sel.modelo}-${sel.color}.png`)
    },

    // 2 ─ COLLAR: galería fija de 3 fotos
    {
      id: 2, nombre: "Collar", categoria: "Collares", precio: 20000,
      campos: [ cantidad(), modelo(), color() ],
      imagenes: [
        "img/Collar_1-1-Dorado.png",
        "img/Collar_2-1-Dorado.png",
        "img/Collar_3-1-Dorado.png"
      ]
    },

    {
      id: 3, nombre: "Pulcera", categoria: "Pulseras", precio: 1000,
      campos: [ cantidad(), modelo(), color() ],
      imagenes: ["img/Pulcera.jfif"]
    },

    {
      id: 4, nombre: "Tobillera", categoria: "Pulseras", precio: 120000,
      campos: [ cantidad(), modelo(), color() ],
      imagenes: ["img/Tobillera.jfif"]
    },

    {
      id: 5, nombre: "piercing", categoria: "Aritos y piercings", precio: 40000,
      campos: [ cantidad(), modelo(), color() ],
      imagenes: ["img/piercing.jfif"]
    },

    {
      id: 6, nombre: "Arito Punk", categoria: "Aritos y piercings", precio: 20000,
      campos: [ cantidad(), modelo(), color() ],
      imagenes: ["img/Arito Punk.jfif"]
    },

    {
      id: 7, nombre: "Anillo Kawaii", categoria: "Anillos", precio: 150000,
      campos: [ cantidad(), modelo(), color() ],
      imagenes: ["img/Anillo Kawaii.jpg"]
    },

    {
      id: 8, nombre: "Pulcera Rock", categoria: "Pulseras", precio: 250000,
      campos: [ cantidad(), modelo(), color() ],
      imagenes: ["img/Pulcera Rock.jfif"]
    },

    {
      id: 9, nombre: "Gargantilla", categoria: "Collares", precio: 100000,
      campos: [ cantidad(), modelo(), color() ],
      imagenes: ["img/Gargantilla.jfif"]
    },

    {
      id: 10, nombre: "Evilla", categoria: "Accesorios", precio: 35000,
      campos: [ cantidad(), modelo(), color() ],
      imagenes: ["img/Evilla.jfif"]
    }
  ];

  // ============================================================
  // 🔹 ESTADO
  // ============================================================
  //  modo "firebase" → los productos vienen de Firebase (se pueden editar)
  //  modo "vacio"    → Firebase conectado pero todavía sin productos
  //                    (se muestra la lista de arriba hasta importarla)
  //  modo "base"     → sin Firebase / sin conexión: se usa la lista de arriba

  const MAX_FOTOS = 3;      // fotos por combinación modelo + color
  const MAX_OPCIONES = 5;   // colores / modelos que se pueden crear

  let productos = [];
  let docs = [];
  let modo = "base";
  let usuario = null;       // administrador con sesión iniciada
  let editando = null;      // producto que se está editando (null = nuevo)
  let fotosNP = {};         // fotos del formulario { "m|c": [url, ...] }
  let contenedor = document.getElementById("productos");

  const $ = id => document.getElementById(id);
  const hayAlmacen = () => !!(window.Almacen && window.Almacen.configurado);
  const conTiempo = (promesa, ms) => Promise.race([
    promesa,
    new Promise((_, no) => setTimeout(() => no(new Error("tiempo agotado")), ms))
  ]);

  function mensajeError(e) {
    let c = (e && e.code) || "";
    if (/invalid-credential|wrong-password|user-not-found|invalid-email|missing-password/.test(c))
      return "Email o contraseña incorrectos.";
    if (c.includes("too-many-requests")) return "Demasiados intentos. Esperá unos minutos.";
    if (c.includes("network")) return "Sin conexión. Revisá tu internet.";
    if (c.includes("permission-denied")) return "Tu cuenta no tiene permiso para editar.";
    if (c.includes("unauthorized-domain")) return "Este dominio no está autorizado en Firebase (ver la guía).";
    return "Error: " + ((e && e.message) || e);
  }

  // ============================================================
  // 🔹 PRODUCTOS → CUADRITOS
  // ============================================================

  // d = { id, orden, nombre, precio, stock, modelos:[...], colores:[...], fotos:{"0|1":[...]} }
  function construirProducto(d) {
    let campos = [ cantidad(d.stock ? { max: d.stock } : {}) ];
    if (d.modelos.length) campos.push(modelo({ opciones: d.modelos }));
    if (d.colores.length) campos.push(color({ opciones: d.colores }));

    return {
      id: d.id, nombre: d.nombre, precio: d.precio, campos,
      categoria: d.categoria || "", estado: d.estado || "",
      imagenes: sel => {
        let m = d.modelos.length ? Math.max(0, d.modelos.indexOf(sel.modelo)) : 0;
        let c = d.colores.length ? Math.max(0, d.colores.indexOf(sel.color)) : 0;
        let f = d.fotos[`${m}|${c}`];
        return f && f.length ? f : ["img/sinstock.png"];
      }
    };
  }

  // Convierte un producto de la lista de arriba en un documento de Firebase
  function aDocumento(p, orden) {
    let cm = p.campos.find(c => c.id === "modelo");
    let cc = p.campos.find(c => c.id === "color");
    let modelos = cm ? cm.opciones.slice() : [];
    let colores = cc ? cc.opciones.slice() : [];
    let fotos = {};
    for (let m = 0; m < Math.max(1, modelos.length); m++) {
      for (let c = 0; c < Math.max(1, colores.length); c++) {
        fotos[`${m}|${c}`] = fotosDe(p, { modelo: modelos[m], color: colores[c] }).slice(0, MAX_FOTOS);
      }
    }
    return { id: p.id, orden, nombre: p.nombre, categoria: p.categoria || "", estado: p.estado || "",
             precio: p.precio, stock: 0, modelos, colores, fotos };
  }

  // Lee lo que el cliente eligió en un cuadrito → { cantidad: 2, modelo: "3", ... }
  function leerSeleccion(p) {
    let sel = {};
    p.campos.forEach(c => {
      let el = document.getElementById(`${c.id}-${p.id}`);
      sel[c.id] = el ? el.value : "";
    });
    return sel;
  }

  // Lista de fotos para la selección actual
  function fotosDe(p, sel) {
    return typeof p.imagenes === "function" ? p.imagenes(sel) : p.imagenes;
  }

  // Valor inicial de cada campo (para calcular la primera foto)
  function seleccionInicial(p) {
    let sel = {};
    p.campos.forEach(c => {
      sel[c.id] = c.valor !== undefined ? c.valor
                : (c.opciones ? c.opciones[0] : "");
    });
    return sel;
  }

  // HTML de un campo
  function htmlCampo(p, c) {
    let idEl = `${c.id}-${p.id}`;
    let control = "";

    if (c.tipo === "select") {
      let opts = c.opciones.map(o =>
        `<option${o === c.valor ? " selected" : ""}>${esc(o)}</option>`
      ).join("");
      control = `<select id="${idEl}" onchange="cambiarImagen(${p.id})">${opts}</select>`;
    } else if (c.tipo === "numero") {
      control = `<input type="number" id="${idEl}" value="${c.valor ?? 1}"` +
                (c.min !== undefined ? ` min="${c.min}"` : "") +
                (c.max !== undefined ? ` max="${c.max}"` : "") + `>`;
    } else {
      control = `<input type="text" id="${idEl}" value="${esc(c.valor ?? "")}"` +
                (c.placeholder ? ` placeholder="${esc(c.placeholder)}"` : "") + `>`;
    }

    return `
      <label>${esc(c.etiqueta)}:</label>
      ${control}<br><br>`;
  }

  function dibujarProducto(p) {

    let fotos = fotosDe(p, seleccionInicial(p));

    let div = document.createElement("div");
    div.className = "producto" + (p.estado === "agotado" ? " agotado" : "");
    div.dataset.id = p.id;
    div.dataset.cat = p.categoria || "";

    let etiqueta = p.estado === "nuevo" ? `<span class="etiqueta-prod nuevo">NUEVO</span>`
                 : p.estado === "agotado" ? `<span class="etiqueta-prod agotado">AGOTADO</span>` : "";

    div.innerHTML = `
      ${etiqueta}
      <h3>${esc(p.nombre)}</h3>
      <p>💰 $${p.precio.toLocaleString()}</p>

      <img id="img-${p.id}"
           src="${esc(fotos[0])}"
           data-foto2="${esc(fotos[1] || "")}"
           data-foto3="${esc(fotos[2] || "")}"
           width="120"><br><br>
      ${p.campos.map(c => htmlCampo(p, c)).join("")}
      <button onclick="agregar(${p.id})"${p.estado === "agotado" ? " disabled" : ""}>${p.estado === "agotado" ? "Agotado" : esc(p.boton || "Agregar")}</button>
    `;

    contenedor.appendChild(div);

    // Si la foto no existe para esa combinación → "sin stock"
    if (typeof p.imagenes === "function") {
      document.getElementById(`img-${p.id}`).onerror = marcarSinStock(p.id);
    }

    // Botones solo para el administrador
    if (usuario && modo === "firebase") {
      let be = document.createElement("button");
      be.type = "button";
      be.className = "btn-secundario";
      be.textContent = "Editar";
      be.onclick = () => abrirFormulario(docs.find(d => d.id === p.id));
      div.appendChild(be);

      let bx = document.createElement("button");
      bx.type = "button";
      bx.className = "btn-borrar-producto";
      bx.textContent = "Eliminar";
      bx.onclick = () => eliminarProducto(p.id);
      div.appendChild(bx);
    }
  }

  function marcarSinStock(id) {
    return function () {
      let img = document.getElementById(`img-${id}`);
      img.onerror = null;
      img.src = "img/sinstock.png";
      img.dataset.foto2 = "";
      img.dataset.foto3 = "";
    };
  }

  window.cambiarImagen = function(id) {
    let producto = productos.find(p => p.id === id);

    // Productos con fotos fijas: no hay nada que cambiar
    if (typeof producto.imagenes !== "function") return;

    let fotos = producto.imagenes(leerSeleccion(producto));
    let img = document.getElementById(`img-${id}`);

    img.onerror = marcarSinStock(id);
    img.src = fotos[0];
    img.dataset.foto2 = fotos[1] || "";
    img.dataset.foto3 = fotos[2] || "";
  };

  // Botones de categorías (solo si hay 2 o más)
  function dibujarCategorias() {
    let barra = document.getElementById("categorias");
    if (!barra) {
      barra = document.createElement("div");
      barra.id = "categorias";
      contenedor.parentNode.insertBefore(barra, contenedor);
    }

    let cats = [...new Set(productos.map(p => p.categoria).filter(Boolean))];
    if (!cats.includes(categoriaActiva)) categoriaActiva = "";
    barra.innerHTML = "";
    if (cats.length < 2) { barra.style.display = "none"; return; }
    barra.style.display = "flex";

    ["", ...cats].forEach(c => {
      let b = document.createElement("button");
      b.type = "button";
      b.className = "chip-cat" + (c === categoriaActiva ? " activa" : "");
      b.textContent = c || "Todos";
      b.onclick = () => {
        categoriaActiva = c;
        barra.querySelectorAll(".chip-cat").forEach(x => x.classList.toggle("activa", x === b));
        buscarProducto();
      };
      barra.appendChild(b);
    });
  }

  function renderizarTodo() {
    contenedor.innerHTML = "";
    productos.forEach(dibujarProducto);
    dibujarCategorias();
    ordenarProductos();
    buscarProducto();
  }

  // ============================================================
  // 🔹 CARGA DE PRODUCTOS
  // ============================================================
  async function cargarProductos() {
    contenedor.innerHTML = `<p class="cargando">Cargando productos...</p>`;

    let lista = null;
    if (hayAlmacen()) {
      try { lista = await conTiempo(window.Almacen.listar(), 8000); }
      catch (e) { console.warn("No se pudo leer Firebase:", e); }
    }

    if (lista && lista.length) {
      modo = "firebase";
      docs = lista.sort((a, b) => (a.orden ?? a.id) - (b.orden ?? b.id));
      productos = docs.map(construirProducto);
    } else {
      modo = lista ? "vacio" : "base";
      docs = [];
      productos = productosBase;
    }

    renderizarTodo();
    actualizarMenu();
  }

  // ============================================================
  // 🔹 ADMINISTRADOR: login, menú ⋮, agregar / editar / eliminar
  // ============================================================

  // Reduce la foto para que cargue rápido (800px, JPG)
  function comprimirImagen(file) {
    return new Promise((resolve, reject) => {
      let lector = new FileReader();
      lector.onerror = reject;
      lector.onload = () => {
        let im = new Image();
        im.onerror = reject;
        im.onload = () => {
          let k = Math.min(1, 800 / Math.max(im.width, im.height));
          let cv = document.createElement("canvas");
          cv.width = Math.round(im.width * k);
          cv.height = Math.round(im.height * k);
          let cx = cv.getContext("2d");
          cx.fillStyle = "#fff";
          cx.fillRect(0, 0, cv.width, cv.height);
          cx.drawImage(im, 0, 0, cv.width, cv.height);
          resolve(cv.toDataURL("image/jpeg", 0.8));
        };
        im.src = lector.result;
      };
      lector.readAsDataURL(file);
    });
  }

  function dataURLaBlob(u) {
    let [cab, datos] = u.split(",");
    let tipo = cab.match(/:(.*?);/)[1];
    let bin = atob(datos);
    let bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: tipo });
  }

  // ---------- login ----------
  function abrirLogin() {
    if (!hayAlmacen() || usuario) return;
    $("lg-msg").textContent = "";
    $("lg-pass").value = "";
    $("modalLogin").style.display = "flex";
    $("lg-email").focus();
  }

  function cerrarLogin() { $("modalLogin").style.display = "none"; }

  function revisarHash() {
    if (location.hash === "#admin" && !usuario) abrirLogin();
  }

  async function entrar() {
    let email = $("lg-email").value.trim();
    let clave = $("lg-pass").value;
    if (!email || !clave) { $("lg-msg").textContent = "Completá email y contraseña."; return; }

    $("lg-msg").textContent = "Entrando...";
    try {
      await window.Almacen.login(email, clave);
      cerrarLogin();
      history.replaceState(null, "", location.pathname + location.search);
    } catch (e) {
      $("lg-msg").textContent = mensajeError(e);
    }
  }

  // ---------- menú ⋮ ----------
  function actualizarMenu() {
    let viejo = document.querySelector(".menu-admin");
    if (viejo) viejo.remove();
    if (!usuario) return;

    let items = [];
    if (modo === "firebase") items.push(["agregar", "➕ Agregar producto"]);
    if (modo === "vacio")    items.push(["importar", "⬆ Importar productos actuales"]);
    if (modo === "base")     items.push(["nada", "⚠ Sin conexión con Firebase"]);
    items.push(["salir", "🚪 Cerrar sesión"]);

    let menu = document.createElement("div");
    menu.className = "menu-admin";
    menu.innerHTML = `
      <button type="button" class="menu-puntos" aria-label="Opciones">&#8942;</button>
      <div class="menu-opciones">
        ${items.map(([acc, txt]) => `<a href="#" data-acc="${acc}">${txt}</a>`).join("")}
      </div>`;
    document.querySelector(".nav-container").appendChild(menu);

    let opciones = menu.querySelector(".menu-opciones");
    menu.querySelector(".menu-puntos").onclick = e => {
      e.stopPropagation();
      opciones.classList.toggle("abierto");
    };
    opciones.onclick = e => {
      let acc = e.target.dataset.acc;
      if (!acc) return;
      e.preventDefault();
      opciones.classList.remove("abierto");
      if (acc === "agregar") abrirFormulario(null);
      if (acc === "importar") importarProductos();
      if (acc === "salir") window.Almacen.logout();
    };
  }

  async function importarProductos() {
    if (!confirm("Esto sube los productos actuales a Firebase para poder editarlos. Se hace una sola vez. ¿Continuar?")) return;
    try {
      await window.Almacen.guardarVarios(productosBase.map(p => aDocumento(p, p.id)));
      await cargarProductos();
      alert("Listo. Ahora podés editar cada producto con el botón Editar.");
    } catch (e) {
      alert(mensajeError(e));
    }
  }

  async function eliminarProducto(id) {
    if (!confirm("¿Eliminar este producto para todos?")) return;
    try {
      await window.Almacen.borrar(id);
    } catch (e) {
      return alert(mensajeError(e));
    }
    docs = docs.filter(d => d.id !== id);
    if (docs.length) {
      productos = docs.map(construirProducto);
    } else {
      modo = "vacio";
      productos = productosBase;
    }
    renderizarTodo();
    actualizarMenu();
  }

  // ---------- cartel Agregar / Editar producto ----------
  function dibujarCasillas(tipo) {       // tipo: "colores" | "modelos"
    let n = parseInt($(`np-n${tipo}`).value);
    let etq = tipo === "colores" ? "Color" : "Modelo";
    let caja = $(`np-${tipo}`);
    let previos = [...caja.querySelectorAll("input")].map(i => i.value);
    caja.innerHTML = "";
    for (let i = 0; i < n; i++) {
      let inp = document.createElement("input");
      inp.type = "text";
      inp.placeholder = `${etq} ${i + 1}: escribí el ${etq.toLowerCase()}`;
      inp.value = previos[i] || "";
      inp.oninput = actualizarEtiquetas;
      caja.appendChild(inp);
    }
  }

  function nombresDe(tipo) {
    let etq = tipo === "colores" ? "Color" : "Modelo";
    return [...$(`np-${tipo}`).querySelectorAll("input")]
      .map((i, k) => i.value.trim() || `${etq} ${k + 1}`);
  }

  // Una fila de fotos por cada combinación modelo × color
  function dibujarFotos() {
    let nm = Math.max(1, parseInt($("np-nmodelos").value));
    let nc = Math.max(1, parseInt($("np-ncolores").value));
    let caja = $("np-fotos");
    caja.innerHTML = "";

    for (let m = 0; m < nm; m++) {
      for (let c = 0; c < nc; c++) {
        let key = `${m}|${c}`;
        let fila = document.createElement("div");
        fila.className = "np-fila";
        fila.dataset.m = m;
        fila.dataset.c = c;
        fila.innerHTML = `
          <label class="np-etq"></label>
          <div class="np-miniaturas"></div>
          <button type="button" class="btn-secundario np-add">＋ Agregar foto</button>
          <input type="file" accept="image/*" multiple style="display:none">`;
        caja.appendChild(fila);

        let archivo = fila.querySelector("input");
        fila.querySelector(".np-add").onclick = () => {
          if ((fotosNP[key] || []).length >= MAX_FOTOS) {
            alert(`Máximo ${MAX_FOTOS} fotos por combinación`);
            return;
          }
          archivo.click();
        };
        archivo.onchange = async () => {
          let lista = fotosNP[key] = fotosNP[key] || [];
          let libres = MAX_FOTOS - lista.length;
          let elegidas = [...archivo.files];
          if (elegidas.length > libres) alert(`Solo entran ${libres} foto(s) más en esta combinación.`);
          for (let f of elegidas.slice(0, libres)) {
            try { lista.push(await comprimirImagen(f)); }
            catch (e) { alert("No se pudo leer la foto " + f.name); }
          }
          archivo.value = "";
          dibujarMiniaturas(fila, key);
        };
        dibujarMiniaturas(fila, key);
      }
    }
    actualizarEtiquetas();
  }

  function dibujarMiniaturas(fila, key) {
    let caja = fila.querySelector(".np-miniaturas");
    let lista = fotosNP[key] || [];
    caja.innerHTML = "";
    lista.forEach((src, i) => {
      let s = document.createElement("span");
      s.className = "np-mini";
      s.innerHTML = `<img src="${esc(src)}" alt=""><b title="Quitar">✕</b>`;
      s.querySelector("b").onclick = () => { lista.splice(i, 1); dibujarMiniaturas(fila, key); };
      caja.appendChild(s);
    });
    fila.querySelector(".np-add").textContent = `＋ Agregar foto (${lista.length}/${MAX_FOTOS})`;
  }

  function actualizarEtiquetas() {
    let modelos = nombresDe("modelos");
    let colores = nombresDe("colores");
    $("np-fotos").querySelectorAll(".np-fila").forEach(f => {
      let partes = [];
      if (modelos.length) partes.push(modelos[f.dataset.m]);
      if (colores.length) partes.push(colores[f.dataset.c]);
      f.querySelector(".np-etq").textContent = partes.length ? partes.join(" · ") : "Fotos del producto";
    });
  }

  // d = producto a editar (o null para uno nuevo)
  function abrirFormulario(d) {
    editando = d;
    fotosNP = {};
    $("np-titulo").textContent = d ? "Editar Producto" : "Agregar Producto";
    $("np-guardar").textContent = d ? "Guardar cambios" : "Guardar producto";
    $("np-nombre").value = d ? d.nombre : "";
    $("np-precio").value = d ? d.precio : "";
    $("np-stock").value = d && d.stock ? d.stock : "";
    $("np-categoria").value = d ? (d.categoria || "") : "";
    $("np-estado").value = d ? (d.estado || "") : "";
    $("np-cats").innerHTML = [...new Set(docs.map(x => x.categoria).filter(Boolean))]
      .map(c => `<option value="${esc(c)}">`).join("");
    $("np-ncolores").value = String(d ? d.colores.length : 0);
    $("np-nmodelos").value = String(d ? d.modelos.length : 0);
    $("np-colores").innerHTML = "";
    $("np-modelos").innerHTML = "";
    dibujarCasillas("colores");
    dibujarCasillas("modelos");

    if (d) {
      d.colores.forEach((v, i) => { $("np-colores").querySelectorAll("input")[i].value = v; });
      d.modelos.forEach((v, i) => { $("np-modelos").querySelectorAll("input")[i].value = v; });
      Object.keys(d.fotos).forEach(k => { fotosNP[k] = d.fotos[k].slice(); });
    }

    dibujarFotos();
    $("modalProducto").style.display = "flex";
    $("np-nombre").focus();
  }

  function cerrarFormulario() { $("modalProducto").style.display = "none"; }

  async function guardarFormulario() {
    let nombre = $("np-nombre").value.trim();
    let precio = parseFloat($("np-precio").value);
    let stock = $("np-stock").value ? parseInt($("np-stock").value) : 0;

    if (!nombre) return alert("Escribí el nombre del producto");
    if (isNaN(precio) || precio < 0) return alert("Escribí un precio válido");
    if ($("np-stock").value && !(stock >= 1)) return alert("La cantidad disponible debe ser 1 o más");

    // Colores y modelos: sin casillas vacías ni repetidas
    let listas = {};
    for (let tipo of ["colores", "modelos"]) {
      let vals = [...$(`np-${tipo}`).querySelectorAll("input")].map(i => i.value.trim());
      if (vals.some(v => !v)) return alert(`Completá todos los ${tipo} (o elegí menos)`);
      let minus = vals.map(v => v.toLowerCase());
      if (new Set(minus).size !== minus.length) return alert(`Hay ${tipo} repetidos`);
      listas[tipo] = vals;
    }

    // Solo se guardan fotos de combinaciones que existen
    let nm = Math.max(1, listas.modelos.length);
    let nc = Math.max(1, listas.colores.length);
    let fotos = {}, sinFoto = 0, total = 0;
    for (let m = 0; m < nm; m++) {
      for (let c = 0; c < nc; c++) {
        let l = fotosNP[`${m}|${c}`] || [];
        if (l.length) { fotos[`${m}|${c}`] = l; total++; }
        else sinFoto++;
      }
    }
    if (!total) return alert("Agregá al menos una foto");
    if (sinFoto && !confirm(`${sinFoto} combinación(es) no tienen foto y figurarán como "sin stock". ¿Continuar?`)) return;

    // Las fotos nuevas (todavía en la compu) se suben a Cloudinary
    let pendientes = [];
    Object.values(fotos).forEach(lista =>
      lista.forEach((src, i) => { if (src.startsWith("data:")) pendientes.push({ lista, i }); }));

    if (pendientes.length && !window.Almacen.fotosConfiguradas) {
      return alert("Falta configurar Cloudinary en firebase-config.js (ver la guía).");
    }

    let btn = $("np-guardar");
    let textoBtn = btn.textContent;
    btn.disabled = true;

    try {
      for (let k = 0; k < pendientes.length; k++) {
        btn.textContent = `Subiendo fotos ${k + 1}/${pendientes.length}...`;
        let { lista, i } = pendientes[k];
        lista[i] = await window.Almacen.subirFoto(dataURLaBlob(lista[i]));
      }

      btn.textContent = "Guardando...";
      let id = editando ? editando.id : Date.now();
      let d = {
        id, orden: editando ? (editando.orden ?? editando.id) : id,
        nombre, precio, stock,
        categoria: $("np-categoria").value.trim(), estado: $("np-estado").value,
        modelos: listas.modelos, colores: listas.colores, fotos
      };
      await window.Almacen.guardar(d);

      docs = docs.filter(x => x.id !== id).concat(d)
                 .sort((a, b) => (a.orden ?? a.id) - (b.orden ?? b.id));
      productos = docs.map(construirProducto);
      renderizarTodo();
      cerrarFormulario();
    } catch (e) {
      alert(mensajeError(e));
    } finally {
      btn.disabled = false;
      btn.textContent = textoBtn;
    }
  }

  // Crea las ventanas (login y producto) una sola vez
  function crearModales() {
    let nums = n => Array.from({ length: n + 1 }, (_, i) => i);
    let selCant = (id, singular, plural) =>
      `<select id="${id}">` + nums(MAX_OPCIONES).map(i =>
        `<option value="${i}">${i === 0 ? "Sin " + plural : i + " " + (i === 1 ? singular : plural)}</option>`
      ).join("") + `</select>`;

    let login = document.createElement("div");
    login.id = "modalLogin";
    login.innerHTML = `
      <div class="tarjeta cartel-producto cartel-login">
        <h3>Acceso administrador</h3>
        <label>Email:</label>
        <input type="text" id="lg-email" autocomplete="username" inputmode="email">
        <label>Contraseña:</label>
        <input type="password" id="lg-pass" autocomplete="current-password">
        <p id="lg-msg"></p>
        <button type="button" id="lg-entrar">Entrar</button>
        <button type="button" id="lg-cancelar" class="btn-secundario">Cancelar</button>
      </div>`;
    document.body.appendChild(login);

    let modal = document.createElement("div");
    modal.id = "modalProducto";
    modal.innerHTML = `
      <div class="tarjeta cartel-producto">
        <h3 id="np-titulo">Agregar Producto</h3>

        <label>Nombre:</label>
        <input type="text" id="np-nombre" placeholder="Ej: Anillo Luna">

        <label>Precio:</label>
        <input type="number" id="np-precio" min="0" placeholder="Ej: 20000">

        <label>Categoría:</label>
        <input type="text" id="np-categoria" list="np-cats" placeholder="Ej: Anillos">
        <datalist id="np-cats"></datalist>

        <label>Etiqueta:</label>
        <select id="np-estado">
          <option value="">Ninguna</option>
          <option value="nuevo">Nuevo</option>
          <option value="agotado">Agotado</option>
        </select>

        <label>Cantidad disponible:</label>
        <input type="number" id="np-stock" min="1" placeholder="Vacío = sin límite">

        <label>Opción color:</label>
        ${selCant("np-ncolores", "color", "colores")}
        <div id="np-colores"></div>

        <label>Opción modelo:</label>
        ${selCant("np-nmodelos", "modelo", "modelos")}
        <div id="np-modelos"></div>

        <label>Fotos (máx. ${MAX_FOTOS} por combinación):</label>
        <div id="np-fotos"></div>

        <button type="button" id="np-guardar">Guardar producto</button>
        <button type="button" id="np-cancelar" class="btn-secundario">Cancelar</button>
      </div>`;
    document.body.appendChild(modal);

    $("lg-entrar").onclick = entrar;
    $("lg-cancelar").onclick = () => { cerrarLogin(); history.replaceState(null, "", location.pathname + location.search); };
    $("lg-pass").onkeydown = e => { if (e.key === "Enter") entrar(); };
    login.onclick = e => { if (e.target === login) cerrarLogin(); };

    $("np-ncolores").onchange = () => { dibujarCasillas("colores"); dibujarFotos(); };
    $("np-nmodelos").onchange = () => { dibujarCasillas("modelos"); dibujarFotos(); };
    $("np-cancelar").onclick = cerrarFormulario;
    $("np-guardar").onclick = guardarFormulario;
    modal.onclick = e => { if (e.target === modal) cerrarFormulario(); };

    // El menú ⋮ se cierra al hacer clic afuera
    document.addEventListener("click", () => {
      let o = document.querySelector(".menu-opciones");
      if (o) o.classList.remove("abierto");
    });
  }

  // ============================================================
  // 🔹 ARRANQUE
  // ============================================================
  // Foto del local → abre Google Maps (se configura en firebase-config.js)
  function dibujarLocal() {
    let cont = document.getElementById("local-contenedor");
    let l = (window.ROSE_CONFIG || {}).local;
    if (!cont || !l || !l.mostrar) return;
    if (!/^https?:\/\//.test(l.mapa || "")) return;   // solo links válidos

    cont.innerHTML = `
      <a class="local-mapa" href="${esc(l.mapa)}" target="_blank" rel="noopener"
         title="Abrir ubicación en Google Maps">
        <img src="${esc(l.foto || "img/local.jpg")}" alt="Foto del local ROSE">
        <span class="local-titulo">${esc(l.titulo || "")}</span>
      </a>
      <p class="local-ayuda">${esc(l.ayuda || "")}</p>`;
  }

  async function iniciar() {
    if (hayAlmacen()) crearModales();
    await cargarProductos();

    if (hayAlmacen()) {
      let primera = true;
      window.Almacen.onAuth(u => {
        let cambio = !!u !== !!usuario;
        usuario = u;
        actualizarMenu();
        if (cambio) renderizarTodo();
        if (primera) { primera = false; if (!u) revisarHash(); }
      });
      window.addEventListener("hashchange", revisarHash);
    }
  }

  // 🔹 ORDENAR (A-Z, Z-A, precio) — solo reordena los cuadritos,
  // no borra lo que el cliente ya eligió en cada uno.
  function ordenarProductos() {
    let criterio = document.getElementById("ordenar").value;

    let lista = [...productos];

    if (criterio === "az") {
      lista.sort((a, b) => a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" }));
    } else if (criterio === "za") {
      lista.sort((a, b) => b.nombre.localeCompare(a.nombre, "es", { sensitivity: "base" }));
    } else if (criterio === "precio-asc") {
      lista.sort((a, b) => a.precio - b.precio);
    } else if (criterio === "precio-desc") {
      lista.sort((a, b) => b.precio - a.precio);
    }
    // "original" → queda el orden en que están escritos arriba

    lista.forEach(p => {
      let tarjeta = contenedor.querySelector(`.producto[data-id="${p.id}"]`);
      if (tarjeta) contenedor.appendChild(tarjeta);
    });
  }

  // 🔹 AGREGAR AL CARRITO
  window.agregar = function(id) {
    let img = document.getElementById(`img-${id}`).src;

    if (img.includes("sinstock.png")) {
      alert("❌ No disponible en esa combinación");
      return;
    }

    let producto = productos.find(p => p.id === id);
    if (producto.estado === "agotado") {
      alert("Este producto está agotado");
      return;
    }
    let sel = leerSeleccion(producto);

    let cant = producto.campos.some(c => c.id === "cantidad")
      ? parseInt(sel.cantidad) : 1;

    if (!cant || cant < 1) {
      alert("Ingresá una cantidad válida");
      return;
    }

    let campoCant = producto.campos.find(c => c.id === "cantidad");
    if (campoCant && campoCant.max && cant > campoCant.max) {
      alert(`Solo hay ${campoCant.max} disponibles`);
      return;
    }

    // Todo lo que no sea cantidad se guarda como detalle (con su etiqueta)
    let detalles = producto.campos
      .filter(c => c.id !== "cantidad")
      .map(c => ({ etiqueta: c.etiqueta, valor: sel[c.id] }));

    carrito.push({
      producto: producto.nombre,
      detalles,
      cantidad: cant,
      precio: producto.precio
    });

    actualizarCarrito();
  };

  // 🔹 CARRITO
  function actualizarCarrito() {
    let lista = document.getElementById("carrito");
    lista.innerHTML = "";

    let total = 0;

    carrito.forEach((item, index) => {
      let subtotal = item.precio * item.cantidad;
      total += subtotal;

      let li = document.createElement("li");
      li.innerHTML = `
        ${esc(item.producto)} | ${item.detalles.map(d => esc(d.valor)).join(" | ")} | x${item.cantidad} | $${subtotal}
        <button onclick="eliminar(${index})">❌</button>
      `;

      lista.appendChild(li);
    });

    let totalHTML = document.createElement("h3");
    totalHTML.textContent = "Total: $" + total.toLocaleString();
    lista.appendChild(totalHTML);
  }

  // 🔹 ELIMINAR
  window.eliminar = function(index) {
    carrito.splice(index, 1);
    actualizarCarrito();
  };

  // 🔹 COMPRAR
  window.comprar = function() {

    let tipo = document.getElementById("envio").value;

    if (carrito.length === 0) {
      alert("Carrito vacío");
      return;
    }

    let mensaje = "🛒 *Nuevo Pedido*%0A%0A";

    if (tipo === "retiro") {
      let nombre = document.getElementById("nombre").value;
      let apellido = document.getElementById("apellido").value;
      let dni = document.getElementById("dni").value;
      let telefono = document.getElementById("telefono").value;
      let email = document.getElementById("email").value;

      if (!nombre || !apellido || !dni || !telefono || !email) {
        alert("Completá todos los datos");
        return;
      }

      mensaje += "🏪 Retiro en persona%0A%0A";
      mensaje += `👤 ${enc(nombre)} ${enc(apellido)}%0A`;
      mensaje += `🪪 DNI: ${enc(dni)}%0A`;
      mensaje += `📞 ${enc(telefono)}%0A`;
      mensaje += `📧 ${enc(email)}%0A%0A`;
    } else {
      let nombre = document.getElementById("nombreEnvio").value;
      let apellido = document.getElementById("apellidoEnvio").value;
      let direccion = document.getElementById("direccion").value;
      let ciudad = document.getElementById("ciudad").value;
      let provincia = document.getElementById("provincia").value;
      let pais = document.getElementById("pais").value;
      let codigoPostal = document.getElementById("codigoPostal").value;
      let telefono = document.getElementById("telefonoEnvio").value;

      if (!nombre || !apellido || !direccion || !ciudad || !provincia || !pais || !codigoPostal || !telefono) {
        alert("Completá todos los datos");
        return;
      }

      mensaje += "🚚 Envío a domicilio%0A%0A";
      mensaje += `👤 ${enc(nombre)} ${enc(apellido)}%0A`;
      mensaje += `📍 ${enc(direccion)}%0A`;
      mensaje += `🏙 ${enc(ciudad)}%0A`;
      mensaje += `🌎 ${enc(provincia)} - ${enc(pais)}%0A`;
      mensaje += `📮 CP: ${enc(codigoPostal)}%0A`;
      mensaje += `📞 ${enc(telefono)}%0A%0A`;
    }

    mensaje += "*Productos:*%0A";

    let total = 0;

    carrito.forEach(item => {
      let subtotal = item.precio * item.cantidad;
      total += subtotal;

      mensaje += `- ${encodeURIComponent(item.producto)} | ${item.detalles.map(d => encodeURIComponent(d.etiqueta + ": " + d.valor)).join(" | ")} | x${item.cantidad} | $${subtotal}%0A`;
    });

    mensaje += `%0A💰 Total: $${total}`;
    let numero = "5493492283696";
    let url = `https://wa.me/${numero}?text=${mensaje}`;

    window.open(url, "_blank");

    carrito = [];
    actualizarCarrito();
    mostrarConfirmacion(url);
  };

  // Mensaje después de ordenar (con enlace por si el celular bloquea la ventana)
  function mostrarConfirmacion(url) {
    let m = document.getElementById("modalPedido");
    if (!m) {
      m = document.createElement("div");
      m.id = "modalPedido";
      m.innerHTML = `
        <div class="tarjeta cartel-producto cartel-login">
          <h3>¡Pedido listo! 🎉</h3>
          <p>Se abrió WhatsApp con tu pedido.<br>Tocá <strong>Enviar</strong> para confirmarlo.</p>
          <p class="pedido-ayuda">¿No se abrió?</p>
          <a id="pedido-link" target="_blank" rel="noopener">Abrir WhatsApp</a>
          <button type="button" id="pedido-cerrar" class="btn-secundario">Cerrar</button>
        </div>`;
      document.body.appendChild(m);
      m.onclick = e => { if (e.target === m) m.style.display = "none"; };
      document.getElementById("pedido-cerrar").onclick = () => { m.style.display = "none"; };
    }
    document.getElementById("pedido-link").href = url;
    m.style.display = "flex";
  }

  // 🔹 EXPORTAR
  window.mostrarHome = mostrarHome;
  window.mostrarContacto = mostrarContacto;
  window.buscarProducto = buscarProducto;
  window.toggleEnvio = toggleEnvio;
  window.ordenarProductos = ordenarProductos;

  toggleEnvio();
  dibujarLocal();

  iniciar();
});