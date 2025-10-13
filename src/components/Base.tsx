import React, { useState, useRef, useEffect } from 'react'
import * as THREE from 'three'
import { deltaTime } from './ThreeHyperCasual.tsx'
import * as utils from './Utils.tsx';
import { SceneManager } from './SceneManager.tsx';
import { PerkArea } from './PerkArea.tsx';

export class Base {
    bb8Controller: Array<utils.BB8Controller> = []
    holeLerp = new utils.LerpManager()
    bb8Prefab: THREE.Object3D
    npcPointsGroup = new THREE.Group()
    visulizeNpcPointsGroup = false
    hittablesRef: React.RefObject<THREE.Object3D<THREE.Object3DEventMap>[]>
    activeBb8Count = 0
    maxBb8Count = 1
    player: THREE.Object3D
    targetBox: THREE.Object3D
    perkBase50: PerkArea;


    setHealthPercent: React.Dispatch<React.SetStateAction<number>>

    constructor(
        scene: THREE.Scene,
        player: THREE.Object3D,
        hittablesRef: React.RefObject<THREE.Object3D<THREE.Object3DEventMap>[]>,
        { setHealthPercent }
    ) {
        this.bb8Prefab = scene.getObjectByName("Minion") as THREE.Object3D
        this.bb8Prefab.visible = false
        this.setBaseHole(scene)
        this.addNpcDebugPoints(scene, player, 8, .8);
        this.hittablesRef = hittablesRef
        this.player = player
        this.setHealthPercent = setHealthPercent

        this.targetBox = scene.getObjectByName("targetObject") as THREE.Object3D
        this.targetBox.position.x = 0
        this.targetBox.position.y = 2
        this.targetBox.position.z = 3

        this.targetBox.rotation.y = Math.PI

        const area50 = scene.getObjectByName("50CoinFloor") as THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial, THREE.Object3DEventMap>

        this.perkBase50 = new PerkArea(scene, area50,
            [
                new THREE.Vector3(-1, 0, -.15),
                new THREE.Vector3(-2.52, 0, -.15),
                new THREE.Vector3(-2.52, 0, -1.4),
                new THREE.Vector3(-1, 0, -1.4),
            ],
            player,
            50,
            1000
        );

        const vest = scene.getObjectByName("Vest") as THREE.Object3D
        vest.frustumCulled = false
        const headphone = scene.getObjectByName("Headphone") as THREE.Object3D
        headphone.frustumCulled = false
        const hat = scene.getObjectByName("Hat") as THREE.Object3D
        hat.frustumCulled = false

        setInterval(() => {
            this.pushBb8(scene)
        }, 2000);
    }

    setBaseHole(scene: THREE.Scene) {
        var obj = scene.getObjectByName("BaseHole") as THREE.Mesh
        obj.traverse(o => { if (o.isMesh && o.morphTargetInfluences) obj = o });

        this.holeLerp.setActions((x) => {
            obj.morphTargetInfluences[0] = x
        }, () => {
            return obj.morphTargetInfluences[0]
        })
        this.holeLerp.instant(1)
    }
    update(playerWorldPosition: any) {
        for (let index = 0; index < this.bb8Controller.length; index++) {
            const element = this.bb8Controller[index];
            const point = this.npcPointsGroup.children[index].worldPosition()
            element?.setTarget(point)
            element?.update(deltaTime);
        }
        this.holeLerp.update()
    }
    pushBb8(scene: THREE.Scene, delay: number = 0) {
        return new Promise((resolve, _) => {
            setTimeout(() => {
                if (this.activeBb8Count < this.maxBb8Count) {
                    var clone: THREE.Object3D | null = null;
                    var newBb8: utils.BB8Controller | null = null;

                    if (this.bb8Controller.length < this.maxBb8Count) {
                        clone = this.bb8Prefab.clone()
                        clone.visible = true
                        scene.add(clone)

                        newBb8 = new utils.BB8Controller({
                            onBoom: this.onBb8Boom,
                            prefab: this.bb8Prefab,
                            player: this.player,
                            root: clone!,
                            sphere: clone!.getObjectByName("MinionSphere") as THREE.Object3D,
                            head: clone!.getObjectByName("MinionTop") as THREE.Object3D,
                            radius: 0.257274,
                            speed: 1,
                        });
                        clone.userData.controller = newBb8
                        this.bb8Controller.push(newBb8)
                        this.hittablesRef.current.push(newBb8.sphere);
                        SceneManager.shootables.push(newBb8.sphere)
                    } else {
                        newBb8 = this.bb8Controller[0]
                        clone = newBb8.root;
                    }

                    this.activeBb8Count += 1
                    // newBb8!.isActive = false

                    // open the hole and activate bb8
                    setTimeout(() => {
                        newBb8!.pool()
                        this.holeLerp.push(0)

                        // close the hole
                        setTimeout(() => {
                            this.holeLerp.push(1)

                            resolve(null)
                        }, 1000);
                    }, 1000);
                } else {
                    resolve(null)
                }
            }, delay);
        })
    }
    addNpcDebugPoints(scene: THREE.Scene, player: THREE.Object3D, count = 8, radius = 2) {
        const worldPos = new THREE.Vector3();
        player.getWorldPosition(worldPos);


        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const x = worldPos.x + Math.cos(angle) * radius;
            const z = worldPos.z + Math.sin(angle) * radius;
            const y = worldPos.y + 1; // biraz yukarı al, gömülmesin

            if (this.visulizeNpcPointsGroup) {
                const sphereGeo = new THREE.SphereGeometry(0.1, 16, 16);
                const sphereMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
                const sphere = new THREE.Mesh(sphereGeo, sphereMat);
                sphere.position.set(x, y, z);
                this.npcPointsGroup.add(sphere);
            } else {
                const sphere = new THREE.Object3D();
                sphere.position.set(x, y, z);
                this.npcPointsGroup.add(sphere);
            }
        }
        scene.add(this.npcPointsGroup);
        player.attach(this.npcPointsGroup);
    }
    onShoot(hit: THREE.Object3D) {
        hit.parent!.userData.controller.kill()
        this.decreaseActiveBb8Count()
    }
    onBb8Boom = (bb8: utils.BB8Controller) => {
        this.decreaseActiveBb8Count()
        // health bar debug
        this.setHealthPercent(prev => {
            if (prev - SceneManager.missile!.damage <= 0) {
                window.location.reload()
                return 0
            }
            return prev - SceneManager.missile!.damage
        })
    }
    decreaseActiveBb8Count() {
        this.activeBb8Count = Math.max(this.activeBb8Count - 1, 0)
    }
}