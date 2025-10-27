// SceneManager.js — Vanilla JS, Global Kapsamda Erişilebilir

// ---------------------------------------------------------------------------
// 1. IMPORT'LAR KALKTI / YARDIMCI KÜTÜPHANELER Global Kapsamda Varsayılır
// ---------------------------------------------------------------------------
// Not: THREE artık globalde (index.html'den yüklendiği için)
// Diğer tüm modüller (Base, UI, Player, vb.) de globalde varsayılır.
import * as THREE from 'three';
// import { Base } from "./Base";
// import * as utils from './Utils.tsx';
// import { PerkArea } from './PerkArea.tsx';
import { AnimationBag } from './AnimationBag.js';
import Signals from './Signals.js';
// import { Controller } from './NumberEffect.js';

// Tip tanımını siliyoruz
// type SceneEntry = {
//     scene: THREE.Scene
//     renderer: THREE.WebGLRenderer
//     mixers: THREE.AnimationMixer[]
// }

export class SceneManager {
    // Statik Özellikler (Global State)
    static _instance; // Singleton için instance
    static registry = new Map();

    // Environment/Runtime değişkenleri (process.env kalktı, window.__PUBLIC_URL__ kullanıldı)
    static PUBLIC_URL = import.meta.env.VITE_PUBLIC_URL || ''; // window.__PUBLIC_URL__ globalde olmalı.

    // Statik Sınıf Instance'ları (Artık tip zorlaması yok)
    static base; // Artık Base
    static perkTurret15; // Artık PerkArea
    static shootables = []; // THREE.Object3D[]
    static missile; // utils.Missile
    static animationBag = new AnimationBag(); // Artık AnimationBag
    // static numberEffectController = new Controller(); // Artık Controller
    static UI; // Artık UI
    static playerInstance; // Artık Player

    // Statik Değişkenler
    static pause = false;
    static magnetTreshold = .6;
    static ammoFactor = 10;
    static basicCellValue = 10;
    static healthPercent = 100;
    static globalClock = new THREE.Clock();

    // Constructor (Singleton Koruması)
    constructor() {
        if (SceneManager._instance) {
            return SceneManager._instance; // Singleton kontrolü
        }
        SceneManager.disableLoupe();
    }

    // Statik Getter (Singleton Erişimi)
    static get instance() {
        if (!SceneManager._instance) {
            SceneManager._instance = new SceneManager();
        }
        return SceneManager._instance;
    }

    // ---------------------------------------------------------------------------
    // STATIK METOTLAR
    // ---------------------------------------------------------------------------

    /**
     * f(x) = a - b * ln(x) formülünü hesaplar.
     *
     * @param {number} x Logaritmanın girdi değeri.
     * @param {number} a Çıkarmanın başlangıç sabiti.
     * @param {number} b Logaritmanın çarpan sabiti.
     * @returns {number} Hesaplanan f(x) değeri.
     */
    static cellValue(x, a, b) {
        if (x <= 0) {
            console.error("Hata: x, doğal logaritma için pozitif bir sayı olmalıdır.");
            return NaN;
        }
        return a - b * Math.log(x);
    };

    static subscribeToRotation() {
        const handleOrientationChange = (e) => {
            Signals.emit("onRotate", !e.matches)
        };
        const landscapeQuery = window.matchMedia("(orientation: landscape)");
        Signals.emit("onRotate", !landscapeQuery.matches)

        landscapeQuery.addEventListener("change", handleOrientationChange);
    }

    static disableLoupe() {
        const handleTouchMove = (e) => { // e:any kaldırıldı
            e.preventDefault();
        }

        document.addEventListener("touchstart", handleTouchMove, {
            passive: false,
        })
    }
    
    // ==== MEMORY MANAGEMENT ====
    // Deep dispose - TypeScript tip tanımlamaları kaldırıldı
    static deepDispose(scene, node) {
        if (!node) return;
        if (node == undefined) return;
        if (!scene) return;

        // Traverse the hierarchy and dispose of resources
        node.traverse(obj => {
            if (obj.geometry) {
                obj.geometry.dispose();
                obj.geometry = undefined;
            }

            if (obj.material) {
                if (Array.isArray(obj.material)) {
                    obj.material.forEach(material => disposeResources(material));
                } else {
                    disposeResources(obj.material);
                }
                obj.material = undefined;
            }
        });

        // Remove the node from its parent and the scene
        if (node.parent) {
            node.parent.remove(node);
        }

        // Helper function to dispose of material and its maps
        function disposeResources(material) {
            if (!material) return;

            const textureMaps = [
                'alphaMap', 'aoMap', 'blendDstAlpha', 'blendEquationAlpha', 'blendSrcAlpha',
                'bumpMap', 'displacementMap', 'emissiveMap', 'envMap', 'lightMap',
                'map', 'metalnessMap', 'normalMap', 'roughnessMap', 'specularMap', 'gradientMap'
            ];

            textureMaps.forEach(mapName => {
                if (material[mapName] && typeof material[mapName].dispose === 'function') {
                    material[mapName].dispose();
                    // Scene'den kaldırma mantığı:
                    if (material[mapName].source && scene) {
                        const objectToRemove = scene.getObjectById(material[mapName].source.uuid);
                        if (objectToRemove) {
                            scene.remove(objectToRemove);
                        }
                    }
                    material[mapName] = undefined;
                }
            });

            // Finally, dispose the material itself
            if (typeof material.dispose === 'function') {
                material.dispose();
            }
        }
        node = undefined;
    }


    // ---------------------------------------------------------------------------
    // INSTANCE METOTLARI
    // ---------------------------------------------------------------------------

    /**
     * Yeni bir sahne kaydı oluştur.
     */
    register(
        scene, // : THREE.Scene kaldırıldı
        renderer, // : THREE.WebGLRenderer kaldırıldı
        mixers = [] // : THREE.AnimationMixer[] kaldırıldı
    ) {
        
        SceneManager.registry.set(scene, { scene, renderer, mixers })
    }

    /**
     * Sahne kaydını sil.
     */
    unregister(scene) { // : THREE.Scene kaldırıldı
        SceneManager.registry.delete(scene)
    }

    disposeAll() {
        console.log(
            `Disposing all scenes: ${SceneManager.registry.size} scene(s) registered.`
        )
        SceneManager.registry.forEach(({ scene, renderer, mixers }) => {
            SceneManager.disposeScene(scene, renderer, mixers)
            SceneManager.registry.delete(scene)
        })
    }

    disposeAllExceptLast() {
        const total = SceneManager.registry.size
        if (total <= 1) return

        console.log(`Disposing ${total - 1} scene(s), keeping the last one.`)
        const keys = Array.from(SceneManager.registry.keys())
        const lastKey = keys[keys.length - 1]

        keys.slice(0, -1).forEach((scene) => {
            const entry = SceneManager.registry.get(scene)
            if (entry) {
                SceneManager.disposeScene(entry.scene, entry.renderer, entry.mixers)
                SceneManager.registry.delete(scene)
            }
        })
    }

    disposeAllExceptFirst() {
        const total = SceneManager.registry.size
        if (total <= 1) return

        console.log(`Disposing ${total - 1} scene(s), keeping the first one.`)
        const keys = Array.from(SceneManager.registry.keys())

        keys.slice(1).forEach((scene) => {
            const entry = SceneManager.registry.get(scene)
            if (entry) {
                SceneManager.disposeScene(entry.scene, entry.renderer, entry.mixers)
                SceneManager.registry.delete(scene)
            }
        })
    }

    disposeSceneEntry(scene) { // : THREE.Scene kaldırıldı
        const entry = SceneManager.registry.get(scene)
        if (!entry) return
        SceneManager.disposeScene(entry.scene, entry.renderer, entry.mixers)
        SceneManager.registry.delete(scene)
    }
    disposeScene(scene, renderer, mixers = []) { // Tip tanımlamaları kaldırıldı
        if (!scene) return;
        if (!renderer) return;

        mixers.forEach((mixer) => {
            mixer.stopAllAction()
            mixer.uncacheRoot(mixer.getRoot())
        })

        scene.traverse((obj) => {
            if (obj.isMesh) {
                if (obj.geometry) {
                    obj.geometry.dispose()
                }
                if (obj.material) {
                    const disposeMaterial = (material) => {
                        for (const key in material) {
                            const value = material[key]
                            if (value && typeof value.dispose === "function") {
                                value.dispose()
                            }
                        }
                        material.dispose()
                    }

                    if (Array.isArray(obj.material)) {
                        obj.material.forEach(disposeMaterial)
                    } else {
                        disposeMaterial(obj.material)
                    }
                }
            }

            if (obj.isSkeletonHelper && obj.geometry) {
                obj.geometry.dispose()
            }
        })

        try {
            scene.traverse((obj) => {
                SceneManager.deepDispose(scene, obj)
            })

        } catch (error) {

        }

        while (scene.children.length > 0) {
            scene.remove(scene.children[0])
        }

        renderer.dispose()

        console.log("Scene ve renderer temizlendi.")
    }
}

// ---------------------------------------------------------------------------
// GLOBAL KAPSAMA AÇILMASI (EN ÖNEMLİ ADIM)
// ---------------------------------------------------------------------------
// Bu sınıfı diğer tüm dosyaların görebilmesi için global window objesine atıyoruz.
window.SceneManager = SceneManager;
// ---------------------------------------------------------------------------