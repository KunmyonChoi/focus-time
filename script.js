class FocusTimer {
    constructor() {
        this.timers = {
            FOCUS: 25 * 60,
            REST: 5 * 60
        };
        this.mode = 'FOCUS'; // 'FOCUS' or 'REST'
        this.timeLeft = this.timers.FOCUS;
        this.isRunning = false;
        this.interval = null;
        this.soundPreference = 'beep';
        this.theme = 'charcoal';
        this.audioContext = null;
        this.audioContext = null;
        this.pipVideo = document.getElementById('pip-video');
        this.pipCanvas = document.getElementById('pip-canvas');
        this.pipCtx = this.pipCanvas ? this.pipCanvas.getContext('2d') : null;
        this.pipActive = false;
        this.pipBgImage = new Image(); // For canvas rendering
        this.isAutoPipEnabled = false; // Toggle for auto feature

        // Auto-start settings
        this.autoStartRest = false;
        this.autoStartFocus = false;

        // Three.js vars
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.plane = null;
        this.planeSpeed = 0.05;
        this.planeDirection = new THREE.Vector3(1, 0, 0);
        this.animationId = null;
        this.is3DInitialized = false;

        // this.showBackground removed - implied by theme 'scenic'

        this.backgrounds = [
            'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?q=80&w=2560&auto=format&fit=crop', // Mountains
            'https://images.unsplash.com/photo-1448375240586-dfd8d395ea6c?q=80&w=2560&auto=format&fit=crop', // Forest
            'https://images.unsplash.com/photo-1518837695005-2083093ee35b?q=80&w=2560&auto=format&fit=crop', // Ocean
            'https://images.unsplash.com/photo-1473580044384-7ba9967e16a0?q=80&w=2560&auto=format&fit=crop', // Desert
            'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?q=80&w=2560&auto=format&fit=crop'  // Starry
        ];

        // DOM Elements
        this.timeDisplay = document.getElementById('time-display');
        this.startPauseBtn = document.getElementById('start-pause-btn');
        this.startPauseIcon = document.getElementById('start-pause-icon');
        this.resetBtn = document.getElementById('reset-btn');
        this.skipBtn = document.getElementById('skip-btn');
        this.statusIndicator = document.getElementById('status-indicator');
        this.quoteDisplay = document.getElementById('quote-display');

        this.quotes = [
            "Focus on being productive instead of busy.",
            "The best way to predict the future is to create it.",
            "It is always the simple that produces the marvelous.",
            "Your time is limited, so don't waste it.",
            "Energy flows where attention goes.",
            "Simplicity is the ultimate sophistication.",
            "Don't watch the clock; do what it does. Keep going.",
            "Action is the foundational key to all success.",
            "Suffer the pain of discipline or the pain of regret.",
            "One thing at a time."
        ];

        // Modal Elements
        // Modal Elements
        this.settingsBtn = document.getElementById('settings-btn');
        this.pipBtn = document.getElementById('pip-btn');
        this.fsBtn = document.getElementById('fs-btn');
        this.settingsModal = document.getElementById('settings-modal');
        this.pipPlaceholder = document.getElementById('pip-placeholder');
        this.restoreBtn = document.getElementById('restore-btn');
        this.closeModalBtn = document.getElementById('close-modal-btn');
        this.settingsForm = document.getElementById('settings-form');
        this.customDurationWrapper = document.getElementById('custom-duration-wrapper');
        this.radioButtons = document.getElementsByName('focus-duration');

        this.init();
    }

    init() {
        this.loadSettings();
        this.setupEventListeners();
        this.attachButtonListeners(); // Attach explicit button handlers
        this.updateDisplay();
        this.updateStatus();
        this.updateDisplay();
        this.updateStatus();
        this.updateStatus();
        this.changeQuote(); // Initial quote

        // Initialize 3D Scene
        this.init3DScene();

        // Initial setup based on loaded settings
        this.applyTheme();
        this.applyBackgroundState();

        // If scenic, randomize
        if (this.theme === 'scenic') {
            this.changeBackground();
        }

        // Setup Electron IPC if running in Electron
        this.setupElectronIPC();
    }

    setupEventListeners() {
        // Form and Modal listeners (Static elements)
        this.settingsBtn.addEventListener('click', () => this.openSettings());
        this.pipBtn.addEventListener('click', () => this.toggleVideoPip());
        // this.restoreBtn removed/irrelevant for Video PIP effectively, or acts as stop
        this.restoreBtn.addEventListener('click', () => this.exitVideoPip());
        this.closeModalBtn.addEventListener('click', () => this.closeSettings());
        this.settingsForm.addEventListener('submit', (e) => this.saveSettings(e));

        // Custom input toggle
        Array.from(this.radioButtons).forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (e.target.value === 'custom') {
                    this.customDurationWrapper.classList.remove('hidden');
                } else {
                    this.customDurationWrapper.classList.add('hidden');
                }
            });
        });

        // Close on backdrop click
        this.settingsModal.addEventListener('click', (e) => {
            if (e.target === this.settingsModal) {
                this.closeSettings();
            }
        });

        // Sound Preview Listeners
        const soundRadios = document.getElementsByName('timer-sound');
        Array.from(soundRadios).forEach(radio => {
            radio.addEventListener('click', () => {
                const type = radio.value;
                if (type !== 'mute') {
                    // Ensure context is ready
                    if (!this.audioContext) {
                        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    } else if (this.audioContext.state === 'suspended') {
                        this.audioContext.resume();
                    }
                    this.playSound(type);
                }
            });
        });
    }

    attachButtonListeners() {
        // Use onclick to allow easy re-binding without duplication
        // essential when moving nodes between documents (PIP)
        if (this.startPauseBtn) this.startPauseBtn.onclick = () => this.toggleTimer();
        if (this.resetBtn) this.resetBtn.onclick = () => this.resetTimer();
        if (this.skipBtn) this.skipBtn.onclick = () => this.toggleMode();
        if (this.fsBtn) this.fsBtn.onclick = () => this.toggleFullscreen();

        // Auto PIP Visibility Handler
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                // Try Auto-Enter if timer is running
                if (this.isRunning && !this.pipActive) {
                    this.enterVideoPip().catch(e => console.log("Auto-PIP failed (expected if no user gesture):", e));
                }
            } else {
                // Auto-Exit when visible
                if (this.pipActive) {
                    this.exitVideoPip();
                }
            }
        });
    }

    openSettings() {
        this.settingsModal.showModal();
        // Set current values
        const currentMins = this.timers.FOCUS / 60;
        let found = false;

        Array.from(this.radioButtons).forEach(radio => {
            if (parseInt(radio.value) === currentMins) {
                radio.checked = true;
                found = true;
                this.customDurationWrapper.classList.add('hidden');
            } else if (radio.value === 'custom' && !found) { // If logic falls through to custom (basic approx)
                // If it's not 25 or 50, it's custom
                if (currentMins !== 25 && currentMins !== 50) {
                    radio.checked = true;
                    this.customDurationWrapper.classList.remove('hidden');
                    document.getElementById('custom-minutes').value = currentMins;
                }
            }
        });

        document.getElementById('custom-minutes').value = currentMins;

        // Set Auto-start checkboxes
        const autoRestCheckbox = document.querySelector('input[name="auto-start-rest"]');
        const autoFocusCheckbox = document.querySelector('input[name="auto-start-focus"]');
        if (autoRestCheckbox) autoRestCheckbox.checked = this.autoStartRest;
        if (autoFocusCheckbox) autoFocusCheckbox.checked = this.autoStartFocus;

        // Set sound preference
        const soundRadios = document.getElementsByName('timer-sound');
        Array.from(soundRadios).forEach(radio => {
            if (radio.value === this.soundPreference) {
                radio.checked = true;
            }
        });

        // Set current theme
        const themeRadios = document.getElementsByName('app-theme');
        Array.from(themeRadios).forEach(radio => {
            if (radio.value === this.theme) {
                radio.checked = true;
            }
        });
    }

    closeSettings() {
        this.settingsModal.close();
    }

    saveSettings(e) {
        e.preventDefault();
        const formData = new FormData(this.settingsForm);

        // Save Duration
        const durationType = formData.get('focus-duration');
        let newMinutes = 25;

        if (durationType === 'custom') {
            newMinutes = parseInt(formData.get('custom-minutes'));
            if (isNaN(newMinutes) || newMinutes < 1) newMinutes = 25;
        } else {
            newMinutes = parseInt(durationType);
        }

        this.timers.FOCUS = newMinutes * 60;

        // Save Sound
        this.soundPreference = formData.get('timer-sound');

        // Save Theme
        const newTheme = formData.get('app-theme');
        if (newTheme && newTheme !== this.theme) {
            this.theme = newTheme;
            this.applyTheme();
            this.applyBackgroundState();
        }

        // Save Auto-start settings
        this.autoStartRest = formData.get('auto-start-rest') === 'on';
        this.autoStartFocus = formData.get('auto-start-focus') === 'on';

        // Persist all settings
        this.persistSettings();

        // Logic for timer update
        if (this.mode === 'FOCUS') {
            this.pauseTimer();
            this.timeLeft = this.timers.FOCUS;
            this.updateDisplay();
            this.startPauseIcon.className = 'ph ph-play';
        }

        this.closeSettings();
    }

    playSound(type) {
        if (!this.audioContext) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        const now = this.audioContext.currentTime;

        if (type === 'beep') {
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(800, now);
            oscillator.frequency.exponentialRampToValueAtTime(400, now + 0.1);
            gainNode.gain.setValueAtTime(0.3, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            oscillator.start(now);
            oscillator.stop(now + 0.1);
        } else if (type === 'alarm') {
            oscillator.type = 'square';
            oscillator.frequency.setValueAtTime(600, now);
            gainNode.gain.setValueAtTime(0.3, now);

            // Beep-beep-beep
            for (let i = 0; i < 3; i++) {
                const startTime = now + i * 0.4;
                gainNode.gain.setValueAtTime(0.3, startTime);
                gainNode.gain.setValueAtTime(0.01, startTime + 0.2);
            }
            oscillator.start(now);
            oscillator.stop(now + 1.2);
        } else if (type === 'chime') {
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(600, now);
            oscillator.frequency.exponentialRampToValueAtTime(300, now + 1.5);
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(0.5, now + 0.1);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 1.5);
            oscillator.start(now);
            oscillator.stop(now + 1.5);
        }
    }

    toggleTimer() {
        if (this.isRunning) {
            this.pauseTimer();
        } else {
            this.startTimer();
        }
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch((e) => {
                console.error(`Error attempting to enable fullscreen mode: ${e.message} (${e.name})`);
            });
            this.fsBtn.innerHTML = '<i class="ph ph-corners-in"></i>';
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
                this.fsBtn.innerHTML = '<i class="ph ph-corners-out"></i>';
            }
        }

        // Listen for fullscreen change event to update icon if user exits via ESC
        document.addEventListener('fullscreenchange', () => {
            if (document.fullscreenElement) {
                this.fsBtn.innerHTML = '<i class="ph ph-corners-in"></i>';
            } else {
                this.fsBtn.innerHTML = '<i class="ph ph-corners-out"></i>';
            }
        }, { once: true }); // Using once to avoid stacking, or better logic in init
    }

    async toggleVideoPip() {
        if (document.pictureInPictureElement) {
            this.exitVideoPip();
        } else {
            this.enterVideoPip();
        }
    }

    async enterVideoPip() {
        try {
            if (!this.pipVideo) return;

            // 1. Start Canvas Rendering
            this.startCanvasLoop();

            // 2. Capture Stream if not already
            if (this.pipVideo.srcObject === null) {
                const stream = this.pipCanvas.captureStream(30); // 30 FPS
                this.pipVideo.srcObject = stream;
                await this.pipVideo.play();
            }

            // 3. Request PIP
            await this.pipVideo.requestPictureInPicture();
            this.pipActive = true;
            this.pipBtn.innerHTML = '<i class="ph ph-x-circle"></i>';
            this.pipPlaceholder.classList.remove('hidden');

            // 4. Setup Media Session Controls
            this.updateMediaSession();

            this.pipVideo.addEventListener('leavepictureinpicture', () => {
                this.pipActive = false;
                this.stopCanvasLoop();
                this.pipBtn.innerHTML = '<i class="ph ph-picture-in-picture"></i>';
                this.pipPlaceholder.classList.add('hidden');
            }, { once: true });

        } catch (error) {
            console.error('Failed to enter Video PIP:', error);
            throw error;
        }
    }

    exitVideoPip() {
        if (document.pictureInPictureElement) {
            document.exitPictureInPicture().catch(console.error);
        }
    }

    // Canvas Rendering Logic
    startCanvasLoop() {
        if (this.canvasInterval) clearInterval(this.canvasInterval);
        this.canvasInterval = setInterval(() => this.renderCanvas(), 100); // 10 FPS enough for timer
    }

    stopCanvasLoop() {
        if (this.canvasInterval) clearInterval(this.canvasInterval);
    }

    renderCanvas() {
        if (!this.pipCtx) return;
        const ctx = this.pipCtx;
        const w = this.pipCanvas.width;
        const h = this.pipCanvas.height;
        const centerX = w / 2;
        const centerY = h / 2;

        // 1. Background
        if (this.theme === 'scenic' && this.pipBgImage.src) {
            // "Object-fit: cover" logic for canvas
            const img = this.pipBgImage;
            if (img.complete && img.naturalWidth > 0) {
                const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
                const x = (w / 2) - (img.naturalWidth / 2) * scale;
                const y = (h / 2) - (img.naturalHeight / 2) * scale;
                ctx.drawImage(img, x, y, img.naturalWidth * scale, img.naturalHeight * scale);

                // Overlay for readability
                ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                ctx.fillRect(0, 0, w, h);
            } else {
                ctx.fillStyle = '#1e1e1e'; // Fallback
                ctx.fillRect(0, 0, w, h);
            }
        } else {
            ctx.fillStyle = this.mode === 'FOCUS' ? '#1e1e1e' : '#0f172a';
            ctx.fillRect(0, 0, w, h);
        }

        // 2. Progress Ring
        const currentTotal = this.timers[this.mode];
        const progress = 1 - (this.timeLeft / currentTotal); // 0 to 1
        const radius = 180;
        const strokeWidth = 15;

        // Track background
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = strokeWidth;
        ctx.stroke();

        // Progress arc
        ctx.beginPath();
        // Start from top (-90deg)
        const startAngle = -0.5 * Math.PI;
        const endAngle = startAngle + (2 * Math.PI * (1 - progress)); // Count down visual
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.strokeStyle = this.mode === 'FOCUS' ? '#a5b4fc' : '#818cf8'; // Soft focus colors
        if (this.theme === 'ember') ctx.strokeStyle = '#f87171'; // Reddish for ember
        if (this.theme === 'midnight') ctx.strokeStyle = '#818cf8'; // Blueish
        ctx.lineWidth = strokeWidth;
        ctx.lineCap = 'round';
        ctx.stroke();

        // 3. Text & Typography
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Shadow for readability
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;

        // Time
        ctx.font = 'bold 100px Inter, sans-serif';
        const timeLeftStr = this.timeDisplay.textContent;
        ctx.fillText(timeLeftStr, centerX, centerY - 10);

        // Status
        ctx.font = '500 24px Inter, sans-serif';
        this.pipCtx.letterSpacing = '2px'; // Canvas support varies, but usually fine
        const status = this.mode === 'FOCUS' ? 'FOCUS TIME' : 'REST TIME';
        ctx.fillText(status.toUpperCase(), centerX, centerY + 80);

        // Reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
    }

    updateMediaSession() {
        if (!('mediaSession' in navigator)) return;

        navigator.mediaSession.metadata = new MediaMetadata({
            title: this.mode === 'FOCUS' ? 'Focus Session' : 'Rest Break',
            artist: 'Focus Timer',
            album: this.timeDisplay.textContent
        });

        navigator.mediaSession.playbackState = this.isRunning ? 'playing' : 'paused';

        navigator.mediaSession.setActionHandler('play', () => {
            this.startTimer();
            this.updateMediaSession(); // Update state
        });
        navigator.mediaSession.setActionHandler('pause', () => {
            this.pauseTimer();
            this.updateMediaSession();
        });
    }

    // Legacy method replacements to avoid breaking references
    closeCompactMode() { this.exitVideoPip(); }


    applyTheme() {
        // Apply to main window
        document.body.setAttribute('data-theme', this.theme);
    }

    applyBackgroundState() {
        if (this.theme === 'scenic') {
            document.body.classList.remove('no-background');

            if (!document.body.style.backgroundImage) {
                this.changeBackground();
            } else if (this.pipWindow) {
                // Should sync existing image if opening pip late? handled in toggleCompactMode
                // But if we just switched TO scenic, changeBackground is called.
            }
        } else {
            document.body.classList.add('no-background');
            if (this.pipWindow) this.pipWindow.document.body.classList.add('no-background');
        }
    }

    changeBackground() {
        if (this.theme !== 'scenic') return;

        const randomIndex = Math.floor(Math.random() * this.backgrounds.length);
        const imageUrl = this.backgrounds[randomIndex];

        // Preload image object to avoid flicker?
        // Simple assignment for now.
        const urlStr = `url('${imageUrl}')`;
        document.body.style.backgroundImage = urlStr;

        // Preload for PIP Canvas
        this.pipBgImage.src = imageUrl;
        this.pipBgImage.crossOrigin = "Anonymous"; // Important for canvas export if needed (though we stream locally)
    }

    startTimer() {
        if (this.isRunning) return;

        // Initialize AudioContext on first user interaction
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } else if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        this.isRunning = true;
        this.startPauseIcon.className = 'ph ph-pause';

        // Resume Video PIP if active (critical for Play button in PIP to work)
        if (this.pipActive && this.pipVideo && this.pipVideo.paused) {
            this.pipVideo.play().catch(e => console.error("Failed to resume PIP video:", e));
        }

        this.interval = setInterval(() => {
            this.timeLeft--;
            this.updateDisplay();
            this.sendStateToElectron(); // Update menubar

            if (this.timeLeft <= 0) {
                this.completeTimer();
            }
        }, 1000);

        this.sendStateToElectron(); // Update menubar
    }

    pauseTimer() {
        this.isRunning = false;
        this.startPauseIcon.className = 'ph ph-play';
        clearInterval(this.interval);

        // Pause Video PIP to stay in sync (and save resources)
        // Also ensures the UI 'Play' button appears correctly in PIP
        if (this.pipActive && this.pipVideo && !this.pipVideo.paused) {
            this.pipVideo.pause();
        }

        this.sendStateToElectron(); // Update menubar
    }

    resetTimer() {
        this.pauseTimer();
        this.mode = 'FOCUS'; // Reset always goes back to full Focus session? Or just resets current mode?
        // Standard behavior is usually resetting the current session or asking. 
        // For simplicity here, let's reset to the START of the current mode.
        this.timeLeft = this.timers[this.mode];
        this.startPauseIcon.className = 'ph ph-play';
        this.updateDisplay();
        this.updateStatus();
        this.changeBackground(); // Randomize background on reset
        this.changeQuote(); // Randomize quote on reset

        // Reset animation state logic
        this.toggle3DAnimation();
    }

    toggleMode() {
        this.pauseTimer();
        const nextMode = this.mode === 'FOCUS' ? 'REST' : 'FOCUS';
        this.switchToMode(nextMode);
    }

    switchToMode(targetMode) {
        this.mode = targetMode;
        this.timeLeft = this.timers[targetMode];

        this.updateStatus();
        this.updateDisplay();
        this.startPauseIcon.className = 'ph ph-play';
        this.toggle3DAnimation();
        this.changeQuote();
        this.sendStateToElectron(); // Update menubar
    }

    persistSettings() {
        const settings = {
            focusDuration: this.timers.FOCUS,
            soundPreference: this.soundPreference,
            theme: this.theme,
            autoStartRest: this.autoStartRest,
            autoStartFocus: this.autoStartFocus
        };
        localStorage.setItem('focusTimerSettings', JSON.stringify(settings));
    }

    loadSettings() {
        const saved = localStorage.getItem('focusTimerSettings');
        if (saved) {
            try {
                const settings = JSON.parse(saved);
                if (settings.focusDuration) this.timers.FOCUS = settings.focusDuration;
                // Update timeLeft if not running? 
                // Better to set timeLeft to focusDuration if we are at start state.
                // For simplicity, we just set the timer value. If running/paused, we might not want to disturb.
                // Given this runs on INIT, timeLeft usually equals defaults.
                if (!this.isRunning) this.timeLeft = this.timers.FOCUS;

                if (settings.soundPreference) this.soundPreference = settings.soundPreference;
                if (settings.theme) this.theme = settings.theme;

                if (typeof settings.autoStartRest !== 'undefined') this.autoStartRest = settings.autoStartRest;
                if (typeof settings.autoStartFocus !== 'undefined') this.autoStartFocus = settings.autoStartFocus;

                // showBackground is deprecated
            } catch (e) {
                console.error('Failed to load settings', e);
            }
        }
    }

    completeTimer() {
        this.pauseTimer();

        // Determine next mode and auto-start
        let nextMode = this.mode === 'FOCUS' ? 'REST' : 'FOCUS';
        let shouldAutoStart = (this.mode === 'FOCUS' && this.autoStartRest) ||
            (this.mode === 'REST' && this.autoStartFocus);

        if (shouldAutoStart) {
            this.playTransitionSequence(nextMode);
        } else {
            // Standard behavior
            if (this.soundPreference !== 'mute') {
                this.playSound(this.soundPreference);
            }
            this.switchToMode(nextMode);
        }
    }

    async playTransitionSequence(nextMode) {
        // Ensure context is running
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        if (this.soundPreference !== 'mute') {
            for (let i = 0; i < 3; i++) {
                this.playSound(this.soundPreference);
                // Wait for sound to mostly finish.
                // Beep ~0.1s, Alarm ~1.2s, Chime ~1.5s
                // Using 1.5s as a safe 
                await new Promise(r => setTimeout(r, 1500));
            }
        }

        this.switchToMode(nextMode);
        this.startTimer();
    }

    updateDisplay() {
        const minutes = Math.floor(this.timeLeft / 60);
        const seconds = this.timeLeft % 60;
        const displayString = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        this.timeDisplay.textContent = displayString;
        document.title = `${displayString} - Focus Timer`;

        // Sync Media Session
        if (this.pipActive && 'mediaSession' in navigator && navigator.mediaSession.metadata) {
            navigator.mediaSession.metadata.album = displayString;
            navigator.mediaSession.playbackState = this.isRunning ? 'playing' : 'paused';
        }
    }

    updateStatus() {
        this.statusIndicator.textContent = this.mode === 'FOCUS' ? 'Focus Time' : 'Rest Time';

        // Update Toggle Button Icon/Tooltip
        const icon = this.skipBtn.querySelector('i');
        if (this.mode === 'FOCUS') {
            icon.className = 'ph ph-coffee';
            this.skipBtn.title = 'Skip to Rest';
        } else {
            icon.className = 'ph ph-brain'; // or ph-target
            this.skipBtn.title = 'Skip to Focus';
        }
    }

    changeQuote() {
        if (!this.quoteDisplay) return;
        const randomQuote = this.quotes[Math.floor(Math.random() * this.quotes.length)];
        this.quoteDisplay.textContent = randomQuote;
    }

    /* --------------------------
       Three.js / 3D Logic 
       -------------------------- */
    init3DScene() {
        if (this.is3DInitialized) return;

        const container = document.getElementById('rest-3d-scene');
        if (!container) return;

        // Scene
        this.scene = new THREE.Scene();
        // Transparent scene

        // Camera
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.z = 5;

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        container.appendChild(this.renderer.domElement);

        // Lights - stronger lighting for better 3D definition
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        this.scene.add(ambientLight);
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(10, 10, 10);
        this.scene.add(dirLight);
        const backLight = new THREE.DirectionalLight(0xffffff, 0.3);
        backLight.position.set(-5, 5, -10);
        this.scene.add(backLight);

        // Soft Snow Particle System

        // 1. Generate Soft Texture (Canvas)
        const getTexture = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 32;
            canvas.height = 32;
            const ctx = canvas.getContext('2d');

            // Radial Gradient for soft look
            const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
            gradient.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
            gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.8)');
            gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.2)');
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0.0)');

            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, 32, 32);

            const texture = new THREE.CanvasTexture(canvas);
            return texture;
        };

        // 2. Geometry & Particles
        const particleCount = 1500;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const velocities = []; // Store custom velocity/drift per particle

        for (let i = 0; i < particleCount; i++) {
            // Random positions in a large volume
            // Range: X[-25, 25], Y[-15, 25], Z[-10, 10]
            positions[i * 3] = (Math.random() - 0.5) * 50;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 40;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 20;

            // Random speed (Y) and drift (X)
            velocities.push({
                y: -0.005 - Math.random() * 0.03, // Fall speed (Slower)
                x: (Math.random() - 0.5) * 0.02, // Side drift
                z: (Math.random() - 0.5) * 0.02  // Depth drift
            });
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        this.particleVelocities = velocities;

        const material = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.8,
            map: getTexture(),
            transparent: true,
            opacity: 0.8,
            depthWrite: false, // Don't occlude other particles
            blending: THREE.AdditiveBlending
        });

        this.particles = new THREE.Points(geometry, material);
        this.scene.add(this.particles);

        // Handle Resize
        window.addEventListener('resize', () => {
            if (!this.camera || !this.renderer) return;
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });

        this.is3DInitialized = true;
    }

    toggle3DAnimation() {
        const container = document.getElementById('rest-3d-scene');

        // Show only in REST mode
        if (this.mode === 'REST') {
            container.classList.add('active');
            this.startAnimationLoop();
        } else {
            container.classList.remove('active');
            this.stopAnimationLoop();
        }
    }

    startAnimationLoop() {
        if (this.animationId) return; // Already running

        const animate = () => {
            if (this.mode !== 'REST') {
                this.stopAnimationLoop();
                return;
            }
            this.animationId = requestAnimationFrame(animate);
            this.updateSnowParticles();

            // Gentle Camera Movement
            const time = Date.now() * 0.0005; // Slow time
            const range = 2; // Movement range

            this.camera.position.x = Math.sin(time) * range;
            this.camera.position.y = Math.cos(time * 0.8) * range; // Different freq for non-circular path
            this.camera.lookAt(0, 0, 0);

            this.renderer.render(this.scene, this.camera);
        };
        animate();
    }

    stopAnimationLoop() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    // No need for resetPlanePosition anymore, behavior is continuous

    updateSnowParticles() {
        if (!this.particles) return;

        const positions = this.particles.geometry.attributes.position.array;

        for (let i = 0; i < this.particleVelocities.length; i++) {
            const v = this.particleVelocities[i];

            // Update Position
            positions[i * 3] += v.x + Math.sin(Date.now() * 0.001 + i) * 0.005; // Add wind sway
            positions[i * 3 + 1] += v.y; // Fall down
            positions[i * 3 + 2] += v.z;

            // Reset if out of view (Bottom)
            if (positions[i * 3 + 1] < -20) {
                positions[i * 3 + 1] = 20; // Move to top
                positions[i * 3] = (Math.random() - 0.5) * 50; // Random X
                positions[i * 3 + 2] = (Math.random() - 0.5) * 20; // Random Z
            }

            // Wrap X (Side to Side)
            if (positions[i * 3] > 30) positions[i * 3] = -30;
            if (positions[i * 3] < -30) positions[i * 3] = 30;
        }

        this.particles.geometry.attributes.position.needsUpdate = true;
    }

    /* --------------------------
       Electron IPC Communication
       -------------------------- */
    setupElectronIPC() {
        // Check if running in Electron
        if (typeof window.electron === 'undefined') {
            return; // Not in Electron, skip
        }

        // Hide browser-specific features in Electron
        document.querySelectorAll('.electron-hide').forEach(el => {
            el.style.display = 'none';
        });

        // Listen for commands from main process
        window.electron.onToggleTimer(() => {
            this.toggleTimer();
        });

        window.electron.onResetTimer(() => {
            this.resetTimer();
        });

        // Send initial state
        this.sendStateToElectron();
    }

    sendStateToElectron() {
        if (typeof window.electron === 'undefined') {
            return; // Not in Electron
        }

        const state = {
            mode: this.mode,
            timeLeft: this.timeLeft,
            isRunning: this.isRunning
        };

        window.electron.sendTimerUpdate(state);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    new FocusTimer();
});
