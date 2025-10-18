import * as THREE from 'three';
import { Base } from "./Base";
import * as utils from './Utils.tsx';
import { PerkArea } from './PerkArea.tsx';
import { AnimationBag } from './AnimationBag.tsx';
import { Controller } from './NumberEffect.tsx';

type SceneEntry = {
    scene: THREE.Scene
    renderer: THREE.WebGLRenderer
    mixers: THREE.AnimationMixer[]
}

export class SceneManager {
    private static _instance: SceneManager
    registry = new Map<THREE.Scene, SceneEntry>()

    static PUBLIC_URL = process.env.PUBLIC_URL; 

    static base: Base | undefined;
    static perkTurret15: PerkArea | undefined;
    static shootables: Array<THREE.Object3D> = []
    static missile: utils.Missile | undefined;
    static animationBag: AnimationBag = new AnimationBag();
    static numberEffectController = new Controller()
    static pause = false

    private constructor() { }

    static get instance(): SceneManager {
        if (!SceneManager._instance) {
            SceneManager._instance = new SceneManager()
        }
        return SceneManager._instance
    }

    /**
     * Yeni bir sahne kaydı oluştur.
     */
    register(
        scene: THREE.Scene,
        renderer: THREE.WebGLRenderer,
        mixers: THREE.AnimationMixer[] = []
    ) {
        this.registry.set(scene, { scene, renderer, mixers })
    }

    /**
     * Sahne kaydını sil.
     */
    unregister(scene: THREE.Scene) {
        this.registry.delete(scene)
    }

    /**
     * Kayıttaki tüm sahne girişlerini dispose et ve kayıttan temizle.
     * Ayrıca temizleme öncesi kayıtlı sahne sayısını konsola yazdırır.
     */
    disposeAll() {
        console.log(
            `Disposing all scenes: ${this.registry.size} scene(s) registered.`
        )
        this.registry.forEach(({ scene, renderer, mixers }) => {
            this.disposeScene(scene, renderer, mixers)
            this.registry.delete(scene)
        })
    }

    /**
     * Yalnızca en son eklenen sahneyi bırakıp diğer tüm sahneleri dispose et ve kayıttan sil.
     */
    disposeAllExceptLast() {
        const total = this.registry.size
        if (total <= 1) return

        console.log(`Disposing ${total - 1} scene(s), keeping the last one.`)
        const keys = Array.from(this.registry.keys())
        const lastKey = keys[keys.length - 1]

        // İlk kayıtları sil
        keys.slice(0, -1).forEach((scene) => {
            const entry = this.registry.get(scene)
            if (entry) {
                this.disposeScene(entry.scene, entry.renderer, entry.mixers)
                this.registry.delete(scene)
            }
        })
    }
    /**
     * Yalnızca en son eklenen sahneyi bırakıp diğer tüm sahneleri dispose et ve kayıttan sil.
     */
    disposeAllExceptFirst() {
        const total = this.registry.size
        if (total <= 1) return

        console.log(`Disposing ${total - 1} scene(s), keeping the first one.`)
        const keys = Array.from(this.registry.keys())

        // İlk kayıt hariç tümünü sil
        keys.slice(1).forEach((scene) => {
            const entry = this.registry.get(scene)
            if (entry) {
                this.disposeScene(entry.scene, entry.renderer, entry.mixers)
                this.registry.delete(scene)
            }
        })
    }

    /**
     * Sadece tek bir sahne girişini dispose et.
     */
    disposeSceneEntry(scene: THREE.Scene) {
        const entry = this.registry.get(scene)
        if (!entry) return
        this.disposeScene(entry.scene, entry.renderer, entry.mixers)
        this.registry.delete(scene)
    }
    disposeScene(scene, renderer, mixers = []) {
        if (!scene) return;
        if (!renderer) return;
        // 1. Animasyonları durdur ve mixer önbelleğini temizle
        mixers.forEach((mixer) => {
            mixer.stopAllAction()
            // Eğer birden fazla mixer aynı kökü paylaşıyorsa:
            mixer.uncacheRoot(mixer.getRoot())
        })

        // 2. Sahnedeki tüm objeleri gez
        scene.traverse((obj) => {
            // 2.a. Mesh objeleri için
            if (obj.isMesh) {
                // Geometriyi dispose et
                if (obj.geometry) {
                    obj.geometry.dispose()
                }
                // Materyalleri dispose et (Array veya tek materyal olabilir)
                if (obj.material) {
                    const disposeMaterial = (material) => {
                        // Doku varsa dispose et
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

            // 2.b. Diğer dispose edilmesi gereken tipler (örneğin SkeletonHelper)
            if (obj.isSkeletonHelper && obj.geometry) {
                obj.geometry.dispose()
            }

            // SceneManager.deepDispose(scene,obj)
        })

        try {
            scene.traverse((obj) => {
                SceneManager.deepDispose(scene, obj)
            })

        } catch (error) {

        }

        // 3. Scene grafiğinden tüm çocukları çıkar
        while (scene.children.length > 0) {
            scene.remove(scene.children[0])
        }

        // 4. Renderer'ı dispose et
        renderer.dispose()

        console.log("Scene ve renderer temizlendi.")
    }

    // ==== MEMORY MANAGEMENT ====
    // Deep dispose
    static deepDispose(scene, node) {
        if (!node) return;
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
}