// src/components/Joystick.jsx
import React, { useRef, useState, useEffect, useCallback } from 'react';

const JOYSTICK_SIZE = 200;
const THUMB_SIZE = 100;
const MAX_DISTANCE = (JOYSTICK_SIZE - THUMB_SIZE) / 2;

const Joystick = ({ onChange }) => {
  const joystickRef = useRef(null);
  const activePointerIdRef = useRef(null);
  const positionRef = useRef({ x: 0, y: 0 });
  const returnFrameRef = useRef(null);
  const dragFrameRef = useRef(null);

  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  // state + ref güncellemesi
  const updatePosition = useCallback((newPos) => {
    positionRef.current = newPos;
    setPosition(newPos);
  }, []);

  // Drag start
  const handlePointerDown = useCallback((e) => {
    // touch ise sadece ilk parmağın ID'sini al
    if (e.pointerType === 'touch') {
      activePointerIdRef.current = e.pointerId;
    }
    // varsa return animasyonunu iptal et
    if (returnFrameRef.current) {
      cancelAnimationFrame(returnFrameRef.current);
      returnFrameRef.current = null;
    }
    setIsDragging(true);
    e.preventDefault();
  }, []);

  // Drag move
  const handlePointerMove = useCallback((e) => {
    if (!isDragging) return;
    // touch ise, sadece aktif ID ile
    if (e.pointerType === 'touch' && e.pointerId !== activePointerIdRef.current) {
      return;
    }

    const rect = joystickRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    let newX = e.clientX - centerX;
    let newY = e.clientY - centerY;
    const dist = Math.hypot(newX, newY);
    if (dist > MAX_DISTANCE) {
      const angle = Math.atan2(newY, newX);
      newX = Math.cos(angle) * MAX_DISTANCE;
      newY = Math.sin(angle) * MAX_DISTANCE;
    }

    updatePosition({ x: newX, y: newY });
  }, [isDragging, updatePosition]);

  // Drag end
  const handlePointerUp = useCallback((e) => {
    if (e.pointerType === 'touch' && e.pointerId !== activePointerIdRef.current) {
      return;
    }
    activePointerIdRef.current = null;
    setIsDragging(false);
  }, []);

  // Drag süresince her frame onChange
  useEffect(() => {
    if (isDragging) {
      const tick = () => {
        const { x, y } = positionRef.current;
        onChange?.({ x: x / MAX_DISTANCE, y: y / MAX_DISTANCE });
        dragFrameRef.current = requestAnimationFrame(tick);
      };
      tick();
    } else {
      if (dragFrameRef.current) {
        cancelAnimationFrame(dragFrameRef.current);
        dragFrameRef.current = null;
      }
    }
    return () => {
      if (dragFrameRef.current) {
        cancelAnimationFrame(dragFrameRef.current);
        dragFrameRef.current = null;
      }
    };
  }, [isDragging, onChange]);

  // Bırakıldığında lerp ile merkeze dönüş + onChange
  useEffect(() => {
    if (isDragging) return;

    const animateReturn = () => {
      setPosition(prev => {
        const lerp = 0.15;
        const newX = prev.x + (0 - prev.x) * lerp;
        const newY = prev.y + (0 - prev.y) * lerp;
        if (Math.hypot(newX, newY) < 0.5) {
          cancelAnimationFrame(returnFrameRef.current);
          returnFrameRef.current = null;
          updatePosition({ x: 0, y: 0 });
          onChange?.({ x: 0, y: 0 });
          return { x: 0, y: 0 };
        }
        updatePosition({ x: newX, y: newY });
        onChange?.({ x: newX / MAX_DISTANCE, y: newY / MAX_DISTANCE });
        returnFrameRef.current = requestAnimationFrame(animateReturn);
        return { x: newX, y: newY };
      });
    };

    animateReturn();
    return () => {
      if (returnFrameRef.current) {
        cancelAnimationFrame(returnFrameRef.current);
        returnFrameRef.current = null;
      }
    };
  }, [isDragging, onChange, updatePosition]);

  // Event listener’lar
  useEffect(() => {
    const el = joystickRef.current;
    el?.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      el?.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [handlePointerDown, handlePointerMove, handlePointerUp]);


  return (
    // src/components/Joystick.tsx
    <div
      ref={joystickRef}
      style={{
        /* Görünen viewport yüksekliğinin %20’si */
        width: 'calc(var(--vvh) * 0.2)',
        height: 'calc(var(--vvh) * 0.2)',
        borderRadius: '50%',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        position: 'relative',
        touchAction: 'none',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          /* Joystick çapının yarısı kadar */
          width: 'calc(var(--vvh) * 0.1)',
          height: 'calc(var(--vvh) * 0.1)',
          borderRadius: '50%',
          backgroundColor: 'rgba(255, 255, 255, 0.7)',
          position: 'absolute',
          left: '50%',
          top: '50%',
          /* Yarım genişlik/yükseklik ofseti */
          marginLeft: 'calc(-1 * var(--vvh) * 0.05)',
          marginTop: 'calc(-1 * var(--vvh) * 0.05)',
          transform: `translate(${position.x}px, ${position.y}px)`,
          touchAction: 'none',
        }}
      />
    </div>
  );
};

export default Joystick;
