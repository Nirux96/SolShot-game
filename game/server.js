'use strict';

let Model =  require ('./static/server/Model.js');
let model = new Model();
let express = require('express');
let http = require('http');
let path = require('path');
let socketIO = require('socket.io');

let app = express();
let server = http.Server(app);
let io = socketIO(server);

let bodyParser = require('body-parser');
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

const PORT = process.env.PORT || 54071;
app.set('port', PORT);
app.use('/static', express.static(__dirname + '/static'));


// Routing
app.get('/', function(req, res) {
  res.sendFile(path.join(__dirname, '../index.html'));

});

app.get('/menu.css', function(req, res) {
  res.sendFile(path.join(__dirname + '/../menu.css'));
});

app.get('/help.html', function(req, res) {
  res.sendFile(path.join(__dirname + '/../help.html'));
});

app.get('/img/mouse.png', function(req, res) {
  res.sendFile(path.join(__dirname + '/../img/mouse.png'));
});

app.get('/img/wasd.jpg', function(req, res) {
  res.sendFile(path.join(__dirname + '/../img/wasd.jpg'));
});

app.post('/goGame', function(req, res) {
  res.sendFile(path.join(__dirname, '/index.html'));
  console.log(req.body);
  // Guardar nombre y color del jugador
  const playerInfo = {
    nick: req.body.nick || 'Player',
    color: req.body.playerColor || 'red' // Valor por defecto en caso de que no se elija color
  };
  playersInQueue.push(playerInfo);
});

server.listen(PORT, "0.0.0.0");
console.log('Server running on port ' + PORT);

require('dns').lookup(require('os').hostname(), function (err, add, fam) {
  console.log('addr: '+add);
})


let bulletPhysics = model.getBulletPhysics();
let players = {};
let playersInQueue = [];
let chatMessages = []; // Almacena los últimos mensajes del chat
const MAX_CHAT_MESSAGES = 10; // Máximo número de mensajes en el historial
let powerUps = []; // Almacena los power-ups activos en el mapa

// Generar power-ups periódicamente
function generatePowerUp() {
  if (powerUps.length < 10) { // Aumentamos el número máximo de power-ups en el mapa
    let x, y;
    do {
      x = Math.floor(Math.random() * 5000);
      y = Math.floor(Math.random() * 5000);
    } while (!model.map.square[Math.floor(y/50)][Math.floor(x/50)].isPassable);
    
    const types = ['speed', 'shield', 'tripleShot'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    console.log(`Power-up generado: ${type} en (${x}, ${y})`);
    
    powerUps.push({
      id: Date.now() + Math.random(),
      x: x,
      y: y,
      type: type,
      createdAt: Date.now(),
      duration: 10000, // Aumentamos la duración a 10 segundos una vez recogido
      radius: 30 // Radio para colisión
    });
  }
}

// Generar power-ups cada 5 segundos (más frecuente)
setInterval(generatePowerUp, 5000);

// Comprobar y eliminar power-ups caducados
function cleanupPowerUps() {
  const now = Date.now();
  const oldLength = powerUps.length;
  powerUps = powerUps.filter(powerUp => now - powerUp.createdAt < 30000); // Eliminar después de 30 segundos
  
  if (oldLength !== powerUps.length) {
    console.log(`Power-ups caducados eliminados. Quedan: ${powerUps.length}`);
  }
}

// Limpiar power-ups caducados cada 5 segundos
setInterval(cleanupPowerUps, 5000);

io.on('connection', function(socket) {
  socket.on('new player', function() {
    if (playersInQueue.length > 0) {
      let x, y;
      do {
        x = Math.floor(Math.random()*5000);
        y = Math.floor(Math.random()*5000);
      } while(!model.map.square[Math.floor(y/50)][Math.floor(x/50)].isPassable)

      const playerInfo = playersInQueue.shift();
      const newPlayer = model.getNewPlayer(x, y, 1500, 0, playerInfo.nick);
      
      // Añadir color al jugador
      newPlayer.color = playerInfo.color;
      
      // Añadir propiedades para power-ups
      newPlayer.powerUps = {
        speed: { active: false, endTime: 0 },
        shield: { active: false, endTime: 0 },
        tripleShot: { active: false, endTime: 0 }
      };
      
      players[socket.id] = newPlayer;
      console.log(`Player connected: ${newPlayer.name} (${newPlayer.color}) ${socket.id}`);
      model.leaderboard.addEntry(newPlayer.name, socket.id, 0);
      
      // Enviar historial de chat al nuevo jugador
      socket.emit('chat history', chatMessages);
    }
    else {
      const defaultPlayer = model.getNewPlayer(500, 500, 1500, 0, 'Player-' + Math.floor(Math.random() * 1000));
      defaultPlayer.color = 'red'; // Color por defecto
      defaultPlayer.powerUps = {
        speed: { active: false, endTime: 0 },
        shield: { active: false, endTime: 0 },
        tripleShot: { active: false, endTime: 0 }
      };
      
      players[socket.id] = defaultPlayer;
      console.log("Player connected: " + players[socket.id].name + " " + socket.id);
      model.leaderboard.addEntry(players[socket.id].name, socket.id, 0);
      
      // Enviar historial de chat al nuevo jugador
      socket.emit('chat history', chatMessages);
    }
  });

  socket.on('disconnect', function() {
    for (let i=0; i<model.leaderboard.array.length; i++) {
      if  (model.leaderboard.array[i].socketId == socket.id) {
        model.leaderboard.array.splice(i,1);
        break;
      }
    }
    delete players[socket.id];
  });

  // Manejar mensajes de chat
  socket.on('chat message', function(message) {
    if (!players[socket.id]) return;
    
    // Limitar longitud del mensaje
    const truncatedMessage = message.substring(0, 100);
    const playerName = players[socket.id].name;
    
    const chatMessage = {
      sender: playerName,
      text: truncatedMessage,
      timestamp: Date.now()
    };
    
    // Guardar mensaje en el historial
    chatMessages.push(chatMessage);
    if (chatMessages.length > MAX_CHAT_MESSAGES) {
      chatMessages.shift(); // Eliminar el mensaje más antiguo
    }
    
    // Transmitir mensaje a todos los jugadores
    io.emit('chat message', chatMessage);
  });

  socket.on('input', function(input) {
    let player = players[socket.id];
    if (!player) return; // Si el jugador no existe, ignorar el input
    
    // Comprobar power-ups activos
    const now = Date.now();
    
    // Speed boost
    if (player.powerUps.speed.active && now > player.powerUps.speed.endTime) {
      player.powerUps.speed.active = false;
    }
    
    // Shield
    if (player.powerUps.shield.active && now > player.powerUps.shield.endTime) {
      player.powerUps.shield.active = false;
    }
    
    // Triple shot
    if (player.powerUps.tripleShot.active && now > player.powerUps.tripleShot.endTime) {
      player.powerUps.tripleShot.active = false;
    }
    
    let speed = model.map.square[Math.floor((player.y)/50)][Math.floor((player.x)/50)].speed;
    
    // Aplicar boost de velocidad si está activo
    if (player.powerUps.speed.active) {
      speed *= 1.5; // 50% más rápido
    }
    
    // Aplicar daño solo si no tiene escudo activo
    if (!player.powerUps.shield.active) {
      player.health -= model.map.square[Math.floor((player.y)/50)][Math.floor((player.x)/50)].damage;
    }
    
    let oldX = player.x;
    let oldY = player.y;
    player.direction = input.direction;

    player.y = player.y - speed*input.up + speed*input.down;
    if (!model.map.square[Math.floor((player.y+25)/50)][Math.floor((player.x)/50)].isPassable || !model.map.square[Math.floor((player.y-25)/50)][Math.floor((player.x)/50)].isPassable ||
        !model.map.square[Math.floor((player.y)/50)][Math.floor((player.x+25)/50)].isPassable || !model.map.square[Math.floor((player.y)/50)][Math.floor((player.x-25)/50)].isPassable )
            player.y = oldY;

    player.x = player.x - speed*input.left + speed*input.right;
    if (!model.map.square[Math.floor((player.y+25)/50)][Math.floor((player.x)/50)].isPassable || !model.map.square[Math.floor((player.y-25)/50)][Math.floor((player.x)/50)].isPassable ||
        !model.map.square[Math.floor((player.y)/50)][Math.floor((player.x+25)/50)].isPassable || !model.map.square[Math.floor((player.y)/50)][Math.floor((player.x-25)/50)].isPassable)
          player.x = oldX;

    // Comprobar colisiones con power-ups
    for (let i = 0; i < powerUps.length; i++) {
      const powerUp = powerUps[i];
      const dx = player.x - powerUp.x;
      const dy = player.y - powerUp.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < powerUp.radius + 25) { // 25 es aproximadamente el radio del jugador
        // Aplicar efecto del power-up
        const duration = powerUp.duration;
        const endTime = Date.now() + duration;
        
        console.log(`Jugador ${player.name} recogió power-up: ${powerUp.type}`);
        
        switch(powerUp.type) {
          case 'speed':
            player.powerUps.speed.active = true;
            player.powerUps.speed.endTime = endTime;
            break;
          case 'shield':
            player.powerUps.shield.active = true;
            player.powerUps.shield.endTime = endTime;
            break;
          case 'tripleShot':
            player.powerUps.tripleShot.active = true;
            player.powerUps.tripleShot.endTime = endTime;
            break;
        }
        
        // Notificar al jugador que recogió un power-up
        socket.emit('power-up collected', {
          type: powerUp.type,
          duration: duration
        });
        
        // Eliminar el power-up del mapa
        powerUps.splice(i, 1);
        break;
      }
    }

    if (input.LMB == true) {
      if (player.powerUps.tripleShot.active) {
        // Disparo triple (uno recto y dos a los lados)
        const spreadAngle = 0.2; // ~11 grados
        player.weapon.shoot(player.x, player.y, player.direction, bulletPhysics, socket.id);
        player.weapon.shoot(player.x, player.y, player.direction + spreadAngle, bulletPhysics, socket.id);
        player.weapon.shoot(player.x, player.y, player.direction - spreadAngle, bulletPhysics, socket.id);
      } else {
        // Disparo normal
        player.weapon.shoot(player.x, player.y, player.direction, bulletPhysics, socket.id);
      }
    } else {
      player.weapon.triggered = 0;
    }
  });
});

let playerMap=[];//used to send map to players, they get only 21x17 squares
for (let i = 0; i < 17; i++) {
  playerMap[i] = [];
  for (let j = 0; j < 21; j++) {
    playerMap[i][j]='grass';
  }
}

setInterval(function() {
  bulletPhysics.checkRange();
  bulletPhysics.update(model.getMap());
  bulletPhysics.checkHits(players);
  model.getItems().checkColissions(players);


  for (let key in players) {
    let thisPlayer=players[key];
    if (!thisPlayer) continue; // Si el jugador no existe, saltar
    
    let thisPlayerAbsolute=thisPlayer;
    let emitPlayers = JSON.parse(JSON.stringify(players));
    for (let key2 in emitPlayers) {
      emitPlayers[key2].x=emitPlayers[key2].x - thisPlayer.x + 500;
      emitPlayers[key2].y=emitPlayers[key2].y - thisPlayer.y + 400;
    }

    if (io.sockets.connected[key] && thisPlayer.health <= 0) {
      if (io.sockets.connected[thisPlayer.killedBy]) {
        model.leaderboard.addPoint(thisPlayer.killedBy);
        }
      thisPlayer.dropItem(model.getItems().array);
      io.to(key).emit('death');
      io.sockets.connected[key].disconnect();
      continue;
    }

    for (let i = 0; i < 17; i++) {
      for (let j = 0; j < 21; j++) {
        playerMap[i][j]=model.map.square[Math.min(Math.max(Math.floor(players[key].y/50)-8+i , 0) , 99)]
        [Math.min(Math.max(Math.floor(players[key].x/50)-10+j , 0) , 99)].type;
      }
    }

    io.to(key).emit('update', emitPlayers, thisPlayer, thisPlayerAbsolute, playerMap, bulletPhysics.bullets, model.getItems().array, model.leaderboard.array, powerUps);
  }}, 1000 / 60);





  ////////////////////////////////////////////////////////////////////////////////
