export class Auth {
    constructor() {}

    static get Firebase() {
        return window["Firebase"]
    }

    static get auth() {
        return window["Firebase"]?.auth
    }

    static get GoogleProvider() {
        return window["Firebase"]?.GoogleProvider
    }

    static get CurrentUser() {
        return this.auth?.currentUser
    }

    static get isSignedInFlag() {
        return localStorage.getItem("isSignedIn")
    }

    static setIsSignedInFlag() {
        localStorage.setItem("isSignedIn", "true")
    }

    static async SignOut() {
        console.log("Log out attempt.")

        // signOut fonksiyonunu çağırın
        return await window.Firebase.signOut(window.Firebase.auth)
            .then(() => {
                localStorage.removeItem("isSignedIn")

                console.log("Successfully logged out.")
            })
            .catch((error) => {
                alert(error)
                throw error
            })
    }

    static async AuthStateReady(callback) {
        return await window.Firebase.auth.authStateReady().then(() => {
            callback(window.Firebase.auth.currentUser)
        })
    }

    static async AuthStateChange() {
        return new Promise((resolve, reject) => {
            window.Firebase.onAuthStateChanged(this.auth, (user) => {
                resolve(user)
            })
        })
    }

    static async SignInWithCustomToken(token) {
        return new Promise(async (resolve, reject) => {
            await this.Firebase.signInWithCustomToken(this.auth, token)
                .then((userCredential) => {
                    // Signed in
                    const user = userCredential.user
                    console.log("succesfully logged in with custom token")
                    resolve(user)
                })
                .catch((error) => {
                    resolve(error)
                })
        })
    }

    static async signInWithGoogle() {
        return new Promise(async (resolve, reject) => {
            try {
                const result = await this.Firebase.signInWithPopup(
                    this.auth,
                    this.GoogleProvider
                )
                // Kullanıcı bilgileri
                const user = result.user
                // create flag
                this.setIsSignedInFlag()

                console.log("Oturum açan kullanıcı:", user)
                resolve(user)
            } catch (error) {
                console.error(
                    "[signInWithGoogle] Google sign-in hatası:",
                    error
                )
                alert(error)
                alert(window.location.href)
                resolve(error)
            }
        })
    }


    static async signInWithGoogleRedirect() {
        this.Firebase.signInWithRedirect(this.auth, this.GoogleProvider)
    }

    static async getGoogleRedirectResult() {
        return new Promise(async (resolve, reject) => {
            this.Firebase.getRedirectResult(this.auth)
                .then((result) => {
                    if (result) {
                        // The signed-in user info.
                        var user = result.user
                        console.log("Oturum açan kullanıcı:", user)
                        resolve(user)
                    } else {
                        console.log("Redirect with null result")
                    }
                })
                .catch((error) => {
                    console.error(
                        "[getGoogleRedirectResult] Google sign-in hatası:",
                        error
                    )
                    resolve(error)
                })
        })
    }

}
