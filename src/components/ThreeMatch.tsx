// src/components/ThreeScene.jsx
import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import * as utils from './Utils.tsx';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls';
import { GUI, color } from 'dat.gui';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import Joystick from './Joystick.tsx'; // Joystick bileşenini import et
const BASE = process.env.PUBLIC_URL;  // → "/boxer"

var deltaTime: number;
var muzzle: utils.MuzzleFlashAnimator
let fireWeight = 0;   // anlık ağırlık
let fireTarget = 0;   // hedef ağırlık (0 veya 1)
const FIRE_LERP_K = 20;   // hız katsayısı (büyüdükçe daha hızlı)
// const isLandscape = window.matchMedia("(orientation: landscape)").matches;

// Hedefleri tek bir yerde topla
var targetBox;
var fovController = new utils.LerpManager()
// Kontrol için bir ayarlar nesnesi oluşturalım
const settings = {
    transitionX: 0.0, // 0'dan 1'e kadar gidecek slider değeri
    transitionY: 0.0 // 0'dan 1'e kadar gidecek slider değeri
};
var someBool = false

class Player {
    player: THREE.Object3D;
    playerSurface: THREE.Object3D;
    idleFireAction: THREE.AnimationAction;
    idleAction: THREE.AnimationAction;
    idleChrouchAction: THREE.AnimationAction;

    walkBackAction: THREE.AnimationAction;
    walkForwardAction: THREE.AnimationAction;
    walkLeftAction: THREE.AnimationAction;
    walkRightAction: THREE.AnimationAction;

    runBackAction: THREE.AnimationAction;
    runForwardAction: THREE.AnimationAction;
    runLeftAction: THREE.AnimationAction;
    runRightAction: THREE.AnimationAction;

    chrouchBackAction: THREE.AnimationAction;
    chrouchForwardAction: THREE.AnimationAction;
    chrouchLeftAction: THREE.AnimationAction;
    chrouchRightAction: THREE.AnimationAction;

    rifle: THREE.Object3D;
    rightHand: THREE.Object3D;
    spine: THREE.Object3D;
    hips: THREE.Object3D;
    spineController: utils.SpineAimController
    rifleOffset = new THREE.Vector3(26.76, 110.1, 13.96)
    // aimSpineOffset = new THREE.Vector3(-4, -43.67, 0)
    aimSpineOffset = new THREE.Vector3(0, -48, 0)
    riflePositionOffset = new THREE.Vector3(3.59, 7.86, 3.23)
    aimSphere;
    aimTarget;
    leftArmIK;
    idleActionLerp = new utils.LerpManager();
    idleChrouchActionLerp = new utils.LerpManager();

    scene: THREE.Scene;
    mixer: THREE.AnimationMixer;
    camera: THREE.PerspectiveCamera;

    isRunningRef: React.RefObject<boolean | null>
    isChrouchingRef: React.RefObject<boolean | null>
    deltaTime: number;
    clock: any;
    puppet: boolean;
    renderer: THREE.WebGLRenderer;

    initBegin: boolean = false
    didInit: boolean = false
    //damageEffect: 

    constructor(scene: THREE.Scene, renderer: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera, puppet: boolean = false, forceRotate = {}, onRotate = null) {
        this.scene = scene
        this.renderer = renderer
        this.camera = camera
        this.clock = new THREE.Clock()
        this.puppet = puppet

        if (!puppet) {
            this.aimSphere = utils.initThreeJsSceneAndSphere({
                _scene: this.scene,
                _renderer: this.renderer,
                rotationSpeed: 0.004,
                sphereColor: 0xffffff00,
                wireframe: false,
                forceRotate: forceRotate,
                onRotate: onRotate
            });

            // Target
            this.aimTarget = utils.AddSphere(this.aimSphere, .1, 0xffffff00)
            this.aimTarget.position.z = 10
        } else {
            // Target
            this.aimTarget = utils.AddSphere(this.scene, .1, 0xffffff00)
            this.aimTarget.position.z = 10
        }
    }

    initialize() {
        return new Promise((resolve, reject) => {
            if (this.initBegin) {
                reject(null)
            } else {
                this.initBegin = true
                new GLTFLoader().load(
                    // `${BASE}/models/aimDummyGunTest.glb`,
                    `${BASE}/models/aimDummy.glb`,
                    gltf => {

                        const model = SkeletonUtils.clone(gltf.scene);
                        this.scene.add(model);

                        // Animation mixer
                        this.mixer = new THREE.AnimationMixer(model);

                        // idleAction = mixer.clipAction(gltf.animations[2]);
                        this.idleAction = this.mixer.clipAction(gltf.animations.find(clip => clip.name === 'Idle'));
                        this.idleFireAction = this.mixer.clipAction(gltf.animations.find(clip => clip.name === 'IdleFire'));
                        this.idleChrouchAction = this.mixer.clipAction(gltf.animations.find(clip => clip.name === 'IdleCrouch'));

                        const idleFireUpperClip = utils.clipOnlyUpperBody(this.idleFireAction.getClip());   // ← yeni
                        const idleFireUpperAction = this.mixer.clipAction(idleFireUpperClip);     // ← yeni
                        idleFireUpperAction.setEffectiveWeight(0);                            // başlangıçta kapalı
                        idleFireUpperAction.play();
                        this.idleFireAction.clampWhenFinished = false;

                        // Eski idleFireAction değişkenine artık gerek yok,
                        // ama kodun geri kalanını bozmamak için şöyle güncelleyin:
                        this.idleFireAction = idleFireUpperAction;

                        this.walkBackAction = this.mixer.clipAction(gltf.animations.find(clip => clip.name === 'WalkBack'));//5
                        this.walkForwardAction = this.mixer.clipAction(gltf.animations.find(clip => clip.name === 'WalkForward'));//6
                        this.walkLeftAction = this.mixer.clipAction(gltf.animations.find(clip => clip.name === 'WalkLeft'));//7
                        this.walkRightAction = this.mixer.clipAction(gltf.animations.find(clip => clip.name === 'WalkRight'));//8

                        this.runBackAction = this.mixer.clipAction(gltf.animations.find(clip => clip.name === 'RunBack'));//0
                        this.runForwardAction = this.mixer.clipAction(gltf.animations.find(clip => clip.name === 'RunForward'));//1
                        this.runLeftAction = this.mixer.clipAction(gltf.animations.find(clip => clip.name === 'RunLeft'));//3
                        this.runRightAction = this.mixer.clipAction(gltf.animations.find(clip => clip.name === 'RunRight'));//4

                        this.chrouchBackAction = this.mixer.clipAction(gltf.animations.find(clip => clip.name === 'BackCrouch'));//0
                        this.chrouchForwardAction = this.mixer.clipAction(gltf.animations.find(clip => clip.name === 'ForwardCrouch'));//1
                        this.chrouchLeftAction = this.mixer.clipAction(gltf.animations.find(clip => clip.name === 'LeftCrouch'));//3
                        this.chrouchRightAction = this.mixer.clipAction(gltf.animations.find(clip => clip.name === 'RightCrouch'));//4

                        this.idleAction.setEffectiveWeight(0)
                        this.idleFireAction.setEffectiveWeight(0)
                        this.idleChrouchAction.setEffectiveWeight(0)

                        this.walkBackAction.setEffectiveWeight(0)
                        this.walkForwardAction.setEffectiveWeight(0)
                        this.walkLeftAction.setEffectiveWeight(0)
                        this.walkRightAction.setEffectiveWeight(0)

                        this.runBackAction.setEffectiveWeight(0)
                        this.runForwardAction.setEffectiveWeight(0)
                        this.runLeftAction.setEffectiveWeight(0)
                        this.runRightAction.setEffectiveWeight(0)

                        this.chrouchBackAction.setEffectiveWeight(0)
                        this.chrouchForwardAction.setEffectiveWeight(0)
                        this.chrouchLeftAction.setEffectiveWeight(0)
                        this.chrouchRightAction.setEffectiveWeight(0)

                        this.idleFireAction.setEffectiveTimeScale(2)
                        this.walkForwardAction.setEffectiveTimeScale(1.5)
                        this.walkBackAction.setEffectiveTimeScale(1.5)
                        this.runForwardAction.setEffectiveTimeScale(.9)
                        this.runRightAction.setEffectiveTimeScale(.6)
                        this.runLeftAction.setEffectiveTimeScale(.8)

                        this.idleAction.play()
                        this.idleFireAction.play()
                        this.idleChrouchAction.play()
                        this.walkBackAction.play()
                        this.walkForwardAction.play()
                        this.walkLeftAction.play()
                        this.walkRightAction.play()

                        this.runBackAction.play();
                        this.runForwardAction.play();
                        this.runLeftAction.play();
                        this.runRightAction.play();

                        this.chrouchBackAction.play();
                        this.chrouchForwardAction.play();
                        this.chrouchLeftAction.play();
                        this.chrouchRightAction.play();

                        this.idleActionLerp.setActions((x: number) => this.idleAction.setEffectiveWeight(x), () => this.idleAction.getEffectiveWeight())
                        this.idleChrouchActionLerp.setActions((x: number) => this.idleChrouchAction.setEffectiveWeight(x), () => this.idleChrouchAction.getEffectiveWeight())

                        this.rifle = model.getObjectByName("Rifle") as THREE.Object3D;

                        if (!this.puppet) {
                            muzzle = new utils.MuzzleFlashAnimator(this.rifle, [
                                `${BASE}/textures/shoot1.png`,
                                `${BASE}/textures/shoot2.png`,
                                `${BASE}/textures/shoot3.png`,
                                `${BASE}/textures/shoot4.png`,
                                `${BASE}/textures/shoot5.png`,
                            ], 50, true, true);
                        }

                        this.rightHand = model.getObjectByName("mixamorigRightHand") as THREE.Object3D;
                        this.rightHand.attach(this.rifle);

                        this.spine = model.getObjectByName("mixamorigSpine") as THREE.Object3D;
                        this.hips = model.getObjectByName("mixamorigHips") as THREE.Object3D;
                        this.player = model.getObjectByName("Right") as THREE.Object3D;
                        this.playerSurface = model.getObjectByName("Alpha_Surface") as THREE.Object3D;

                        if (!this.puppet) {
                            this.aimSphere.attach(this.camera)
                            this.camera.position.setX(this.camera.position.x - .2)
                            this.camera.position.setY(this.camera.position.y + .1)
                        }
                        // hide floor
                        const floor = model.getObjectByName("Floor") as THREE.Object3D;
                        floor.visible = false


                        this.spineController = new utils.SpineAimController({
                            spineBone: this.spine,
                            rifle: this.rifle,
                            rifleRotationTarget: this.rightHand,
                            target: this.aimTarget,
                            offset: this.aimSpineOffset,
                            rifleOffset: this.rifleOffset,
                        })
                        this.leftArmIK = new utils.FabrikLeftArm(
                            {
                                shoulder: model.getObjectByName('mixamorigLeftArm') as THREE.Bone,
                                elbow: model.getObjectByName('mixamorigLeftForeArm') as THREE.Bone,
                                wrist: model.getObjectByName('mixamorigLeftHand') as THREE.Bone,
                            },
                            this.rifle.getObjectByName('ForeGripTarget')!,   // Rifle üstüne boş bir boşluk / empty ekleyin
                            2,                                          // iterations
                        );

                        if (!this.puppet) {
                            utils.SceneManager.instance.register(this.scene, this.renderer, [this.mixer])
                        }
                        this.didInit = true
                        resolve(null)

                    },
                    xhr => ////console.log(`Loading: ${(xhr.loaded / xhr.total * 100).toFixed(1)}%`),
                        err => {
                            console.error('Error loading model:', err)
                            reject(err)
                        });
            }
        })
    }

    moveCharacter(joystick: any, baseMoveSpeed: any, deltaTime: any, forceRotate: any) {
        const { x, y } = joystick;

        const inputMagnitude = Math.hypot(x, y);
        if (inputMagnitude === 0 || !this.player) return;

        // Örneğin modelinin ileri ekseni local Y ise:
        const forward = new THREE.Vector3(0, 1, 0)
            .applyQuaternion(this.player.quaternion)
            .normalize();

        // Strafe için local X ekseni:
        const right = new THREE.Vector3(1, 0, 0)
            .applyQuaternion(this.player.quaternion)
            .normalize();

        // Joystick’i bu iki eksene projekte et
        const moveVec = forward.multiplyScalar(forceRotate ? x : -y)
            .add(right.multiplyScalar(forceRotate ? -y : -x))
            //         const moveVec = forward.multiplyScalar(x)
            // .add(right.multiplyScalar(-y))
            .normalize();

        this.player.position.addScaledVector(
            moveVec,
            baseMoveSpeed * inputMagnitude * deltaTime
        );
    }

    getIdleWeight(x, y) {
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

    onAnimate() {
        this.deltaTime = this.clock.getDelta()
        if (this.mixer) this.mixer.update(this.deltaTime);

        // find gun
        if (this.rifle) {
            if (this.rightHand) {
                //rightHand.getWorldPosition(rifle.position.add(riflePositionOffset));
                //rifle.position = riflePositionOffset;
                this.rifle.position.x = this.riflePositionOffset.x;
                this.rifle.position.y = this.riflePositionOffset.y;
                this.rifle.position.z = this.riflePositionOffset.z;

                this.rifle.rotation.x = this.rifleOffset.x;
                this.rifle.rotation.y = this.rifleOffset.y;
                this.rifle.rotation.z = this.rifleOffset.z;

                if (!this.puppet) {
                    this.player.getWorldPosition(this.aimSphere.position)
                }
                // player.getWorldPosition(camera.position)
                //mount.clientWidth < 1000 ? -1 :
                // camera.position.add(new THREE.Vector3(-1, 1.5, -2.5));
                // camera.position.add(new THREE.Vector3(mount.clientWidth < 1000 ? -.5 : -1, 1.381, -1.9));
            }
        }

        // idleAction?.setEffectiveWeight(getIdleWeight(settings.transitionX, settings.transitionY));
        this.idleActionLerp?.push(this.getIdleWeight(settings.transitionX, settings.transitionY), 1);

        if (this.isChrouchingRef.current) {
            // yürüyüşü sıfırla
            this.walkLeftAction?.setEffectiveWeight(0);
            this.walkRightAction?.setEffectiveWeight(0);
            this.walkBackAction?.setEffectiveWeight(0);
            this.walkForwardAction?.setEffectiveWeight(0);
            // idleAction?.setEffectiveWeight(0);
            this.idleActionLerp?.push(0);

            // koşu animasyonları
            this.chrouchLeftAction?.setEffectiveWeight(-THREE.MathUtils.clamp(settings.transitionX, -1, 0));
            this.chrouchRightAction?.setEffectiveWeight(THREE.MathUtils.clamp(settings.transitionX, 0, 1));
            this.chrouchBackAction?.setEffectiveWeight(-THREE.MathUtils.clamp(settings.transitionY, -1, 0));
            this.chrouchForwardAction?.setEffectiveWeight(THREE.MathUtils.clamp(settings.transitionY, 0, 1));
            // idleChrouchAction?.setEffectiveWeight(getIdleWeight(settings.transitionX, settings.transitionY));
            this.idleChrouchActionLerp?.push(this.getIdleWeight(settings.transitionX, settings.transitionY), 1);
            this.aimSpineOffset.x = 10

        } else {
            this.aimSpineOffset.x = -4

            this.chrouchLeftAction?.setEffectiveWeight(0);
            this.chrouchRightAction?.setEffectiveWeight(0);
            this.chrouchBackAction?.setEffectiveWeight(0);
            this.chrouchForwardAction?.setEffectiveWeight(0);
            // idleChrouchAction?.setEffectiveWeight(0);
            this.idleChrouchActionLerp?.push(0);

            // eski yürüyüş mantığınız
            this.walkLeftAction?.setEffectiveWeight(-THREE.MathUtils.clamp(settings.transitionX, -1, 0));
            this.walkRightAction?.setEffectiveWeight(THREE.MathUtils.clamp(settings.transitionX, 0, 1));
            // idleAction?.setEffectiveWeight(getIdleWeight(settings.transitionX, settings.transitionY));
            this.walkBackAction?.setEffectiveWeight(-THREE.MathUtils.clamp(settings.transitionY, -1, 0));
            this.walkForwardAction?.setEffectiveWeight(THREE.MathUtils.clamp(settings.transitionY, 0, 1));

            if (this.isRunningRef.current) {
                // yürüyüşü sıfırla
                this.walkLeftAction?.setEffectiveWeight(0);
                this.walkRightAction?.setEffectiveWeight(0);
                this.walkBackAction?.setEffectiveWeight(0);
                this.walkForwardAction?.setEffectiveWeight(0);
                // idleAction?.setEffectiveWeight(0);
                // koşu animasyonları
                this.runLeftAction?.setEffectiveWeight(-THREE.MathUtils.clamp(settings.transitionX, -1, 0));
                this.runRightAction?.setEffectiveWeight(THREE.MathUtils.clamp(settings.transitionX, 0, 1));
                this.runBackAction?.setEffectiveWeight(-THREE.MathUtils.clamp(settings.transitionY, -1, 0));
                this.runForwardAction?.setEffectiveWeight(THREE.MathUtils.clamp(settings.transitionY, 0, 1));
            } else {
                this.runLeftAction?.setEffectiveWeight(0);
                this.runRightAction?.setEffectiveWeight(0);
                this.runBackAction?.setEffectiveWeight(0);
                this.runForwardAction?.setEffectiveWeight(0);

                // eski yürüyüş mantığınız
                this.walkLeftAction?.setEffectiveWeight(-THREE.MathUtils.clamp(settings.transitionX, -1, 0));
                this.walkRightAction?.setEffectiveWeight(THREE.MathUtils.clamp(settings.transitionX, 0, 1));
                // idleAction?.setEffectiveWeight(getIdleWeight(settings.transitionX, settings.transitionY));
                this.walkBackAction?.setEffectiveWeight(-THREE.MathUtils.clamp(settings.transitionY, -1, 0));
                this.walkForwardAction?.setEffectiveWeight(THREE.MathUtils.clamp(settings.transitionY, 0, 1));
            }
        }

        if (this.isRunningRef.current) {

        } else {
            if (!this.puppet) {
                this.spineController?.update();

            }
        }

        // ---- Fire weight lerp ----
        if (this.idleFireAction) {
            fireWeight = THREE.MathUtils.lerp(
                fireWeight,
                fireTarget,
                this.deltaTime * FIRE_LERP_K
            );
            this.idleFireAction.setEffectiveWeight(fireWeight);
        }

        this.leftArmIK?.update();
        this.idleActionLerp?.update()
        this.idleChrouchActionLerp?.update()
    }

    onClear(beforeClear: (() => void) | null = null, didClear: (() => void) | null = null) {
        this.idleActionLerp?.clear()
        this.idleChrouchActionLerp?.clear()
        if (beforeClear) beforeClear()
        setTimeout(() => {
            utils.SceneManager.instance.disposeAllExceptLast()
            ////console.log("clear")
            if (didClear) didClear()
        }, 3000);

    }
}
export default function ThreeScene({ didRotate }) {
    const getInitialOrientation = () => {
        const isLandscape = window.matchMedia("(orientation: landscape)").matches;
        return !isLandscape;
    };
    const [forceRotate, setForceToRotate] = useState(getInitialOrientation)
    const mountRef = useRef(null);
    const [joystickCoords, setJoystickCoords] = useState({ x: 0, y: 0 });
    const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });
    const [isRunning, setIsRunning] = useState(false);
    const [isFiring, setIsFiring] = useState(false);
    const [isChrouching, setIsChrouching] = useState(false);
    const [crossSize, setCrossize] = useState(.01);
    const [healthPercent, setHealthPercent] = useState(100);
    const [opponentHealthPercent, setOpponentHealthPercent] = useState(100);
    const isRunningRef = useRef(isRunning);
    const isChrouchingRef = useRef(isChrouching);
    // References to core Three.js objects
    const sceneRef = useRef<THREE.Scene>(null);
    const instance = useRef<Player>(null);
    const opponent = useRef<Player>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera>(null);
    const rendererRef = useRef<THREE.WebGLRenderer>(null);
    const hittablesRef = useRef<THREE.Object3D[]>([]);
    const onRotate = useRef((_: boolean) => { })


    function FixRotation(silent: boolean | undefined = false) {
        setForceToRotate(getInitialOrientation());
        updateViewportVars(silent)
        onWindowResize()
        onRotate.current(getInitialOrientation())
    }

    useEffect(() => {
        // const newData = { width: window.visualViewport?.width ?? window.innerWidth, height: window.visualViewport?.height ?? window.innerHeight }
        // const renSize = new THREE.Vector2()
        // rendererRef.current?.getSize(renSize)
        // const width = forceRotate ? windowSize.height : windowSize.width;
        // // const height = forceRotate ? windowSize.width : windowSize.height;
        // if (rendererRef.current && renSize.width != width) {
        //     FixRotation(true)
        // }
        // if (windowSize.width == newData.width && windowSize.height == newData.height) {
        //     // Her saniye yazdırma işlemini başlat
        //     // const id = setInterval(() => FixRotation(true), 1000);

        //     // // 3 saniye sonra durdur
        //     // setTimeout(() => clearInterval(id), 10000);
        // }else{
            setTimeout(() => {
                FixRotation();
            }, 1000);
            // FixRotation();
        // }
        // if (someBool) {
        //     // FixRotation();
        //     // setTimeout(() => {
        //     //     someBool = false
        //     // }, 1000);
        //     someBool = false
        // } else {
        //     FixRotation();
        // }
    }, [windowSize]);
    useEffect(() => { isRunningRef.current = isRunning; }, [isRunning]);
    useEffect(() => { isChrouchingRef.current = isChrouching; }, [isChrouching]);
    // useEffect ile component yüklendiğinde (mount) ve kaldırıldığında (unmount) çalışacak kodu belirliyoruz.
    useEffect(() => {
        // 1. Media Query oluşturuluyor: 'orientation: landscape'
        const landscapeQuery = window.matchMedia("(orientation: landscape)");
        // 2. Handler (olay yöneticisi) fonksiyonu tanımlanıyor.
        const handleOrientationChange = (e) => {
            // if (e.matches) {
            // }
            // setForceToRotate(!e.matches);
            // updateViewportVars()
            // onWindowResize()
            // onRotate.current(getInitialOrientation())


            // 2. Ölçümü bir sonraki cycle'a ertele
            setTimeout(() => {
                // ARTIK DOĞRU DEĞER GELECEK
                const newInnerWidth = window.innerWidth;
                const newVisualWidth = window.visualViewport?.width;

                console.log("Yeni Inner Width:", newInnerWidth);
                console.log("Yeni Visual Viewport Width:", newVisualWidth);

                // State'inizi burada güncelleyin
                // setMyWidthState(newInnerWidth);
                // setWindowSize({ width: window.visualViewport?.width ?? window.innerWidth, height: window.visualViewport?.height ?? window.innerHeight })

                FixRotation()
            }, 50); // 50ms (milisaniye) genelde yeterli ve güvenilirdir
            // onWindowResize()

        };

        // 3. Component yüklendiğinde: 
        // a. Mevcut durumu kontrol et (Initial check)
        handleOrientationChange(landscapeQuery);

        // b. Olay dinleyiciyi ekle
        // addEventListener kullanmak addListener'dan daha modern ve tavsiye edilir.
        landscapeQuery.addEventListener("change", handleOrientationChange);

        // 4. Cleanup (Temizleme) Fonksiyonu: Component kaldırıldığında çalışır.
        return () => {
            // Hafıza sızıntısını önlemek için olay dinleyiciyi kaldır.
            landscapeQuery.removeEventListener("change", handleOrientationChange);
        };
    }, []);


    function updateViewportVars(silent = false) {
        if (!silent) {
            setWindowSize(prev => {
                const newData = { width: window.visualViewport?.width ?? window.innerWidth, height: window.visualViewport?.height ?? window.innerHeight }
                if (prev.width == newData.width && prev.height == newData.height) {
                    setTimeout(() => {
                        someBool = true
                    }, 50);
                }
                return newData
            })
        }

        const vvw = windowSize.width;
        const vvh = windowSize.height;
        document.documentElement.style.setProperty(forceRotate ? '--vvh' : '--vvw', `${vvw}px`);
        document.documentElement.style.setProperty(forceRotate ? '--vvw' : '--vvh', `${vvh}px`);
    }
    // Raycaster for hitscan
    const raycaster = useRef(new THREE.Raycaster());
    const pointer = useRef(new THREE.Vector2(0, 0)); // center of screen

    useEffect(() => {
        settings.transitionX = forceRotate ? joystickCoords.y : joystickCoords.x;
        settings.transitionY = forceRotate ? joystickCoords.x : -joystickCoords.y;

        instance.current?.moveCharacter(joystickCoords, isRunning ? 4 : 1.3, deltaTime, forceRotate)
    }, [joystickCoords])

    // useEffect(() => {
    //     onWindowResize()
    //     console.log("on|forceRotate")
    // }, [forceRotate])

    useEffect(() => {
        // if (sceneRef.current == null) {
        const mount = mountRef.current;
        // Cleanup any existing canvas
        while (mount.firstChild) mount.removeChild(mount.firstChild);
        // Scene setup
        const scene = new THREE.Scene();
        sceneRef.current = scene
        const camera = new THREE.PerspectiveCamera(
            60,
            mount.clientWidth / mount.clientHeight,
            0.1,
            1000
        );

        fovController.setActions(
            (newFov) => {
                if (!isNaN(newFov)) {
                    camera.fov = newFov
                    camera.updateProjectionMatrix()
                }
            },
            () => { return camera.fov },
        )

        camera.fov = 60

        cameraRef.current = camera;
        camera.rotation.set(-3, 0, 3.14);
        camera.position.set(-1.03, 1.3, -1.2);
        const renderer = new THREE.WebGLRenderer({
            antialias: false,
            // alpha: true 
        });
        rendererRef.current = renderer;
        renderer.setClearColor(0x000000, 0);
        renderer.setSize(mount.clientWidth, mount.clientHeight);
        mount.appendChild(renderer.domElement);

        // Controls
        // const controls = new OrbitControls(camera, renderer.domElement);
        // controls.enableDamping = true;
        // controls.dampingFactor = 0.05;

        // Lighting
        scene.add(new THREE.AmbientLight(0xffffff, 1));
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
        dirLight.position.set(5, 10, 7.5);
        scene.add(dirLight);

        const clock = new THREE.Clock();

        opponent.current = new Player(scene, renderer, camera, true)
        opponent.current.isRunningRef = isRunningRef
        opponent.current.isChrouchingRef = isChrouchingRef

        instance.current = new Player(scene, renderer, camera, false, forceRotate, onRotate)
        instance.current.isRunningRef = isRunningRef
        instance.current.isChrouchingRef = isChrouchingRef

        // TODO: why initial state only fetching via callback??
        onRotate.current(getInitialOrientation())

        const params = {
            posX: camera.position.x,
            posY: camera.position.y,
            posZ: camera.position.z,
            rotX: camera.rotation.x,
            rotY: camera.rotation.y,
            rotZ: camera.rotation.z,

            rootX: 0,
            rootY: 0,
            rootZ: 0,
        }

        // GUI setup
        let gui: GUI | null = null;
        if (process.env.NODE_ENV === 'development' && false) {
            gui = new GUI({ width: 300 });
            gui.closed = true;
            const camFolder = gui.addFolder('Camera')
            // 2) controller’ları “params” objesine bağla ve onChange ile kamerayı güncelle

            camFolder.add(params, 'posX', -10, 10, 0.01).name('Pos X')
                .onChange(v => { camera.position.x = v }).listen()

            camFolder.add(params, 'posY', -10, 10, 0.01).name('Pos Y')
                .onChange(v => { camera.position.y = v }).listen()

            camFolder.add(params, 'posZ', -10, 10, 0.01).name('Pos Z')
                .onChange(v => { camera.position.z = v }).listen()

            camFolder.add(params, 'rotX', -Math.PI, Math.PI, 0.01).name('Rot X')
                .onChange(v => { camera.rotation.x = v }).listen()

            camFolder.add(params, 'rotY', -Math.PI, Math.PI, 0.01).name('Rot Y')
                .onChange(v => { camera.rotation.y = v }).listen()

            camFolder.add(params, 'rotZ', -Math.PI, Math.PI, 0.01).name('Rot Z')
                .onChange(v => { camera.rotation.z = v }).listen()

            var Test = gui.addFolder('Test')

            // Test.add(rifleOffset, 'x', -360, 360, 0.01).name('rifleOffset x').onChange(v => { rifleOffset.x = v }).listen()
            // Test.add(rifleOffset, 'y', -360, 360, 0.01).name('rifleOffset y').onChange(v => { rifleOffset.y = v }).listen()
            // Test.add(rifleOffset, 'z', -360, 360, 0.01).name('rifleOffset z').onChange(v => { rifleOffset.z = v }).listen()

            // Test.add(aimSpineOffset, 'x', -360, 360, 0.01).name('aimSpineOffset x').onChange(v => { aimSpineOffset.x = v }).listen()
            // Test.add(aimSpineOffset, 'y', -360, 360, 0.01).name('aimSpineOffset y').onChange(v => { aimSpineOffset.y = v }).listen()
            // Test.add(aimSpineOffset, 'z', -360, 360, 0.01).name('aimSpineOffset z').onChange(v => { aimSpineOffset.z = v }).listen()

            // Test.add(riflePositionOffset, 'x', -10, 10, 0.01).name('riflePositionOffset x').onChange(v => { riflePositionOffset.x = v }).listen()
            // Test.add(riflePositionOffset, 'y', -10, 10, 0.01).name('riflePositionOffset y').onChange(v => { riflePositionOffset.y = v }).listen()
            // Test.add(riflePositionOffset, 'z', -10, 10, 0.01).name('riflePositionOffset z').onChange(v => { riflePositionOffset.z = v }).listen()
        }

        instance.current!.initialize().then(() => {
            new GLTFLoader().load(
                `${BASE}/models/environment.glb`,
                gltf => {
                    scene.add(gltf.scene);
                    targetBox = gltf.scene.getObjectByName("targetObject") as THREE.Object3D
                    targetBox.position.x = 0
                    targetBox.position.y = 2
                    targetBox.position.z = 3

                    targetBox.rotation.y = Math.PI

                    // const control = new TransformControls(this.camera, this.renderer.domElement);
                    // control.setMode('translate');          // ‘rotate’ / ‘scale’ de var
                    // control.attach(targetBox);
                    // const gizmo = control.getHelper();
                    // this.scene.add(gizmo);

                    // Model veya sahne yüklenirken hedef objeyi ekle:
                    hittablesRef.current.push(targetBox); // targetBox zaten referansın var

                    gltf.scene.getObjectByName("box") as THREE.Object3D
                    ////console.log("register") 
                    ////console.log(hittablesRef.current.length)

                },
                xhr => ////console.log(`Loading: ${(xhr.loaded / xhr.total * 100).toFixed(1)}%`),
                    err => console.error('Error loading model:', err));
            ////console.log("init done")

            opponent.current!.initialize().then(() => {
                PlayersToBases()
                hittablesRef.current.push(opponent.current.playerSurface); // targetBox zaten referansın var
            }).catch(() => { })
        }).catch(() => { })
        const animate = () => {
            const slowDownFactor = 1;
            deltaTime = clock.getDelta() * slowDownFactor;

            params.posX = camera.position.x;
            params.posY = camera.position.y;
            params.posZ = camera.position.z;
            params.rotX = camera.rotation.x;
            params.rotY = camera.rotation.y;
            params.rotZ = camera.rotation.z;

            if (instance.current?.player) {
                //utils.LookAtCustom(player, aimTarget.position, { x: true, y: true, z: true })
                // Yeni bir Vector3 oluştur, içine target'in dünya pozisyonunu yaz
                const worldTarget = new THREE.Vector3();
                instance.current?.aimTarget.getWorldPosition(worldTarget);
                utils.lookAtYawOnly(instance.current?.player, worldTarget)
                // player.rotation.x = params.rootX;
                // player.rotation.y = params.rootY;
                // player.rotation.z = params.rootZ;
            }

            if (process.env.NODE_ENV === 'development' && gui) {
                gui.updateDisplay();
            }

            instance.current?.onAnimate()
            opponent.current?.onAnimate()
            fovController.update()

            renderer?.render(scene, camera);
            requestAnimationFrame(animate);
        };

        // 2) listener’ı ekle
        window.addEventListener('resize', FixRotation);
        // window.visualViewport?.addEventListener('resize', onWindowResize);
        // window.visualViewport?.addEventListener('scroll', onWindowResize);

        // 3) ilk boyutlandırmayı da yap
        onWindowResize();
        animate();

        // Cleanup on unmount
        return () => {
            window.removeEventListener('resize', FixRotation);
            window.visualViewport?.removeEventListener('resize', onWindowResize);
            window.visualViewport?.removeEventListener('scroll', onWindowResize);
            if (process.env.NODE_ENV === 'development' && gui) {
                gui.destroy();
            }
            //controls.dispose();

            instance.current?.onClear()

            opponent.current?.onClear(() => {
                utils.SceneManager.deepDispose(scene, hittablesRef.current[0])
                ////console.log(hittablesRef.current.length)
            }, null)

            // idleActionLerp?.clear()
            // idleChrouchActionLerp?.clear()
            renderer.dispose();
            if (mount) mount.innerHTML = '';
            mountRef?.current?.removeChild(renderer.domElement)
        };
        // }
    }, []);

    // 1) resize handler
    const onWindowResize = () => {
        // const width = window.innerWidth;
        // const height = window.innerHeight;
        // alert("onWindowResize | forceRotate value:" + forceRotate)
        // updateViewportVars()

        if (cameraRef.current) {
            const width = forceRotate ? windowSize.height : windowSize.width;
            const height = forceRotate ? windowSize.width : windowSize.height;
            // const width = Number(document.documentElement.style.getPropertyValue('--vvw').slice(0, -2));
            // const height = Number(document.documentElement.style.getPropertyValue('--vvh').slice(0, -2));

            // console.log("onWindowResize Yeni Inner Width:", width);
            // console.log("onWindowResize Yeni Visual Viewport Width:", width);

            // Kamera aspect ve projeksiyon matrisini güncelle
            cameraRef.current.aspect = width / height;
            cameraRef.current.updateProjectionMatrix();

            // Renderer boyutunu güncelle
            rendererRef.current!.setSize(width, height);
        }
    };

    function PlayersToBases() {
        instance?.current?.player?.position.set(-3, 0, -3)
        //opponent?.current?.player.position.set(6,0,5) 
        opponent.current.player.rotation.z = Math.PI
    }

    // disable loupe
    useEffect(() => {
        const handleTouchMove = (e) => {
            e.preventDefault();
        }

        document.addEventListener("touchstart", handleTouchMove, {
            passive: false,
        })

        return () => {
            document.removeEventListener("touchstart", handleTouchMove)
        }
    }, [])

    // Shoot function using raycast (optimize)
    const shoot = useCallback(() => {
        const camera = cameraRef.current!;

        // Ekran merkezinden ray at (0,0 normalized device coords)
        pointer.current.set(0, 0);
        raycaster.current.setFromCamera(pointer.current, camera);

        // Sadece hedef listesine raycast yap, derin arama yok
        const intersects = raycaster.current.intersectObjects(hittablesRef.current, false);

        if (intersects.length > 0) {
            const hit = intersects[0];
            // if (hit.object.name !== "targetObject") return;

            // yeni X,Z konumlarını hesapla
            const newX = utils.getRandomFloat(-2, 2);
            const newY = utils.getRandomFloat(0.5, 3);

            // taşı
            targetBox.position.set(newX, newY, targetBox.position.z);

            // health bar debug
            setOpponentHealthPercent(prev => {
                if (prev - 10 <= 0) {

                    return 100
                }
                return prev - 10
            })
        }
    }, []);

    function HealthBar({ targetHealthPercent, side }) {
        return <button
            style={{
                position: 'fixed',
                left: side == "left"
                    ? `calc(var(--vvw) * 0.05 + var(--vvh) * 0.08 + 10px + env(safe-area-inset-left)  * .1) `
                    : undefined,
                right: side == "right"
                    ? `calc(var(--vvw) * 0.05 + var(--vvh) * 0.08 + 10px + env(safe-area-inset-left)  * .1) `
                    : undefined,
                top: `calc(var(--vvh) * 0.05 + env(safe-area-inset-top))`,
                width: `calc(var(--vvh) * 0.38)`,
                height: `calc(var(--vvh) * 0.08)`,
                //fontSize: 'calc(var(--vvh) * 0.04)',
                borderRadius: 'calc(var(--vvh) * 0.02 + 2px)',
                backgroundColor: "color-mix(in srgb, black 50%, transparent)",
                color: 'white',
                border: 'none',
                userSelect: 'none',
                touchAction: 'none',
                padding: 2,
                transform: `translateZ(0px)`,

            }}
        >
            <div
                style={{
                    backgroundColor: 'limegreen',
                    display: "flex",
                    width: `${targetHealthPercent}%`,
                    fontFamily: "monospace",
                    fontSize: 'calc(var(--vvh) * 0.05)',
                    color: "white",
                    height: "100%",
                    alignItems: "center",
                    justifyContent: 'left',
                    textAlign: "left",
                    borderRadius: 'calc(var(--vvh) * 0.02)',
                    boxSizing: 'border-box',
                    paddingLeft: "7%",
                }}
            >
                +
            </div>
        </button>
    }
    // 3,44
    return <div
        // style={{ position: 'fixed', width: '100vw', height: '100vh', overflow: 'hidden' }}
        style={{
            position: 'fixed',
            /* var(--vvw) ve var(--vvh) JS’den güncellenen gerçek ölçüler */
            width: forceRotate ? 'var(--vvw)' : "var(--vvw)'",
            height: forceRotate ? 'var(--vvh)' : "var(--vvh)'",
            overflow: 'hidden',
            backgroundColor: "#ffffff",
            transform: forceRotate ? "translate(0px,calc(var(--vvh)*-1)) rotate(90deg)" : undefined, //144px
            // transform: "translate(calc(var(--vvh)*-0.288), calc(var(--vvh)*0.288)) rotate(90deg)" //144px
            // transform: "rotate(90deg)", //144px
            transformOrigin: forceRotate ? "0% 100%" : undefined
        }}
    >
        <div style={{
            position: 'absolute',
            /* Görünen alanın tam ortası */
            top: '50%',
            left: '50%',
            /* Çapı, görüntü yüksekliğinin %5’i */
            width: `calc(var(--vvh) * ${crossSize})`,
            height: `calc(var(--vvh) * ${crossSize})`,
            /* Pivot’u merkeze al ve -50% kaydır */
            transform: `translate(-50%, -50%) translateZ(0px)`,
            border: '2px solid black',
            borderRadius: '50%',
            pointerEvents: 'none',
            userSelect: 'none',
            zIndex: 10,
            transition: 'width 0.05s ease, height 0.05s ease'
        }}
        />
        <div style={{
            position: 'fixed',
            bottom: 'calc(var(--vvw) * 0.05 + env(safe-area-inset-bottom))',
            left: 'calc(var(--vvw) * 0.05 + env(safe-area-inset-left))',
            zIndex: 10,
            transform: `translateZ(0px)`,

        }}>
            <Joystick onChange={setJoystickCoords} forceRotate={forceRotate} />
        </div>
        {/* Debugging için koordinatları gösterebiliriz */}
        {/* Yeni Run butonu */}
        <button
            style={{
                position: 'fixed',
                bottom: 'calc(var(--vvw) * 0.05 + env(safe-area-inset-bottom))',
                right: 'calc(var(--vvw) * 0.13 + env(safe-area-inset-right))',
                width: `calc(var(--vvh) * 0.12)`,
                height: `calc(var(--vvh) * 0.12)`,
                padding: 0,
                fontSize: 'calc(var(--vvh) * 0.08)',
                borderRadius: '50%',
                background: isRunning ? 'blue' : "grey",
                color: 'white',
                border: 'none',
                userSelect: 'none',           // metin seçimini iptal et
                touchAction: 'none',
                transform: `translateZ(0px)`,

            }}
            onPointerDown={() => {
                setIsRunning(true)
                ////console.log(cameraRef.current?.fov)
                fovController.push(75, .05)

            }}
            onPointerUp={() => {
                setIsRunning(false)
                fovController.push(60, .05)
            }}
        >
            💨
        </button>
        {/* Fire */}
        <button
            style={{
                position: 'fixed',
                bottom: 'calc(var(--vvw) * 0.12 + env(safe-area-inset-bottom))',
                right: 'calc(var(--vvw) * 0.05 + env(safe-area-inset-right))',
                width: `calc(var(--vvh) * 0.15)`,
                height: `calc(var(--vvh) * 0.15)`,
                padding: 0,
                fontSize: 'calc(var(--vvh) * 0.08)',
                borderRadius: '50%',
                background: isFiring ? 'red' : "grey",
                color: 'white',
                border: 'none',
                userSelect: 'none',           // metin seçimini iptal et
                touchAction: 'none',
                transform: `translateZ(0px)`,

            }}
            onPointerDown={() => {
                setCrossize(.03)
                shoot()
                fireTarget = 1;        // hedef  → 1
                setIsFiring(true);
                muzzle?.play();
            }}

            onPointerUp={() => {
                setCrossize(.01)
                fireTarget = 0;        // hedef  → 0
                setIsFiring(false);
                muzzle?.stop();
            }}
        >
            💥
        </button>
        {/* Crouch */}
        <button
            style={{
                position: 'fixed',
                bottom: 'calc(var(--vvw) * 0.17 + env(safe-area-inset-bottom))',
                left: 'calc(var(--vvw) * 0.05 + env(safe-area-inset-left))',
                width: `calc(var(--vvh) * 0.12)`,
                height: `calc(var(--vvh) * 0.12)`,
                padding: 0,
                fontSize: 'calc(var(--vvh) * 0.08)',
                borderRadius: '50%',
                background: isChrouching ? 'orange' : "grey",
                color: 'white',
                border: 'none',
                userSelect: 'none',           // metin seçimini iptal et
                touchAction: 'none',
                transform: `translateZ(0px)`,

            }}
            onPointerDown={() => {
                setIsChrouching(true)
            }}
            onPointerUp={() => {
                setIsChrouching(false)
            }}
        >
            🧎🏻
        </button>
        {/* refresh */}
        <button
            style={{
                position: 'fixed',
                //left: `calc(var(--vvw) * 0.05 + env(safe-area-inset-left))`,
                left: `calc(var(--vvw) * 0.05 + env(safe-area-inset-left) * .1)`,
                top: `calc(var(--vvh) * 0.05 + env(safe-area-inset-top))`,
                width: `calc(var(--vvh) * 0.08)`,
                height: `calc(var(--vvh) * 0.08)`,
                padding: 0,
                fontSize: 'calc(var(--vvh) * 0.04)',
                borderRadius: '50%',
                backgroundColor: 'grey',
                color: 'white',
                border: 'none',
                userSelect: 'none',
                touchAction: 'none',
                transform: `translateZ(0px)`,

            }}
            onPointerUp={() => {
                window.location.reload()
                // Auth.signInWithGoogle().then((user) => {
                //     alert(user.uid)
                // })
                // Auth.signInWithGoogleRedirect()
            }}
        >
            ⚙
        </button>
        <button
            style={{
                position: 'fixed',
                //left: `calc(var(--vvw) * 0.05 + env(safe-area-inset-left))`,
                right: `calc(var(--vvw) * 0.05 + env(safe-area-inset-right) * .1)`,
                bottom: `calc(var(--vvh) * 0.05 + env(safe-area-inset-top))`,
                width: `calc(var(--vvh) * 0.08)`,
                height: `calc(var(--vvh) * 0.08)`,
                padding: 0,
                fontSize: 'calc(var(--vvh) * 0.04)',
                borderRadius: '50%',
                backgroundColor: 'grey',
                color: 'white',
                border: 'none',
                userSelect: 'none',
                touchAction: 'none',
                transform: `translateZ(0px)`,

            }}
            onPointerUp={() => {
                // setForceToRotate(getInitialOrientation())
                // updateViewportVars()
                // onWindowResize()
                FixRotation()
                console.log(window.visualViewport?.width, window.innerWidth, window.visualViewport?.height, window.innerHeight);
                console.log(window.visualViewport?.width, window.innerWidth, window.visualViewport?.height, window.innerHeight);

            }}
        >
            ⚙
        </button>
        <HealthBar targetHealthPercent={healthPercent} side="left" />
        <HealthBar targetHealthPercent={opponentHealthPercent} side="right" />
        <div ref={mountRef} style={{ width: '100%', height: '100%' }} />

    </div>
}
