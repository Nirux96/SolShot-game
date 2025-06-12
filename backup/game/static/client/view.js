'use strict';
let type = "WebGL"
if(!PIXI.utils.isWebGLSupported()){
  type = "canvas"
}

// Colores para los jugadores
const PLAYER_COLORS = {
  'red': 0xFF4136,
  'blue': 0x0074D9,
  'green': 0x2ECC40,
  'yellow': 0xFFDC00
};

// Textura para efectos de partículas
function createParticleTexture() {
  const graphics = new PIXI.Graphics();
  graphics.beginFill(0xFFFFFF);
  graphics.drawCircle(0, 0, 5);
  graphics.endFill();
  return app.renderer.generateTexture(graphics);
}

let app = new PIXI.Application({
  width: controller.width,
  height: controller.height,
  antialias: true,
  transparent: false,
  resolution: 1,
  autoDensity: true,
  powerPreference: "high-performance"
});

// Crear textura para partículas
let particleTexture;

// Contenedor para efectos visuales
let effectsContainer;

PIXI.loader
.add("static/client/sprites/grass.png")
.add("static/client/sprites/sand.png")
.add("static/client/sprites/edge.png")
.add("static/client/sprites/water.png")
.add("static/client/sprites/lava.png")
.add("static/client/sprites/brick.png")
.add("static/client/sprites/floor.png")

.add("static/client/sprites/player.png")
.add("static/client/sprites/pistol.png")
.add("static/client/sprites/revolver.png")
.add("static/client/sprites/doublePistols.png")
.add("static/client/sprites/rifle.png")
.add("static/client/sprites/smg.png")
.add("static/client/sprites/gatling.png")
.add("static/client/sprites/bullet.png")
.add("static/client/sprites/healthPack.png")
.add("static/client/sprites/dead.png")
.load(setup);

function setup() {
  controller.newPlayer();
  controller.emitInput();
  controller.listenToUpdate();
  controller.listenToDeath();
  
  // Crear textura para partículas
  particleTexture = createParticleTexture();
  
  // Crear contenedor para efectos visuales
  effectsContainer = new PIXI.Container();
  app.stage.addChild(effectsContainer);
  
  app.ticker.add(delta => gameLoop(delta));
}

// Función para crear el efecto de disparo
function createMuzzleFlash(x, y, direction) {
  const muzzleFlash = new PIXI.Sprite(particleTexture);
  muzzleFlash.anchor.set(0.5, 0.5);
  muzzleFlash.tint = 0xFFD700; // Color dorado
  muzzleFlash.x = x + Math.cos(direction) * 30;
  muzzleFlash.y = y + Math.sin(direction) * 30;
  muzzleFlash.width = 15;
  muzzleFlash.height = 15;
  muzzleFlash.alpha = 0.8;
  
  effectsContainer.addChild(muzzleFlash);
  
  // Animar desaparición
  let duration = 0;
  app.ticker.add(function animateMuzzleFlash(delta) {
    duration += delta;
    muzzleFlash.scale.x += 0.05 * delta;
    muzzleFlash.scale.y += 0.05 * delta;
    muzzleFlash.alpha -= 0.05 * delta;
    
    if (muzzleFlash.alpha <= 0) {
      effectsContainer.removeChild(muzzleFlash);
      app.ticker.remove(animateMuzzleFlash);
    }
  });
}

// Función para crear el efecto de muerte
function createDeathParticles(x, y, color) {
  const particleCount = 20;
  const particles = [];
  
  for (let i = 0; i < particleCount; i++) {
    const particle = new PIXI.Sprite(particleTexture);
    particle.anchor.set(0.5);
    particle.x = x;
    particle.y = y;
    particle.tint = color || 0xFF4136; // Color por defecto rojo
    particle.alpha = 0.7;
    particle.width = 8;
    particle.height = 8;
    
    // Velocidad y dirección aleatorias
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 3;
    particle.vx = Math.cos(angle) * speed;
    particle.vy = Math.sin(angle) * speed;
    
    effectsContainer.addChild(particle);
    particles.push(particle);
  }
  
  // Animar partículas
  let duration = 0;
  app.ticker.add(function animateParticles(delta) {
    duration += delta;
    
    for (let i = 0; i < particles.length; i++) {
      const particle = particles[i];
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.alpha -= 0.01 * delta;
      particle.scale.x += 0.01 * delta;
      particle.scale.y += 0.01 * delta;
    }
    
    // Eliminar después de 1 segundo
    if (duration > 60) {
      for (let i = 0; i < particles.length; i++) {
        effectsContainer.removeChild(particles[i]);
      }
      app.ticker.remove(animateParticles);
    }
  });
}

// Función para crear efecto de escudo
function createShieldEffect(player) {
  const shield = new PIXI.Graphics();
  shield.lineStyle(3, 0x0074D9, 0.8);
  shield.drawCircle(0, 0, 40);
  
  // Añadir efecto de brillo
  const innerGlow = new PIXI.Graphics();
  innerGlow.beginFill(0x0074D9, 0.2);
  innerGlow.drawCircle(0, 0, 38);
  innerGlow.endFill();
  
  shield.x = player.x;
  shield.y = player.y;
  innerGlow.x = player.x;
  innerGlow.y = player.y;
  
  effectsContainer.addChild(shield);
  effectsContainer.addChild(innerGlow);
  
  // Animar escudo
  let time = 0;
  app.ticker.add(function animateShield(delta) {
    time += delta;
    shield.x = player.x;
    shield.y = player.y;
    innerGlow.x = player.x;
    innerGlow.y = player.y;
    
    shield.alpha = 0.5 + Math.sin(time * 0.1) * 0.2;
    innerGlow.alpha = 0.3 + Math.sin(time * 0.15) * 0.1;
    
    shield.scale.x = 1 + Math.sin(time * 0.05) * 0.05;
    shield.scale.y = 1 + Math.sin(time * 0.05) * 0.05;
    innerGlow.scale.x = shield.scale.x;
    innerGlow.scale.y = shield.scale.y;
    
    // Eliminar si el jugador ya no tiene escudo
    if (!player.powerUps || !player.powerUps.shield || !player.powerUps.shield.active) {
      effectsContainer.removeChild(shield);
      effectsContainer.removeChild(innerGlow);
      app.ticker.remove(animateShield);
    }
  });
}

// Renderizar power-ups
function renderPowerUps() {
  if (!powerUps || !powerUps.length) return;
  
  for (let i = 0; i < powerUps.length; i++) {
    const powerUp = powerUps[i];
    const graphics = new PIXI.Graphics();
    
    // Color según tipo
    let color;
    let letter;
    
    switch(powerUp.type) {
      case 'speed':
        color = 0xFFDC00; // Amarillo
        letter = 'S';
        break;
      case 'shield':
        color = 0x0074D9; // Azul
        letter = 'P';
        break;
      case 'tripleShot':
        color = 0xFF4136; // Rojo
        letter = 'T';
        break;
      default:
        color = 0xFFFFFF; // Blanco
        letter = '?';
    }
    
    // Dibujar círculo con halo luminoso
    graphics.lineStyle(3, 0xFFFFFF, 1);
    graphics.beginFill(color, 0.7);
    graphics.drawCircle(0, 0, 20);
    graphics.endFill();
    
    // Añadir halo exterior
    graphics.lineStyle(2, color, 0.5);
    graphics.drawCircle(0, 0, 25);
    graphics.lineStyle(1, color, 0.3);
    graphics.drawCircle(0, 0, 30);
    
    // Posición ajustada a la vista del jugador
    graphics.x = powerUp.x - currentPlayer.xAbsolute + 500;
    graphics.y = powerUp.y - currentPlayer.yAbsolute + 400;
    
    // Añadir texto
    const text = new PIXI.Text(letter, {
      fontFamily: 'Arial',
      fontSize: 18,
      fontWeight: 'bold',
      fill: 0xFFFFFF,
      stroke: 0x000000,
      strokeThickness: 4
    });
    text.anchor.set(0.5);
    text.x = powerUp.x - currentPlayer.xAbsolute + 500;
    text.y = powerUp.y - currentPlayer.yAbsolute + 400;
    
    // Animación de flotación
    const time = Date.now() / 1000;
    graphics.y += Math.sin(time * 2) * 5;
    text.y += Math.sin(time * 2) * 5;
    
    app.stage.addChild(graphics);
    app.stage.addChild(text);
    
    // Añadir partículas para llamar la atención
    const particleCount = 3;
    for (let j = 0; j < particleCount; j++) {
      const particle = new PIXI.Graphics();
      const angle = (j / particleCount) * Math.PI * 2 + time;
      const distance = 35 + Math.sin(time * 3) * 5;
      
      particle.beginFill(color, 0.6);
      particle.drawCircle(0, 0, 3);
      particle.endFill();
      
      particle.x = graphics.x + Math.cos(angle) * distance;
      particle.y = graphics.y + Math.sin(angle) * distance;
      
      app.stage.addChild(particle);
    }
  }
}

function gameLoop(delta){
  app.stage.removeChildren();
  effectsContainer = new PIXI.Container();
  app.stage.addChild(effectsContainer);
  
  if (controller.mode == 'dead')
  {
    let deadSprite = new PIXI.Sprite(PIXI.loader.resources['static/client/sprites/dead.png'].texture);
    deadSprite.position.set(0,0);
    app.stage.addChild(deadSprite);
    return;
  }

  for (let i = 0; i < 17; i++) {
    for (let j = 0; j < 21; j++) {
      let square = new PIXI.Sprite(PIXI.loader.resources[gameMap.square[i][j].path].texture);
      square.x=controller.squareWidthInPixels*j-currentPlayer.xAbsolute%50;
      square.y=controller.squareHeightInPixels*i-currentPlayer.yAbsolute%50;
      app.stage.addChild(square);
    }
  }
  
  // Renderizar power-ups
  renderPowerUps();
  
  // Registrar el último estado de los jugadores para poder detectar disparos
  const lastBulletCount = bullets ? bullets.length : 0;
  
  for (let id in players) {
    let player = players[id];
    let playerSprite = new PIXI.Sprite(PIXI.loader.resources['static/client/sprites/player.png'].texture);
    playerSprite.anchor.set(0.5,0.5);
    playerSprite.position.set(player.x,player.y);
    
    // Aplicar color del jugador
    if (player.color && PLAYER_COLORS[player.color]) {
      playerSprite.tint = PLAYER_COLORS[player.color];
    }
    
    app.stage.addChild(playerSprite);

    let weaponSprite = new PIXI.Sprite(PIXI.loader.resources['static/client/sprites/'+player.weapon.spriteName].texture);
    weaponSprite.anchor.set(0.5,0.5);
    weaponSprite.rotation = player.direction;
    weaponSprite.x=player.x+10*Math.cos(player.direction);
    weaponSprite.y=player.y+10*Math.sin(player.direction);
    app.stage.addChild(weaponSprite);
    
    // Detectar disparo y crear efecto visual
    if (player.weapon.triggered === 1) {
      createMuzzleFlash(player.x, player.y, player.direction);
    }
    
    // Mostrar efecto de escudo si está activo
    if (player.powerUps && player.powerUps.shield && player.powerUps.shield.active) {
      createShieldEffect(player);
    }
    
    // Mostrar efecto de velocidad si está activo
    if (player.powerUps && player.powerUps.speed && player.powerUps.speed.active) {
      createSpeedEffect(player);
    }
    
    // Mostrar efecto de triple disparo si está activo
    if (player.powerUps && player.powerUps.tripleShot && player.powerUps.tripleShot.active) {
      createTripleShotEffect(player);
    }

    let name = new PIXI.Text(player.name);
    name.style = {fill: 'white', stroke: 'black', strokeThickness: 2};
    name.anchor.set(0.5,0.5);
    name.position.set(player.x, player.y-55);
    app.stage.addChild(name);

    let redBar = new PIXI.Graphics();
    redBar.lineStyle(1, 0x000000, 1);
    redBar.beginFill(0xFF0000);
    redBar.drawRect(player.x-40, player.y-40, 80, 10);
    redBar.endFill();
    app.stage.addChild(redBar);

    let greenBar = new PIXI.Graphics();
    greenBar.lineStyle(1, 0x000000, 1);
    greenBar.beginFill(0x008111);
    greenBar.drawRect(player.x-40, player.y-40, Math.max(0,player.health*(80/1500)), 10);
    greenBar.endFill();
    app.stage.addChild(greenBar);
  }


  let len = items.length;
  for (let i=0; i<len; i++){
    let itemSprite = new PIXI.Sprite(PIXI.loader.resources['static/client/sprites/' + items[i].spriteName].texture);

    itemSprite.anchor.set(0.5,0.5);
    itemSprite.x = items[i].x-currentPlayer.xAbsolute+500;
    itemSprite.y = items[i].y-currentPlayer.yAbsolute+400;
    app.stage.addChild(itemSprite);
  }

  let length = bullets.length;
  for (let i=0; i<length; i++){
    let bulletSprite = new PIXI.Sprite(PIXI.loader.resources['static/client/sprites/bullet.png'].texture);

    bulletSprite.anchor.set(0.5,0.5);
    bulletSprite.x = bullets[i].x-currentPlayer.xAbsolute+500;
    bulletSprite.y = bullets[i].y-currentPlayer.yAbsolute+400;
    app.stage.addChild(bulletSprite);
  }

  // Detectar nuevas balas para efectos visuales
  if (bullets && bullets.length > lastBulletCount) {
    // Se ha disparado una nueva bala
    const newBullets = bullets.slice(lastBulletCount);
    for (let i = 0; i < newBullets.length; i++) {
      const bullet = newBullets[i];
      createMuzzleFlash(bullet.x - currentPlayer.xAbsolute + 500, bullet.y - currentPlayer.yAbsolute + 400, bullet.direction);
    }
  }

  let miniMap = new PIXI.Graphics();
  miniMap.lineStyle(1, 0x000000, 1);
  miniMap.beginFill('black', 0.5);
  miniMap.drawRect(880, 580, 100, 100);
  miniMap.endFill();
  app.stage.addChild(miniMap);
  for (let id in players) {
    let player = players[id];
    let pointPlayer = new PIXI.Graphics();

    if(player.x == 500 && player.y == 400)
      pointPlayer.beginFill(0x008111);
    else if (player.color && PLAYER_COLORS[player.color])
      pointPlayer.beginFill(PLAYER_COLORS[player.color]);
    else
      pointPlayer.beginFill(0xFF0000);
    
    pointPlayer.drawCircle(880+(player.x+currentPlayer.xAbsolute-500)/5000*100, 580+(player.y+currentPlayer.yAbsolute-400)/5000*100, 3);
    pointPlayer.endFill();
    app.stage.addChild(pointPlayer);
  }

  let leaderboardBackground = new PIXI.Graphics();
  leaderboardBackground.lineStyle(2, 0x000000, 0.7);
  leaderboardBackground.beginFill('black', 0.3);
  leaderboardBackground.drawRoundedRect(790, 10, 200, 200, 10);
  leaderboardBackground.endFill();
  app.stage.addChild(leaderboardBackground);

  let leaderboardVerticalLine = new PIXI.Graphics();

  leaderboardVerticalLine.beginFill(0x000000, 0.7);
  leaderboardVerticalLine.drawRect(930, 20, 2, 180);
  leaderboardVerticalLine.endFill();
  app.stage.addChild(leaderboardVerticalLine);

  let leaderboardHorizontalLine = new PIXI.Graphics();

  leaderboardHorizontalLine.beginFill(0x000000, 0.7);
  leaderboardHorizontalLine.drawRect(800, 40, 180, 2);
  leaderboardHorizontalLine.endFill();
  app.stage.addChild(leaderboardHorizontalLine);


  let leaderboardTitle = new PIXI.Text("PLAYER          POINTS");
  leaderboardTitle.style = {fill: 'white', strokeThickness: 0, fontSize: 15};
  leaderboardTitle.position.set(850, 20);
  app.stage.addChild(leaderboardTitle);

  for (let i=0; i<leaderboard.length; i++ ) {
    let entryName = new PIXI.Text(i+1+". " + leaderboard[i].name);
    entryName.anchor.set(0.5,0.5);
    entryName.style = {fill: 'white', strokeThickness: 0, fontSize: 15};
    entryName.position.set(860, 55+i*20);
    app.stage.addChild(entryName);

    let entryKills = new PIXI.Text(leaderboard[i].score);
    entryKills.anchor.set(0.5,0.5);
    entryKills.style = {fill: 'white', strokeThickness: 0, fontSize: 15};
    entryKills.position.set(960, 55+i*20);
    app.stage.addChild(entryKills);

    if(i>=7)
      break;
  }
}

// Función para crear efecto de velocidad
function createSpeedEffect(player) {
  // Crear estela detrás del jugador
  const trailCount = 5;
  for (let i = 0; i < trailCount; i++) {
    const trail = new PIXI.Graphics();
    const alpha = 0.5 - (i / trailCount) * 0.5;
    const scale = 1 - (i / trailCount) * 0.3;
    
    trail.beginFill(0xFFDC00, alpha);
    trail.drawCircle(0, 0, 25 * scale);
    trail.endFill();
    
    // Calcular posición basada en la dirección de movimiento
    let dx = 0;
    let dy = 0;
    
    if (input.up) dy -= 1;
    if (input.down) dy += 1;
    if (input.left) dx -= 1;
    if (input.right) dx += 1;
    
    const distance = 10 + i * 8;
    if (dx !== 0 || dy !== 0) {
      const length = Math.sqrt(dx * dx + dy * dy);
      dx /= length;
      dy /= length;
      
      trail.x = player.x - dx * distance;
      trail.y = player.y - dy * distance;
    } else {
      trail.x = player.x;
      trail.y = player.y;
    }
    
    effectsContainer.addChild(trail);
  }
  
  // Añadir partículas de velocidad
  const time = Date.now() / 200;
  const particleCount = 3;
  for (let i = 0; i < particleCount; i++) {
    const particle = new PIXI.Graphics();
    const angle = (i / particleCount) * Math.PI * 2 + time;
    const distance = 35;
    
    particle.beginFill(0xFFDC00, 0.7);
    particle.drawCircle(0, 0, 3);
    particle.endFill();
    
    particle.x = player.x + Math.cos(angle) * distance;
    particle.y = player.y + Math.sin(angle) * distance;
    
    effectsContainer.addChild(particle);
  }
}

// Función para crear efecto de triple disparo
function createTripleShotEffect(player) {
  // Añadir un aura alrededor del arma
  const weaponAura = new PIXI.Graphics();
  weaponAura.beginFill(0xFF4136, 0.3);
  weaponAura.drawCircle(0, 0, 20);
  weaponAura.endFill();
  
  weaponAura.x = player.x + 15 * Math.cos(player.direction);
  weaponAura.y = player.y + 15 * Math.sin(player.direction);
  
  effectsContainer.addChild(weaponAura);
  
  // Añadir líneas que indican los tres ángulos de disparo
  const spreadAngle = 0.2; // ~11 grados
  
  for (let i = -1; i <= 1; i++) {
    const line = new PIXI.Graphics();
    const currentAngle = player.direction + (i * spreadAngle);
    
    line.lineStyle(1, 0xFF4136, 0.5);
    line.moveTo(
      player.x + 20 * Math.cos(player.direction),
      player.y + 20 * Math.sin(player.direction)
    );
    line.lineTo(
      player.x + 40 * Math.cos(currentAngle),
      player.y + 40 * Math.sin(currentAngle)
    );
    
    effectsContainer.addChild(line);
  }
}
