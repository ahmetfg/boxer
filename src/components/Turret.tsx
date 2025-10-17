import * as THREE from 'three';
import * as utils from './Utils.tsx';
import './Extensions.tsx'
import { SceneManager } from './SceneManager.tsx';
const BASE = process.env.PUBLIC_URL;  // → "/boxer"

export class Turret {
    lastTarget: THREE.Object3D | undefined;
    head: THREE.Object3D;
    neck: THREE.Object3D;
    legs: THREE.Object3D;
    headHorizontalLerp: utils.LerpManager;
    neckHorizontalLerp: utils.LerpManager;
    turretMuzzle: utils.MuzzleFlashAnimator
    rayVisualizer: THREE.ArrowHelper | undefined;

    // visulize = () => { }

    constructor(parent: THREE.Object3D, check: () => boolean) {
        this.head = parent.getObjectByName("Head") as THREE.Object3D
        this.neck = parent.getObjectByName("Neck") as THREE.Object3D
        this.legs = parent.getObjectByName("Legs") as THREE.Object3D
        this.headHorizontalLerp = new utils.LerpManager()
        this.neckHorizontalLerp = new utils.LerpManager()

        this.headHorizontalLerp.setActions(
            (x: number) => this.head.rotation.x = x,
            () => this.head.rotation.x
        )

        this.neckHorizontalLerp.setActions(
            (y: number) => this.neck.rotation.y = y,
            () => this.neck.rotation.y
        )

        this.turretMuzzle = new utils.MuzzleFlashAnimator(this.head, [
            `${BASE}/textures/shoot1.png`,
            `${BASE}/textures/shoot2.png`,
            `${BASE}/textures/shoot3.png`,
            `${BASE}/textures/shoot4.png`,
            `${BASE}/textures/shoot5.png`,
        ], 50, true, true, new THREE.Vector3(0.06, 0, 0.28));
        var flag = false
        setInterval(() => {
            flag = !flag
            if (flag && SceneManager.perkTurret15?.isActive) {
                this.turretMuzzle.play()
                check()
            } else {
                this.turretMuzzle.stop()
            }

            this.findTarget()
        }, 300);
    }

    findTarget(force: boolean = false) {
        if (force || !this.lastTarget) {
            this.lastTarget = SceneManager.base?.hittablesRef.current[Math.floor(Math.random() * SceneManager.base?.hittablesRef.current.length)];
            if (!this.lastTarget?.visible) {
                this.findTarget(true)
            }
            if (this.lastTarget?.parent?.userData.controller) {
                // console.log(this.lastTarget.parent.userData.controller.lifeTime)

                // find another target
                if (this.lastTarget.parent.userData.controller.lifeTime <= 100) {
                    this.findTarget(true)
                }
            }
        }
    }


    visulize = (scene: THREE.Scene) => {
        // 1. Önceki görselleştirmeyi sahneden kaldır
        if (this.rayVisualizer) {
            scene.remove(this.rayVisualizer);
            this.rayVisualizer.dispose(); // Bellek temizliği
        }

        // Vektörlerin hesaplanması
        const origin = this.head?.worldPosition();

        const direction = new THREE.Vector3(0, 0, 1); // Varsayılan: Lokal -Z (Objenin önü)
        direction.applyQuaternion(this.head.worldQuaternion()).normalize(); // Yönü objenin rotasyonuna göre ayarla

        // 2. Işının rengini belirle (Kesişim varsa kırmızı, yoksa yeşil)
        const rayColor = 0xff0000;

        // 3. Okun uzunluğunu belirle
        // Kesişim varsa o mesafeye kadar, yoksa maxDistance kadar uzat.
        const arrowLength = 50;

        // 4. ArrowHelper'ı oluştur
        this.rayVisualizer = new THREE.ArrowHelper(
            direction, // Yön vektörü
            origin,    // Başlangıç noktası
            arrowLength,
            rayColor,
            0.5, // Ok başı (head) uzunluğu
            0.2  // Ok başı (head) kalınlığı
        );

        // 5. ArrowHelper'ı sahneye ekle
        scene.add(this.rayVisualizer);
    }

    update() {
        this.headHorizontalLerp.updateLineer()
        this.neckHorizontalLerp.updateLineer()
        // this.visulize()
        if (this.lastTarget) {
            this.setNewDynamicTarget(this.lastTarget)
        }
    }

    setNewTarget(target: any) {
        // const neckOld = this.neck.quaternion.clone()
        // const headOld = this.head.quaternion.clone()
        // utils.lookAtYewOnly(this.neck, target.position, (rot: number, object: any) => {
        //     object.rotation.y = rot
        // })
        // this.head.lookAt(target.position)
        this.neck.lookAt(target.position)

        // this.headHorizontalLerp.push(this.head.rotation.x, 0.01)
        // this.neckHorizontalLerp.push(this.neck.rotation.y, 0.01)

        // this.neck.setRotationFromQuaternion(neckOld)
        // this.head.setRotationFromQuaternion(headOld)
    }

    setNewDynamicTarget(target: any) {

        const neckOld = this.neck.quaternion.clone()
        const headOld = this.head.quaternion.clone()
        utils.aimYaw(this.neck, this.lastTarget?.worldPosition())
        this.head.lookAt(this.lastTarget?.worldPosition())

        this.headHorizontalLerp.push(this.head.rotation.x, 0.005)
        this.neckHorizontalLerp.push(this.neck.rotation.y, 0.007)

        this.neck.setRotationFromQuaternion(neckOld)
        this.head.setRotationFromQuaternion(headOld)
    }

    hide() {
        this.head.visible = false
        this.neck.visible = false
        this.legs.visible = false
    }

    show() {
        this.head.visible = true
        this.neck.visible = true
        this.legs.visible = true
    }
}