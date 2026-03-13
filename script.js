/**
 * ASTRO DASH - MISSION CONTROL
 * Desenvolvedora: Adrielle (Jinnie)
 * Lógica: Movimentação Híbrida (Teclado/Joystick), Progressão de Dificuldade e Sistema de Cura.
 */

// --- VARIÁVEIS DE CONTROLE DE ESTADO (MEMÓRIA DO JOGO) ---
let isPlaying = false;      // Define se a partida está rolando
let score = 0;              // Armazena a pontuação
let lives = 3;              // Contador de vidas inicial
let shipPos = { x: 50, y: 80 }; // Posição da nave (50% esquerda, 80% topo)
let playerNick = "";        // Nome do jogador
let lastLifeScore = 0;      // Última pontuação que gerou vida extra

window.onload = () => {
    // --- MAPEAMENTO DOS ELEMENTOS DO HTML (DOM) ---
    const shipContainer = document.getElementById('ship-container');
    const arena = document.getElementById('arena');
    const scoreElement = document.getElementById('score');
    const livesElement = document.getElementById('lives');
    const bootScreen = document.getElementById('boot-screen');
    const bootText = document.getElementById('boot-text');
    const nickInput = document.getElementById('player-nick');
    const stick = document.getElementById('joystick-stick');
    const base = document.getElementById('joystick-base');
    const insertCoinBtn = document.getElementById('insert-coin');

    // --- CONFIGURAÇÕES DE SENSIBILIDADE E ENTRADA ---
    const SENSIBILIDADE = 2.2;  // Multiplicador de velocidade da nave
    let stickX = 0, stickY = 0; // Direção vinda do Joystick
    let dragging = false;       // Monitora se o usuário está arrastando o joystick
    const keys = {};            // Objeto para registrar teclas pressionadas

    // --- FUNÇÃO PARA INICIAR A PARTIDA ---
    window.startGame = () => {
        insertCoinBtn.style.display = 'none'; // Esconde tela inicial
        
        runBootSequence(() => { // Roda animação de texto antes de começar
            isPlaying = true;
            score = 0;
            lives = 3;
            lastLifeScore = 0;
            shipPos = { x: 50, y: 80 }; // Reseta posição

            // Atualiza o HUD (Interface)
            scoreElement.innerText = "0";
            livesElement.innerText = "3";
            
            // Ativa a nave visualmente
            shipContainer.style.display = 'block';
            shipContainer.style.left = `${shipPos.x}%`;
            shipContainer.style.top = `${shipPos.y}%`;
            shipContainer.style.transform = "translate(-50%, -50%)";

            gameLoop(); // Inicia o gerador de asteroides
        });
    };

    // --- ANIMAÇÃO DE CARREGAMENTO (BOOT) ---
    function runBootSequence(callback) {
        bootScreen.style.display = 'flex';
        bootText.innerHTML = '';
        const lines = [
            "> INICIANDO PROTOCOLO...",
            "> CALIBRANDO SENSORES...",
            "> STATUS: AGUARDANDO NICK..."
        ];

        let i = 0;
        function print() {
            if (i < lines.length) {
                bootText.innerHTML += lines[i] + "<br>";
                i++;
                setTimeout(print, 400); // Digita cada linha a cada 400ms
            } else {
                document.getElementById('nick-selection').style.display = 'block';
                nickInput.focus(); // Coloca o cursor no campo de texto
            }
        }
        print();

        // Salva o Nick e fecha o Boot
        window.confirmNick = () => {
            if (!nickInput.value.trim()) return;
            playerNick = nickInput.value.toUpperCase();
            bootScreen.style.display = 'none';
            callback(); // Prossegue para o início do jogo
        };
    }

    // --- CÁLCULO DO JOYSTICK (MATEMÁTICA DE VETORES) ---
    const handleJoystick = (e) => {
        if (!dragging || !isPlaying) return;
        const rect = base.getBoundingClientRect(); // Pega limites da base
        const centerX = rect.left + rect.width / 2; // Centro X da base
        const centerY = rect.top + rect.height / 2; // Centro Y da base
        
        // Pega coordenadas do mouse ou do toque (mobile)
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        let dx = clientX - centerX; // Distância horizontal do centro
        let dy = clientY - centerY; // Distância vertical do centro
        const dist = Math.sqrt(dx*dx + dy*dy); // Hipotenusa (distância total)
        const max = rect.width / 2; // Raio máximo da base

        // Impede que a bolinha saia da base circular
        if (dist > max) { dx *= max/dist; dy *= max/dist; }
        stick.style.transform = `translate(${dx}px, ${dy}px)`;
        
        // Normaliza valores para -1 a 1 (Ex: 0.5 = meia velocidade)
        stickX = dx / max; 
        stickY = dy / max;
    };

    // --- EVENTOS DE CONTROLE (MOUSE/TOQUE/TECLADO) ---
    base.addEventListener('mousedown', () => dragging = true);
    base.addEventListener('touchstart', (e) => { dragging = true; handleJoystick(e); });
    window.addEventListener('mousemove', handleJoystick);
    window.addEventListener('touchmove', handleJoystick);
    window.addEventListener('mouseup', stopDragging);
    window.addEventListener('touchend', stopDragging);

    function stopDragging() {
        dragging = false; 
        stickX = 0; stickY = 0; // Para a nave ao soltar
        stick.style.transform = 'translate(0,0)';
    }

    // Registra quais teclas estão sendo seguradas
    document.addEventListener('keydown', (e) => { keys[e.key.toLowerCase()] = true; });
    document.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });

    // --- MOTOR DE MOVIMENTO (RODA A 60 FPS) ---
    setInterval(() => {
        if (!isPlaying) return;

        let moveX = 0, moveY = 0;
        let isMoving = false;

        // Verifica Teclado primeiro (Prioridade)
        if (keys['w'] || keys['arrowup']) { moveY = -1; isMoving = true; }
        if (keys['s'] || keys['arrowdown']) { moveY = 1; isMoving = true; }
        if (keys['a'] || keys['arrowleft']) { moveX = -1; isMoving = true; }
        if (keys['d'] || keys['arrowright']) { moveX = 1; isMoving = true; }

        // Se o teclado estiver parado, usa o Joystick
        if (!isMoving) {
            if (Math.abs(stickX) > 0.1) moveX = stickX;
            if (Math.abs(stickY) > 0.1) moveY = stickY;
        }

        // Soma a nova posição à variável shipPos
        shipPos.x += (moveX * SENSIBILIDADE);
        shipPos.y += (moveY * SENSIBILIDADE);
        
        // Impede que a nave saia dos limites da arena (Bounding Box)
        shipPos.x = Math.max(5, Math.min(95, shipPos.x));
        shipPos.y = Math.max(5, Math.min(92, shipPos.y));
        
        // Aplica as coordenadas no CSS da Nave
        shipContainer.style.left = `${shipPos.x}%`;
        shipContainer.style.top = `${shipPos.y}%`;
    }, 16); // 16ms = Aprox. 60 frames por segundo

    // --- CRIAÇÃO DE OBJETOS (ASTEROIDES E CURA) ---
    function spawnObject(type) {
        if (!isPlaying) return;

        const obj = document.createElement('div');
        obj.className = type === 'enemy' ? 'obstacle' : 'life-item';
        if (type === 'life') obj.innerHTML = "✚"; 

        // Gera em uma posição horizontal aleatória no topo
        obj.style.left = `${Math.random() * 85 + 5}%`;
        obj.style.top = `-10%`;
        arena.appendChild(obj);

        let top = -10;
        // Intervalo que faz o objeto cair
        let fall = setInterval(() => {
            if (!isPlaying) { clearInterval(fall); obj.remove(); return; }
            
            top += (type === 'enemy' ? 1.3 : 0.9); // Inimigos caem mais rápido
            obj.style.top = `${top}%`;

            // --- LÓGICA DE COLISÃO (CÁLCULO DE CAIXA) ---
            const s = shipContainer.getBoundingClientRect(); // Área da nave
            const o = obj.getBoundingClientRect();           // Área do objeto

            // Verifica se as duas áreas se sobrepõem
            if (o.bottom > s.top && o.top < s.bottom && o.left < s.right && o.right > s.left) {
                clearInterval(fall);
                obj.remove();
                type === 'enemy' ? handleHit() : handleHeal();
            }

            // Remove o objeto se ele passar do fundo da tela
            if (top > 105) {
                clearInterval(fall);
                obj.remove();
                if (type === 'enemy') updateScore(10); // Dá pontos se sobreviver
            }
        }, 20);
    }

    // --- SISTEMA DE PONTUAÇÃO E RECOMPENSA ---
    function updateScore(points) {
        score += points;
        scoreElement.innerText = score;

        // Ganha vida a cada 300 pontos (Divisão Inteira)
        if (score > 0 && Math.floor(score / 300) > Math.floor(lastLifeScore / 300)) {
            lastLifeScore = score;
            spawnObject('life'); // Faz cair uma vida na arena
        }
    }

    // Quando bate em um asteroide
    function handleHit() {
        lives--;
        livesElement.innerText = lives;
        if (lives <= 0) location.reload(); // Game Over (Reinicia a página)
    }

    // Quando coleta o item de cura
    function handleHeal() {
        if (lives < 5) { // Trava de máximo de 5 vidas
            lives++;
            livesElement.innerText = lives;
        } else {
            updateScore(50); // Bônus se já estiver full de vida
        }
    }

    // --- LOOP INFINITO DE SPAWN ---
    function gameLoop() {
        if (!isPlaying) return;
        spawnObject('enemy');
        
        // Aumenta a velocidade de spawn conforme o score (Dificuldade Progressiva)
        let delay = Math.max(300, 1000 - (score * 0.1));
        setTimeout(gameLoop, delay);
    }
};