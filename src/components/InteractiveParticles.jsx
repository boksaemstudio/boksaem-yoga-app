import { useEffect, useRef } from 'react';

class Particle {
    constructor(canvas, mouseRef, mode = 'cyber') {
        this.canvas = canvas;
        this.mouseRef = mouseRef;
        this.mode = mode;
        this.reset();
    }

    reset() {
        this.x = Math.random() * this.canvas.width;
        this.y = Math.random() * this.canvas.height;

        if (this.mode === 'calm') {
            // Calm mode: Slower, larger, soft moving orbs
            this.vx = (Math.random() - 0.5) * 0.2;
            this.vy = (Math.random() - 0.5) * 0.2;
            this.radius = Math.random() * 4 + 1.5;
            this.baseOpacity = Math.random() * 0.3 + 0.2;

            const calmColors = [
                'rgba(212, 175, 55,', // Gold
                'rgba(255, 255, 255,', // White
                'rgba(173, 216, 230,', // Soft Blue
                'rgba(221, 160, 221,'  // Plum
            ];
            this.color = calmColors[Math.floor(Math.random() * calmColors.length)];
        } else if (this.mode === 'burning') {
            // Burning mode: Fast, energetic, fiery colors for high streak
            this.vx = (Math.random() - 0.5) * 1.5;
            this.vy = (Math.random() - 0.5) * 1.5;
            this.radius = Math.random() * 3 + 1;
            this.baseOpacity = Math.random() * 0.5 + 0.5; // Brighter

            const fireColors = [
                'rgba(255, 69, 0,',   // Red Orange
                'rgba(255, 215, 0,',  // Gold
                'rgba(255, 140, 0,',  // Dark Orange
                'rgba(255, 255, 255,' // White core
            ];
            this.color = fireColors[Math.floor(Math.random() * fireColors.length)];
        } else if (this.mode === 'stillness') {
            // Stillness mode: Very slow, gray/misty for dormant
            this.vx = (Math.random() - 0.5) * 0.05;
            this.vy = (Math.random() - 0.5) * 0.05;
            this.radius = Math.random() * 2 + 0.5;
            this.baseOpacity = Math.random() * 0.2 + 0.1; // Faint

            const mistColors = [
                'rgba(200, 200, 200,', // Light Gray
                'rgba(100, 100, 120,', // Blueish Gray
                'rgba(255, 255, 255,'  // White
            ];
            this.color = mistColors[Math.floor(Math.random() * mistColors.length)];
        } else {
            // Cyber mode: Faster, smaller, energetic particles
            this.vx = (Math.random() - 0.5) * 0.8;
            this.vy = (Math.random() - 0.5) * 0.8;
            this.radius = Math.random() * 2.5 + 0.8;
            this.baseOpacity = Math.random() * 0.4 + 0.4;

            const cyberColors = [
                'rgba(0, 255, 255,',   // Cyan
                'rgba(191, 0, 255,',   // Purple
                'rgba(255, 0, 255,',   // Magenta
                'rgba(0, 150, 255,',   // Neon Blue
                'rgba(255, 255, 255,'  // White
            ];
            this.color = cyberColors[Math.floor(Math.random() * cyberColors.length)];
        }

        this.opacity = this.baseOpacity;
        this.twinkleDir = Math.random() > 0.5 ? 1 : -1;
        this.twinkleSpeed = (this.mode === 'calm' || this.mode === 'stillness') ? 0.003 + Math.random() * 0.005 : 0.005 + Math.random() * 0.01;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;

        // Twinkling effect
        this.opacity += this.twinkleDir * this.twinkleSpeed;
        const maxOp = this.mode === 'calm' ? 0.6 : 0.95;
        const minOp = this.mode === 'calm' ? 0.1 : 0.4;

        if (this.opacity > maxOp || this.opacity < minOp) {
            this.twinkleDir *= -1;
        }

        // Interactive Logic: Gentle influence
        if (this.mouseRef.current.active && this.mouseRef.current.x !== null) {
            const dx = this.mouseRef.current.x - this.x;
            const dy = this.mouseRef.current.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const maxDistance = this.mode === 'calm' ? 300 : 200;

            if (distance < maxDistance) {
                const force = (maxDistance - distance) / maxDistance;
                const multiplier = this.mode === 'calm' ? 0.2 : 0.5;
                this.x -= (dx / distance) * force * multiplier;
                this.y -= (dy / distance) * force * multiplier;
            }
        }

        // Wrap around edges
        if (this.x < -50) this.x = this.canvas.width + 50;
        if (this.x > this.canvas.width + 50) this.x = -50;
        if (this.y < -50) this.y = this.canvas.height + 50;
        if (this.y > this.canvas.height + 50) this.y = -50;
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);

        // Glow effect
        ctx.shadowBlur = this.mode === 'calm' ? 15 : 8;
        ctx.shadowColor = this.color + (this.mode === 'calm' ? '0.4)' : '0.8)');

        ctx.fillStyle = this.color + this.opacity + ')';
        ctx.fill();

        ctx.shadowBlur = 0;
    }
}

const InteractiveParticles = ({ mode = 'cyber', opacity = 1 }) => {
    const canvasRef = useRef(null);
    const mouseRef = useRef({ x: null, y: null, active: false });

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let animationFrameId;

        // CYBER / CALM LOGIC
        let particles = [];
        const particleCount = mode === 'calm' ? 45 : 130;
        const connectionDistance = 150;

        // MESH MODE LOGIC
        let gridPoints = [];
        const gap = 45; // Grid spacing
        let time = 0;

        const initMesh = () => {
            gridPoints = [];
            for (let y = -gap; y < canvas.height + gap * 2; y += gap) {
                const row = [];
                for (let x = -gap; x < canvas.width + gap * 2; x += gap) {
                    row.push({
                        baseX: x,
                        baseY: y,
                        x: x,
                        y: y,
                        phase: Math.random() * Math.PI * 2
                    });
                }
                gridPoints.push(row);
            }
        };

        const setup = () => {
            if (mode === 'mesh') {
                initMesh();
            } else {
                particles = [];
                for (let i = 0; i < particleCount; i++) {
                    particles.push(new Particle(canvas, mouseRef, mode));
                }
            }
        };

        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            setup();
        };

        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();

        const handleMouseMove = (e) => {
            mouseRef.current.x = e.clientX;
            mouseRef.current.y = e.clientY;
            mouseRef.current.active = true;
        };
        const handleTouchMove = (e) => {
            if (e.touches.length > 0) {
                mouseRef.current.x = e.touches[0].clientX;
                mouseRef.current.y = e.touches[0].clientY;
                mouseRef.current.active = true;
            }
        };
        const handleMouseLeave = () => { mouseRef.current.active = false; };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('touchmove', handleTouchMove);
        window.addEventListener('touchend', handleMouseLeave);
        window.addEventListener('mouseleave', handleMouseLeave);

        const drawLines = () => {
            if (mode === 'calm') return;
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    if (distance < connectionDistance) {
                        const lineOpacity = (1 - distance / connectionDistance) * 0.4;
                        ctx.beginPath();
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.strokeStyle = particles[i].color + lineOpacity + ')';
                        ctx.lineWidth = 0.8;
                        ctx.stroke();
                    }
                }
            }
        };

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            time += 0.02;

            if (mode === 'mesh') {
                ctx.strokeStyle = 'rgba(0, 255, 255, 0.25)';
                ctx.lineWidth = 0.6;

                for (let i = 0; i < gridPoints.length; i++) {
                    for (let j = 0; j < gridPoints[i].length; j++) {
                        const p = gridPoints[i][j];
                        const waveX = Math.sin(time + p.baseY * 0.01 + p.phase) * 12;
                        const waveY = Math.cos(time + p.baseX * 0.01 + p.phase) * 12;
                        let dx = 0, dy = 0;
                        if (mouseRef.current.active) {
                            const mdx = mouseRef.current.x - p.baseX;
                            const mdy = mouseRef.current.y - p.baseY;
                            const dist = Math.sqrt(mdx * mdx + mdy * mdy);
                            if (dist < 200) {
                                const force = (200 - dist) / 200;
                                dx = mdx * force * 0.4;
                                dy = mdy * force * 0.4;
                            }
                        }
                        p.x = p.baseX + waveX + dx;
                        p.y = p.baseY + waveY + dy;
                    }
                }

                ctx.beginPath();
                for (let i = 0; i < gridPoints.length; i++) {
                    for (let j = 0; j < gridPoints[i].length; j++) {
                        const p = gridPoints[i][j];
                        if (j < gridPoints[i].length - 1) {
                            const r = gridPoints[i][j + 1];
                            ctx.moveTo(p.x, p.y);
                            ctx.lineTo(r.x, r.y);
                        }
                        if (i < gridPoints.length - 1) {
                            const b = gridPoints[i + 1][j];
                            ctx.moveTo(p.x, p.y);
                            ctx.lineTo(b.x, b.y);
                        }
                    }
                }
                ctx.stroke();

                ctx.fillStyle = 'rgba(0, 255, 255, 0.4)';
                for (let i = 0; i < gridPoints.length; i += 2) {
                    for (let j = 0; j < gridPoints[i].length; j += 2) {
                        const p = gridPoints[i][j];
                        ctx.fillRect(p.x - 1, p.y - 1, 2, 2);
                    }
                }
            } else {
                drawLines();
                particles.forEach(p => { p.update(); p.draw(ctx); });
            }

            animationFrameId = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            window.removeEventListener('resize', resizeCanvas);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleMouseLeave);
            window.removeEventListener('mouseleave', handleMouseLeave);
            cancelAnimationFrame(animationFrameId);
        };
    }, [mode]);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                zIndex: 1,
                pointerEvents: 'none',
                background: 'transparent',
                opacity: opacity
            }}
        />
    );
};

export default InteractiveParticles;
