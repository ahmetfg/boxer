// import * as THREE from '../../node_modules/three/build/three.module.js';
import * as THREE from 'three';

import * as utils from './Utils.js';
import './Extensions.js'
import { SceneManager } from './SceneManager.js';

const BASE = SceneManager.PUBLIC_URL;  // → "/boxer"

export class Turret {
    lastTarget
    head
    neck
    legs
    headHorizontalLerp
    neckHorizontalLerp
    turretMuzzle
    rayVisualizer
    headSpeed = 0.005 * 3
    neckSpeed = 0.007 * 3
    isActive = false
    // visulize = () => { }

    constructor(parent, check) {
        this.head = parent.getObjectByName("Head")
        this.neck = parent.getObjectByName("Neck")
        this.legs = parent.getObjectByName("Legs")
        this.headHorizontalLerp = new utils.LerpManager()
        this.neckHorizontalLerp = new utils.LerpManager()

        this.headHorizontalLerp.setActions(
            (x) => this.head.rotation.x = x,
            () => this.head.rotation.x
        )

        this.neckHorizontalLerp.setActions(
            (y) => this.neck.rotation.y = y,
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
            if (!this.isActive) return

            flag = !flag
            if (flag && SceneManager.perkTurret15?.isActive) {
                this.turretMuzzle.play()
                check()
            } else {
                this.turretMuzzle.stop()
            }

            this.findTarget(false, "regular check")
        }, 300);
    }

    selectTarget() {
        const index = Math.floor(Math.random() * SceneManager.base.hitTable.length)
        this.lastTarget = SceneManager.base.hitTable.targets[index]

        // pass if its a target box
        if (!this.lastTarget.controller && SceneManager.base.hitTable.length > 1) {
            this.selectTarget()
        }
    }

    findTarget(force = false, reason = "") {
        if (!this.isActive) return

        if (force) {
            this.selectTarget()
            return
        }

        if (this.lastTarget != undefined) {
            if (this.lastTarget.alive == false) {
                this.selectTarget()
                return
            }

            if (this.lastTarget.controller != undefined && this.lastTarget.controller.isActive == false) {
                // console.log("reason:", reason, `controller.isActive=[${this.lastTarget!.controller!.isActive}]`)
                this.selectTarget()
                return
            }
            // console.log("is alive", this.lastTarget.alive, "have controller", this.lastTarget.controller != undefined,
            //     `controller.isActive=[${this.lastTarget?.controller?.isActive}]`)
        } else {
            // console.log(SceneManager.base!.hitTable)
            this.selectTarget()
            return
        }
    }

    visulize = (scene) => {
        if (!this.isActive) return

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
        if (!this.isActive) return
        this.headHorizontalLerp.updateLineer()
        this.neckHorizontalLerp.updateLineer()
        // this.visulize()
        if (this.lastTarget) {
            this.setNewDynamicTarget(this.lastTarget.object)
        }
    }

    setNewTarget(target) {
        if (!this.isActive) return
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

    setNewDynamicTarget(target) {
        if (!this.isActive) return

        const neckOld = this.neck.quaternion.clone()
        const headOld = this.head.quaternion.clone()
        utils.aimYaw(this.neck, this.lastTarget?.object.worldPosition())
        this.head.lookAt(this.lastTarget?.object.worldPosition())

        this.headHorizontalLerp.push(this.head.rotation.x, this.headSpeed)
        this.neckHorizontalLerp.push(this.neck.rotation.y, this.neckSpeed)

        this.neck.setRotationFromQuaternion(neckOld)
        this.head.setRotationFromQuaternion(headOld)
    }

    hide() {
        this.isActive = false
        this.head.visible = false
        this.neck.visible = false
        this.legs.visible = false
    }

    show() {
        this.isActive = true
        this.head.visible = true
        this.neck.visible = true
        this.legs.visible = true

    }
}