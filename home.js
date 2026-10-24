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

const obstacles = [
    { x: 0, y: 0, width: 640, height: 32 },
    { x: 0, y: 448, width: 640, height: 32 },
    { x: 0, y: 0, width: 32, height: 480 },
    { x: 608, y: 0, width: 32, height: 480 },
    { x: 120, y: 120, width: 64, height: 64 },
    { x: 450, y: 100, width: 96, height: 64 },
    { x: 220, y: 280, width: 64, height: 96 }
];

const spells = [];

// Enemies configured with aggression ranges
const monsters = [
    { x: 150, y: 200, width: 32, height: 32, speed: 2.5, dirX: 1, dirY: 0, health: 4, steps: 20, aggroRange: 250 },
    { x: 400, y: 320, width: 32, height: 32, speed: 2.5, dirX: 0, dirY: -1, health: 4, steps: 20, aggroRange: 250 }
];

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
    if (gameState === "MENU") {
        gameState = "PLAYING";
        mainMenu.style.opacity = 0;
        setTimeout(() => { mainMenu.style.display = 'none'; }, 400);
    } else if (gameState === "GAMEOVER") {
        hero.health = hero.maxHealth;
        hero.score = 0;
        hero.x = 300;
        hero.y = 240;
        hero.invincible = false;
        spells.length = 0;
        monsters.length = 0;
        monsters.push(
            { x: 150, y: 200, width: 32, height: 32, speed: 2.5, dirX: 1, dirY: 0, health: 4, steps: 20, aggroRange: 250 },
            { x: 400, y: 320, width: 32, height: 32, speed: 2.5, dirX: 0, dirY: -1, health: 4, steps: 20, aggroRange: 250 }
        );
        gameState = "PLAYING";
    }
}

window.addEventListener('keydown', (e) => { 
    keys[e.code] = true; 
    startGame();
});
window.addEventListener('mousedown', () => {
    startGame();
});
window.addEventListener('keyup', (e) => { keys[e.code] = false; });

function checkCollision(r1, r2) {
    return r1.x < r2.x + r2.width && r1.x + r1.width > r2.x &&
           r1.y < r2.y + r2.height && r1.y + r1.height > r2.y;
}

function handleInput() {
    if (gameState !== "PLAYING") return;
    let moveX = 0, moveY = 0;

    if (keys['ArrowUp'] || keys['KeyW']) { moveY = -1; hero.dirX = 0; hero.dirY = -1; }
    else if (keys['ArrowDown'] || keys['KeyS']) { moveY = 1; hero.dirX = 0; hero.dirY = 1; }
    else if (keys['ArrowLeft'] || keys['KeyA']) { moveX = -1; hero.dirX = -1; hero.dirY = 0; }
    else if (keys['ArrowRight'] || keys['KeyD']) { moveX = 1; hero.dirX = 1; hero.dirY = 0; }

    if (moveX !== 0 || moveY !== 0) {
        hero.x += moveX * hero.speed;
        for (let obs of obstacles) if (checkCollision(hero, obs)) hero.x -= moveX * hero.speed;
        hero.y += moveY * hero.speed;
        for (let obs of obstacles) if (checkCollision(hero, obs)) hero.y -= moveY * hero.speed;
    }

    if (keys['Space'] && !hero.isAttacking) {
        hero.isAttacking = true;
        hero.currentWeapon = 'sword';
        hero.attackTimer = 10;
        executeAttack();
    }
    if (keys['ShiftLeft'] && !hero.isAttacking) {
        hero.isAttacking = true;
        hero.currentWeapon = 'staff';
        hero.attackTimer = 15;
        spells.push({ x: hero.x + 8, y: hero.y + 8, width: 12, height: 12, velX: hero.dirX * 6, velY: hero.dirY * 6 });
    }
}

function executeAttack() {
    const hitbox = { x: hero.x + hero.dirX * 24, y: hero.y + hero.dirY * 24, width: 24, height: 24 };
    for (let i = monsters.length - 1; i >= 0; i--) {
        if (checkCollision(hitbox, monsters[i])) {
            monsters[i].health -= 2; 
            monsters[i].x += hero.dirX * 40; 
            monsters[i].y += hero.dirY * 40;
            if (monsters[i].health <= 0) { 
                monsters.splice(i, 1); 
                hero.score += 101; 
            }
        }
    }
}

function update() {
    if (gameState !== "PLAYING") return;

    if (hero.isAttacking) {
        hero.attackTimer--;
        if (hero.attackTimer <= 0) hero.isAttacking = false;
    }

    if (hero.invincible) {
        hero.invincibleTimer--;
        if (hero.invincibleTimer % 4 === 0) hero.flashState = !hero.flashState;
        if (hero.invincibleTimer <= 0) {
            hero.invincible = false;
            hero.flashState = false;
        }
    }

    for (let i = spells.length - 1; i >= 0; i--) {
        let s = spells[i]; s.x += s.velX; s.y += s.velY;
        let hit = false;
        for (let obs of obstacles) if (checkCollision(s, obs)) hit = true;
        if (hit) { spells.splice(i, 1); continue; }
        for (let j = monsters.length - 1; j >= 0; j--) {
            if (checkCollision(s, monsters[j])) {
                monsters[j].health -= 2; 
                spells.splice(i, 1);
                if (monsters[j].health <= 0) { 
                    monsters.splice(j, 1); 
                    hero.score += 101; 
                }
                break;
            }
        }
    }

    for (let m of monsters) {
        // Calculate straight line distance to player
        let diffX = hero.x - m.x;
        let diffY = hero.y - m.y;
        let distance = Math.sqrt(diffX * diffX + diffY * diffY);

        // 🟢 NEW AGGRESSIVE TRACKING AI
        if (distance < m.aggroRange) {
            // Chase the player along the axis with the largest gap
            if (Math.abs(diffX) > Math.abs(diffY)) {
                m.dirX = diffX > 0 ? 1 : -1;
                m.dirY = 0;
            } else {
                m.dirX = 0;
                m.dirY = diffY > 0 ? 1 : -1;
            }
        } else {
            // Idle wander code if player is far away
            m.steps--;
            if (m.steps <= 0) {
                m.steps = Math.floor(Math.random() * 20) + 15;
                let r = Math.random();
                if (r < 0.25) { m.dirX = 1; m.dirY = 0; } else if (r < 0.5) { m.dirX = -1; m.dirY = 0; }
                else if (r < 0.75) { m.dirX = 0; m.dirY = 1; } else { m.dirX = 0; m.dirY = -1; }
            }
        }

        // Apply movement vector changes
        m.x += m.dirX * m.speed; m.y += m.dirY * m.speed;
        
        // Handle wall block avoidance
        for (let obs of obstacles) {
            if (checkCollision(m, obs)) {
                m.x -= m.dirX * m.speed; 
                m.y -= m.dirY * m.speed; 
                
                // If stuck on a wall while chasing, try to slip around horizontally/vertically
                if (distance < m.aggroRange) {
                    if (m.dirX !== 0) { m.dirX = 0; m.dirY = diffY > 0 ? 1 : -1; }
                    else { m.dirY = 0; m.dirX = diffX > 0 ? 1 : -1; }
                } else {
                    m.steps = 0; 
                }
            }
        }

        // Hit player logic
        if (checkCollision(hero, m) && !hero.invincible) {
            hero.health--;
            hero.invincible = true;
            hero.invincibleTimer = 30; 
            
            hero.x += m.dirX * 45;
            hero.y += m.dirY * 45;

            for (let obs of obstacles) if (checkCollision(hero, obs)) { hero.x -= m.dirX * 45; hero.y -= m.dirY * 45; }

            if (hero.health <= 0) {
                gameState = "GAMEOVER";
            }
        }
    }
}

function draw() {
    ctx.clearRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

    if (gameState === "GAMEOVER") {
        ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
        ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
        
        ctx.fillStyle = "#ff3f34";
        ctx.font = 'bold 36px "Courier New"';
        ctx.textAlign = "center";
        ctx.fillText("GAME OVER", VIRTUAL_WIDTH / 2, VIRTUAL_HEIGHT / 2 - 20);
        
        ctx.fillStyle = "#ffffff";
        ctx.font = '16px "Courier New"';
        ctx.fillText("PRESS ANY KEY TO RETRY", VIRTUAL_WIDTH / 2, VIRTUAL_HEIGHT / 2 + 30);
        ctx.textAlign = "left";
        return;
    }

    // Obstacles
    ctx.fillStyle = '#4a3319';
    for (let obs of obstacles) ctx.fillRect(obs.x, obs.y, obs.width, obs.height);

    // Spells
    ctx.fillStyle = '#00ffff';
    for (let s of spells) ctx.fillRect(s.x, s.y, s.width, s.height);

    // Monsters
    ctx.fillStyle = '#9b59b6';
    for (let m of monsters) ctx.fillRect(m.x, m.y, m.width, m.height);

    // Hero Character Model
    if (!hero.flashState) {
        ctx.fillStyle = '#e67e22'; 
    } else {
        ctx.fillStyle = '#ff4d4d'; 
    }
    ctx.fillRect(hero.x, hero.y, hero.width, hero.height);
    
    ctx.fillStyle = '#f1c40f';
    ctx.fillRect(hero.x + (hero.dirX * 4) + 6, hero.y + (hero.dirY * 4) + 6, 12, 6);

    if (hero.isAttacking && hero.currentWeapon === 'sword') {
        ctx.fillStyle = '#f1c40f';
        ctx.fillRect(hero.x + hero.dirX * 22 + 4, hero.y + hero.dirY * 22 + 4, 16, 16);
    }

    // Top HUD
    ctx.fillStyle = '#111811';
    ctx.fillRect(0, 0, VIRTUAL_WIDTH, 40);
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px "Courier New"';
    
    let heartsString = "";
    for(let i=0; i<3; i++) {
        if(hero.health >= (i+1)*2) heartsString += "❤️";
        else if(hero.health === (i*2)+1) heartsString += "💔";
        else heartsString += "🖤";
    }
    ctx.fillText(`VITALITY: ${heartsString}`, 20, 25);
    ctx.fillText(`SCORE: ${hero.score}`, 520, 25);
}

function loop() {
