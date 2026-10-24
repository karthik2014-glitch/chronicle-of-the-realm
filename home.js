const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const mainMenu = document.getElementById('main-menu');

const VIRTUAL_WIDTH = 640;
const VIRTUAL_HEIGHT = 480;

let gameState = "MENU"; 
const keys = {};

const hero = {
    x: 300, y: 240, width: 28, height: 28,
    speed: 4.5, dirX: 0, dirY: 1, 
    health: 6, maxHealth: 6, score: 0,
    isAttacking: false, attackTimer: 0, currentWeapon: 'sword',
    invincible: false,
    invincibleTimer: 0,
    flashState: false
};

// 🗺️ 5-Area Grid System Configuration
let currentRoomX = 0;
let currentRoomY = 0;

const worldMap = {
    "0,0": { // Area 1: Starter Zone
        obstacles: [{ x: 0, y: 0, width: 640, height: 32 }, { x: 0, y: 0, width: 32, height: 480 }, { x: 120, y: 120, width: 64, height: 64 }],
        monsters: [{ x: 150, y: 200, width: 32, height: 32, speed: 2.5, dirX: 1, dirY: 0, health: 4, steps: 20, aggroRange: 250, type: 'regular' }]
    },
    "1,0": { // Area 2: East Ruins
        obstacles: [{ x: 0, y: 0, width: 640, height: 32 }, { x: 450, y: 100, width: 96, height: 64 }],
        monsters: [{ x: 200, y: 150, width: 32, height: 32, speed: 2.5, dirX: 0, dirY: 1, health: 4, steps: 20, aggroRange: 250, type: 'regular' }]
    },
    "2,0": { // Area 3: Far East Outpost
        obstacles: [{ x: 0, y: 0, width: 640, height: 32 }, { x: 608, y: 0, width: 32, height: 480 }, { x: 200, y: 300, width: 150, height: 40 }],
        monsters: [{ x: 400, y: 150, width: 32, height: 32, speed: 2.5, dirX: -1, dirY: 0, health: 4, steps: 20, aggroRange: 250, type: 'regular' }]
    },
    "0,1": { // Area 4: Southern Overgrowth
        obstacles: [{ x: 0, y: 0, width: 32, height: 480 }, { x: 0, y: 448, width: 640, height: 32 }, { x: 150, y: 150, width: 200, height: 32 }],
        monsters: [{ x: 450, y: 240, width: 32, height: 32, speed: 2.5, dirX: 1, dirY: 0, health: 4, steps: 20, aggroRange: 250, type: 'regular' }]
    },
    "1,1": { // Area 5: 🟥 THE MINI-BOSS ARENA!
        obstacles: [{ x: 608, y: 0, width: 32, height: 480 }, { x: 0, y: 448, width: 640, height: 32 }, { x: 200, y: 120, width: 64, height: 64 }],
        monsters: [
            { x: 300, y: 200, width: 52, height: 52, speed: 2.6, dirX: 0, dirY: 1, health: 16, maxHealth: 16, steps: 10, aggroRange: 400, type: 'miniboss' }
        ]
    }
};

const spells = [];
let arrowPulse = 0; // Visual ticker for the guide arrow animation

function getActiveRoom() {
    return worldMap[`${currentRoomX},${currentRoomY}`] || worldMap["0,0"];
}

function resizeCanvas() {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const scale = Math.min(windowWidth / VIRTUAL_WIDTH, windowHeight / VIRTUAL_HEIGHT);
    canvas.width = VIRTUAL_WIDTH * scale;
    canvas.height = VIRTUAL_HEIGHT * scale;
    ctx.imageSmoothingEnabled = false;
    ctx.scale(scale, scale);
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function startGame() {
    if (gameState === "MENU" || gameState === "GAMEOVER") {
        gameState = "PLAYING";
        hero.health = hero.maxHealth;
        hero.score = 0;
        hero.x = 300; hero.y = 240;
        hero.invincible = false;
        currentRoomX = 0; currentRoomY = 0;
        
        // Refresh level map layouts completely
        worldMap["0,0"].monsters = [{ x: 150, y: 200, width: 32, height: 32, speed: 2.5, dirX: 1, dirY: 0, health: 4, steps: 20, aggroRange: 250, type: 'regular' }];
        worldMap["1,0"].monsters = [{ x: 200, y: 150, width: 32, height: 32, speed: 2.5, dirX: 0, dirY: 1, health: 4, steps: 20, aggroRange: 250, type: 'regular' }];
        worldMap["2,0"].monsters = [{ x: 400, y: 150, width: 32, height: 32, speed: 2.5, dirX: -1, dirY: 0, health: 4, steps: 20, aggroRange: 250, type: 'regular' }];
        worldMap["0,1"].monsters = [{ x: 450, y: 240, width: 32, height: 32, speed: 2.5, dirX: 1, dirY: 0, health: 4, steps: 20, aggroRange: 250, type: 'regular' }];
        worldMap["1,1"].monsters = [{ x: 300, y: 200, width: 52, height: 52, speed: 2.6, dirX: 0, dirY: 1, health: 16, maxHealth: 16, steps: 10, aggroRange: 400, type: 'miniboss' }];
        
        mainMenu.style.opacity = 0;
        setTimeout(() => { mainMenu.style.display = 'none'; }, 400);
    }
}

window.addEventListener('keydown', (e) => { 
    keys[e.code] = true; 
    startGame();
    
    if (e.code === 'Digit1') hero.currentWeapon = 'sword';
    if (e.code === 'Digit2') hero.currentWeapon = 'staff';
    if (e.code === 'Digit3') hero.currentWeapon = 'hammer';
});
window.addEventListener('mousedown', () => { startGame(); });
window.addEventListener('keyup', (e) => { keys[e.code] = false; });

function checkCollision(r1, r2) {
    return r1.x < r2.x + r2.width && r1.x + r1.width > r2.x &&
           r1.y < r2.y + r2.height && r1.y + r1.height > r2.y;
}

function handleInput() {
    if (gameState !== "PLAYING") return;
    let moveX = 0, moveY = 0;
    const room = getActiveRoom();

    if (keys['ArrowUp'] || keys['KeyW']) { moveY = -1; hero.dirX = 0; hero.dirY = -1; }
    else if (keys['ArrowDown'] || keys['KeyS']) { moveY = 1; hero.dirX = 0; hero.dirY = 1; }
    else if (keys['ArrowLeft'] || keys['KeyA']) { moveX = -1; hero.dirX = -1; hero.dirY = 0; }
    else if (keys['ArrowRight'] || keys['KeyD']) { moveX = 1; hero.dirX = 1; hero.dirY = 0; }

    if (moveX !== 0 || moveY !== 0) {
        hero.x += moveX * hero.speed;
        for (let obs of room.obstacles) if (checkCollision(hero, obs)) hero.x -= moveX * hero.speed;
        hero.y += moveY * hero.speed;
        for (let obs of room.obstacles) if (checkCollision(hero, obs)) hero.y -= moveY * hero.speed;
    }

    if (keys['Space'] && !hero.isAttacking) {
        hero.isAttacking = true;
        if (hero.currentWeapon === 'sword') {
            hero.attackTimer = 10;
            executeMeleeAttack(24, 2, 50); 
        } else if (hero.currentWeapon === 'hammer') {
            hero.attackTimer = 22;
            executeMeleeAttack(36, 4, 95); 
        } else if (hero.currentWeapon === 'staff') {
            hero.attackTimer = 15;
            spells.push({ x: hero.x + 8, y: hero.y + 8, width: 12, height: 12, velX: hero.dirX * 6, velY: hero.dirY * 6 });
        }
    }
}

function executeMeleeAttack(range, damage, knockbackForce) {
    const hitbox = { x: hero.x + hero.dirX * range, y: hero.y + hero.dirY * range, width: range, height: range };
    const room = getActiveRoom();

    for (let i = room.monsters.length - 1; i >= 0; i--) {
        let m = room.monsters[i];
        if (checkCollision(hitbox, m)) {
            m.health -= damage;
            m.x += hero.dirX * knockbackForce;
            m.y += hero.dirY * knockbackForce;
            if (m.health <= 0) { room.monsters.splice(i, 1); hero.score += m.type === 'miniboss' ? 1000 : 101; }
        }
    }
}

function update() {
    if (gameState !== "PLAYING") return;
    const room = getActiveRoom();
    arrowPulse += 0.15; // Pulse the visual navigation layout ticker

    if (hero.isAttacking) {
        hero.attackTimer--;
        if (hero.attackTimer <= 0) hero.isAttacking = false;
    }

    if (hero.invincible) {
        hero.invincibleTimer--;
        if (hero.invincibleTimer % 4 === 0) hero.flashState = !hero.flashState;
        if (hero.invincibleTimer <= 0) { hero.invincible = false; hero.flashState = false; }
    }

    // Room transition checks
    if (hero.x > VIRTUAL_WIDTH - 20 && currentRoomX < 2) { currentRoomX++; hero.x = 35; spells.length = 0; }
    else if (hero.x < 15 && currentRoomX > 0) { currentRoomX--; hero.x = VIRTUAL_WIDTH - 40; spells.length = 0; }
    if (hero.y > VIRTUAL_HEIGHT - 20 && currentRoomY < 1) { currentRoomY++; hero.y = 55; spells.length = 0; }
    else if (hero.y < 35 && currentRoomY > 0) { currentRoomY--; hero.y = VIRTUAL_HEIGHT - 40; spells.length = 0; }

    if (hero.x < 20) hero.x = 20; if (hero.x > 600) hero.x = 600;
    if (hero.y < 40) hero.y = 40; if (hero.y > 440) hero.y = 440;

    for (let i = spells.length - 1; i >= 0; i--) {
        let s = spells[i]; s.x += s.velX; s.y += s.velY;
        let hit = false;
        for (let obs of room.obstacles) if (checkCollision(s, obs)) hit = true;
        if (hit) { spells.splice(i, 1); continue; }
        for (let j = room.monsters.length - 1; j >= 0; j--) {
            let m = room.monsters[j];
            if (checkCollision(s, m)) {
                m.health -= 2; spells.splice(i, 1);
                if (m.health <= 0) { room.monsters.splice(j, 1); hero.score += 101; }
                break;
            }
        }
    }

    // 🟢 FIXED ENEMY AI ENGINE Patched to prevent freeze states
    for (let m of room.monsters) {
        let diffX = hero.x - m.x;
        let diffY = hero.y - m.y;
        let distance = Math.sqrt(diffX * diffX + diffY * diffY);

        if (distance < m.aggroRange) {
            // Player tracking movement pattern
            if (Math.abs(diffX) > Math.abs(diffY)) { m.dirX = diffX > 0 ? 1 : -1; m.dirY = 0; } 
            else { m.dirX = 0; m.dirY = diffY > 0 ? 1 : -1; }
        } else {
            // Fallback idle wander patrol path loop so monsters NEVER freeze
            m.steps--;
            if (m.steps <= 0) {
                m.steps = Math.floor(Math.random() * 30) + 20;
                let r = Math.random();
                if (r < 0.25) { m.dirX = 1; m.dirY = 0; } else if (r < 0.5) { m.dirX = -1; m.dirY = 0; }
                else if (r < 0.75) { m.dirX = 0; m.dirY = 1; } else { m.dirX = 0; m.dirY = -1; }
            }
        }
        
        m.x += m.dirX * m.speed; m.y += m.dirY * m.speed;
        
        // Wall collision correction for monsters
        for (let obs of room.obstacles) {
            if (checkCollision(m, obs)) {
                m.x -= m.dirX * m.speed; 
                m.y -= m.dirY * m.speed;
                m.steps = 0; // force dynamic redirection tick
            }
        }

Use code with caution.
if (checkCollision(hero, m) && !hero.invincible) {
hero.health--;
hero.invincible = true;
hero.invincibleTimer = 35;
hero.x += m.dirX * 45;
hero.y += m.dirY * 45;
if (hero.health <= 0) gameState = "GAMEOVER";
}
}
}
function draw() {
ctx.clearRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
const room = getActiveRoom();
if (gameState === "GAMEOVER") {
ctx.fillStyle = "rgba(0, 0, 0, 0.85)"; ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
ctx.fillStyle = "#ff3f34"; ctx.font = 'bold 36px "Courier New"'; ctx.textAlign = "center";
ctx.fillText("GAME OVER", VIRTUAL_WIDTH / 2, VIRTUAL_HEIGHT / 2 - 20);
ctx.fillStyle = "#ffffff"; ctx.font = '16px "Courier New"';
ctx.fillText("PRESS ANY KEY TO RETRY", VIRTUAL_WIDTH / 2, VIRTUAL_HEIGHT / 2 + 30);
ctx.textAlign = "left"; return;
}
// Terrain Obstacles
ctx.fillStyle = '#4a3319';
for (let obs of room.obstacles) ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
// Spells
ctx.fillStyle = '#00ffff';
for (let s of spells) ctx.fillRect(s.x, s.y, s.width, s.height);
// Monsters
for (let m of room.monsters) {
if (m.type === 'miniboss') {
ctx.fillStyle = '#ef5350';
ctx.fillRect(m.x, m.y, m.width, m.height);
ctx.fillStyle = '#ffff00'; ctx.fillRect(m.x+8, m.y+10, 6, 6); ctx.fillRect(m.x+36, m.y+10, 6, 6);
ctx.fillStyle = '#222'; ctx.fillRect(m.x - 5, m.y - 12, m.width + 10, 5);
ctx.fillStyle = '#ff0000'; ctx.fillRect(m.x - 5, m.y - 12, (m.width + 10) * (m.health / m.maxHealth), 5);
} else {
ctx.fillStyle = '#9b59b6';
ctx.fillRect(m.x, m.y, m.width, m.height);
}
}
// Hero Character Model
ctx.fillStyle = hero.flashState ? '#ff4d4d' : '#e67e22';
ctx.fillRect(hero.x, hero.y, hero.width, hero.height);
ctx.fillStyle = '#f1c40f';
ctx.fillRect(hero.x + (hero.dirX * 4) + 6, hero.y + (hero.dirY * 4) + 6, 12, 6);
// 🟢 NEW: NEON MAP NAVIGATION INDICATOR ARROW
if (gameState === "PLAYING") {
ctx.save();
// Position arrow directly above the hero's head with a pulsing float effect
let arrowY = hero.y - 18 + Math.sin(arrowPulse) * 4;
ctx.translate(hero.x + hero.width / 2, arrowY);
// Calculate dynamic directional rotation targeting the Boss Lair at room coordinates [1,1]
let angle = 0;
if (currentRoomX === 0 && currentRoomY === 0) angle = 0.78; // Points Down-Right (East then South)
else if (currentRoomX === 1 && currentRoomY === 0) angle = 1.57; // Points straight Down (South)
else if (currentRoomX === 2 && currentRoomY === 0) angle = 2.35; // Points Down-Left (West then South)
else if (currentRoomX === 0 && currentRoomY === 1) angle = 0;    // Points straight Right (East)
ctx.rotate(angle);
// Draw neon green arrow geometry path if boss isn't dead on screen
if (!(currentRoomX === 1 && currentRoomY === 1 && room.monsters.length === 0)) {
ctx.fillStyle = '#1dd1a1';
ctx.beginPath();
ctx.moveTo(8, 0);
ctx.lineTo(-4, -6);
ctx.lineTo(-4, -2);
ctx.lineTo(-12, -2);
ctx.lineTo(-12, 2);
ctx.lineTo(-4, 2);
ctx.lineTo(-4, 6);
ctx.closePath();
ctx.fill();
}
ctx.restore();
}
if (hero.isAttacking) {
ctx.fillStyle = hero.currentWeapon === 'sword' ? 'rgba(241, 196, 15, 0.7)' : 'rgba(149, 165, 166, 0.8)';
if (hero.currentWeapon !== 'staff') ctx.fillRect(hero.x + hero.dirX * 22, hero.y + hero.dirY * 22, 20, 20);
}
// HUD Top Panel Layout
ctx.fillStyle = '#111811'; ctx.fillRect(0, 0, VIRTUAL_WIDTH, 40);
ctx.fillStyle = '#ffffff'; ctx.font = '14px "Courier New"';
let heartsString = "";
for(let i=0; i<3; i++) {
if(hero.health >= (i+1)2) heartsString += "❤️";
else if(hero.health === (i2)+1) heartsString += "💔";
else heartsString += "🖤";
}
ctx.fillText(VITALITY: ${heartsString}, 20, 25);
ctx.fillText(ROOM: [${currentRoomX},${currentRoomY}], 210, 25);
ctx.fillText(WEAPON: ${hero.currentWeapon.toUpperCase()}, 405, 25);
}
function loop() {
handleInput();
update();
draw();
requestAnimationFrame(loop);
}
loop();


