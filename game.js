class Game {
    constructor() {
        this.canvas = document.getElementById('game');
        this.ctx = this.canvas.getContext('2d');
        
        // Game configuration
        this.config = {
            gravity: 0.4,
            jumpForce: -7,
            initialGameSpeed: 2.4,
            gameSpeed: 2.4,
            speedIncrease: 0.1,
            speedIncreaseInterval: 10000,
            maxGameSpeed: 6,
            obstacleGap: 234,
            minObstacleHeight: 100,
            obstacleWidth: 60,
            playerSize: 120,
            foodSize: 63,
            scoreMultiplier: 0.1,
            coinValue: 1,
            obstacleColor: '#1e8449'
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
            alert('Not enough coins!');
        }
    }
    
    purchaseBackground(background) {
        if (this.savedCoins >= background.price) {
            this.savedCoins -= background.price;
            localStorage.setItem('coins', this.savedCoins);
            
            background.unlocked = true;
            const unlockedBackgrounds = this.backgrounds
                .filter(bg => bg.unlocked)
                .map(bg => bg.id);
            
            localStorage.setItem('unlockedBackgrounds', JSON.stringify(unlockedBackgrounds));
            this.updateBackgroundsList();
        } else {
            alert('Not enough coins!');
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
            console.error('Images not loaded yet');
            return;
        }

        // Reset game state
        this.gameOver = false;
        this.score = 0;
        this.coins = 0;
        this.obstacles = [];
        this.foods = [];
        this.particles = [];
        this.config.gameSpeed = this.config.initialGameSpeed;
        this.lastSpeedIncrease = performance.now();
        
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
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
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
        this.ctx.save();
        // Add a subtle zoom effect to the background
        const scale = 1.1;
        const scaledWidth = this.canvas.width * scale;
        const scaledHeight = this.canvas.height * scale;
        const offsetX = (scaledWidth - this.canvas.width) / 2;
        const offsetY = (scaledHeight - this.canvas.height) / 2;
        
        // Create a subtle parallax effect
        const parallaxOffset = (currentTime * 0.03) % this.canvas.width;
        
        // Draw background with enhanced quality
        this.ctx.drawImage(this.backgroundImage, -offsetX - parallaxOffset, -offsetY, scaledWidth, scaledHeight);
        this.ctx.drawImage(this.backgroundImage, -offsetX - parallaxOffset + this.canvas.width, -offsetY, scaledWidth, scaledHeight);
        
        // Add a subtle overlay gradient for depth
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.2)');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.restore();

        // Draw particles with enhanced glow
        this.ctx.save();
        this.ctx.globalCompositeOperation = 'lighter';
        this.particles.forEach(particle => {
            particle.draw(this.ctx);
        });
        this.ctx.restore();

        // Draw obstacles with enhanced visuals
        this.obstacles.forEach(obstacle => {
            this.ctx.save();
            
            // Create rich gradient for obstacles
            const gradient = this.ctx.createLinearGradient(
                obstacle.x, obstacle.y,
                obstacle.x + obstacle.width, obstacle.y + obstacle.height
            );
            gradient.addColorStop(0, '#2ecc71');  // Bright green
            gradient.addColorStop(0.5, '#27ae60'); // Medium green
            gradient.addColorStop(1, '#219a51');   // Darker green
            
            // Add strong shadow for depth
            this.ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
            this.ctx.shadowBlur = 15;
            this.ctx.shadowOffsetX = 5;
            this.ctx.shadowOffsetY = 5;
            
            // Draw rounded rectangle
            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.roundRect(
                obstacle.x,
                obstacle.y,
                obstacle.width,
                obstacle.height,
                10  // Rounded corners radius
            );
            this.ctx.fill();
            
            // Add highlight effect
            const highlightGradient = this.ctx.createLinearGradient(
                obstacle.x, obstacle.y,
                obstacle.x + obstacle.width, obstacle.y
            );
            highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
            highlightGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.2)');
            highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0.1)');
            
            this.ctx.fillStyle = highlightGradient;
            this.ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, 5);
            
            this.ctx.restore();
        });

        // Draw player with enhanced effects
        this.ctx.save();
        
        // Calculate rotation based on velocity
        const rotation = Math.min(Math.max(this.player.velocity * 0.05, -0.5), 0.5);
        
        // Add shadow for depth
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        this.ctx.shadowBlur = 15;
        this.ctx.shadowOffsetX = 5;
        this.ctx.shadowOffsetY = 5;
        
        // Apply rotation
        this.ctx.translate(
            this.player.x + this.player.width / 2,
            this.player.y + this.player.height / 2
        );
        this.ctx.rotate(rotation);
        
        // Draw player with slight scale animation
        const bounce = Math.sin(currentTime * 0.01) * 0.03;
        this.ctx.scale(1 + bounce, 1 + bounce);
        
        this.ctx.drawImage(
            this.playerImage,
            -this.player.width / 2,
            -this.player.height / 2,
            this.player.width,
            this.player.height
        );
        
        this.ctx.restore();

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

        // Draw score with enhanced text effects
        this.ctx.save();
        this.ctx.fillStyle = 'white';
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        this.ctx.shadowBlur = 10;
        this.ctx.font = 'bold 32px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'top';
        
        // Add score animation
        const displayScore = Math.floor(this.score);
        const scoreScale = 1 + Math.sin(currentTime * 0.01) * 0.05;
        
        this.ctx.save();
        this.ctx.translate(30, 30);
        this.ctx.scale(scoreScale, scoreScale);
        this.ctx.fillText(`Score: ${displayScore}`, 0, 0);
        this.ctx.restore();
        
        // Draw coins with gold gradient
        this.ctx.save();
        const coinGradient = this.ctx.createLinearGradient(20, 60, 20, 90);
        coinGradient.addColorStop(0, '#ffd700');
        coinGradient.addColorStop(1, '#ffb900');
        this.ctx.fillStyle = coinGradient;
        this.ctx.fillText(`Coins: ${this.coins}`, 20, 60);
        this.ctx.restore();
        
        // Draw high score
        this.ctx.textAlign = 'right';
        this.ctx.fillText(`High Score: ${this.highScore}`, this.canvas.width - 20, 20);
        
        this.ctx.restore();

        // Update game state
        this.update(deltaTime);
        
        // Request next frame
        if (!this.gameOver) {
            this.animationFrame = requestAnimationFrame((time) => this.gameLoop(time));
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
                this.score += 0.5;
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

    handleCollision() {
        if (!this.gameOver) {
            this.gameOver = true;
            this.gameStarted = false;

            // Create particle effect on collision
            for (let i = 0; i < 20; i++) {
                this.particles.push(new Particle(
                    this.player.x + this.player.width / 2,
                    this.player.y + this.player.height / 2,
                    Math.random() * 2 - 1,
                    Math.random() * 2 - 1,
                    'white'
                ));
            }

            if (this.score > this.highScore) {
                this.highScore = Math.floor(this.score);
                localStorage.setItem('highScore', this.highScore);
            }

            this.savedCoins += this.coins;
            localStorage.setItem('coins', this.savedCoins);

            // Add slight delay before showing game over screen
            setTimeout(() => {
                document.getElementById('finalScore').textContent = Math.floor(this.score);
                document.getElementById('finalCoins').textContent = this.coins;
                document.getElementById('gameCanvas').style.display = 'none';
                document.getElementById('gameOver').style.display = 'flex';
            }, 800);

            if (this.animationFrame) {
                cancelAnimationFrame(this.animationFrame);
            }
        }
    }

    checkCollision(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }

    collectFood(food) {
        this.coins += this.config.coinValue;
        
        // Create particle effect for coin collection
        for (let i = 0; i < 10; i++) {
            this.particles.push(new Particle(
                food.x + food.width / 2,
                food.y + food.height / 2,
                Math.random() * 2 - 1,
                Math.random() * 2 - 1,
                '#ffd700'
            ));
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
