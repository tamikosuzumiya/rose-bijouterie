const express = require("express");
const app = express();

app.use(express.json());

app.post("/pedido", (req, res) => {

  let pedido = req.body;

  console.log("Pedido recibido:", pedido);

  // 📦 DATOS
  let envio = pedido.envio;
  let cliente = pedido.cliente;
  let carrito = pedido.carrito;

  // 🧾 SIMULACIÓN DE IMPRESIÓN
  console.log("----- TICKET -----");

  if (envio === "si") {
    console.log("ENVÍO A DOMICILIO");
    console.log("Cliente:", cliente.nombre);
    console.log("Dirección:", cliente.direccion);
    console.log("Ciudad:", cliente.ciudad);
    console.log("CP:", cliente.codigo);
    console.log("Provincia:", cliente.provincia);
    console.log("Tel:", cliente.telefono);
  } else {
    console.log("RETIRO EN PERSONA");
  }

  console.log("Productos:");

  carrito.forEach(item => {
    console.log(
      `${item.producto} x${item.cantidad} - $${item.precio * item.cantidad}`
    );
  });

  console.log("------------------");

  // 🤖 Enviar al ESP32
  enviarAlESP32(pedido);

  res.send("OK");
});

app.listen(3000, () => {
  console.log("Servidor corriendo en http://localhost:3000");
});


// 🔥 FUNCIÓN SIMULADA (después la conectamos real)
function enviarAlESP32(pedido) {
  console.log("Enviando al ESP32:", pedido);
}