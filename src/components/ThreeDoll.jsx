// DraggableRagdollScene.jsx
import React, { Suspense, useRef, useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import {
  Physics,
  RigidBody,
  BallCollider,
  CuboidCollider,
  useSphericalJoint,
  useBeforePhysicsStep,
} from "@react-three/rapier";
import * as THREE from "three";

/* ------------------------------------------------------------------ */
/*  1. GrabControls – fare/dokunma ile sürükleme                      */
/* ------------------------------------------------------------------ */
function GrabControls() {
  const { gl, camera, scene } = useThree();
  const activeBodyRef         = useRef(null);            // seçili RigidBody
  const targetPoint           = useRef(new THREE.Vector3());
  const dragPlane             = useRef(new THREE.Plane());
  const pointerNDC            = new THREE.Vector2();
  const raycaster             = new THREE.Raycaster();

  /* DOM koordinatlarını NDC'ye çevir */
  const toNDC = (e) => {
    const rect = gl.domElement.getBoundingClientRect();
    pointerNDC.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );
  };

  /* Hedef noktasını güncelle */
  const updateTarget = (e) => {
    toNDC(e);
    raycaster.setFromCamera(pointerNDC, camera);
    raycaster.ray.intersectPlane(dragPlane.current, targetPoint.current);
  };

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";   // sayfa kaymasını kilitle
    return () => (document.body.style.overflow = prev); // bileşenden çıkınca geri al
  }, []);

  /* ------------------ Event binding ------------------ */
  useEffect(() => {
    const el = gl.domElement;

    const onDown = (e) => {
      toNDC(e);
      raycaster.setFromCamera(pointerNDC, camera);
      const hit = raycaster.intersectObjects(scene.children, true)
                           .find((h) => h.object.userData.body);
      if (!hit) return;

      const bodyRef = hit.object.userData.body;
      if (!bodyRef?.current) return;

      activeBodyRef.current = bodyRef.current;
      activeBodyRef.current.wakeUp?.();        // v0.11+

      // Kameraya dik düzlem oluştur
      dragPlane.current.setFromNormalAndCoplanarPoint(
        camera.getWorldDirection(new THREE.Vector3()).normalize(),
        hit.point
      );
      targetPoint.current.copy(hit.point);

      el.style.cursor = "grabbing";
    };

    const onMove = (e) => activeBodyRef.current && updateTarget(e);
    const onUp   = () => {
      activeBodyRef.current = null;
      el.style.cursor = "auto";
    };

    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup",   onUp);

    return () => {
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup",   onUp);
    };
  }, [gl, camera, scene]);

  /* ------------------ Fizik adımı ------------------ */
  useBeforePhysicsStep(() => {
    const body = activeBodyRef.current;
    if (!body) return;

    /* Rapier sürümleri arasında uyum: translation() fonksiyon veya obje */
    const pos = typeof body.translation === "function"
      ? body.translation()
      : body.translation;

    const impulse = {
      x: (targetPoint.current.x - pos.x) * .1,
      y: (targetPoint.current.y - pos.y) * .1,
      z: (targetPoint.current.z - pos.z) * .1,
    };
    body.applyImpulse(impulse, true);
  });

  return null;
}

/* ------------------------------------------------------------------ */
/*  2. Ana Scene bileşeni                                             */
/* ------------------------------------------------------------------ */
export default function DraggableRagdollScene() {
  
  return (
    <Canvas shadows camera={{ position: [4, 6, 10], fov: 40 }} style={{ position:"fixed", inset:0, width:"100vw", height:"100vh" }}>
      <ambientLight intensity={0.35} />
      <directionalLight
        castShadow
        position={[6, 10, 6]}
        intensity={0.8}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      {/* <OrbitControls makeDefault /> */}
      <Environment preset="city" />

      <Suspense fallback={null}>
        <Physics gravity={[0, -9.81, 0]} colliders={false}  numSolverIterations={10}       // ⇡ rijitlik
  numInternalPgsIterations={3}>
          <Ground />
          <Ragdoll position={[0, 1, 0]} />
          <GrabControls />
        </Physics>
      </Suspense>
    </Canvas>
  );
}

/* ------------------------------------------------------------------ */
/*  3. Zemin                                                          */
/* ------------------------------------------------------------------ */
function Ground() {
  return (
    <RigidBody type="fixed" colliders={false}>
      <mesh receiveShadow rotation-x={-Math.PI / 2}>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#8b8b8b" />
      </mesh>
      <CuboidCollider args={[10, 0.05, 10]} />
    </RigidBody>
  );
}

/* ------------------------------------------------------------------ */
/*  4. Ragdoll                                                        */
/* ------------------------------------------------------------------ */
function Ragdoll({ position = [0, 0, 0] }) {
  /* ------ RigidBody referansları ------ */
  const head       = useRef(),
        torso      = useRef(),
        pelvis     = useRef(),
        lUpperArm  = useRef(),
        rUpperArm  = useRef(),
        lLowerArm  = useRef(),
        rLowerArm  = useRef(),
        lUpperLeg  = useRef(),
        rUpperLeg  = useRef(),
        lLowerLeg  = useRef(),
        rLowerLeg  = useRef();

  /* ------ Boyutlar (half-extents) ------ */
  const size = {
    head: 0.17,
    torso: [0.22, 0.3, 0.12],
    pelvis: [0.2, 0.18, 0.12],
    upperArm: [0.07, 0.22, 0.07],
    lowerArm: [0.06, 0.22, 0.06],
    upperLeg: [0.09, 0.26, 0.09],
    lowerLeg: [0.08, 0.26, 0.08],
  };
  const full = (arr) => arr.map((v) => v * 2);

  /* ------ Eklemler (hook) ------ */
  useSphericalJoint(head, torso,   [0, -size.head, 0], [0,  size.torso[1], 0]);
  useSphericalJoint(torso, pelvis,[0, -size.torso[1],0],[0,  size.pelvis[1],0]);
  useSphericalJoint(torso, lUpperArm, [-size.torso[0], size.torso[1]*0.6, 0], [ size.upperArm[0],  size.upperArm[1], 0]);
  useSphericalJoint(torso, rUpperArm, [ size.torso[0], size.torso[1]*0.6, 0], [-size.upperArm[0],  size.upperArm[1], 0]);
  useSphericalJoint(lUpperArm, lLowerArm, [0, -size.upperArm[1], 0], [0,  size.lowerArm[1], 0]);
  useSphericalJoint(rUpperArm, rLowerArm, [0, -size.upperArm[1], 0], [0,  size.lowerArm[1], 0]);
  useSphericalJoint(pelvis, lUpperLeg, [-size.pelvis[0]*0.5, -size.pelvis[1], 0], [0,  size.upperLeg[1], 0]);
  useSphericalJoint(pelvis, rUpperLeg, [ size.pelvis[0]*0.5, -size.pelvis[1], 0], [0,  size.upperLeg[1], 0]);
  useSphericalJoint(lUpperLeg, lLowerLeg, [0, -size.upperLeg[1], 0], [0,  size.lowerLeg[1], 0]);
  useSphericalJoint(rUpperLeg, rLowerLeg, [0, -size.upperLeg[1], 0], [0,  size.lowerLeg[1], 0]);

  /* ------ Ortak RigidBody ayarları ------ */
  const rb = {
    colliders: false,
    friction: 0.9,
    restitution: 0.15,
    linearDamping: 0.2,
    angularDamping: 0.2,
    canSleep: true,
  };

  /* ------ Render ------ */
  return (
    <>
      {/* Head */}
      <RigidBody ref={head} {...rb}angularDamping={1.2} linearDamping={0.6}  position={[position[0], position[1] + 1.05, position[2]]}>
        <mesh castShadow userData={{ body: head }}>
          <sphereGeometry args={[size.head, 16, 16]} />
          <meshStandardMaterial color="#ffd1b5" />
        </mesh>
        <BallCollider args={[size.head]} />
      </RigidBody>

      {/* Torso */}
      <RigidBody ref={torso} {...rb}angularDamping={1.2} linearDamping={0.6}  position={[position[0], position[1] + 0.65, position[2]]}>
        <mesh castShadow userData={{ body: torso }}>
          <boxGeometry args={full(size.torso)} />
          <meshStandardMaterial color="#1e88e5" />
        </mesh>
        <CuboidCollider args={size.torso} />
      </RigidBody>

      {/* Pelvis */}
      <RigidBody ref={pelvis} {...rb}angularDamping={1.2} linearDamping={0.6}  position={[position[0], position[1] + 0.35, position[2]]}>
        <mesh castShadow userData={{ body: pelvis }}>
          <boxGeometry args={full(size.pelvis)} />
          <meshStandardMaterial color="#1565c0" />
        </mesh>
        <CuboidCollider args={size.pelvis} />
      </RigidBody>

      {/* Left Upper Arm */}
      <RigidBody ref={lUpperArm} {...rb}angularDamping={1.2} linearDamping={0.6}  position={[position[0] - 0.35, position[1] + 0.75, position[2]]}>
        <mesh castShadow userData={{ body: lUpperArm }}>
          <boxGeometry args={full(size.upperArm)} />
          <meshStandardMaterial color="#ff7043" />
        </mesh>
        <CuboidCollider args={size.upperArm} />
      </RigidBody>

      {/* Right Upper Arm */}
      <RigidBody ref={rUpperArm} {...rb}angularDamping={1.2} linearDamping={0.6}  position={[position[0] + 0.35, position[1] + 0.75, position[2]]}>
        <mesh castShadow userData={{ body: rUpperArm }}>
          <boxGeometry args={full(size.upperArm)} />
          <meshStandardMaterial color="#ff7043" />
        </mesh>
        <CuboidCollider args={size.upperArm} />
      </RigidBody>

      {/* Left Lower Arm */}
      <RigidBody ref={lLowerArm} {...rb}angularDamping={1.2} linearDamping={0.6}  position={[position[0] - 0.35, position[1] + 0.45, position[2]]}>
        <mesh castShadow userData={{ body: lLowerArm }}>
          <boxGeometry args={full(size.lowerArm)} />
          <meshStandardMaterial color="#ef6c00" />
        </mesh>
        <CuboidCollider args={size.lowerArm} />
      </RigidBody>

      {/* Right Lower Arm */}
      <RigidBody ref={rLowerArm} {...rb}angularDamping={1.2} linearDamping={0.6}  position={[position[0] + 0.35, position[1] + 0.45, position[2]]}>
        <mesh castShadow userData={{ body: rLowerArm }}>
          <boxGeometry args={full(size.lowerArm)} />
          <meshStandardMaterial color="#ef6c00" />
        </mesh>
        <CuboidCollider args={size.lowerArm} />
      </RigidBody>

      {/* Left Upper Leg */}
      <RigidBody ref={lUpperLeg} {...rb}angularDamping={1.2} linearDamping={0.6}  position={[position[0] - 0.15, position[1] + 0.10, position[2]]}>
        <mesh castShadow userData={{ body: lUpperLeg }}>
          <boxGeometry args={full(size.upperLeg)} />
          <meshStandardMaterial color="#8e24aa" />
        </mesh>
        <CuboidCollider args={size.upperLeg} />
      </RigidBody>

      {/* Right Upper Leg */}
      <RigidBody ref={rUpperLeg} {...rb}angularDamping={1.2} linearDamping={0.6}  position={[position[0] + 0.15, position[1] + 0.10, position[2]]}>
        <mesh castShadow userData={{ body: rUpperLeg }}>
          <boxGeometry args={full(size.upperLeg)} />
          <meshStandardMaterial color="#8e24aa" />
        </mesh>
        <CuboidCollider args={size.upperLeg} />
      </RigidBody>

      {/* Left Lower Leg */}
      <RigidBody ref={lLowerLeg} {...rb}angularDamping={1.2} linearDamping={0.6}  position={[position[0] - 0.15, position[1] - 0.25, position[2]]}>
        <mesh castShadow userData={{ body: lLowerLeg }}>
          <boxGeometry args={full(size.lowerLeg)} />
          <meshStandardMaterial color="#6a1b9a" />
        </mesh>
        <CuboidCollider args={size.lowerLeg} />
      </RigidBody>

      {/* Right Lower Leg */}
      <RigidBody ref={rLowerLeg} {...rb}angularDamping={1.2} linearDamping={0.6}  position={[position[0] + 0.15, position[1] - 0.25, position[2]]}>
        <mesh castShadow userData={{ body: rLowerLeg }}>
          <boxGeometry args={full(size.lowerLeg)} />
          <meshStandardMaterial color="#6a1b9a" />
        </mesh>
        <CuboidCollider args={size.lowerLeg} />
      </RigidBody>
    </>
  );
}
