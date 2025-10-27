import * as utils from './Utils.js';

export class PerkArea {
    mesh;
    quad;
    checker;
    player;
    didEnd = true;
    onActivate = () => { };
    onReactivate = () => { };
    id;
    frameCountForPas = 2000
    frameCountForReactivat = undefined
    cost;
    isActive = false;
    visulizeArea = false;
    visuliseDots;

    constructor(scene, mesh, quad, player, cost, frameCountForPass, frameCountForReactivate) {
        // 2) her frame için hızlı versiyon:
        this.checker = utils.XZChecker.createXZQuadChecker(quad, { convex: true }); // dışbükeyse true → daha hızlı
        this.player = player
        this.cost = cost
        this.frameCountForPass = frameCountForPass
        this.mesh = mesh
        this.quad = quad
        this.frameCountForReactivate = frameCountForReactivate

        // make it more crisp
        this.mesh.material.map.anisotropy = 3

        if (this.visulizeArea) {
            this.visuliseDots = [
                utils.AddDebugSphere(scene, .1, 0xff0000ff),
                utils.AddDebugSphere(scene, .1, 0xff0000ff),
                utils.AddDebugSphere(scene, .1, 0xff0000ff),
                utils.AddDebugSphere(scene, .1, 0xff0000ff)
            ]
            this.visuliseDots[0].position.set(this.quad[0].x, this.quad[0].y, this.quad[0].z)
            this.visuliseDots[1].position.set(this.quad[1].x, this.quad[1].y, this.quad[1].z)
            this.visuliseDots[2].position.set(this.quad[2].x, this.quad[2].y, this.quad[2].z)
            this.visuliseDots[3].position.set(this.quad[3].x, this.quad[3].y, this.quad[3].z)
        }
    }

    activateForcefully(){
        this.isActive = true
        this.onActivate()
    }

    update(balance) {
        if (this.isActive == false && this.checker && balance >= this.cost) {
            if (this.checker.containsObj(this.player)) {
                if (this.didEnd == true) {
                    // console.log("start")
                    this.didEnd = false;
                    this.clearPassTimeout()

                    this.id = setTimeout(() => {
                        if (this.didEnd == false) {
                            this.isActive = true
                            this.onActivate()

                            if (this.frameCountForReactivate != undefined) {
                                setTimeout(() => {
                                    this.isActive = false
                                    this.onReactivate()
                                    this.clearPassTimeout()
                                }, this.frameCountForReactivate);
                            } else {
                                this.clearPassTimeout()
                            }
                        }
                    }, this.frameCountForPass);
                }
                // içerde
                return true
            } else {
                this.clearPassTimeout()
                // dışarda
                return false
            }
        } else {
        }
    }

    clearPassTimeout() {
        if (this.id != undefined) {
            // console.log("end")
            clearTimeout(this.id)
            this.didEnd = true;
            this.id = undefined
        }
    }
}