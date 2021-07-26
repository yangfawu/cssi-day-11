console.log("script running");

// # Firebase
const AUTH = firebase.auth();
const DB = firebase.database();

AUTH.onAuthStateChanged(user => {
    if (user)
        return;
    
    window.location.href="./index.html";
})

// # DOM
const get = selector => document.querySelector(selector);

const EDITOR = {
    _busy: false,
    // #
    title: get("#noteTitle"),
    note: get("#noteText"),
    button: get("div.control > button"),
    // #
    lock() {
        this._busy = true;
        this.button.setAttribute("disabled", true);
    },
    unlock() {
        this._busy = false;
        this.button.removeAttribute("disabled");
    },
    val() {
        return {
            title: `${this.title.value}`.trim(),
            note: `${this.note.value}`.trim()
        }
    },
    valid() {
        const { title, note } = this.val();
        return !!title && !!note;
    },
    empty() {
        this.title.value = '';
        this.note.value = '';
    }
}
EDITOR.button.addEventListener('click', () => {
    if (EDITOR._busy)
        return;
    
    if (!EDITOR.valid())
        return window.alert("Invalid inputs.");

    EDITOR.lock();

    const user = AUTH.currentUser;
    if (!user)
        return window.alert("Not logged in.");
    
    DB.ref(`/notes/${user.uid}`)
        .push(
            EDITOR.val(),
            err => {
                EDITOR.unlock();
                if (err) {
                    window.alert("Error occured while adding note.");
                    console.error(err);
                    return;
                }

                EDITOR.empty();
            }
        );
});