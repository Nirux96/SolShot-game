const express = require('express');
const path = require('path');
const { spawn } = require('child_process');

// Iniciar el servidor del juego en segundo plano
const gameServer = spawn('node', ['game/server.js']);

gameServer.stdout.on('data', (data) => {
  console.log(`Game server: ${data}`);
});

gameServer.stderr.on('data', (data) => {
  console.error(`Game server error: ${data}`);
});

// Crear un servidor para el menú principal
const app = express();
const PORT = process.env.PORT || 3000;

// Servir archivos estáticos
app.use(express.static(path.join(__dirname)));

// Ruta principal muestra el menú
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Menu server running on port ${PORT}`);
}); 