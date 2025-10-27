
import { SceneManager } from './SceneManager.js';

export class Shield {
    circleModel
    // propModel
    player
    level = 1
    active = false

    setActive(value) {
        this.active = value
        this.circleModel.visible = value
        if (SceneManager.base) {
            SceneManager.base.torus.visible = value
        }
    }

    constructor(model, player) {
        this.circleModel = model
        this.player = player
        this.setActive(this.active)
    }

    update(deltaTime) {
        if (!SceneManager.base) return
        if (this.active) {
            // shield logic
            if (SceneManager.base.activeBb8Count > 0) {
                for (let index = 0; index < SceneManager.base.bb8Controller.length; index++) {
                    const enemy = SceneManager.base.bb8Controller[index];
                    if (enemy.isActive) {
                        const distance = enemy.root.position.distanceTo(this.player.position)
                        if (distance <= 1.5) {
                            SceneManager.base.onShield(enemy)
                        }
                    }
                }
            }

            // attach and animation
            this.circleModel.setPosition(this.player?.worldPosition())

            this.circleModel.rotation.y += 1 * deltaTime;

            // Reset (360 derece = 2 * PI radyan)
            // Radyan kullandığınız için 360 yerine 2 * Math.PI kullanmalısınız.
            if (this.circleModel.rotation.y >= 2 * Math.PI) {
                this.circleModel.rotation.y -= 2 * Math.PI; // Fazlalığı çıkararak sıfırlama yapın
            }
        }
    }
}