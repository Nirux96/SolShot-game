'use strict';
class Controller {
    constructor() {
      this.squareWidthInPixels = 50;
      this.squareHeightInPixels = 50;
      this.width = 1000;         // Tamaño fijo del juego
      this.height = 700;         // Tamaño fijo del juego
      this.playerSpriteWidth = 50;
      this.playerSpriteHeight = 50;
      this.mode = 'alive';
      this.padding = 50;
  }

  newPlayer() {
    socket.emit('new player');
  }

  emitInput() {
    setInterval(function() {
      socket.emit('input', input);
    }, 1000 / 60);
  }

  listenToUpdate() {
    socket.on('update', function(newPlayers, newCurrentPlayer, newAbsoluteCurrentPlayer, currentPlayerMap, bulletsArg, itemsArg, leaderboard2, powerUpsArg) {
      players = newPlayers;
      currentPlayer = newCurrentPlayer;
      leaderboard = leaderboard2;
      currentPlayer.xAbsolute = newAbsoluteCurrentPlayer.x;
      currentPlayer.yAbsolute = newAbsoluteCurrentPlayer.y;
      bullets = bulletsArg;
      items = itemsArg;
      powerUps = powerUpsArg || []; // Manejar power-ups

      for (var i = 0; i < 17; i++) {
        for (var j = 0; j < 21; j++) {
          gameMap.square[i][j].path = 'static/client/sprites/'+currentPlayerMap[i][j]+'.png';
        }
      }
      
      // Comprobar si hay power-ups activos
      if (currentPlayer.powerUps) {
        // Añadir indicadores visuales para power-ups activos
        updatePowerUpHUD();
        
        // Mostrar efectos basados en power-ups
        const now = Date.now();
        
        // Actualizar estado de los power-ups
        if (currentPlayer.powerUps.speed && currentPlayer.powerUps.speed.active && 
            currentPlayer.powerUps.speed.endTime < now) {
          currentPlayer.powerUps.speed.active = false;
          showPowerUpExpiredNotification('speed');
        }
        
        if (currentPlayer.powerUps.shield && currentPlayer.powerUps.shield.active && 
            currentPlayer.powerUps.shield.endTime < now) {
          currentPlayer.powerUps.shield.active = false;
          showPowerUpExpiredNotification('shield');
        }
        
        if (currentPlayer.powerUps.tripleShot && currentPlayer.powerUps.tripleShot.active && 
            currentPlayer.powerUps.tripleShot.endTime < now) {
          currentPlayer.powerUps.tripleShot.active = false;
          showPowerUpExpiredNotification('tripleShot');
        }
      }
    });
  }

  listenToDeath() {
    socket.on('death', function() {
      // Crear efecto de partículas al morir
      if (currentPlayer && typeof createDeathParticles === 'function') {
        const playerColor = currentPlayer.color ? 
          PLAYER_COLORS[currentPlayer.color] : 0xFF4136;
        createDeathParticles(500, 400, playerColor);
      }
      
      setTimeout(function(){ controller.mode = "dead"; }, 1000);
      setTimeout(function(){ 
        window.alert("¡Has sido eliminado! Volviendo a la página principal...");
        window.location.href='/';
      }, 1500);
    });
  }
}

// Función para mostrar notificación de power-up expirado
function showPowerUpExpiredNotification(type) {
  const notification = document.getElementById('powerUpNotification');
  let message = '';
  let color = '';
  
  switch(type) {
    case 'speed':
      message = 'Speed Boost Ended!';
      color = '#FFDC00'; // Amarillo
      break;
    case 'shield':
      message = 'Shield Down!';
      color = '#0074D9'; // Azul
      break;
    case 'tripleShot':
      message = 'Triple Shot Ended!';
      color = '#FF4136'; // Rojo
      break;
  }
  
  notification.textContent = message;
  notification.style.backgroundColor = color;
  notification.style.opacity = 0.7;
  notification.classList.add('show');
  
  // Ocultar después de unos segundos
  setTimeout(() => {
    notification.classList.remove('show');
  }, 2000);
}

// Función para actualizar el HUD de power-ups
function updatePowerUpHUD() {
  // Eliminar indicadores antiguos
  const oldIndicators = document.querySelectorAll('.power-up-indicator');
  oldIndicators.forEach(indicator => indicator.remove());
  
  if (!currentPlayer || !currentPlayer.powerUps) return;
  
  const powerUps = [
    { type: 'speed', active: currentPlayer.powerUps.speed && currentPlayer.powerUps.speed.active },
    { type: 'shield', active: currentPlayer.powerUps.shield && currentPlayer.powerUps.shield.active },
    { type: 'tripleShot', active: currentPlayer.powerUps.tripleShot && currentPlayer.powerUps.tripleShot.active }
  ];
  
  const container = document.createElement('div');
  container.className = 'power-up-indicators';
  container.style.position = 'absolute';
  container.style.bottom = '20px';
  container.style.right = '20px';
  container.style.display = 'flex';
  container.style.gap = '10px';
  container.style.zIndex = '1000';
  
  let anyActive = false;
  
  powerUps.forEach((powerUp, index) => {
    if (!powerUp.active) return;
    
    anyActive = true;
    
    const indicator = document.createElement('div');
    indicator.className = 'power-up-indicator';
    indicator.style.width = '40px';
    indicator.style.height = '40px';
    indicator.style.borderRadius = '50%';
    indicator.style.display = 'flex';
    indicator.style.alignItems = 'center';
    indicator.style.justifyContent = 'center';
    indicator.style.color = 'white';
    indicator.style.fontWeight = 'bold';
    indicator.style.fontSize = '16px';
    indicator.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';
    indicator.style.textShadow = '0 0 3px #000';
    
    let bgColor, letter;
    
    switch(powerUp.type) {
      case 'speed':
        bgColor = '#FFDC00';
        letter = 'S';
        break;
      case 'shield':
        bgColor = '#0074D9';
        letter = 'P';
        break;
      case 'tripleShot':
        bgColor = '#FF4136';
        letter = 'T';
        break;
    }
    
    indicator.style.backgroundColor = bgColor;
    indicator.textContent = letter;
    
    // Agregar efecto de pulso
    indicator.style.animation = 'pulse 2s infinite';
    
    container.appendChild(indicator);
  });
  
  if (anyActive) {
    document.body.appendChild(container);
  }
}

class GameMap  {
  constructor() {
    this.square = [];
    this.heightInSquares = 17;
    this.widthInSquares = 21;

    for (let i = 0; i < this.heightInSquares; i++) {
      this.square[i] = [];
      for (let j = 0; j < this.widthInSquares; j++) {
        this.square[i][j]=new Terrain('static/client/sprites/grass.png');
      }
    }
  }
}

class Player {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.health = 100;
    this.direction = Math.PI;
    this.name = 'null';
    this.color = 'red'; // Color por defecto
    this.powerUps = {
      speed: { active: false, endTime: 0 },
      shield: { active: false, endTime: 0 },
      tripleShot: { active: false, endTime: 0 }
    };
  }
}

class CurrentPlayer extends Player {
  constructor() {
    super();
    this.xAbsolute = 0;
    this.yAbsolute = 0;
  }
}

class Bullet {
  constructor(xArg, yArg, directionArg) {
    this.x = xArg;
    this.y = yArg;
    this.direction = directionArg;
    this.speed = 15;
    this.range = 100;
    this.distanceTraveled = 0;
  };
}

class Entry {
  constructor(name, socketId, score) {
    this.name = name;
    this.socketId = socketId;
    this.score = score;
  }
}
