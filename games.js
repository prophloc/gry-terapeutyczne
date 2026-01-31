window.GAMES = {
    sledzenie: `<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Śledzenie Światełka</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            background: #050508;
            min-height: 100vh;
            overflow: hidden;
            cursor: none;
        }

        .container {
            position: relative;
            width: 100vw;
            height: 100vh;
        }

        /* Subtle stars background */
        .stars {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
        }

        .star {
            position: absolute;
            width: 2px;
            height: 2px;
            background: white;
            border-radius: 50%;
            opacity: 0.3;
            animation: twinkle 3s ease-in-out infinite;
        }

        @keyframes twinkle {
            0%, 100% { opacity: 0.2; }
            50% { opacity: 0.5; }
        }

        .light-orb {
            position: absolute;
            width: 100px;
            height: 100px;
            border-radius: 50%;
            background: radial-gradient(circle at 30% 30%, #ffe066, #ffaa00);
            box-shadow: 
                0 0 60px #ffaa00,
                0 0 100px #ff8800,
                0 0 140px #ff660044;
        }

        .light-orb::before {
            content: '';
            position: absolute;
            top: -20px;
            left: -20px;
            right: -20px;
            bottom: -20px;
            border-radius: 50%;
            background: radial-gradient(circle, #ffaa0033 0%, transparent 70%);
            animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 0.5; }
            50% { transform: scale(1.2); opacity: 0.8; }
        }

        /* Trail effect */
        .trail {
            position: absolute;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            pointer-events: none;
            animation: fadeTrail 1s ease-out forwards;
        }

        @keyframes fadeTrail {
            0% { opacity: 0.6; transform: scale(1); }
            100% { opacity: 0; transform: scale(0.3); }
        }

        .controls {
            position: fixed;
            top: 20px;
            right: 20px;
            display: flex;
            flex-direction: column;
            gap: 10px;
            z-index: 1000;
        }

        .control-btn {
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: rgba(255, 255, 255, 0.6);
            padding: 10px 20px;
            border-radius: 25px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.3s;
        }

        .control-btn:hover {
            background: rgba(255, 255, 255, 0.2);
            color: white;
        }

        .control-btn.active {
            background: rgba(255, 170, 0, 0.3);
            border-color: rgba(255, 170, 0, 0.5);
            color: #ffcc00;
        }

        .speed-label {
            color: rgba(255, 255, 255, 0.4);
            font-size: 12px;
            text-align: center;
            font-family: system-ui, sans-serif;
        }

        .info {
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            color: rgba(255, 255, 255, 0.3);
            font-size: 14px;
            font-family: system-ui, sans-serif;
        }
    </style>
</head>
<body>
    <div class="container" id="container">
        <div class="stars" id="stars"></div>
        <div class="light-orb" id="orb"></div>
    </div>

    <div class="controls">
        <button class="control-btn" id="slowBtn">Wolno</button>
        <button class="control-btn active" id="mediumBtn">Średnio</button>
        <button class="control-btn" id="fastBtn">Szybciej</button>
        <div class="speed-label">Prędkość</div>
    </div>

    <div class="info">Podwójne kliknięcie = pełny ekran</div>

    <script>
        // Audio setup
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        let audioCtx = null;

        function initAudio() {
            if (!audioCtx) {
                audioCtx = new AudioContext();
            }
            if (audioCtx.state === 'suspended') {
                audioCtx.resume();
            }
        }

        // Pentatonic scale for pleasant, non-jarring sounds
        const pentatonicNotes = [
            261.63, // C4
            293.66, // D4
            329.63, // E4
            392.00, // G4
            440.00, // A4
            523.25, // C5
            587.33, // D5
            659.25, // E5
        ];

        let currentNoteIndex = 0;
        let lastNoteTime = 0;

        // Colors for the orb - smooth gradient through spectrum (RGB values)
        const orbColors = [
            { main: [255, 224, 102], glow: [255, 170, 0] },    // warm yellow
            { main: [255, 170, 102], glow: [255, 119, 0] },    // orange
            { main: [255, 136, 153], glow: [255, 85, 119] },   // coral pink
            { main: [221, 153, 255], glow: [170, 85, 255] },   // lavender
            { main: [153, 187, 255], glow: [85, 136, 255] },   // soft blue
            { main: [136, 238, 221], glow: [68, 204, 170] },   // aqua
            { main: [153, 255, 170], glow: [85, 221, 119] },   // mint green
            { main: [221, 255, 136], glow: [170, 221, 68] },   // lime
        ];
        let colorPosition = 0; // 0 to (orbColors.length) - continuous position
        const colorSpeed = 0.00005; // how fast colors change - very slow now

        function lerpColor(color1, color2, t) {
            return [
                Math.round(color1[0] + (color2[0] - color1[0]) * t),
                Math.round(color1[1] + (color2[1] - color1[1]) * t),
                Math.round(color1[2] + (color2[2] - color1[2]) * t)
            ];
        }

        function rgbToString(rgb) {
            return \`rgb(\${rgb[0]}, \${rgb[1]}, \${rgb[2]})\`;
        }

        function rgbToStringAlpha(rgb, alpha) {
            return \`rgba(\${rgb[0]}, \${rgb[1]}, \${rgb[2]}, \${alpha})\`;
        }

        function getCurrentColors() {
            const index1 = Math.floor(colorPosition) % orbColors.length;
            const index2 = (index1 + 1) % orbColors.length;
            const t = colorPosition - Math.floor(colorPosition);
            
            return {
                main: lerpColor(orbColors[index1].main, orbColors[index2].main, t),
                glow: lerpColor(orbColors[index1].glow, orbColors[index2].glow, t)
            };
        }

        function playNote() {
            const now = Date.now();
            if (now - lastNoteTime < 400) return; // Limit note frequency
            lastNoteTime = now;

            initAudio();

            const frequency = pentatonicNotes[currentNoteIndex];
            currentNoteIndex = (currentNoteIndex + 1) % pentatonicNotes.length;

            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();

            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime);

            // Soft piano-like envelope
            gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.05);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1.5);

            // Add harmonics for warmth
            const osc2 = audioCtx.createOscillator();
            const gain2 = audioCtx.createGain();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(frequency * 2, audioCtx.currentTime);
            gain2.gain.setValueAtTime(0.1, audioCtx.currentTime);
            gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1);

            oscillator.connect(gainNode);
            osc2.connect(gain2);
            gain2.connect(gainNode);
            gainNode.connect(audioCtx.destination);

            oscillator.start();
            osc2.start();
            oscillator.stop(audioCtx.currentTime + 1.5);
            osc2.stop(audioCtx.currentTime + 1.5);
        }

        // Create stars
        const starsContainer = document.getElementById('stars');
        for (let i = 0; i < 50; i++) {
            const star = document.createElement('div');
            star.className = 'star';
            star.style.left = Math.random() * 100 + '%';
            star.style.top = Math.random() * 100 + '%';
            star.style.animationDelay = Math.random() * 3 + 's';
            starsContainer.appendChild(star);
        }

        // Orb movement
        const orb = document.getElementById('orb');
        const container = document.getElementById('container');

        let x = window.innerWidth / 2 - 50;
        let y = window.innerHeight / 2 - 50;
        let targetX = x;
        let targetY = y;
        let speed = 0.015; // Medium speed default

        const padding = 100;

        function setNewTarget() {
            targetX = padding + Math.random() * (window.innerWidth - padding * 2 - 100);
            targetY = padding + Math.random() * (window.innerHeight - padding * 2 - 100);
        }

        function createTrail() {
            const colors = getCurrentColors();
            const trail = document.createElement('div');
            trail.className = 'trail';
            trail.style.left = (x + 30) + 'px';
            trail.style.top = (y + 30) + 'px';
            trail.style.background = \`radial-gradient(circle, \${rgbToStringAlpha(colors.glow, 0.25)} 0%, transparent 70%)\`;
            container.appendChild(trail);
            setTimeout(() => trail.remove(), 1000);
        }

        let trailCounter = 0;
        let noteCounter = 0;

        function updateOrbColor() {
            colorPosition += colorSpeed * 16; // roughly per frame
            if (colorPosition >= orbColors.length) {
                colorPosition = 0;
            }
            
            const colors = getCurrentColors();
            const mainColor = rgbToString(colors.main);
            const glowColor = rgbToString(colors.glow);
            
            orb.style.background = \`radial-gradient(circle at 30% 30%, \${mainColor}, \${glowColor})\`;
            orb.style.boxShadow = \`
                0 0 60px \${glowColor},
                0 0 100px \${rgbToStringAlpha(colors.glow, 0.5)},
                0 0 140px \${rgbToStringAlpha(colors.glow, 0.25)}
            \`;
        }

        function animate() {
            // Update color
            updateOrbColor();
            // Smooth movement towards target
            const dx = targetX - x;
            const dy = targetY - y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 10) {
                setNewTarget();
            }

            x += dx * speed;
            y += dy * speed;

            orb.style.left = x + 'px';
            orb.style.top = y + 'px';

            // Create trail every few frames
            trailCounter++;
            if (trailCounter > 5) {
                createTrail();
                trailCounter = 0;
            }

            // Play note based on movement
            noteCounter++;
            if (noteCounter > 30 / (speed * 50)) {
                playNote();
                noteCounter = 0;
            }

            requestAnimationFrame(animate);
        }

        // Speed controls
        const slowBtn = document.getElementById('slowBtn');
        const mediumBtn = document.getElementById('mediumBtn');
        const fastBtn = document.getElementById('fastBtn');

        function setSpeed(newSpeed, activeBtn) {
            speed = newSpeed;
            [slowBtn, mediumBtn, fastBtn].forEach(btn => btn.classList.remove('active'));
            activeBtn.classList.add('active');
        }

        slowBtn.addEventListener('click', () => setSpeed(0.008, slowBtn));
        mediumBtn.addEventListener('click', () => setSpeed(0.015, mediumBtn));
        fastBtn.addEventListener('click', () => setSpeed(0.025, fastBtn));

        // Start animation
        setNewTarget();
        animate();

        // Initialize audio on first interaction
        document.addEventListener('click', initAudio, { once: true });

        // Fullscreen
        document.addEventListener('dblclick', () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen();
            } else {
                document.exitFullscreen();
            }
        });

        // Handle resize
        window.addEventListener('resize', () => {
            if (x > window.innerWidth - 100) x = window.innerWidth - 150;
            if (y > window.innerHeight - 100) y = window.innerHeight - 150;
            setNewTarget();
        });
    </script>
</body>
</html>
`,

    banki: `<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bańki</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            background: linear-gradient(180deg, #0a1628 0%, #1a2a4a 50%, #0a1628 100%);
            min-height: 100vh;
            overflow: hidden;
            font-family: system-ui, sans-serif;
        }

        .container {
            width: 100vw;
            height: 100vh;
            position: relative;
        }

        /* Bubble styles */
        .bubble {
            position: absolute;
            border-radius: 50%;
            cursor: pointer;
            animation: float linear forwards;
            transition: transform 0.1s;
        }

        .bubble:hover {
            transform: scale(1.1);
        }

        .bubble::before {
            content: '';
            position: absolute;
            top: 15%;
            left: 20%;
            width: 30%;
            height: 30%;
            background: rgba(255, 255, 255, 0.6);
            border-radius: 50%;
            filter: blur(2px);
        }

        .bubble::after {
            content: '';
            position: absolute;
            top: 10%;
            right: 15%;
            width: 15%;
            height: 15%;
            background: rgba(255, 255, 255, 0.4);
            border-radius: 50%;
        }

        @keyframes float {
            0% {
                transform: translateY(0) rotate(0deg);
                opacity: 0;
            }
            5% {
                opacity: 1;
            }
            95% {
                opacity: 1;
            }
            100% {
                transform: translateY(calc(-100vh - 150px)) rotate(360deg);
                opacity: 0;
            }
        }

        /* Pop effect */
        .pop-particle {
            position: absolute;
            border-radius: 50%;
            pointer-events: none;
            animation: popBurst 0.6s ease-out forwards;
        }

        @keyframes popBurst {
            0% {
                transform: translate(0, 0) scale(1);
                opacity: 1;
            }
            100% {
                transform: translate(var(--tx), var(--ty)) scale(0);
                opacity: 0;
            }
        }

        .pop-ring {
            position: absolute;
            border-radius: 50%;
            border: 3px solid;
            pointer-events: none;
            animation: ringExpand 0.5s ease-out forwards;
        }

        @keyframes ringExpand {
            0% {
                width: 0;
                height: 0;
                opacity: 1;
            }
            100% {
                width: 150px;
                height: 150px;
                opacity: 0;
            }
        }

        /* Score display */
        .score-display {
            position: fixed;
            top: 30px;
            right: 40px;
            text-align: right;
            color: rgba(255, 255, 255, 0.4);
            z-index: 100;
        }

        .score-display .label {
            font-size: 14px;
        }

        .score-display .score {
            font-size: 56px;
            color: rgba(255, 255, 255, 0.7);
            font-weight: 300;
        }

        /* Controls */
        .controls {
            position: fixed;
            bottom: 30px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            gap: 15px;
            z-index: 100;
        }

        .control-btn {
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: rgba(255, 255, 255, 0.6);
            padding: 12px 25px;
            border-radius: 25px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.3s;
        }

        .control-btn:hover {
            background: rgba(255, 255, 255, 0.2);
            color: white;
        }

        .control-btn.active {
            background: rgba(100, 200, 255, 0.2);
            border-color: rgba(100, 200, 255, 0.4);
        }

        /* Speed control */
        .speed-control {
            position: fixed;
            bottom: 90px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            align-items: center;
            gap: 15px;
            color: rgba(255, 255, 255, 0.4);
            font-size: 14px;
        }

        .speed-slider {
            width: 120px;
            height: 6px;
            -webkit-appearance: none;
            background: rgba(255, 255, 255, 0.15);
            border-radius: 3px;
            outline: none;
        }

        .speed-slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: rgba(100, 200, 255, 0.7);
            cursor: pointer;
        }

        /* Info */
        .info {
            position: fixed;
            top: 30px;
            left: 40px;
            color: rgba(255, 255, 255, 0.3);
            font-size: 14px;
            z-index: 100;
        }
    </style>
</head>
<body>
    <div class="container" id="container"></div>

    <div class="info">Klikaj bańki!</div>

    <div class="score-display">
        <div class="label">Pęknięte bańki</div>
        <div class="score" id="score">0</div>
    </div>

    <div class="speed-control">
        <span>Wolno</span>
        <input type="range" class="speed-slider" id="speedSlider" min="1" max="5" value="2">
        <span>Szybko</span>
    </div>

    <div class="controls">
        <button class="control-btn active" id="playBtn">▶ Graj</button>
        <button class="control-btn" id="pauseBtn">⏸ Pauza</button>
        <button class="control-btn" id="resetBtn">Od nowa</button>
    </div>

    <script>
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        let audioCtx = null;

        function initAudio() {
            if (!audioCtx) {
                audioCtx = new AudioContext();
            }
            if (audioCtx.state === 'suspended') {
                audioCtx.resume();
            }
        }

        const container = document.getElementById('container');
        const scoreEl = document.getElementById('score');
        const speedSlider = document.getElementById('speedSlider');
        const playBtn = document.getElementById('playBtn');
        const pauseBtn = document.getElementById('pauseBtn');
        const resetBtn = document.getElementById('resetBtn');

        let score = 0;
        let isPlaying = true;
        let bubbleInterval = null;
        let speed = 2;

        // Beautiful bubble colors (semi-transparent, iridescent look)
        const bubbleColors = [
            'radial-gradient(circle at 30% 30%, rgba(255, 150, 200, 0.4), rgba(200, 100, 255, 0.2))',
            'radial-gradient(circle at 30% 30%, rgba(150, 200, 255, 0.4), rgba(100, 150, 255, 0.2))',
            'radial-gradient(circle at 30% 30%, rgba(200, 255, 200, 0.4), rgba(100, 200, 150, 0.2))',
            'radial-gradient(circle at 30% 30%, rgba(255, 220, 150, 0.4), rgba(255, 180, 100, 0.2))',
            'radial-gradient(circle at 30% 30%, rgba(200, 150, 255, 0.4), rgba(150, 100, 200, 0.2))',
            'radial-gradient(circle at 30% 30%, rgba(150, 255, 255, 0.4), rgba(100, 200, 200, 0.2))',
        ];

        const popColors = [
            '#ff96c8', '#96c8ff', '#c8ffc8', '#ffd896', '#c896ff', '#96ffff'
        ];

        function createBubble() {
            if (!isPlaying) return;

            const bubble = document.createElement('div');
            bubble.className = 'bubble';
            
            // Random size (bigger for easier clicking)
            const size = 60 + Math.random() * 80;
            bubble.style.width = size + 'px';
            bubble.style.height = size + 'px';
            
            // Random horizontal position
            bubble.style.left = (Math.random() * (window.innerWidth - size)) + 'px';
            bubble.style.bottom = '-' + (size + 20) + 'px';
            
            // Random color
            const colorIndex = Math.floor(Math.random() * bubbleColors.length);
            bubble.style.background = bubbleColors[colorIndex];
            bubble.style.border = '2px solid rgba(255, 255, 255, 0.3)';
            bubble.style.boxShadow = \`
                inset 0 0 \${size/3}px rgba(255, 255, 255, 0.1),
                0 0 \${size/4}px rgba(100, 150, 255, 0.2)
            \`;
            bubble.dataset.colorIndex = colorIndex;
            
            // Animation duration based on speed
            const duration = (12 - speed * 2) + Math.random() * 3;
            bubble.style.animationDuration = duration + 's';
            
            // Slight horizontal wobble
            const wobble = (Math.random() - 0.5) * 100;
            bubble.style.setProperty('--wobble', wobble + 'px');
            
            // Click handler
            bubble.addEventListener('click', () => popBubble(bubble));
            
            container.appendChild(bubble);
            
            // Remove when animation ends
            setTimeout(() => {
                if (bubble.parentNode) {
                    bubble.remove();
                }
            }, duration * 1000);
        }

        function popBubble(bubble) {
            initAudio();
            
            const rect = bubble.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            const colorIndex = parseInt(bubble.dataset.colorIndex);
            const color = popColors[colorIndex];
            
            // Play pop sound
            playPopSound();
            
            // Create pop particles
            for (let i = 0; i < 12; i++) {
                const particle = document.createElement('div');
                particle.className = 'pop-particle';
                particle.style.width = (5 + Math.random() * 10) + 'px';
                particle.style.height = particle.style.width;
                particle.style.background = color;
                particle.style.left = centerX + 'px';
                particle.style.top = centerY + 'px';
                
                const angle = (i / 12) * Math.PI * 2;
                const velocity = 30 + Math.random() * 50;
                particle.style.setProperty('--tx', Math.cos(angle) * velocity + 'px');
                particle.style.setProperty('--ty', Math.sin(angle) * velocity + 'px');
                
                container.appendChild(particle);
                setTimeout(() => particle.remove(), 600);
            }
            
            // Create expanding ring
            const ring = document.createElement('div');
            ring.className = 'pop-ring';
            ring.style.borderColor = color;
            ring.style.left = (centerX - 75) + 'px';
            ring.style.top = (centerY - 75) + 'px';
            container.appendChild(ring);
            setTimeout(() => ring.remove(), 500);
            
            // Update score
            score++;
            scoreEl.textContent = score;
            
            // Remove bubble
            bubble.remove();
        }

        function playPopSound() {
            // Soft, satisfying pop sound
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800 + Math.random() * 400, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + 0.1);
            
            gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
            
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            
            osc.start();
            osc.stop(audioCtx.currentTime + 0.15);
        }

        function startBubbles() {
            if (bubbleInterval) return;
            
            // Create bubbles at interval based on speed
            const interval = 2000 - (speed * 300);
            bubbleInterval = setInterval(createBubble, Math.max(500, interval));
            
            // Create first bubble immediately
            createBubble();
        }

        function stopBubbles() {
            if (bubbleInterval) {
                clearInterval(bubbleInterval);
                bubbleInterval = null;
            }
        }

        // Event listeners
        playBtn.addEventListener('click', () => {
            isPlaying = true;
            playBtn.classList.add('active');
            pauseBtn.classList.remove('active');
            startBubbles();
        });

        pauseBtn.addEventListener('click', () => {
            isPlaying = false;
            pauseBtn.classList.add('active');
            playBtn.classList.remove('active');
            stopBubbles();
        });

        resetBtn.addEventListener('click', () => {
            score = 0;
            scoreEl.textContent = '0';
            
            // Remove all bubbles
            document.querySelectorAll('.bubble').forEach(b => b.remove());
        });

        speedSlider.addEventListener('input', (e) => {
            speed = parseInt(e.target.value);
            
            // Restart with new speed if playing
            if (isPlaying) {
                stopBubbles();
                startBubbles();
            }
        });

        // First interaction to init audio
        document.addEventListener('click', () => {
            initAudio();
        }, { once: true });

        // Fullscreen
        document.addEventListener('dblclick', (e) => {
            if (e.target.classList.contains('bubble')) return;
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen();
            } else {
                document.exitFullscreen();
            }
        });

        // Start
        startBubbles();
    </script>
</body>
</html>
`,

    slowa: `<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Słowa i Obrazki</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            background: linear-gradient(135deg, #0a0a15 0%, #12121f 100%);
            min-height: 100vh;
            overflow: hidden;
            font-family: system-ui, sans-serif;
        }

        .container {
            width: 100vw;
            height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }

        /* Setup screen for Leon's photo */
        .setup-screen {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: #0a0a15;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            transition: opacity 0.5s;
        }

        .setup-screen.hidden {
            opacity: 0;
            pointer-events: none;
        }

        .setup-title {
            color: rgba(255, 255, 255, 0.8);
            font-size: 28px;
            margin-bottom: 30px;
            font-weight: 300;
        }

        .photo-upload-area {
            width: 200px;
            height: 200px;
            border: 3px dashed rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.3s;
            margin-bottom: 30px;
            overflow: hidden;
            background: rgba(255, 255, 255, 0.05);
        }

        .photo-upload-area:hover {
            border-color: rgba(255, 255, 255, 0.5);
            background: rgba(255, 255, 255, 0.1);
        }

        .photo-upload-area.has-photo {
            border-style: solid;
            border-color: rgba(100, 255, 150, 0.5);
        }

        .photo-upload-area img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        .upload-icon {
            font-size: 50px;
            margin-bottom: 10px;
        }

        .upload-text {
            color: rgba(255, 255, 255, 0.5);
            font-size: 14px;
            text-align: center;
            padding: 0 20px;
        }

        #photoInput {
            display: none;
        }

        .setup-buttons {
            display: flex;
            gap: 20px;
        }

        .setup-btn {
            background: linear-gradient(135deg, #4a5a6a, #3a4a5a);
            border: 2px solid #6a7a8a;
            color: white;
            padding: 20px 40px;
            border-radius: 40px;
            font-size: 18px;
            cursor: pointer;
            transition: all 0.3s;
        }

        .setup-btn:hover {
            transform: scale(1.05);
            box-shadow: 0 0 30px rgba(100, 150, 200, 0.3);
        }

        .setup-btn.secondary {
            background: rgba(255, 255, 255, 0.1);
            border-color: rgba(255, 255, 255, 0.2);
        }

        .setup-info {
            color: rgba(255, 255, 255, 0.4);
            font-size: 14px;
            margin-top: 30px;
            text-align: center;
            max-width: 400px;
            line-height: 1.6;
        }

        /* Main game area */
        .game-area {
            display: flex;
            flex-direction: column;
            align-items: center;
            width: 100%;
            max-width: 800px;
        }

        .instruction {
            color: rgba(255, 255, 255, 0.6);
            font-size: 24px;
            margin-bottom: 40px;
            text-align: center;
            min-height: 36px;
        }

        .instruction.highlight {
            color: rgba(255, 220, 100, 0.9);
            font-size: 28px;
        }

        /* Items grid */
        .items-grid {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: 30px;
            margin-bottom: 40px;
        }

        .item-card {
            width: 180px;
            height: 220px;
            background: rgba(255, 255, 255, 0.05);
            border: 3px solid rgba(255, 255, 255, 0.1);
            border-radius: 25px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.3s;
            padding: 20px;
        }

        .item-card:hover {
            transform: scale(1.05);
            border-color: rgba(255, 255, 255, 0.3);
            background: rgba(255, 255, 255, 0.08);
        }

        .item-card.correct {
            border-color: rgba(100, 255, 150, 0.8);
            background: rgba(100, 255, 150, 0.15);
            box-shadow: 0 0 40px rgba(100, 255, 150, 0.3);
        }

        .item-card.bouncing .item-icon {
            animation: bounce 0.5s ease-in-out infinite;
        }

        .item-card.mega-bounce .item-icon {
            animation: megaBounce 0.6s ease-in-out infinite;
        }

        @keyframes bounce {
            0%, 100% { transform: translateY(0) scale(1); }
            50% { transform: translateY(-15px) scale(1.1); }
        }

        @keyframes megaBounce {
            0%, 100% { transform: translateY(0) scale(1) rotate(0deg); }
            25% { transform: translateY(-25px) scale(1.2) rotate(-5deg); }
            75% { transform: translateY(-25px) scale(1.2) rotate(5deg); }
        }

        .item-icon {
            font-size: 80px;
            margin-bottom: 15px;
            transition: transform 0.3s;
        }

        .item-card.leon .item-icon {
            width: 100px;
            height: 100px;
            border-radius: 50%;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(255, 255, 255, 0.1);
        }

        .item-card.leon .item-icon img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        .item-label {
            color: rgba(255, 255, 255, 0.7);
            font-size: 22px;
            font-weight: 400;
            opacity: 0;
            transition: opacity 0.3s;
        }

        .item-card.show-label .item-label {
            opacity: 1;
        }

        /* Floating word display */
        .floating-word {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 120px;
            font-weight: 300;
            color: rgba(255, 255, 255, 0.9);
            text-shadow: 0 0 60px rgba(255, 255, 255, 0.5);
            pointer-events: none;
            opacity: 0;
            z-index: 100;
            animation: wordAppear 2s ease-out forwards;
        }

        @keyframes wordAppear {
            0% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
            20% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
            80% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
            100% { opacity: 0; transform: translate(-50%, -60%) scale(0.9); }
        }

        /* Celebration particles */
        .particle {
            position: fixed;
            pointer-events: none;
            border-radius: 50%;
            animation: particleFly 1.5s ease-out forwards;
        }

        @keyframes particleFly {
            0% { transform: translate(0, 0) scale(1); opacity: 1; }
            100% { transform: translate(var(--tx), var(--ty)) scale(0); opacity: 0; }
        }

        .star {
            position: fixed;
            font-size: 40px;
            pointer-events: none;
            animation: starFloat 1.5s ease-out forwards;
        }

        @keyframes starFloat {
            0% { opacity: 0; transform: scale(0) rotate(0deg); }
            30% { opacity: 1; transform: scale(1.2) rotate(20deg); }
            100% { opacity: 0; transform: translateY(-100px) scale(0.5) rotate(180deg); }
        }

        /* Score */
        .score-display {
            position: fixed;
            top: 30px;
            right: 30px;
            text-align: right;
            color: rgba(255, 255, 255, 0.4);
        }

        .score-display .score {
            font-size: 48px;
            color: rgba(255, 255, 255, 0.6);
        }

        /* Controls */
        .controls {
            position: fixed;
            bottom: 30px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            gap: 15px;
        }

        .control-btn {
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: rgba(255, 255, 255, 0.5);
            padding: 12px 25px;
            border-radius: 25px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.3s;
        }

        .control-btn:hover {
            background: rgba(255, 255, 255, 0.2);
            color: white;
        }
    </style>
</head>
<body>
    <!-- Setup screen for Leon's photo -->
    <div class="setup-screen" id="setupScreen">
        <h1 class="setup-title">Dodaj zdjęcie Leona</h1>
        
        <div class="photo-upload-area" id="photoUploadArea">
            <span class="upload-icon">📷</span>
            <span class="upload-text">Kliknij aby dodać zdjęcie</span>
        </div>
        <input type="file" id="photoInput" accept="image/*">

        <div class="setup-buttons">
            <button class="setup-btn secondary" id="skipPhotoBtn">Pomiń</button>
            <button class="setup-btn" id="startWithPhotoBtn">Rozpocznij</button>
        </div>

        <p class="setup-info">
            Gdy Leon kliknie na swoje zdjęcie, usłyszy swoje imię.<br>
            To pomoże mu połączyć swoją twarz z imieniem.
        </p>
    </div>

    <!-- Main game -->
    <div class="container" id="container">
        <div class="game-area">
            <div class="instruction" id="instruction">Kliknij na obrazek!</div>
            
            <div class="items-grid" id="itemsGrid">
                <!-- Items will be generated here -->
            </div>
        </div>

        <div class="score-display">
            <div>Punkty</div>
            <div class="score" id="score">0</div>
        </div>
    </div>

    <div class="controls">
        <button class="control-btn" id="newRoundBtn">Nowa runda</button>
        <button class="control-btn" id="settingsBtn">⚙ Zdjęcie Leona</button>
    </div>

    <script>
        // Audio setup
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        let audioCtx = null;

        function initAudio() {
            if (!audioCtx) {
                audioCtx = new AudioContext();
            }
            if (audioCtx.state === 'suspended') {
                audioCtx.resume();
            }
        }

        // Speech synthesis
        const synth = window.speechSynthesis;
        
        function speak(text, rate = 0.8, pitch = 1.1) {
            // Cancel any ongoing speech
            synth.cancel();
            
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'pl-PL';
            utterance.rate = rate;  // Slower for clarity
            utterance.pitch = pitch; // Slightly higher, friendlier
            utterance.volume = 1;
            
            // Try to find Polish voice
            const voices = synth.getVoices();
            const polishVoice = voices.find(v => v.lang.startsWith('pl'));
            if (polishVoice) {
                utterance.voice = polishVoice;
            }
            
            synth.speak(utterance);
            return utterance;
        }

        // Items database
        const items = [
            { id: 'pilka', icon: '⚽', word: 'piłka' },
            { id: 'auto', icon: '🚗', word: 'auto' },
            { id: 'pies', icon: '🐕', word: 'pies' },
            { id: 'kot', icon: '🐱', word: 'kot' },
            { id: 'dom', icon: '🏠', word: 'dom' },
            { id: 'slonce', icon: '☀️', word: 'słońce' },
            { id: 'kwiat', icon: '🌸', word: 'kwiat' },
            { id: 'jablko', icon: '🍎', word: 'jabłko' },
            { id: 'banan', icon: '🍌', word: 'banan' },
            { id: 'mis', icon: '🧸', word: 'miś' },
            { id: 'ryba', icon: '🐟', word: 'ryba' },
            { id: 'ptak', icon: '🐦', word: 'ptak' },
            { id: 'drzewo', icon: '🌳', word: 'drzewo' },
            { id: 'ksiezyc', icon: '🌙', word: 'księżyc' },
            { id: 'gwiazda', icon: '⭐', word: 'gwiazda' },
        ];

        // State
        let leonPhoto = null;
        let score = 0;
        let currentItems = [];

        // Elements
        const setupScreen = document.getElementById('setupScreen');
        const photoUploadArea = document.getElementById('photoUploadArea');
        const photoInput = document.getElementById('photoInput');
        const skipPhotoBtn = document.getElementById('skipPhotoBtn');
        const startWithPhotoBtn = document.getElementById('startWithPhotoBtn');
        const container = document.getElementById('container');
        const itemsGrid = document.getElementById('itemsGrid');
        const instruction = document.getElementById('instruction');
        const scoreEl = document.getElementById('score');
        const newRoundBtn = document.getElementById('newRoundBtn');
        const settingsBtn = document.getElementById('settingsBtn');

        const colors = ['#ff6b6b', '#4ecdc4', '#ffe66d', '#95e1d3', '#dda0dd', '#87ceeb', '#f8b500'];

        // Photo handling
        photoUploadArea.addEventListener('click', () => {
            photoInput.click();
        });

        photoInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    leonPhoto = event.target.result;
                    photoUploadArea.innerHTML = \`<img src="\${leonPhoto}" alt="Leon">\`;
                    photoUploadArea.classList.add('has-photo');
                };
                reader.readAsDataURL(file);
            }
        });

        skipPhotoBtn.addEventListener('click', () => {
            setupScreen.classList.add('hidden');
            generateRound();
        });

        startWithPhotoBtn.addEventListener('click', () => {
            setupScreen.classList.add('hidden');
            generateRound();
        });

        settingsBtn.addEventListener('click', () => {
            setupScreen.classList.remove('hidden');
        });

        // Game functions
        function generateRound() {
            itemsGrid.innerHTML = '';
            
            // Pick 3 random items + Leon if photo exists
            const shuffled = [...items].sort(() => Math.random() - 0.5);
            currentItems = shuffled.slice(0, leonPhoto ? 3 : 4);
            
            // Add Leon card if photo exists
            if (leonPhoto) {
                currentItems.push({
                    id: 'leon',
                    icon: null,
                    word: 'Leon',
                    isLeon: true
                });
            }
            
            // Shuffle again to randomize Leon's position
            currentItems.sort(() => Math.random() - 0.5);
            
            // Create cards
            currentItems.forEach(item => {
                const card = document.createElement('div');
                card.className = 'item-card' + (item.isLeon ? ' leon' : '');
                card.dataset.id = item.id;
                card.dataset.word = item.word;
                
                const iconDiv = document.createElement('div');
                iconDiv.className = 'item-icon';
                
                if (item.isLeon && leonPhoto) {
                    iconDiv.innerHTML = \`<img src="\${leonPhoto}" alt="Leon">\`;
                } else {
                    iconDiv.textContent = item.icon;
                }
                
                const label = document.createElement('div');
                label.className = 'item-label';
                label.textContent = item.word;
                
                card.appendChild(iconDiv);
                card.appendChild(label);
                
                card.addEventListener('click', () => handleItemClick(card, item));
                
                itemsGrid.appendChild(card);
            });

            instruction.textContent = 'Kliknij na obrazek!';
            instruction.classList.remove('highlight');
        }

        function handleItemClick(card, item) {
            initAudio();
            
            // Visual feedback
            card.classList.add('bouncing', 'show-label', 'correct');
            
            // Extra special for Leon
            if (item.isLeon) {
                card.classList.remove('bouncing');
                card.classList.add('mega-bounce');
                instruction.textContent = 'To LEON! 🌟';
                instruction.classList.add('highlight');
                createMegaCelebration(card);
            }
            
            // Speak the word
            const utterance = speak(item.word);
            
            // Show floating word
            showFloatingWord(item.word);
            
            // Play success sound
            playSuccessSound(item.isLeon);
            
            // Score
            score++;
            scoreEl.textContent = score;
            
            // Create particles
            createParticles(card, item.isLeon);
            
            // Reset after animation
            setTimeout(() => {
                card.classList.remove('bouncing', 'mega-bounce', 'correct');
                // Keep label visible for learning
            }, item.isLeon ? 3000 : 2000);
        }

        function showFloatingWord(word) {
            const floatingWord = document.createElement('div');
            floatingWord.className = 'floating-word';
            floatingWord.textContent = word;
            document.body.appendChild(floatingWord);
            setTimeout(() => floatingWord.remove(), 2000);
        }

        function playSuccessSound(isSpecial = false) {
            initAudio();
            
            const baseNotes = isSpecial 
                ? [523.25, 659.25, 783.99, 1046.50] // C5, E5, G5, C6 - bigger chord
                : [523.25, 659.25, 783.99]; // C5, E5, G5
            
            baseNotes.forEach((freq, i) => {
                setTimeout(() => {
                    const osc = audioCtx.createOscillator();
                    const gain = audioCtx.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
                    gain.gain.setValueAtTime(isSpecial ? 0.35 : 0.25, audioCtx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + (isSpecial ? 1.5 : 1));
                    
                    // Add warmth
                    const osc2 = audioCtx.createOscillator();
                    osc2.type = 'sine';
                    osc2.frequency.setValueAtTime(freq * 2, audioCtx.currentTime);
                    const gain2 = audioCtx.createGain();
                    gain2.gain.setValueAtTime(0.08, audioCtx.currentTime);
                    
                    osc.connect(gain);
                    osc2.connect(gain2);
                    gain2.connect(gain);
                    gain.connect(audioCtx.destination);
                    
                    osc.start();
                    osc2.start();
                    osc.stop(audioCtx.currentTime + 1.5);
                    osc2.stop(audioCtx.currentTime + 1.5);
                }, i * 100);
            });
        }

        function createParticles(card, isSpecial = false) {
            const rect = card.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            
            const particleCount = isSpecial ? 30 : 15;
            
            for (let i = 0; i < particleCount; i++) {
                const particle = document.createElement('div');
                particle.className = 'particle';
                particle.style.width = (8 + Math.random() * 10) + 'px';
                particle.style.height = particle.style.width;
                particle.style.background = colors[Math.floor(Math.random() * colors.length)];
                particle.style.left = centerX + 'px';
                particle.style.top = centerY + 'px';
                
                const angle = (i / particleCount) * Math.PI * 2;
                const velocity = (isSpecial ? 150 : 100) + Math.random() * 100;
                particle.style.setProperty('--tx', Math.cos(angle) * velocity + 'px');
                particle.style.setProperty('--ty', Math.sin(angle) * velocity + 'px');
                
                document.body.appendChild(particle);
                setTimeout(() => particle.remove(), 1500);
            }
        }

        function createMegaCelebration(card) {
            const rect = card.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            
            // Stars
            for (let i = 0; i < 10; i++) {
                setTimeout(() => {
                    const star = document.createElement('div');
                    star.className = 'star';
                    star.textContent = '⭐';
                    star.style.left = (centerX - 100 + Math.random() * 200) + 'px';
                    star.style.top = (centerY - 50 + Math.random() * 100) + 'px';
                    document.body.appendChild(star);
                    setTimeout(() => star.remove(), 1500);
                }, i * 100);
            }
        }

        // Controls
        newRoundBtn.addEventListener('click', generateRound);

        // Load voices
        speechSynthesis.onvoiceschanged = () => {
            // Voices loaded
        };

        // Fullscreen
        document.addEventListener('dblclick', (e) => {
            if (e.target.closest('.setup-screen') || e.target.closest('.item-card')) return;
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen();
            } else {
                document.exitFullscreen();
            }
        });
    </script>
</body>
</html>
`,

    dzwiek: `<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gitara Dźwięku</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            background: linear-gradient(135deg, #0a0a0f 0%, #1a1520 50%, #0a0a0f 100%);
            min-height: 100vh;
            overflow: hidden;
            font-family: system-ui, sans-serif;
        }

        .container {
            position: relative;
            width: 100vw;
            height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        /* Guitar strings */
        .strings-container {
            position: relative;
            width: 80%;
            max-width: 800px;
            height: 60vh;
            display: flex;
            flex-direction: column;
            justify-content: space-around;
            padding: 40px 0;
        }

        .string-wrapper {
            position: relative;
            width: 100%;
            height: 40px;
            display: flex;
            align-items: center;
        }

        .string {
            position: absolute;
            width: 100%;
            height: 3px;
            background: linear-gradient(90deg, transparent, var(--string-color), transparent);
            box-shadow: 0 0 10px var(--string-color), 0 0 20px var(--string-color);
            transform-origin: center;
            transition: height 0.05s ease-out;
        }

        .string.vibrating {
            animation: stringVibrate 0.1s ease-in-out;
        }

        @keyframes stringVibrate {
            0%, 100% { transform: translateY(0) scaleY(1); }
            25% { transform: translateY(-8px) scaleY(1.5); }
            75% { transform: translateY(8px) scaleY(1.5); }
        }

        /* String labels */
        .string-label {
            position: absolute;
            left: -60px;
            color: var(--string-color);
            font-size: 14px;
            font-weight: 600;
            text-shadow: 0 0 10px var(--string-color);
            opacity: 0.6;
        }

        .frequency-bar {
            position: absolute;
            right: -80px;
            width: 60px;
            height: 8px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 4px;
            overflow: hidden;
        }

        .frequency-fill {
            height: 100%;
            width: 0%;
            background: var(--string-color);
            transition: width 0.1s ease-out;
            box-shadow: 0 0 10px var(--string-color);
        }

        /* Wave particles that shoot out */
        .wave-particle {
            position: absolute;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            pointer-events: none;
            animation: waveShoot 1.5s ease-out forwards;
        }

        @keyframes waveShoot {
            0% {
                transform: translateX(0) scale(1);
                opacity: 1;
            }
            100% {
                transform: translateX(var(--shoot-x)) translateY(var(--shoot-y)) scale(0.3);
                opacity: 0;
            }
        }

        /* Ripple effect */
        .ripple {
            position: absolute;
            border-radius: 50%;
            border: 3px solid;
            pointer-events: none;
            animation: rippleExpand 1s ease-out forwards;
        }

        @keyframes rippleExpand {
            0% {
                width: 0;
                height: 0;
                opacity: 1;
            }
            100% {
                width: 200px;
                height: 200px;
                opacity: 0;
            }
        }

        /* Start overlay */
        .start-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.95);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            transition: opacity 0.5s;
        }

        .start-overlay.hidden {
            opacity: 0;
            pointer-events: none;
        }

        .start-btn {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border: none;
            color: white;
            padding: 25px 50px;
            border-radius: 50px;
            font-size: 24px;
            cursor: pointer;
            transition: all 0.3s;
            box-shadow: 0 10px 40px rgba(102, 126, 234, 0.4);
            font-weight: 600;
        }

        .start-btn:hover {
            transform: scale(1.05);
            box-shadow: 0 15px 50px rgba(102, 126, 234, 0.6);
        }

        .start-info {
            color: rgba(255, 255, 255, 0.6);
            font-size: 16px;
            margin-top: 20px;
            text-align: center;
            max-width: 400px;
            line-height: 1.6;
        }

        /* Counter */
        .counter {
            position: fixed;
            top: 40px;
            left: 50%;
            transform: translateX(-50%);
            font-size: 72px;
            font-weight: 200;
            color: rgba(255, 255, 255, 0.8);
            text-shadow: 0 0 30px rgba(102, 126, 234, 0.6);
            z-index: 100;
        }

        /* Info text */
        .info-text {
            position: fixed;
            bottom: 120px;
            left: 50%;
            transform: translateX(-50%);
            color: rgba(255, 255, 255, 0.4);
            font-size: 18px;
            text-align: center;
        }

        /* Controls */
        .controls {
            position: fixed;
            bottom: 40px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            gap: 20px;
            align-items: center;
            z-index: 100;
        }

        .sensitivity-label {
            color: rgba(255, 255, 255, 0.4);
            font-size: 14px;
        }

        .sensitivity-slider {
            width: 150px;
            height: 6px;
            -webkit-appearance: none;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 3px;
            outline: none;
        }

        .sensitivity-slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: linear-gradient(135deg, #667eea, #764ba2);
            cursor: pointer;
            box-shadow: 0 0 10px rgba(102, 126, 234, 0.6);
        }

        /* Note indicator */
        .note-indicator {
            position: fixed;
            top: 140px;
            left: 50%;
            transform: translateX(-50%);
            font-size: 48px;
            font-weight: 300;
            color: rgba(255, 255, 255, 0.6);
            text-shadow: 0 0 20px currentColor;
            opacity: 0;
            transition: opacity 0.2s;
        }

        .note-indicator.active {
            opacity: 1;
        }
    </style>
</head>
<body>
    <div class="start-overlay" id="startOverlay">
        <button class="start-btn" id="startBtn">🎸 Rozpocznij</button>
        <p class="start-info">Śpiewaj, gwiżdż, mów — zobacz jak struny reagują na twój głos!<br>Różne tony aktywują różne struny.</p>
    </div>

    <div class="container" id="container">
        <div class="strings-container" id="stringsContainer"></div>
    </div>

    <div class="counter" id="counter">0</div>
    <div class="note-indicator" id="noteIndicator">🎵</div>
    <div class="info-text">Wydaj dźwięk!</div>

    <div class="controls">
        <span class="sensitivity-label">Czułość:</span>
        <input type="range" class="sensitivity-slider" id="sensitivity" min="1" max="10" value="5">
    </div>

    <script>
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        let audioCtx = null;
        let analyser = null;
        let microphone = null;
        let isListening = false;

        const container = document.getElementById('container');
        const stringsContainer = document.getElementById('stringsContainer');
        const startOverlay = document.getElementById('startOverlay');
        const startBtn = document.getElementById('startBtn');
        const sensitivitySlider = document.getElementById('sensitivity');
        const counterEl = document.getElementById('counter');
        const noteIndicator = document.getElementById('noteIndicator');

        let reactionCount = 0;
        let sensitivity = 5;

        // Define 6 strings with their frequency ranges and colors
        const strings = [
            { name: 'Wysoki', color: '#ff6b9d', freqMin: 800, freqMax: 2000 },
            { name: 'Średni+', color: '#c44569', freqMin: 500, freqMax: 800 },
            { name: 'Średni', color: '#f39c12', freqMin: 300, freqMax: 500 },
            { name: 'Średni-', color: '#feca57', freqMin: 200, freqMax: 300 },
            { name: 'Niski', color: '#48dbfb', freqMin: 120, freqMax: 200 },
            { name: 'Bas', color: '#5f27cd', freqMin: 50, freqMax: 120 },
        ];

        const stringElements = [];

        // Create string elements
        function createStrings() {
            strings.forEach((string, index) => {
                const wrapper = document.createElement('div');
                wrapper.className = 'string-wrapper';
                
                const label = document.createElement('div');
                label.className = 'string-label';
                label.textContent = string.name;
                label.style.setProperty('--string-color', string.color);
                
                const stringEl = document.createElement('div');
                stringEl.className = 'string';
                stringEl.style.setProperty('--string-color', string.color);
                
                const freqBar = document.createElement('div');
                freqBar.className = 'frequency-bar';
                const freqFill = document.createElement('div');
                freqFill.className = 'frequency-fill';
                freqFill.style.setProperty('--string-color', string.color);
                freqBar.appendChild(freqFill);
                
                wrapper.appendChild(label);
                wrapper.appendChild(stringEl);
                wrapper.appendChild(freqBar);
                stringsContainer.appendChild(wrapper);
                
                stringElements.push({
                    string: stringEl,
                    fill: freqFill,
                    wrapper: wrapper,
                    config: string
                });
            });
        }

        function createWaveParticles(stringIndex) {
            const wrapper = stringElements[stringIndex].wrapper;
            const rect = wrapper.getBoundingClientRect();
            const color = strings[stringIndex].color;
            
            for (let i = 0; i < 8; i++) {
                const particle = document.createElement('div');
                particle.className = 'wave-particle';
                particle.style.background = color;
                particle.style.boxShadow = \`0 0 15px \${color}\`;
                particle.style.left = \`\${rect.left + rect.width / 2}px\`;
                particle.style.top = \`\${rect.top + rect.height / 2}px\`;
                
                const angle = (Math.PI * 2 * i) / 8;
                const distance = 100 + Math.random() * 100;
                particle.style.setProperty('--shoot-x', \`\${Math.cos(angle) * distance}px\`);
                particle.style.setProperty('--shoot-y', \`\${Math.sin(angle) * distance}px\`);
                
                container.appendChild(particle);
                setTimeout(() => particle.remove(), 1500);
            }
        }

        function createRipple(stringIndex) {
            const wrapper = stringElements[stringIndex].wrapper;
            const rect = wrapper.getBoundingClientRect();
            const color = strings[stringIndex].color;
            
            const ripple = document.createElement('div');
            ripple.className = 'ripple';
            ripple.style.borderColor = color;
            ripple.style.left = \`\${rect.left + rect.width / 2}px\`;
            ripple.style.top = \`\${rect.top + rect.height / 2}px\`;
            ripple.style.marginLeft = '-100px';
            ripple.style.marginTop = '-100px';
            
            container.appendChild(ripple);
            setTimeout(() => ripple.remove(), 1000);
        }

        function playStringSound(stringIndex) {
            if (!audioCtx) return;
            
            const config = strings[stringIndex];
            const baseFreq = (config.freqMin + config.freqMax) / 2;
            
            // Create a guitar-like pluck sound
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(baseFreq, audioCtx.currentTime);
            
            // Sharp attack, quick decay (pluck envelope)
            gain.gain.setValueAtTime(0, audioCtx.currentTime);
            gain.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
            
            // Add harmonic for richness
            const osc2 = audioCtx.createOscillator();
            const gain2 = audioCtx.createGain();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(baseFreq * 2, audioCtx.currentTime);
            gain2.gain.setValueAtTime(0.08, audioCtx.currentTime);
            gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
            
            osc.connect(gain);
            osc2.connect(gain2);
            gain2.connect(gain);
            gain.connect(audioCtx.destination);
            
            osc.start();
            osc2.start();
            osc.stop(audioCtx.currentTime + 0.4);
            osc2.stop(audioCtx.currentTime + 0.4);
        }

        function triggerString(stringIndex, intensity) {
            const element = stringElements[stringIndex];
            
            // Visual feedback
            element.string.classList.remove('vibrating');
            void element.string.offsetWidth; // Force reflow
            element.string.classList.add('vibrating');
            
            // Update frequency bar
            element.fill.style.width = \`\${Math.min(intensity * 100, 100)}%\`;
            
            // Create effects
            createWaveParticles(stringIndex);
            createRipple(stringIndex);
            
            // Play sound
            playStringSound(stringIndex);
            
            // Update counter
            reactionCount++;
            counterEl.textContent = reactionCount;
            
            // Show note indicator
            noteIndicator.classList.add('active');
            noteIndicator.style.color = strings[stringIndex].color;
            setTimeout(() => {
                noteIndicator.classList.remove('active');
            }, 300);
            
            // Reset vibration class
            setTimeout(() => {
                element.string.classList.remove('vibrating');
            }, 100);
        }

        async function startListening() {
            try {
                audioCtx = new AudioContext();
                
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    audio: { 
                        echoCancellation: false,
                        noiseSuppression: false,
                        autoGainControl: false
                    } 
                });

                microphone = audioCtx.createMediaStreamSource(stream);
                analyser = audioCtx.createAnalyser();
                analyser.fftSize = 2048;
                analyser.smoothingTimeConstant = 0.3;

                microphone.connect(analyser);

                isListening = true;
                startOverlay.classList.add('hidden');

                detectSound();

            } catch (err) {
                console.error('Microphone error:', err);
                alert('Nie można uzyskać dostępu do mikrofonu. Sprawdź uprawnienia.');
            }
        }

        let lastTriggerTime = {};
        strings.forEach((_, i) => lastTriggerTime[i] = 0);

        function detectSound() {
            if (!isListening) return;

            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            analyser.getByteFrequencyData(dataArray);

            // Calculate frequency resolution
            const nyquist = audioCtx.sampleRate / 2;
            const freqResolution = nyquist / bufferLength;

            // Base threshold on sensitivity
            const baseThreshold = 60 - (sensitivity * 5);
            const now = Date.now();

            // Check each string's frequency range
            stringElements.forEach((element, index) => {
                const config = element.config;
                
                // Find bins that correspond to this string's frequency range
                const minBin = Math.floor(config.freqMin / freqResolution);
                const maxBin = Math.ceil(config.freqMax / freqResolution);
                
                // Calculate average amplitude in this frequency range
                let sum = 0;
                let count = 0;
                for (let i = minBin; i <= maxBin && i < bufferLength; i++) {
                    sum += dataArray[i];
                    count++;
                }
                const average = count > 0 ? sum / count : 0;
                
                // Update frequency bar continuously
                const intensity = Math.min(average / 100, 1);
                element.fill.style.width = \`\${intensity * 100}%\`;
                
                // Trigger string if threshold exceeded and enough time passed
                if (average > baseThreshold && now - lastTriggerTime[index] > 300) {
                    triggerString(index, intensity);
                    lastTriggerTime[index] = now;
                }
            });

            requestAnimationFrame(detectSound);
        }

        // Event listeners
        startBtn.addEventListener('click', startListening);

        sensitivitySlider.addEventListener('input', (e) => {
            sensitivity = parseInt(e.target.value);
        });

        // Fullscreen
        document.addEventListener('dblclick', () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen();
            } else {
                document.exitFullscreen();
            }
        });

        // Initialize
        createStrings();
    </script>
</body>
</html>
`0 0 10px \${color}\`;
                particle.style.left = x + 'px';
                particle.style.top = y + 'px';

                const angle = (i / particleCount) * Math.PI * 2;
                const velocity = 100 + Math.random() * 150;
                const tx = Math.cos(angle) * velocity;
                const ty = Math.sin(angle) * velocity;

                particle.style.setProperty('--tx', tx + 'px');
                particle.style.setProperty('--ty', ty + 'px');

                container.appendChild(particle);
                setTimeout(() => particle.remove(), 1500);
            }

            return color;
        }

        function createFloatingNumber(x, y, color) {
            const num = document.createElement('div');
            num.className = 'float-number';
            num.textContent = reactionCount;
            num.style.left = x + 'px';
            num.style.top = y + 'px';
            num.style.color = color;
            container.appendChild(num);
            setTimeout(() => num.remove(), 2000);
        }

        function triggerReaction() {
            const now = Date.now();
            if (now - lastReactionTime < 300) return; // Debounce
            lastReactionTime = now;

            reactionCount++;
            counterEl.textContent = reactionCount;

            // Visual feedback
            listener.classList.add('reacting');
            ambient.classList.add('active');

            // Create effects at random positions
            const positions = [
                { x: window.innerWidth * 0.2, y: window.innerHeight * 0.3 },
                { x: window.innerWidth * 0.8, y: window.innerHeight * 0.3 },
                { x: window.innerWidth * 0.5, y: window.innerHeight * 0.2 },
                { x: window.innerWidth * 0.3, y: window.innerHeight * 0.7 },
                { x: window.innerWidth * 0.7, y: window.innerHeight * 0.7 },
            ];

            const pos = positions[Math.floor(Math.random() * positions.length)];
            const color = createFirework(pos.x, pos.y);
            createSoundRing(color);
            createFloatingNumber(pos.x, pos.y - 50, color);

            // Play sound
            playPianoChord();

            // Reset after animation
            setTimeout(() => {
                listener.classList.remove('reacting');
                ambient.classList.remove('active');
            }, 300);
        }

        async function startListening() {
            try {
                audioCtx = new AudioContext();
                
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    audio: { 
                        echoCancellation: false,
                        noiseSuppression: false,
                        autoGainControl: false
                    } 
                });

                microphone = audioCtx.createMediaStreamSource(stream);
                analyser = audioCtx.createAnalyser();
                analyser.fftSize = 256;
                analyser.smoothingTimeConstant = 0.3;

                microphone.connect(analyser);

                isListening = true;
                listener.classList.add('listening');
                startOverlay.classList.add('hidden');

                detectSound();

            } catch (err) {
                console.error('Microphone error:', err);
                alert('Nie można uzyskać dostępu do mikrofonu. Sprawdź uprawnienia.');
            }
        }

        function detectSound() {
            if (!isListening) return;

            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            analyser.getByteFrequencyData(dataArray);

            // Calculate average volume
            const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;

            // Threshold based on sensitivity (1-10 maps to 50-10)
            const threshold = 60 - (sensitivity * 5);

            // Visual feedback of current level on core
            const level = Math.min(average / 100, 1);
            core.style.transform = \`scale(\${1 + level * 0.5})\`;

            if (average > threshold) {
                triggerReaction();
            }

            requestAnimationFrame(detectSound);
        }

        // Event listeners
        startBtn.addEventListener('click', startListening);

        sensitivitySlider.addEventListener('input', (e) => {
            sensitivity = parseInt(e.target.value);
        });

        // Fullscreen
        document.addEventListener('dblclick', () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen();
            } else {
                document.exitFullscreen();
            }
        });
    </script>
</body>
</html>
`,

    spojrzenie: `<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Podążaj za Spojrzeniem</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            background: linear-gradient(135deg, #0a0a15 0%, #0f0f1f 100%);
            min-height: 100vh;
            overflow: hidden;
            font-family: system-ui, sans-serif;
        }

        .container {
            width: 100vw;
            height: 100vh;
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        /* Central character face */
        .face-container {
            position: relative;
            width: 200px;
            height: 200px;
        }

        .face {
            width: 200px;
            height: 200px;
            background: radial-gradient(circle at 30% 30%, #ffe4b5, #deb887);
            border-radius: 50%;
            position: relative;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
        }

        /* Eyes container */
        .eyes {
            position: absolute;
            top: 70px;
            left: 30px;
            right: 30px;
            display: flex;
            justify-content: space-between;
        }

        .eye {
            width: 45px;
            height: 45px;
            background: white;
            border-radius: 50%;
            position: relative;
            overflow: hidden;
        }

        .pupil {
            width: 20px;
            height: 20px;
            background: #2c1810;
            border-radius: 50%;
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            transition: all 0.5s ease-out;
        }

        .pupil::after {
            content: '';
            position: absolute;
            width: 6px;
            height: 6px;
            background: white;
            border-radius: 50%;
            top: 4px;
            left: 4px;
        }

        /* Looking directions */
        .eyes.look-left .pupil { transform: translate(-100%, -50%); }
        .eyes.look-right .pupil { transform: translate(0%, -50%); }
        .eyes.look-up .pupil { transform: translate(-50%, -100%); }
        .eyes.look-down .pupil { transform: translate(-50%, 0%); }
        .eyes.look-center .pupil { transform: translate(-50%, -50%); }

        /* Smile */
        .smile {
            position: absolute;
            bottom: 50px;
            left: 50%;
            transform: translateX(-50%);
            width: 60px;
            height: 25px;
            border: none;
            border-bottom: 4px solid #8b4513;
            border-radius: 0 0 60px 60px;
        }

        /* Light orbs at corners */
        .light-spot {
            position: absolute;
            width: 100px;
            height: 100px;
            border-radius: 50%;
            opacity: 0;
            transform: scale(0);
            transition: all 0.5s ease-out;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .light-spot.visible {
            opacity: 1;
            transform: scale(1);
        }

        .light-spot.pulse {
            animation: lightPulse 1s ease-in-out infinite;
        }

        @keyframes lightPulse {
            0%, 100% { 
                transform: scale(1);
                box-shadow: 0 0 40px var(--glow-color);
            }
            50% { 
                transform: scale(1.1);
                box-shadow: 0 0 70px var(--glow-color);
            }
        }

        .light-spot.left {
            left: 50px;
            top: 50%;
            transform: translateY(-50%) scale(0);
        }
        .light-spot.left.visible {
            transform: translateY(-50%) scale(1);
        }

        .light-spot.right {
            right: 50px;
            top: 50%;
            transform: translateY(-50%) scale(0);
        }
        .light-spot.right.visible {
            transform: translateY(-50%) scale(1);
        }

        .light-spot.top {
            top: 50px;
            left: 50%;
            transform: translateX(-50%) scale(0);
        }
        .light-spot.top.visible {
            transform: translateX(-50%) scale(1);
        }

        .light-spot.bottom {
            bottom: 80px;
            left: 50%;
            transform: translateX(-50%) scale(0);
        }
        .light-spot.bottom.visible {
            transform: translateX(-50%) scale(1);
        }

        .light-spot .icon {
            font-size: 50px;
        }

        /* Success celebration */
        .particle {
            position: absolute;
            border-radius: 50%;
            pointer-events: none;
            animation: particleBurst 1s ease-out forwards;
        }

        @keyframes particleBurst {
            0% {
                transform: translate(0, 0) scale(1);
                opacity: 1;
            }
            100% {
                transform: translate(var(--tx), var(--ty)) scale(0);
                opacity: 0;
            }
        }

        /* Instructions */
        .instruction {
            position: fixed;
            top: 40px;
            left: 50%;
            transform: translateX(-50%);
            color: rgba(255, 255, 255, 0.7);
            font-size: 22px;
            text-align: center;
            transition: all 0.3s;
        }

        .instruction.highlight {
            color: rgba(255, 220, 100, 0.9);
            font-size: 26px;
        }

        .instruction.success {
            color: rgba(100, 255, 150, 0.9);
        }

        /* Score */
        .score-display {
            position: fixed;
            top: 30px;
            right: 40px;
            text-align: right;
            color: rgba(255, 255, 255, 0.4);
        }

        .score-display .score {
            font-size: 48px;
            color: rgba(255, 255, 255, 0.6);
        }

        /* Level indicator */
        .level-display {
            position: fixed;
            top: 30px;
            left: 40px;
            color: rgba(255, 255, 255, 0.5);
            font-size: 16px;
        }

        .level-display .level {
            font-size: 24px;
        }

        /* Controls */
        .controls {
            position: fixed;
            bottom: 30px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            gap: 15px;
        }

        .control-btn {
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: rgba(255, 255, 255, 0.5);
            padding: 12px 25px;
            border-radius: 25px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.3s;
        }

        .control-btn:hover {
            background: rgba(255, 255, 255, 0.2);
            color: white;
        }

        /* Start overlay */
        .start-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.95);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            transition: opacity 0.5s;
        }

        .start-overlay.hidden {
            opacity: 0;
            pointer-events: none;
        }

        .start-btn {
            background: linear-gradient(135deg, #4a5a6a, #3a4a5a);
            border: 2px solid #6a7a8a;
            color: white;
            padding: 30px 60px;
            border-radius: 50px;
            font-size: 24px;
            cursor: pointer;
            transition: all 0.3s;
            margin-bottom: 30px;
        }

        .start-btn:hover {
            transform: scale(1.05);
        }

        .start-info {
            color: rgba(255, 255, 255, 0.5);
            font-size: 16px;
            text-align: center;
            max-width: 450px;
            line-height: 1.8;
        }

        .start-info strong {
            color: rgba(255, 220, 100, 0.9);
        }
    </style>
</head>
<body>
    <div class="start-overlay" id="startOverlay">
        <button class="start-btn" id="startBtn">▶ Rozpocznij</button>
        <div class="start-info">
            Buźka będzie <strong>patrzeć w kierunku</strong> gdzie pojawi się światełko.<br><br>
            Pomóż dziecku zauważyć: "Patrz, gdzie patrzy buźka!"<br>
            Gdy dziecko kliknie światełko — nagroda!<br><br>
            To uczy <strong>wspólnej uwagi</strong> — podążania za spojrzeniem.
        </div>
    </div>

    <div class="container" id="container">
        <div class="instruction" id="instruction">Patrz, gdzie patrzę!</div>

        <!-- Light spots at edges -->
        <div class="light-spot left" id="spotLeft">
            <span class="icon">⭐</span>
        </div>
        <div class="light-spot right" id="spotRight">
            <span class="icon">⭐</span>
        </div>
        <div class="light-spot top" id="spotTop">
            <span class="icon">⭐</span>
        </div>
        <div class="light-spot bottom" id="spotBottom">
            <span class="icon">⭐</span>
        </div>

        <!-- Central face -->
        <div class="face-container">
            <div class="face">
                <div class="eyes look-center" id="eyes">
                    <div class="eye">
                        <div class="pupil"></div>
                    </div>
                    <div class="eye">
                        <div class="pupil"></div>
                    </div>
                </div>
                <div class="smile"></div>
            </div>
        </div>

        <div class="level-display">
            Poziom<br>
            <span class="level" id="level">1</span>
        </div>

        <div class="score-display">
            Punkty<br>
            <span class="score" id="score">0</span>
        </div>
    </div>

    <div class="controls">
        <button class="control-btn" id="autoBtn">▶ Auto</button>
        <button class="control-btn" id="resetBtn">Od nowa</button>
    </div>

    <script>
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        let audioCtx = null;

        function initAudio() {
            if (!audioCtx) {
                audioCtx = new AudioContext();
            }
            if (audioCtx.state === 'suspended') {
                audioCtx.resume();
            }
        }

        // Elements
        const container = document.getElementById('container');
        const eyes = document.getElementById('eyes');
        const instruction = document.getElementById('instruction');
        const scoreEl = document.getElementById('score');
        const levelEl = document.getElementById('level');
        const startOverlay = document.getElementById('startOverlay');
        const startBtn = document.getElementById('startBtn');
        const autoBtn = document.getElementById('autoBtn');
        const resetBtn = document.getElementById('resetBtn');

        const spots = {
            left: document.getElementById('spotLeft'),
            right: document.getElementById('spotRight'),
            top: document.getElementById('spotTop'),
            bottom: document.getElementById('spotBottom')
        };

        const colors = ['#ff6b6b', '#4ecdc4', '#ffe66d', '#95e1d3', '#dda0dd', '#87ceeb'];

        // State
        let score = 0;
        let level = 1;
        let currentDirection = null;
        let isWaiting = false;
        let autoInterval = null;
        let lookDelay = 1500; // Time before light appears after looking

        // Directions mapping
        const directions = ['left', 'right', 'top', 'bottom'];

        function lookAt(direction) {
            eyes.className = 'eyes';
            if (direction) {
                eyes.classList.add('look-' + direction);
            } else {
                eyes.classList.add('look-center');
            }
        }

        function showLight(direction) {
            // Set random color
            const color = colors[Math.floor(Math.random() * colors.length)];
            const spot = spots[direction];
            spot.style.background = \`radial-gradient(circle at 30% 30%, \${color}, \${color}88)\`;
            spot.style.setProperty('--glow-color', color);
            spot.style.boxShadow = \`0 0 40px \${color}\`;
            
            spot.classList.add('visible', 'pulse');
        }

        function hideAllLights() {
            Object.values(spots).forEach(spot => {
                spot.classList.remove('visible', 'pulse');
            });
        }

        function playLookSound() {
            initAudio();
            // Soft "attention" sound
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(600, audioCtx.currentTime);
            osc.frequency.linearRampToValueAtTime(800, audioCtx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.3);
        }

        function playSuccessSound() {
            initAudio();
            const notes = [523.25, 659.25, 783.99];
            notes.forEach((freq, i) => {
                setTimeout(() => {
                    const osc = audioCtx.createOscillator();
                    const gain = audioCtx.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
                    gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
                    osc.connect(gain);
                    gain.connect(audioCtx.destination);
                    osc.start();
                    osc.stop(audioCtx.currentTime + 0.5);
                }, i * 100);
            });
        }

        function createParticles(x, y, color) {
            for (let i = 0; i < 20; i++) {
                const particle = document.createElement('div');
                particle.className = 'particle';
                particle.style.width = (8 + Math.random() * 10) + 'px';
                particle.style.height = particle.style.width;
                particle.style.background = color;
                particle.style.left = x + 'px';
                particle.style.top = y + 'px';
                
                const angle = (i / 20) * Math.PI * 2;
                const velocity = 80 + Math.random() * 80;
                particle.style.setProperty('--tx', Math.cos(angle) * velocity + 'px');
                particle.style.setProperty('--ty', Math.sin(angle) * velocity + 'px');
                
                container.appendChild(particle);
                setTimeout(() => particle.remove(), 1000);
            }
        }

        function startRound() {
            if (isWaiting) return;
            
            hideAllLights();
            lookAt('center');
            instruction.textContent = 'Patrz na mnie...';
            instruction.className = 'instruction';
            
            // Wait, then look in direction
            setTimeout(() => {
                currentDirection = directions[Math.floor(Math.random() * directions.length)];
                lookAt(currentDirection);
                playLookSound();
                
                instruction.textContent = 'Patrz, gdzie patrzę!';
                instruction.classList.add('highlight');
                
                // After delay, show light
                setTimeout(() => {
                    showLight(currentDirection);
                    isWaiting = true;
                    instruction.textContent = 'Kliknij światełko!';
                }, lookDelay);
                
            }, 1000);
        }

        function handleSpotClick(direction) {
            if (!isWaiting) return;
            
            if (direction === currentDirection) {
                // Success!
                isWaiting = false;
                score++;
                scoreEl.textContent = score;
                
                // Get spot position for particles
                const spot = spots[direction];
                const rect = spot.getBoundingClientRect();
                const color = spot.style.background.includes('#') 
                    ? spot.style.background.match(/#[a-f0-9]{6}/i)[0] 
                    : '#ffe66d';
                
                createParticles(rect.left + rect.width/2, rect.top + rect.height/2, color);
                playSuccessSound();
                
                hideAllLights();
                lookAt('center');
                instruction.textContent = 'BRAWO! 🌟';
                instruction.className = 'instruction success';
                
                // Level up every 5 points
                if (score % 5 === 0 && lookDelay > 500) {
                    level++;
                    levelEl.textContent = level;
                    lookDelay = Math.max(500, lookDelay - 200);
                }
                
                // Next round
                setTimeout(startRound, 1500);
            }
        }

        // Event listeners
        Object.entries(spots).forEach(([direction, spot]) => {
            spot.addEventListener('click', () => handleSpotClick(direction));
        });

        startBtn.addEventListener('click', () => {
            initAudio();
            startOverlay.classList.add('hidden');
            setTimeout(startRound, 500);
        });

        autoBtn.addEventListener('click', () => {
            if (autoInterval) {
                clearInterval(autoInterval);
                autoInterval = null;
                autoBtn.textContent = '▶ Auto';
            } else {
                autoInterval = setInterval(() => {
                    if (!isWaiting && !startOverlay.classList.contains('hidden')) return;
                    if (!isWaiting) startRound();
                }, 4000);
                autoBtn.textContent = '⏸ Stop';
                if (!isWaiting) startRound();
            }
        });

        resetBtn.addEventListener('click', () => {
            score = 0;
            level = 1;
            lookDelay = 1500;
            scoreEl.textContent = '0';
            levelEl.textContent = '1';
            isWaiting = false;
            hideAllLights();
            lookAt('center');
            instruction.textContent = 'Patrz, gdzie patrzę!';
            instruction.className = 'instruction';
            
            if (autoInterval) {
                clearInterval(autoInterval);
                autoInterval = null;
                autoBtn.textContent = '▶ Auto';
            }
        });

        // Fullscreen
        document.addEventListener('dblclick', (e) => {
            if (e.target.closest('.light-spot')) return;
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen();
            } else {
                document.exitFullscreen();
            }
        });
    </script>
</body>
</html>
`,

    spokoj: `<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Strefa Spokoju - Wersja Terapeutyczna</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            background: #050510;
            min-height: 100vh;
            overflow: hidden;
            font-family: system-ui, sans-serif;
        }

        .container {
            width: 100vw;
            height: 100vh;
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        /* Main breathing circle */
        .breathing-orb {
            width: 200px;
            height: 200px;
            border-radius: 50%;
            background: radial-gradient(circle at 30% 30%, #1a2a4a, #0a1525);
            box-shadow: 
                0 0 60px rgba(100, 150, 200, 0.2),
                inset 0 0 40px rgba(100, 150, 200, 0.1);
            position: relative;
            transition: all 0.3s;
        }

        .breathing-orb.breathing {
            animation: breathe var(--breath-duration, 8s) ease-in-out infinite;
        }

        .breathing-orb.heartbeat {
            animation: heartbeatVisual 1s ease-in-out infinite;
        }

        @keyframes breathe {
            0%, 100% { 
                transform: scale(1);
                box-shadow: 
                    0 0 60px var(--glow-color, rgba(100, 150, 200, 0.2)),
                    inset 0 0 40px var(--glow-color-inner, rgba(100, 150, 200, 0.1));
            }
            50% { 
                transform: scale(1.35);
                box-shadow: 
                    0 0 100px var(--glow-color, rgba(100, 150, 200, 0.4)),
                    inset 0 0 60px var(--glow-color-inner, rgba(100, 150, 200, 0.2));
            }
        }

        @keyframes heartbeatVisual {
            0%, 100% { transform: scale(1); }
            15% { transform: scale(1.15); }
            30% { transform: scale(1); }
            45% { transform: scale(1.1); }
            60% { transform: scale(1); }
        }

        /* Glow ring around orb */
        .glow-ring {
            position: absolute;
            top: -40px;
            left: -40px;
            right: -40px;
            bottom: -40px;
            border-radius: 50%;
            background: radial-gradient(circle, var(--glow-color, rgba(100, 150, 200, 0.1)) 0%, transparent 70%);
            pointer-events: none;
        }

        /* Floating particles */
        .particles {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            overflow: hidden;
        }

        .particle {
            position: absolute;
            border-radius: 50%;
            opacity: 0.4;
            animation: floatUp linear infinite;
        }

        @keyframes floatUp {
            0% {
                transform: translateY(100vh) scale(1);
                opacity: 0;
            }
            10% { opacity: 0.4; }
            90% { opacity: 0.4; }
            100% {
                transform: translateY(-50px) scale(0.5);
                opacity: 0;
            }
        }

        /* Sound mode buttons */
        .sound-modes {
            position: fixed;
            bottom: 100px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: 15px;
            max-width: 500px;
            padding: 0 20px;
        }

        .sound-mode {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.05);
            border: 2px solid rgba(255, 255, 255, 0.1);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.4s;
        }

        .sound-mode:hover {
            background: rgba(255, 255, 255, 0.1);
            transform: scale(1.05);
        }

        .sound-mode.active {
            background: rgba(100, 150, 200, 0.2);
            border-color: rgba(100, 150, 200, 0.5);
            box-shadow: 0 0 30px rgba(100, 150, 200, 0.3);
        }

        .sound-mode .icon {
            font-size: 28px;
            margin-bottom: 4px;
        }

        .sound-mode .label {
            font-size: 10px;
            color: rgba(255, 255, 255, 0.5);
            text-align: center;
        }

        /* Volume control */
        .volume-control {
            position: fixed;
            bottom: 40px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            align-items: center;
            gap: 15px;
            color: rgba(255, 255, 255, 0.4);
        }

        .volume-slider {
            width: 150px;
            height: 6px;
            -webkit-appearance: none;
            background: rgba(255, 255, 255, 0.15);
            border-radius: 3px;
            outline: none;
        }

        .volume-slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: rgba(100, 150, 200, 0.7);
            cursor: pointer;
        }

        /* Info display */
        .info-display {
            position: fixed;
            top: 30px;
            left: 50%;
            transform: translateX(-50%);
            text-align: center;
            color: rgba(255, 255, 255, 0.6);
        }

        .info-display .title {
            font-size: 20px;
            font-weight: 300;
            margin-bottom: 5px;
        }

        .info-display .subtitle {
            font-size: 12px;
            color: rgba(255, 255, 255, 0.4);
        }

        /* Timer */
        .timer {
            position: fixed;
            top: 30px;
            right: 30px;
            color: rgba(255, 255, 255, 0.4);
            font-size: 24px;
            font-weight: 300;
        }

        /* Scientific info panel */
        .info-panel {
            position: fixed;
            top: 30px;
            left: 30px;
            max-width: 250px;
            background: rgba(0, 0, 0, 0.5);
            border-radius: 15px;
            padding: 15px;
            color: rgba(255, 255, 255, 0.5);
            font-size: 12px;
            line-height: 1.6;
            opacity: 0;
            transition: opacity 0.3s;
            pointer-events: none;
        }

        .info-panel.visible {
            opacity: 1;
        }

        .info-panel h4 {
            color: rgba(255, 255, 255, 0.7);
            margin-bottom: 8px;
            font-weight: 500;
        }

        /* Help button */
        .help-btn {
            position: fixed;
            bottom: 40px;
            right: 30px;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: rgba(255, 255, 255, 0.5);
            cursor: pointer;
            font-size: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .help-btn:hover {
            background: rgba(255, 255, 255, 0.2);
        }
    </style>
</head>
<body>
    <div class="particles" id="particles"></div>

    <div class="container">
        <div class="breathing-orb breathing" id="orb">
            <div class="glow-ring"></div>
        </div>
    </div>

    <div class="info-display">
        <div class="title" id="currentMode">Wybierz dźwięk</div>
        <div class="subtitle" id="modeInfo"></div>
    </div>

    <div class="timer" id="timer">0:00</div>

    <div class="info-panel" id="infoPanel">
        <h4 id="infoPanelTitle">Informacja</h4>
        <p id="infoPanelText"></p>
    </div>

    <div class="sound-modes">
        <div class="sound-mode" data-mode="heartbeat" data-info="Bicie serca 60 BPM reguluje układ nerwowy. Bardzo skuteczne dla małych dzieci - przypomina dźwięki z łona matki.">
            <span class="icon">💓</span>
            <span class="label">Serce</span>
        </div>
        <div class="sound-mode" data-mode="528hz" data-info="528 Hz - badania wykazują obniżenie kortyzolu (hormonu stresu) i wzrost oksytocyny po słuchaniu tej częstotliwości.">
            <span class="icon">🎵</span>
            <span class="label">528 Hz</span>
        </div>
        <div class="sound-mode" data-mode="432hz" data-info="432 Hz - uważana za bardziej naturalną i harmonijną częstotliwość. Wielu rodziców dzieci z autyzmem raportuje efekt uspokajający.">
            <span class="icon">🎶</span>
            <span class="label">432 Hz</span>
        </div>
        <div class="sound-mode" data-mode="pink" data-info="Różowy szum - cieplejszy niż biały szum, lepiej tolerowany przez dzieci z wrażliwością sensoryczną. Maskuje rozpraszające dźwięki otoczenia.">
            <span class="icon">🌸</span>
            <span class="label">Różowy szum</span>
        </div>
        <div class="sound-mode" data-mode="lullaby" data-info="Filtrowana muzyka w zakresie głosu kobiecego (kołysanka). Badania Porgesa wykazały poprawę komunikacji po 5 dniach słuchania 45 min/dzień.">
            <span class="icon">🌙</span>
            <span class="label">Kołysanka</span>
        </div>
        <div class="sound-mode" data-mode="ocean" data-info="Dźwięki oceanu - rytmiczne fale mają naturalny efekt uspokajający. Niskie częstotliwości wspierają integrację sensoryczną.">
            <span class="icon">🌊</span>
            <span class="label">Ocean</span>
        </div>
    </div>

    <div class="volume-control">
        <span>🔈</span>
        <input type="range" class="volume-slider" id="volume" min="0" max="100" value="40">
        <span>🔊</span>
    </div>

    <button class="help-btn" id="helpBtn">?</button>

    <script>
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        let audioCtx = null;
        let currentNodes = [];
        let currentMode = null;
        let volume = 0.4;
        let sessionStart = null;
        let timerInterval = null;

        const orb = document.getElementById('orb');
        const currentModeEl = document.getElementById('currentMode');
        const modeInfoEl = document.getElementById('modeInfo');
        const timerEl = document.getElementById('timer');
        const infoPanel = document.getElementById('infoPanel');
        const infoPanelTitle = document.getElementById('infoPanelTitle');
        const infoPanelText = document.getElementById('infoPanelText');
        const volumeSlider = document.getElementById('volume');
        const helpBtn = document.getElementById('helpBtn');

        // Color themes for different modes
        const modeColors = {
            heartbeat: { glow: 'rgba(255, 100, 120, 0.3)', inner: 'rgba(255, 100, 120, 0.15)' },
            '528hz': { glow: 'rgba(100, 200, 150, 0.3)', inner: 'rgba(100, 200, 150, 0.15)' },
            '432hz': { glow: 'rgba(200, 150, 100, 0.3)', inner: 'rgba(200, 150, 100, 0.15)' },
            pink: { glow: 'rgba(255, 150, 200, 0.3)', inner: 'rgba(255, 150, 200, 0.15)' },
            lullaby: { glow: 'rgba(150, 150, 255, 0.3)', inner: 'rgba(150, 150, 255, 0.15)' },
            ocean: { glow: 'rgba(100, 180, 220, 0.3)', inner: 'rgba(100, 180, 220, 0.15)' }
        };

        const modeNames = {
            heartbeat: 'Bicie Serca',
            '528hz': '528 Hz - Częstotliwość Uzdrawiająca',
            '432hz': '432 Hz - Naturalna Harmonia',
            pink: 'Różowy Szum',
            lullaby: 'Kołysanka',
            ocean: 'Fale Oceanu'
        };

        function initAudio() {
            if (!audioCtx) {
                audioCtx = new AudioContext();
            }
            if (audioCtx.state === 'suspended') {
                audioCtx.resume();
            }
        }

        function stopAllSounds() {
            currentNodes.forEach(node => {
                try {
                    if (node.stop) node.stop();
                    if (node.disconnect) node.disconnect();
                } catch (e) {}
            });
            currentNodes = [];
            
            if (timerInterval) {
                clearInterval(timerInterval);
                timerInterval = null;
            }
        }

        function startTimer() {
            sessionStart = Date.now();
            timerInterval = setInterval(() => {
                const elapsed = Math.floor((Date.now() - sessionStart) / 1000);
                const mins = Math.floor(elapsed / 60);
                const secs = elapsed % 60;
                timerEl.textContent = \`\${mins}:\${secs.toString().padStart(2, '0')}\`;
            }, 1000);
        }

        function setOrbStyle(mode) {
            const colors = modeColors[mode];
            orb.style.setProperty('--glow-color', colors.glow);
            orb.style.setProperty('--glow-color-inner', colors.inner);
            
            // Special animation for heartbeat
            orb.classList.remove('breathing', 'heartbeat');
            if (mode === 'heartbeat') {
                orb.classList.add('heartbeat');
            } else {
                orb.classList.add('breathing');
                // Slower breathing for more calming modes
                const duration = mode === 'lullaby' ? '10s' : '8s';
                orb.style.setProperty('--breath-duration', duration);
            }
        }

        // Sound generators
        const soundGenerators = {
            heartbeat: () => {
                let isPlaying = true;
                
                function playBeat() {
                    if (!isPlaying || currentMode !== 'heartbeat') return;
                    
                    // Lub
                    const osc1 = audioCtx.createOscillator();
                    const gain1 = audioCtx.createGain();
                    osc1.type = 'sine';
                    osc1.frequency.setValueAtTime(60, audioCtx.currentTime);
                    gain1.gain.setValueAtTime(0, audioCtx.currentTime);
                    gain1.gain.linearRampToValueAtTime(volume * 0.4, audioCtx.currentTime + 0.02);
                    gain1.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
                    osc1.connect(gain1);
                    gain1.connect(audioCtx.destination);
                    osc1.start();
                    osc1.stop(audioCtx.currentTime + 0.25);
                    
                    // Dub (after 150ms)
                    setTimeout(() => {
                        if (!isPlaying || currentMode !== 'heartbeat') return;
                        const osc2 = audioCtx.createOscillator();
                        const gain2 = audioCtx.createGain();
                        osc2.type = 'sine';
                        osc2.frequency.setValueAtTime(50, audioCtx.currentTime);
                        gain2.gain.setValueAtTime(0, audioCtx.currentTime);
                        gain2.gain.linearRampToValueAtTime(volume * 0.3, audioCtx.currentTime + 0.02);
                        gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
                        osc2.connect(gain2);
                        gain2.connect(audioCtx.destination);
                        osc2.start();
                        osc2.stop(audioCtx.currentTime + 0.2);
                    }, 150);
                    
                    // Next beat after 1 second (60 BPM)
                    setTimeout(playBeat, 1000);
                }
                
                playBeat();
                
                // Return cleanup function
                currentNodes.push({ stop: () => { isPlaying = false; } });
            },

            '528hz': () => {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                
                osc.type = 'sine';
                osc.frequency.setValueAtTime(528, audioCtx.currentTime);
                gain.gain.setValueAtTime(volume * 0.15, audioCtx.currentTime);
                
                // Add subtle harmonics for warmth
                const osc2 = audioCtx.createOscillator();
                const gain2 = audioCtx.createGain();
                osc2.type = 'sine';
                osc2.frequency.setValueAtTime(528 * 2, audioCtx.currentTime);
                gain2.gain.setValueAtTime(volume * 0.03, audioCtx.currentTime);
                
                // Slow amplitude modulation
                const lfo = audioCtx.createOscillator();
                const lfoGain = audioCtx.createGain();
                lfo.frequency.setValueAtTime(0.1, audioCtx.currentTime);
                lfoGain.gain.setValueAtTime(volume * 0.02, audioCtx.currentTime);
                lfo.connect(lfoGain);
                lfoGain.connect(gain.gain);
                
                osc.connect(gain);
                osc2.connect(gain2);
                gain2.connect(gain);
                gain.connect(audioCtx.destination);
                
                osc.start();
                osc2.start();
                lfo.start();
                
                currentNodes.push(osc, osc2, lfo, gain);
            },

            '432hz': () => {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                
                osc.type = 'sine';
                osc.frequency.setValueAtTime(432, audioCtx.currentTime);
                gain.gain.setValueAtTime(volume * 0.15, audioCtx.currentTime);
                
                // Add sub harmonic for depth
                const oscSub = audioCtx.createOscillator();
                const gainSub = audioCtx.createGain();
                oscSub.type = 'sine';
                oscSub.frequency.setValueAtTime(216, audioCtx.currentTime); // Octave below
                gainSub.gain.setValueAtTime(volume * 0.05, audioCtx.currentTime);
                
                // Gentle modulation
                const lfo = audioCtx.createOscillator();
                const lfoGain = audioCtx.createGain();
                lfo.frequency.setValueAtTime(0.08, audioCtx.currentTime);
                lfoGain.gain.setValueAtTime(volume * 0.015, audioCtx.currentTime);
                lfo.connect(lfoGain);
                lfoGain.connect(gain.gain);
                
                osc.connect(gain);
                oscSub.connect(gainSub);
                gainSub.connect(gain);
                gain.connect(audioCtx.destination);
                
                osc.start();
                oscSub.start();
                lfo.start();
                
                currentNodes.push(osc, oscSub, lfo, gain);
            },

            pink: () => {
                // Pink noise generator
                const bufferSize = 2 * audioCtx.sampleRate;
                const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
                const output = noiseBuffer.getChannelData(0);
                
                let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
                
                for (let i = 0; i < bufferSize; i++) {
                    const white = Math.random() * 2 - 1;
                    b0 = 0.99886 * b0 + white * 0.0555179;
                    b1 = 0.99332 * b1 + white * 0.0750759;
                    b2 = 0.96900 * b2 + white * 0.1538520;
                    b3 = 0.86650 * b3 + white * 0.3104856;
                    b4 = 0.55000 * b4 + white * 0.5329522;
                    b5 = -0.7616 * b5 - white * 0.0168980;
                    output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
                    b6 = white * 0.115926;
                }
                
                const noise = audioCtx.createBufferSource();
                noise.buffer = noiseBuffer;
                noise.loop = true;
                
                const gain = audioCtx.createGain();
                gain.gain.setValueAtTime(volume * 0.25, audioCtx.currentTime);
                
                noise.connect(gain);
                gain.connect(audioCtx.destination);
                
                noise.start();
                currentNodes.push(noise, gain);
            },

            lullaby: () => {
                // Filtered melody in female voice range (300-3000 Hz)
                // Simple pentatonic lullaby pattern
                const notes = [
                    { freq: 392, dur: 0.8 },  // G4
                    { freq: 440, dur: 0.4 },  // A4
                    { freq: 392, dur: 0.8 },  // G4
                    { freq: 330, dur: 0.8 },  // E4
                    { freq: 294, dur: 1.2 },  // D4
                    { freq: 330, dur: 0.8 },  // E4
                    { freq: 392, dur: 1.6 },  // G4
                ];
                
                let noteIndex = 0;
                let isPlaying = true;
                
                function playNote() {
                    if (!isPlaying || currentMode !== 'lullaby') return;
                    
                    const note = notes[noteIndex];
                    const osc = audioCtx.createOscillator();
                    const gain = audioCtx.createGain();
                    
                    // Soft, warm tone
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(note.freq, audioCtx.currentTime);
                    
                    // Soft attack and release
                    gain.gain.setValueAtTime(0, audioCtx.currentTime);
                    gain.gain.linearRampToValueAtTime(volume * 0.12, audioCtx.currentTime + 0.1);
                    gain.gain.setValueAtTime(volume * 0.12, audioCtx.currentTime + note.dur - 0.15);
                    gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + note.dur);
                    
                    // Add warmth with harmonic
                    const osc2 = audioCtx.createOscillator();
                    const gain2 = audioCtx.createGain();
                    osc2.type = 'sine';
                    osc2.frequency.setValueAtTime(note.freq * 2, audioCtx.currentTime);
                    gain2.gain.setValueAtTime(volume * 0.02, audioCtx.currentTime);
                    
                    osc.connect(gain);
                    osc2.connect(gain2);
                    gain2.connect(gain);
                    gain.connect(audioCtx.destination);
                    
                    osc.start();
                    osc2.start();
                    osc.stop(audioCtx.currentTime + note.dur);
                    osc2.stop(audioCtx.currentTime + note.dur);
                    
                    noteIndex = (noteIndex + 1) % notes.length;
                    
                    // Small pause between notes, longer pause at end of phrase
                    const pause = noteIndex === 0 ? 1.5 : 0.1;
                    setTimeout(playNote, (note.dur + pause) * 1000);
                }
                
                playNote();
                currentNodes.push({ stop: () => { isPlaying = false; } });
            },

            ocean: () => {
                // Ocean waves using filtered noise with slow modulation
                const bufferSize = 2 * audioCtx.sampleRate;
                const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
                const output = noiseBuffer.getChannelData(0);
                
                for (let i = 0; i < bufferSize; i++) {
                    output[i] = Math.random() * 2 - 1;
                }
                
                const noise = audioCtx.createBufferSource();
                noise.buffer = noiseBuffer;
                noise.loop = true;
                
                // Low-pass filter for ocean depth
                const filter = audioCtx.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(500, audioCtx.currentTime);
                filter.Q.setValueAtTime(1, audioCtx.currentTime);
                
                const gain = audioCtx.createGain();
                gain.gain.setValueAtTime(volume * 0.2, audioCtx.currentTime);
                
                // Wave modulation - slow volume changes
                const lfo = audioCtx.createOscillator();
                const lfoGain = audioCtx.createGain();
                lfo.type = 'sine';
                lfo.frequency.setValueAtTime(0.08, audioCtx.currentTime); // Very slow waves
                lfoGain.gain.setValueAtTime(volume * 0.1, audioCtx.currentTime);
                lfo.connect(lfoGain);
                lfoGain.connect(gain.gain);
                
                // Filter modulation for wave "washing" effect
                const filterLfo = audioCtx.createOscillator();
                const filterLfoGain = audioCtx.createGain();
                filterLfo.type = 'sine';
                filterLfo.frequency.setValueAtTime(0.1, audioCtx.currentTime);
                filterLfoGain.gain.setValueAtTime(200, audioCtx.currentTime);
                filterLfo.connect(filterLfoGain);
                filterLfoGain.connect(filter.frequency);
                
                noise.connect(filter);
                filter.connect(gain);
                gain.connect(audioCtx.destination);
                
                noise.start();
                lfo.start();
                filterLfo.start();
                
                currentNodes.push(noise, lfo, filterLfo, gain);
            }
        };

        // Create floating particles
        function createParticles() {
            const container = document.getElementById('particles');
            container.innerHTML = '';
            
            const colors = [
                'rgba(100, 150, 200, 0.3)',
                'rgba(150, 100, 200, 0.3)',
                'rgba(100, 200, 180, 0.3)'
            ];
            
            for (let i = 0; i < 20; i++) {
                const particle = document.createElement('div');
                particle.className = 'particle';
                particle.style.width = (4 + Math.random() * 12) + 'px';
                particle.style.height = particle.style.width;
                particle.style.background = colors[Math.floor(Math.random() * colors.length)];
                particle.style.left = Math.random() * 100 + '%';
                particle.style.animationDuration = (25 + Math.random() * 35) + 's';
                particle.style.animationDelay = Math.random() * 25 + 's';
                container.appendChild(particle);
            }
        }

        // Event listeners
        document.querySelectorAll('.sound-mode').forEach(btn => {
            btn.addEventListener('click', () => {
                initAudio();
                
                const mode = btn.dataset.mode;
                
                // Toggle off
                if (currentMode === mode) {
                    stopAllSounds();
                    currentMode = null;
                    document.querySelectorAll('.sound-mode').forEach(b => b.classList.remove('active'));
                    currentModeEl.textContent = 'Wybierz dźwięk';
                    modeInfoEl.textContent = '';
                    timerEl.textContent = '0:00';
                    orb.classList.remove('heartbeat');
                    orb.classList.add('breathing');
                    return;
                }
                
                // Start new
                stopAllSounds();
                currentMode = mode;
                
                document.querySelectorAll('.sound-mode').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                currentModeEl.textContent = modeNames[mode];
                modeInfoEl.textContent = 'Graj przez minimum 10-15 minut dla efektu';
                
                setOrbStyle(mode);
                soundGenerators[mode]();
                startTimer();
            });

            // Show info on hover
            btn.addEventListener('mouseenter', () => {
                infoPanelTitle.textContent = modeNames[btn.dataset.mode];
                infoPanelText.textContent = btn.dataset.info;
                infoPanel.classList.add('visible');
            });

            btn.addEventListener('mouseleave', () => {
                infoPanel.classList.remove('visible');
            });
        });

        volumeSlider.addEventListener('input', (e) => {
            volume = e.target.value / 100;
        });

        helpBtn.addEventListener('click', () => {
            alert(\`🧘 Strefa Spokoju - Wskazówki

• Sesja powinna trwać 10-15 minut minimum
• Używaj w cichym, przyciemnionym pomieszczeniu
• Głośność powinna być komfortowa, nie za głośna
• Możesz używać razem z dzieckiem
• Najlepiej przez głośniki, nie słuchawki (dla małych dzieci)

Dźwięki oparte na badaniach naukowych dotyczących terapii dźwiękiem dla dzieci z autyzmem.\`);
        });

        // Fullscreen
        document.addEventListener('dblclick', () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen();
            } else {
                document.exitFullscreen();
            }
        });

        // Init
        createParticles();
    </script>
</body>
</html>
`,

    swiatla: `<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; user-select: none; }
        body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #0a0a0a; height: 100vh; overflow: hidden; display: flex; align-items: center; justify-content: center; }
        .light { position: absolute; width: 100px; height: 100px; border-radius: 50%; animation: pulse 2s ease-in-out infinite; box-shadow: 0 0 50px currentColor; }
        @keyframes pulse { 0%, 100% { transform: scale(1); opacity: 0.4; } 50% { transform: scale(1.5); opacity: 1; } }
    </style>
</head>
<body>
    <script>
        const lightColors = ['#ff6b6b', '#4ecdc4', '#ffe66d', '#95e1d3', '#dda0dd'];
        function createLight() {
            const light = document.createElement('div');
            light.className = 'light';
            light.style.background = lightColors[Math.floor(Math.random() * lightColors.length)];
            light.style.color = light.style.background;
            light.style.left = Math.random() * (window.innerWidth - 100) + 'px';
            light.style.top = Math.random() * (window.innerHeight - 100) + 'px';
            light.style.animationDelay = Math.random() * 2 + 's';
            light.style.animationDuration = (1.5 + Math.random()) + 's';
            document.body.appendChild(light);
            setTimeout(() => { light.remove(); createLight(); }, 4000);
        }
        for (let i = 0; i < 6; i++) setTimeout(() => createLight(), i * 500);
    </script>
</body>
</html>`
};
