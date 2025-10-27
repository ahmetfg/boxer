export class Signals {
    constructor() {
        if (!Signals.instance) {
            this.callbacks = {}
            Signals.instance = this
        }
        return Signals.instance
    }

    subscribe(event, callback) {
        if (!this.callbacks[event]) {
            this.callbacks[event] = []
        }
        this.callbacks[event].push(callback)
    }

    unsubscribe(event, callback) {
        if (!this.callbacks[event]) return

        this.callbacks[event] = this.callbacks[event].filter(
            (cb) => cb !== callback
        )

        if (this.callbacks[event].length === 0) {
            delete this.callbacks[event]
        }
    }

    emit(event, ...args) {
        if (!this.callbacks[event]) return

        this.callbacks[event].forEach((callback) => callback(...args))
    }
}

const instance = new Signals()
Object.freeze(instance)

export default instance