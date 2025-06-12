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
      // Sistema de recompensas
      this.kills = 0;
      this.rewards = 0;
      this.rewardPerKill = 0.04; // SOL por kill
      this.entryFee = 0.05;      // SOL de entrada (simulado)
  }

  newPlayer() {
    // Mostrar popup de pago de entrada
    this.showEntryFeePopup();
  }

  // Función para mostrar el popup de pago de entrada
  showEntryFeePopup() {
    const popup = document.createElement('div');
    popup.className = 'entry-fee-popup';
    
    const content = document.createElement('div');
    content.className = 'entry-fee-content';
    
    content.innerHTML = `
      <h2>Entry Fee</h2>
      <p>Pagarás <span class="sol-amount">${this.entryFee} SOL</span> para jugar</p>
      <small>(simulado)</small>
      <button id="payEntryFeeBtn" class="entry-fee-btn">Aceptar</button>
    `;
    
    popup.appendChild(content);
    document.body.appendChild(popup);
    
    // Añadir evento al botón
    document.getElementById('payEntryFeeBtn').addEventListener('click', () => {
      document.body.removeChild(popup);
      // Crear el contador de kills
      this.createKillsCounter();
      // Conectar con el servidor
      socket.emit('new player');
    });
  }
  
  // Función para crear el contador de kills
  createKillsCounter() {
    const killsCounter = document.createElement('div');
    killsCounter.id = 'killsCounter';
    killsCounter.className = 'kills-counter';
    killsCounter.innerHTML = `Kills: <span class="kill-count">0</span> | Rewards: <span class="sol-amount">0.00 SOL</span>`;
    document.body.appendChild(killsCounter);
  }
  
  // Función para añadir una kill y actualizar recompensas
  addKill() {
    this.kills++;
    this.rewards = parseFloat((this.kills * this.rewardPerKill).toFixed(2));
    this.updateKillsDisplay();
    this.showKillNotification();
  }
  
  // Función para actualizar el display de kills y recompensas
  updateKillsDisplay() {
    const killsCounter = document.getElementById('killsCounter');
    if (killsCounter) {
      killsCounter.innerHTML = `Kills: <span class="kill-count">${this.kills}</span> | Rewards: <span class="sol-amount">${this.rewards.toFixed(2)} SOL</span>`;
    }
  }
  
  // Función para mostrar notificación de kill
  showKillNotification() {
    const notification = document.createElement('div');
    notification.className = 'kill-notification';
    notification.textContent = `+1 KILL (+${this.rewardPerKill} SOL)`;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.classList.add('show');
      
      setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
          if (notification.parentNode === document.body) {
            document.body.removeChild(notification);
          }
        }, 500);
      }, 2000);
    }, 100);
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
        // Mostrar el mensaje con las recompensas ganadas
        let message = `Has sido eliminado!\n\nKills: ${controller.kills}\nRecompensa: ${controller.rewards.toFixed(2)} SOL (simulado)`;
        window.alert(message);
        window.location.href='/';
      }, 1500);
    });
  }
  
  // Escuchar eventos de kill
  listenToKill() {
    socket.on('kill', function(killerName) {
      if (killerName === currentPlayer.name) {
        controller.addKill();
      }
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
    
    for (var i = 0; i < this.heightInSquares; i++) {
      this.square[i] = [];
      for (var j = 0; j < this.widthInSquares; j++) {
        this.square[i][j] = new Terrain('static/client/sprites/grass.png');
      }
    }
  }
}

class Player {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.xAbsolute = 0;
    this.yAbsolute = 0;
    this.direction = 0;
    this.health = 0;
    this.name = '';
    this.weaponType = 'pistol';
    this.color = 'red'; // Color por defecto
  }
}

class CurrentPlayer extends Player {
  constructor() {
    super();
    this.xAbsolute = 0;
    this.yAbsolute = 0;
    this.viewDirectionX = 0;
    this.viewDirectionY = 0;
  }
}

class Bullet {
  constructor(xArg, yArg, directionArg) {
    this.x = xArg;
    this.y = yArg;
    this.direction = directionArg;
  }
}

class Entry {
  constructor(name, socketId, score) {
    this.name = name;
    this.socketId = socketId;
    this.score = score;
  }
}
