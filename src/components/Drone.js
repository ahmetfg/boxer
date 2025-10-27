import { SceneManager } from "./SceneManager.js";
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class Drone {
    isActive = false
    droneParent
    droneBody
    droneWings
    accessoryModel
    accessoryPoint
    droneWorldPos = new THREE.Vector3()
    // accesoryWorldPos = new THREE.Vector3()

    constructor(scene, comp) {
        new GLTFLoader().load(`${SceneManager.PUBLIC_URL}/models/drone.glb`,
            gltf => {
                this.droneParent = gltf.scene.getObjectByName("DroneParent")
                this.droneBody = gltf.scene.getObjectByName("DroneBody")
                this.droneWings = gltf.scene.getObjectByName("DroneWings")
                this.accessoryModel = scene.getObjectByName("Alien")
                this.accessoryPoint = scene.getObjectByName("GunAccesoryTarget")
                scene.add(this.droneParent);

                SceneManager.animationBag.register(this.droneParent, gltf.animations[0])
                SceneManager.animationBag.register(this.droneParent, gltf.animations[1])
                SceneManager.animationBag.register(this.droneParent, gltf.animations[2])
                
                this.setActive(this.isActive);

                setInterval(() => {
                    this.constrainToWorldDown(this.accessoryModel)
                }, 300);

                comp?.()
            },
            () => (err) => console.error('Error loading model:', err));
    }
    // Dünya uzayındaki vektörler
    _worldDown = new THREE.Vector3(0, 0, -1);   // Yerçekimi yönü
    _localNegativeZ = new THREE.Vector3(0, 0, -1); // Objenizin yerel -Z ekseni

    _parentWorldQuaternion = new THREE.Quaternion();
    _targetQuaternion = new THREE.Quaternion();

    constrainToWorldDown(childObject) {
        // A. Ebeveynin Dünya Rotasyonunu Al (VARSAYIM: ParentObject'in matrixWorld'ü güncel)
        // Eğer parentObject'i her döngüde hareket ettiriyorsanız, bunu yapmadan önce:
        // parentObject.updateWorldMatrix(true, false); // Veya renderer.render() öncesinde çalışıyorsa zaten günceldir.
        if (childObject.parent) {
            childObject.parent.getWorldQuaternion(this._parentWorldQuaternion);
        } else {
            // Obje scene'e doğrudan ekliyse, rotasyon zaten dünya rotasyonuyla aynıdır.
            this._parentWorldQuaternion.set(0, 0, 0, 1); // Identity (sıfır rotasyon)
        }

        // B. Dünya Aşağısına Bakacak Rotasyonu Hesapla
        // Objenin _localNegativeZ eksenini _worldDown'a hizalayacak rotasyonu bul.
        this._targetQuaternion.setFromUnitVectors(this._localNegativeZ, this._worldDown);

        // C. Ebeveyn Rotasyonunun Tersi ile Çarp
        // Objenin Yerel Rotasyonu = (Dünya Hedef Rotasyon) * (Ebeveynin Dünya Rotasyonunun Tersi)
        // Bu, objenin dünya rotasyonunun _targetQuaternion olmasını garanti ederken, 
        // ebeveynin rotasyonunu "iptal eder" ve objenin yerel quaternion'ına yazar.

        // Ebeveyn quaternion'ını tersine çevirip (invert) _targetQuaternion ile çarp (premultiply).
        this._targetQuaternion.premultiply(this._parentWorldQuaternion.invert());

        // D. Objenin Yerel Rotasyonunu Ayarla
        childObject.quaternion.copy(this._targetQuaternion);
    }

    update(playerPos) {
        if (!SceneManager.base) return
        if (!this.droneParent) return

        if (this.isActive) {
            this.droneBody?.getWorldPosition(this.droneWorldPos)
            // this.accessoryPoint?.getWorldPosition(this.accesoryWorldPos)
            // shield logic
            if (SceneManager.base.hitTable.length > 0) {
                for (let index = 0; index < SceneManager.base.bb8Controller.length; index++) {
                    const enemy = SceneManager.base.bb8Controller[index];
                    if (enemy.isActive) {
                        const distance = enemy.root.position.distanceTo(this.droneWorldPos)
                        if (distance <= 1) {
                            SceneManager.base.onDroneHit(enemy)
                        }
                    }
                }
            }

            // attach and animation
            this.droneParent.setPosition(playerPos)
        }
    }

    setActive(value) {
        this.isActive = value
        this.droneBody.visible = value
        this.droneWings.visible = value
        this.accessoryModel.visible = value
    }
}