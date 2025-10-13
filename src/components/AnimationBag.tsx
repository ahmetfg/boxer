import * as THREE from 'three';

export class AnimationBag {
    constructor() {
        // root objeye göre mixer eşleştiriyoruz
        this.mixers = new Map();   // root → mixer
        this.actions = new Set();  // bütün aktif action’lar
    }

    /**
     * Root objeye göre mixer getirir veya oluşturur
     * @param {THREE.Object3D} root 
     * @returns {THREE.AnimationMixer}
     */
    _getOrCreateMixer(root) {
        if (!this.mixers.has(root)) {
            const mixer = new THREE.AnimationMixer(root);
            this.mixers.set(root, mixer);
        }
        return this.mixers.get(root);
    }

    /**
     * Yeni bir action kaydeder (ve mixer’ı otomatik oluşturur)
     * @param {THREE.Object3D} root - Modelin root objesi
     * @param {THREE.AnimationClip} clip - Çalınacak clip
     * @param {boolean} [autoPlay=true]
     * @returns {THREE.AnimationAction}
     */
    register(root, clip, autoPlay = true) {
        const mixer = this._getOrCreateMixer(root);
        const action = mixer.clipAction(clip);

        this.actions.add(action);
        if (autoPlay) action.play();

        return action;
    }

    /**
     * Action’ı kayıttan çıkarır
     * @param {THREE.AnimationAction} action 
     */
    unregister(action) {
        this.actions.delete(action);
    }

    /**
     * Bütün mixer’ları update eder
     * @param {number} deltaTime 
     */
    update(deltaTime) {
        for (const mixer of this.mixers.values()) {
            mixer.update(deltaTime);
        }
    }

    /**
     * Mixer’ı tamamen siler (örneğin model sahneden kaldırıldığında)
     * @param {THREE.Object3D} root 
     */
    removeMixer(root) {
        this.mixers.delete(root);
    }

    /**
     * Her şeyi sıfırlar
     */
    clear() {
        this.actions.clear();
        this.mixers.clear();
    }

    /**
     * Tüm animasyonları durdur
     */
    stopAll() {
        for (const action of this.actions) {
            action.stop();
        }
    }

    /**
     * Tüm animasyonların hızını ayarla
     */
    setSpeed(mult) {
        for (const mixer of this.mixers.values()) {
            mixer.timeScale = mult;
        }
    }
}
