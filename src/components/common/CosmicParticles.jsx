import { useEffect, useRef } from 'react';

const CosmicParticles = () => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        let animationId;
        let particles = [];

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener('resize', resize);

        // Create particles
        const createParticles = () => {
            particles = [];
            const count = Math.floor((canvas.width * canvas.height) / 8000);
            
            for (let i = 0; i < count; i++) {
                particles.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    size: Math.random() * 2 + 0.5,
                    speedX: (Math.random() - 0.5) * 0.3,
                    speedY: (Math.random() - 0.5) * 0.3,
                    opacity: Math.random() * 0.8 + 0.2,
                    twinkle: Math.random() * 0.02,
                    twinkleDir: 1,
                    hue: Math.random() > 0.8 ? (Math.random() * 60 + 30) : 0, // Some gold particles
                    isGold: Math.random() > 0.85
                });
            }
        };
        createParticles();

        // Animation loop
        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            particles.forEach(p => {
                // Update position
                p.x += p.speedX;
                p.y += p.speedY;

                // Wrap around edges
                if (p.x < 0) p.x = canvas.width;
                if (p.x > canvas.width) p.x = 0;
                if (p.y < 0) p.y = canvas.height;
                if (p.y > canvas.height) p.y = 0;

                // Twinkle effect
                p.opacity += p.twinkle * p.twinkleDir;
                if (p.opacity > 1) { p.opacity = 1; p.twinkleDir = -1; }
                if (p.opacity < 0.1) { p.opacity = 0.1; p.twinkleDir = 1; }

                // Draw particle
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                
                if (p.isGold) {
                    // Gold particles
                    ctx.fillStyle = `rgba(212, 175, 55, ${p.opacity})`;
                    ctx.shadowColor = '#D4AF37';
                    ctx.shadowBlur = 8;
                } else {
                    // White/blue stars
                    const blue = Math.random() > 0.5 ? 255 : 200;
                    ctx.fillStyle = `rgba(255, 255, ${blue}, ${p.opacity * 0.7})`;
                    ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
                    ctx.shadowBlur = 4;
                }
                
                ctx.fill();
                ctx.shadowBlur = 0;
            });

            // Draw occasional shooting star
            if (Math.random() > 0.995) {
                const startX = Math.random() * canvas.width;
                const startY = Math.random() * canvas.height * 0.5;
                const gradient = ctx.createLinearGradient(startX, startY, startX + 100, startY + 60);
                gradient.addColorStop(0, 'rgba(212, 175, 55, 0.8)');
                gradient.addColorStop(1, 'rgba(212, 175, 55, 0)');
                
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(startX + 100, startY + 60);
                ctx.strokeStyle = gradient;
                ctx.lineWidth = 2;
                ctx.stroke();
            }

            animationId = requestAnimationFrame(animate);
        };
        animate();

        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animationId);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                zIndex: 0,
                pointerEvents: 'none',
                background: 'linear-gradient(180deg, #0a0a0f 0%, #0d0d15 50%, #0a0a0f 100%)'
            }}
        />
    );
};

export default CosmicParticles;
