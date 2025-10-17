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
    maxBb8Count = 20
    player: THREE.Object3D
    targetBox: THREE.Object3D
    perkBase50: PerkArea;
    enemies: Array<THREE.Object3D> = []
    cells: Array<THREE.Object3D> = []
    currentPoolIndex = 0

    posWorld = new THREE.Vector3()
    tempPos = new THREE.Vector3();
    vest;
    torus;

    lerpX = new utils.LerpManager();
    lerpY = new utils.LerpManager();
    lerpZ = new utils.LerpManager();

    cellPrefab: THREE.Object3D;
    scene: THREE.Scene;

    setHealthPercent: React.Dispatch<React.SetStateAction<number>>
    onTakeCell = () => { }
    vestHandleOne: THREE.Object3D<THREE.Object3DEventMap>;

    constructor(
        scene: THREE.Scene,
        player: THREE.Object3D,
        hittablesRef: React.RefObject<THREE.Object3D<THREE.Object3DEventMap>[]>,
        { setHealthPercent }
    ) {
        this.scene = scene
        this.bb8Prefab = scene.getObjectByName("Minion") as THREE.Object3D
        this.bb8Prefab.visible = false
        this.setBaseHole(scene)
        this.addNpcDebugPoints(scene, player, this.maxBb8Count + 1, .8);
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

        this.vest = scene.getObjectByName("Vest") as THREE.SkinnedMesh
        this.vest.frustumCulled = false
        const headphone = scene.getObjectByName("Headphone") as THREE.Object3D
        headphone.frustumCulled = false
        const hat = scene.getObjectByName("Hat") as THREE.Object3D
        hat.frustumCulled = false

        this.torus = scene.getObjectByName("Torus") as THREE.Object3D
        // this.vestHandleOne = scene.getObjectByName("VestHandleOne") as THREE.Object3D
        // this.vestHandleOne.attach(this.torus)
        // this.torus.setPosition(new THREE.Vector3(1,1,1))

        // var vertex = new THREE.Vector3();
        // this.vest.getVertexPosition(297, vertex);
        // vertex = this.vest.localToWorld(vertex);
        // this.torus.setPosition(vertex)
        const vestAttachOne = scene.getObjectByName("Bone") as THREE.Object3D;
        vestAttachOne.attach(this.torus)
        this.torus.setPosition(new THREE.Vector3())

        this.lerpX.setActions(
            (x: number) => this.torus.position.x = x,
            () => this.torus.position.x
        )
        this.lerpY.setActions(
            (y: number) => this.torus.position.y = y,
            () => this.torus.position.y
        )
        this.lerpZ.setActions(
            (z: number) => this.torus.position.z = z,
            () => this.torus.position.z
        )

        this.cellPrefab = scene.getObjectByName("Cell") as THREE.Object3D
        this.cellPrefab.visible = false

        setInterval(() => {
            this.pushBb8(scene)
            // }, 100);
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

    getNextPoolIndex(): number {
        this.currentPoolIndex++
        if (this.currentPoolIndex >= this.maxBb8Count) {
            this.currentPoolIndex = 0
        }
        return this.currentPoolIndex
    }

    update = () => {
        // this.torus.setPosition(this.vestHandleOne.worldPosition())

        for (let index = 0; index < this.bb8Controller.length; index++) {
            const element = this.bb8Controller[index];
            // element?.setTarget(this.player.worldPosition())
            // try {
            //     const point = this.npcPointsGroup.children[this.activeBb8Count-1].worldPosition()
            //     element?.setTarget(point)
            // } catch (error) {
            //     // console.log(index)                
            //     // console.log(this.npcPointsGroup)                
            //     // alert(error)                
            // }
            element?.update(deltaTime);
        }

        for (let index = 0; index < this.cells.length; index++) {
            const element = this.cells[index];

            if (element.visible && element.worldPosition().distanceTo(this.player.worldPosition()) <= .6) {
                this.onTakeCell()
                element.visible = false
            }
        }
        this.holeLerp.update()

        var vertex = new THREE.Vector3();
        // this.vest.getVertexPosition(297, vertex);
        // vertex = this.getSkinnedVertexWorldPos(this.vest, 297);
        // vertex = this.vest.localToWorld(vertex);
        // this.torus.setPosition(vertex)

        // this.torus.setRotationFromEuler(this.player.rotation)
        // // this.torus.rotateZ(-1)
        // this.torus.rotateY(-1)

        // this.lerpX.update()
        // this.lerpY.update()
        // this.lerpZ.update()
        // const factor = .3
        // this.lerpX.push(vertex.x, factor)
        // this.lerpY.push(vertex.y, factor)
        // this.lerpZ.push(vertex.z, factor)
    }

    getSkinnedVertexWorldPos(skinned, vertexIndex) {
        const posAttr = skinned.geometry.attributes.position;
        const skinIndex = skinned.geometry.attributes.skinIndex;
        const skinWeight = skinned.geometry.attributes.skinWeight;
        const skeleton = skinned.skeleton;
        const tempVec = new THREE.Vector3();
        const skinnedPos = new THREE.Vector3();
        const boneMat = new THREE.Matrix4();

        tempVec.fromBufferAttribute(posAttr, vertexIndex);
        skinnedPos.set(0, 0, 0);

        for (let i = 0; i < 4; i++) {
            const weight = skinWeight.getX(vertexIndex * 4 + i) ?? 0;
            if (weight <= 0) continue;

            const boneIndex = skinIndex.getX(vertexIndex * 4 + i);
            const bone = skeleton.bones[boneIndex];
            bone.updateMatrixWorld(true);
            boneMat.copy(bone.matrixWorld)
                .multiply(skeleton.boneInverses[boneIndex]);

            const temp = tempVec.clone().applyMatrix4(boneMat).multiplyScalar(weight);
            skinnedPos.add(temp);
        }

        skinned.localToWorld(skinnedPos);
        return skinnedPos;
    }

    /**
     * SkinnedMesh'teki vertex'in world-space pozisyonu ve yönelimini çıkarır.
     * applyBoneTransform GPU skin deformasyonunu CPU tarafında çözer.
     * Rotasyon tahmini vertex normalinden yapılır.
     */
    getVertexTransform(skinnedMesh, vertexIndex, outPos, outQuat) {
        const geom = skinnedMesh.geometry;
        const posAttr = geom.getAttribute('position');
        const normAttr = geom.getAttribute('normal');
        const skinIndex = geom.getAttribute('skinIndex');
        const skinWeight = geom.getAttribute('skinWeight');

        const skeleton = skinnedMesh.skeleton;
        const boneMatrices = skeleton.boneMatrices;
        const bindMatrix = skinnedMesh.bindMatrix;
        const bindMatrixInverse = skinnedMesh.bindMatrixInverse;

        const i = geom.index ? geom.index.getX(vertexIndex) : vertexIndex;

        // position & normal local base
        const basePos = new THREE.Vector3(
            posAttr.getX(i),
            posAttr.getY(i),
            posAttr.getZ(i)
        );
        const baseNorm = new THREE.Vector3(
            normAttr.getX(i),
            normAttr.getY(i),
            normAttr.getZ(i)
        );

        // ---- apply skin manually ----
        const skinnedPos = new THREE.Vector3(0, 0, 0);
        const skinnedNorm = new THREE.Vector3(0, 0, 0);
        const tempMatrix = new THREE.Matrix4();
        const tempNormalMatrix = new THREE.Matrix3();
        const tempVector = new THREE.Vector3();

        for (let j = 0; j < 4; j++) {
            const weight = skinWeight.getComponent(i * 4 + j);
            if (weight === 0) continue;

            const boneIndex = skinIndex.getComponent(i * 4 + j);
            tempMatrix.fromArray(boneMatrices, boneIndex * 16);

            // Pozisyon için
            tempVector.copy(basePos).applyMatrix4(bindMatrix).applyMatrix4(tempMatrix).applyMatrix4(bindMatrixInverse);
            skinnedPos.addScaledVector(tempVector, weight);

            // Normal için
            tempNormalMatrix.getNormalMatrix(tempMatrix);
            tempVector.copy(baseNorm).applyMatrix3(tempNormalMatrix).normalize();
            skinnedNorm.addScaledVector(tempVector, weight);
        }

        // ---- normalize and convert to world space ----
        skinnedNorm.normalize();
        skinnedPos.applyMatrix4(skinnedMesh.matrixWorld);
        skinnedNorm.transformDirection(skinnedMesh.matrixWorld);

        // rotation oluştur
        const zAxis = skinnedNorm.clone();
        const up = new THREE.Vector3(0, 1, 0);
        if (Math.abs(zAxis.dot(up)) > 0.99) up.set(1, 0, 0);
        const xAxis = new THREE.Vector3().crossVectors(up, zAxis).normalize();
        const yAxis = new THREE.Vector3().crossVectors(zAxis, xAxis).normalize();
        const mat = new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis);
        const quat = new THREE.Quaternion().setFromRotationMatrix(mat);

        outPos.copy(skinnedPos);
        outQuat.copy(quat);
    }

    Reset() {
        for (let index = 0; index < this.bb8Controller.length; index++) {
            const element = this.bb8Controller[index];
            element?.kill("reset")
        }

        for (let index = 0; index < this.cells.length; index++) {
            const element = this.cells[index];
            SceneManager.deepDispose(this.scene, element)
        }
    }

    pushBb8(scene: THREE.Scene, delay: number = 0) {
        return new Promise((resolve, _) => {
            setTimeout(() => {
                if (this.activeBb8Count <= this.maxBb8Count) {
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
                        // console.log("new bb8,",this.bb8Controller.length, "active", this.activeBb8Count)
                        // this.enemies.push(newBb8.sphere);

                        SceneManager.shootables.push(newBb8.sphere)
                    } else {
                        newBb8 = this.bb8Controller[this.getNextPoolIndex()]
                        clone = newBb8.root;
                        // console.log("clone bb8,",this.bb8Controller.length, "active:", this.activeBb8Count, "pool index:", this.currentPoolIndex)
                    }

                    const point = this.npcPointsGroup.children[Math.floor(Math.random() * (this.maxBb8Count - 0 + 1)) + 0]
                    newBb8.setTarget(point)

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
    addNpcDebugPoints(scene: THREE.Scene, player: THREE.Object3D, count = 10, radius = 2) {
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
        this.pushCell(hit.parent!.worldPosition())
        hit.parent!.userData.controller.kill("reason: shoot")
        this.decreaseActiveBb8Count()
    }
    onBb8Boom = (bb8: utils.BB8Controller) => {
        this.decreaseActiveBb8Count()
        // health bar debug
        this.setHealthPercent(prev => {
            if (prev - SceneManager.missile!.damage <= 0) {
                // window.location.reload()
                return 0
            }
            return prev - SceneManager.missile!.damage
        })
    }
    decreaseActiveBb8Count() {
        this.activeBb8Count = Math.max(this.activeBb8Count - 1, 0)
        console.log("decrease actiev", this.activeBb8Count)
    }
    pushCell(position: THREE.Vector3) {
        const clone = this.cellPrefab.clone()
        clone.setPosition(position)
        clone.visible = true
        this.scene.add(clone)
        this.cells.push(clone)
    }
    onShield(enemy: utils.BB8Controller) {
        this.pushCell(enemy.root.worldPosition())

        enemy.kill("reason: shield")
        this.decreaseActiveBb8Count()
    }
}