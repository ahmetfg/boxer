// src/components/ThreeSixty.js
import React, { useEffect, useRef, forwardRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader }     from 'three/examples/jsm/loaders/GLTFLoader';

const ThreeSixty = forwardRef(function ThreeSixty(
  { src, glbPath ,glbPath2, animationName = 'CubeAction.001', muted = true },
  forwardedRef
) {
  const containerRef = useRef(null);

  // forwardedRef bağlama (isteğe bağlı)
  useEffect(() => {
    if (!forwardedRef) return;
    if (typeof forwardedRef === 'function') forwardedRef(containerRef.current);
    else forwardedRef.current = containerRef.current;
  }, [forwardedRef]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // --- Sahne & Renderer ---
    const scene    = new THREE.Scene();
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.toneMapping = THREE.NeutralToneMapping
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setClearColor(0x222222); // debug için gri arka plan
    container.appendChild(renderer.domElement);

    // --- Kamera & Kontroller ---
    const camera = new THREE.PerspectiveCamera(
      75,
      container.clientWidth / container.clientHeight,
      0.1,
      1100
    );
    camera.position.set(0, 0, 0.01);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableZoom   = false;
    controls.enablePan    = false;
    controls.rotateSpeed  = -0.25;
    // Lighting

    scene.add(new THREE.AmbientLight("white", 3));
    const dirLight = new THREE.DirectionalLight("white", 11.72); 
    dirLight.position.set(-5, 10, -7.5);
    scene.add(dirLight);

    // --- Video & Texture ---
    const video = document.createElement('video');
    video.src         = src;
    video.loop        = true;
    video.muted       = muted;
    video.playsInline = true;
    video.crossOrigin = 'anonymous';
    video.load();
    video.play().catch(err => console.warn('video.play error:', err));

    const texture = new THREE.VideoTexture(video);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.format    = THREE.RGBFormat;

    // const sphereGeo = new THREE.SphereGeometry(1000, 33*2, 15*2);
    // sphereGeo.scale(-1, 1, 1);
    // sphereGeo.rotateY(-.13);
    // const sphereMat = new THREE.MeshBasicMaterial({ map: texture });
    // scene.add(new THREE.Mesh(sphereGeo, sphereMat));

    // --- GLTFLoader & AnimationMixer ---
    const loader = new GLTFLoader();
    let mixer = null;
    let clipDuration = 0;

    loader.load(
      glbPath,
      gltf => {
        const model = gltf.scene;
        model.scale.set(-1, 1, -1);
        scene.add(model);

        if (gltf.animations.length) {
          mixer = new THREE.AnimationMixer(model);
          const clip = THREE.AnimationClip.findByName(
            gltf.animations,
            animationName
          );
          if (clip) {
            const action = mixer.clipAction(clip);
            action.setLoop(THREE.LoopRepeat, Infinity);
            action.play();
            clipDuration = clip.duration;
          } else {
            console.warn('Animasyon bulunamadı:', animationName);
          }
        }
      },
      undefined,
      err => console.error('GLTF load error:', err)
    );

    loader.load(
      glbPath2,
      gltf => {
        const model = gltf.scene;
        model.scale.set(-1, 1, -1);
        // model.rotateY(-.13);
        // model.material = sphereMat;
        // scene.add(model);
        // const sphereMat = new THREE.MeshBasicMaterial({ map: texture });
        // const sphere = new THREE.Mesh(model, sphereMat);
        scene.add(model);
      },
      undefined,
      err => console.error('GLTF2 load error:', err)
    );

    // video metadata yüklendiğinde duration al
    let videoDuration = 0;
    video.addEventListener(
      'loadedmetadata',
      () => (videoDuration = video.duration),
      { once: true }
    );

    // oran hesaplama
    const getRatio = () =>
      videoDuration > 0 ? clipDuration / videoDuration : 1;

    // --- Responsive Resize ---
    const onResize = () => {
      const w = container.clientWidth,
            h = container.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize);

    // --- Animate Loop (Promise’lere takılmıyor) ---
    const clock = new THREE.Clock();
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();

      // her frame’de texture güncelle
      if (video.readyState >= 2) {
        texture.needsUpdate = true;
        // mixer varsa, video.currentTime ile senkronize et
        if (mixer) {
          mixer.update(clock.getDelta());
          mixer.setTime(video.currentTime * getRatio());
        }
      }

      renderer.render(scene, camera);
    };
    animate();

    // --- Cleanup ---
    return () => {
      window.removeEventListener('resize', onResize);
      controls.dispose();
      // sphereGeo?.dispose();
      // sphereMat?.dispose();
      texture.dispose();
      renderer.dispose();
      video.pause();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      if (mixer) mixer.stopAllAction();
    };
  }, [src, glbPath, glbPath2, animationName, muted]);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100vh', overflow: 'hidden' }}
    />
  );
});

export default ThreeSixty;
