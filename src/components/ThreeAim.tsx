// src/components/ThreeScene.jsx
import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import addPositionSlidersToGUI, * as utils from './Utils.tsx';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls';
import { GUI, color } from 'dat.gui';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import Joystick from './Joystick.tsx'; // Joystick bileşenini import et

var player: THREE.Object3D;
var deltaTime;
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

var targetBox

// Kontrol için bir ayarlar nesnesi oluşturalım
const settings = {
    transitionX: 0.0, // 0'dan 1'e kadar gidecek slider değeri
    transitionY: 0.0 // 0'dan 1'e kadar gidecek slider değeri
};

export default function ThreeScene() {
    const mountRef = useRef(null);
    const [joystickCoords, setJoystickCoords] = useState({ x: 0, y: 0 });
    const [isRunning, setIsRunning] = useState(false);
    const [isFiring, setIsFiring] = useState(false);
    const [isChrouching, setIsChrouching] = useState(false);
    const [crossSize, setCrossize] = useState(1);
    const isRunningRef = useRef(isRunning);
    const isChrouchingRef = useRef(isChrouching);
    // References to core Three.js objects
    const sceneRef = useRef<THREE.Scene>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera>(null);
    const rendererRef = useRef<THREE.WebGLRenderer>(null);

    useEffect(() => { isRunningRef.current = isRunning; }, [isRunning]);
    useEffect(() => { isChrouchingRef.current = isChrouching; }, [isChrouching]);
    // Raycaster for hitscan
    const raycaster = useRef(new THREE.Raycaster());
    const pointer = useRef(new THREE.Vector2(0, 0)); // center of screen

    useEffect(() => {
        settings.transitionX = joystickCoords.x;
        settings.transitionY = -joystickCoords.y;

        moveCharacter(joystickCoords, player, isRunning ? 3 : 1.3, deltaTime)
    }, [joystickCoords])

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

    useEffect(() => {
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

        const aimSphere = utils.initThreeJsSceneAndSphere({
            _scene: scene,
            _renderer: renderer,
            rotationSpeed: 0.005,
            sphereColor: null,
            wireframe: false
        });

        // Target
        const aimTarget = utils.AddSphere(aimSphere, .1, null)
        aimTarget.position.z = 10

        targetBox = utils.AddSphere(scene, .2, "grey")
        targetBox.name = "targetObject";
        targetBox.position.x = 3
        targetBox.position.y = 1
        targetBox.position.z = 2

        // GUI setup
        const gui = new GUI({ width: 300 });
        gui.hide();
        gui.closed = true
        const camFolder = gui.addFolder('Camera')
        // 2) controller’ları “params” objesine bağla ve onChange ile kamerayı güncelle
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

        let mixer;
        const clock = new THREE.Clock();
        var rifle: THREE.Object3D;
        var rightHand: THREE.Object3D;
        var spine: THREE.Object3D;
        var hips: THREE.Object3D;
        var spineController: utils.SpineAimController
        var rifleOffset = new THREE.Vector3(26.76, 110.1, 13.96)
        var aimSpineOffset = new THREE.Vector3(-4, -43.67, 0)
        var riflePositionOffset = new THREE.Vector3(3.59, 7.86, 3.23)
        var Test = gui.addFolder('Test')
        var leftArmIK;
        var idleActionLerp = new utils.LerpManager();
        var idleChrouchActionLerp = new utils.LerpManager();

        Test.add(rifleOffset, 'x', -360, 360, 0.01).name('rifleOffset x').onChange(v => { rifleOffset.x = v }).listen()
        Test.add(rifleOffset, 'y', -360, 360, 0.01).name('rifleOffset y').onChange(v => { rifleOffset.y = v }).listen()
        Test.add(rifleOffset, 'z', -360, 360, 0.01).name('rifleOffset z').onChange(v => { rifleOffset.z = v }).listen()

        Test.add(aimSpineOffset, 'x', -360, 360, 0.01).name('aimSpineOffset x').onChange(v => { aimSpineOffset.x = v }).listen()
        Test.add(aimSpineOffset, 'y', -360, 360, 0.01).name('aimSpineOffset y').onChange(v => { aimSpineOffset.y = v }).listen()
        Test.add(aimSpineOffset, 'z', -360, 360, 0.01).name('aimSpineOffset z').onChange(v => { aimSpineOffset.z = v }).listen()

        Test.add(riflePositionOffset, 'x', -10, 10, 0.01).name('riflePositionOffset x').onChange(v => { riflePositionOffset.x = v }).listen()
        Test.add(riflePositionOffset, 'y', -10, 10, 0.01).name('riflePositionOffset y').onChange(v => { riflePositionOffset.y = v }).listen()
        Test.add(riflePositionOffset, 'z', -10, 10, 0.01).name('riflePositionOffset z').onChange(v => { riflePositionOffset.z = v }).listen()

        // 1) resize handler
        const onWindowResize = () => {
            const width = mount.clientWidth;
            const height = mount.clientHeight;

            // const width = window.innerWidth;
            // const height = window.innerHeight;

            // Kamera aspect ve projeksiyon matrisini güncelle
            camera.aspect = width / height;
            camera.updateProjectionMatrix();

            // Renderer boyutunu güncelle
            renderer.setSize(width, height);
        };

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

        // Load GLTF
        new GLTFLoader().load(
            '/models/aimDummy.glb',
            gltf => {
                const model = SkeletonUtils.clone(gltf.scene);
                scene.add(model);
                // const n = new THREE.SkeletonHelper(model)
                // scene.add(n);

                // Animation mixer
                mixer = new THREE.AnimationMixer(model);

                // idleAction = mixer.clipAction(gltf.animations[2]);
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
                    '/textures/shoot1.png',
                    '/textures/shoot2.png',
                    '/textures/shoot3.png',
                    '/textures/shoot4.png',
                    '/textures/shoot5.png',
                ], 50, true, true);

                rightHand = model.getObjectByName("mixamorigRightHand") as THREE.Object3D;
                rightHand.attach(rifle);

                spine = model.getObjectByName("mixamorigSpine") as THREE.Object3D;
                hips = model.getObjectByName("mixamorigHips") as THREE.Object3D;
                player = model.getObjectByName("Right") as THREE.Object3D;
                aimSphere.attach(camera)

                spineController = new utils.SpineAimController({
                    spineBone: spine,
                    rifle: rifle,
                    rifleRotationTarget: rightHand,
                    target: aimTarget,
                    offset: aimSpineOffset,
                    rifleOffset: rifleOffset,
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

                params.rootX = player.rotation.x;
                params.rootY = player.rotation.y;
                params.rootZ = player.rotation.z;

                const control = new TransformControls(camera, renderer.domElement);
                control.setMode('translate');          // ‘rotate’ / ‘scale’ de var
                control.attach(rifle.getObjectByName('ForeGripTarget')!);
                const gizmo = control.getHelper();
                // scene.add( gizmo );

            },
            xhr => console.log(`Loading: ${(xhr.loaded / xhr.total * 100).toFixed(1)}%`),
            err => console.error('Error loading model:', err)
        );


        // addPositionSlidersToGUI(scene, gui)
        // Render loop
        const animate = () => {
            const slowDownFactor = 1;
            deltaTime = clock.getDelta() * slowDownFactor;
            if (mixer) mixer.update(deltaTime);
            //controls.update();

            params.posX = camera.position.x;
            params.posY = camera.position.y;
            params.posZ = camera.position.z;
            params.rotX = camera.rotation.x;
            params.rotY = camera.rotation.y;
            params.rotZ = camera.rotation.z;

            if (player) {
                //utils.LookAtCustom(player, aimTarget.position, { x: true, y: true, z: true })
                // Yeni bir Vector3 oluştur, içine target'in dünya pozisyonunu yaz
                const worldTarget = new THREE.Vector3();
                aimTarget.getWorldPosition(worldTarget);
                utils.lookAtYawOnly(player, worldTarget)
                // player.rotation.x = params.rootX;
                // player.rotation.y = params.rootY;
                // player.rotation.z = params.rootZ;
            }

            gui.updateDisplay();

            // find gun
            if (rifle) {
                if (rightHand) {
                    //rightHand.getWorldPosition(rifle.position.add(riflePositionOffset));
                    //rifle.position = riflePositionOffset;
                    rifle.position.x = riflePositionOffset.x;
                    rifle.position.y = riflePositionOffset.y;
                    rifle.position.z = riflePositionOffset.z;

                    rifle.rotation.x = rifleOffset.x;
                    rifle.rotation.y = rifleOffset.y;
                    rifle.rotation.z = rifleOffset.z;

                    player.getWorldPosition(aimSphere.position)
                    // player.getWorldPosition(camera.position)
                    //mount.clientWidth < 1000 ? -1 :
                    // camera.position.add(new THREE.Vector3(-1, 1.5, -2.5));
                    // camera.position.add(new THREE.Vector3(mount.clientWidth < 1000 ? -.5 : -1, 1.381, -1.9));


                }
            }

            // idleAction?.setEffectiveWeight(getIdleWeight(settings.transitionX, settings.transitionY));
            idleActionLerp?.push(getIdleWeight(settings.transitionX, settings.transitionY), 1);

            if (isChrouchingRef.current) {
                // yürüyüşü sıfırla
                walkLeftAction?.setEffectiveWeight(0);
                walkRightAction?.setEffectiveWeight(0);
                walkBackAction?.setEffectiveWeight(0);
                walkForwardAction?.setEffectiveWeight(0);
                // idleAction?.setEffectiveWeight(0);
                idleActionLerp?.push(0);

                // koşu animasyonları
                chrouchLeftAction?.setEffectiveWeight(-THREE.MathUtils.clamp(settings.transitionX, -1, 0));
                chrouchRightAction?.setEffectiveWeight(THREE.MathUtils.clamp(settings.transitionX, 0, 1));
                chrouchBackAction?.setEffectiveWeight(-THREE.MathUtils.clamp(settings.transitionY, -1, 0));
                chrouchForwardAction?.setEffectiveWeight(THREE.MathUtils.clamp(settings.transitionY, 0, 1));
                // idleChrouchAction?.setEffectiveWeight(getIdleWeight(settings.transitionX, settings.transitionY));
                idleChrouchActionLerp?.push(getIdleWeight(settings.transitionX, settings.transitionY), 1);
                aimSpineOffset.x = 10

            } else {
                aimSpineOffset.x = -4

                chrouchLeftAction?.setEffectiveWeight(0);
                chrouchRightAction?.setEffectiveWeight(0);
                chrouchBackAction?.setEffectiveWeight(0);
                chrouchForwardAction?.setEffectiveWeight(0);
                // idleChrouchAction?.setEffectiveWeight(0);
                idleChrouchActionLerp?.push(0);

                // eski yürüyüş mantığınız
                walkLeftAction?.setEffectiveWeight(-THREE.MathUtils.clamp(settings.transitionX, -1, 0));
                walkRightAction?.setEffectiveWeight(THREE.MathUtils.clamp(settings.transitionX, 0, 1));
                // idleAction?.setEffectiveWeight(getIdleWeight(settings.transitionX, settings.transitionY));
                walkBackAction?.setEffectiveWeight(-THREE.MathUtils.clamp(settings.transitionY, -1, 0));
                walkForwardAction?.setEffectiveWeight(THREE.MathUtils.clamp(settings.transitionY, 0, 1));

                if (isRunningRef.current) {
                    // yürüyüşü sıfırla
                    walkLeftAction?.setEffectiveWeight(0);
                    walkRightAction?.setEffectiveWeight(0);
                    walkBackAction?.setEffectiveWeight(0);
                    walkForwardAction?.setEffectiveWeight(0);
                    // idleAction?.setEffectiveWeight(0);
                    // koşu animasyonları
                    runLeftAction?.setEffectiveWeight(-THREE.MathUtils.clamp(settings.transitionX, -1, 0));
                    runRightAction?.setEffectiveWeight(THREE.MathUtils.clamp(settings.transitionX, 0, 1));
                    runBackAction?.setEffectiveWeight(-THREE.MathUtils.clamp(settings.transitionY, -1, 0));
                    runForwardAction?.setEffectiveWeight(THREE.MathUtils.clamp(settings.transitionY, 0, 1));
                } else {

                    runLeftAction?.setEffectiveWeight(0);
                    runRightAction?.setEffectiveWeight(0);
                    runBackAction?.setEffectiveWeight(0);
                    runForwardAction?.setEffectiveWeight(0);

                    // eski yürüyüş mantığınız
                    walkLeftAction?.setEffectiveWeight(-THREE.MathUtils.clamp(settings.transitionX, -1, 0));
                    walkRightAction?.setEffectiveWeight(THREE.MathUtils.clamp(settings.transitionX, 0, 1));
                    // idleAction?.setEffectiveWeight(getIdleWeight(settings.transitionX, settings.transitionY));
                    walkBackAction?.setEffectiveWeight(-THREE.MathUtils.clamp(settings.transitionY, -1, 0));
                    walkForwardAction?.setEffectiveWeight(THREE.MathUtils.clamp(settings.transitionY, 0, 1));
                }
            }

            if (isRunningRef.current) {

            } else {
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

            renderer.render(scene, camera);
            requestAnimationFrame(animate);
        };

        // 2) listener’ı ekle
        window.addEventListener('resize', onWindowResize);
        window.visualViewport?.addEventListener('resize', onWindowResize);
        window.visualViewport?.addEventListener('scroll', onWindowResize);
        // 3) ilk boyutlandırmayı da yap
        onWindowResize();
        animate();

        // Cleanup on unmount
        return () => {
            window.removeEventListener('resize', onWindowResize);
            window.visualViewport?.removeEventListener('resize', onWindowResize);
            window.visualViewport?.removeEventListener('scroll', onWindowResize);
            gui.destroy();
            //controls.dispose();
            idleActionLerp?.clear()
            idleChrouchActionLerp?.clear()
            renderer.dispose();
            if (mount) mount.innerHTML = '';
            mountRef?.current?.removeChild(renderer.domElement)
        };
    }, []);

    // disable loupe
    useEffect(() => {
        const handleTouchMove = (e) => {
            e.preventDefault();
        }

        document.addEventListener("touchstart", handleTouchMove, {
            passive: false,
        })

        // alert(JSON.stringify({
        //   dpr: window.devicePixelRatio,
        //   innerW: window.innerWidth,
        //   innerH: window.innerHeight,
        //   outerW: window.outerWidth,
        //   outerH: window.outerHeight
        // }));


        return () => {
            document.removeEventListener("touchstart", handleTouchMove)
        }
    }, [])

    // Shoot function using raycast
    const shoot = useCallback(() => {
        const scene = sceneRef.current!;
        const camera = cameraRef.current!;
        pointer.current.set(0, 0);
        raycaster.current.setFromCamera(pointer.current, camera);
        const intersects = raycaster.current.intersectObjects(scene.children, true);
        if (intersects.length > 0) {
            const hit = intersects[0];
            if (hit.object.name !== "targetObject") return;
            // istediğin yarıçap
            const radius = 5;

            // rastgele açı ve mesafe seç
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * radius;

            // yeni X,Z konumlarını hesapla
            const newX = Math.cos(angle) * distance;
            const newZ = Math.sin(angle) * distance;

            // Y eksenini yer altında kalmayacak şekilde orijinal yüksekliğe ya da 0’a sabitle
            const newY = Math.max(hit.point.y, 1);

            // taşı
            hit.object.position.set(newX, newY, newZ);
            // console.log('Ray hit object:', hit.object, 'at point', hit.point);
            // sceneRef.current?.remove(hit.object);

            // e.g. apply damage: hit.object.userData.takeDamage?.(10);
        }
    }, []);

    return <div
        // style={{ position: 'fixed', width: '100vw', height: '100vh', overflow: 'hidden' }}
        style={{
            position: 'fixed',
            /* var(--vvw) ve var(--vvh) JS’den güncellenen gerçek ölçüler */
            width: 'var(--vvw)',
            height: 'var(--vvh)',
            overflow: 'hidden'
        }}
    >
        <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
        <div
            style={{
                position: 'fixed',
                /* Görünen alanın tam ortası */
                top: '50%',
                left: '50%',
                /* Çapı, görüntü yüksekliğinin %5’i */
                width: `calc(var(--vvh) * 0.01)`,
                height: `calc(var(--vvh) * 0.01)`,
                /* Pivot’u merkeze al ve -50% kaydır */
                transform: `translate(-50%, -50%) scale(${crossSize})`,
                border: '2px solid black',
                borderRadius: '50%',
                pointerEvents: 'none',
                userSelect: 'none',
                zIndex: 10
            }}
        />
        <div style={{
            position: 'fixed',
            bottom: 'calc(var(--vvw) * 0.05 + env(safe-area-inset-bottom))',
            left: 'calc(var(--vvw) * 0.05 + env(safe-area-inset-left))',
            zIndex: 10
        }}>
            <Joystick onChange={setJoystickCoords} />
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
                touchAction: 'none'
            }}
            onPointerDown={() => {
                setIsRunning(true)
            }}
            onPointerUp={() => {
                setIsRunning(false)
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
                width: `calc(var(--vvh) * 0.12)`,
                height: `calc(var(--vvh) * 0.12)`,
                padding: 0,
                fontSize: 'calc(var(--vvh) * 0.08)',
                borderRadius: '50%',
                background: isFiring ? 'red' : "grey",
                color: 'white',
                border: 'none',
                userSelect: 'none',           // metin seçimini iptal et
                touchAction: 'none'
            }}
            onPointerDown={() => {
                setCrossize(3)
                shoot()
                fireTarget = 1;        // hedef  → 1
                setIsFiring(true);
                muzzle?.play();
            }}

            onPointerUp={() => {
                setCrossize(1)

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
                touchAction: 'none'
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
                left: `calc(var(--vvw) * 0.05 + env(safe-area-inset-left))`,
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
            }}
            onPointerUp={() => {
                window.location.reload()
            }}
        >
            ⚙
        </button>
    </div>
}
