import * as THREE from 'three';
// import Signals from './Signals.tsx';
import { SceneManager } from './SceneManager.js';
// import { BaseTargetController } from './Base.tsx';
import Signals from './Signals.js';

let sphere, scene, renderer, rotationSpeed;

/**
 * Three.js sahne ve küreyi başlatır, küreyi sahneye ekler ve sürükleme ile
 * yalnızca yaw (Y) ve pitch (X) eksenlerinde döndürmeyi sağlar.
 *
 * @param {Object} options
 * @param {THREE.Scene} options._scene      – üç.js sahnesi
 * @param {THREE.WebGLRenderer} options._renderer – renderer
 * @param {number} [options.rotationSpeed=0.005] – sürüklemeden dönüş hızı
 * @param {number} [options.sphereColor=0x0077ff] – küre rengi
 * @param {boolean} [options.wireframe=true] – tel kafes modu
 * @returns {THREE.Mesh} – oluşturulan küre
 */
export function initThreeJsSceneAndSphere(options = {}) {
    const {
        _scene,
        _renderer,
        _rotationSpeed = 0.005,
        sphereColor = 0x0077ff,
        wireframe = true,
        forceRotate = {}
    } = options;

    // Global değişkenlere ata
    scene = _scene;
    renderer = _renderer;
    rotationSpeed = _rotationSpeed;

    // Küre oluştur
    const geometry = new THREE.SphereGeometry(10, 2, 2);
    const material = new THREE.MeshPhongMaterial({ color: sphereColor, wireframe, opacity: 0, transparent: true });
    sphere = new THREE.Mesh(geometry, material);

    // Unity tarzı X ölçeği negatif, pozisyon (0,0,0)
    sphere.scale.set(-1, 1, 1);
    sphere.position.set(0, 0, 0);

    // Euler dönüş sırası: önce Y (yaw), sonra X (pitch), en son Z (roll)
    // Biz Z'yi hiç değiştirmeyeceğiz, böylece roll hiçbir zaman uygulanmaz.
    sphere.rotation.order = 'YXZ';

    scene.add(sphere);

    // Fare ve dokunma olay dinleyicilerini ekle
    var cleaner = addEventListeners({ forceRotate });

    return sphere;
}

export function addEventListeners({ _forceRotate }) {
    const dom = renderer.domElement;
    var forceRotate = _forceRotate ?? false
    Signals.subscribe("onRotate", (f) => {
        forceRotate = f
        // alert(forceRotate)
    })

    // 1) Canvas'ta tarayıcı scroll/zoom/çeviri hareketlerini kapat
    dom.style.touchAction = 'none';
    dom.style.userSelect = 'none';

    // 2) Gerekirse tüm sayfa touch-move'larını da durdur
    window.addEventListener('touchmove', (e) => {
        e.preventDefault();
    }, { passive: false });

    let isDraggingSphere = false;
    let spherePointerId = null;
    let prevPos = { x: 0, y: 0 };

    // Başlangıç: fare veya touch ile basıldığında işleme al
    dom.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'mouse' || e.pointerType === 'touch') {
            isDraggingSphere = true;
            spherePointerId = e.pointerId;
            prevPos = { x: e.clientX, y: e.clientY };
            dom.setPointerCapture(spherePointerId);
        }
    }, false);

    // Bırakıldığında bırak
    dom.addEventListener('pointerup', (e) => {
        if (e.pointerId === spherePointerId) {
            isDraggingSphere = false;
            if (spherePointerId !== null) {
                dom.releasePointerCapture(spherePointerId);
                spherePointerId = null;
            }
        }
    }, false);

    // Sistem iptali gibi durumlara karşı da bırak
    dom.addEventListener('pointercancel', (e) => {
        if (e.pointerId === spherePointerId) {
            isDraggingSphere = false;
            dom.releasePointerCapture(e.pointerId);
            spherePointerId = null;
        }
    }, false);

    // Hareketi takip et ve küreyi döndür
    dom.addEventListener('pointermove', (e) => {
        if (!isDraggingSphere || e.pointerId !== spherePointerId) return;

        const deltaX = e.clientX - prevPos.x;
        const deltaY = e.clientY - prevPos.y;

        if (forceRotate) {
            sphere.rotation.y -= deltaY * rotationSpeed;
            sphere.rotation.x -= deltaX * rotationSpeed;
        } else {
            sphere.rotation.y -= deltaX * rotationSpeed;
            sphere.rotation.x += deltaY * rotationSpeed;
        }

        prevPos = { x: e.clientX, y: e.clientY };
    }, false);
    return () => { }

}

export class SpineAimController {
    /**
    * @param {Object}   cfg
    * @param {THREE.Object3D} cfg.spineBone            — character spine bone
    * @param {THREE.Object3D} cfg.rifle                — rifle mesh / empty transform
    * @param {THREE.Object3D} [cfg.rifleRotationTarget]— optional helper whose world rotation is applied to rifle
    * @param {THREE.Object3D} cfg.target               — object the spine & rifle aim at
    * @param {THREE.Vector3}  [cfg.offset]             — Euler‑angle offset (deg) for spine after lookAt
    * @param {THREE.Vector3}  [cfg.rifleOffset]        — Euler‑angle offset (deg) for rifle after lookAt or copy
    * @param {string}         [cfg.rifleForwardAxis]   — which local axis points forward on the rifle ("-z", "+z", "-x", etc.)
    */
    constructor({
        spineBone,
        rifle,
        rifleRotationTarget,
        target,
        offset = new THREE.Vector3(),
        rifleOffset = new THREE.Vector3(),
        rifleForwardAxis = "-z",
    }) {
        this.spineBone = spineBone;
        this.rifle = rifle;
        this.rifleRotationTarget = rifleRotationTarget;
        this.target = target;
        this.offset = offset; // degrees
        this.rifleOffset = rifleOffset; // degrees
        this.rifleForwardAxis = rifleForwardAxis;

        this._tmpEuler = new THREE.Euler();
        this._tmpVec = new THREE.Vector3();
        this._axisAdjustQuat = this._getAxisAdjustQuat(rifleForwardAxis);
    }

    /**
     * Call every frame.
     */
    update() {
        if (!this.spineBone || !this.target) return;

        // ---------------- Spine ----------------
        const worldPos = this.target.getWorldPosition(this._tmpVec);
        this.spineBone.lookAt(worldPos);
        this._applyEulerOffset(this.spineBone, this.offset);
    }

    // ---------------- Helpers ----------------
    _applyEulerOffset(obj3d, offsetDeg) {
        this._tmpEuler.set(
            THREE.MathUtils.degToRad(offsetDeg.x),
            THREE.MathUtils.degToRad(offsetDeg.y),
            THREE.MathUtils.degToRad(offsetDeg.z)
        );
        const q = new THREE.Quaternion().setFromEuler(this._tmpEuler);
        obj3d.quaternion.multiply(q);
    }

    /**
     * Returns a quaternion that rotates the provided local axis so it aligns with +Z.
     */
    _getAxisAdjustQuat(axisLabel) {
        switch (axisLabel) {
            case "+z": return new THREE.Quaternion();
            case "-z": return new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI, 0));
            case "+x": return new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -Math.PI / 2, 0));
            case "-x": return new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI / 2, 0));
            case "+y": return new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0));
            case "-y": return new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
            default:
                console.warn(`SpineAimController: unknown rifleForwardAxis '${axisLabel}', defaulting to '-z'.`);
                return new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI, 0));
        }
    }

    // ---------------- Convenience setters ----------------
    setTarget(obj) {
        this.target = obj;
    }

    setOffsets(offset, rifleOffset = this.rifleOffset) {
        this.offset.copy(offset);
        this.rifleOffset.copy(rifleOffset);
    }

    setRifleForwardAxis(axisLabel) {
        this.rifleForwardAxis = axisLabel;
        this._axisAdjustQuat = this._getAxisAdjustQuat(axisLabel);
    }

    setRifleRotationTarget(obj) {
        this.rifleRotationTarget = obj;
    }
}

/**
 * Sahnedeki tüm mesh nesneleri için dat.GUI'ye pozisyon kaydırıcıları ekler.
 * @param {THREE.Scene} scene - Three.js sahne objesi.
 * @param {GUI} gui - dat.GUI instance'ı.
 */
export function addPositionSlidersToGUI(scene, gui) {
    // Sahnedeki tüm çocukları (nesneleri) dolaş
    scene.children.forEach(object => {
        // Sadece THREE.Mesh veya THREE.Object3D gibi pozisyonu olan nesneleri hedefle
        // İsterseniz burada daha spesifik filtreleme yapabilirsiniz (örn. sadece belirli isimdeki nesneler)
        if (object instanceof THREE.Mesh || object instanceof THREE.Object3D) {
            // Her nesne için ayrı bir GUI klasörü oluştur
            const folder = gui.addFolder(object.name || `Object ${object.id}`);

            // X pozisyonu için kaydırıcı
            folder.add(object.position, 'x', -10, 10).name('Position X').onChange(() => {
                // Pozisyon değiştiğinde sahnenin güncellenmesi gerekiyorsa burada render çağrılabilir.
                // Örneğin: renderer.render(scene, camera);
            });

            // Y pozisyonu için kaydırıcı
            folder.add(object.position, 'y', -10, 10).name('Position Y').onChange(() => {
                // Pozisyon değiştiğinde sahnenin güncellenmesi gerekiyorsa burada render çağrılabilir.
            });

            // Z pozisyonu için kaydırıcı
            folder.add(object.position, 'z', -10, 10).name('Position Z').onChange(() => {
                // Pozisyon değiştiğinde sahnenin güncellenmesi gerekiyorsa burada render çağrılabilir.
            });

            // Klasörü aç (isteğe bağlı)
            folder.open();
        }
    });
}

export function AddSphere(scene, radius = 1, color = 0xffff005, widthSegments = 32, heightSegments = 16) {
    const geometry = new THREE.SphereGeometry(radius, widthSegments, heightSegments);
    const material = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0,
    });
    const sphere = new THREE.Mesh(geometry, material);
    sphere.name = "aimTarget"
    scene.add(sphere);
    return sphere
}

export function AddDebugSphere(scene, radius = 1, color = 0xffff005, widthSegments = 32, heightSegments = 16, name = "sphere") {
    const geometry = new THREE.SphereGeometry(radius, widthSegments, heightSegments);
    const material = new THREE.MeshBasicMaterial({
        color: color,
        transparent: false,
        opacity: 1,
    });
    const sphere = new THREE.Mesh(geometry, material);
    sphere.name = name
    scene.add(sphere);
    return sphere
}

/**
 * object:    THREE.Object3D   → döndürülecek nesne (LOCAL rotasyonu ayarlanır)
 * targetPos: THREE.Vector3    → DÜNYA (world) koordinatlarında hedef nokta
 * axes:      {x?:boolean,y?:boolean,z?:boolean} → hangi Euler eksenlerinin hedefe
 *             bakışa göre güncelleneceğini seçersin. false olanlar korunur.
 * 
 * Not: Three.js'in lookAt'i nesnenin -Z eksenini hedefe çevirir. Modelinin "ileri" ekseni
 *      farklıysa (örn. +Y) modele/pivota bir düzeltme rotasyonu ekleyebilirsin.
 */
export function LookAtCustom(
    object,
    targetPos,
    axes = { x: true, y: true, z: true },
    factor = { x: 1, y: 1, z: 1 }
) {
    if (targetPos == undefined) return
    // 1) world → desired world quaternion
    const objWorldPos = new THREE.Vector3();
    object.getWorldPosition(objWorldPos);

    // Aynı noktadaysa çık
    if (objWorldPos.distanceToSquared(targetPos) < 1e-12) return;

    const up = new THREE.Vector3(0, 1, 0);
    const lookMtx = new THREE.Matrix4().lookAt(objWorldPos, targetPos, up);

    // Matrix4.lookAt "kamera bakışı" üretir; nesneyi hedefe çevirmek için çevir.
    // three.js’te bir nesnenin hedefe bakması için, view matrix'in tersine ihtiyaç var.
    lookMtx.invert(); // → desired WORLD transform

    const desiredWorldQuat = new THREE.Quaternion().setFromRotationMatrix(lookMtx);

    // 2) world quat → LOCAL quat (ebeveyn uzayına aktar)
    const parentWorldQuat = new THREE.Quaternion();
    if (object.parent) object.parent.getWorldQuaternion(parentWorldQuat);
    const parentWorldQuatInv = parentWorldQuat.clone().invert();

    const desiredLocalQuat = desiredWorldQuat.clone().premultiply(parentWorldQuatInv);

    // 3) Euler’lere çevir ve eksen kilitle
    const desiredEuler = new THREE.Euler().setFromQuaternion(desiredLocalQuat, 'XYZ');
    const currentEuler = object.rotation.clone();

    const useX = axes.x ?? true;
    const useY = axes.y ?? true;
    const useZ = axes.z ?? true;

    if (!useX) desiredEuler.x = currentEuler.x;
    if (!useY) desiredEuler.y = currentEuler.y;
    if (!useZ) desiredEuler.z = currentEuler.z;

    if (factor.x) desiredEuler.x *= factor.x;
    if (factor.y) desiredEuler.y *= factor.y;
    if (factor.z) desiredEuler.z *= factor.z;

    // 4) Uygula (gimbal sıçramalarını azaltmak için normalize et)
    object.rotation.set(desiredEuler.x, desiredEuler.y, desiredEuler.z, 'XYZ');
}

export function getLookAtQuaternion(source, target) {
    const m = new THREE.Matrix4();
    const resultQuat = new THREE.Quaternion();

    // Kamera gibi: source'un mevcut konumundan hedefe bakacak bir matris kur
    m.lookAt(source.position, target, source.up);

    // Matrix'ten quaternion çıkar
    resultQuat.setFromRotationMatrix(m);

    return resultQuat;
}

export function getLookAtEuler(source, target) {
    const q = getLookAtQuaternion(source, target)
    const euler = new THREE.Euler().setFromQuaternion(q, "YXZ");
    return euler;
}

export function lookAtYawOnly(object, targetPos) {
    const pos = object.getWorldPosition(new THREE.Vector3());
    const dir = new THREE.Vector3().subVectors(targetPos, pos);
    // XZ düzlemindeki açı: atan2(X farkı, Z farkı)
    const yaw = Math.atan2(dir.x, dir.z);
    object.rotation.z = -yaw;
}

export function lookAtYewOnly(object, targetPos, flow) {
    const pos = object.getWorldPosition(new THREE.Vector3());
    const dir = new THREE.Vector3().subVectors(targetPos, pos);
    // XZ düzlemindeki açı: atan2(X farkı, Z farkı)
    const yaw = Math.atan2(dir.x, dir.z);
    flow(yaw, object)
}

export function aimYaw(object, targetWorld, forward = 1) {
    const p = object.parent;
    const t = targetWorld.clone();
    if (p) p.worldToLocal(t);        // hedefi parent uzayına taşı
    const o = object.position;       // obje zaten parent uzayında
    const dx = t.x - o.x, dz = t.z - o.z;
    if (dx === 0 && dz === 0) return;
    let yaw = Math.atan2(dx, dz);
    if (forward === -1) yaw += Math.PI;  // model ileri ekseni -Z ise
    object.rotation.order = 'YXZ';
    object.rotation.y = Math.atan2(Math.sin(yaw), Math.cos(yaw)); // normalize
}

export function lookAtYuwOnly(object, targetPos, flow) {
    const pos = object.getWorldPosition(new THREE.Vector3());
    const dir = new THREE.Vector3().subVectors(targetPos, pos);
    // XZ düzlemindeki açı: atan2(X farkı, Z farkı)
    const yaw = Math.atan2(dir.x, dir.y);
    flow(yaw, object)
}

// Utils.tsx dosyasının sonuna veya ThreeAim.jsx tepeye ekleyin
export function clipOnlyUpperBody(originalClip) {
    const UPPER_PARTS = [
        'ForeArm', 'Head'
    ];               // anahtar kelime listesi – gerektiğinde genişletin

    const filteredTracks = originalClip.tracks.filter(track =>
        UPPER_PARTS.some(part => track.name.includes(part))
    );

    return new THREE.AnimationClip(
        originalClip.name + '_Upper',
        originalClip.duration,
        filteredTracks
    );
}

export class XZChecker {
    /** --- LOW-LEVEL: 2D point-in-polygon (XZ), ray-casting --- */
    static pointInPolyXZ(
        px, pz,
        vx, vz,
        count,
        eps = 1e-8
    ) {
        // AABB early-out
        let minX = vx[0], maxX = vx[0], minZ = vz[0], maxZ = vz[0];
        for (let i = 1; i < count; i++) {
            const x = vx[i], z = vz[i];
            if (x < minX) minX = x; if (x > maxX) maxX = x;
            if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
        }
        if (px < minX - eps || px > maxX + eps || pz < minZ - eps || pz > maxZ + eps) return false;

        // Kenar üzerinde mi? (boundary-inclusive)
        for (let i = 0, j = count - 1; i < count; j = i++) {
            const x1 = vx[j], z1 = vz[j];
            const x2 = vx[i], z2 = vz[i];
            const dx = x2 - x1, dz = z2 - z1;
            const denom = dx * dx + dz * dz;
            if (denom <= eps) continue;              // <-- degenerate edge guard
            const t = ((px - x1) * dx + (pz - z1) * dz) / denom;
            if (t >= -eps && t <= 1 + eps) {
                const cx = x1 + t * dx, cz = z1 + t * dz;
                const d2 = (px - cx) * (px - cx) + (pz - cz) * (pz - cz);
                if (d2 <= eps * eps) return true;
            }
        }

        // Ray-casting (even-odd) — bölme-by-zero güvenli
        let inside = false;
        for (let i = 0, j = count - 1; i < count; j = i++) {
            const xi = vx[i], zi = vz[i];
            const xj = vx[j], zj = vz[j];
            const ziAbove = zi > pz, zjAbove = zj > pz;
            if (ziAbove !== zjAbove) {
                const t = (pz - zi) / (zj - zi);                   // zj != zi burada garanti
                const xInt = xi + t * (xj - xi);
                if (px <= xInt) inside = !inside;
            }
        }
        return inside;
    }

    /** --- LOW-LEVEL: convex polygon testi (daha hızlı) ---
     *  Not: Köşeler CW ya da CCW sıralı olmalı. */
    static pointInConvexXZ(
        px, pz,
        vx, vz,
        count,
        eps = 1e-8
    ) {
        // AABB early-out
        let minX = vx[0], maxX = vx[0], minZ = vz[0], maxZ = vz[0];
        for (let i = 1; i < count; i++) {
            const x = vx[i], z = vz[i];
            if (x < minX) minX = x; if (x > maxX) maxX = x;
            if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
        }
        if (px < minX - eps || px > maxX + eps || pz < minZ - eps || pz > maxZ + eps) return false;

        let sign = 0;
        for (let i = 0; i < count; i++) {
            const i2 = (i + 1) % count;
            const ax = vx[i], az = vz[i];
            const bx = vx[i2], bz = vz[i2];
            const cross = (bx - ax) * (pz - az) - (bz - az) * (px - ax);
            if (Math.abs(cross) <= eps) continue;
            const s = cross > 0 ? 1 : -1;
            if (sign === 0) sign = s;
            else if (s !== sign) return false;
        }
        return true;
    }

    /** scratch’lar: GC azaltmak için */
    static _tmpWorld = new THREE.Vector3();
    static _vx4 = new Float32Array(4);
    static _vz4 = new Float32Array(4);

    /** --- HIGH-LEVEL: tek seferlik kullanım (tahsisatsız) --- */
    static isInsideXZQuad(
        obj,
        quad,
        opts
    ) {
        const eps = opts?.epsilon ?? 1e-8;
        const vx = XZChecker._vx4, vz = XZChecker._vz4;   // <-- reuse
        vx[0] = quad[0].x; vz[0] = quad[0].z;
        vx[1] = quad[1].x; vz[1] = quad[1].z;
        vx[2] = quad[2].x; vz[2] = quad[2].z;
        vx[3] = quad[3].x; vz[3] = quad[3].z;

        obj.getWorldPosition(XZChecker._tmpWorld);
        const px = XZChecker._tmpWorld.x, pz = XZChecker._tmpWorld.z;

        return (opts?.convex ?? false)
            ? XZChecker.pointInConvexXZ(px, pz, vx, vz, 4, eps)
            : XZChecker.pointInPolyXZ(px, pz, vx, vz, 4, eps);
    }

    /** --- HIGH-LEVEL: her frame için optimize checker (precompute + AABB) --- */
    static createXZQuadChecker(
        quad,
        opts
    ) {
        const eps = opts?.epsilon ?? 1e-8;
        const isConvex = !!opts?.convex;

        const vx = new Float32Array(4);
        const vz = new Float32Array(4);
        for (let i = 0; i < 4; i++) { vx[i] = quad[i].x; vz[i] = quad[i].z; }

        // Precomputed AABB (O(1) early-out)
        let minX = vx[0], maxX = vx[0], minZ = vz[0], maxZ = vz[0];
        for (let i = 1; i < 4; i++) {
            const x = vx[i], z = vz[i];
            if (x < minX) minX = x; if (x > maxX) maxX = x;
            if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
        }
        const aabbTest = (px, pz) =>
            !(px < minX - eps || px > maxX + eps || pz < minZ - eps || pz > maxZ + eps);

        return {
            containsObj(obj) {
                obj.getWorldPosition(XZChecker._tmpWorld);
                const px = XZChecker._tmpWorld.x, pz = XZChecker._tmpWorld.z;
                if (!aabbTest(px, pz)) return false;
                return isConvex
                    ? XZChecker.pointInConvexXZ(px, pz, vx, vz, 4, eps)
                    : XZChecker.pointInPolyXZ(px, pz, vx, vz, 4, eps);
            },
            containsXZ(px, pz) {
                if (!aabbTest(px, pz)) return false;
                return isConvex
                    ? XZChecker.pointInConvexXZ(px, pz, vx, vz, 4, eps)
                    : XZChecker.pointInPolyXZ(px, pz, vx, vz, 4, eps);
            },
            updateQuad(newQuad) {
                for (let i = 0; i < 4; i++) { vx[i] = newQuad[i].x; vz[i] = newQuad[i].z; }
                // AABB’yi güncelle
                minX = maxX = vx[0]; minZ = maxZ = vz[0];
                for (let i = 1; i < 4; i++) {
                    const x = vx[i], z = vz[i];
                    if (x < minX) minX = x; if (x > maxX) maxX = x;
                    if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
                }
            }
        };
    }
}

export class LerpManager {
    action = null
    get = null
    last = null
    newWeight = null
    lerpFactor = 0.5
    ids = []

    constructor() { }

    setActions(action, get) {
        this.action = action
        this.get = get
    }

    push(newWeight, lerpFactor = 0.3) {
        this.newWeight = newWeight
        this.lerpFactor = lerpFactor
    }

    clear() {
        for (let i = 0; i < this.ids.length; i++) {
            clearTimeout(this.ids[i])
        }
    }

    instant(newWeight) {
        this.newWeight = newWeight
        this.last = this.newWeight
        this.action(this.last)
    }

    update(throttle = false) {
        if (this.action == null || this.get == null) return
        if (this.newWeight == null) return
        if (this.last == null) {
            this.last = this.get()
        }

        this.last = THREE.MathUtils.lerp(
            this.last,
            this.newWeight,
            this.lerpFactor
        )
        // console.log(this.last, this.newWeight)

        if (!throttle) {
            this.action(this.last)
        } else {
            if (this.last != this.newWeight) {
                this.action(this.last)
            }
        }
    }

    approach(current, target, step) {
        const diff = target - current;
        if (diff === 0) return target;

        // farkın büyüklüğüne göre dinamik adım (smooth ama sabit hız limiti)
        const move = diff * 0.2; // 0.2 = ease oranı (küçültürsen daha yumuşak)
        const clamped = Math.abs(move) > step ? Math.sign(move) * step : move;

        return current + clamped;
    }

    updateLineer(throttle = false) {
        if (this.action == null || this.get == null) return
        if (this.newWeight == null) return
        if (this.last == null) {
            this.last = this.get()
        }

        this.last = this.approach(
            this.last,
            this.newWeight,
            this.lerpFactor
        )
        // console.log(this.last, this.newWeight)

        if (!throttle) {
            this.action(this.last)
        } else {
            if (this.last != this.newWeight) {
                this.action(this.last)
            }
        }
    }
}

export class FabrikLeftArm {
    chain;

    /* geçici tamponlar – GC yok */
    tmpV1 = new THREE.Vector3();     // bonePos
    tmpV2 = new THREE.Vector3();     // effectorPos
    tmpV3 = new THREE.Vector3();     // targetPos
    qWorld = new THREE.Quaternion();
    qLocal = new THREE.Quaternion();
    parentQ = new THREE.Quaternion();
    parentQInv = new THREE.Quaternion();

    /**
     * @param bones Sırayla: shoulder (LeftArm), elbow (LeftForeArm), wrist (LeftHand)
     * @param target Elin gitmesi gereken global hedef (tüfek üzerindeki empty)
     * @param iters  Kare başına CCD tur sayısı (1 = en hızlı)
     */
    constructor(
        bones,
        target,
        iters = 1
    ) {
        this.chain = [bones.shoulder, bones.elbow, bones.wrist];
    }

    /** AnimMixer.update(dt) çağrısından hemen sonra çalıştırın. */
    update() {
        const [shoulder, elbow, wrist] = this.chain;

        for (let step = 0; step < this.iters; step++) {
            /* Zinciri geriden (dirsek) öne (omuz) çöz – sadece 2 kemik */
            for (let i = 1; i >= 0; i--) {
                const bone = this.chain[i];
                const parent = bone.parent;

                /* Parent world matrisini tazele (tek sefer yetecek) */
                parent.updateWorldMatrix(true, false);

                /* === dünya uzayında vektörler === */
                const bonePos = bone.getWorldPosition(this.tmpV1);    // tmpV1
                const effector = wrist.getWorldPosition(this.tmpV2);   // tmpV2
                const targetPos = this.target.getWorldPosition(this.tmpV3); // tmpV3

                const vToEff = this.tmpV2.subVectors(effector, bonePos).normalize();
                const vToTgt = this.tmpV3.subVectors(targetPos, bonePos).normalize();

                /* Yönler zaten uyumluysa atla */
                if (vToEff.dot(vToTgt) > 0.999) continue;

                /* Dünya uzayında gerekli dönme */
                this.qWorld.setFromUnitVectors(vToEff, vToTgt);

                /* Dünya → local dönüşüm */
                parent.getWorldQuaternion(this.parentQ);
                this.parentQInv.copy(this.parentQ).invert();

                this.qLocal.copy(this.parentQInv)
                    .multiply(this.qWorld)
                    .multiply(this.parentQ);

                /* Uygula */
                bone.quaternion.premultiply(this.qLocal);
                bone.updateMatrix();
                /* Çocuk kemiklerin world matrisini güncelle */
                parent.updateWorldMatrix(true, true);
            }
            /* (isteğe bağlı) yakınlığa bakıp erken çıkabilirsiniz */
        }
    }
}

export class Missile {
    trajectoryLine;
    intervalID;
    damage = 20;
    closed = false
    isActive = false;

    /**
     * @param {THREE.Vector3} startPosition Füzenin başlangıç konumu.
     * @param {THREE.Vector3} targetPosition Füzenin hedef konumu.
     * @param {number} flightTime Füzenin hedefe ulaşması için istenen süre (saniye).
     * @param {number} gravity İvme katsayısı (genellikle pozitif, örn: 9.8).
     * @param {THREE.Scene} scene Füzenin ekleneceği Three.js sahnesi.
     */
    constructor(startPosition, targetPosition, flightTime, gravity, scene) {
        // --- Yapılandırma ve Durum ---
        this.gravity = gravity;
        this.flightTime = flightTime;
        this.timeElapsed = 0;
        this.isFlying = true;

        // --- Geometri ---
        // Primitive füze (küçük bir küre kullanabiliriz)
        const geometry = new THREE.SphereGeometry(0.1, 8, 8);
        const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(startPosition);
        scene.add(this.mesh);

        // --- Balistik Hesaplamalar ---
        this.startPos = startPosition.clone();
        this.targetPos = targetPosition.clone();

        // Hedef ve başlangıç arasındaki yatay (x-z) mesafeyi bul
        const distanceXZ = new THREE.Vector2(this.targetPos.x - this.startPos.x, this.targetPos.z - this.startPos.z).length();

        // Hedef ve başlangıç arasındaki dikey (y) mesafeyi bul
        const deltaY = this.targetPos.y - this.startPos.y;

        // X-Z düzlemindeki yatay hız (Vxz)
        // Vxz = Yatay Mesafe / Uçuş Süresi
        const vxz = distanceXZ / flightTime;

        // Y düzlemindeki başlangıç hızı (Vy0)
        // Balistik denkleminden türetilmiştir: Y = Y0 + Vy0*t - 0.5*g*t^2
        // Vy0 = (deltaY + 0.5 * g * t^2) / t
        this.vy0 = (deltaY + 0.5 * this.gravity * flightTime * flightTime) / flightTime;

        // Füzenin XZ yönündeki hareket vektörü (birim vektör * hız)
        const directionXZ = new THREE.Vector3(this.targetPos.x - this.startPos.x, 0, this.targetPos.z - this.startPos.z).normalize();
        this.velocityXZ = directionXZ.multiplyScalar(vxz);
    }

    /**
     * Füzenin uçuş yolu üzerindeki noktaları hesaplar.
     * @param {THREE.Vector3} startPos Başlangıç konumu.
     * @param {THREE.Vector3} targetPos Hedef konumu.
     * @param {number} flightTime Uçuş süresi.
     * @param {number} gravity Yerçekimi ivmesi (örn: 9.8).
     * @param {number} segments Yörüngeyi kaç parçaya böleceği.
     * @returns {THREE.Vector3[]} Yörünge üzerindeki noktaların dizisi.
     */
    calculateTrajectoryPoints(startPos, targetPos, flightTime, gravity, segments = 50) {
        const points = [];

        // Geçici olarak hız bileşenlerini hesapla
        const distanceXZ = new THREE.Vector2(targetPos.x - startPos.x, targetPos.z - startPos.z).length();
        const deltaY = targetPos.y - startPos.y;

        const vxz = distanceXZ / flightTime;
        const vy0 = (deltaY + 0.5 * gravity * flightTime * flightTime) / flightTime;

        const directionXZ = new THREE.Vector3(targetPos.x - startPos.x, 0, targetPos.z - startPos.z).normalize();
        const velocityXZ = directionXZ.multiplyScalar(vxz);

        // Her segment için konumu hesapla
        for (let i = 0; i <= segments; i++) {
            const t = (i / segments) * flightTime;

            const newPos = new THREE.Vector3();

            // X ve Z: X(t) = X0 + Vxz * t
            newPos.x = startPos.x + velocityXZ.x * t;
            newPos.z = startPos.z + velocityXZ.z * t;

            // Y: Y(t) = Y0 + Vy0 * t - 0.5 * g * t^2
            newPos.y = startPos.y + (vy0 * t) - (0.5 * gravity * t * t);

            points.push(newPos);
        }

        return points;
    }

    /**
     * Füzenin uçuşunu yeni bir hedef ve/veya yeni bir başlangıç konumuyla başlatır.
     * @param {THREE.Vector3} newStartPosition (Opsiyonel) Yeni başlangıç konumu.
     * @param {THREE.Vector3} newTargetPosition Yeni hedef konumu.
     * @param {number} newFlightTime (Opsiyonel) Yeni uçuş süresi.
     */
    reset(newStartPosition, newTargetPosition, newFlightTime) {
        // 1. Durumu Sıfırla
        this.timeElapsed = 0;
        this.isFlying = true;

        // 2. Konumları Güncelle
        this.startPos.copy(newStartPosition || this.mesh.position); // Yeni başlangıç konumu varsa kullan, yoksa mevcut konumu kullan
        this.targetPos.copy(newTargetPosition);
        this.flightTime = newFlightTime || this.flightTime;

        // Füze modelini başlangıç konumuna taşı
        this.mesh.position.copy(this.startPos);

        // 3. Balistik Hızları Yeniden Hesapla
        const distanceXZ = new THREE.Vector2(this.targetPos.x - this.startPos.x, this.targetPos.z - this.startPos.z).length();
        const deltaY = this.targetPos.y - this.startPos.y;

        // Vxz = Yatay Mesafe / Uçuş Süresi
        const vxz = distanceXZ / this.flightTime;

        // Vy0 = (deltaY + 0.5 * g * t^2) / t
        this.vy0 = (deltaY + 0.5 * this.gravity * this.flightTime * this.flightTime) / this.flightTime;

        // Yeni XZ hareket vektörünü hesapla
        const directionXZ = new THREE.Vector3(this.targetPos.x - this.startPos.x, 0, this.targetPos.z - this.startPos.z).normalize();
        this.velocityXZ = directionXZ.multiplyScalar(vxz);

        // console.log("Füze tekrar fırlatılmaya hazır.");
    }

    /**
     * Füzenin konumunu zamanla günceller. Bu fonksiyon `requestAnimationFrame` döngüsü içinde çağrılmalıdır.
     * @param {number} deltaTime Geçen süre (saniye).
     */
    update(deltaTime) {
        if (!this.isFlying) return;

        this.timeElapsed += deltaTime;
        const t = this.timeElapsed;

        // Eğer süre dolduysa, uçuşu durdur ve hedefe tam olarak konumlandır.
        if (t >= this.flightTime) {
            this.mesh.position.copy(this.targetPos);
            this.isFlying = false;
            // console.log("Füze hedefe ulaştı.");
            return;
        }

        // --- Yeni Konum Hesaplaması (Balistik Denklemler) ---

        // X ve Z koordinatları (Sabit Hız)
        this.mesh.position.x = this.startPos.x + this.velocityXZ.x * t;
        this.mesh.position.z = this.startPos.z + this.velocityXZ.z * t;

        // Y koordinatı (Yerçekimi Etkisi)
        // Y(t) = Y0 + Vy0 * t - 0.5 * g * t^2
        this.mesh.position.y = this.startPos.y + (this.vy0 * t) - (0.5 * this.gravity * t * t);
    }

    // İsteğe bağlı: Kırmızı Kesik Çizgiyi (Trajectory) çizmek için
    // Bu, yörüngeyi önceden görselleştirmek için kullanılır.
    createTrajectoryLine(startPos, targetPos, flightTime, gravity, segments = 50) {
        // *** YENİ ÇAĞRI ***
        const points = this.calculateTrajectoryPoints(startPos, targetPos, flightTime, gravity, segments);
        // *******************

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineDashedMaterial({
            color: 0xff0000,
            linewidth: 1,
            scale: 1,
            dashSize: 0.2,
            gapSize: 0.1,
        });

        const line = new THREE.Line(geometry, material);
        line.computeLineDistances();
        this.trajectoryLine = line
        return line;
    }

    setInterval(sourcePos, targetPos, desiredFlightTime, gravity, onTouchGround) {
        if (this.intervalID != undefined) {
            clearInterval(this.intervalID)
            console.log("cleared")
        } else {
            console.log("not cleared:", this.intervalID)
        }
        var lastPoint = targetPos()
        this.intervalID = setInterval(() => {
            if (this.isActive || !this.closed) {
                onTouchGround(lastPoint)

                lastPoint = targetPos()
                const newPoints = this.calculateTrajectoryPoints(sourcePos, targetPos(), desiredFlightTime,
                    gravity);
                if (this.trajectoryLine?.geometry != undefined) {
                    this.trajectoryLine?.geometry.setFromPoints(newPoints);
                    this.trajectoryLine.geometry.attributes.position.needsUpdate = true;
                    this.trajectoryLine?.computeLineDistances(); // Kesikli çizgiyi korumak için
                }
                this.reset(
                    sourcePos,
                    targetPos(),
                    desiredFlightTime)
            }
        }, desiredFlightTime * 1000 + 100);
    }
}

export class MuzzleFlashAnimator {
    textures = [];
    sprite;
    loaded = false;
    intervalId;

    /**
     * @param rifle          Sprite'ın ekleneceği obje (namlu ucu olarak kullandığın THREE.Object3D)
     * @param imagePaths     Frame frame oynatılacak PNG dosyalarının yolları
     * @param frameDuration  Her frame'in gösterim süresi (ms)
     * @param loop           Animasyon sonunda tekrar başlatılsın mı?
     * @param random         true ise her döngüde frame sırasını rastgele sırala
     */
    constructor(
        rifle,
        imagePaths,
        frameDuration,
        loop,
        random,
        positionOffset = new THREE.Vector3(0, 0.08, 0.7)
    ) {
        this.rifle = rifle
        this.imagePaths = imagePaths
        this.frameDuration = frameDuration
        this.loop = loop
        this.random = random
        this.positionOffset = positionOffset
        this.loadTextures();
    }

    loadTextures() {
        let count = 0;
        const loader = new THREE.TextureLoader();
        this.imagePaths.forEach((path, i) => {
            loader.load(path, tex => {
                this.textures[i] = tex;
                count++;
                if (count === this.imagePaths.length) {
                    this.loaded = true;
                    this.createSprite();
                }
            });
        });
    }

    createSprite() {
        this.sprite = new THREE.Sprite(
            new THREE.SpriteMaterial({
                map: this.textures[0],
                transparent: true,
                depthWrite: false
            })
        );
        this.sprite.scale.set(0.5, 0.5, 1);
        this.sprite.position.set(this.positionOffset.x, this.positionOffset.y, this.positionOffset.z);
        this.sprite.visible = false;
        this.rifle.add(this.sprite);
    }



    /** Animasyonu başlatır */
    play() {
        if (!this.loaded || !this.sprite) return;
        this.stop();

        // Oynatma sırasını hazırla
        let sequence = [...this.textures];
        if (this.random) {
            // Fisher–Yates shuffle
            for (let i = sequence.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [sequence[i], sequence[j]] = [sequence[j], sequence[i]];
            }
        }

        let frameIndex = 0;
        this.sprite.visible = true;

        this.intervalId = window.setInterval(() => {
            this.sprite.material.map = sequence[frameIndex];
            this.sprite.material.needsUpdate = true;
            frameIndex++;

            if (frameIndex >= sequence.length) {
                if (this.loop) {
                    // loop: yeniden hazırla (rastgeleyse tekrar shuffle et)
                    sequence = [...this.textures];
                    if (this.random) {
                        for (let i = sequence.length - 1; i > 0; i--) {
                            const j = Math.floor(Math.random() * (i + 1));
                            [sequence[i], sequence[j]] = [sequence[j], sequence[i]];
                        }
                    }
                    frameIndex = 0;
                } else {
                    this.stop();
                }
            }
        }, this.frameDuration);
    }

    /** Animasyonu durdurur ve sprite'ı gizler */
    stop() {
        if (this.intervalId != null) {
            clearInterval(this.intervalId);
            this.intervalId = undefined;
        }
        if (this.sprite) {
            this.sprite.visible = false;
        }
    }
}

/**
 * Belirlenen minimum ve maksimum değerler arasında ondalıklı rastgele bir sayı döndürür.
 * @param {number} min - Rastgele sayının alt sınırı (dahil).
 * @param {number} max - Rastgele sayının üst sınırı (hariç).
 * @returns {number} Rastgele oluşturulmuş sayı.
 */
export function getRandomFloat(min, max) {
    return Math.random() * (max - min) + min;
}
export function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// export class FabrikLeftArm2 {
//     chain;
//     tmpV1 = new THREE.Vector3();
//     tmpV2 = new THREE.Vector3();
//     tmpV3 = new THREE.Vector3();
//     qWorld = new THREE.Quaternion();
//     qLocal = new THREE.Quaternion();
//     parentQ = new THREE.Quaternion();
//     parentQInv = new THREE.Quaternion();

//     /**
//      * @param bones  sırayla: leftArm, leftForeArm, leftHand
//      * @param target Elin gitmesi gereken global hedef objesi
//      * @param iters  Kare başına CCD tur sayısı (default = 2)
//      */
//     constructor(
//         bones: { shoulder: THREE.Bone; elbow: THREE.Bone; wrist: THREE.Bone },
//         public target: THREE.Object3D,
//         private iters = 3
//     ) {
//         this.chain = [bones.shoulder, bones.elbow, bones.wrist];
//     }

//     /** AnimMixer.update sonrası çağırın. */
//     update() {
//         const [shoulder, elbow, wrist] = this.chain;

//         for (let step = 0; step < this.iters; step++) {
//             /* zinciri geriden (dirsek) öne (omuz) çöz */
//             for (let i = this.chain.length - 2; i >= 0; i--) {
//                 const bone = this.chain[i];
//                 const parent = bone.parent!;

//                 parent.updateWorldMatrix(true, false);

//                 const bonePos = bone.getWorldPosition(this.tmpV1);   // tmpV1
//                 const effector = wrist.getWorldPosition(this.tmpV2);  // tmpV2
//                 const targetPos = this.target.getWorldPosition(this.tmpV3); // tmpV3 NEW

//                 const vToEff = this.tmpV2.subVectors(effector, bonePos).normalize();
//                 const vToTgt = this.tmpV3.subVectors(targetPos, bonePos).normalize();

//                 if (vToEff.dot(vToTgt) > 0.999) continue;

//                 this.qWorld.setFromUnitVectors(vToEff, vToTgt);

//                 parent.getWorldQuaternion(this.parentQ);
//                 this.parentQInv.copy(this.parentQ).invert();

//                 this.qLocal.copy(this.parentQInv)
//                     .multiply(this.qWorld)
//                     .multiply(this.parentQ);

//                 bone.quaternion.premultiply(this.qLocal);
//                 bone.updateMatrix();
//                 parent.updateWorldMatrix(true, true);
//             }


//             /* yakınlaştıysak erken çık */
//             // if (
//             //   wrist.getWorldPosition(this.tmpV1)
//             //        .distanceTo(this.target.getWorldPosition(this.tmpV2)) < 0.002
//             // ) break;
//         }
//     }
// }

export class BB8Controller {
    onBoom;
    prefab;
    player;
    /** Robotun sahnede hareket eden kök düğümü (translate bunun üstünden yapılır) */
    root;
    /** Alttaki yuvarlanan küre mesh’i (yalnızca döndürülür) */
    sphere;
    /** İsteğe bağlı: üstteki baş/kafa parçası (yalnızca yaw veririz) */
    head;

    /** Dünya uzayında “yukarı” vektörü (Y-up sahne için {0,1,0}) */
    up;

    /** Hız (birim/sn) – doğrusal yaklaşma hızı */
    speed = 1.5;

    isActive = false;

    /** Kürenin DÜNYA ölçeğine göre etkili yarıçapı (metre/piksel birimi) */
    radius;

    /** Hedefe kaç birimde “vardı” sayalım? (overshoot/jitter engeller) */
    arriveEpsilon = 0.01;

    /** Hedef (veya world-pos) */
    _target = null;

    /** Head için yumuşatma (0=anlık, ~5-10 iyi) */
    headYawDamping = 8;

    // maxSpeed = 10;   // tepe hız (units/sec)
    maxSpeed = 1.5;   // tepe hız (units/sec)
    maxAccel = 6.0;   // ivme sınırı (units/sec^2)
    slowRadius = .3;   // bu mesafeden sonra target'a yaklaşırken hız kısılır
    turnSlowK = 0.4;   // 0..1 sert dönüşte hız kesme katsayısı
    jitterAmp = 0.10;  // 0..1: maxSpeed'in yüzdesi kadar dalgalanma
    jitterFreq = 0.7;   // Hz: saniyedeki dalgalanma frekansı

    _vel = new THREE.Vector3();  // world-space hız vektörü (XZ)
    _time = 0;
    _jitterPhase = Math.random() * Math.PI * 2;

    lifeTime = 0
    boomDistance = 1

    _tmp = {
        worldTarget: new THREE.Vector3(),
        worldPos: new THREE.Vector3(),
        disp: new THREE.Vector3(),
        flatDir: new THREE.Vector3(),
        axis: new THREE.Vector3(),
        qRoll: new THREE.Quaternion(),
        qHeadFrom: new THREE.Quaternion(),
        qHeadTo: new THREE.Quaternion(),
        eulerHead: new THREE.Euler(0, 0, 0, "YXZ"),
        worldScale: new THREE.Vector3(),
        vNorm: new THREE.Vector3(),
        steer: new THREE.Vector3(),
    };

    kill(reason = "") {
        // console.log("kill", reason)
        this.isActive = false
        this.root.visible = false
        SceneManager.base?.hitTable.removeByController(this)
        // this.root.setPosition(this.prefab.position)
    }

    pool(position) {
        this.root.setPosition(position)
        this.root.visible = true
        this.lifeTime = 0
        this.isActive = true
    }

    update(delta) {
        if (!this.isActive || !this._target || delta <= 0) return;
        const { worldTarget, worldPos, disp, flatDir, axis, qRoll, qHeadFrom, qHeadTo, eulerHead, vNorm, steer } = this._tmp;

        if (this.root.worldPosition().distanceTo(this.player.worldPosition()) <= this.boomDistance) {
            this.kill("reason: boom")
            this.onBoom(this)
        }

        // Zaman ilerlet (wobble için)
        this._time += delta;
        this.lifeTime += 1;

        // hedef ve mevcut world pozisyonu
        this.getTargetWorldPos(worldTarget);
        this.root.getWorldPosition(worldPos);

        // XZ displacement
        disp.set(worldTarget.x - worldPos.x, 0, worldTarget.z - worldPos.z);
        const distSq = disp.lengthSq();
        if (distSq <= this.arriveEpsilon * this.arriveEpsilon) {
            // hedefteyken tamamen dur
            this._vel.set(0, 0, 0);
            return;
        }
        const dist = Math.sqrt(distSq);
        flatDir.copy(disp).multiplyScalar(1 / dist); // normalize

        // --- hedef hız profili ---
        // 1) Arrival: slowRadius içinde yumuşak azaltma (smoothstep)
        const s = this.slowRadius > 1e-6 ? Math.min(1, dist / this.slowRadius) : 1;
        const smooth = s * s * (3 - 2 * s); // smoothstep(0..1)
        let targetSpeed = this.maxSpeed * smooth;

        // 2) Sert dönüşte hız kes (hız vektörü yönü vs. hedef yön)
        let turnFactor = 1;
        if (this._vel.lengthSq() > 1e-8) {
            vNorm.copy(this._vel).normalize();
            const cosA = THREE.MathUtils.clamp(vNorm.dot(flatDir), -1, 1);
            const ang = Math.acos(cosA); // 0..PI
            turnFactor = 1 - this.turnSlowK * (ang / Math.PI); // 1 -> düz; 1-turnSlowK -> 180°
        }
        targetSpeed *= turnFactor;

        // 3) Wobble (hafif dalgalanma)
        if (this.jitterAmp > 0 && this.jitterFreq > 0) {
            const wobble = 1 + this.jitterAmp * Math.sin(2 * Math.PI * this.jitterFreq * this._time + this._jitterPhase);
            targetSpeed *= wobble;
            // abartıyı kes
            targetSpeed = THREE.MathUtils.clamp(targetSpeed, 0, this.maxSpeed * (1 + this.jitterAmp));
        }

        // Hedef hız vektörü
        steer.copy(flatDir).multiplyScalar(targetSpeed); // desiredVel

        // --- steering: ivme sınırlı hız uyumu ---
        steer.sub(this._vel); // needed deltaV
        const maxDeltaV = this.maxAccel * delta;
        const steerLen = steer.length();
        if (steerLen > maxDeltaV) steer.multiplyScalar(maxDeltaV / steerLen);
        this._vel.add(steer);

        // XZ'de kal
        this._vel.y = 0;

        // Bu framede katedilecek mesafe
        let moveLen = this._vel.length() * delta;
        // hedefi overshoot etme
        if (moveLen > dist) {
            moveLen = dist;
            if (delta > 0) this._vel.setLength(dist / delta);
        }

        // yeni world pozisyon = worldPos + vel*dt
        worldPos.addScaledVector(this._vel, delta);

        // world -> local yaz
        const parent = this.root.parent;
        if (parent) parent.worldToLocal(worldPos);
        this.root.position.copy(worldPos);

        // Küre yuvarlama (yol/radyus)
        if (this.radius > 1e-6 && moveLen > 0) {
            axis.crossVectors(this.up, this._vel.lengthSq() > 1e-12 ? vNorm.copy(this._vel).normalize() : flatDir).normalize();
            const angle = moveLen / this.radius;
            qRoll.setFromAxisAngle(axis, angle);
            this.sphere.quaternion.premultiply(qRoll);
        }

        // Head yaw (hareket yönüne bak)
        // if (this.head) {
        //     if (this._vel.lengthSq() > 1e-10) {
        //         const yaw = Math.atan2(this._vel.x, this._vel.z);
        //         qHeadFrom.copy(this.head.quaternion);
        //         eulerHead.set(0, yaw, 0);
        //         qHeadTo.setFromEuler(eulerHead);
        //         const t = 1 - Math.exp(-this.headYawDamping * delta);
        //         this.head.quaternion.slerpQuaternions(qHeadFrom, qHeadTo, t);
        //     }
        // }
    }

    updateLineer(delta) {
        if (!this._target || delta <= 0) return;
        const { worldTarget, worldPos, disp, flatDir, axis, qRoll, qHeadFrom, qHeadTo, eulerHead } = this._tmp;

        // hedef world-pos
        this.getTargetWorldPos(worldTarget);

        // KÖK dünya pozisyonu
        this.root.getWorldPosition(worldPos);

        // XZ'de displacement
        disp.set(worldTarget.x - worldPos.x, 0, worldTarget.z - worldPos.z);

        // karekökü geciktir
        const eps2 = this.arriveEpsilon * this.arriveEpsilon;
        const distSq = disp.lengthSq();
        if (distSq <= eps2) return;

        const dist = Math.sqrt(distSq);
        const step = Math.min(dist, this.speed * delta);

        // normalize yön
        flatDir.copy(disp).multiplyScalar(1 / dist);

        // yeni WORLD pozisyon
        worldPos.addScaledVector(flatDir, step);

        // world -> local yaz (parent dönükse doğru yön)
        const parent = this.root.parent;
        if (parent) parent.worldToLocal(worldPos);
        this.root.position.copy(worldPos);

        // Küre yuvarlama
        if (this.radius > 1e-6 && step > 0) {
            const angle = step / this.radius;
            axis.crossVectors(this.up, flatDir).normalize();
            qRoll.setFromAxisAngle(axis, angle);
            this.sphere.quaternion.premultiply(qRoll);
        }

        // Head yaw (yumuşatma)
        // if (this.head) {
        //     const yaw = Math.atan2(flatDir.x, flatDir.z);
        //     this.head.quaternion.copy(
        //         this.head.quaternion.slerp(
        //             qHeadTo.setFromEuler(eulerHead.set(0, yaw, 0)),
        //             (1 - Math.exp(-this.headYawDamping * delta))
        //         )
        //     );
        // }
    }

    // --- patch: allocation'sız
    distanceToTargetXZ() {
        const a = this._tmp.worldPos;
        const b = this._tmp.worldTarget;
        this.root.getWorldPosition(a);
        const t = this.getTargetWorldPos(b);
        if (!t) return Infinity;
        const dx = b.x - a.x, dz = b.z - a.z;
        return Math.hypot(dx, dz);
    }

    constructor(opts) {
        this.onBoom = opts.onBoom;
        this.prefab = opts.prefab;
        this.player = opts.player;
        this.root = opts.root;
        this.sphere = opts.sphere;
        this.head = opts.head;
        this.radius = opts.radius;
        if (opts.speed !== undefined) this.speed = opts.speed;
        this.up = opts.up?.clone() ?? new THREE.Vector3(0, 1, 0);

        // sphere world-scale dikkate alınarak efektif yarıçapı ayarla
        this.recalculateEffectiveRadius();
    }

    /** Model scale değiştiyse çağır: kürenin efektif yarıçapını günceller */
    recalculateEffectiveRadius() {
        this.sphere.getWorldScale(this._tmp.worldScale);
        // BB-8 küresi uniform ölçekli varsayımı (değilse ortalama al)
        const uniform = (this._tmp.worldScale.x + this._tmp.worldScale.y + this._tmp.worldScale.z) / 3;
        this.radius = this.radius * uniform;
    }

    setTarget(t) { this._target = t; }
    getTargetWorldPos(out = new THREE.Vector3()) {
        if (!this._target) return null;
        if (this._target.isObject3D) {
            this._target.getWorldPosition(out);
        } else {
            out.copy(this._target);
        }
        return out;
    }
}

/**
 * Belirtilen merkez noktasının etrafındaki bir küresel alanda (küresel kabuk),
 * merkezi bir 'yasak bölgeyi' dışlayarak rastgele bir Vector3 döndürür.
 *
 * @param {THREE.Vector3} center Spawn alanının merkezi.
 * @param {number} maxRadius Genel spawn alanının dış yarıçapı.
 * @param {number} exclusionRadius Merkezdeki dışlanacak kürenin yarıçapı (sizin "X birim çap" dediğiniz yerin yarıçapı).
 * @returns {THREE.Vector3} Spawn edilecek obje için rastgele Vector3 pozisyonu.
 */
export function getRandomSpawnPoint(center, maxRadius, exclusionRadius) {
    if (exclusionRadius >= maxRadius) {
        console.warn("Exclusion radius is greater than or equal to max radius. Returning center point as a fallback.");
        return center.clone(); // Ya da hata fırlatılabilir/null dönebilir.
    }

    const R_min = exclusionRadius;
    const R_max = maxRadius;

    // 1. Rastgele bir yarıçap (r) seçimi.
    // Düzgün bir hacim dağılımı için, r^2 veya r^3'e orantılı bir dağılım gerekir.
    // Küre hacmi r^3'e orantılıdır, bu yüzden r^3'ü uniform rastgele seçip, r'yi küp kökü almalıyız.
    // [R_min^3, R_max^3] aralığında rastgele bir değer seçin:
    const minVolumeFactor = R_min * R_min * R_min;
    const maxVolumeFactor = R_max * R_max * R_max;

    // Math.random() [0, 1) arasında uniform rastgele bir sayı üretir.
    const randVolumeFactor = Math.random() * (maxVolumeFactor - minVolumeFactor) + minVolumeFactor;

    // r'yi elde etmek için küp kök alın:
    const r = Math.cbrt(randVolumeFactor);

    // 2. Küre üzerinde rastgele bir yön seçimi (Uniform dağılım)
    // Three.js'in MathUtils veya Vector3 metotlarını kullanabiliriz:
    const phi = THREE.MathUtils.randFloat(0, Math.PI * 2); // Azimuthal açı (0 - 2PI)
    const theta = Math.acos(THREE.MathUtils.randFloat(-1, 1)); // Polar açı (0 - PI)

    // 3. Küresel koordinatları Kartesyen koordinatlara dönüştürme:
    // x = r * sin(theta) * cos(phi)
    // y = r * sin(theta) * sin(phi)
    // z = r * cos(theta)

    const x = r * Math.sin(theta) * Math.cos(phi);
    // const y = r * Math.sin(theta) * Math.sin(phi);
    const y = 0;
    const z = r * Math.cos(theta);

    // 4. Vector3 oluşturma ve merkeze göre ofsetleme
    const randomPoint = new THREE.Vector3(x, y, z);

    // Merkezi pozisyonu ekleyerek dünya koordinatlarına çevirme
    randomPoint.add(center);

    return randomPoint;
}
