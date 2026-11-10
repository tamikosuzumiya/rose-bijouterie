const express = require("express");
const app = express();

app.use(express.json());

app.post("/pedido", (req, res) => {
  let pedido = req.body;

  console.log("Pedido recibido:", pedido);

  // Enviar al microcontrolador
  enviarAlESP32(pedido);

  res.send("OK");
});

app.listen(3000);