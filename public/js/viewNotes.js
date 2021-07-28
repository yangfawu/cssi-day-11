console.log("script running");

// # Firebase
const AUTH = firebase.auth();
const DB = firebase.database();

// # DOM
const get = selector => document.querySelector(selector);
const box = get("div#app");

// cards' global reference
const CARD_REF = {}; // key is cardId, value is card {}

// # MODAL
const MODAL = {
    node: get("#editNoteModal"),
    titleInput: get("#editTitleInput"),
    noteInput: get("#editTextInput"),
    labelsInput: get("#editLabelsInput"),
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
        this.labelsInput.value = '';
        
        // remove all event listeners from save button
        const ref = this.saveButton;
        const copy = ref.cloneNode(true);
        ref.parentNode.replaceChild(copy, ref);
        this.saveButton = copy;
    },
    val() {
        return {
            title: `${this.titleInput.value}`.trim(),
            note: `${this.noteInput.value}`.trim(),
            labels: [...new Set(`${this.labelsInput.value}`
                        .trim()
                        .split(',')
                        .map(label => label.trim())
                        .filter(label => !!label)
                    )]
        }
    },
    open(key) {
        this.clear();
        this.show();

        const card = CARD_REF[key];
        with (card.data) {
            this.titleInput.value = title;
            this.noteInput.value = note;
            this.labelsInput.value = labels;
        }        
        
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
MODAL.cancelButton.addEventListener('click', () => {
    MODAL.clear();
    MODAL.hide();
});

const COLOR_MODES = 6;
const formCard = (key, val) => {
    const data = {
        title: val.title || "",
        note: val.note || "",
        labels: Object.values(val.labels || {}).join(", ")
    };

    const node = document.createElement("div");
    node.classList.add("column", "is-one-quarter");
    node.innerHTML = `
        <div class="card special-color-${Math.floor(Math.random() * COLOR_MODES)}">
            <header class="card-header">
                <p class="card-header-title"></p>
            </header>
            <div class="card-content">
                <div class="content">
                    <p></p>
                    <p></p>
                </div>
            </div>
            <footer class="card-footer">
                <a class="card-footer-item" href="javascript:void(0)">Edit</a>
                <a href="javascript:void(0)" class="card-footer-item">Delete</a>
            </footer>
        </div>
    `;

    const titleNode = node.querySelector("header > p.card-header-title");
    const labelsNode = node.querySelector("div.card-content > div > p:first-of-type");
    const contentNode = node.querySelector("div.card-content > div > p:last-of-type");
    
    const editButton = node.querySelector("footer > a:first-of-type");
    editButton.addEventListener("click", () => {
        // makes sure the card still exists
        if (!CARD_REF[key])
            return;

        MODAL.open(key);
    });

    const deleteButton = node.querySelector("footer > a:last-of-type");
    deleteButton.addEventListener("click", () => {
        // makes sure the card still exists
        if (!CARD_REF[key])
            return;

        const user = AUTH.currentUser;
        if (!user)
            return window.alert("Cannot delete card: user is not logged in.");

        if (window.confirm("Are you sure you want to delete this note?"))
            DB.ref(`/notes/${user.uid}/${key}`).set(null, err => {
                if (!err)
                    return;

                window.alert("Failed to delete card. Reason: see console");
                console.error(err);
            });
    });

    const instance = {
        node,
        data,
        _helperSetter(target, node, value, prefix="") {
            const input = `${value}`.trim();
            data[target] = input;
            node.innerText = [prefix, input || `[no ${target}]`]
                                .filter(str => !!str.trim())
                                .join(" ");
        },
        setTitle(newTitle) {
            this._helperSetter("title", titleNode, newTitle);
        },
        setLabels(newLabels) {
            this._helperSetter("labels", labelsNode, newLabels, "Labels:");
        },
        setNote(newNote) {
            this._helperSetter("note", contentNode, newNote);
        },
        remove() {
            node.remove();
            delete CARD_REF[key];
        }
    };
    instance.setTitle(data.title);
    instance.setNote(data.note);
    instance.setLabels(data.labels);

    CARD_REF[key] = instance;

    return node;
}

const DB_REFS = [];
AUTH.onAuthStateChanged(user => {
    if (!user)
        return window.location.href = "./index.html";
    
    const prevCardKeys = Object.keys(CARD_REF);
    for (const key of prevCardKeys)
        CARD_REF[key].remove();

    while (DB_REFS.length) {
        DB_REFS[0].off();
        DB_REFS.splice(0, 1);
    }

    const REF = DB.ref(`/notes/${user.uid}`);
    DB_REFS.push(REF);
    REF.on("value", snap => {
        const cardsDict = snap.val();
        if (!cardsDict) {
            // no notes
            const currKeys = Object.keys(CARD_REF);
            for (const key of currKeys)
                CARD_REF[key].remove();
            return;
        }
        
        const cardKeys = Object.keys(cardsDict);
        const oldCardKeys = Object.keys(CARD_REF);

        for (const oldKey of oldCardKeys) {
            const currentCard = CARD_REF[oldKey];

            const newIndex = cardKeys.indexOf(oldKey);
            if (newIndex < 0) {
                // if an old key is not in the new card keys, remove and delete card
                currentCard.remove();
                continue;
            }

            // if an old key is in the new card keys, set the new values
            const newCardData = cardsDict[oldKey];
            currentCard.setTitle(newCardData.title);
            currentCard.setNote(newCardData.note);
            currentCard.setLabels(
                Object.values(newCardData.labels || {})
                    .join(", ")
            );

            // and splice out the that card key from new card keys
            cardKeys.splice(newIndex, 1);
        }

        // now cardKeys should only have keys never seen before
        for (const newKey of cardKeys)
            box.appendChild(formCard(newKey, cardsDict[newKey]));
    });
})