// src/components/ThreeScene.jsx
import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GUI } from 'dat.gui';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

const STORAGE_KEY = 'boneOffsets';
export default function ThreeScene() {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    // Cleanup any existing canvas
    while (mount.firstChild) mount.removeChild(mount.firstChild);

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      mount.clientWidth / mount.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 1, 3);
    const renderer = new THREE.WebGLRenderer({ antialias: true,
      // alpha: true 
    });
    // renderer.setClearColor( 0x000000, 0 );
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(5, 10, 7.5);
    scene.add(dirLight);

    // GUI setup
    const gui = new GUI({ width: 300 });
    const bones = [];
    let mixer;
    let clipDuration = 0;
    const clock = new THREE.Clock();

    // LocalStorage helpers
    const loadOffsets = () => {
      try {
        const d = localStorage.getItem(STORAGE_KEY);
        return d ? JSON.parse(d) : {};
      } catch {
        return {};
      }
    };
    const saveOffsets = () => {
      const map = {};
      bones.forEach(b => { map[b.name] = { ...b.userData.offset }; });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
      console.log('Offsets saved');
    };

    // Load GLTF
    new GLTFLoader().load(
      '/models/dummy.glb',
      gltf => {
        const model = SkeletonUtils.clone(gltf.scene);
        scene.add(model);

        // Animation mixer
        mixer = new THREE.AnimationMixer(model);
        if (gltf.animations.length) {
          const clip = gltf.animations[1];
          clipDuration = clip.duration;
          const action = mixer.clipAction(clip);
          action.play();
        }

        // Collect bones & init offsets
        const saved = loadOffsets();
        model.traverse(obj => {
          if (obj.isBone) {
            bones.push(obj);
            const off = saved[obj.name] || { x: 0, y: 0, z: 0 };
            obj.userData.offset = { x: off.x, y: off.y, z: off.z };
          }
        });

        // GUI: folders per bone
        const folder = gui.addFolder('Bone Offsets');
        bones.forEach(bone => {
          const f = folder.addFolder(bone.name || bone.uuid);
          f.add(bone.userData.offset, 'x', -Math.PI, Math.PI, 0.01).name('offsetX');
          f.add(bone.userData.offset, 'y', -Math.PI, Math.PI, 0.01).name('offsetY');
          f.add(bone.userData.offset, 'z', -Math.PI, Math.PI, 0.01).name('offsetZ');
        });
        folder.open();
        gui.add({ save: saveOffsets }, 'save').name('Save Offsets');
        gui.add({ clear: () => { localStorage.removeItem(STORAGE_KEY); window.location.reload(); } }, 'clear').name('Clear Offsets');
      },
      xhr => console.log(`Loading: ${(xhr.loaded / xhr.total * 100).toFixed(1)}%`),
      err => console.error('Error loading model:', err)
    );

    // Render loop
    const animate = () => {
      requestAnimationFrame(animate);
      const delta = clock.getDelta() *.1;
      if (mixer) mixer.update(delta);
      controls.update();

      // Apply offsets without accumulation
      bones.forEach(bone => {
        // Capture base animation quaternion
        const baseQuat = bone.quaternion.clone();
        const { x, y, z } = bone.userData.offset;
        const offsetQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z, 'XYZ'));
        // Combine base + offset
        bone.quaternion.copy(baseQuat.multiply(offsetQuat));
      });

      renderer.render(scene, camera);
    };
    animate();

    // Cleanup on unmount
    return () => {
      gui.destroy();
      controls.dispose();
      renderer.dispose();
      if (mount) mount.innerHTML = '';
    };
  }, []);

  return <div ref={mountRef} style={{ width: '100%', height: '100vh', margin: 0, padding: 0 }} />;
}
