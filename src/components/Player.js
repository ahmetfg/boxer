import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { SceneManager } from "./SceneManager.js";
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import * as utils from "./Utils.js";

export class Player {
    shield;
    drone;
    muzzle;
    isRunning = false;
    isFiring = false;
    isChrouching = false;
    fireTarget = 0
    fireWeight = 0

    constructor() { }

    awake(scene, renderer, camera, puppet = false, _forceRotate = false, _onRotateCb = null) {
        this.scene = scene; this.renderer = renderer; this.camera = camera; this.puppet = puppet;
        this.initBegin = false; this.didInit = false;

        if (!puppet) {
            this.aimSphere = utils.initThreeJsSceneAndSphere({
                _scene: this.scene,
                _renderer: this.renderer,
                rotationSpeed: 0.004,
                sphereColor: 0xffffff00,
                wireframe: false,
                forceRotate: _forceRotate,
            });
            this.aimTarget = utils.AddSphere(this.aimSphere, .1, 0xffffff00);
            this.aimTarget.position.z = 10;
        } else {
            this.aimTarget = utils.AddSphere(this.scene, .1, 0xffffff00);
            this.aimTarget.position.z = 10;
        }

        this.rifleOffset = new THREE.Vector3(26.76, 110.1, 13.96);
        this.riflePositionOffset = new THREE.Vector3(3.59, 7.86, 3.23);
        this.aimSpineOffset = new THREE.Vector3(0, -48, 0);

        this.idleActionLerp = new utils.LerpManager();
        this.idleChrouchActionLerp = new utils.LerpManager();
    }

    initialize() {
        return new Promise((resolve, reject) => {
            if (this.initBegin) { reject(null); return; }
            this.initBegin = true;

            new GLTFLoader().load(`${SceneManager.PUBLIC_URL}/models/aimDummy.glb`,
                (gltf) => {
                    const model = SkeletonUtils.clone(gltf.scene);
                    this.scene.add(model);

                    this.mixer = new THREE.AnimationMixer(model);
                    this.idleAction = this.mixer.clipAction(gltf.animations.find(a => a.name === 'Idle'));
                    this.idleFireAction = this.mixer.clipAction(gltf.animations.find(a => a.name === 'IdleFire'));
                    this.idleChrouchAction = this.mixer.clipAction(gltf.animations.find(a => a.name === 'IdleCrouch'));

                    const idleFireUpperClip = utils.clipOnlyUpperBody(this.idleFireAction.getClip());
                    const idleFireUpperAction = this.mixer.clipAction(idleFireUpperClip);
                    idleFireUpperAction.setEffectiveWeight(0);
                    idleFireUpperAction.play();
                    this.idleFireAction = idleFireUpperAction;

                    this.walkBackAction = this.mixer.clipAction(gltf.animations.find(a => a.name === 'WalkBack'));
                    this.walkForwardAction = this.mixer.clipAction(gltf.animations.find(a => a.name === 'WalkForward'));
                    this.walkLeftAction = this.mixer.clipAction(gltf.animations.find(a => a.name === 'WalkLeft'));
                    this.walkRightAction = this.mixer.clipAction(gltf.animations.find(a => a.name === 'WalkRight'));
                    this.runBackAction = this.mixer.clipAction(gltf.animations.find(a => a.name === 'RunBack'));
                    this.runForwardAction = this.mixer.clipAction(gltf.animations.find(a => a.name === 'RunForward'));
                    this.runLeftAction = this.mixer.clipAction(gltf.animations.find(a => a.name === 'RunLeft'));
                    this.runRightAction = this.mixer.clipAction(gltf.animations.find(a => a.name === 'RunRight'));
                    this.chrouchBackAction = this.mixer.clipAction(gltf.animations.find(a => a.name === 'BackCrouch'));
                    this.chrouchForwardAction = this.mixer.clipAction(gltf.animations.find(a => a.name === 'ForwardCrouch'));
                    this.chrouchLeftAction = this.mixer.clipAction(gltf.animations.find(a => a.name === 'LeftCrouch'));
                    this.chrouchRightAction = this.mixer.clipAction(gltf.animations.find(a => a.name === 'RightCrouch'));

                    [
                        this.idleAction, this.idleFireAction, this.idleChrouchAction,
                        this.walkBackAction, this.walkForwardAction, this.walkLeftAction, this.walkRightAction,
                        this.runBackAction, this.runForwardAction, this.runLeftAction, this.runRightAction,
                        this.chrouchBackAction, this.chrouchForwardAction, this.chrouchLeftAction, this.chrouchRightAction
                    ].forEach(a => a?.setEffectiveWeight(0));

                    this.idleFireAction.setEffectiveTimeScale(2);
                    this.walkForwardAction.setEffectiveTimeScale(1.5);
                    this.walkBackAction.setEffectiveTimeScale(1.5);
                    this.runForwardAction.setEffectiveTimeScale(.9);
                    this.runRightAction.setEffectiveTimeScale(.6);
                    this.runLeftAction.setEffectiveTimeScale(.8);

                    this.idleAction.play(); this.idleFireAction.play(); this.idleChrouchAction.play();
                    this.walkBackAction.play(); this.walkForwardAction.play(); this.walkLeftAction.play(); this.walkRightAction.play();
                    this.runBackAction.play(); this.runForwardAction.play(); this.runLeftAction.play(); this.runRightAction.play();
                    this.chrouchBackAction.play(); this.chrouchForwardAction.play(); this.chrouchLeftAction.play(); this.chrouchRightAction.play();

                    this.idleActionLerp.setActions((x) => this.idleAction.setEffectiveWeight(x), () => this.idleAction.getEffectiveWeight());
                    this.idleChrouchActionLerp.setActions((x) => this.idleChrouchAction.setEffectiveWeight(x), () => this.idleChrouchAction.getEffectiveWeight());

                    this.rifle = model.getObjectByName('Rifle');
                    this.rightHand = model.getObjectByName('mixamorigRightHand');
                    this.spine = model.getObjectByName('mixamorigSpine');
                    this.hips = model.getObjectByName('mixamorigHips');
                    this.player = model.getObjectByName('Right');
                    this.playerSurface = model.getObjectByName('Alpha_Surface');
                    this.vestAttachOne = model.getObjectByName('Bone');

                    this.muzzle = new utils.MuzzleFlashAnimator(this.rifle, [
                        `${SceneManager.PUBLIC_URL}/textures/shoot1.png`,
                        `${SceneManager.PUBLIC_URL}/textures/shoot2.png`,
                        `${SceneManager.PUBLIC_URL}/textures/shoot3.png`,
                        `${SceneManager.PUBLIC_URL}/textures/shoot4.png`,
                        `${SceneManager.PUBLIC_URL}/textures/shoot5.png`,
                    ], 50, true, true);


                    this.aimSphere.attach(this.camera);
                    this.camera.position.x -= .2;
                    this.camera.position.y += .1;

                    this.rightHand.attach(this.rifle);

                    this.spineController = new utils.SpineAimController({
                        spineBone: this.spine,
                        rifle: this.rifle,
                        rifleRotationTarget: this.rightHand,
                        target: this.aimTarget,
                        offset: this.aimSpineOffset,
                        rifleOffset: this.rifleOffset,
                    });

                    this.leftArmIK = new utils.FabrikLeftArm(
                        {
                            shoulder: model.getObjectByName('mixamorigLeftArm'),
                            elbow: model.getObjectByName('mixamorigLeftForeArm'),
                            wrist: model.getObjectByName('mixamorigLeftHand'),
                        },
                        this.rifle.getObjectByName('ForeGripTarget'), 2
                    );

                    SceneManager.instance.register(this.scene, this.renderer, [this.mixer]);

                    this.didInit = true;
                    resolve(null);
                },
                undefined,
                (err) => { console.error('Error loading model:', err); reject(err); }
            );
        });
    }

    moveCharacter(joy, baseMoveSpeed, dt, forceRotateFlag) {
        const { x, y } = joy;
        const mag = Math.hypot(x, y); if (mag === 0 || !this.player) return;

        const forward = new THREE.Vector3(0, 1, 0).applyQuaternion(this.player.quaternion).normalize();
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.player.quaternion).normalize();

        const moveVec = forward.multiplyScalar(forceRotateFlag ? x : -y)
            .add(right.multiplyScalar(forceRotateFlag ? -y : -x))
            .normalize();
        this.player.position.addScaledVector(moveVec, baseMoveSpeed * mag * dt);
    }

    getIdleWeight(x, y) {
        const maxD = 1.0; const dist = Math.sqrt(x * x + y * y);
        const norm = THREE.MathUtils.clamp(dist / maxD, 0, 1);
        return THREE.MathUtils.clamp(1.0 - norm, 0, 1);
    }

    onAnimate(dt) {
        this.mixer?.update(dt);

        if (this.rifle && this.rightHand) {
            this.rifle.position.copy(this.riflePositionOffset);
            this.rifle.rotation.set(this.rifleOffset.x, this.rifleOffset.y, this.rifleOffset.z);
            this.player.getWorldPosition?.(this.aimSphere?.position);
        }

        this.idleActionLerp?.push(this.getIdleWeight(window.settings.transitionX, window.settings.transitionY), 1);

        if (this.isChrouching) {
            this.walkLeftAction?.setEffectiveWeight(0);
            this.walkRightAction?.setEffectiveWeight(0);
            this.walkBackAction?.setEffectiveWeight(0);
            this.walkForwardAction?.setEffectiveWeight(0);
            this.idleActionLerp?.push(0);

            this.chrouchLeftAction?.setEffectiveWeight(-THREE.MathUtils.clamp(window.settings.transitionX, -1, 0));
            this.chrouchRightAction?.setEffectiveWeight(THREE.MathUtils.clamp(window.settings.transitionX, 0, 1));
            this.chrouchBackAction?.setEffectiveWeight(-THREE.MathUtils.clamp(window.settings.transitionY, -1, 0));
            this.chrouchForwardAction?.setEffectiveWeight(THREE.MathUtils.clamp(window.settings.transitionY, 0, 1));
            this.idleChrouchActionLerp?.push(this.getIdleWeight(window.settings.transitionX, window.settings.transitionY), 1);
            this.aimSpineOffset.x = 10;
        } else {
            this.aimSpineOffset.x = -4;

            this.chrouchLeftAction?.setEffectiveWeight(0);
            this.chrouchRightAction?.setEffectiveWeight(0);
            this.chrouchBackAction?.setEffectiveWeight(0);
            this.chrouchForwardAction?.setEffectiveWeight(0);
            this.idleChrouchActionLerp?.push(0);

            this.walkLeftAction?.setEffectiveWeight(-THREE.MathUtils.clamp(window.settings.transitionX, -1, 0));
            this.walkRightAction?.setEffectiveWeight(THREE.MathUtils.clamp(window.settings.transitionX, 0, 1));
            this.walkBackAction?.setEffectiveWeight(-THREE.MathUtils.clamp(window.settings.transitionY, -1, 0));
            this.walkForwardAction?.setEffectiveWeight(THREE.MathUtils.clamp(window.settings.transitionY, 0, 1));

            if (this.isRunning) {
                this.walkLeftAction?.setEffectiveWeight(0);
                this.walkRightAction?.setEffectiveWeight(0);
                this.walkBackAction?.setEffectiveWeight(0);
                this.walkForwardAction?.setEffectiveWeight(0);

                this.runLeftAction?.setEffectiveWeight(-THREE.MathUtils.clamp(window.settings.transitionX, -1, 0));
                this.runRightAction?.setEffectiveWeight(THREE.MathUtils.clamp(window.settings.transitionX, 0, 1));
                this.runBackAction?.setEffectiveWeight(-THREE.MathUtils.clamp(window.settings.transitionY, -1, 0));
                this.runForwardAction?.setEffectiveWeight(THREE.MathUtils.clamp(window.settings.transitionY, 0, 1));
            } else {
                this.runLeftAction?.setEffectiveWeight(0);
                this.runRightAction?.setEffectiveWeight(0);
                this.runBackAction?.setEffectiveWeight(0);
                this.runForwardAction?.setEffectiveWeight(0);

                this.walkLeftAction?.setEffectiveWeight(-THREE.MathUtils.clamp(window.settings.transitionX, -1, 0));
                this.walkRightAction?.setEffectiveWeight(THREE.MathUtils.clamp(window.settings.transitionX, 0, 1));
                this.walkBackAction?.setEffectiveWeight(-THREE.MathUtils.clamp(window.settings.transitionY, -1, 0));
                this.walkForwardAction?.setEffectiveWeight(THREE.MathUtils.clamp(window.settings.transitionY, 0, 1));
            }
        }

        if (!this.isRunning && !this.puppet) {
            this.spineController?.update();
        }

        if (this.idleFireAction) {
            this.fireWeight = THREE.MathUtils.lerp(this.fireWeight, this.fireTarget, dt * 20);
            this.idleFireAction.setEffectiveWeight(this.fireWeight);
        }

        this.leftArmIK?.update();
        this.idleActionLerp?.update();
        this.idleChrouchActionLerp?.update();
    }

    onClear(before = null, after = null) {
        this.idleActionLerp?.clear();
        this.idleChrouchActionLerp?.clear();
        if (before) before();
        setTimeout(() => {
            SceneManager.instance.disposeAllExceptLast();
            if (after) after();
        }, 3000);
    }
}