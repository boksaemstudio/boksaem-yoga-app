import React, { useEffect, useRef } from 'react';

class Particle {
    constructor(canvas, mouseRef) {
        this.canvas = canvas;
        this.mouseRef = mouseRef;
        this.reset();
    }

    reset() {
        this.x = Math.random() * this.canvas.width;
        this.y = Math.random() * this.canvas.height;
        this.vx = (Math.random() - 0.5) * 0.7; // Faster drift for more life
        this.vy = (Math.random() - 0.5) * 0.7;
        this.radius = Math.random() * 2.5 + 1.0; // Larger particles (1.0-3.5)
        this.baseOpacity = Math.random() * 0.6 + 0.3; // Higher base visibility
        this.opacity = this.baseOpacity;
        this.twinkleDir = Math.random() > 0.5 ? 1 : -1;
        this.twinkleSpeed = 0.008 + Math.random() * 0.012; // Slightly more dynamic twinkling

        // Colors: Gold, White, and a rare soft blue
        const rand = Math.random();
        if (rand > 0.95) this.color = 'rgba(173, 216, 230,'; // Soft celestial blue
        else if (rand > 0.7) this.color = 'rgba(212, 175, 55,'; // Gold
        else this.color = 'rgba(255, 255, 255,'; // White
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;

        // Twinkling effect
        this.opacity += this.twinkleDir * this.twinkleSpeed;
        if (this.opacity > 0.9 || this.opacity < 0.1) {
            this.twinkleDir *= -1;
        }

        // Interactive Logic: Gentle attraction
        if (this.mouseRef.current.active && this.mouseRef.current.x !== null) {
            const dx = this.mouseRef.current.x - this.x;
            const dy = this.mouseRef.current.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const maxDistance = 250;

            if (distance < maxDistance) {
                const force = (maxDistance - distance) / maxDistance;
                this.x += (dx / distance) * force * 1.5;
                this.y += (dy / distance) * force * 1.5;
            }
        }

        // Wrap around edges
        if (this.x < -20) this.x = this.canvas.width + 20;
        if (this.x > this.canvas.width + 20) this.x = -20;
        if (this.y < -20) this.y = this.canvas.height + 20;
        if (this.y > this.canvas.height + 20) this.y = -20;
    }

    draw(ctx) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);

        // Minimal glow only for large particles to reduce GPU load
        if (this.radius > 1.5) {
            ctx.shadowBlur = 4;
            ctx.shadowColor = this.color + '0.5)';
        }

        ctx.fillStyle = this.color + this.opacity + ')';
        ctx.fill();
        ctx.restore();
    }
}

const InteractiveParticles = () => {
    const canvasRef = useRef(null);
    const mouseRef = useRef({ x: null, y: null, active: false });

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        let animationFrameId;
        let particles = [];
        const particleCount = 60; // Increased for better presence while maintaining tablet performance

        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

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

        const handleMouseLeave = () => {
            mouseRef.current.active = false;
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('touchmove', handleTouchMove);
        window.addEventListener('touchend', handleMouseLeave);
        window.addEventListener('mouseleave', handleMouseLeave);

        for (let i = 0; i < particleCount; i++) {
            particles.push(new Particle(canvas, mouseRef));
        }

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Subtle background shimmer/overlay if needed, but keeping it clean for now
            particles.forEach(particle => {
                particle.update();
                particle.draw(ctx);
            });

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
                zIndex: 3,
                pointerEvents: 'none',
                background: 'transparent'
            }}
        />
    );
};

export default InteractiveParticles;
