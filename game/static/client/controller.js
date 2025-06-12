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
      this.killCount = 0;        // Contador de kills
      this.rewards = 0.0;        // Recompensas en SOL (simulado)
      this.entryFee = 0.05;      // Tarifa de entrada (simulado)
      this.killReward = 0.04;    // Recompensa por kill (simulado)
      this.ctx = null;
      this.map = null;
      this.nick = null;
      this.playerColor = null;
    }

    newPlayer() {
      // Recoger el nick y color del formulario o URL
      const urlParams = new URLSearchParams(window.location.search);
      let playerInfo = {
        nick: this.nick || urlParams.get('nick') || 'Player-' + Math.floor(Math.random() * 1000),
        playerColor: this.playerColor || urlParams.get('playerColor') || 'red'
      };
      
      // Enviar la información completa del jugador
      socket.emit('new player', playerInfo);
    }

    // Actualizar recompensas cuando se mata a un jugador
    updateKillReward() {
      this.killCount++;
      this.rewards += this.killReward;
      
      // Actualizar la interfaz de recompensas
      this.updateRewardsUI();
      
      // Mostrar notificación de recompensa
      const notification = document.getElementById('rewardNotification');
      if (notification) {
        notification.textContent = `+${this.killReward} SOL for kill!`;
        notification.style.backgroundColor = '#14F195';
        notification.classList.add('show');
        
        // Ocultar después de 2 segundos
        setTimeout(() => {
          notification.classList.remove('show');
        }, 2000);
      }
    }
    
    // Mostrar pantalla de recompensas finales
    showFinalRewards() {
      // Crear overlay para recompensas finales
      const overlay = document.createElement('div');
      overlay.className = 'rewards-overlay';
      
      const content = document.createElement('div');
      content.className = 'rewards-content';
      
      const title = document.createElement('h2');
      title.textContent = 'Match Complete';
      
      const stats = document.createElement('p');
      stats.innerHTML = `Kills: <span class="highlight">${this.killCount}</span>`;
      
      const rewardText = document.createElement('p');
      rewardText.className = 'reward-amount';
      rewardText.textContent = `${this.rewards.toFixed(2)} SOL`;
      
      const subtext = document.createElement('p');
      subtext.textContent = '(simulated rewards)';
      
      const button = document.createElement('button');
      button.className = 'claim-button';
      button.textContent = 'Claim Rewards';
      
      button.addEventListener('click', () => {
        // Simular la reclamación de recompensas
        title.textContent = 'Rewards Claimed!';
        button.style.display = 'none';
        
        const successMessage = document.createElement('p');
        successMessage.className = 'success-message';
        successMessage.textContent = `You earned ${this.rewards.toFixed(2)} SOL (simulated)`;
        content.appendChild(successMessage);
        
        const returnButton = document.createElement('button');
        returnButton.className = 'return-button';
        returnButton.textContent = 'Return to Menu';
        returnButton.addEventListener('click', () => {
          window.location.href = '/';
        });
        content.appendChild(returnButton);
      });
      
      content.appendChild(title);
      content.appendChild(stats);
      content.appendChild(rewardText);
      content.appendChild(subtext);
      content.appendChild(button);
      
      overlay.appendChild(content);
      document.body.appendChild(overlay);
    }

    // Actualizar interfaz de recompensas
    updateRewardsUI() {
      const killCountElement = document.getElementById('killCount');
      const rewardsElement = document.getElementById('solEarned');
      
      if (killCountElement) {
        killCountElement.textContent = this.killCount;
      }
      
      if (rewardsElement) {
        rewardsElement.textContent = this.rewards.toFixed(2);
      }
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
        
        // Actualizar interfaz de recompensas
        controller.updateRewardsUI();
      });
      
      // Escuchar eventos de kill
      socket.on('kill reward', function() {
        controller.updateKillReward();
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
          // Mostrar pantalla de recompensas finales en lugar de alerta
          controller.showFinalRewards();
        }, 1500);
      });
    }

    // Reinicia los contadores al volver al menú
    resetCounters() {
      this.killCount = 0;
      this.rewards = 0.0;
      if (document.getElementById('killCount')) {
        document.getElementById('killCount').innerText = '0';
      }
      if (document.getElementById('solEarned')) {
        document.getElementById('solEarned').innerText = '0.00';
      }
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

// En la función que maneja el inicio del juego, reiniciar los contadores
socket.on('menu', function() {
    controller.resetCounters();
    controller.mode = "menu";
    // ... existing code ...
});

// Asegúrate de que este código esté presente para inicializar la UI del juego
function initGameUI() {
    // Crear elementos UI si no existen
    if (!document.getElementById('gameStats')) {
        const statsDiv = document.createElement('div');
        statsDiv.id = 'gameStats';
        statsDiv.innerHTML = `
            <div class="stat-box">
                <span>Kills: <span id="killCount">0</span></span>
                <span>SOL Earned: <span id="solEarned">0.00</span></span>
            </div>
        `;
        document.body.appendChild(statsDiv);
    }
    
    // Asegurarse de que el deathScreen existe
    if (!document.getElementById('deathScreen')) {
        const deathDiv = document.createElement('div');
        deathDiv.id = 'deathScreen';
        deathDiv.style.display = 'none';
        deathDiv.innerHTML = `
            <div class="death-container">
                <h2>Game Over</h2>
                <p>Total Kills: <span id="totalKills">0</span></p>
                <p>Total SOL Earned: <span id="totalReward">0.00</span></p>
                <button id="claimRewardBtn">Claim Rewards</button>
                <button id="returnMenuBtn">Return to Menu</button>
            </div>
        `;
        document.body.appendChild(deathDiv);
        
        // Añadir event listeners
        document.getElementById('claimRewardBtn').addEventListener('click', function() {
            alert('Reward of ' + controller.rewards.toFixed(2) + ' SOL claimed!');
            document.getElementById('deathScreen').style.display = 'none';
            document.getElementById('menu').style.display = 'block';
        });
        
        document.getElementById('returnMenuBtn').addEventListener('click', function() {
            document.getElementById('deathScreen').style.display = 'none';
            document.getElementById('menu').style.display = 'block';
        });
    }
}

// Llamar a initGameUI cuando el juego comienza
socket.on('update', function(players, player, playerAbsolute, playerMap, bullets, items, leaderboard, powerUps) {
    // ... existing code ...
    
    // Asegurarse de que la UI está inicializada
    if (!document.getElementById('gameStats') || !document.getElementById('deathScreen')) {
        initGameUI();
    }
    
    // ... existing code ...
});
