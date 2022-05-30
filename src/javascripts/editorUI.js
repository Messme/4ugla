import Notif from "watnotif";

window.onload = () => {
    let editorparams = window.BasicParams;

    let panels = document.getElementsByClassName("params-panel");
    let buttons = document.getElementsByClassName("params-nav__button");

    for (let i = 0; i < buttons.length; i++) {
        let btn = buttons[i];
        btn.addEventListener("click", () => {
            if (!btn.classList.contains('active')) {
                for (let j = 0; j < buttons.length; j++) {
                    buttons[j].classList.remove('active');

                    let idLPanel = buttons[j].id.slice(4);

                    let LPanel = document.getElementById(idLPanel);
                    LPanel.style.display = "none";
                }

                btn.classList.add('active');

                let idPanel = btn.id.slice(4);
                let panel = document.getElementById(idPanel);
                panel.style.display = "block";
            }
        });
    }

    let colors_bg_ids = {
        "bg-none": {
            enabled: false,
            width: 3,
            material: '',
        },
        "bg-white-mdf": {
            enabled: true,
            width: 3,
            material: 'bg-white-mdf',
        },
        "bg-gray-mdf": {
            enabled: true,
            width: 3,
            material: 'bg-gray-mdf',
        },
        "bg-white-shagreen": {
            enabled: true,
            width: 3,
            material: 'bg-white-shagreen',
        },
        "bg-black-wenge": {
            enabled: true,
            width: 3,
            material: 'bg-black-wenge',
        },
        "bg-milk-oak": {
            enabled: true,
            width: 3,
            material: 'bg-milk-oak',
        },
    }

    let colors_bg_buttons = document.getElementsByClassName("params-bg-colors__button");

    for (let i = 0; i < colors_bg_buttons.length; i++) {
        let btn = colors_bg_buttons[i];

        btn.addEventListener("click", () => {
            editorparams["param-bg"] = colors_bg_ids[btn.id];
            window.dispatchEvent(new CustomEvent('MaterialBGChanged', {}));
        });
    }

    let materials = {
        "white-shagreen": {
            material: "white-shagreen",
        },
        "gray-ldsp": {
            material: "gray-ldsp",
        },
        "black-wenge": {
            material: "black-wenge",
        },
        "milk-oak": {
            material: "milk-oak",
        },
        "white-ldsp": {
            material: "white-ldsp",
        }
    }

    let colors_buttons = document.getElementsByClassName("params-colors__button");

    for (let i = 0; i < colors_buttons.length; i++) {
        let btn = colors_buttons[i];

        btn.addEventListener("click", () => {
            editorparams["param-material"] = materials[btn.id];
            window.dispatchEvent(new CustomEvent('MaterialChanged', {}));
        });
    }

    let nav_buttons = document.getElementsByClassName("nav-panels-btn");

    for (let i = 0; i < nav_buttons.length; i++) {
        let btn = nav_buttons[i];
        let id = btn.name;

        btn.addEventListener("click", () => {
            for (let j = 0; j < panels.length; j++) {
                panels[j].style.display = "none";
            }

            for (let j = 0; j < buttons.length; j++) {
                buttons[j].classList.remove('active');
            }

            document.getElementById(id).style.display = "block";
            document.getElementById('btn-' + id).classList.add('active');
        })
    }

    let edges = {
        "wide-edge": {
            edge: "wide",
        },
        "thin-edge": {
            edge: "thin",
        }
    }

    let edgeButtons = document.getElementsByClassName("params-edge__button");

    for (let i = 0; i < edgeButtons.length; i++) {
        let btn = edgeButtons[i];

        btn.addEventListener("click", () => {
           editorparams["param-edge"] = edges[btn.id];
           window.dispatchEvent(new CustomEvent("TemplateResized", {}))
        });
    }

    let plinthTypes = {
        "plinth-none": {
            minValue: 30,
            maxValue: 120,
            currentValue: 60,
            defaultValue: 60,
            step: 10,
            type: "none",
        },
        "plinth-normal": {
            minValue: 30,
            maxValue: 120,
            currentValue: 60,
            defaultValue: 60,
            step: 10,
            type: "normal",
        },
        "plinth-legs": {
            minValue: 30,
            maxValue: 120,
            currentValue: 27,
            defaultValue: 60,
            step: 10,
            type: "legs",
        }
    }

    let plinthButtons = document.getElementsByClassName("params-plinth__button");

    for (let i = 0; i < plinthButtons.length; i++) {
        let btn = plinthButtons[i];

        btn.addEventListener("click", () => {
            let id = btn.id;

            editorparams["param-plinth"] = plinthTypes[id];
            window.dispatchEvent(new CustomEvent("TemplateResized", {}));
        });
    }

    let template2dButton = document.getElementById("template2dbtn");
    template2dButton.addEventListener("click", () => {
       window.dispatchEvent(new CustomEvent("RenderTemplate2D", {}));
    });

    let template2dViews = {
        "frontView": {
            view: "front",
        },
        "sideView": {
            view: "side",
        },
        "topView": {
            view: "top",
        }
    }

    let template2dnavbuttons = document.getElementsByClassName("template-2d-nav__button");

    for (let i = 0; i < template2dnavbuttons.length; i++) {
        let btn = template2dnavbuttons[i];
        btn.addEventListener("click", () => {
            if (!btn.classList.contains('active')) {
                for (let j = 0; j < buttons.length; j++) {
                    template2dnavbuttons[j].classList.remove('active');
                }

                btn.classList.add('active');

                editorparams["param-template-2d"].view = template2dViews[btn.id].view;

                window.dispatchEvent(new CustomEvent("RenderTemplate2D", {}));
            }
        });
    }

    // Edit/View mode
    let viewModeBtn = document.getElementById("viewmode");
    let editModeBtn = document.getElementById("editmode");

    viewModeBtn.addEventListener("click", () => DisableEditMode());
    editModeBtn.addEventListener("click", () => EnableEditMode());

    // JSON Import/Export buttons
    let importJSONButton = document.getElementById("importjson");
    let exportJSONButton = document.getElementById("exportjson");

    importJSONButton.addEventListener("click", () => ImportJSON());
    exportJSONButton.addEventListener("click", () => ExportJSON());

    // Context Menu
    let contextMenu = document.getElementById("context-menu");
    let ctxOpenButton = document.getElementById("context-open");
    let ctxEditButton = document.getElementById("context-edit");
    let ctxDeleteButton = document.getElementById("context-delete");
    let ctxCloseButton = document.getElementById("context-close");

    ctxOpenButton.addEventListener("click", () => {
        window.dispatchEvent(new CustomEvent("ContextMenuAction", { "detail": { type: "open" } }));
        CloseContextMenuUI(contextMenu);
    });

    ctxEditButton.addEventListener("click", () => {
        CloseContextMenuUI(contextMenu);
    });

    ctxDeleteButton.addEventListener("click", () => {
        window.dispatchEvent(new CustomEvent("ContextMenuAction", { "detail": { type: "delete" } }));
        CloseContextMenuUI(contextMenu);
    });

    ctxCloseButton.addEventListener("click", () => {
        CloseContextMenuUI(contextMenu);
    });

    window.addEventListener("OpenContextMenu", (event) => {
        ctxOpenButton.disabled = !window.context.openCloseBtnEnabled;
        ctxEditButton.disabled = !window.context.editBtnEnabled;

        OpenContextMenuUI(event, contextMenu);
    });
    window.addEventListener("CloseContextMenu", () => {
        CloseContextMenuUI(contextMenu);
    })

    // Modifier Menu
    let modifierTypes = window.ModifierTypes;
    let modifierSelect = document.getElementById("modifierType");
    modifierSelect.innerHTML = "";

    for (let key in modifierTypes) {
        let option = document.createElement("option");

        option.value = modifierTypes[key].type;
        option.innerHTML = modifierTypes[key].description;
        modifierSelect.appendChild(option);
    }

    // Modifier Modal
    let modifierModal = bootstrap.Modal.getOrCreateInstance(document.getElementById("modifier"));

    window.addEventListener("OpenModifierModal", () => {
        modifierModal.show();
    });

    window.addEventListener("CloseModifierModal", () => {
        modifierModal.hide();
    });

    let addModifierButton = document.getElementById("add-modifier-button");
    addModifierButton.addEventListener("click", () => {
        window.dispatchEvent(new CustomEvent("AddModifier", { 'detail': { ModifierType: modifierSelect.value } }));
        window.dispatchEvent(new CustomEvent("CloseModifierModal", {}));
    });
}

function ImportJSON() {
    window.dispatchEvent(new CustomEvent("ImportJSON", {}));
}

function ExportJSON() {
    window.dispatchEvent(new CustomEvent("ExportJSON", {}));
}

function EnableEditMode() {
    window.dispatchEvent(new CustomEvent("EnableEditMode", {}));
}

function DisableEditMode() {
    window.dispatchEvent(new CustomEvent("DisableEditMode", {}));
}

function OpenContextMenuUI(event, contextMenu) {
    contextMenu.style.display = "block";

    let rect = contextMenu.getBoundingClientRect();

    contextMenu.style.left = (event.detail.mouse.x - rect.width/2) + "px";
    contextMenu.style.top = (event.detail.mouse.y - rect.height - 5) + "px";
}

function CloseContextMenuUI(contextMenu) {
    contextMenu.style.display = "none";
}