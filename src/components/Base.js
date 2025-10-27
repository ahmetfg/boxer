import * as THREE from 'three';
import * as utils from './Utils.js';
import { SceneManager } from './SceneManager.js';
import { PerkArea } from './PerkArea.js';
import { Pool } from './Pool.js';

class HitTable {
    targets = []
    rawTargets = []
    // activeIndexes: number[] = []

    push(target) {
        // this.activeIndexes.push(
        this.targets.push(target)
        // -1)
        this.rawTargets.push(target.object)
    }

    removeByController(controller) {
        const index = this.targets.findIndex(x => x.controller == controller)
        this.targets.splice(index, 1)
        this.rawTargets.splice(index, 1)
        // this.activeIndexes = this.activeIndexes.filter(x => x != index)
    }

    reset() {
        this.targets = []
        this.rawTargets = []
        // this.activeIndexes = []
    }

    get length() {
        return this.targets.length
    }
}

export class Base {
    bb8Controller = []
    holeLerp = new utils.LerpManager()
    bb8Prefab
    npcPointsGroup = new THREE.Group()
    visulizeNpcPointsGroup = false
    hitTable = new HitTable;
    activeBb8Count = 0
    maxBb8Count = 20
    player
    targetBox
    perkBase50;
    cells = []
    currentPoolIndex = 0

    posWorld = new THREE.Vector3()
    tempPos = new THREE.Vector3();
    vest;
    headset;
    hat;
    torus;

    lerpX = new utils.LerpManager();
    lerpY = new utils.LerpManager();
    lerpZ = new utils.LerpManager();

    cellPrefab;
    scene;
    cellPool;

    setHealthPercent
    onTakeCell = (basicCellValue) => { }
    vestHandleOne;

    elapsedFrame = 0;

    constructor(
        scene,
        player,
        setHealthPercent
    ) {
        this.scene = scene
        this.bb8Prefab = scene.getObjectByName("Minion")
        this.bb8Prefab.visible = false
        // this.setBaseHole(scene)
        this.addNpcDebugPoints(scene, player, this.maxBb8Count + 1, .8);
        this.player = player
        this.setHealthPercent = setHealthPercent

        this.targetBox = scene.getObjectByName("targetObject")
        this.targetBox.position.x = 0
        this.targetBox.position.y = 2
        this.targetBox.position.z = 3
        this.targetBox.rotation.y = Math.PI

        const area50 = scene.getObjectByName("50CoinFloor")

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

        this.vest = scene.getObjectByName("Vest")
        this.vest.frustumCulled = false
        this.vest.visible = false
        this.headset = scene.getObjectByName("Headphone")
        this.headset.frustumCulled = false
        this.headset.visible = false
        this.hat = scene.getObjectByName("Hat")
        this.hat.frustumCulled = false
        this.hat.visible = false

        this.torus = scene.getObjectByName("Torus")
        // this.vestHandleOne = scene.getObjectByName("VestHandleOne")
        // this.vestHandleOne.attach(this.torus)
        // this.torus.setPosition(new THREE.Vector3(1,1,1))

        // var vertex = new THREE.Vector3();
        // this.vest.getVertexPosition(297, vertex);
        // vertex = this.vest.localToWorld(vertex);
        // this.torus.setPosition(vertex)
        const vestAttachOne = scene.getObjectByName("Bone");
        vestAttachOne.attach(this.torus)
        this.torus.setPosition(new THREE.Vector3())

        this.lerpX.setActions(
            (x) => this.torus.position.x = x,
            () => this.torus.position.x
        )
        this.lerpY.setActions(
            (y) => this.torus.position.y = y,
            () => this.torus.position.y
        )
        this.lerpZ.setActions(
            (z) => this.torus.position.z = z,
            () => this.torus.position.z
        )

        this.cellPrefab = scene.getObjectByName("Cell")
        this.cellPrefab.visible = false

        this.cellPool = new Pool(scene, this.cellPrefab, 50)

        this.Reset()
    }

    get totalFrameBeforeEnemyPush() {
        return Math.max(130 - (SceneManager.UI.level * 10), 10);
    }

    tick() {
        if (!SceneManager.pause) {
            this.pushBb8(this.scene, utils.getRandomSpawnPoint(this.player.position, 15, 5))
        }
    }

    setBaseHole(scene) {
        var obj = scene.getObjectByName("BaseHole")
        obj.traverse(o => { if (o.isMesh && o.morphTargetInfluences) obj = o });

        this.holeLerp.setActions((x) => {
            obj.morphTargetInfluences[0] = x
        }, () => {
            return obj.morphTargetInfluences[0]
        })
        this.holeLerp.instant(1)
    }

    getNextPoolIndex() {
        this.currentPoolIndex++
        if (this.currentPoolIndex >= this.maxBb8Count) {
            this.currentPoolIndex = 0
        }
        return this.currentPoolIndex
    }

    update = (deltaTime) => {
        // this.torus.setPosition(this.vestHandleOne.worldPosition())

        for (let index = 0; index < this.bb8Controller.length; index++) {
            const element = this.bb8Controller[index];
            element?.update(deltaTime);
        }

        for (let index = 0; index < this.cells.length; index++) {
            const element = this.cells[index];

            if (element.visible && element.worldPosition().distanceTo(this.player.worldPosition()) <= SceneManager.magnetTreshold) {
                this.onTakeCell(SceneManager.basicCellValue)
                this.cellPool.release(this.cellPool.getObject((element).poolIndex))
            }
        }

        if (this.elapsedFrame % this.totalFrameBeforeEnemyPush == 0) {
            this.tick()
        }

        this.elapsedFrame++;

        // this.holeLerp.update()

        // var vertex = new THREE.Vector3();
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
            this.scene.remove(element.root)
        }

        this.bb8Controller = []
        this.cellPool.Reset()
        this.cells = []

        this.activeBb8Count = 0
        this.hitTable.reset()

        // add it again.. yeah I know..
        this.hitTable.push({
            alive: true,
            object: this.targetBox
        });

        // reset cosmetics
        this.vest.visible = false
        this.headset.visible = false
        this.hat.visible = false
    }

    pushBb8(scene, position, delay = 0) {
        return new Promise((resolve, _) => {
            setTimeout(() => {
                if (this.activeBb8Count < this.maxBb8Count) {
                    var clone = null;
                    var newBb8 = null;

                    if (this.bb8Controller.length < this.maxBb8Count) {
                        clone = this.bb8Prefab.clone()
                        clone.visible = true
                        scene.add(clone)

                        newBb8 = new utils.BB8Controller({
                            onBoom: this.onBb8Boom,
                            prefab: this.bb8Prefab,
                            player: this.player,
                            root: clone,
                            sphere: clone.getObjectByName("MinionSphere"),
                            head: clone.getObjectByName("MinionTop"),
                            radius: 0.257274,
                            speed: 1,
                        });
                        clone.userData.controller = newBb8
                        this.bb8Controller.push(newBb8)
                    } else {
                        newBb8 = this.bb8Controller[this.getNextPoolIndex()]
                        clone = newBb8.root;
                    }

                    this.hitTable.push({
                        alive: true,
                        object: newBb8.sphere,
                        controller: newBb8
                    })

                    if (position != undefined) {
                        newBb8.root.setPosition(position)
                    }

                    const point = this.npcPointsGroup.children[Math.floor(Math.random() * (this.maxBb8Count - 0 + 1)) + 0]
                    newBb8.setTarget(point)

                    this.activeBb8Count += 1
                    // newBb8!.isActive = false

                    newBb8.pool(position)
                    // open the hole and activate bb8
                    resolve(null)
                } else {
                    resolve(null)
                }
            }, delay);
        })
    }
    addNpcDebugPoints(scene, player, count = 10, radius = 2) {
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
    onShoot(hit) {
        this.pushCell(hit.parent.worldPosition())
        hit.parent.userData.controller.kill("reason: shoot")
        this.decreaseActiveBb8Count()
    }
    onBb8Boom = (bb8) => {
        this.decreaseActiveBb8Count()
        // health bar debug
        if (SceneManager.healthPercent - SceneManager.missile.damage <= 0) {
            // window.location.reload()
            this.setHealthPercent(0)
        }
        this.setHealthPercent(SceneManager.healthPercent - SceneManager.missile.damage)
    }
    decreaseActiveBb8Count() {
        this.activeBb8Count = Math.max(this.activeBb8Count - 1, 0)
    }
    pushCell(position) {
        // const clone = this.cellPrefab.clone()
        // clone.setPosition(position)
        // clone.visible = true
        // this.scene.add(clone)
        const clone = this.cellPool.push(this.cells)
        clone.setPosition(position)
    }
    onShield(enemy) {
        this.pushCell(enemy.root.worldPosition())

        enemy.kill("reason: shield")
        this.decreaseActiveBb8Count()
    }
    onDroneHit(enemy) {
        this.pushCell(enemy.root.worldPosition())

        enemy.kill("reason: drone hit")
        this.decreaseActiveBb8Count()
    }
}