import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js"
import {
    getAuth,
    createUserWithEmailAndPassword,
    signOut,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    setPersistence,
    browserLocalPersistence,
    signInWithCustomToken,
    GoogleAuthProvider,
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js"

import {
    initializeFirestore,
    getFirestore,
    collection,
    addDoc,
    setDoc,
    getDoc,
    doc,
    updateDoc,
    serverTimestamp,
    //new
    documentId,
    query,
    where,
    getDocs,
    //new
    limit,
    startAfter,
    orderBy,
    writeBatch,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"

import {
    getDatabase,
    ref,
    get,
    set,
    child,
    update,
    increment,
    onValue,
    push,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js"
import {
    getFunctions,
    httpsCallable,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js"
//10.12.2
//if (isPublished == false) {
if (true) {
    // Your web app's Firebase configuration
    const firebaseConfig = {
        apiKey: "AIzaSyBINhYNSQqx72Udto90MUUMxzk97h3T-4c",
        authDomain: "casegpt-app.firebaseapp.com",
        databaseURL: "https://casegpt-app-default-rtdb.firebaseio.com",
        projectId: "casegpt-app",
        storageBucket: "casegpt-app.firebasestorage.app",
        messagingSenderId: "782892822357",
        appId: "1:782892822357:web:1e38c47acb4298481f89dc",
    }

    try {
        const app = initializeApp(firebaseConfig)
        const auth = getAuth(app)
        initializeFirestore(app, {
            useFetchStreams: false,
        })
        const fdb = getFirestore(app)
        const rdb = getDatabase(app)
        const rdb_ref = ref(rdb)
        const rdb_ref_dir = (path) => ref(rdb, path)
        const functions = getFunctions
        const google_provider = new GoogleAuthProvider()

        // Make specific Firebase functions accessible globally under a single object
        window.Firebase = {
            app: app,
            auth: auth,
            FDB: fdb,
            RDB: rdb,
            functions: functions,
            GoogleProvider: google_provider,

            createUserWithEmailAndPassword: createUserWithEmailAndPassword,
            signOut: signOut,
            signInWithEmailAndPassword: signInWithEmailAndPassword,
            onAuthStateChanged: onAuthStateChanged,
            setPersistence: setPersistence,
            browserLocalPersistence: browserLocalPersistence,
            signInWithCustomToken: signInWithCustomToken,
            signInWithPopup: signInWithPopup,
            signInWithRedirect: signInWithRedirect,
            getRedirectResult: getRedirectResult,

            RDB_ref: rdb_ref,
            RDB_ref_dir: rdb_ref_dir,
            RDB_get: get,
            RDB_set: set,
            RDB_child: child,
            RDB_update: update,
            RDB_increment: increment,
            RDB_onValue: onValue,
            RDB_push: push,

            FDB_collection: collection,
            FDB_addDoc: addDoc,
            FDB_setDoc: setDoc,
            FDB_getDoc: getDoc,
            FDB_doc: doc,
            FDB_updateDoc: updateDoc,
            FDB_serverTimestamp: serverTimestamp,
            FDB_documentId: documentId,
            FDB_query: query,
            FDB_where: where,
            FDB_getDocs: getDocs,
            FDB_limit: limit,
            FDB_startAfter: startAfter,
            FDB_orderBy: orderBy,
            FDB_writeBatch: writeBatch,

            httpsCallable: httpsCallable,
        }

        console.log(
            "Firebase initialized and accessible globally as window.myFirebase"
        )
    } catch (error) {
        alert("Error initializing Firebase: " + error.message)
        console.error("Error initializing Firebase:", error)
    }
}