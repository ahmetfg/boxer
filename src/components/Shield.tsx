import * as THREE from 'three';
import { SceneManager } from './SceneManager.tsx';

export class Shield {
    circleModel: THREE.Object3D
    // propModel: THREE.Object3D
    player: THREE.Object3D
    level = 1
    active = false

    setActive(value: boolean) {
        this.active = value
        this.circleModel.visible = value
        if (SceneManager.base) {
            SceneManager.base.torus.visible = value
        }
    }

    constructor(model: THREE.Object3D, player: THREE.Object3D) {
        this.circleModel = model
        this.player = player
        this.setActive(this.active)
    }

    update() {
        if (this.active) {
            // shield logic
            if (SceneManager.base?.enemies) {
                for (let index = 0; index < SceneManager.base.bb8Controller.length; index++) {
                    const enemy = SceneManager.base.bb8Controller[index];
                    const distance = enemy.root.position.distanceTo(this.player.position)
                    if (distance <= 1.5) {
                        SceneManager.base?.onShield(enemy)
                    }
                }
            }

            // attach and animation
            this.circleModel.setPosition(this.player?.worldPosition())

            // reset
            if (this.circleModel.rotation.y >= 360) {
                this.circleModel.rotation.y = 0
            }

            this.circleModel.rotation.y += .5
        }
    }
}