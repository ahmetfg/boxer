// ThreeHyperCasual.js — React’siz port (orijinal “always-landscape” birebir)
// ---------------------------------------------------------------------------
// ! Dış modüller sende var: aynı import yolları korundu
// import * as THREE from 'three';
// import * as THREE from 'http://127.0.0.1:5500/boxer/node_modules/three/build/three.module.min.js';
import * as THREE from 'three';
import * as utils from './Utils.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import './Extensions.js'
import { SceneManager } from "./SceneManager.js";
import { Turret } from "./Turret.js";
import { Base } from './Base.js';
import { PerkArea } from './PerkArea.js';
import { Shield } from './Shield.js';
// import GlowEffectPure from './RayEffect.js';
// import { EmojiRain } from './EmojiEffect.js';
import Signals from './Signals.js';
import { UpdateType } from './Data.js';
import { Joystick } from './Joystick.js';
import { Player } from './Player.js';
import { UI } from './UI.js';
import { Drone } from './Drone.js';

// ---------------------------------------------------------------------------
// GLOBAL STATE (useState/useRef => düz değişken/objeye çevrildi)
// ---------------------------------------------------------------------------
const BASE =  SceneManager.PUBLIC_URL;

// let deltaTime = 0;
const isMissileClosed = false
const settings = { transitionX: 0, transitionY: 0 };
let fovController = new utils.LerpManager();

window.settings = settings
window.fovController = fovController

let scene , camera, renderer;
let mount;           // React'te mountRef.current

// const isRunningRef = { current: isRunning };
// const isChrouchingRef = { current: isChrouching };

let joystick; // aşağıda oluşturuluyor

// viewport ve orientation state’i (React useState yerine)
let windowSize = {
    width: window.visualViewport?.width ?? window.innerWidth,
    height: window.visualViewport?.height ?? window.innerHeight
};
// ---------------------------------------------------------------------------
// ORİJİNAL ALWAYS-LANDSCAPE AKIŞI (aynı isimler, aynı mantık)
// ---------------------------------------------------------------------------
const getInitialOrientation = () => {
    const isLandscape = window.matchMedia("(orientation: landscape)").matches;
    return !isLandscape;
};
let forceRotate = getInitialOrientation(); // portrait -> true

// CSS varlarını ve root transform’unu günceller
const updateViewportVars = (silent = false) => {
    if (!silent) {
        // orijinalde setWindowSize(prev=>{...}); burada direkt güncelliyoruz
        const w = window.visualViewport?.width ?? window.innerWidth;
        const h = window.visualViewport?.height ?? window.innerHeight;
        windowSize = { width: w, height: h };
    }

    const vvw = windowSize.width;
    const vvh = windowSize.height;

    // forceRotate’e göre isim swap — orijinal birebir:
    document.documentElement.style.setProperty(forceRotate ? '--vvh' : '--vvw', `${vvw}px`);
    document.documentElement.style.setProperty(forceRotate ? '--vvw' : '--vvh', `${vvh}px`);

    // Root container transform — orijinal birebir
    if (UI.root) {
        UI.root.style.transformOrigin = forceRotate ? '0% 100%' : undefined;
        UI.root.style.transform = forceRotate
            ? 'translate(0px,calc(var(--vvh)*-1)) rotate(90deg)'
            : '';
    }
}

// Kamera/renderer ölçülerini **senin formülle** güncelle
const onWindowResize = () => {
    if (!camera || !renderer) return;

    const width = forceRotate ? windowSize.height : windowSize.width;
    const height = forceRotate ? windowSize.width : windowSize.height;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height);
}

// Hepsini tek yerde yapan orijinal handler
const FixRotation = (silent = false) => {
    forceRotate = getInitialOrientation();
    joystick?.updateRotate(forceRotate)
    updateViewportVars(silent);
    onWindowResize();
}

// ---------------------------------------------------------------------------
// Player (orijinal isim/akış korunarak)
// ---------------------------------------------------------------------------
/*muzzle,*/
let turret, perkAmmo5;
// ---------------------------------------------------------------------------
// KURULUM
// ---------------------------------------------------------------------------
function init() {
    // scroll & selection lock (App.js’ten)
    const stop = (e) => e.preventDefault();
    window.addEventListener('wheel', stop, { passive: false });
    window.addEventListener('touchmove', stop, { passive: false });
    const style = document.documentElement.style;
    style.webkitUserSelect = 'none'; style.mozUserSelect = 'none'; style.msUserSelect = 'none'; style.userSelect = 'none';

    mount = document.getElementById('game') || document.body.appendChild(UI.el('div'));
    mount.innerHTML = '';

    SceneManager.playerInstance = new Player();

    const { canvasMount } = UI.buildHUD();
    document.body.appendChild(UI.root);

    // İlk ölçü/transform — orijinal akış
    FixRotation(true); // silent
    onWindowResize();

    // Scene
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(
        60,
        canvasMount.clientWidth / canvasMount.clientHeight,
        0.01, 1000
    );
    fovController.setActions(
        (nv) => { if (!isNaN(nv)) { camera.fov = nv; camera.updateProjectionMatrix(); } },
        () => camera.fov
    );
    camera.fov = 60;
    camera.rotation.set(-3, 0, Math.PI);
    camera.position.set(-1.03, 1.3, -1.2);

    renderer = new THREE.WebGLRenderer({ antialias: false });
    renderer.setClearColor(0x000000, 0);
    renderer.setSize(canvasMount.clientWidth, canvasMount.clientHeight);
    canvasMount.appendChild(renderer.domElement);

    // lights
    scene.add(new THREE.AmbientLight(0xffffff, 1.2));
    const dir = new THREE.DirectionalLight(0xffffff, 2.5); dir.position.set(0, 2, 0); scene.add(dir);

    // JOYSTICK (orientation’a duyarlı mapping)
    joystick = new Joystick({
        onChange: ({ x, y }) => {
            // settings.transitionX = forceRotate ? y : x;
            // settings.transitionY = forceRotate ? x : -y;

            // playerInstance?.moveCharacter({ x, y }, isRunning ? 4 : 1.3, deltaTime, forceRotate);
        },
        forceRotate,
    });
    Object.assign(joystick.el.style, {
        position: 'fixed',
        bottom: 'calc(var(--vvh) * 0.15)',
        left: 'calc(var(--vvw) * 0.05 + env(safe-area-inset-left))',
        zIndex: '10',
        transform: 'translateZ(0px)'
    });
    UI.root.appendChild(joystick.el);
    SceneManager.subscribeToRotation()

    // PLAYER
    SceneManager.playerInstance.awake(scene, renderer, camera, false, forceRotate);
    // playerInstance.isRunningRef = isRunningRef;
    // playerInstance.isChrouchingRef = isChrouchingRef;
    Signals.emit("onRotate", getInitialOrientation())

    SceneManager.playerInstance.initialize().then(() => {
        PlayersToBases();

        new GLTFLoader().load(`${BASE}/models/environment.glb`,
            (gltf) => {
                if (!SceneManager.playerInstance) return;
                scene.add(gltf.scene);

                SceneManager.base = new Base(scene, SceneManager.playerInstance.player, setHealthPercent);
                SceneManager.playerInstance.shield = new Shield(gltf.scene.getObjectByName("Shield") ?? scene.getObjectByName("Shield"), SceneManager.playerInstance.player);
                SceneManager.playerInstance.drone = new Drone(scene);

                SceneManager.base.onTakeCell = (basicCellValue) => {
                    UI.setAmmoPercent(Math.min(100, UI.ammoPercent + 20));
                    const v = Math.min(100, UI.nextLevelPercent + basicCellValue);
                    UI.setNextLevelPercent(v);
                    if (v === 100) onLevelUp();
                    SceneManager.numberEffectController?.Flash?.();
                };

                const ammo = gltf.scene.getObjectByName("Ammo");
                SceneManager.animationBag.register(ammo, gltf.animations.find(a => a.name === 'Ammo_Idle'));

                const area5 = gltf.scene.getObjectByName("5CoinFloor");
                perkAmmo5 = new PerkArea(
                    scene, area5,
                    [
                        new THREE.Vector3(3, 0, -.1),
                        new THREE.Vector3(1.5, 0, -.1),
                        new THREE.Vector3(1.5, 0, -1.4),
                        new THREE.Vector3(3, 0, -1.4),
                    ],
                    SceneManager.playerInstance.player, 1, 100, 2000
                );
                perkAmmo5.onActivate = () => {
                    if (ammo) ammo.visible = false;
                    UI.setAmmoPercent(100);
                    setBalance(UI.balance - perkAmmo5.cost);
                };
                perkAmmo5.onReactivate = () => { if (ammo) ammo.visible = true; };

                // turret
                turret = new Turret(
                    gltf.scene.getObjectByName("Turret"),
                    () => checkForwardRayIntersection(turret.head, SceneManager.base?.hitTable.rawTargets, 50)
                );
                turret.hide();

                const area15 = gltf.scene.getObjectByName("15CoinFloor");
                SceneManager.perkTurret15 = new PerkArea(
                    scene, area15,
                    [
                        new THREE.Vector3(-1, 0, -.15),
                        new THREE.Vector3(-2.52, 0, -.15),
                        new THREE.Vector3(-2.52, 0, -1.4),
                        new THREE.Vector3(-1, 0, -1.4),
                    ],
                    SceneManager.playerInstance.player, 0, 1000
                );
                SceneManager.perkTurret15.onActivate = () => {
                    turret.show();
                    setBalance(UI.balance - SceneManager.perkTurret15.cost);
                };
                // SceneManager.perkTurret15.activateForcefully();

                // missile
                const gravity = 2.8, desiredFlightTime = 2.5, missileDamageDistance = 2;
                const sourcePos = new THREE.Vector3(0, 0, 3.18);

                SceneManager.missile = new utils.Missile(
                    sourcePos,
                    SceneManager.playerInstance?.player?.worldPosition(),
                    desiredFlightTime, gravity, scene
                );
                SceneManager.missile.closed = isMissileClosed;
                SceneManager.missile.createTrajectoryLine(sourcePos, SceneManager.playerInstance?.player?.worldPosition(), desiredFlightTime, gravity);
                scene.add(SceneManager.missile.trajectoryLine);
                SceneManager.missile.setInterval(
                    sourcePos,
                    () => SceneManager.playerInstance?.player?.worldPosition(),
                    desiredFlightTime, gravity,
                    (lastPoint) => {
                        const dist = lastPoint.distanceTo(SceneManager.playerInstance?.player?.worldPosition());
                        if (dist <= missileDamageDistance) {
                            setHealthPercent(Math.max(0, SceneManager.healthPercent - SceneManager.missile.damage));
                        }
                    }
                );

                animate();

                // onLevelUp();
            },
            undefined,
            (err) => console.error('Error loading environment:', err)
        );

        new GLTFLoader().load(
            `${BASE}/models/base.glb`,
            gltf => {
                scene.add(gltf.scene);
                SceneManager.animationBag.register(gltf.scene, gltf.animations[0])

            },
            () => ////console.log(`Loading: ${(xhr.loaded / xhr.total * 100).toFixed(1)}%`),
                (err) => console.error('Error loading model:', err));
    }).catch(() => { });

    // listeners — orijinal akış
    window.addEventListener('resize', () => FixRotation(false));
    window.visualViewport?.addEventListener('resize', onWindowResize);
    window.visualViewport?.addEventListener('scroll', onWindowResize);

    document.addEventListener('keydown', onRunButtonDown);
    document.addEventListener('keyup', onRunButtonUp);

    setInterval(() => {
        FixRotation()
    }, 1000);
}

var playerPos = new THREE.Vector3();
function animate() {
    if (!renderer || !camera || !scene || SceneManager.pause) {
        requestAnimationFrame(animate);
        return;
    }

    const deltaTime = SceneManager.globalClock.getDelta();

    if (SceneManager.playerInstance?.player) {
        const worldTarget = new THREE.Vector3();
        SceneManager.playerInstance.aimTarget.getWorldPosition(worldTarget);
        utils.lookAtYawOnly(SceneManager.playerInstance.player, worldTarget);

        SceneManager.playerInstance.player.getWorldPosition(playerPos);
        SceneManager.perkTurret15?.update(UI.balance);
        perkAmmo5?.update(UI.balance);
        SceneManager.playerInstance.shield?.update?.(deltaTime);
        SceneManager.playerInstance.drone?.update?.(playerPos);

        settings.transitionX = forceRotate ? joystick.lastValues.y : joystick.lastValues.x;
        settings.transitionY = forceRotate ? joystick.lastValues.x : -joystick.lastValues.y;

        SceneManager.playerInstance?.moveCharacter(joystick.lastValues, SceneManager.playerInstance.isRunning ? 4 : 1.3, deltaTime, forceRotate);
    }

    SceneManager.playerInstance?.onAnimate(deltaTime);
    fovController.update?.();
    turret?.update?.();
    turret.visulize(scene)

    UI.damage.textContent = UI.damageText

    SceneManager.missile?.update(deltaTime);
    SceneManager.base?.update(deltaTime);
    SceneManager.animationBag.update(deltaTime);

    renderer.render(scene, camera);
    requestAnimationFrame(animate);

    // UI.drawcalls.textContent = renderer.info.render.calls.toString()
    // UI.drawcalls.textContent = (SceneManager.base?.cells.length ?? 0).toString()
    // UI.drawcalls.textContent = (SceneManager.base?.totalFrameBeforeEnemyPush ?? 0).toString()
    UI.drawcalls.textContent = (SceneManager.base?.activeBb8Count ?? 0).toString()
    // drawcalls.textContent = renderer.info.memory.geometries
    // drawcalls.textContent = renderer.info.memory.textures
}

// ---------------------------------------------------------------------------
// yardımcı state setter’lar
function onRunButtonUp(e) {
    if (e.key && (e.key !== "Shift" || e.repeat)) return
    UI.setIsRunning(false)
    fovController.push(60, .05);
}; UI.onRunClickedUp = onRunButtonUp

function onRunButtonDown(e) {
    if (e.key && (e.key !== "Shift" || e.repeat)) return
    UI.setIsRunning(true)
    fovController.push(75, .05);
}; UI.onRunClickedDown = onRunButtonDown

function PlayersToBases() { SceneManager.playerInstance?.player?.position.set(0, 0, -3); }
function setBalance(v) { UI.balance = v; UI.setDashboardBalance(); }
function setHealthPercent(v) {
    SceneManager.healthPercent = v;
    const fill = UI.healthBarBtn?.firstElementChild; if (fill) fill.style.width = `${SceneManager.healthPercent}%`;
    if (SceneManager.healthPercent <= 0) Reset();
}

function Reset() {
    SceneManager.base?.Reset?.();
    SceneManager.globalClock.start()
    UI.setAmmoPercent(100);
    setHealthPercent(100);
    UI.setNextLevelPercent(0);
    UI.setLevel(1);
    setBalance(0);
    PlayersToBases();
    turret.hide()
    SceneManager.playerInstance?.shield?.setActive?.(false);
    SceneManager.playerInstance?.drone?.setActive?.(false);
}
function onLevelUp() {
    pause();
    showMenu(true);
}
function play() {
    SceneManager.pause = false;
    if (!SceneManager.missile.closed) {
        SceneManager.missile.isActive = true
    }
    SceneManager.globalClock.start()
}
function pause() {
    SceneManager.pause = true;
    SceneManager.missile.isActive = false
    SceneManager.globalClock.stop()
}
function showMenu(v) {
    if (v == true) {
        UI.showNewLevelUpMenu()
    } else {
        UI.hideNewLevelUpMenu()
    }
}
// ---------------------------------------------------------------------------
// SHOOT / RAYCAST
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2(0, 0);
function onShoot() { UI.setAmmoPercent(Math.max(0, UI.ammoPercent - SceneManager.ammoFactor)); }
function shoot() {
    onShoot();
    pointer.set(0, 0); raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(SceneManager.base.hitTable.rawTargets, false);
    if (hits.length > 0) onShootTarget(hits);
}

UI.onShootClickedDown = shoot

function checkForwardRayIntersection(sourceObject, targets, maxDistance = Infinity) {
    const rc = new THREE.Raycaster();
    const origin = sourceObject?.worldPosition();
    const direction = new THREE.Vector3(0, 0, 1).applyQuaternion(sourceObject.worldQuaternion()).normalize();
    rc.set(origin, direction); rc.far = maxDistance;
    const hits = rc.intersectObjects(targets, true);
    if (hits.length > 0) {
        onShootTarget(hits);
        return true;
    }
    return false;
}

function onShootTarget(intersects = null) {
    if (!intersects) return;
    const hit = intersects[0]?.object;

    if (hit?.name?.includes("Minion")) {
        // if (hit.parent?.visible) {
        SceneManager.base?.onShoot?.(hit);
        // }
    } else {
        const newX = utils.getRandomFloat(-2, 2);
        const newY = utils.getRandomFloat(0.5, 3);
        SceneManager.base.targetBox.position.set(newX, newY, SceneManager.base.targetBox.position.z);
        setBalance(UI.balance + 1);
    }
}

UI.onLevelUpdateSelected = (data) => {
    UI.setLevel(UI.level + 1)
    switch (data.type) {
        case UpdateType.donut:
            SceneManager.playerInstance?.shield.setActive(true);
            break;
        case UpdateType.ammoCapacity:
            SceneManager.ammoFactor *= .9
            break;
        case UpdateType.magnetTreshold:
            SceneManager.magnetTreshold *= 1.1
            break;
        case UpdateType.cap:
            SceneManager.base.hat.visible = true
            break;
        case UpdateType.headset:
            SceneManager.base.headset.visible = true
            break;
        case UpdateType.vest:
            SceneManager.base.vest.visible = true
            break;
        case UpdateType.alien:
            SceneManager.playerInstance?.drone.setActive(true)
            break;
        default:
            break;
    }

    // SceneManager.basicCellValue = SceneManager.cellValue(UI.level, SceneManager.basicCellValue, 1)
    SceneManager.basicCellValue *= .9

    showMenu(false)
    UI.setNextLevelPercent(0)
    play()
}
// ---------------------------------------------------------------------------
// BOOT
window.addEventListener('load', () => { init(); });
