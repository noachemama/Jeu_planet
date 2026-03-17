const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const ui = {
  levelName: document.getElementById('levelName'),
  score: document.getElementById('score'),
  lives: document.getElementById('lives'),
  timer: document.getElementById('timer'),
  messageBox: document.getElementById('messageBox'),
  goalText: document.getElementById('goalText'),
  restartBtn: document.getElementById('restartBtn'),
  nextBtn: document.getElementById('nextBtn')
};

const ASSET_FILES = [
  'planet_alien.png','planet_coral.png','planet_crystal_blue.png','planet_crystal.png','planet_desert.png',
  'planet_earth.png','planet_fire.png','planet_forest.png','planet_fossil.png','planet_gold.png',
  'planet_ice.png','planet_jupiter.png','planet_lava.png','planet_mars.png','planet_moon.png',
  'planet_obsidian.png','planet_pastel.png','planet_rainbow.png','planet_saturn.png'
];

const images = {};
ASSET_FILES.forEach(name => {
  const img = new Image();
  img.src = `assets/${name}`;
  images[name] = img;
});
const playerImg = new Image();
playerImg.src = 'assets/main_character.png';

const levels = [
  {
    name: 'Equilibrium',
    planets: 5,
    gravity: 0.22,
    meteorInterval: 4000,
    npcJumpInterval: 4000,
    planetDestroyDuration: 2000,
    gameSpeed: 1,
    inverseGravity: false,
    targetScore: 120
  },
  {
    name: 'Chaos',
    planets: 8,
    gravity: 0.34,
    meteorInterval: 3000,
    npcJumpInterval: 4000,
    planetDestroyDuration: 1500,
    gameSpeed: 1.25,
    inverseGravity: false,
    targetScore: 220
  },
  {
    name: 'Gravity Flip',
    planets: 10,
    gravity: 0.42,
    meteorInterval: 2000,
    npcJumpInterval: 4000,
    planetDestroyDuration: 1000,
    gameSpeed: 1.45,
    inverseGravity: true,
    targetScore: 340
  }
];

const state = {
  levelIndex: 0,
  score: 0,
  lives: 3,
  time: 0,
  gameOver: false,
  win: false,
  stars: [],
  planets: [],
  meteorites: [],
  npcs: [],
  keys: {},
  lastTime: 0,
  meteorTimer: 0,
  npcJumpTimer: 0,
  planetEventTimer: 0,
  cameraShake: 0,
  player: null
};

function rand(min, max) { return Math.random() * (max - min) + min; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function dist(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }

function makeStars() {
  state.stars = Array.from({ length: 140 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    r: Math.random() * 2 + 0.5,
    a: Math.random() * 0.7 + 0.3,
    speed: Math.random() * 0.15 + 0.05
  }));
}

function createLevel(index) {
  const cfg = levels[index];
  state.levelIndex = index;
  state.time = 0;
  state.gameOver = false;
  state.win = false;
  state.meteorites = [];
  state.planets = [];
  state.npcs = [];
  state.meteorTimer = 0;
  state.npcJumpTimer = 0;
  state.planetEventTimer = 2500;
  state.cameraShake = 0;

  const planetImages = [...ASSET_FILES];
  const safeMargin = 110;

  for (let i = 0; i < cfg.planets; i++) {
    let attempts = 0;
    let x, y, radius;
    do {
      radius = rand(45, i === 0 ? 70 : 62);
      x = rand(safeMargin + radius, canvas.width - safeMargin - radius);
      y = rand(safeMargin + radius, canvas.height - safeMargin - radius);
      attempts++;
    } while (state.planets.some(p => dist(x, y, p.x, p.y) < p.radius + radius + 90) && attempts < 500);

    state.planets.push({
      x, y, radius,
      image: pick(planetImages),
      active: true,
      respawnTimer: 0,
      pulse: Math.random() * Math.PI * 2
    });
  }

  state.player = createActor(state.planets[0].x + state.planets[0].radius + 16, state.planets[0].y, true);
  state.player.boundPlanet = state.planets[0];
  state.player.touchingPlanet = true;

  for (let i = 1; i < Math.min(1 + Math.floor(cfg.planets / 2), cfg.planets); i++) {
    const p = state.planets[i];
    const npc = createActor(p.x + p.radius + rand(8, 18), p.y + rand(-8, 8), false);
    npc.boundPlanet = p;
    npc.tint = `hsl(${Math.floor(rand(0, 360))} 80% 65%)`;
    state.npcs.push(npc);
  }

  ui.levelName.textContent = cfg.name;
  ui.goalText.textContent = `Atteindre ${cfg.targetScore} points.`;
  setMessage(messageForLevel(cfg));
  updateUI();
}

function createActor(x, y, isPlayer) {
  return {
    x, y,
    vx: 0,
    vy: 0,
    radius: isPlayer ? 15 : 12,
    rotation: 0,
    touchingPlanet: false,
    boundPlanet: null,
    jumpCooldown: 0,
    hitCooldown: 0,
    tint: '#ffffff'
  };
}

function messageForLevel(cfg) {
  if (cfg.name === 'Equilibrium') return 'Niveau facile : gravité stable, apprends à te déplacer de planète en planète.';
  if (cfg.name === 'Chaos') return 'Niveau moyen : plus de planètes, plus de vitesse, plus de pression.';
  return 'Niveau difficile : gravité inversée, les planètes te repoussent.';
}

function setMessage(text) { ui.messageBox.textContent = text; }

function updateUI() {
  ui.score.textContent = Math.floor(state.score);
  ui.lives.textContent = state.lives;
  ui.timer.textContent = state.time.toFixed(1);
}

function resetProgress() {
  state.score = 0;
  state.lives = 3;
  createLevel(0);
}

function spawnMeteor() {
  const edge = Math.floor(rand(0, 4));
  let x, y;
  if (edge === 0) { x = rand(0, canvas.width); y = -40; }
  if (edge === 1) { x = canvas.width + 40; y = rand(0, canvas.height); }
  if (edge === 2) { x = rand(0, canvas.width); y = canvas.height + 40; }
  if (edge === 3) { x = -40; y = rand(0, canvas.height); }
  const target = Math.random() < 0.65 ? state.player : pick(state.planets.filter(p => p.active));
  const angle = Math.atan2(target.y - y, target.x - x);
  const speed = rand(2.4, 3.7) * levels[state.levelIndex].gameSpeed;
  state.meteorites.push({
    x, y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    radius: rand(10, 18),
    life: 12,
    trail: []
  });
}

function triggerPlanetDestruction() {
  const activePlanets = state.planets.filter(p => p.active);
  if (activePlanets.length <= 2) return;
  const planet = pick(activePlanets.filter(p => p !== state.player.boundPlanet));
  if (!planet) return;
  planet.active = false;
  planet.respawnTimer = levels[state.levelIndex].planetDestroyDuration;
  state.cameraShake = 10;
}

function getGravitySource(actor) {
  let nearest = null;
  let best = Infinity;
  for (const p of state.planets) {
    if (!p.active) continue;
    const d = dist(actor.x, actor.y, p.x, p.y);
    if (d < best) {
      best = d;
      nearest = p;
    }
  }
  return nearest;
}

function applyPlanetForces(actor, dt) {
  const cfg = levels[state.levelIndex];
  const planet = getGravitySource(actor);
  if (!planet) return;
  const dx = planet.x - actor.x;
  const dy = planet.y - actor.y;
  const d = Math.max(20, Math.hypot(dx, dy));
  const ux = dx / d;
  const uy = dy / d;
  const dir = cfg.inverseGravity ? -1 : 1;
  const force = cfg.gravity * cfg.gameSpeed * (planet.radius * 0.016 + 0.85);
  actor.vx += ux * force * dir * dt * 60;
  actor.vy += uy * force * dir * dt * 60;
  actor.rotation = Math.atan2(planet.y - actor.y, planet.x - actor.x) + Math.PI / 2;
  actor.boundPlanet = planet;
}

function resolvePlanetCollision(actor) {
  actor.touchingPlanet = false;
  for (const p of state.planets) {
    if (!p.active) continue;
    const dx = actor.x - p.x;
    const dy = actor.y - p.y;
    const d = Math.hypot(dx, dy);
    const minDist = p.radius + actor.radius;
    if (d < minDist) {
      const nx = dx / (d || 1);
      const ny = dy / (d || 1);
      actor.x = p.x + nx * minDist;
      actor.y = p.y + ny * minDist;
      const normalVel = actor.vx * nx + actor.vy * ny;
      if (normalVel < 0) {
        actor.vx -= normalVel * nx;
        actor.vy -= normalVel * ny;
      }
      actor.touchingPlanet = true;
      actor.boundPlanet = p;
    }
  }
}

function handlePlayerInput(dt) {
  const p = state.player;
  const move = (state.keys['ArrowLeft'] || state.keys['a'] ? -1 : 0) + (state.keys['ArrowRight'] || state.keys['d'] ? 1 : 0);
  if (move !== 0 && p.boundPlanet) {
    const dx = p.x - p.boundPlanet.x;
    const dy = p.y - p.boundPlanet.y;
    const d = Math.max(1, Math.hypot(dx, dy));
    const tx = -dy / d;
    const ty = dx / d;
    const speed = 0.26 * levels[state.levelIndex].gameSpeed * 60 * dt;
    p.vx += tx * move * speed;
    p.vy += ty * move * speed;
  }

  const jumping = state.keys[' '] || state.keys['ArrowUp'] || state.keys['w'];
  if (jumping && p.touchingPlanet && p.jumpCooldown <= 0) {
    const dx = p.x - p.boundPlanet.x;
    const dy = p.y - p.boundPlanet.y;
    const d = Math.max(1, Math.hypot(dx, dy));
    const nx = dx / d;
    const ny = dy / d;
    const jumpDir = levels[state.levelIndex].inverseGravity ? -1 : 1;
    p.vx += nx * 7.2 * jumpDir;
    p.vy += ny * 7.2 * jumpDir;
    p.touchingPlanet = false;
    p.jumpCooldown = 0.28;
  }
}

function updateActor(actor, dt, isPlayer = false) {
  if (actor.jumpCooldown > 0) actor.jumpCooldown -= dt;
  if (actor.hitCooldown > 0) actor.hitCooldown -= dt;

  applyPlanetForces(actor, dt);
  actor.vx *= 0.995;
  actor.vy *= 0.995;
  actor.x += actor.vx * dt * 60;
  actor.y += actor.vy * dt * 60;
  resolvePlanetCollision(actor);

  if (actor.x < -120 || actor.x > canvas.width + 120 || actor.y < -120 || actor.y > canvas.height + 120) {
    if (isPlayer) {
      damagePlayer('Sortie de zone.');
      respawnPlayer();
    } else {
      const p = pick(state.planets.filter(pl => pl.active));
      actor.x = p.x + p.radius + 20;
      actor.y = p.y;
      actor.vx = actor.vy = 0;
    }
  }
}

function updateNPCs(dt) {
  for (const npc of state.npcs) {
    if (npc.boundPlanet && npc.touchingPlanet) {
      const dx = npc.x - npc.boundPlanet.x;
      const dy = npc.y - npc.boundPlanet.y;
      const d = Math.max(1, Math.hypot(dx, dy));
      const tx = -dy / d;
      const ty = dx / d;
      npc.vx += tx * 0.08 * Math.sin(state.time * 2 + npc.x * 0.01);
      npc.vy += ty * 0.08 * Math.sin(state.time * 2 + npc.y * 0.01);
    }
    updateActor(npc, dt, false);
  }
}

function npcGlobalJump() {
  for (const npc of state.npcs) {
    if (npc.touchingPlanet && npc.boundPlanet) {
      const dx = npc.x - npc.boundPlanet.x;
      const dy = npc.y - npc.boundPlanet.y;
      const d = Math.max(1, Math.hypot(dx, dy));
      const nx = dx / d;
      const ny = dy / d;
      const jumpDir = levels[state.levelIndex].inverseGravity ? -1 : 1;
      npc.vx += nx * 5.2 * jumpDir;
      npc.vy += ny * 5.2 * jumpDir;
      npc.jumpCooldown = 0.5;
    }
  }
}

function updateMeteorites(dt) {
  for (let i = state.meteorites.length - 1; i >= 0; i--) {
    const m = state.meteorites[i];
    m.trail.push({ x: m.x, y: m.y });
    if (m.trail.length > 10) m.trail.shift();
    m.x += m.vx * dt * 60;
    m.y += m.vy * dt * 60;
    m.life -= dt;

    if (dist(m.x, m.y, state.player.x, state.player.y) < m.radius + state.player.radius) {
      damagePlayer('Impact météorite.');
      state.meteorites.splice(i, 1);
      continue;
    }

    let hitPlanet = false;
    for (const p of state.planets) {
      if (!p.active) continue;
      if (dist(m.x, m.y, p.x, p.y) < m.radius + p.radius) {
        state.score += 10;
        state.cameraShake = 6;
        hitPlanet = true;
        break;
      }
    }
    if (hitPlanet || m.life <= 0 || m.x < -200 || m.x > canvas.width + 200 || m.y < -200 || m.y > canvas.height + 200) {
      state.meteorites.splice(i, 1);
    }
  }
}

function damagePlayer(reason) {
  if (state.player.hitCooldown > 0 || state.gameOver) return;
  state.lives -= 1;
  state.player.hitCooldown = 1.5;
  state.cameraShake = 12;
  setMessage(`${reason} Il te reste ${state.lives} vie(s).`);
  if (state.lives <= 0) {
    state.gameOver = true;
    setMessage('Partie terminée. Appuie sur R ou sur Recommencer.');
  }
}

function respawnPlayer() {
  const p = state.planets.find(pl => pl.active) || state.planets[0];
  state.player.x = p.x + p.radius + 18;
  state.player.y = p.y;
  state.player.vx = 0;
  state.player.vy = 0;
}

function update(dt) {
  const cfg = levels[state.levelIndex];
  if (state.gameOver || state.win) return;

  state.time += dt;
  state.score += dt * 8 * cfg.gameSpeed;
  state.meteorTimer += dt * 1000;
  state.npcJumpTimer += dt * 1000;
  state.planetEventTimer -= dt * 1000;
  if (state.cameraShake > 0) state.cameraShake *= 0.9;

  if (state.meteorTimer >= cfg.meteorInterval) {
    state.meteorTimer = 0;
    spawnMeteor();
  }

  if (state.npcJumpTimer >= cfg.npcJumpInterval) {
    state.npcJumpTimer = 0;
    npcGlobalJump();
  }

  if (state.planetEventTimer <= 0) {
    triggerPlanetDestruction();
    state.planetEventTimer = rand(4500, 7000);
  }

  for (const p of state.planets) {
    p.pulse += dt;
    if (!p.active) {
      p.respawnTimer -= dt * 1000;
      if (p.respawnTimer <= 0) p.active = true;
    }
  }

  handlePlayerInput(dt);
  updateActor(state.player, dt, true);
  updateNPCs(dt);
  updateMeteorites(dt);

  if (state.score >= cfg.targetScore) {
    if (state.levelIndex < levels.length - 1) {
      state.win = true;
      setMessage(`Niveau ${cfg.name} terminé. Clique sur Niveau suivant.`);
    } else {
      state.win = true;
      setMessage('Victoire totale. Les 3 niveaux sont terminés.');
    }
  }

  updateUI();
}

function drawBackground() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
  g.addColorStop(0, '#101936');
  g.addColorStop(1, '#04060d');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (const s of state.stars) {
    s.y += s.speed * levels[state.levelIndex].gameSpeed;
    if (s.y > canvas.height) s.y = 0;
    ctx.globalAlpha = s.a;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawPlanets() {
  for (const p of state.planets) {
    ctx.save();
    const pulse = Math.sin(p.pulse * 2) * 3;
    if (!p.active) {
      ctx.globalAlpha = 0.2;
      ctx.strokeStyle = '#ff667d';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius + 14, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius + 12 + pulse, 0, Math.PI * 2);
    ctx.fillStyle = levels[state.levelIndex].inverseGravity ? 'rgba(255,100,160,0.08)' : 'rgba(120,180,255,0.08)';
    ctx.fill();
    ctx.closePath();

    const img = images[p.image];
    if (img && img.complete) {
      ctx.globalAlpha = p.active ? 1 : 0.15;
      ctx.drawImage(img, p.x - p.radius, p.y - p.radius, p.radius * 2, p.radius * 2);
    } else {
      ctx.globalAlpha = p.active ? 1 : 0.15;
      ctx.fillStyle = '#88a4ff';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

function drawActor(actor, isPlayer = false) {
  ctx.save();
  ctx.translate(actor.x, actor.y);
  ctx.rotate(actor.rotation);
  if (isPlayer && playerImg.complete) {
    ctx.globalAlpha = actor.hitCooldown > 0 ? 0.55 : 1;
    ctx.drawImage(playerImg, -18, -18, 36, 36);
  } else {
    ctx.fillStyle = isPlayer ? '#ffffff' : actor.tint;
    ctx.beginPath();
    ctx.arc(0, 0, actor.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0e1425';
    ctx.fillRect(-5, -5, 10, 10);
  }
  ctx.restore();
}

function drawMeteorites() {
  for (const m of state.meteorites) {
    for (let i = 0; i < m.trail.length; i++) {
      const t = m.trail[i];
      ctx.globalAlpha = i / m.trail.length * 0.4;
      ctx.fillStyle = '#ff9b5c';
      ctx.beginPath();
      ctx.arc(t.x, t.y, m.radius * (i / m.trail.length), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    const g = ctx.createRadialGradient(m.x, m.y, 2, m.x, m.y, m.radius);
    g.addColorStop(0, '#ffe58a');
    g.addColorStop(1, '#ff5a2a');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawOverlay() {
  if (!state.gameOver && !state.win) return;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.font = 'bold 42px Arial';
  ctx.fillText(state.gameOver ? 'GAME OVER' : 'NIVEAU TERMINÉ', canvas.width / 2, canvas.height / 2 - 10);
  ctx.font = '20px Arial';
  const text = state.gameOver ? 'Appuie sur R pour recommencer' : (state.levelIndex < levels.length - 1 ? 'Clique sur Niveau suivant' : 'Tu as terminé le jeu');
  ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 28);
  ctx.restore();
}

function render() {
  const shakeX = state.cameraShake ? rand(-state.cameraShake, state.cameraShake) : 0;
  const shakeY = state.cameraShake ? rand(-state.cameraShake, state.cameraShake) : 0;
  ctx.save();
  ctx.translate(shakeX, shakeY);
  drawBackground();
  drawPlanets();
  drawMeteorites();
  drawActor(state.player, true);
  state.npcs.forEach(npc => drawActor(npc, false));
  ctx.restore();
  drawOverlay();
}

function loop(timestamp) {
  if (!state.lastTime) state.lastTime = timestamp;
  const dt = clamp((timestamp - state.lastTime) / 1000, 0, 0.033);
  state.lastTime = timestamp;
  update(dt);
  render();
  requestAnimationFrame(loop);
}

window.addEventListener('keydown', e => {
  state.keys[e.key] = true;
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault();
  if (e.key.toLowerCase() === 'r') {
    state.score = 0;
    state.lives = 3;
    createLevel(state.levelIndex);
  }
  if (e.key.toLowerCase() === 'n' && state.levelIndex < levels.length - 1) {
    createLevel(state.levelIndex + 1);
  }
});
window.addEventListener('keyup', e => { state.keys[e.key] = false; });
ui.restartBtn.addEventListener('click', resetProgress);
ui.nextBtn.addEventListener('click', () => {
  if (state.levelIndex < levels.length - 1) {
    if (state.win || state.score >= levels[state.levelIndex].targetScore) {
      createLevel(state.levelIndex + 1);
    } else {
      setMessage('Termine d\'abord le niveau en cours.');
    }
  } else {
    resetProgress();
  }
});

makeStars();
createLevel(0);
requestAnimationFrame(loop);
