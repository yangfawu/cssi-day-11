console.log("script running");

// # Firebase
const AUTH = firebase.auth();
const DB = firebase.database();

// # DOM
const get = selector => document.querySelector(selector);
const box = get("div#app");

const MODAL = {
    node: get("#editNoteModal"),
    titleInput: get("#editTitleInput"),
    noteInput: get("#editTextInput"),
    saveButton: get("#saveEdit"),
    cancelButton: get("#cancelEdit"),
    // #
    hide() {
        this.node.classList.remove("is-active");
    },
    show() {
        this.node.classList.add("is-active");
    },
    clear() {
        // empty inputs
        this.titleInput.value = '';
        this.noteInput.value = '';
        
        // remove all event listeners from save button
        const ref = this.saveButton;
        const copy = ref.cloneNode(true);
        ref.parentNode.replaceChild(copy, ref);
        this.saveButton = copy;
    },
    val() {
        return {
            title: `${this.titleInput.value}`.trim(),
            note: `${this.noteInput.value}`.trim()
        }
    },
    open({ key, title, note }) {
        this.clear();
        this.show();

        this.titleInput.value = title;
        this.noteInput.value = note;
        
        const THIS = this;
        this.saveButton.addEventListener('click', () => {
            const user = AUTH.currentUser;
            if (!user)
                return window.alert("Not logged in.");
            
            DB.ref(`/notes/${user.uid}/${key}`).update(THIS.val(), err => {
                if (!err)
                    return THIS.hide();

                window.alert("Cannot save edits. See console.");
                console.log(err); 
            });
        });
    }
}
MODAL.cancelButton.addEventListener('click', () => MODAL.clear());

const createCard = key => {
    // build node
    const node = document.createElement("div");
    node.classList.add("column", "is-one-quarter");
    node.innerHTML = `
        <div class="card">
            <header class="card-header">
                <p class="card-header-title"></p>
            </header>
            <div class="card-content">
                <div class="content"></div>
            </div>
            <footer class="card-footer">
                <a class="card-footer-item" href="javascript:void(0)">Edit</a>
                <a href="javascript:void(0)" class="card-footer-item">Delete</a>
            </footer>
        </div>
    `;

    const titleNode = node.querySelector("header > p");
    const contentNode = node.querySelector("div.card-content > div");
    const editButton = node.querySelector("footer > a:first-of-type");
    const deleteButton = node.querySelector("footer > a:last-of-type");
    const data = {
        title: "",
        note: ""
    }

    // add functionality
    let dead = false;

    const user = AUTH.currentUser;
    if (!user)
        return window.alert("Failed to create card. Reason: not logged in.");

    const REF = DB.ref(`/notes/${user.uid}/${key}`);  
    const deleteCard = () => {
        if (dead)
            return;

        REF.set(null, err => {
            if (err) {
                window.alert("Failed to delete card. Reason: see console");
                console.error(err);
                return;
            }

            dead = true;
            if (node)
                node.parentNode.removeChild(node);
        });
    }
    REF.on("value", snap => {
        const val = snap.val()
        if (dead || !val) {
            REF.off();
            return;
        }
        
        const { title, note } = val;
        if (!title || !note)
            return deleteCard();
        
        data.title = title;
        titleNode.innerText = title;

        contentNode.innerText = note;
        data.note = note;
    });
    deleteButton.addEventListener('click', () => deleteCard());
    editButton.addEventListener('click', () => MODAL.open({ key, ...data }));

    // add card to document
    box.appendChild(node);
}

let init_ed = false;
const init = () => {
    const user = AUTH.currentUser;
    if (!user)
        return;

    init_ed = true;
    DB.ref(`/notes/${user.uid}`).on('child_added', ({ key }) => createCard(key));
}

AUTH.onAuthStateChanged(user => {
    if (user && !init_ed)
        return init();
    
    window.location.href="./index.html";
})