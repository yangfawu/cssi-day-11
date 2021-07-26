console.log("script running");

// # FIREBASE
const authNode = firebase.auth;
const AUTH = authNode();
const provider = new authNode.GoogleAuthProvider();

AUTH.onAuthStateChanged(user => {
    if (!user)
        return;
    window.location.href = "./writeNote.html";
});

// # DOM
const get = selector => document.querySelector(selector);

const signInBtn = get("a");
let busy = false;
signInBtn.addEventListener('click', () => {
    if (busy)
        return;
    busy = true;

    AUTH.signInWithPopup(provider)
        .then(() => busy = false)
        .catch(({ message }) => {
            console.log("Ran into issue while logging in:", message);
            busy = false;
        });
});