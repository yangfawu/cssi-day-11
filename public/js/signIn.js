console.log("script running");

// # FIREBASE
const authNode = firebase.auth;
const AUTH = authNode();
const provider = new authNode.GoogleAuthProvider();

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

const box = get("#special-inject");
const boxWelcome = get("#special-inject > h1.injected");
AUTH.onAuthStateChanged(user => {
    box.classList[user ? "add" : "remove"]("injected");

    if (user)
        boxWelcome.innerText = `Welcome to 🔥Fire Notes📝, ${user.displayName}!`;
});