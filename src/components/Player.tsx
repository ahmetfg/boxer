// src/components/Player.tsx
import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import * as THREE from 'three';
import * as utils from './Utils.tsx';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

var player: THREE.Object3D;
var idleFireAction: THREE.AnimationAction;
var idleAction: THREE.AnimationAction;
var idleChrouchAction: THREE.AnimationAction;

var walkBackAction: THREE.AnimationAction;
var walkForwardAction: THREE.AnimationAction;
var walkLeftAction: THREE.AnimationAction;
var walkRightAction: THREE.AnimationAction;

var runBackAction: THREE.AnimationAction;
var runForwardAction: THREE.AnimationAction;
var runLeftAction: THREE.AnimationAction;
var runRightAction: THREE.AnimationAction;

var chrouchBackAction: THREE.AnimationAction;
var chrouchForwardAction: THREE.AnimationAction;
var chrouchLeftAction: THREE.AnimationAction;
var chrouchRightAction: THREE.AnimationAction;

var muzzle: utils.MuzzleFlashAnimator
let fireWeight = 0;   // anlık ağırlık
let fireTarget = 0;   // hedef ağırlık (0 veya 1)
const FIRE_LERP_K = 20;   // hız katsayısı (büyüdükçe daha hızlı)

// Kontrol için bir ayarlar nesnesi oluşturalım
const settings = {
    transitionX: 0.0, // 0'dan 1'e kadar gidecek slider değeri
    transitionY: 0.0 // 0'dan 1'e kadar gidecek slider değeri
};

const BASE = process.env.PUBLIC_URL;

const Player = forwardRef(({ scene, camera, aimSphere, aimTarget }: { scene: THREE.Scene, camera: THREE.PerspectiveCamera, aimSphere: THREE.Object3D, aimTarget: THREE.Object3D }, ref) => {
    const rifleOffset = useRef(new THREE.Vector3(26.76, 110.1, 13.96));
    const aimSpineOffset = useRef(new THREE.Vector3(-4, -43.67, 0));
    const riflePositionOffset = useRef(new THREE.Vector3(3.59, 7.86, 3.23));

    let mixer;
    var rifle: THREE.Object3D;
    var rightHand: THREE.Object3D;
    var spine: THREE.Object3D;
    var hips: THREE.Object3D;
    var spineController: utils.SpineAimController
    var leftArmIK;
    var idleActionLerp = new utils.LerpManager();
    var idleChrouchActionLerp = new utils.LerpManager();

    useImperativeHandle(ref, () => ({
        update: (deltaTime: number, joystickCoords: { x: number, y: number }, isRunning: boolean, isChrouching: boolean) => {
            settings.transitionX = joystickCoords.x;
            settings.transitionY = -joystickCoords.y;

            moveCharacter(joystickCoords, player, isRunning ? 3 : 1.3, deltaTime);

            if (mixer) mixer.update(deltaTime);

            if (player) {
                const worldTarget = new THREE.Vector3();
                aimTarget.getWorldPosition(worldTarget);
                utils.lookAtYawOnly(player, worldTarget)
            }

            if (rifle) {
                if (rightHand) {
                    rifle.position.x = riflePositionOffset.current.x;
                    rifle.position.y = riflePositionOffset.current.y;
                    rifle.position.z = riflePositionOffset.current.z;

                    rifle.rotation.x = rifleOffset.current.x;
                    rifle.rotation.y = rifleOffset.current.y;
                    rifle.rotation.z = rifleOffset.current.z;

                    player.getWorldPosition(aimSphere.position)
                }
            }

            idleActionLerp?.push(getIdleWeight(settings.transitionX, settings.transitionY), 1);

            if (isChrouching) {
                walkLeftAction?.setEffectiveWeight(0);
                walkRightAction?.setEffectiveWeight(0);
                walkBackAction?.setEffectiveWeight(0);
                walkForwardAction?.setEffectiveWeight(0);
                idleActionLerp?.push(0);

                chrouchLeftAction?.setEffectiveWeight(-THREE.MathUtils.clamp(settings.transitionX, -1, 0));
                chrouchRightAction?.setEffectiveWeight(THREE.MathUtils.clamp(settings.transitionX, 0, 1));
                chrouchBackAction?.setEffectiveWeight(-THREE.MathUtils.clamp(settings.transitionY, -1, 0));
                chrouchForwardAction?.setEffectiveWeight(THREE.MathUtils.clamp(settings.transitionY, 0, 1));
                idleChrouchActionLerp?.push(getIdleWeight(settings.transitionX, settings.transitionY), 1);
                aimSpineOffset.current.x = 10

            } else {
                aimSpineOffset.current.x = -4

                chrouchLeftAction?.setEffectiveWeight(0);
                chrouchRightAction?.setEffectiveWeight(0);
                chrouchBackAction?.setEffectiveWeight(0);
                chrouchForwardAction?.setEffectiveWeight(0);
                idleChrouchActionLerp?.push(0);

                walkLeftAction?.setEffectiveWeight(-THREE.MathUtils.clamp(settings.transitionX, -1, 0));
                walkRightAction?.setEffectiveWeight(THREE.MathUtils.clamp(settings.transitionX, 0, 1));
                walkBackAction?.setEffectiveWeight(-THREE.MathUtils.clamp(settings.transitionY, -1, 0));
                walkForwardAction?.setEffectiveWeight(THREE.MathUtils.clamp(settings.transitionY, 0, 1));

                if (isRunning) {
                    walkLeftAction?.setEffectiveWeight(0);
                    walkRightAction?.setEffectiveWeight(0);
                    walkBackAction?.setEffectiveWeight(0);
                    walkForwardAction?.setEffectiveWeight(0);

                    runLeftAction?.setEffectiveWeight(-THREE.MathUtils.clamp(settings.transitionX, -1, 0));
                    runRightAction?.setEffectiveWeight(THREE.MathUtils.clamp(settings.transitionX, 0, 1));
                    runBackAction?.setEffectiveWeight(-THREE.MathUtils.clamp(settings.transitionY, -1, 0));
                    runForwardAction?.setEffectiveWeight(THREE.MathUtils.clamp(settings.transitionY, 0, 1));
                } else {
                    runLeftAction?.setEffectiveWeight(0);
                    runRightAction?.setEffectiveWeight(0);
                    runBackAction?.setEffectiveWeight(0);
                    runForwardAction?.setEffectiveWeight(0);

                    walkLeftAction?.setEffectiveWeight(-THREE.MathUtils.clamp(settings.transitionX, -1, 0));
                    walkRightAction?.setEffectiveWeight(THREE.MathUtils.clamp(settings.transitionX, 0, 1));
                    walkBackAction?.setEffectiveWeight(-THREE.MathUtils.clamp(settings.transitionY, -1, 0));
                    walkForwardAction?.setEffectiveWeight(THREE.MathUtils.clamp(settings.transitionY, 0, 1));
                }
            }

            if (!isRunning) {
                spineController?.update();
            }

            // ---- Fire weight lerp ----
            if (idleFireAction) {
                fireWeight = THREE.MathUtils.lerp(
                    fireWeight,
                    fireTarget,
                    deltaTime * FIRE_LERP_K
                );
                idleFireAction.setEffectiveWeight(fireWeight);
            }

            leftArmIK?.update();
            idleActionLerp?.update()
            idleChrouchActionLerp?.update()
        },
        fireStart: () => {
            fireTarget = 1;
            muzzle?.play();
        },
        fireStop: () => {
            fireTarget = 0;
            muzzle?.stop();
        },
        rifleOffset: rifleOffset.current,
        aimSpineOffset: aimSpineOffset.current,
        riflePositionOffset: riflePositionOffset.current
    }));

    function moveCharacter(joystick, mesh, baseMoveSpeed, deltaTime) {
        const { x, y } = joystick;
        const inputMagnitude = Math.hypot(x, y);
        if (inputMagnitude === 0 || !mesh) return;

        // Örneğin modelinin ileri ekseni local Y ise:
        const forward = new THREE.Vector3(0, 1, 0)
            .applyQuaternion(mesh.quaternion)
            .normalize();

        // Strafe için local X ekseni:
        const right = new THREE.Vector3(1, 0, 0)
            .applyQuaternion(mesh.quaternion)
            .normalize();

        // Joystick’i bu iki eksene projekte et
        const moveVec = forward.multiplyScalar(-y)
            .add(right.multiplyScalar(-x))
            .normalize();

        mesh.position.addScaledVector(
            moveVec,
            baseMoveSpeed * inputMagnitude * deltaTime
        );
    }

    function getIdleWeight(x, y) {
        // Maksimum uzaklık (X ve Y'nin en fazla 1 olabileceğini varsayarsak)
        // Bu değer, (1,1) noktasının (0,0)'a olan uzaklığıdır: sqrt(1^2 + 1^2) = sqrt(2) ≈ 1.414
        const maxDistance = 1.0; // Sliderlarımız 0-1 aralığında olduğu için, 1.0'ı maksimum kabul edebiliriz.
        // Eğer (1,1) noktasının tam uzaklığını kullanmak istersek Math.sqrt(2) olmalı.
        // Basitlik için ve slider aralığıyla uyumlu olması için 1.0 ideal.

        // (0,0) noktasına olan uzaklığı hesapla
        const distance = Math.sqrt(x * x + y * y);

        // Uzaklığı normalize et (0 ile 1 arasına getir)
        const normalizedDistance = THREE.MathUtils.clamp(distance / maxDistance, 0, 1);

        // Idle ağırlığını hesapla: Uzaklık arttıkça ağırlık azalır
        const idleWeight = 1.0 - normalizedDistance;

        // Ağırlığın 0 ile 1 arasında olduğundan emin ol
        return THREE.MathUtils.clamp(idleWeight, 0, 1);
    }

    useEffect(() => {
        new GLTFLoader().load(
            `${BASE}/models/aimDummy.glb`,
            gltf => {
                const model = SkeletonUtils.clone(gltf.scene);
                scene.add(model);

                // Animation mixer
                mixer = new THREE.AnimationMixer(model);

                idleAction = mixer.clipAction(gltf.animations.find(clip => clip.name === 'Idle'));
                idleFireAction = mixer.clipAction(gltf.animations.find(clip => clip.name === 'IdleFire'));
                idleChrouchAction = mixer.clipAction(gltf.animations.find(clip => clip.name === 'IdleCrouch'));

                const idleFireUpperClip = utils.clipOnlyUpperBody(idleFireAction.getClip());   // ← yeni
                const idleFireUpperAction = mixer.clipAction(idleFireUpperClip);     // ← yeni
                idleFireUpperAction.setEffectiveWeight(0);                            // başlangıçta kapalı
                idleFireUpperAction.play();
                idleFireAction.clampWhenFinished = false;

                // Eski idleFireAction değişkenine artık gerek yok,
                // ama kodun geri kalanını bozmamak için şöyle güncelleyin:
                idleFireAction = idleFireUpperAction;

                walkBackAction = mixer.clipAction(gltf.animations.find(clip => clip.name === 'WalkBack'));//5
                walkForwardAction = mixer.clipAction(gltf.animations.find(clip => clip.name === 'WalkForward'));//6
                walkLeftAction = mixer.clipAction(gltf.animations.find(clip => clip.name === 'WalkLeft'));//7
                walkRightAction = mixer.clipAction(gltf.animations.find(clip => clip.name === 'WalkRight'));//8

                runBackAction = mixer.clipAction(gltf.animations.find(clip => clip.name === 'RunBack'));//0
                runForwardAction = mixer.clipAction(gltf.animations.find(clip => clip.name === 'RunForward'));//1
                runLeftAction = mixer.clipAction(gltf.animations.find(clip => clip.name === 'RunLeft'));//3
                runRightAction = mixer.clipAction(gltf.animations.find(clip => clip.name === 'RunRight'));//4

                chrouchBackAction = mixer.clipAction(gltf.animations.find(clip => clip.name === 'BackCrouch'));//0
                chrouchForwardAction = mixer.clipAction(gltf.animations.find(clip => clip.name === 'ForwardCrouch'));//1
                chrouchLeftAction = mixer.clipAction(gltf.animations.find(clip => clip.name === 'LeftCrouch'));//3
                chrouchRightAction = mixer.clipAction(gltf.animations.find(clip => clip.name === 'RightCrouch'));//4

                idleAction.setEffectiveWeight(0)
                idleFireAction.setEffectiveWeight(0)
                idleChrouchAction.setEffectiveWeight(0)

                walkBackAction.setEffectiveWeight(0)
                walkForwardAction.setEffectiveWeight(0)
                walkLeftAction.setEffectiveWeight(0)
                walkRightAction.setEffectiveWeight(0)

                runBackAction.setEffectiveWeight(0)
                runForwardAction.setEffectiveWeight(0)
                runLeftAction.setEffectiveWeight(0)
                runRightAction.setEffectiveWeight(0)

                chrouchBackAction.setEffectiveWeight(0)
                chrouchForwardAction.setEffectiveWeight(0)
                chrouchLeftAction.setEffectiveWeight(0)
                chrouchRightAction.setEffectiveWeight(0)

                idleFireAction.setEffectiveTimeScale(2)
                walkForwardAction.setEffectiveTimeScale(1.5)
                walkBackAction.setEffectiveTimeScale(1.5)
                runForwardAction.setEffectiveTimeScale(1.3)
                runRightAction.setEffectiveTimeScale(.8)

                idleAction.play()
                idleFireAction.play()
                idleChrouchAction.play()
                walkBackAction.play()
                walkForwardAction.play()
                walkLeftAction.play()
                walkRightAction.play()

                runBackAction.play();
                runForwardAction.play();
                runLeftAction.play();
                runRightAction.play();

                chrouchBackAction.play();
                chrouchForwardAction.play();
                chrouchLeftAction.play();
                chrouchRightAction.play();

                idleActionLerp.setActions((x: number) => idleAction.setEffectiveWeight(x), () => idleAction.getEffectiveWeight())
                idleChrouchActionLerp.setActions((x: number) => idleChrouchAction.setEffectiveWeight(x), () => idleChrouchAction.getEffectiveWeight())

                rifle = model.getObjectByName("Rifle") as THREE.Object3D;

                muzzle = new utils.MuzzleFlashAnimator(rifle, [
                    `${BASE}/textures/shoot1.png`,
                    `${BASE}/textures/shoot2.png`,
                    `${BASE}/textures/shoot3.png`,
                    `${BASE}/textures/shoot4.png`,
                    `${BASE}/textures/shoot5.png`,
                ], 50, true, true);

                rightHand = model.getObjectByName("mixamorigRightHand") as THREE.Object3D;
                rightHand.attach(rifle);

                spine = model.getObjectByName("mixamorigSpine") as THREE.Object3D;
                hips = model.getObjectByName("mixamorigHips") as THREE.Object3D;
                player = model.getObjectByName("Right") as THREE.Object3D;
                aimSphere.attach(camera)

                // hide floor
                const floor = model.getObjectByName("Floor") as THREE.Object3D;
                floor.visible = false


                spineController = new utils.SpineAimController({
                    spineBone: spine,
                    rifle: rifle,
                    rifleRotationTarget: rightHand,
                    target: aimTarget,
                    offset: aimSpineOffset.current,
                    rifleOffset: rifleOffset.current,
                })
                leftArmIK = new utils.FabrikLeftArm(
                    {
                        shoulder: model.getObjectByName('mixamorigLeftArm') as THREE.Bone,
                        elbow: model.getObjectByName('mixamorigLeftForeArm') as THREE.Bone,
                        wrist: model.getObjectByName('mixamorigLeftHand') as THREE.Bone,
                    },
                    rifle.getObjectByName('ForeGripTarget')!,   // Rifle üstüne boş bir boşluk / empty ekleyin
                    2,                                          // iterations
                );
            },
            xhr => console.log(`Loading: ${(xhr.loaded / xhr.total * 100).toFixed(1)}%`),
            err => console.error('Error loading model:', err)
        );

        return () => {
            idleActionLerp?.clear()
            idleChrouchActionLerp?.clear()
        };
    }, [scene, camera, aimSphere, aimTarget]);

    return null;
});

export default Player;