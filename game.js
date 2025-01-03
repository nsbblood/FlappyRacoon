class Game {
    constructor() {
        this.canvas = document.getElementById('game');
        this.ctx = this.canvas.getContext('2d');
        this.setCanvasSize();
        
        // Game state
        this.gameStarted = false;
        this.gameOver = false;
        this.score = 0;
        this.coins = 0;
        this.savedCoins = parseInt(localStorage.getItem('coins')) || 0;
        this.highScore = parseInt(localStorage.getItem('highScore')) || 0;
        
        // Sound effects
        this.sounds = {
            jump: new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3'),
            collect: new Audio('https://assets.mixkit.co/active_storage/sfx/1114/1114-preview.mp3'),
            hit: new Audio('https://assets.mixkit.co/active_storage/sfx/2658/2658-preview.mp3')
        };
        this.isMuted = localStorage.getItem('isMuted') === 'true';
        
        // Particles system
        this.particles = [];
        
        // Backgrounds
        this.backgrounds = [
            { id: 1, name: 'Forest', image: 'forestbackground.jpeg' },
            { id: 2, name: 'Candy World', image: 'candyworldbackground.jpeg' },
            { id: 3, name: 'City Night', image: 'citynight.jpg' }
        ];
        this.currentBackground = this.backgrounds[localStorage.getItem('selectedBackground') || 0];
        
        // Load background image
        this.backgroundImage = new Image();
        this.backgroundImage.src = this.currentBackground.image;
        
        // Character selection
        this.characters = [
            { id: 1, name: 'Raccoon 1', price: 0, image: 'racoon1.png', unlocked: true },
            { id: 2, name: 'Raccoon 2', price: 100, image: 'racoon2.png', unlocked: false },
            { id: 3, name: 'Raccoon 3', price: 200, image: 'racoon3.png', unlocked: false },
            { id: 4, name: 'Raccoon 4', price: 300, image: 'racoon4.png', unlocked: false }
        ];
        this.currentCharacter = this.characters[0];
        
        // Game objects
        this.player = {
            x: this.canvas.width / 4,
            y: this.canvas.height / 2,
            width: 126,
            height: 126,
            velocity: 0,
            gravity: 0.5,
            jump: -8
        };
        
        this.obstacles = [];
        this.foods = [];
        
        // Load character image
        this.playerImage = new Image();
        this.playerImage.src = this.currentCharacter.image;
        
        // Food images
        this.foodImages = [
            { img: new Image(), src: 'food1.png' },
            { img: new Image(), src: 'food2.png' }
        ];
        this.foodImages.forEach(food => food.img.src = food.src);
        
        // Performance optimization
        this.lastTime = 0;
        this.fpsInterval = 1000 / 60;
        this.animationFrame = null;
        
        // Event listeners
        window.addEventListener('resize', () => this.setCanvasSize());
        
        // Add jump particle effect on space key
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                if (!this.gameStarted) {
                    this.startGame();
                }
                this.jump();
            }
        });
        
        // Touch events for mobile with particle effects
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (!this.gameStarted) {
                this.startGame();
            }
            this.jump();
        });
        
        // Initialize rewards system
        this.claimedRewards = JSON.parse(localStorage.getItem('claimedRewards')) || {};
        
        // Initialize UI
        this.initializeUI();
        this.loadUnlockedCharacters();
        this.updateShop();
    }
    
    setCanvasSize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }
    
    initializeUI() {
        document.getElementById('playButton').addEventListener('click', () => {
            document.getElementById('mainMenu').style.display = 'none';
            document.getElementById('gameCanvas').style.display = 'block';
            this.startGame();
        });
        
        document.getElementById('shopButton').addEventListener('click', () => {
            document.getElementById('mainMenu').style.display = 'none';
            document.getElementById('shop').style.display = 'flex';
        });
        
        document.getElementById('backButton').addEventListener('click', () => {
            document.getElementById('shop').style.display = 'none';
            document.getElementById('mainMenu').style.display = 'flex';
        });
        
        document.getElementById('restartButton').addEventListener('click', () => {
            this.startGame();
        });
        
        document.getElementById('menuButton').addEventListener('click', () => {
            document.getElementById('gameOver').style.display = 'none';
            document.getElementById('gameCanvas').style.display = 'none';
            document.getElementById('mainMenu').style.display = 'flex';
        });
        
        document.getElementById('backgroundButton').addEventListener('click', () => {
            document.getElementById('mainMenu').style.display = 'none';
            document.getElementById('backgrounds').style.display = 'flex';
            this.updateBackgroundsList();
        });
        
        document.getElementById('backToMenuButton').addEventListener('click', () => {
            document.getElementById('backgrounds').style.display = 'none';
            document.getElementById('mainMenu').style.display = 'flex';
        });
        
        document.getElementById('rewardsButton').addEventListener('click', () => {
            document.getElementById('mainMenu').style.display = 'none';
            document.getElementById('rewards').style.display = 'flex';
            this.updateRewardsUI();
        });
        
        document.getElementById('rewardsBackButton').addEventListener('click', () => {
            document.getElementById('rewards').style.display = 'none';
            document.getElementById('mainMenu').style.display = 'flex';
        });
        
        // Initialize reward buttons
        document.querySelectorAll('.reward-button').forEach(button => {
            button.addEventListener('click', () => {
                const rewardType = button.dataset.reward;
                this.handleReward(rewardType, button);
            });
        });
        
        // Initialize share button in game over screen
        document.getElementById('shareButton').addEventListener('click', () => {
            this.handleShare();
        });
        
        // Add mute button
        const muteButton = document.createElement('button');
        muteButton.id = 'muteButton';
        muteButton.innerHTML = this.isMuted ? '<i class="fas fa-volume-mute"></i>' : '<i class="fas fa-volume-up"></i>';
        muteButton.style.position = 'fixed';
        muteButton.style.top = '20px';
        muteButton.style.right = '20px';
        muteButton.style.zIndex = '1000';
        document.body.appendChild(muteButton);
        
        muteButton.addEventListener('click', () => {
            this.isMuted = !this.isMuted;
            localStorage.setItem('isMuted', this.isMuted);
            muteButton.innerHTML = this.isMuted ? '<i class="fas fa-volume-mute"></i>' : '<i class="fas fa-volume-up"></i>';
        });
    }
    
    loadUnlockedCharacters() {
        const unlockedCharacters = JSON.parse(localStorage.getItem('unlockedCharacters')) || [1];
        this.characters.forEach(char => {
            char.unlocked = unlockedCharacters.includes(char.id);
        });
    }
    
    updateShop() {
        const shopContainer = document.getElementById('characters');
        shopContainer.innerHTML = '';
        document.getElementById('coinBalance').textContent = this.savedCoins;
        
        this.characters.forEach(char => {
            const card = document.createElement('div');
            card.className = 'character-card';
            
            const img = document.createElement('img');
            img.src = char.image;
            
            const button = document.createElement('button');
            if (char.unlocked) {
                button.textContent = 'Select';
                button.onclick = () => this.selectCharacter(char);
            } else {
                button.textContent = `Buy (${char.price} coins)`;
                button.onclick = () => this.purchaseCharacter(char);
            }
            
            card.appendChild(img);
            card.appendChild(button);
            shopContainer.appendChild(card);
        });
    }
    
    selectCharacter(character) {
        this.currentCharacter = character;
        this.playerImage.src = character.image;
        document.getElementById('shop').style.display = 'none';
        document.getElementById('mainMenu').style.display = 'flex';
    }
    
    purchaseCharacter(character) {
        if (this.savedCoins >= character.price) {
            this.savedCoins -= character.price;
            character.unlocked = true;
            localStorage.setItem('coins', this.savedCoins);
            
            const unlockedCharacters = JSON.parse(localStorage.getItem('unlockedCharacters')) || [1];
            unlockedCharacters.push(character.id);
            localStorage.setItem('unlockedCharacters', JSON.stringify(unlockedCharacters));
            
            this.updateShop();
        }
    }
    
    startGame() {
        this.gameStarted = true;
        this.gameOver = false;
        this.score = 0;
        this.coins = 0;
        this.obstacles = [];
        this.foods = [];
        this.player.y = this.canvas.height / 2;
        this.player.velocity = 0;
        
        // Show game canvas and hide other screens
        document.getElementById('mainMenu').style.display = 'none';
        document.getElementById('gameOver').style.display = 'none';
        document.getElementById('gameCanvas').style.display = 'block';
        
        // Add initial obstacle
        this.addObstacle();
        
        // Reset animation frame and start game loop
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        this.lastTime = performance.now();
        this.gameLoop();
    }
    
    resetGame() {
        this.gameStarted = false;
        this.gameOver = false;
        this.score = 0;
        this.coins = 0;
        this.obstacles = [];
        this.foods = [];
        this.player.y = this.canvas.height / 2;
        this.player.velocity = 0;
    }
    
    addObstacle() {
        const gap = 288;  
        const minHeight = 105;
        const maxHeight = this.canvas.height - gap - minHeight;
        const height = Math.random() * (maxHeight - minHeight) + minHeight;
        
        this.obstacles.push({
            x: this.canvas.width,
            y: 0,
            width: 126,
            height: height,
            passed: false
        });
        
        this.obstacles.push({
            x: this.canvas.width,
            y: height + gap,
            width: 126,
            height: this.canvas.height - height - gap,
            passed: false
        });
        
        // Add food between obstacles
        if (Math.random() < 0.7) { 
            this.foods.push({
                x: this.canvas.width + 63,
                y: height + gap / 2,
                width: 63,
                height: 63,
                collected: false,
                type: Math.floor(Math.random() * this.foodImages.length)
            });
        }
    }
    
    createJumpParticles() {
        const particleCount = 15;  
        const colors = [
            '#ffd700', 
            '#ff6b6b', 
            '#ff8e53', 
            '#ffeb3b', 
            '#ffc107'  
        ];
        
        for (let i = 0; i < particleCount; i++) {
            this.particles.push({
                x: this.player.x + this.player.width * 0.3,  
                y: this.player.y + this.player.height * 0.8,  
                vx: (Math.random() * 2 - 1) * 2,  
                vy: (Math.random() * 2 + 2) * 1.5,  
                size: Math.random() * 6 + 3,  
                color: colors[Math.floor(Math.random() * colors.length)],
                life: 1.0  
            });
        }
    }

    updateParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            particle.x += particle.vx * 1.2;  
            particle.y += particle.vy * 0.8;  
            particle.life -= 0.04;  
            
            if (particle.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    drawParticles() {
        this.particles.forEach(particle => {
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fillStyle = particle.color.replace('1)', `${particle.life})`);
            this.ctx.fill();
        });
    }
    
    updateGame() {
        if (this.gameOver) return;
        
        // Update particles
        this.updateParticles();
        
        // Update player
        this.player.velocity += this.player.gravity;
        this.player.y += this.player.velocity;
        
        // Check collisions with canvas boundaries
        if (this.player.y < 0) {
            this.player.y = 0;
            this.player.velocity = 0;
        }
        if (this.player.y + this.player.height > this.canvas.height) {
            this.handleCollision();
        }
        
        // Update obstacles
        this.obstacles.forEach(obstacle => {
            obstacle.x -= 3;
            
            // Check collision with obstacles
            if (this.checkCollision(this.player, obstacle)) {
                this.handleCollision();
            }
            
            // Update score
            if (!obstacle.passed && obstacle.x + obstacle.width < this.player.x) {
                obstacle.passed = true;
                this.score += 0.5; 
            }
        });
        
        // Update foods
        this.foods.forEach(food => {
            food.x -= 3;
            
            // Check collision with food
            if (!food.collected && this.checkCollision(this.player, food)) {
                food.collected = true;
                this.coins++;
                this.collectFood(food);
            }
        });
        
        // Remove off-screen obstacles and foods
        this.obstacles = this.obstacles.filter(obstacle => obstacle.x + obstacle.width > 0);
        this.foods = this.foods.filter(food => food.x + food.width > 0);
        
        // Add new obstacles
        if (this.obstacles.length === 0 || this.obstacles[this.obstacles.length - 1].x < this.canvas.width - 300) {
            this.addObstacle();
        }
    }
    
    drawGame() {
        // Clear canvas with optimization
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw background
        this.ctx.drawImage(this.backgroundImage, 0, 0, this.canvas.width, this.canvas.height);
        
        // Draw particles with glow effect
        this.particles.forEach(particle => {
            this.ctx.save();
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            
            // Add glow effect
            this.ctx.shadowColor = particle.color;
            this.ctx.shadowBlur = 15;
            
            this.ctx.fillStyle = particle.color.replace('1)', `${particle.life})`);
            this.ctx.fill();
            this.ctx.restore();
        });
        
        // Draw player with slight glow
        this.ctx.save();
        this.ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
        this.ctx.shadowBlur = 10;
        this.ctx.drawImage(this.playerImage, this.player.x, this.player.y, this.player.width, this.player.height);
        this.ctx.restore();
        
        // Draw obstacles with gradient
        this.obstacles.forEach(obstacle => {
            const gradient = this.ctx.createLinearGradient(
                obstacle.x, obstacle.y,
                obstacle.x + obstacle.width, obstacle.y + obstacle.height
            );
            gradient.addColorStop(0, '#0d3d1f');
            gradient.addColorStop(1, '#0a2d17');
            
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
            
            // Add metallic-looking border
            this.ctx.strokeStyle = '#1a6b39';
            this.ctx.lineWidth = 4;
            this.ctx.strokeRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
            
            // Add highlight
            this.ctx.beginPath();
            this.ctx.moveTo(obstacle.x, obstacle.y);
            this.ctx.lineTo(obstacle.x + obstacle.width, obstacle.y);
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        });
        
        // Draw foods with glow effect
        this.foods.forEach(food => {
            if (!food.collected) {
                this.ctx.save();
                this.ctx.shadowColor = '#ffd700';
                this.ctx.shadowBlur = 15;
                this.ctx.drawImage(this.foodImages[food.type].img, food.x, food.y, food.width, food.height);
                this.ctx.restore();
            }
        });
        
        // Draw score and coins with gradient
        const scoreGradient = this.ctx.createLinearGradient(20, 0, 20, 100);
        scoreGradient.addColorStop(0, '#ffd700');
        scoreGradient.addColorStop(1, '#ffa000');
        
        this.ctx.fillStyle = scoreGradient;
        this.ctx.font = 'bold 36px Arial';
        this.ctx.textBaseline = 'top';
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        this.ctx.shadowBlur = 5;
        this.ctx.fillText(`Score: ${Math.floor(this.score)}`, 20, 20);
        this.ctx.fillText(`Coins: ${this.coins}`, 20, 70);
    }
    
    checkCollision(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }
    
    gameLoop(currentTime) {
        // Calculate time elapsed
        const elapsed = currentTime - this.lastTime;
        
        // Only update if enough time has passed
        if (elapsed > this.fpsInterval) {
            this.lastTime = currentTime - (elapsed % this.fpsInterval);
            
            // Clear canvas with optimization
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            
            // Draw background
            this.ctx.drawImage(this.backgroundImage, 0, 0, this.canvas.width, this.canvas.height);
            
            if (!this.gameOver) {
                this.updateGame();
                this.drawGame();
            }
        }
        
        this.animationFrame = requestAnimationFrame((time) => this.gameLoop(time));
    }
    
    handleCollision() {
        if (!this.gameOver) {
            this.gameOver = true;
            if (!this.isMuted) this.sounds.hit.play();
            
            // Update high score
            if (this.score > this.highScore) {
                this.highScore = this.score;
                localStorage.setItem('highScore', this.highScore);
            }
            
            // Save coins
            this.savedCoins += this.coins;
            localStorage.setItem('coins', this.savedCoins);
            
            document.getElementById('finalScore').textContent = this.score;
            document.getElementById('finalCoins').textContent = this.coins;
            document.getElementById('gameCanvas').style.display = 'none';
            document.getElementById('gameOver').style.display = 'flex';
        }
    }
    
    jump() {
        if (!this.isMuted) this.sounds.jump.play();
        this.player.velocity = this.player.jump;
        this.createJumpParticles();
    }
    
    collectFood(food) {
        if (!this.isMuted) this.sounds.collect.play();
        this.score += 10;
        this.coins += 1;
        this.createCollectParticles(food.x, food.y);
        return true;
    }
    
    updateBackgroundsList() {
        const container = document.getElementById('backgroundsList');
        container.innerHTML = '';
        
        this.backgrounds.forEach(bg => {
            const card = document.createElement('div');
            card.className = 'background-card';
            if (bg.id === this.currentBackground.id) {
                card.classList.add('selected');
            }
            
            const img = document.createElement('img');
            img.src = bg.image;
            
            const name = document.createElement('p');
            name.textContent = bg.name;
            
            card.appendChild(img);
            card.appendChild(name);
            
            card.addEventListener('click', () => {
                this.selectBackground(bg);
            });
            
            container.appendChild(card);
        });
    }
    
    selectBackground(background) {
        this.currentBackground = background;
        this.backgroundImage.src = background.image;
        localStorage.setItem('selectedBackground', this.backgrounds.indexOf(background));
        this.updateBackgroundsList();
    }
    
    updateRewardsUI() {
        document.querySelectorAll('.reward-button').forEach(button => {
            const rewardType = button.dataset.reward;
            if (this.claimedRewards[rewardType]) {
                button.textContent = 'Claimed!';
                button.classList.add('claimed');
                button.disabled = true;
            }
        });
    }
    
    handleReward(rewardType, button) {
        if (this.claimedRewards[rewardType]) return;
        
        let twitterHandle = '';
        let coinsToAdd = 0;
        
        switch(rewardType) {
            case 'twitter1':
                twitterHandle = 'aiarteth';
                coinsToAdd = 50;
                break;
            case 'twitter2':
                twitterHandle = 'AI_RACX';
                coinsToAdd = 50;
                break;
            case 'share':
                this.handleShare();
                return;
        }
        
        if (twitterHandle) {
            window.open(`https://twitter.com/${twitterHandle}`, '_blank');
            
            // Mark as claimed and add coins
            this.claimedRewards[rewardType] = true;
            this.savedCoins += coinsToAdd;
            
            // Update UI
            button.textContent = 'Claimed!';
            button.classList.add('claimed');
            button.disabled = true;
            
            // Save to localStorage
            localStorage.setItem('claimedRewards', JSON.stringify(this.claimedRewards));
            localStorage.setItem('coins', this.savedCoins);
            
            // Update coin display
            document.getElementById('coinBalance').textContent = this.savedCoins;
        }
    }
    
    handleShare() {
        const shareText = `🦝 Just scored ${Math.floor(this.score)} points in Flappy Racoon! 🎮\n\nAn adorable game made by @aiarteth for @AI_RACX! Try to beat my score!\n\n#FlappyRacoon #GameChallenge #IndieGame`;
        
        // Always use Twitter share with fixed game URL
        const gameUrl = 'https://airacx.playdaos.fun';
        const twitterShareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(gameUrl)}`;
        window.open(twitterShareUrl, '_blank');
        
        if (!this.claimedRewards['share']) {
            this.claimedRewards['share'] = true;
            this.savedCoins += 100;
            localStorage.setItem('claimedRewards', JSON.stringify(this.claimedRewards));
            localStorage.setItem('coins', this.savedCoins);
            document.getElementById('coinBalance').textContent = this.savedCoins;
            
            const shareButton = document.querySelector('.reward-button[data-reward="share"]');
            if (shareButton) {
                shareButton.textContent = 'Claimed!';
                shareButton.classList.add('claimed');
                shareButton.disabled = true;
            }
        }
    }
}

// Initialize the game when the window loads
window.onload = () => {
    new Game();
};
