class Game {
    constructor() {
        this.canvas = document.getElementById('game');
        this.ctx = this.canvas.getContext('2d');
        
        // Game configuration
        this.config = {
            gravity: 0.4,  // Slightly reduced gravity for better control
            jumpForce: -8,
            initialGameSpeed: 2.4,
            gameSpeed: 3,
            speedIncrease: 0.1,
            speedIncreaseInterval: 10000, // Speed up every 10 seconds
            maxGameSpeed: 6,
            obstacleGap: 234,
            minObstacleHeight: 100,
            obstacleWidth: 60,
            playerSize: 120,
            foodSize: 63,
            scoreMultiplier: 0.1,
            coinValue: 5,  // Increased coin value
            invincibilityTime: 500, // Short invincibility after collecting coins
            obstacleColor: '#1e8449',
            powerUps: {
                doublePoints: { duration: 5000, chance: 0.2 },
                shield: { duration: 3000, chance: 0.15 },
                miniSize: { duration: 4000, chance: 0.15 }
            },
            backgroundOpacity: 0.3  // Reduced background opacity
        };
        
        // Initialize game state
        this.gameStarted = false;
        this.gameOver = false;
        this.score = 0;
        this.coins = 0;
        this.savedCoins = Number(localStorage.getItem('coins')) || 0;
        this.highScore = Number(localStorage.getItem('highScore')) || 0;
        this.imagesLoaded = false;
        this.lastSpeedIncrease = 0;
        this.animationFrame = null;
        this.claimedRewards = JSON.parse(localStorage.getItem('claimedRewards')) || {};
        this.powerUps = [];
        this.activePowerUps = {
            doublePoints: false,
            shield: false,
            miniSize: false
        };

        // Visual effects states
        this.isInvincible = false;
        this.glowIntensity = 0;
        this.rainbowHue = 0;
        this.lastSparkleTime = 0;

        // Particles system
        this.particles = [];
        
        // Backgrounds
        this.backgrounds = [
            { id: 1, name: 'Forest', image: 'forestbackground.jpeg', price: 0, unlocked: true },
            { id: 2, name: 'Candy World', image: 'candyworldbackground.jpeg', price: 250, unlocked: false },
            { id: 3, name: 'City Night', image: 'citynight.jpg', price: 500, unlocked: false }
        ];
        
        // Load unlocked backgrounds
        this.loadUnlockedBackgrounds();
        
        // Set current background
        const selectedBackground = Number(localStorage.getItem('selectedBackground')) || 0;
        this.currentBackground = this.backgrounds[selectedBackground];
        
        // Characters
        this.characters = [
            { id: 1, name: 'Raccoon 1', price: 0, image: 'racoon1.png', unlocked: true },
            { id: 2, name: 'Raccoon 2', price: 100, image: 'racoon2.png', unlocked: false },
            { id: 3, name: 'Raccoon 3', price: 200, image: 'racoon3.png', unlocked: false },
            { id: 4, name: 'Raccoon 4', price: 300, image: 'racoon4.png', unlocked: false }
        ];
        this.currentCharacter = this.characters[0];
        
        // Initialize the game
        this.init();
        
        // Add new properties for score effects
        this.lastSparkleScore = 0;
        this.highScoreCelebrated = false;
        
        // Load power-up images
        this.powerUpImages = {};
        this.loadPowerUpImages();
    }
    
    async init() {
        try {
            await this.loadImages();
            this.setupEventListeners();
            this.loadUnlockedCharacters();
            this.updateShop();
            this.initializeUI();
            this.setCanvasSize();
            this.imagesLoaded = true;
        } catch (error) {
            console.error('Failed to initialize game:', error);
        }
    }
    
    async loadImages() {
        try {
            // Background image
            this.backgroundImage = new Image();
            this.backgroundImage.src = this.currentBackground.image;
            
            // Player image
            this.playerImage = new Image();
            this.playerImage.src = this.currentCharacter.image;
            
            // Food images
            this.foodImages = [
                { img: new Image(), src: 'food1.png' },
                { img: new Image(), src: 'food2.png' }
            ];
            this.foodImages.forEach(food => food.img.src = food.src);
            
            // Wait for all images to load
            await Promise.all([
                new Promise((resolve, reject) => {
                    this.backgroundImage.onload = resolve;
                    this.backgroundImage.onerror = reject;
                }),
                new Promise((resolve, reject) => {
                    this.playerImage.onload = resolve;
                    this.playerImage.onerror = reject;
                }),
                ...this.foodImages.map(food => 
                    new Promise((resolve, reject) => {
                        food.img.onload = resolve;
                        food.img.onerror = reject;
                    })
                )
            ]);
            
            console.log('All images loaded successfully');
            return true;
        } catch (error) {
            console.error('Error loading images:', error);
            throw error;
        }
    }

    setupEventListeners() {
        // Window resize handler
        window.addEventListener('resize', () => this.setCanvasSize());
        
        // Keyboard controls
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault(); // Prevent page scrolling
                if (this.gameStarted && !this.gameOver) {
                    this.jump();
                }
            }
        });
        
        // Touch controls
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (this.gameStarted && !this.gameOver) {
                this.jump();
            }
        });
        
        // Mouse controls
        this.canvas.addEventListener('click', () => {
            if (this.gameStarted && !this.gameOver) {
                this.jump();
            }
        });
    }

    selectBackground(background) {
        if (background.unlocked) {
            this.currentBackground = background;
            localStorage.setItem('selectedBackground', this.backgrounds.indexOf(background));
            this.imagesLoaded = false; // Reset flag when changing background
            this.loadImages().then(() => {
                this.imagesLoaded = true;
                this.updateBackgroundsList();
            }).catch(error => {
                console.error('Error loading new background:', error);
            });
        }
    }

    initializeUI() {
        document.getElementById('playButton').addEventListener('click', async () => {
            if (!this.imagesLoaded) {
                console.log('Waiting for images to load...');
                await this.loadImages();
            }
            document.getElementById('mainMenu').style.display = 'none';
            document.getElementById('gameOver').style.display = 'none';
            document.getElementById('gameCanvas').style.display = 'flex';
            this.gameStarted = true;
            this.startGame();
        });
        
        document.getElementById('restartButton').addEventListener('click', () => {
            document.getElementById('gameOver').style.display = 'none';
            document.getElementById('gameCanvas').style.display = 'flex';
            this.gameStarted = true;  
            this.startGame();
        });

        document.getElementById('menuButton').addEventListener('click', () => {
            document.getElementById('gameOver').style.display = 'none';
            document.getElementById('gameCanvas').style.display = 'none';
            document.getElementById('mainMenu').style.display = 'flex';
            this.gameStarted = false;  
            if (this.animationFrame) {
                cancelAnimationFrame(this.animationFrame);
            }
        });

        document.getElementById('shopButton').addEventListener('click', () => {
            document.getElementById('mainMenu').style.display = 'none';
            document.getElementById('shop').style.display = 'flex';
        });
        
        document.getElementById('backButton').addEventListener('click', () => {
            document.getElementById('shop').style.display = 'none';
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
        
        document.querySelectorAll('.reward-button').forEach(button => {
            const rewardType = button.dataset.reward;
            button.addEventListener('click', () => {
                this.handleReward(rewardType, button);
            });
        });
        
        document.getElementById('shareButton').addEventListener('click', () => {
            this.handleShare();
        });
        
        // Update rewards UI on initialization
        this.updateRewardsUI();
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
            
            this.claimedRewards[rewardType] = true;
            this.savedCoins += coinsToAdd;
            
            button.textContent = 'Claimed!';
            button.classList.add('claimed');
            button.disabled = true;
            
            localStorage.setItem('claimedRewards', JSON.stringify(this.claimedRewards));
            localStorage.setItem('coins', this.savedCoins);
            
            document.getElementById('coinBalance').textContent = this.savedCoins;
        }
    }
    
    handleShare() {
        const shareText = `🦝 Just scored ${Math.floor(this.score)} points in Flappy Racoon! 🎮\n\nAn adorable game made by @aiarteth for @AI_RACX! Try to beat my score!\n\n#FlappyRacoon #GameChallenge #IndieGame`;
        
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
    
    loadUnlockedBackgrounds() {
        const unlockedBackgrounds = JSON.parse(localStorage.getItem('unlockedBackgrounds')) || [1];
        this.backgrounds.forEach(bg => {
            bg.unlocked = unlockedBackgrounds.includes(bg.id);
        });
    }
    
    loadUnlockedCharacters() {
        const unlockedCharacters = JSON.parse(localStorage.getItem('unlockedCharacters')) || [1];
        this.characters.forEach(char => {
            char.unlocked = unlockedCharacters.includes(char.id);
        });
    }
    
    updateBackgroundsList() {
        const container = document.getElementById('backgroundsList');
        container.innerHTML = '';
        
        this.backgrounds.forEach(bg => {
            const bgElement = document.createElement('div');
            bgElement.className = 'background-item' + (bg.unlocked ? ' unlocked' : '');
            
            const preview = document.createElement('div');
            preview.className = 'background-preview';
            preview.style.backgroundImage = `url(${bg.image})`;
            
            const info = document.createElement('div');
            info.className = 'background-info';
            
            const name = document.createElement('h3');
            name.textContent = bg.name;
            
            const button = document.createElement('button');
            if (bg.unlocked) {
                button.textContent = 'Select';
                button.onclick = () => this.selectBackground(bg);
            } else {
                button.textContent = `Buy ${bg.price} coins`;
                button.onclick = () => this.purchaseBackground(bg);
            }
            
            info.appendChild(name);
            info.appendChild(button);
            
            bgElement.appendChild(preview);
            bgElement.appendChild(info);
            container.appendChild(bgElement);
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
        } else {
            this.showNotification(`Not enough coins! You need ${character.price - this.savedCoins} more coins`);
        }
    }
    
    purchaseBackground(background) {
        if (background.unlocked) {
            this.selectBackground(background);
        } else if (this.savedCoins >= background.price) {
            this.savedCoins -= background.price;
            background.unlocked = true;
            
            const unlockedBackgrounds = JSON.parse(localStorage.getItem('unlockedBackgrounds')) || [1];
            unlockedBackgrounds.push(background.id);
            
            localStorage.setItem('unlockedBackgrounds', JSON.stringify(unlockedBackgrounds));
            localStorage.setItem('coins', this.savedCoins);
            
            document.getElementById('coinBalance').textContent = this.savedCoins;
            this.updateBackgroundsList();
        } else {
            this.showNotification(`Not enough coins! You need ${background.price - this.savedCoins} more coins`);
        }
    }

    resetGameObjects() {
        // Reset game state
        this.gameStarted = false;
        this.gameOver = false;
        this.score = 0;
        this.coins = 0;
        this.obstacles = [];
        this.foods = [];
        this.particles = [];
        this.powerUps = [];

        // Reset player position
        this.player = {
            x: this.canvas.width / 4,
            y: this.canvas.height / 2,
            width: this.config.playerSize,
            height: this.config.playerSize,
            velocity: 0
        };

        // Ensure canvas is properly sized
        this.setCanvasSize();
    }

    startGame() {
        if (!this.imagesLoaded) {
            console.log('Images not loaded yet');
            return;
        }

        // Reset game state
        this.gameOver = false;
        this.gameStarted = true;
        this.score = 0;
        this.coins = 0;
        this.config.gameSpeed = this.config.initialGameSpeed;
        this.lastSpeedIncrease = 0;
        
        // Clear existing objects
        this.obstacles = [];
        this.foods = [];
        this.particles = [];
        this.powerUps = [];
        
        // Set initial player position
        this.player = {
            x: this.canvas.width / 3,
            y: this.canvas.height / 2,
            width: this.config.playerSize,
            height: this.config.playerSize,
            velocity: 0
        };

        // Ensure canvas is properly sized
        this.setCanvasSize();
        
        // Clear any existing animation frame
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        
        // Add initial game objects
        this.addObstacle();
        this.addFood();
        
        // Start game loop
        this.lastTime = performance.now();
        this.gameLoop(this.lastTime);
    }

    setCanvasSize() {
        const container = document.getElementById('gameCanvas');
        if (!container) return;
        
        // Set canvas size to window size
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        // Center the player
        if (this.player) {
            this.player.x = this.canvas.width / 3;
            this.player.y = this.canvas.height / 2;
        }
        
        // Scale game objects based on screen size
        this.scale = Math.min(this.canvas.width / 1920, this.canvas.height / 1080);
    }

    showNotification(message) {
        // Remove any existing notification
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        // Create new notification
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        document.body.appendChild(notification);

        // Remove notification after animation completes
        setTimeout(() => {
            notification.remove();
        }, 2500);
    }

    jump() {
        if (this.gameOver) return;
        this.player.velocity = this.config.jumpForce;
        
        // Add jump particles
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI / 4) + (Math.PI / 2 * Math.random()); // Spread particles in a downward cone
            const speed = 2 + Math.random() * 3;
            const size = 3 + Math.random() * 4;
            
            this.particles.push(new Particle(
                this.player.x + this.player.width / 2,
                this.player.y + this.player.height,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                size,
                'rgba(255, 255, 255, 0.8)',
                0.8
            ));
        }
    }

    gameLoop(currentTime) {
        if (!this.gameStarted || this.gameOver) {
            return;
        }
        
        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw background with enhanced effects
        this.updateBackground();

        // Draw particles with enhanced glow
        this.ctx.save();
        this.ctx.globalCompositeOperation = 'lighter';
        this.particles.forEach(particle => {
            particle.draw(this.ctx);
        });
        this.ctx.restore();

        // Draw obstacles with enhanced visuals
        this.drawObstacles();

        // Draw player with enhanced effects
        this.drawPlayer();

        // Draw food with enhanced effects
        this.foods.forEach(food => {
            if (!food.collected) {
                this.ctx.save();
                
                // Add strong glow effect
                this.ctx.shadowColor = 'rgba(255, 215, 0, 0.8)';
                this.ctx.shadowBlur = 25;
                
                // Add floating animation
                const floatOffset = Math.sin(currentTime * 0.005) * 5;
                
                // Add spinning animation
                this.ctx.translate(
                    food.x + food.width / 2,
                    food.y + food.height / 2 + floatOffset
                );
                this.ctx.rotate(currentTime * 0.002);
                
                // Draw with slight scale animation
                const scale = 1 + Math.sin(currentTime * 0.005) * 0.1;
                this.ctx.scale(scale, scale);
                
                this.ctx.drawImage(
                    this.foodImages[food.type].img,
                    -food.width / 2,
                    -food.height / 2,
                    food.width,
                    food.height
                );
                
                this.ctx.restore();
            }
        });

        // Draw power-ups
        this.drawPowerUps();

        // Draw score with enhanced text effects
        this.drawScore();
        
        // Update game state
        this.update(deltaTime);
        
        // Request next frame
        if (!this.gameOver) {
            this.animationFrame = requestAnimationFrame((time) => this.gameLoop(time));
        }
    }

    updateBackground() {
        this.ctx.save();
        
        // Reduced opacity for calmer background
        this.ctx.globalAlpha = this.config.backgroundOpacity;
        
        // Softer blur effect
        this.ctx.filter = 'blur(4px) brightness(0.9)';
        
        // Draw background with enhanced quality
        this.ctx.drawImage(this.backgroundImage, 0, 0, this.canvas.width, this.canvas.height);
        
        // Add a soothing gradient overlay
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.3)');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.restore();
    }

    drawObstacles() {
        this.obstacles.forEach(obstacle => {
            const gradient = this.ctx.createLinearGradient(
                obstacle.x,
                obstacle.y,
                obstacle.x + obstacle.width,
                obstacle.y + obstacle.height
            );
            
            // Modern gradient colors
            gradient.addColorStop(0, '#2ecc71');   // Yeşilin açık tonu
            gradient.addColorStop(0.5, '#27ae60'); // Orta ton
            gradient.addColorStop(1, '#219a51');   // Koyu ton

            this.ctx.save();
            
            // Gölge efekti
            this.ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
            this.ctx.shadowBlur = 15;
            this.ctx.shadowOffsetX = 5;
            this.ctx.shadowOffsetY = 5;
            
            // Yuvarlatılmış köşeler için path çizimi
            const radius = 15; // köşe yuvarlaklığı
            
            this.ctx.beginPath();
            this.ctx.moveTo(obstacle.x + radius, obstacle.y);
            this.ctx.lineTo(obstacle.x + obstacle.width - radius, obstacle.y);
            this.ctx.quadraticCurveTo(obstacle.x + obstacle.width, obstacle.y, obstacle.x + obstacle.width, obstacle.y + radius);
            this.ctx.lineTo(obstacle.x + obstacle.width, obstacle.y + obstacle.height - radius);
            this.ctx.quadraticCurveTo(obstacle.x + obstacle.width, obstacle.y + obstacle.height, obstacle.x + obstacle.width - radius, obstacle.y + obstacle.height);
            this.ctx.lineTo(obstacle.x + radius, obstacle.y + obstacle.height);
            this.ctx.quadraticCurveTo(obstacle.x, obstacle.y + obstacle.height, obstacle.x, obstacle.y + obstacle.height - radius);
            this.ctx.lineTo(obstacle.x, obstacle.y + radius);
            this.ctx.quadraticCurveTo(obstacle.x, obstacle.y, obstacle.x + radius, obstacle.y);
            this.ctx.closePath();
            
            // Gradient fill
            this.ctx.fillStyle = gradient;
            this.ctx.fill();
            
            // Parlak kenar efekti
            const highlight = this.ctx.createLinearGradient(
                obstacle.x,
                obstacle.y,
                obstacle.x + 5,
                obstacle.y + obstacle.height
            );
            highlight.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
            highlight.addColorStop(0.5, 'rgba(255, 255, 255, 0.2)');
            highlight.addColorStop(1, 'rgba(255, 255, 255, 0)');
            
            this.ctx.fillStyle = highlight;
            this.ctx.fill();
            
            // İnce kenar çizgisi
            this.ctx.strokeStyle = '#219a51';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            
            this.ctx.restore();
            
            // Süsleme çizgileri
            const stripeCount = 3;
            const stripeSpacing = obstacle.height / (stripeCount + 1);
            this.ctx.save();
            this.ctx.globalAlpha = 0.1;
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 2;
            
            for (let i = 1; i <= stripeCount; i++) {
                const y = obstacle.y + (stripeSpacing * i);
                this.ctx.beginPath();
                this.ctx.moveTo(obstacle.x + 10, y);
                this.ctx.lineTo(obstacle.x + obstacle.width - 10, y);
                this.ctx.stroke();
            }
            this.ctx.restore();
        });
    }

    drawPlayer() {
        this.ctx.save();
        
        // Rainbow effect during invincibility
        if (this.isInvincible) {
            this.ctx.shadowColor = `hsl(${this.rainbowHue}, 100%, 50%)`;
            this.ctx.shadowBlur = 20;
            this.rainbowHue = (this.rainbowHue + 5) % 360;
        }
        
        // Calculate rotation based on velocity
        const rotation = Math.min(Math.max(this.player.velocity * 0.05, -0.5), 0.5);
        
        // Add floating animation
        const floatOffset = Math.sin(this.lastTime * 0.005) * 3;
        
        // Position with floating effect
        this.ctx.translate(
            this.player.x + this.player.width / 2,
            this.player.y + this.player.height / 2 + floatOffset
        );
        
        // Rotate
        this.ctx.rotate(rotation);
        
        // Add glow effect
        this.ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
        this.ctx.shadowBlur = 10 + Math.sin(this.lastTime * 0.01) * 5;
        
        // Draw player with slight scale animation
        const bounce = Math.sin(this.lastTime * 0.01) * 0.03;
        this.ctx.scale(1 + bounce, 1 + bounce);
        
        // Draw the player
        this.ctx.drawImage(
            this.playerImage,
            -this.player.width / 2,
            -this.player.height / 2,
            this.player.width,
            this.player.height
        );
        
        this.ctx.restore();
    }

    drawScore() {
        this.ctx.save();
        this.ctx.fillStyle = 'white';
        this.ctx.strokeStyle = 'black';
        this.ctx.lineWidth = 3;
        this.ctx.font = 'bold 24px Arial';
        this.ctx.textAlign = 'right';
        
        const displayScore = Math.floor(this.score);
        
        // Check for every 10 points
        if (displayScore > 0 && displayScore % 10 === 0 && displayScore !== this.lastSparkleScore) {
            this.addScoreSparkle();
            this.lastSparkleScore = displayScore;
        }

        // Check for new high score
        if (displayScore > this.highScore && !this.highScoreCelebrated) {
            this.celebrateHighScore();
            this.highScoreCelebrated = true;
        }
        
        // Draw score with animation
        const scoreScale = 1 + Math.sin(this.lastTime * 0.01) * 0.05;
        
        this.ctx.save();
        this.ctx.translate(30, 30);
        this.ctx.scale(scoreScale, scoreScale);
        this.ctx.strokeText(displayScore, 0, 0);
        this.ctx.fillText(displayScore, 0, 0);
        this.ctx.restore();
        
        // Draw high score
        this.ctx.font = '18px Arial';
        this.ctx.strokeText(`High Score: ${this.highScore}`, this.canvas.width - 20, 20);
        this.ctx.fillText(`High Score: ${this.highScore}`, this.canvas.width - 20, 20);
        
        this.ctx.restore();
    }

    addScoreSparkle() {
        // Create sparkle element
        const sparkle = document.createElement('div');
        sparkle.className = 'score-sparkle';
        sparkle.style.position = 'fixed';
        sparkle.style.left = '30px';
        sparkle.style.top = '30px';
        sparkle.style.fontSize = '24px';
        sparkle.style.color = 'gold';
        sparkle.style.textShadow = '0 0 10px rgba(255, 215, 0, 0.8)';
        sparkle.textContent = '+10';
        document.body.appendChild(sparkle);

        // Remove sparkle after animation
        setTimeout(() => {
            sparkle.remove();
        }, 500);
    }

    celebrateHighScore() {
        // Create celebration element
        const celebration = document.createElement('div');
        celebration.className = 'high-score-celebration';
        celebration.textContent = 'NEW HIGH SCORE! 🏆';
        document.body.appendChild(celebration);

        // Create particle effects
        for (let i = 0; i < 20; i++) {
            this.particles.push(new Particle(
                this.canvas.width / 2,
                this.canvas.height / 2,
                Math.random() * 4 - 2,
                Math.random() * -4 - 2,
                'gold'
            ));
        }

        // Remove celebration after animation
        setTimeout(() => {
            celebration.remove();
        }, 2000);
    }

    updateScore() {
        this.score++;
        const scoreElement = document.getElementById('currentScore');
        scoreElement.textContent = this.score;
        
        // Add update animation
        scoreElement.classList.add('score-updated');
        setTimeout(() => {
            scoreElement.classList.remove('score-updated');
        }, 300);

        // Update high score if needed
        if (this.score > this.highScore) {
            this.highScore = this.score;
            const highScoreElement = document.getElementById('highScore');
            highScoreElement.textContent = this.highScore;
            localStorage.setItem('highScore', this.highScore);
            
            // Add update animation to high score
            highScoreElement.classList.add('score-updated');
            setTimeout(() => {
                highScoreElement.classList.remove('score-updated');
            }, 300);
        }
    }

    update(deltaTime) {
        // Update game speed
        const currentTime = performance.now();
        if (currentTime - this.lastSpeedIncrease >= this.config.speedIncreaseInterval) {
            if (this.config.gameSpeed < this.config.maxGameSpeed) {
                this.config.gameSpeed += this.config.speedIncrease;
                this.lastSpeedIncrease = currentTime;
                console.log('Speed increased to:', this.config.gameSpeed);
            }
        }

        // Update player
        this.player.velocity += this.config.gravity;
        this.player.y += this.player.velocity;

        // Check boundaries
        if (this.player.y < 0) {
            this.player.y = 0;
            this.player.velocity = 0;
        }
        if (this.player.y + this.player.height > this.canvas.height) {
            this.handleCollision();
            return;
        }

        // Update obstacles
        this.obstacles.forEach(obstacle => {
            obstacle.x -= this.config.gameSpeed;

            if (!obstacle.passed && obstacle.x + obstacle.width < this.player.x) {
                obstacle.passed = true;
                this.updateScore();
                if (this.foods.length < 2) {
                    this.addFood();
                }
            }

            if (this.checkCollision(this.player, obstacle)) {
                this.handleCollision();
                return;
            }
        });

        // Remove off-screen obstacles
        this.obstacles = this.obstacles.filter(obstacle => obstacle.x + obstacle.width > 0);

        // Add new obstacles
        if (this.obstacles.length === 0 || 
            this.obstacles[this.obstacles.length - 1].x < this.canvas.width - 300) {
            this.addObstacle();
        }

        // Update food
        this.foods.forEach(food => {
            if (!food.collected) {
                food.x -= this.config.gameSpeed;

                if (this.checkCollision(this.player, food)) {
                    food.collected = true;
                    this.collectFood(food);
                }
            }
        });

        // Remove collected and off-screen food
        this.foods = this.foods.filter(food => !food.collected && food.x + food.width > 0);

        // Update power-ups
        this.powerUps.forEach(powerUp => {
            if (!powerUp.collected) {
                powerUp.x -= this.config.gameSpeed;

                // Check for collection
                if (this.checkCollision(this.player, powerUp)) {
                    powerUp.collected = true;
                    this.activatePowerUp(powerUp.type);
                }
            }
        });

        // Remove off-screen power-ups
        this.powerUps = this.powerUps.filter(powerUp => 
            !powerUp.collected && powerUp.x + powerUp.width > 0
        );

        // Randomly add new power-ups
        if (Math.random() < 0.005) {  // 0.5% chance each frame
            this.addPowerUp();
        }

        // Update particles
        this.particles = this.particles.filter(particle => {
            particle.update();
            return particle.alpha > 0;
        });

        // Update score
        this.score += this.config.scoreMultiplier;
    }

    addObstacle() {
        const gap = this.config.obstacleGap;
        const minY = gap;
        const maxY = this.canvas.height - gap;
        const height = Math.random() * (maxY - minY) + minY;

        const topObstacle = {
            x: this.canvas.width,
            y: 0,
            width: this.config.obstacleWidth,
            height: height - gap / 2,
            passed: false
        };

        const bottomObstacle = {
            x: this.canvas.width,
            y: height + gap / 2,
            width: this.config.obstacleWidth,
            height: this.canvas.height - (height + gap / 2),
            passed: false
        };

        this.obstacles.push(topObstacle, bottomObstacle);
    }

    addFood() {
        // Only add food if there are obstacles to place between
        if (this.obstacles.length < 2) return;

        // Find the last pair of obstacles
        const lastObstacleIndex = this.obstacles.length - 1;
        const topObstacle = this.obstacles[lastObstacleIndex - 1];
        const bottomObstacle = this.obstacles[lastObstacleIndex];

        // Calculate the exact middle point between obstacles
        const gapMiddleY = topObstacle.height + (bottomObstacle.y - topObstacle.height) / 2;

        // Place food in the middle of the gap
        const food = {
            x: topObstacle.x + this.config.obstacleWidth + 100, // Place 100px after the obstacle
            y: gapMiddleY - this.config.foodSize / 2, // Center the food vertically
            width: this.config.foodSize,
            height: this.config.foodSize,
            type: Math.floor(Math.random() * this.foodImages.length),
            collected: false
        };

        this.foods.push(food);
    }

    addPowerUp() {
        if (this.obstacles.length < 2) return;

        // Find the last obstacle
        const lastObstacle = this.obstacles[this.obstacles.length - 1];
        
        // Calculate the gap center between top and bottom obstacles
        const gapCenter = lastObstacle.y + lastObstacle.height + this.config.obstacleGap / 2;
        
        // Add some random vertical variation but keep it within the gap
        const maxVariation = this.config.obstacleGap / 4; // Use only 1/4 of the gap size for variation
        const yVariation = (Math.random() - 0.5) * maxVariation;
        
        // Position power-up in the center of the gap with slight variation
        const powerUpY = gapCenter + yVariation;
        
        // Position power-up horizontally after the obstacle with some distance
        const powerUpX = lastObstacle.x + lastObstacle.width + 100;
        
        // Randomly select power-up type
        const types = ['doublePoints', 'shield', 'miniSize'];
        const type = types[Math.floor(Math.random() * types.length)];
        
        this.powerUps.push({
            x: powerUpX,
            y: powerUpY,
            width: 30,
            height: 30,
            type: type,
            collected: false,
            active: false
        });
    }

    drawPowerUps() {
        this.ctx.save();
        this.ctx.scale(this.scale, this.scale);
        this.powerUps.forEach(powerUp => {
            if (!powerUp.collected) {
                this.ctx.save();
                
                // Add floating animation
                const floatOffset = Math.sin(this.lastTime * 0.005) * 5;
                
                // Add glow effect
                this.ctx.shadowColor = this.getPowerUpColor(powerUp.type);
                this.ctx.shadowBlur = 15;
                
                // Draw power-up with rotation
                this.ctx.translate(
                    powerUp.x + powerUp.width / 2,
                    powerUp.y + powerUp.height / 2 + floatOffset
                );
                this.ctx.rotate(this.lastTime * 0.002);
                
                // Draw icon or placeholder
                this.ctx.fillStyle = this.getPowerUpColor(powerUp.type);
                this.ctx.fillRect(
                    -powerUp.width / 2,
                    -powerUp.height / 2,
                    powerUp.width,
                    powerUp.height
                );
                
                this.ctx.restore();
            }
        });
        this.ctx.restore();
    }

    getPowerUpColor(type) {
        const colors = {
            doublePoints: '#FFD700',  // Gold
            shield: '#00FFFF',        // Cyan
            miniSize: '#FF69B4'       // Pink
        };
        return colors[type] || '#FFFFFF';
    }

    activatePowerUp(type) {
        this.activePowerUps[type] = true;
        
        // Apply power-up effects
        switch(type) {
            case 'doublePoints':
                this.config.scoreMultiplier *= 2;
                break;
            case 'miniSize':
                this.player.width *= 0.7;
                this.player.height *= 0.7;
                break;
            case 'shield':
                this.isInvincible = true;
                break;
        }
        
        // Create celebration effect
        for (let i = 0; i < 20; i++) {
            const angle = (Math.PI * 2 / 20) * i;
            const speed = 2 + Math.random() * 2;
            this.particles.push(new Particle(
                this.player.x + this.player.width / 2,
                this.player.y + this.player.height / 2,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                this.getPowerUpColor(type)
            ));
        }
        
        // Reset power-up after duration
        setTimeout(() => {
            this.deactivatePowerUp(type);
        }, this.config.powerUps[type].duration);
    }

    deactivatePowerUp(type) {
        this.activePowerUps[type] = false;
        
        switch(type) {
            case 'doublePoints':
                this.config.scoreMultiplier /= 2;
                break;
            case 'miniSize':
                this.player.width /= 0.7;
                this.player.height /= 0.7;
                break;
            case 'shield':
                this.isInvincible = false;
                break;
        }
    }

    handleCollision() {
        if (!this.gameOver && !this.isInvincible) {
            this.gameOver = true;
            this.gameStarted = false;

            // Create explosion particle effect
            for (let i = 0; i < 40; i++) {
                const angle = (Math.PI * 2 / 40) * i;
                const speed = 2 + Math.random() * 3;
                const color = `hsl(${Math.random() * 60}, 100%, 70%)`; // Yellow-orange colors
                
                this.particles.push(new Particle(
                    this.player.x + this.player.width / 2,
                    this.player.y + this.player.height / 2,
                    Math.cos(angle) * speed,
                    Math.sin(angle) * speed,
                    color
                ));
            }

            // Update high score with celebration
            if (this.score > this.highScore) {
                this.highScore = Math.floor(this.score);
                localStorage.setItem('highScore', this.highScore);
                this.celebrateHighScore();
            }

            // Update coins with sparkle effect
            this.savedCoins += this.coins;
            localStorage.setItem('coins', this.savedCoins);
            document.getElementById('coinBalance').textContent = this.savedCoins;

            // Show game over screen with animation
            const gameOver = document.getElementById('gameOver');
            gameOver.style.transform = 'scale(0)';
            gameOver.style.display = 'flex';
            
            // Animate game over screen
            setTimeout(() => {
                document.getElementById('finalScore').textContent = Math.floor(this.score);
                document.getElementById('finalCoins').textContent = this.coins;
                gameOver.style.transition = 'transform 0.5s ease-out';
                gameOver.style.transform = 'scale(1)';
            }, 100);

            if (this.animationFrame) {
                cancelAnimationFrame(this.animationFrame);
            }
        }
    }

    checkCollision(rect1, rect2) {
        // Add forgiving hitbox
        const padding = 8;
        const r1 = {
            x: rect1.x + padding,
            y: rect1.y + padding,
            width: rect1.width - padding * 2,
            height: rect1.height - padding * 2
        };
        
        const r2 = {
            x: rect2.x + padding,
            y: rect2.y + padding,
            width: rect2.width - padding * 2,
            height: rect2.height - padding * 2
        };
        
        return r1.x < r2.x + r2.width &&
               r1.x + r1.width > r2.x &&
               r1.y < r2.y + r2.height &&
               r1.y + r1.height > r2.y;
    }

    collectFood(food) {
        // Increase score and coins
        this.coins += this.config.coinValue;
        this.score += 5;  // Bonus score for collecting coins
        
        // Trigger invincibility
        this.isInvincible = true;
        setTimeout(() => {
            this.isInvincible = false;
        }, this.config.invincibilityTime);
        
        // Create sparkle particles
        for (let i = 0; i < 15; i++) {
            const angle = (Math.PI * 2 / 15) * i;
            const speed = 2 + Math.random() * 2;
            const color = `hsl(${Math.random() * 360}, 100%, 70%)`;
            
            this.particles.push(new Particle(
                food.x + food.width / 2,
                food.y + food.height / 2,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                color
            ));
        }
        
        // Create floating score text
        const scoreText = document.createElement('div');
        scoreText.textContent = `+${this.config.coinValue}`;
        scoreText.style.position = 'absolute';
        scoreText.style.left = `${food.x + food.width/2}px`;
        scoreText.style.top = `${food.y}px`;
        scoreText.style.color = 'gold';
        scoreText.style.fontSize = '24px';
        scoreText.style.fontWeight = 'bold';
        scoreText.style.textShadow = '0 0 10px rgba(255, 215, 0, 0.8)';
        scoreText.style.animation = 'floatUp 1s ease-out forwards';
        document.body.appendChild(scoreText);
        
        // Remove score text after animation
        setTimeout(() => scoreText.remove(), 1000);
    }

    async loadPowerUpImages() {
        const powerUps = {
            doublePoints: 'path/to/double-points.png',  // You'll need to add these images
            shield: 'path/to/shield.png',
            miniSize: 'path/to/mini-size.png'
        };

        for (const [key, path] of Object.entries(powerUps)) {
            this.powerUpImages[key] = new Image();
            // this.powerUpImages[key].src = path;  // Uncomment when you have the images
        }
    }
}

class Particle {
    constructor(x, y, vx, vy, size, color, alpha) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.size = size;
        this.color = color;
        this.alpha = alpha;
        this.gravity = 0.1;
    }
    
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += this.gravity;
        this.alpha -= 0.02;
    }
    
    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// Initialize the game when the window loads
window.onload = () => {
    new Game();
};
