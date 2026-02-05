import { useEffect, useRef } from 'react';

const HoudiniParticles = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const particlesRef = useRef<Array<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    angle: number;
    speed: number;
    orbit: number;
    phase: number;
  }>>([]);
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const setSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    setSize();
    window.addEventListener('resize', setSize);

    // Initialize particles
    const particleCount = 60;
    for (let i = 0; i < particleCount; i++) {
      particlesRef.current.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: 0,
        vy: 0,
        size: Math.random() * 2 + 1,
        angle: Math.random() * Math.PI * 2,
        speed: 0.5 + Math.random() * 1,
        orbit: 80 + Math.random() * 120,
        phase: Math.random() * Math.PI * 2
      });
    }

    // Track mouse position
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', handleMouseMove);

    // Simple noise function
    const noise = (x: number, y: number, t: number) => {
      return Math.sin(x * 0.01 + t) * Math.cos(y * 0.01 + t) * 0.5 + 0.5;
    };

    let time = 0;

    // Animation loop
    const animate = () => {
      time += 0.01;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const particles = particlesRef.current;
      const mouse = mouseRef.current;

      particles.forEach((particle, i) => {
        // Calculate target position orbiting around cursor
        const targetAngle = particle.angle + time * particle.speed;
        const noiseVal = noise(particle.x, particle.y, time);
        const dynamicOrbit = particle.orbit + noiseVal * 40;
        
        const targetX = mouse.x + Math.cos(targetAngle) * dynamicOrbit;
        const targetY = mouse.y + Math.sin(targetAngle) * dynamicOrbit;

        // Antigravity float effect - slow oscillation
        const floatY = Math.sin(time * 2 + particle.phase) * 15;
        const floatX = Math.cos(time * 1.5 + particle.phase) * 10;

        // Smooth movement towards target
        const dx = (targetX + floatX) - particle.x;
        const dy = (targetY + floatY) - particle.y;
        
        particle.vx += dx * 0.02;
        particle.vy += dy * 0.02;
        
        // Damping for smooth motion
        particle.vx *= 0.92;
        particle.vy *= 0.92;
        
        particle.x += particle.vx;
        particle.y += particle.vy;

        // Update angle for continuous orbit
        particle.angle += 0.005;

        // Calculate opacity based on distance from cursor
        const distFromMouse = Math.sqrt(
          Math.pow(particle.x - mouse.x, 2) + 
          Math.pow(particle.y - mouse.y, 2)
        );
        const maxDist = 300;
        const opacity = Math.max(0.1, 1 - (distFromMouse / maxDist) * 0.7);

        // Draw particle with glow
        const gradient = ctx.createRadialGradient(
          particle.x, particle.y, 0,
          particle.x, particle.y, particle.size * 3
        );
        gradient.addColorStop(0, `rgba(255, 255, 255, ${opacity})`);
        gradient.addColorStop(0.5, `rgba(200, 210, 255, ${opacity * 0.5})`);
        gradient.addColorStop(1, 'rgba(150, 180, 255, 0)');

        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size * 3, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Draw core
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
        ctx.fill();

        // Draw connections between nearby particles
        for (let j = i + 1; j < particles.length; j++) {
          const other = particles[j];
          const dist = Math.sqrt(
            Math.pow(particle.x - other.x, 2) + 
            Math.pow(particle.y - other.y, 2)
          );
          
          if (dist < 100) {
            const lineOpacity = (1 - dist / 100) * 0.15;
            ctx.beginPath();
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(other.x, other.y);
            ctx.strokeStyle = `rgba(200, 210, 255, ${lineOpacity})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', setSize);
      window.removeEventListener('mousemove', handleMouseMove);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ 
        background: 'transparent',
        mixBlendMode: 'screen'
      }}
    />
  );
};

export default HoudiniParticles;
