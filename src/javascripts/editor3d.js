import * as THREE from 'three';
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader";
import { Modal } from "bootstrap";
import {max} from "three/examples/jsm/renderers/nodes/ShaderNode";
const rect = require('rectangles');

let params = window.BasicParams;

let debugMode = false;
let editMode = false;
let deleteMode = false;

let WIDTH = 500;
let HEIGHT = 500;

let templateObjects = [];
let textObjects = [];
let raycastObjects = [];

const IObjectTypes = { UnionHandler: "union", ModifierHandler: "modifier", ModifierObject: "modifierObject" }; // Interaction object types
const ModifierTypes = { DoorIn: "DoorIn", DoorOut: "DoorOut", BoxIn: "BoxIn", BoxOut: "BoxOut",
    HorizontalSeparator: "HorizontalSeparator", VerticalSeparator: "VerticalSeparator" };
const Direction = { Left: "left", Right: "right" };

let CellStruct = {
    // Data
    width: 0,               // мм
    height: 0,              // мм
    additiveWidth: 0,       // мм
    additiveHeight: 0,      // мм
    bottomUnion: false,
    rightUnion: false,
    column: 1,
    row: 1,
}

let Grid = [];
let Modifiers = [];

// Three.js Init
let renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: false });
renderer.setSize(WIDTH, HEIGHT);
renderer.setPixelRatio( window.devicePixelRatio );
renderer.setClearColor(0xDDDDDD, 1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.LinearToneMapping;
renderer.physicallyCorrectLights = true;
renderer.toneMappingExposure = 1;
document.getElementById("canvas-placement").appendChild(renderer.domElement);

let canvas = document.getElementById("canvas-placement").children[0];

// Init Scene
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(45, WIDTH / HEIGHT);
camera.position.set(0, 0.7, 3);
scene.add(camera);

// Add lights
const spotLight = new THREE.SpotLight( 0xffffff );
spotLight.castShadow = true;
spotLight.angle = 0.5;
spotLight.decay = 2;
spotLight.penumbra = 0.8;
spotLight.focus = 0.6;
spotLight.power = 15;
spotLight.position.set(1, 0, 5);
scene.add(spotLight);

spotLight.shadow.mapSize.width = 256;
spotLight.shadow.mapSize.height = 256;
spotLight.shadow.camera.near = 0.05;
spotLight.shadow.camera.far = 45;

const spotSkyLight = new THREE.SpotLight( 0xffffff );
spotSkyLight.castShadow = true;
spotSkyLight.angle = 0.5;
spotSkyLight.decay = 2;
spotSkyLight.penumbra = 1;
spotSkyLight.focus = 0.6;
spotSkyLight.power = 15;
spotSkyLight.position.set(-0.5, 0, 4);
scene.add(spotSkyLight);

spotSkyLight.shadow.mapSize.width = 256;
spotSkyLight.shadow.mapSize.height = 256;
spotSkyLight.shadow.camera.near = 0.05;
spotSkyLight.shadow.camera.far = 45;

const aoLight = new THREE.AmbientLight( 0xffffff, 2.65 ); // soft white light
scene.add( aoLight );

const orbitControls = new OrbitControls(camera, renderer.domElement);
orbitControls.enableDamping = true;
orbitControls.dampingFactor = 0.25;
orbitControls.enablePan = false;
// Limit angles
orbitControls.maxPolarAngle = Math.PI / 2;
orbitControls.minPolarAngle = Math.PI / 8;
orbitControls.maxAzimuthAngle = Math.PI / 2.4;
orbitControls.minAzimuthAngle = -Math.PI / 2.4;
// Limit zoom
orbitControls.minDistance = 0.8;
orbitControls.maxDistance = 5;
orbitControls.update();

let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();
let realMouse = new THREE.Vector2();
let intersections;
let intersect, activeUnionHandler, activeModifierHandler;

let basicMaterial = new THREE.MeshPhysicalMaterial( { "roughness": 0.45, "color": 0xffffff } );
let basicBGMaterial = new THREE.MeshPhysicalMaterial( { "roughness": 0.45, "color": 0xffffff } );
let floorMaterial = new THREE.MeshStandardMaterial( { "roughness": 0.6, "color": 0xe3e0d1 } );
let wallMaterial = new THREE.MeshStandardMaterial( { "roughness": 0.6, "color": 0xd1d1d1 } );
let lineMaterial = new THREE.LineBasicMaterial( { color: 0x808080 } );
let legsMaterial = new THREE.MeshStandardMaterial( { "roughness": 0.75, "color": 0x404040 } );
let handleMaterial = new THREE.MeshStandardMaterial({ "roughness": 0.25, "color": 0x606060 });

let materialName = "";
let materialBGName = "";

// Descriptions data
let descWidth = document.getElementById("desc-width");
let descHeight = document.getElementById("desc-height");
let descDepth = document.getElementById("desc-depth");
let descPlinthHeight = document.getElementById("desc-plinth-height");
let descMat = document.getElementById("desc-material");
let descbgmat = document.getElementById("desc-bg-material");
let descEdge = document.getElementById("desc-edge");
let descCost = document.getElementById("desc-cost");
let descMass = document.getElementById("desc-mass");

// Font Init
const matLite = new THREE.MeshBasicMaterial( {
    color: 0x000000,
    transparent: true,
    opacity: 0.75,
    side: THREE.DoubleSide
} );
const loader = new FontLoader();
let fontFace;
loader.load('fonts/helvetiker_regular.typeface.json', function (font) {
    fontFace = font;
    BuildTemplate();
});

// Global data
let x, y, z, thickness, plinthType, plinthLength, columnCount, rowCount, lengthOffset,
    minColumnCount, maxColumnCount, minRowCount, maxRowCount,
    minCellWidth, maxCellWidth, minCellHeight, maxCellHeight;

let fModifierColumn = 0, fModifierRow = 0, tModifierColumn = 0, tModifierRow = 0;

// Update
function Tick() {
    camera.updateMatrixWorld();
    FindIntersections();

    requestAnimationFrame(Tick);
    renderer.render(scene, camera);
    orbitControls.update();
    TextAlignmentToCamera();
}

Tick();
UpdateData();

ChangeMaterial();
MakeDefaultGrid();
BuildTemplate();

window.addEventListener("resize", onWindowResize);
window.addEventListener('load', onWindowResize);
window.addEventListener("TemplateResized", BuildTemplate);
canvas.addEventListener("mousemove", InputUpdate);
canvas.addEventListener("click", OnMouseClick)

function onWindowResize() {
    let placement = document.getElementById("canvas-placement");

    camera.aspect = placement.offsetWidth / placement.offsetHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( placement.offsetWidth, placement.offsetHeight );
}

function TextAlignmentToCamera() {
    textObjects.forEach(obj => {
        obj.mesh.lookAt(camera.position);

        if (obj.direction === "vertical") {
            obj.mesh.rotation.x = 0;
            obj.mesh.rotation.z = Deg2Rad(-90);
        }
    });
}

function BuildTemplate() {
    UpdateData();
    ClearScene();
    Debug();
    BuildEnvironment();
    BuildFrame();
    BuildBackground();
    BuildGrid();
    SafetyChecks();
    BuildModifiers();

    BuildMetrics();
    CalculatePrice();

    EditMode();

    window.Grid = Grid;
    window.Modifiers = Modifiers;
    window.mTypes = ModifierTypes;
}

window.addEventListener("MaterialChanged", ChangeMaterial)
window.addEventListener("MaterialBGChanged", ChangeBGMaterial)

function ChangeMaterial() {
    let newMaterial = params["param-material"].material;
    let texture;

    switch (newMaterial) {
        case "white-shagreen":
            texture = THREE.ImageUtils.loadTexture('images/textures/white-shagreen.jpg', {}, function () {
                basicMaterial = new THREE.MeshPhysicalMaterial({ map: texture, "roughness": 0.45 });
                materialName = "Белый шагрень, ЛДСП 16мм";
                BuildTemplate();
            });
            break;
        case "black-wenge":
            texture = THREE.ImageUtils.loadTexture('images/textures/black-wenge.jpg', {}, function () {
                basicMaterial = new THREE.MeshPhysicalMaterial({ map: texture, "roughness": 0.45 });
                materialName = "Венге темный, ЛДСП 16мм";
                BuildTemplate();
            });
            break;
        case "gray-ldsp":
            texture = THREE.ImageUtils.loadTexture('images/textures/gray-ldsp.jpg', {}, function () {
                basicMaterial = new THREE.MeshPhysicalMaterial({ map: texture, "roughness": 0.45 });
                materialName = "Серый, ЛДСП 16мм";
                BuildTemplate();
            });
            break;
        case "milk-oak":
            texture = THREE.ImageUtils.loadTexture('images/textures/milk-oak.jpg', {}, function () {
                basicMaterial = new THREE.MeshPhysicalMaterial({ map: texture, "roughness": 0.45 });
                materialName = "Молочный дуб, ЛДСП 16мм";
                BuildTemplate();
            });
            break;
        case "white-ldsp":
            basicMaterial = new THREE.MeshPhysicalMaterial({ "roughness": 0.45, "color": 0xffffff });
            materialName = "Белый, ЛДСП 16мм";
            BuildTemplate();
            break;
        default:
            break;
    }
}

function ChangeBGMaterial() {
    let newMaterial = params["param-bg"].material;
    let texture;

    switch (newMaterial) {
        case "bg-white-mdf":
            basicBGMaterial = new THREE.MeshPhysicalMaterial({ "roughness": 0.45, "color": 0xffffff });
            materialBGName = "Белый, МДФ 3мм";
            BuildTemplate();
            break;
        case "bg-white-shagreen":
            texture = THREE.ImageUtils.loadTexture('images/textures/white-shagreen.jpg', {}, function () {
                basicBGMaterial = new THREE.MeshPhysicalMaterial({ map: texture, "roughness": 0.45 });
                materialBGName = "Белый шагрень, МДФ 3мм";
                BuildTemplate();
            });
            break;
        case "bg-black-wenge":
            texture = THREE.ImageUtils.loadTexture('images/textures/black-wenge.jpg', {}, function () {
                basicBGMaterial = new THREE.MeshPhysicalMaterial({ map: texture, "roughness": 0.45 });
                materialBGName = "Венге темный, МДФ 3мм";
                BuildTemplate();
            });
            break;
        case "bg-gray-mdf":
            texture = THREE.ImageUtils.loadTexture('images/textures/gray-ldsp.jpg', {}, function () {
                basicBGMaterial = new THREE.MeshPhysicalMaterial({ map: texture, "roughness": 0.45 });
                materialBGName = "Серый, МДФ 3мм";
                BuildTemplate();
            });
            break;
        case "bg-milk-oak":
            texture = THREE.ImageUtils.loadTexture('images/textures/milk-oak.jpg', {}, function () {
                basicBGMaterial = new THREE.MeshPhysicalMaterial({ map: texture, "roughness": 0.45 });
                materialBGName = "Молочный дуб, МДФ 3мм";
                BuildTemplate();
            });
            break;
        default:
            BuildTemplate();
            break;
    }
}

// Remove all template objects for recreate with other params
function ClearScene() {
    templateObjects.forEach(obj => {
        scene.remove(obj);
    });

    templateObjects = [];
    textObjects = [];

    raycastObjects = [];
    activeUnionHandler = null;
    activeModifierHandler = null;
    intersect = null;

    RecalculateCellCount();
}

function Debug() {
    if (debugMode) {
        orbitControls.maxAzimuthAngle = Infinity;
        orbitControls.minAzimuthAngle = -Infinity;

        let spotHelper = new THREE.CameraHelper( spotLight.shadow.camera );
        templateObjects.push( spotHelper );
        scene.add( spotHelper );

        let spotSkyHelper = new THREE.CameraHelper( spotSkyLight.shadow.camera );
        templateObjects.push( spotSkyHelper );
        scene.add( spotSkyHelper );
    } else {
        orbitControls.maxAzimuthAngle = Math.PI / 2.4;
        orbitControls.minAzimuthAngle = -Math.PI / 2.4;
    }
}

// Update global data
function UpdateData() {
    x = params["param-width"].currentValue / 1000;
    y = params["param-height"].currentValue / 1000;
    z = params["param-depth"].currentValue / 1000;
    thickness = params["thickness"].value / 1000;
    plinthType = params["param-plinth"].type;
    plinthLength = params["param-plinth"].currentValue / 1000;
    columnCount = params["param-vsection"].currentValue;
    rowCount = params["param-hsection"].currentValue;

    lengthOffset = 0;

    if (plinthType !== "none") {
        lengthOffset = plinthLength;
    }

    minCellWidth = params["param-sections"].minWidth / 1000;
    maxCellWidth = params["param-sections"].maxWidth / 1000;
    minCellHeight = params["param-sections"].minHeight / 1000;
    maxCellHeight = params["param-sections"].maxHeight / 1000;
}

function InputUpdate(event) {
    let rect = renderer.domElement.getBoundingClientRect();

    let x = event.clientX;
    let y = event.clientY;

    if (x < rect.left) {
        x = 0;
    } else if (x > (rect.left + rect.width)) {
        x = rect.width;
    } else {
        x -= rect.left;
    }

    if (y < rect.top) {
        y = 0;
    } else if (y > (rect.top + rect.height)) {
        y = rect.height;
    } else {
        y -= rect.top;
    }

    mouse.x = ( x / rect.width ) * 2 - 1;
    mouse.y = - ( y / rect.height ) * 2 + 1;
    realMouse.x = event.clientX;
    realMouse.y = event.clientY;
}

function FindIntersections() {
    raycaster.setFromCamera(mouse, camera);

    let intersectObjects = raycastObjects.filter(object => object.userData.sAvailableToRaycast);
    let inaccessibleObjects = raycastObjects.filter(object => !object.userData.sAvailableToRaycast);

    for (let i = 0; i < inaccessibleObjects.length; i++) {
        if (inaccessibleObjects[i].userData.type === IObjectTypes.UnionHandler) {
            if (inaccessibleObjects[i].userData.sActive) {
                continue;
            }

            inaccessibleObjects[i].material.color.setHex( 0xa8a8a8 );
        }

        if (inaccessibleObjects[i].userData.type === IObjectTypes.ModifierHandler) {
            if (inaccessibleObjects[i].userData.sActive) {
                continue;
            }

            inaccessibleObjects[i].material.color.setHex( 0xa8a8a8 );
        }
    }

    intersections = raycaster.intersectObjects(intersectObjects, false);

    if (intersections[0] !== undefined) {
        if (intersect !== intersections[0].object) {
            if (intersect && !intersect.userData.sActive) {
                if (intersect.userData.type === IObjectTypes.ModifierHandler) {
                    intersect.material.color.setHex( 0xffffff );
                } else if (intersect.userData.type === IObjectTypes.UnionHandler) {
                    intersect.material.color.setHex( 0xffffff );
                } else if (intersect.userData.modifier) {
                    DisableHighlightModifier(intersect);
                }
            }

            intersect = intersections[0].object;

            if (intersect && !intersect.userData.sActive) {
                if (intersect.userData.type === IObjectTypes.ModifierHandler) {
                    intersect.material.color.setHex( 0xebdaa8 );
                } else if (intersect.userData.type === IObjectTypes.UnionHandler) {
                    intersect.material.color.setHex( 0xebdaa8 );
                } else if (intersect.userData.modifier) {
                    EnableHighlightModifier(intersect);
                }
            }
        }
    } else {
        if (intersect && !intersect.userData.sActive) {
            if (intersect.userData.type === IObjectTypes.ModifierHandler) {
                intersect.material.color.setHex( 0xffffff );
            } else if (intersect.userData.type === IObjectTypes.UnionHandler) {
                intersect.material.color.setHex( 0xffffff );
            } else if (intersect.userData.modifier) {
                DisableHighlightModifier(intersect);
            }
        }

        intersect = null;
    }
}

function OnMouseClick() {
    CloseContextMenu();
    if (!intersect) { return; }

    if (intersect.userData.type === IObjectTypes.UnionHandler) {
        activeModifierHandler = null;

        if (activeUnionHandler && (intersect !== activeUnionHandler)) {
            Union(intersect.userData.dColumn, intersect.userData.dRow,
                activeUnionHandler.userData.dColumn, activeUnionHandler.userData.dRow);
            EnableAllUnionHandlers();
            activeUnionHandler = null;
        } else {
            if (intersect.userData.sActive) {
                EnableAllUnionHandlers();
                EnableAllModifierHandlers();
                intersect.userData.sActive = false;
                intersect.material.color.setHex( 0xffffff );
                activeUnionHandler = null;
            } else {
                BuildAvailableUnionHandlers(intersect.userData.dColumn, intersect.userData.dRow);
                DisableAllModifierHandlers();
                intersect.userData.sActive = true;
                intersect.material.color.setHex( 0xfcb26d );
                activeUnionHandler = intersect;
            }
        }
    } else if (intersect.userData.type === IObjectTypes.ModifierHandler) {
        activeUnionHandler = null;

        if (activeModifierHandler && (intersect !== activeModifierHandler)) {
            OpenModifierModal();
            EnableAllModifierHandlers();
            EnableAllUnionHandlers();

            fModifierColumn = activeModifierHandler.userData.dColumn;
            fModifierRow = activeModifierHandler.userData.dRow;
            tModifierColumn = intersect.userData.dColumn;
            tModifierRow = intersect.userData.dRow;

            activeModifierHandler = null;
            intersect = null;
        } else {
            if (intersect.userData.sActive) {
                EnableAllUnionHandlers();
                EnableAllModifierHandlers();
                intersect.userData.sActive = false;
                intersect.material.color.setHex( 0xffffff );
                activeModifierHandler = null;
            } else {
                BuildAvailableModifierHandlers(intersect.userData.dColumn, intersect.userData.dRow);
                DisableAllUnionHandlers();
                intersect.userData.sActive = true;
                intersect.material.color.setHex( 0xfcb26d );
                activeModifierHandler = intersect;
            }
        }
    } else if (intersect.userData.modifier) {
        let uuid = intersect.userData.uuid;
        let openCloseBtnEnabled = true;
        let editBtnEnabled = false;

        // Open/Close blacklist
        let modifier = Modifiers.filter(object => object.uuid === uuid)[0];
        if (modifier.type === ModifierTypes.HorizontalSeparator || modifier.type === ModifierTypes.VerticalSeparator) {
            openCloseBtnEnabled = false;
        }

        let context = {
            uuid: uuid,
            openCloseBtnEnabled: openCloseBtnEnabled,
            editBtnEnabled: editBtnEnabled,
        };

        OpenContextMenu(context);
    }
}

// Build room
// -------------------
function BuildEnvironment() {
    spotLight.position.set(1, -(y/2) + 0.1, 5);
    spotSkyLight.position.set(-0.75, y/2 + 0.5, 4);

    let floorBorder = AddCube(15, 0.2, 15, floorMaterial);
    floorBorder.position.set(0, -(y/2) - 0.1, 0);

    if (!debugMode) {
        let wallBorder = AddCube(12, 8, 0.1, wallMaterial);
        wallBorder.position.set(0, 0, -(z/2) - 0.1);
    }

    let leftWallBorder = AddCube(0.1, 12, 12, wallMaterial);
    leftWallBorder.position.set(-5, 0, -1);

    let rightWallBorder = AddCube(0.1, 12, 12, wallMaterial);
    rightWallBorder.position.set(5, 0, -1);
}

function BuildFrame() {
    let leftBorder = AddCube(thickness, y - lengthOffset, z, basicMaterial);
    leftBorder.position.set(-(x / 2) + (thickness / 2), lengthOffset / 2, 0);

    let rightBorder = AddCube(thickness, y - lengthOffset, z, basicMaterial);
    rightBorder.position.set((x / 2) - (thickness / 2), lengthOffset / 2, 0);

    let topBorder = AddCube(x, thickness, z, basicMaterial);
    topBorder.position.set(0, (y / 2) - (thickness / 2), 0);

    let bottomBorder = AddCube(x, thickness, z, basicMaterial);
    bottomBorder.position.set(0, -(y / 2) + (thickness / 2) + lengthOffset, 0);

    if (plinthType === "normal") {
        let leftPlinthBorder = AddCube(thickness, lengthOffset, z - 0.03, basicMaterial);
        leftPlinthBorder.position.set(-x/2 + thickness/2, -y/2 + lengthOffset/2, 0.015);

        let rightPlinthBorder = AddCube(thickness, lengthOffset, z - 0.03, basicMaterial);
        rightPlinthBorder.position.set(x/2 - thickness/2, -y/2 + lengthOffset/2, 0.015);

        let forwardPlinthBorder = AddCube(x - 2*thickness, lengthOffset, thickness, basicMaterial);
        forwardPlinthBorder.position.set(0, -y/2 + lengthOffset/2, z/2 - 0.03);

        let backPlinthBorder = AddCube(x - 2*thickness, lengthOffset, thickness, basicMaterial);
        backPlinthBorder.position.set(0, -y/2 + lengthOffset/2, -z/2 + 0.05);
    }

    if (plinthType === "legs") {
        let legsRadius = 0.02;
        let depthLength = z - 4*legsRadius - 0.02;
        let pairsCount = 0;

        if (x >= 1.2) {
            pairsCount += Math.trunc(x / 0.6) - 1;
        }

        // Create side legs
        let leftFLeg = AddCylinder(legsRadius, lengthOffset, 12, legsMaterial);
        let leftBLeg = AddCylinder(legsRadius, lengthOffset, 12, legsMaterial);
        leftFLeg.position.set(-x/2 + 0.02 + legsRadius, -y/2 + lengthOffset/2, z/2 - (0.02 + legsRadius));
        leftBLeg.position.set(-x/2 + 0.02 + legsRadius, -y/2 + lengthOffset/2, -z/2 + (0.02 + legsRadius));

        let rightFLeg = AddCylinder(legsRadius, lengthOffset, 12, legsMaterial);
        let rightBLeg = AddCylinder(legsRadius, lengthOffset, 12, legsMaterial);
        rightFLeg.position.set(x/2 - (0.02 + legsRadius), -y/2 + lengthOffset/2, z/2 - (0.02 + legsRadius));
        rightBLeg.position.set(x/2 - (0.02 + legsRadius), -y/2 + lengthOffset/2, -z/2 + (0.02 + legsRadius));

        // Create inner legs
        let xLen = (x - (0.02+legsRadius*2)*2) / (pairsCount+1);
        for (let i = 0; i < pairsCount; i++) {
            let legForward = AddCylinder(legsRadius, lengthOffset, 12, legsMaterial);
            let legBack = AddCylinder(legsRadius, lengthOffset, 12, legsMaterial);

            let xPos = -x/2 + 0.02 + legsRadius*2 + xLen * (i + 1);

            legForward.position.set(xPos, -y/2 + lengthOffset/2, z/2 - (0.02 + legsRadius));
            legBack.position.set(xPos, -y/2 + lengthOffset/2, -z/2 + (0.02 + legsRadius));
        }
    }
}

function BuildBackground() {
    if (!params["param-bg"].enabled) {
        return;
    }

    let width = params["param-bg"].width / 1000;

    let bgGeometry = new THREE.BoxGeometry(x, y - lengthOffset, width);
    let bgBorder = new THREE.Mesh(bgGeometry, basicBGMaterial);

    bgBorder.castShadow = true;
    bgBorder.receiveShadow = true;

    bgBorder.position.set(0, lengthOffset / 2, -z/2 - width/2);

    scene.add(bgBorder);
    templateObjects.push(bgBorder);
}

function BuildGrid() {
    if (Grid === undefined || Grid === null || Grid.length === 0) {
        return;
    }

    NormalizeGrid();
    NormalizeGrid();

    let leftOffset = 0;
    let topOffset = 0;

    for (let i = 1; i <= columnCount; i++) {
        for (let j = 1; j <= rowCount; j++) {
            BuildCell(i, j, new Vector2(leftOffset, topOffset));
            topOffset += FindCell(i, j).height + thickness;
        }
        topOffset = 0;
        leftOffset += FindCell(i, 1).width + thickness;
    }
}

function BuildMetrics() {
    let lineOffset = 0.1;
    let depthLineOffset = 0.03;
    let fontSize = 0.042;

    // Build frame metrics
    // Width
    AddText((x*1000) + " mm", 0, y/2 + lineOffset*1.5 + 0.015, z/2 - depthLineOffset,
        0, 0, 0, fontSize);
    MetricsLine(Point(-x/2, y/2, z/2 - depthLineOffset), Point(-x/2, y/2 + lineOffset*1.5, z/2 - depthLineOffset),
        Point(x/2, y/2 + lineOffset*1.5, z/2 - depthLineOffset), Point(x/2, y/2, z/2 - depthLineOffset));

    // Height
    AddText((y*1000) + " mm", x/2 + lineOffset*1.5 + 0.015, 0, z/2 - depthLineOffset,
        0, 0, Deg2Rad(-90), fontSize, 'vertical');
    MetricsLine(Point(x/2, y/2, z/2 - depthLineOffset), Point(x/2+lineOffset*1.5, y/2, z/2 - depthLineOffset),
        Point(x/2+lineOffset*1.5, -y/2, z/2 - depthLineOffset), Point(x/2, -y/2, z/2 - depthLineOffset));

    // Depth
    AddText((z*1000) + " mm", x/2 + (lineOffset*1.5*(Math.sqrt(2)/2)) + 0.015,
        y/2 + (lineOffset*1.5*(Math.sqrt(2)/2)) + 0.015, 0, 0, 0, 0, fontSize);
    MetricsLine(Point(x/2, y/2, z/2), Point(x/2 + (lineOffset*1.5*(Math.sqrt(2)/2)), y/2 + (lineOffset*1.5*(Math.sqrt(2)/2)), z/2),
        Point(x/2 + (lineOffset*1.5*(Math.sqrt(2)/2)), y/2 + (lineOffset*1.5*(Math.sqrt(2)/2)), -z/2), Point(x/2, y/2, -z/2));

    // Plinth
    if (plinthType !== "none") {
        AddText((lengthOffset * 1000) + " mm", x/2 + lineOffset*1.5 + 0.015,
            -y/2 + lengthOffset/2, z/2 - depthLineOffset, 0, 0, Deg2Rad(-90), fontSize, 'vertical');
        MetricsLine(Point(x/2, -y/2 + lengthOffset, z/2 - depthLineOffset), Point(x/2 + lineOffset*1.5, -y/2 + lengthOffset, z/2 - depthLineOffset),
            Point(x/2 + lineOffset*1.5, -y/2, z/2 - depthLineOffset), Point(x/2, -y/2, z/2 - depthLineOffset));
    }

    let plOffset = lengthOffset / rowCount;

    // Build sections metrics
    // Horizontal
    let leftOffset = thickness;
    for (let i = 1; i <= columnCount; i++) {
        let Cell = FindCell(i, 1);
        if (Cell === null || Cell === undefined) { continue; }

        AddText(Math.ceil((Cell.width + Cell.additiveWidth) * 1000) + " mm", -x/2 + leftOffset + (Cell.width+Cell.additiveWidth)/2, y/2 + lineOffset/2 + 0.015, z/2,
            0, 0, 0, fontSize, "horizontal");
        MetricsLine(Point(-x/2 + leftOffset, y/2, z/2), Point(-x/2 + leftOffset, y/2 + lineOffset/2, z/2),
            Point(-x/2 + leftOffset+(Cell.width+Cell.additiveWidth), y/2 + lineOffset/2, z/2), Point(-x/2 + leftOffset+(Cell.width+Cell.additiveWidth), y/2, z/2));
        leftOffset += thickness + (Cell.width+Cell.additiveWidth);
    }

    // Vertical
    let topOffset = thickness;
    for (let i = 1; i <= rowCount; i++) {
        let Cell = FindCell(1, i);
        if (Cell === null || Cell === undefined) { continue; }

        AddText(Math.ceil((Cell.height + Cell.additiveHeight - plOffset) * 1000) + " mm", x/2 + lineOffset/2 + 0.015, y/2 - topOffset - (Cell.height+Cell.additiveHeight)/2, z/2,
            0, 0, Deg2Rad(-90), fontSize, "vertical");
        MetricsLine(Point(x/2, y/2 - topOffset + plOffset*(i-1), z/2), Point(x/2 + lineOffset/2, y/2 - topOffset + plOffset*(i-1), z/2),
            Point(x/2 + lineOffset/2, y/2 - topOffset - (Cell.height+Cell.additiveHeight) + plOffset*(i), z/2), Point(x/2, y/2 - topOffset - (Cell.height+Cell.additiveHeight) + plOffset*(i), z/2));
        topOffset += thickness + (Cell.height+Cell.additiveHeight);
    }
}

function CalculatePrice() {
    // Data
    let area = 0; // m^2
    let massForLdsp = 12; // Kg for m^2
    let areaMdf = 0; // m^2

    // Costs
    let sumCost = 0; // Rub
    let ldspCost = 1500; // Rub for m^2
    let wideEdgeCost = 100; // Rub for m
    let thinEdgeCost = 50; // Rub for m
    let backgroundCost = 550; // Rub for m^2
    let legCost = 30; // Rub for leg

    // Calculate area of ldsp
    area += x*z*2 + ((y-2*thickness-lengthOffset)*z*2); // Внешние стороны каркаса

    let innerEdgeLength = 0;
    let plOffset = lengthOffset / rowCount;
    if (params["param-plinth"].type === "none") {
        plOffset = 0;
    }

    for (let i = 1; i <= columnCount; i++) {
        for (let j = 1; j <= rowCount; j++) {
            let Cell = FindCell(i, j);

            if (!Cell) {
                continue;
            }

            // Right border
            if (!Cell.rightUnion && i !== columnCount) {
                area += (Cell.height+Cell.additiveHeight-plOffset)*z;
                innerEdgeLength += Cell.height+Cell.additiveHeight - plOffset;

                if (j !== rowCount) {
                    area += thickness*z;
                    innerEdgeLength += thickness;
                }

                if (FindCell(i, j-1) && FindCell(i, j-1).rightUnion) {
                    area += thickness*z;
                    innerEdgeLength += thickness;
                }
            }

            // Bottom border
            if (!Cell.bottomUnion && j !== rowCount) {
                area += (Cell.width+Cell.additiveWidth)*z;
                innerEdgeLength += Cell.width+Cell.additiveWidth;
            }
        }
    }

    if (!params["param-bg"].enabled) {
        innerEdgeLength *= 2;
    }

    // Inner
    if (plinthType === "normal") {
        area += (z*lengthOffset*2) + ( (x-2*thickness)*lengthOffset*2 );
    }

    // Calculate modifiers
    let modEdgeLen = 0;
    for (let i = 0; i < Modifiers.length; i++) {
        let RectModifier = CalculateRectModifier(Modifiers[i]);
        if (Modifiers[i].type === ModifierTypes.VerticalSeparator) {
            area += (RectModifier.height-thickness)*z;

            if (!params["param-bg"].enabled) {
                modEdgeLen += 2*RectModifier.height;
            } else {
                modEdgeLen += RectModifier.height;
            }
        } else if (Modifiers[i].type === ModifierTypes.HorizontalSeparator) {
            area += (RectModifier.width-thickness)*z;

            if (!params["param-bg"].enabled) {
                modEdgeLen += 2*RectModifier.width;
            } else {
                modEdgeLen += RectModifier.width;
            }
        } else if (Modifiers[i].type === ModifierTypes.DoorIn) {
            area += (RectModifier.height-thickness)*(RectModifier.width-thickness);
            modEdgeLen += 2*(RectModifier.height+RectModifier.width-thickness);
        } else if (Modifiers[i].type === ModifierTypes.DoorOut) {
            area += RectModifier.height*RectModifier.width;
            modEdgeLen += 2*(RectModifier.height+RectModifier.width);
        } else if (Modifiers[i].type === ModifierTypes.BoxIn) {
            // Front border
            area += (RectModifier.width-thickness)*(RectModifier.height-thickness);
            // Back border
            area += (RectModifier.width - thickness*1.2)*(RectModifier.height - 3*thickness);
            // Left/right border
            area += (RectModifier.height - 3*thickness)*(z-2*thickness)*2;

            // Bottom border
            areaMdf += (RectModifier.width - thickness*1.2)*(z-thickness);

            modEdgeLen += 2*(RectModifier.width+RectModifier.height-thickness);
            modEdgeLen += 2*(RectModifier.height-3*thickness);
        } else if (Modifiers[i].type === ModifierTypes.BoxOut) {
            // Front border
            area += (RectModifier.width-thickness)*(RectModifier.height-thickness);
            // Back border
            area += (RectModifier.width - thickness*1.2)*(RectModifier.height - 3*thickness);
            // Left/right border
            area += (RectModifier.height - 3*thickness)*(z-thickness)*2;

            // Bottom border
            areaMdf += (RectModifier.width - thickness*1.2)*(z-thickness);

            modEdgeLen += 2*(RectModifier.width+RectModifier.height-thickness);
            modEdgeLen += 2*(RectModifier.height-3*thickness);
        }
    }

    if (!params["param-bg"].enabled) {
        innerEdgeLength *= 2;
    }

    if (modEdgeLen) {
        innerEdgeLength += modEdgeLen;
    }

    let areaCost = (area * ldspCost);
    sumCost += areaCost;

    descMass.innerText = " " + (area * massForLdsp).toFixed(1) + " кг";
    descMat.innerText = " " + materialName;
    descWidth.innerText = " " + (x * 1000) + " мм";
    descHeight.innerText = " " + (y * 1000) + " мм";
    descDepth.innerText = " " + (z * 1000) + " мм";

    if (plinthType === "normal") {
        descPlinthHeight.innerText = " цоколь 60мм";
    } else if (plinthType === "legs") {
        descPlinthHeight.innerText = " ножки 27мм";
    } else {
        descPlinthHeight.innerText = " без цоколя";
    }

    let smetaStr = "";

    // Write
    smetaStr += "\nСМЕТА\n\n";
    smetaStr += "МАТЕРИАЛ\n\n";
    smetaStr += `1) ${materialName}. ${area.toFixed(3)}м2 x ${ldspCost.toFixed(2)}р  = ${areaCost.toFixed(2)}р\n`;
    if (params["param-bg"].enabled || areaMdf > 0) {
        let backArea = (x*y) + areaMdf;
        let backCost = (backArea * backgroundCost);
        areaCost = (areaCost + backCost);
        sumCost += backCost;
        smetaStr += `2) ${materialBGName}. ${backArea.toFixed(3)}м2 x ${backgroundCost.toFixed(2)}р  = ${backCost.toFixed(2)}р\n`;
        descbgmat.innerText = " " + materialBGName;
    } else {
        descbgmat.innerText = " отсутствует";
    }
    smetaStr += `Подитог: ${areaCost.toFixed(2)}р\n`;

    let sumEdgeCost = 0;
    let thinEdgeLength = z * 4;
    let thinEdge = thinEdgeLength * thinEdgeCost;
    sumEdgeCost += thinEdge;
    let wideEdgeLength = x*2 + (y-2*thickness)*2; // Внешняя часть

    if (!params["param-bg"].enabled) {
        wideEdgeLength *= 2;
    }

    wideEdgeLength += innerEdgeLength;

    let wideEdge;

    if (params["param-edge"].edge === "wide") {
        wideEdge = wideEdgeLength * wideEdgeCost;
        descEdge.innerText = " толстая 2 мм кромка в цвет";
        sumEdgeCost += wideEdge;
    } else if (params["param-edge"].edge === "thin") {
        wideEdge = wideEdgeLength * thinEdgeCost;
        descEdge.innerText = " тонкая 0.4 мм кромка в цвет";
        thinEdgeLength += wideEdgeLength;
        thinEdge += wideEdge;
        sumEdgeCost += wideEdge;
        wideEdgeLength = 0;
        wideEdge = 0;
    }

    sumCost += sumEdgeCost;

    smetaStr += "\n\nОБРАБОТКА МАТЕРИАЛА\n\n";
    smetaStr += "КРОМКА\n\n";
    smetaStr += `1) 2мм.  ${wideEdgeLength.toFixed(3)}м x ${wideEdgeCost.toFixed(2)}р = ${wideEdge.toFixed(2)}р\n`;
    smetaStr += `2) 0,4мм.  ${thinEdgeLength.toFixed(3)}м x ${thinEdgeCost.toFixed(2)}р = ${thinEdge.toFixed(2)}р\n`;
    smetaStr += `Подитог: ${sumEdgeCost.toFixed(2)}р\n`;

    smetaStr += "\n\nФУРНИТУРА\n\n";
    let sumFurnituraCost = 0;
    //let comformatCount = 8;
    //et comformat = (comformatCount*comformatCount).toFixed(2);
    //sumFurnituraCost += parseFloat(comformat);

    if (plinthType === "legs") {
        let pairsCount = 2;

        if (x >= 1.2) {
            pairsCount += Math.trunc(x / 0.6) - 1;
        }

        let legsPrice = (pairsCount * 2) * legCost;

        smetaStr += `1) Ножки, темные. ${pairsCount * 2} x ${legCost.toFixed(2)}р. = ${legsPrice.toFixed(2)} р\n`
        sumFurnituraCost += legsPrice;
    }


    smetaStr += `Подитог: ${sumFurnituraCost.toFixed(2)}р\n`;
    sumCost += sumFurnituraCost;

    smetaStr += `\n\n------
        
ИТОГО ${sumCost.toFixed(2)}р            
------------------`;

    console.log(smetaStr);

    let textsForEdit = document.getElementsByClassName("cost-text-editor");
    for (let i = 0; i < textsForEdit.length; i++) {
        textsForEdit[i].innerHTML = sumCost.toFixed(2) + " руб.";
    }

    descCost.innerText = ' ' + Math.trunc(sumCost).toFixed(2).slice(0, -3) + ' руб. ' + (sumCost - Math.trunc(sumCost)).toFixed(2).slice(2) + ' коп.';
}

// Addition functions
// -------------------
function Point(x, y, z) {
    return new THREE.Vector3(x, y, z)
}

function Vector2(x, y) {
    return new THREE.Vector2(x, y);
}

function MetricsLine(a, b, c, d) {
    let points = [];
    points.push(a);
    points.push(b);
    points.push(c);
    points.push(d);

    let geometry = new THREE.BufferGeometry().setFromPoints(points);

    let line = new THREE.Line(geometry, lineMaterial);
    templateObjects.push(line);
    scene.add(line);
}

function AddText(str="", x=0, y=0, z=0,
                 yaw=0, pitch=0, roll=0, fontSize=0.1, direction="horizontal", raycastFlag=false) {
    if (fontFace == null) {return;}

    const shapes = fontFace.generateShapes(str, fontSize);
    const geometry = new THREE.ShapeGeometry(shapes);
    geometry.computeBoundingBox();
    const xMid = -0.5 * (geometry.boundingBox.max.x - geometry.boundingBox.min.x);
    geometry.translate(xMid, 0, 0);

    const text = new THREE.Mesh( geometry, matLite );
    text.position.set(x, y, z);
    text.rotation.set(yaw, pitch, roll);

    let textObj = {
        mesh: text,
        direction: direction,
    }

    templateObjects.push(text);
    textObjects.push(textObj);
    scene.add(text);

    if (raycastFlag) {
        raycastObjects.push(mesh);
    }
}

function Deg2Rad(deg=0) {
    return deg*(Math.PI/180);
}

function AddCube(width, height, depth, material, templateFlag=true, raycastFlag=false) {
    let geometry = new THREE.BoxGeometry(width, height, depth);
    let mesh = new THREE.Mesh(geometry, material);

    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    if (templateFlag) {
        templateObjects.push(mesh);
    }

    if (raycastFlag) {
        raycastObjects.push(mesh);
    }

    return mesh;
}

// Only Create Mesh
function AddCubeMesh(width, height, depth, material) {
    let geometry = new THREE.BoxGeometry(width, height, depth);
    let mesh = new THREE.Mesh(geometry, material);

    mesh.castShadow = true;
    mesh.receiveShadow = true;

    return mesh;
}

function AddCylinder(radius, height, segments, material, raycastFlag=false) {
    let geometry = new THREE.CylinderGeometry(radius, radius, height, segments);
    let mesh = new THREE.Mesh(geometry, material);

    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    templateObjects.push(mesh);

    if (raycastFlag) {
        raycastObjects.push(mesh);
    }

    return mesh;
}

function AddCylinderMesh(radiusTop, radiusBottom, height, segments, material) {
    let geometry = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments);
    let mesh = new THREE.Mesh(geometry, material);

    mesh.castShadow = true;
    mesh.receiveShadow = true;

    return mesh;
}

function AddSphere(radius, widthSeg, heightSeg, material, templateFlag=true, raycastFlag=false) {
    let geometry = new THREE.SphereGeometry(radius, widthSeg, heightSeg);
    let mesh = new THREE.Mesh(geometry, material);

    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    if (templateFlag) {
        templateObjects.push(mesh);
    }

    if (raycastFlag) {
        raycastObjects.push(mesh);
    }

    return mesh;
}

function uuidv4() {
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}

function OpenContextMenu(context={}) {
    window.context = context;
    window.dispatchEvent(new CustomEvent("OpenContextMenu", { "detail": { mouse: realMouse } }));
}

function CloseContextMenu() {
    window.context = null;
    window.dispatchEvent(new CustomEvent("CloseContextMenu", {}));
}

function OpenModifierModal() {
    window.dispatchEvent(new CustomEvent("OpenModifierModal", {}));
}


// Grid functions
// -------------------
function MakeDefaultGrid() {
    Grid = [];

    for (let i = 1; i <= columnCount; i++) {
        for (let j = 1; j <= rowCount; j++) {
            let cell = JSON.parse(JSON.stringify(CellStruct));

            let wLength = Math.ceil((x - (thickness*(columnCount+1))) / columnCount * 1000) / 1000;
            let hLength = Math.ceil((y - (thickness*(rowCount+1))) / rowCount * 1000) / 1000;

            cell.width = wLength;
            cell.height = hLength;
            cell.bottomUnion = false;
            cell.rightUnion = false;
            cell.column = i;
            cell.row = j;

            if (i === columnCount) {
                cell.rightUnion = true;
            }

            if (j === rowCount) {
                cell.bottomUnion = true;
            }

            Grid.push(cell);
        }
    }
}

function FindCell(column, row) {
    for (let i = 0; i < Grid.length; i++) {
        if (Grid[i].column === column && Grid[i].row === row) {
            return Grid[i];
        }
    }

    return undefined;
}

// Add a column to the end
function AddColumn(width, column) {
    for (let i = 1; i <= rowCount; i++) {
        let cell = JSON.parse(JSON.stringify(CellStruct));

        let wLength = width;
        let hLength = FindCell(1, i).height;

        cell.width = wLength;
        cell.height = hLength;
        cell.bottomUnion = false;
        cell.rightUnion = true;
        cell.column = column;
        cell.row = i;

        if (i === rowCount) {
            cell.bottomUnion = true;
        }

        Grid.push(cell);
    }

    let prevColumn = GetColumnByIndex(column-1);
    for (let i = 0; i < prevColumn.length; i++) {
        prevColumn[i].rightUnion = false;
    }
}

// Add a row to the end
function AddRow(height, row) {
    for (let i = 1; i <= columnCount; i++) {
        let cell = JSON.parse(JSON.stringify(CellStruct));

        let wLength = FindCell(i, 1).width;
        let hLength = height;

        cell.width = wLength;
        cell.height = hLength;
        cell.bottomUnion = true;
        cell.rightUnion = false;
        cell.column = i;
        cell.row = row;

        if (i === columnCount) {
            cell.rightUnion = true;
        }

        Grid.push(cell);
    }

    let prevRow = GetRowByIndex(row-1);
    for (let i = 0; i < prevRow.length; i++) {
        prevRow[i].bottomUnion = false;
    }
}

function GetMaxRowCount() {
    let rows = GetColumnByIndex(1);
    return rows.length;
}

function GetMaxColumnCount() {
    let columns = GetRowByIndex(1);
    return columns.length;
}

function GetRowByIndex(index) {
    let grid = Grid.filter(function(value) {
        return value.row === index;
    });

    return grid;
}

function GetColumnByIndex(index) {
    let grid = Grid.filter(function(value) {
        return value.column === index;
    });

    return grid;
}

function GetAvgCellWidth() {
    let cells = GetColumnByIndex(1);
    let width = 0;

    for (let i = 0; i < cells.length; i++) {
        width += cells[i].width + cells[i].additiveWidth;
    }

    return width/cells.length;
}

function GetAvgCellHeight() {
    let cells = GetRowByIndex(1);
    let height = 0;

    for (let i = 0; i < cells.length; i++) {
        height += cells[i].height+ cells[i].additiveHeight;
    }

    return height/cells.length;
}

function RecalculateCellCount() {
    if (Grid.length < 1) {
        return;
    }

    // Calculate min/max row/column count
    minColumnCount = Math.ceil(x/maxCellWidth);
    maxColumnCount = Math.trunc(x/minCellWidth);
    minRowCount = Math.ceil(y/maxCellHeight);
    maxRowCount = Math.trunc(y/minCellHeight);

    params["param-vsection"].minValue = minColumnCount;
    params["param-vsection"].maxValue = maxColumnCount;
    params["param-hsection"].minValue = minRowCount;
    params["param-hsection"].maxValue = maxRowCount;

    if (columnCount < minColumnCount) {
        columnCount = minColumnCount;
        params["param-vsection"].currentValue = minColumnCount;
    } else if (columnCount > maxColumnCount) {
        columnCount = maxColumnCount;
        params["param-vsection"].currentValue = maxColumnCount;
    }

    if (rowCount < minRowCount) {
        rowCount = minRowCount;
        params["param-hsection"].currentValue = minRowCount;
    } else if (rowCount > maxRowCount) {
        rowCount = maxRowCount;
        params["param-hsection"].currentValue = maxRowCount;
    }

    window.dispatchEvent(new CustomEvent("RecalculateSliders", {}));

    Grid = Grid.filter(function(value) {
        return !(value.column > columnCount || value.row > rowCount);
    });

    for (let i = GetMaxRowCount(); i < rowCount; i++) {

        if (i < 1) {
            break;
        }

        AddRow(GetAvgCellHeight()-0.001, i+1);
    }

    for (let i = GetMaxColumnCount(); i < columnCount; i++) {

        if (i < 1) {
            break;
        }

        AddColumn(GetAvgCellWidth()-0.001, i+1);
    }

    for (let i = 0; i < Grid.length; i++) {
        if (Grid[i].column === columnCount) {
            Grid[i].rightUnion = true;
        }

        if (Grid[i].row === rowCount) {
            Grid[i].bottomUnion = true;
        }
    }
}

function NormalizeGrid() {
    let oldWidth = thickness * (columnCount-1);
    let oldHeight = thickness * (rowCount-1);
    let innerWidth = x - thickness*2;
    let innerHeight = y - thickness*2;
    let firstRow = GetColumnByIndex(1);
    let firstColumn = GetRowByIndex(1);

    // Calculate old sizes
    for (let i = 0; i < firstColumn.length; i++) {
        oldWidth += firstColumn[i].width;
    }

    for (let i = 0; i < firstRow.length; i++) {
        oldHeight += firstRow[i].height;
    }

    oldWidth = Math.trunc(oldWidth * 1000) / 1000;
    oldHeight = Math.trunc(oldHeight * 1000) / 1000;

    // Calculate new sizes
    let xScale = innerWidth / oldWidth;
    let yScale = innerHeight / oldHeight;

    let newWidth = thickness * (columnCount-1);
    let newHeight = thickness * (rowCount-1);

    for (let i = 0; i < firstColumn.length; i++) {
        firstColumn[i].width = Math.ceil(firstColumn[i].width * xScale * 1000) / 1000;
        newWidth += firstColumn[i].width;

        if (i+1 === firstColumn.length) {
            let delta = innerWidth - newWidth;

            firstColumn[i].additiveWidth = delta;
        }
    }

    for (let i = 0; i < firstRow.length; i++) {
        firstRow[i].height = Math.ceil(firstRow[i].height * yScale * 1000) / 1000;

        newHeight += firstRow[i].height;

        if (i+1 === firstRow.length) {
            let delta = innerHeight - newHeight;

            firstRow[i].additiveHeight = delta;
        }
    }

    // Align by all grid
    for (let i = 1; i <= columnCount; i++) {
        for (let j = 1; j <= rowCount; j++) {
            let Cell = FindCell(i, j);
            Cell.width = firstColumn[i-1].width;
            Cell.height = firstRow[j-1].height;
        }
    }
}

function BuildCell(column, row, offset) {
    let cell = FindCell(column, row);
    let plOffset = lengthOffset / rowCount;

    if (cell !== undefined) {
        if (!cell.rightUnion) {
            let rightBorder = AddCube(thickness, (cell.height+cell.additiveHeight)+thickness - plOffset, z, basicMaterial);
            rightBorder.position.set(-x/2 + 1.5*thickness + cell.width + cell.additiveWidth + offset.x, y/2 - 1.5*thickness - (cell.height+cell.additiveHeight)/2 - offset.y + plOffset*row, 0);
        }

        if (!cell.bottomUnion) {
            let bottomBorder = AddCube((cell.width+cell.additiveWidth)+thickness, thickness, z, basicMaterial);
            bottomBorder.position.set(-x/2 + thickness + (cell.width+cell.additiveWidth)/2 + offset.x, y/2 - 1.5*thickness - cell.height - cell.additiveHeight - offset.y + plOffset*row, 0);
        }

        if (debugMode) {
            AddText(cell.column + " " + cell.row, -x/2 + thickness + (cell.width+cell.additiveWidth)/2 + offset.x, y/2 - 1.5*thickness - (cell.height+cell.additiveHeight)/2 - offset.y + plOffset*row, 0);
        }

        if (editMode) {
            // Build Union Handlers
            let unionHandlerMaterial = new THREE.MeshBasicMaterial({
                opacity: 0.5,
                transparent: true,
                alphaTest: 0.05,
            });
            let unionHandler = AddCube(cell.width + cell.additiveWidth, cell.height + cell.additiveHeight, thickness, unionHandlerMaterial, true, true);
            unionHandler.position.set(-x/2 + thickness + (cell.width+cell.additiveWidth)/2 + offset.x, y/2 - 1.5*thickness - (cell.height+cell.additiveHeight)/2 - offset.y + plOffset*row, z/2);

            unionHandler.userData = {
                type: IObjectTypes.UnionHandler,
                dColumn: column,
                dRow: row,
                sActive: false,
                sAvailableToRaycast: true,
                modifier: false,
            };

            // Build Modifier Handlers
            let modifierHandlerMaterial = new THREE.MeshBasicMaterial({
                opacity: 0.75,
                transparent: true,
                alphaTest: 0.06,
            });
            let modifierHandler = AddSphere(0.05, 8, 8, modifierHandlerMaterial, true, true);
            modifierHandler.position.set(-x/2 + 1.5*thickness + (cell.width+cell.additiveWidth) + offset.x, y/2 - 1.5*thickness - (cell.height+cell.additiveHeight) - offset.y + plOffset*row, z/2);
            modifierHandler.userData = {
                type: IObjectTypes.ModifierHandler,
                dColumn: column,
                dRow: row,
                sActive: false,
                sAvailableToRaycast: true,
                modifier: false,
            };
        }
    }
}

// Modifier functionality
// -------------------
function BuildModifiers() {
    for (let i = 0; i < Modifiers.length; i++) {
        if (Modifiers[i].type === ModifierTypes.DoorOut || Modifiers[i].type === ModifierTypes.DoorIn) {
            BuildDoorModifier(Modifiers[i]);
        } else if (Modifiers[i].type === ModifierTypes.BoxIn || Modifiers[i].type === ModifierTypes.BoxOut) {
            BuildBoxModifier(Modifiers[i]);
        } else if (Modifiers[i].type === ModifierTypes.VerticalSeparator || Modifiers[i].type === ModifierTypes.HorizontalSeparator) {
            BuildSeparatorModifier(Modifiers[i]);
        }
    }
}

function BuildModifierHandlers() {
    // In this function, only points located on the left and upper faces are built.
    // Other are built in BuildCell function

    // Zero Handler
    let zModifierHandlerMaterial = new THREE.MeshBasicMaterial({
        opacity: 0.75,
        transparent: true,
        alphaTest: 0.06,
    });
    let zModifierHandler = AddSphere(0.05, 8, 8, zModifierHandlerMaterial, true, true);
    zModifierHandler.position.set(-x/2 + thickness/2, y/2 - thickness/2, z/2);
    zModifierHandler.userData = {
        type: IObjectTypes.ModifierHandler,
        dColumn: 0,
        dRow: 0,
        sActive: false,
        sAvailableToRaycast: true,
        modifier: false,
    };

    // Top
    let fRow = GetRowByIndex(1);
    let leftOffset = thickness;
    for (let i = 0; i < fRow.length; i++) {
        let cell = fRow[i];

        let modifierHandlerMaterial = new THREE.MeshBasicMaterial({
            opacity: 0.75,
            transparent: true,
            alphaTest: 0.06,
        });
        let modifierHandler = AddSphere(0.05, 8, 8, modifierHandlerMaterial, true, true);
        modifierHandler.position.set(-x/2 + thickness/2 + (cell.width+cell.additiveWidth) + leftOffset, y/2 - thickness/2, z/2);
        modifierHandler.userData = {
            type: IObjectTypes.ModifierHandler,
            dColumn: i+1,
            dRow: 0,
            sActive: false,
            sAvailableToRaycast: true,
            modifier: false,
        };

        leftOffset += thickness + (cell.width+cell.additiveWidth);
    }

    // Left
    let plOffset = lengthOffset/rowCount;
    let fColumn = GetColumnByIndex(1);
    let topOffset = thickness;
    for (let i = 0; i < fColumn.length; i++) {
        let cell = fColumn[i];

        let modifierHandlerMaterial = new THREE.MeshBasicMaterial({
            opacity: 0.75,
            transparent: true,
            alphaTest: 0.06,
        });
        let modifierHandler = AddSphere(0.05, 8, 8, modifierHandlerMaterial, true, true);
        modifierHandler.position.set(-x/2 + thickness/2, y/2 - thickness/2 - topOffset - (cell.height+cell.additiveHeight) + plOffset*(i+1), z/2);
        modifierHandler.userData = {
            type: IObjectTypes.ModifierHandler,
            dColumn: 0,
            dRow: i+1,
            sActive: false,
            sAvailableToRaycast: true,
            modifier: false,
        };

        topOffset += thickness + (cell.height+cell.additiveHeight);
    }
}

function BuildAvailableModifierHandlers(column=0, row=0) {
    let modifierHandlers = raycastObjects.filter(object => object.userData.type === IObjectTypes.ModifierHandler);
    let unavailables = modifierHandlers.filter(object => !((object.userData.dColumn === column && object.userData.dRow === row)
        || (object.userData.dColumn !== column && object.userData.dRow !== row)));

    for (let i = 0; i < unavailables.length; i++) {
        unavailables[i].userData.sAvailableToRaycast = false;
    }
}

function EnableAllModifierHandlers() {
    let modifierHandlers = raycastObjects.filter(object => object.userData.type === IObjectTypes.ModifierHandler);

    for (let i = 0; i < modifierHandlers.length; i++) {
        modifierHandlers[i].userData.sAvailableToRaycast = true;
        modifierHandlers[i].material.color.setHex( 0xffffff );
        modifierHandlers[i].userData.sActive = false;
    }
}

function DisableAllModifierHandlers() {
    let modifierHandlers = raycastObjects.filter(object => object.userData.type === IObjectTypes.ModifierHandler);

    for (let i = 0; i < modifierHandlers.length; i++) {
        modifierHandlers[i].userData.sAvailableToRaycast = false;
        modifierHandlers[i].material.color.setHex( 0xa8a8a8 );
        modifierHandlers[i].userData.sActive = false;
    }
}

function CalculateRectModifier(modifier) {
    let width = 0;
    let height = 0;
    let leftOffset = 0, topOffset = 0;

    let plOffset = lengthOffset/rowCount;

    let min, max;

    // Width
    // -------------
    if (modifier.fromColumn > modifier.toColumn) {
        max = modifier.fromColumn;
        min = modifier.toColumn;
    } else {
        max = modifier.toColumn;
        min = modifier.fromColumn;
    }

    for (let i = min+1; i <= max; i++) {
        let Cell = FindCell(i, 1);

        if (!Cell) {
            continue;
        }

        width += thickness + (Cell.width+Cell.additiveWidth);
    }

    // Left Offset
    // -------------
    for (let i = 1; i < min+1; i++) {
        let Cell = FindCell(i, 1);

        if (!Cell) {
            continue;
        }

        leftOffset += thickness + (Cell.width+Cell.additiveWidth);
    }

    // Height
    // -------------
    if (modifier.fromRow > modifier.toRow) {
        max = modifier.fromRow;
        min = modifier.toRow;
    } else {
        max = modifier.toRow;
        min = modifier.fromRow;
    }

    for (let i = min+1; i <= max; i++) {
        let Cell = FindCell(1, i);

        if (!Cell) {
            continue;
        }

        height += thickness + (Cell.height+Cell.additiveHeight) - plOffset;
    }

    // Top Offset
    // -------------
    for (let i = 1; i < min+1; i++) {
        let Cell = FindCell(1, i);

        if (!Cell) {
            continue;
        }

        topOffset += thickness + (Cell.height+Cell.additiveHeight) - plOffset;
    }


    let Rect = {
        width, height, leftOffset, topOffset,
    }

    return Rect;
}

function EnableAllModifierObjects() {
    let modifiers = raycastObjects.filter(object => object.userData.type === IObjectTypes.ModifierObject);

    for (let i = 0; i < modifiers.length; i++) {
        modifiers[i].userData.sAvailableToRaycast = true;
    }
}

function DisableAllModifierObjects() {
    let modifiers = raycastObjects.filter(object => object.userData.type === IObjectTypes.ModifierObject);

    for (let i = 0; i < modifiers.length; i++) {
        modifiers[i].userData.sAvailableToRaycast = false;
    }
}

function DeleteModifier(uuid) {
    Modifiers = Modifiers.filter(object => object.uuid !== uuid);
}

function EnableHighlightModifier(modifierObject) {
    modifierObject.material.color.setHex( 0xeb4034 );
    modifierObject.material.emissive.setHex( 0xebdaa8 );
    modifierObject.material.emissiveIntensity = 0.75;
    modifierObject.material.opacity = 0.75;
}

function DisableHighlightModifier(modifierObject) {
    modifierObject.material.color.setHex( 0xffffff );
    modifierObject.material.emissive.setHex( 0x000000 );
    modifierObject.material.emissiveIntensity = 0;
    modifierObject.material.opacity = 1;
}

function OpenCloseModifier(uuid) {
    let modifier = Modifiers.filter(object => object.uuid === uuid)[0];
    modifier.opened = !modifier.opened;
}

function IntersectionCheck(fModifier, sModifier) {
    let aX0, aX1, aY0, aY1;
    let bX0, bX1, bY0, bY1;

    // Normalize
    if (fModifier.fromColumn > fModifier.toColumn) {
        aX0 = fModifier.toColumn;
        aX1 = fModifier.fromColumn;
    } else {
        aX1 = fModifier.toColumn;
        aX0 = fModifier.fromColumn;
    }
    if (fModifier.fromRow > fModifier.toRow) {
        aY0 = fModifier.toRow;
        aY1 = fModifier.fromRow;
    } else {
        aY1 = fModifier.toRow;
        aY0 = fModifier.fromRow;
    }

    if (sModifier.fromColumn > sModifier.toColumn) {
        bX0 = sModifier.toColumn;
        bX1 = sModifier.fromColumn;
    } else {
        bX1 = sModifier.toColumn;
        bX0 = sModifier.fromColumn;
    }
    if (sModifier.fromRow > sModifier.toRow) {
        bY0 = sModifier.toRow;
        bY1 = sModifier.fromRow;
    } else {
        bY1 = sModifier.toRow;
        bY0 = sModifier.fromRow;
    }

    // Checks
    if (aX0 === bX0 && aX1 === bX1 && aY0 === bY0 && aY1 === bY1) {
        return true;
    }

    let RectA = {x1: aX0, y1: aY0, x2: aX1, y2: aY1};
    let RectB = {x1: bX0, y1: bY0, x2: bX1, y2: bY1};
    return rect.intersect(RectA, RectB);
}

function SafetyChecks() {
    for (let i = 0; i < Modifiers.length; i++) {
        if (!CheckOuterSpace(Modifiers[i])) {
            window.Notyf.error("Утилизированны неиспользуемые модификаторы.");
            DeleteModifier(Modifiers[i].uuid);
            SafetyChecks();
            return;
        }

        if (Modifiers[i].type === ModifierTypes.VerticalSeparator || Modifiers[i].type === ModifierTypes.HorizontalSeparator) {
            SCSeparator(Modifiers[i]);
            if (!SeparatorIForm(Modifiers[i])) {
                window.Notyf.error("Разделители должны иметь I-форму единичной ширины.");
                DeleteModifier(Modifiers[i].uuid);
                SafetyChecks();
                return;
            }
            if (!HasBasic(Modifiers[i])) {
                window.Notyf.error("Разделители должны имееть основу у креплений.");
                DeleteModifier(Modifiers[i].uuid);
                SafetyChecks();
                return;
            }
            if (!CheckInnerSpace(Modifiers[i])) {
                window.Notyf.error("Разделители не должны пересекаться с каркасом стеллажа внешним и внутренним.");
                DeleteModifier(Modifiers[i].uuid);
                SafetyChecks();
                return;
            }
        } else if (Modifiers[i].type === ModifierTypes.DoorIn || Modifiers[i].type === ModifierTypes.DoorOut) {
            SCDoor(Modifiers[i]);
            if (!HasBasic(Modifiers[i])) {
                window.Notyf.error("Дверки должны имееть основу у крепления.");
                DeleteModifier(Modifiers[i].uuid);
                SafetyChecks();
                return;
            }
            if (!CheckSize(Modifiers[i])) {
                window.Notyf.error("Минимальные размеры дверки: 300x300. Максимальные размеры дверки: 600x2400");
                DeleteModifier(Modifiers[i].uuid);
                SafetyChecks();
                return;
            }
        } else if (Modifiers[i].type === ModifierTypes.BoxIn || Modifiers[i].type === ModifierTypes.BoxOut) {
            SCBox(Modifiers[i]);
            if (!HasBasic(Modifiers[i])) {
                window.Notyf.error("Ящики должны имееть основу у креплений слева и справа.");
                DeleteModifier(Modifiers[i].uuid);
                SafetyChecks();
                return;
            }
            if (!CheckInnerSpace(Modifiers[i])) {
                window.Notyf.error("Ящики не должны пересекаться с каркасом стеллажа внешним и внутренним.");
                DeleteModifier(Modifiers[i].uuid);
                SafetyChecks();
                return;
            }
            if (!CheckSize(Modifiers[i])) {
                window.Notyf.error("Минимальные размеры ящика: 300x100. Максимальные размеры ящика: 900x300");
                DeleteModifier(Modifiers[i].uuid);
                SafetyChecks();
                return;
            }
        }
    }
}

function SCSeparator(modifier) {
    for (let i = 0; i < Modifiers.length; i++) {
        if (modifier.uuid === Modifiers[i].uuid) {
            continue;
        }
        if (Modifiers[i].type === ModifierTypes.VerticalSeparator || Modifiers[i].type === ModifierTypes.HorizontalSeparator) {
            if (IntersectionCheck(modifier, Modifiers[i])) {
                window.Notyf.error("Разделители не должны пересекаться друг с другом.");
                DeleteModifier(modifier.uuid);
                return;
            }
        } else if (Modifiers[i].type === ModifierTypes.BoxIn || Modifiers[i].type === ModifierTypes.BoxOut) {
            if (IntersectionCheck(modifier, Modifiers[i])) {
                window.Notyf.error("Разделители не должны пересекаться с ящиками.");
                DeleteModifier(modifier.uuid);
                return;
            }
        }
    }
}

function SCDoor(modifier) {
    for (let i = 0; i < Modifiers.length; i++) {
        if (modifier.uuid === Modifiers[i].uuid) {
            continue;
        }
        if (Modifiers[i].type === ModifierTypes.DoorIn || Modifiers[i].type === ModifierTypes.DoorOut) {
            if (IntersectionCheck(modifier, Modifiers[i])) {
                window.Notyf.error("Дверки не должны пересекаться друг с другом.");
                DeleteModifier(modifier.uuid);
                return;
            }
        } else if (Modifiers[i].type === ModifierTypes.BoxIn || Modifiers[i].type === ModifierTypes.BoxOut) {
            if (IntersectionCheck(modifier, Modifiers[i])) {
                window.Notyf.error("Дверки не должны пересекаться с ящиками.");
                DeleteModifier(modifier.uuid);
                return;
            }
        }
    }
}

function SCBox(modifier) {
    for (let i = 0; i < Modifiers.length; i++) {
        if (modifier.uuid === Modifiers[i].uuid) {
            continue;
        }
        if (Modifiers[i].type === ModifierTypes.VerticalSeparator || Modifiers[i].type === ModifierTypes.HorizontalSeparator) {
            if (IntersectionCheck(modifier, Modifiers[i])) {
                window.Notyf.error("Ящики не должны пересекаться с разделителями.");
                DeleteModifier(modifier.uuid);
                return;
            }
        } else if (Modifiers[i].type === ModifierTypes.BoxIn || Modifiers[i].type === ModifierTypes.BoxOut) {
            if (IntersectionCheck(modifier, Modifiers[i])) {
                window.Notyf.error("Ящики не должны пересекаться друг с другом.");
                DeleteModifier(modifier.uuid);
                return;
            }
        } else if (Modifiers[i].type === ModifierTypes.DoorIn || Modifiers[i].type === ModifierTypes.DoorOut) {
            if (IntersectionCheck(modifier, Modifiers[i])) {
                window.Notyf.error("Ящики не должны пересекаться с дверками.");
                DeleteModifier(modifier.uuid);
                return;
            }
        }
    }
}

function SeparatorIForm(modifier) {
    let x1, x2, y1, y2;

    // Normalize
    if (modifier.fromColumn > modifier.toColumn) {
        x1 = modifier.toColumn;
        x2 = modifier.fromColumn;
    } else {
        x2 = modifier.toColumn;
        x1 = modifier.fromColumn;
    }
    if (modifier.fromRow > modifier.toRow) {
        y1 = modifier.toRow;
        y2 = modifier.fromRow;
    } else {
        y2 = modifier.toRow;
        y1 = modifier.fromRow;
    }

    if (modifier.type === ModifierTypes.HorizontalSeparator) {
        if (y2-y1 > 1) {
            return false;
        }
    } else {
        if (x2-x1 > 1) {
            return false;
        }
    }

    return true;
}

function HasBasic(modifier) {
    let x1, x2, y1, y2;

    // Normalize
    if (modifier.fromColumn > modifier.toColumn) {
        x1 = modifier.toColumn;
        x2 = modifier.fromColumn;
    } else {
        x2 = modifier.toColumn;
        x1 = modifier.fromColumn;
    }
    if (modifier.fromRow > modifier.toRow) {
        y1 = modifier.toRow;
        y2 = modifier.fromRow;
    } else {
        y2 = modifier.toRow;
        y1 = modifier.fromRow;
    }

    if (modifier.type === ModifierTypes.DoorIn || modifier.type === ModifierTypes.DoorOut) {
        if (modifier.direction == Direction.Left) {
            for (let i = y1; i < y2; i++) {
                let Cell = FindCell(x2, i+1)
                if (!Cell) { return false; }

                if (Cell.rightUnion && GetMaxColumnCount() != x2) {
                    return false;
                }
            }

            return true;
        } else {
            for (let i = y1; i < y2; i++) {
                if (x1 == 0) {
                    return true;
                }

                let Cell = FindCell(x1, i+1)
                if (!Cell || Cell.rightUnion) { return false; }
            }

            return true;
        }
    } else if (modifier.type === ModifierTypes.HorizontalSeparator || modifier.type === ModifierTypes.VerticalSeparator) {
        if (modifier.type === ModifierTypes.HorizontalSeparator) {
            // Check left
            if (x1 != 0) {
                let Cell = FindCell(x1, y1+1);
                if (!Cell || Cell.rightUnion) { return false; }
            }

            // Check right
            if (x2 != GetMaxColumnCount()) {
                let Cell = FindCell(x2, y1+1);
                if (!Cell || Cell.rightUnion) { return false; }
            }

            return true;
        } else {
            // Check top
            if (y1 != 0) {
                let Cell = FindCell(x2, y1);
                if (!Cell || Cell.bottomUnion) { return false; }
            }

            // Check bottom
            if (GetMaxRowCount() != y2) {
                let Cell = FindCell(x2, y2);
                if (!Cell || Cell.bottomUnion) { return false; }
            }

            return true;
        }
    } else if (modifier.type === ModifierTypes.BoxIn || modifier.type === ModifierTypes.BoxOut) {
        // Check left
        for (let i = y1; i < y2; i++) {
            if (x1 == 0) {
                continue;
            }

            let Cell = FindCell(x1, i+1);
            if (!Cell || Cell.rightUnion) { return false; }
        }

        // Check right
        for (let i = y1; i < y2; i++) {
            if (x2 == GetMaxColumnCount()) {
                continue;
            }

            let Cell = FindCell(x2, i+1);
            if (!Cell || Cell.rightUnion) { return false; }
        }

        return true;
    }

    return false;
}

// true - good
function CheckInnerSpace(modifier) {
    let x1, x2, y1, y2;

    // Normalize
    if (modifier.fromColumn > modifier.toColumn) {
        x1 = modifier.toColumn;
        x2 = modifier.fromColumn;
    } else {
        x2 = modifier.toColumn;
        x1 = modifier.fromColumn;
    }
    if (modifier.fromRow > modifier.toRow) {
        y1 = modifier.toRow;
        y2 = modifier.fromRow;
    } else {
        y2 = modifier.toRow;
        y1 = modifier.fromRow;
    }

    for (let i = y1; i < y2; i++) {
        for (let j = x1+1; j < x2+1; j++) {
            let Cell = FindCell(j, i+1);
            if (!Cell) { return false; }

            if (j < x2 && !Cell.rightUnion) {
                return false;
            }

            if ((i+1) < y2 && !Cell.bottomUnion) {
                return false;
            }
        }
    }

    return true;
}

// true - good
function CheckOuterSpace(modifier) {
    let x1, x2, y1, y2;

    // Normalize
    if (modifier.fromColumn > modifier.toColumn) {
        x1 = modifier.toColumn;
        x2 = modifier.fromColumn;
    } else {
        x2 = modifier.toColumn;
        x1 = modifier.fromColumn;
    }
    if (modifier.fromRow > modifier.toRow) {
        y1 = modifier.toRow;
        y2 = modifier.fromRow;
    } else {
        y2 = modifier.toRow;
        y1 = modifier.fromRow;
    }

    if (x2 > GetMaxColumnCount()) {
        return false;
    }

    if (y2 > GetMaxRowCount()) {
        return false;
    }

    return true;
}

function CheckSize(modifier) {
    let RectModifier = CalculateRectModifier(modifier);
    let minWidth, maxWidth, minHeight, maxHeight;

    if (modifier.type === ModifierTypes.DoorIn || modifier.type === ModifierTypes.DoorOut) {
        minWidth = 300;
        maxWidth = 600;
        minHeight = 300;
        maxHeight = 2400;
    } else if (modifier.type === ModifierTypes.BoxIn || modifier.type === ModifierTypes.BoxOut) {
        minWidth = 300;
        maxWidth = 900;
        minHeight = 100;
        maxHeight = 300;
    }

    RectModifier.width = RectModifier.width*1000 - thickness*1000;
    RectModifier.height = RectModifier.height*1000 - thickness*1000;

    return !(RectModifier.width < minWidth || RectModifier.width > maxWidth || RectModifier.height < minHeight || RectModifier.height > maxHeight);
}

// Modifier List
// -------------------
function AddDoorModifier(type) {
    let dir;

    if (fModifierColumn > tModifierColumn) {
        dir = Direction.Left;
    } else {
        dir = Direction.Right;
    }

    let modifier = {
        type: type,
        uuid: uuidv4(),
        fromColumn: fModifierColumn,
        fromRow: fModifierRow,
        toColumn: tModifierColumn,
        toRow: tModifierRow,
        direction: dir,
        opened: false,
    };

    Modifiers.push(modifier);
}

function AddBoxModifier(type) {
    let modifier = {
        type: type,
        uuid: uuidv4(),
        fromColumn: fModifierColumn,
        fromRow: fModifierRow,
        toColumn: tModifierColumn,
        toRow: tModifierRow,
        opened: false,
    }

    Modifiers.push(modifier);
}

function AddSeparatorModifier(type) {
    let modifier = {
        type: type,
        uuid: uuidv4(),
        fromColumn: fModifierColumn,
        fromRow: fModifierRow,
        toColumn: tModifierColumn,
        toRow: tModifierRow,
        opened: false,
    }

    Modifiers.push(modifier);
}

// Modifier Builders
// -------------------
function BuildDoorModifier(modifier) {
    let RectModifier = CalculateRectModifier(modifier);

    // Setup Material
    let doorMaterial = basicMaterial.clone();
    doorMaterial.transparent = true;

    let doorMesh, doorhandle;
    let doorGroup = new THREE.Group();

    // Create Door
    let width, height;
    if (modifier.type === ModifierTypes.DoorIn) {
        width = RectModifier.width-thickness*1.2;
        height = RectModifier.height-thickness*1.2;
        doorMesh = AddCubeMesh(width, height, thickness, doorMaterial);
        doorhandle = AddCylinderMesh(0.012, 0.006, 0.022, 8, handleMaterial);
    } else {
        width = RectModifier.width-thickness/8;
        height = RectModifier.height-thickness/8;
        doorMesh = AddCubeMesh(width, height, thickness, doorMaterial);
        doorhandle = AddCylinderMesh(0.012, 0.006, 0.022, 8, handleMaterial);
    }

    doorMesh.renderOrder = -1;
    doorhandle.renderOrder = -1;
    doorGroup.renderOrder = -1;

    doorhandle.rotation.set(Deg2Rad(90), 0, 0);

    // Door Direction
    if (modifier.direction === Direction.Right) {
        doorhandle.position.set(RectModifier.width/2-0.03, 0, thickness);
    } else {
        doorhandle.position.set(-RectModifier.width/2+0.03, 0, thickness);
    }

    doorGroup.add(doorMesh);
    doorGroup.add(doorhandle);

    if (!editMode) {
        raycastObjects.push(doorGroup);
        raycastObjects.push(doorMesh);
    }

    // Set Position
    if (modifier.type === ModifierTypes.DoorIn) {
        doorGroup.position.set(-x/2 + thickness/2 + RectModifier.leftOffset + RectModifier.width/2, y/2 - thickness/2 - RectModifier.topOffset - RectModifier.height/2, z/2 - thickness/2.2);
    } else {
        doorGroup.position.set(-x/2 + thickness/2 + RectModifier.leftOffset + RectModifier.width/2, y/2 - thickness/2 - RectModifier.topOffset - RectModifier.height/2, z/2 + thickness/2);
    }

    // Opened/Closed transform
    let alpha = 75;
    if (modifier.opened) {
        let xOffset = width/2 - (width/2) * Math.cos(Deg2Rad(alpha));
        let zOffset = (width/2) * Math.sin(Deg2Rad(alpha));

        if (modifier.direction === Direction.Right) {
            doorGroup.rotateY(Deg2Rad(-alpha));
            doorGroup.position.set(doorGroup.position.x - xOffset, doorGroup.position.y, doorGroup.position.z + zOffset);
        } else {
            doorGroup.rotateY(Deg2Rad(alpha));
            doorGroup.position.set(doorGroup.position.x + xOffset, doorGroup.position.y, doorGroup.position.z + zOffset);
        }
    }

    doorMesh.userData = {
        uuid: modifier.uuid,
        type: modifier.type,
        sActive: false,
        sAvailableToRaycast: true,
        modifier: true,
    };
    doorGroup.userData = {
        uuid: modifier.uuid,
        type: modifier.type,
        sActive: false,
        sAvailableToRaycast: true,
        modifier: true,
    };

    scene.add(doorGroup);
    templateObjects.push(doorGroup);
}

function BuildBoxModifier(modifier) {
    let RectModifier = CalculateRectModifier(modifier);

    let boxMaterial = basicMaterial.clone();
    boxMaterial.transparent = true;

    let mdfMaterial = basicBGMaterial.clone();
    mdfMaterial.transparent = true;

    let backBorder, leftBorder, rightBorder, bottomBorder, frontBorder, handle;
    let boxGroup = new THREE.Group;

    if (modifier.type === ModifierTypes.BoxIn) {
        backBorder = AddCube(RectModifier.width - thickness*1.2, RectModifier.height - 3*thickness, thickness, boxMaterial);
        leftBorder = AddCube(thickness, RectModifier.height - 3*thickness, z-2*thickness, boxMaterial);
        rightBorder = AddCube(thickness, RectModifier.height - 3*thickness, z-2*thickness, boxMaterial);
        bottomBorder = AddCube(RectModifier.width - thickness*1.2, thickness/4, z-thickness, mdfMaterial);
        frontBorder = AddCube(RectModifier.width - thickness*1.2, RectModifier.height - thickness*1.2, thickness, boxMaterial);
        handle = AddCylinderMesh(0.012, 0.006, 0.022, 8, handleMaterial);

        backBorder.position.set(0, -thickness*0.9, -z/2 + thickness/2);
        leftBorder.position.set(-RectModifier.width/2 + thickness*1.4, -thickness*0.9, 0);
        rightBorder.position.set(RectModifier.width/2 - thickness*1.4, -thickness*0.9, 0);
        bottomBorder.position.set(0, -RectModifier.height/2 + thickness, -thickness/2);
        frontBorder.position.set(0, 0, z/2 - thickness/2);
        handle.position.set(0, 0, z/2 + thickness);
    } else {
        backBorder = AddCube(RectModifier.width - thickness*1.2, RectModifier.height - 3*thickness, thickness, boxMaterial);
        leftBorder = AddCube(thickness, RectModifier.height - 3*thickness, z-thickness, boxMaterial);
        rightBorder = AddCube(thickness, RectModifier.height - 3*thickness, z-thickness, boxMaterial);
        bottomBorder = AddCube(RectModifier.width - thickness*1.2, thickness/4, z-thickness, mdfMaterial);
        frontBorder = AddCube(RectModifier.width - thickness/8, RectModifier.height - thickness/8, thickness, boxMaterial);
        handle = AddCylinderMesh(0.012, 0.006, 0.022, 8, handleMaterial);

        backBorder.position.set(0, -thickness*0.9, -z/2 + thickness/2);
        leftBorder.position.set(-RectModifier.width/2 + thickness*1.4, -thickness*0.9, thickness/2);
        rightBorder.position.set(RectModifier.width/2 - thickness*1.4, -thickness*0.9, thickness/2);
        bottomBorder.position.set(0, -RectModifier.height/2 + thickness, 0);
        frontBorder.position.set(0, 0, z/2 + thickness/2);
        handle.position.set(0, 0, z/2 + 2.5*thickness);
    }

    backBorder.renderOrder = -1;
    leftBorder.renderOrder = -1;
    rightBorder.renderOrder = -1;
    bottomBorder.renderOrder = -1;
    frontBorder.renderOrder = -1;
    handle.renderOrder = -1;

    handle.rotation.set(Deg2Rad(90), 0, 0);

    boxGroup.add(backBorder);
    boxGroup.add(leftBorder);
    boxGroup.add(rightBorder);
    boxGroup.add(bottomBorder);
    boxGroup.add(frontBorder);
    boxGroup.add(handle);

    // Set box position
    boxGroup.position.set(-x/2 + thickness/2 + RectModifier.leftOffset + RectModifier.width/2, y/2 - thickness/2 - RectModifier.topOffset - RectModifier.height/2, 0);

    if (modifier.opened) {
        boxGroup.position.setZ(0.7*z);
    }

    if (!editMode) {
        raycastObjects.push(leftBorder);
        raycastObjects.push(rightBorder);
        raycastObjects.push(backBorder);
        raycastObjects.push(bottomBorder);
        raycastObjects.push(frontBorder);
    }

    backBorder.userData = {
        uuid: modifier.uuid,
        type: modifier.type,
        sActive: false,
        sAvailableToRaycast: true,
        modifier: true,
    };
    leftBorder.userData = {
        uuid: modifier.uuid,
        type: modifier.type,
        sActive: false,
        sAvailableToRaycast: true,
        modifier: true,
    };
    rightBorder.userData = {
        uuid: modifier.uuid,
        type: modifier.type,
        sActive: false,
        sAvailableToRaycast: true,
        modifier: true,
    };
    bottomBorder.userData = {
        uuid: modifier.uuid,
        type: modifier.type,
        sActive: false,
        sAvailableToRaycast: true,
        modifier: true,
    };
    frontBorder.userData = {
        uuid: modifier.uuid,
        type: modifier.type,
        sActive: false,
        sAvailableToRaycast: true,
        modifier: true,
    };
    boxGroup.userData = {
        uuid: modifier.uuid,
        type: modifier.type,
        sActive: false,
        sAvailableToRaycast: true,
        modifier: true,
    };

    scene.add(boxGroup);
    templateObjects.push(boxGroup);
}

function BuildSeparatorModifier(modifier) {
    let RectModifier = CalculateRectModifier(modifier);

    // Setup Material
    let separatorMaterial = basicMaterial.clone();
    separatorMaterial.transparent = true;

    let separatorMesh;

    if (modifier.type === ModifierTypes.VerticalSeparator) {
        separatorMesh = AddCube(thickness, RectModifier.height, z, separatorMaterial);
    } else {
        separatorMesh = AddCube(RectModifier.width, thickness, z, separatorMaterial);
    }

    separatorMesh.position.set(-x/2 + thickness/2 + RectModifier.leftOffset + RectModifier.width/2,
        y/2 - thickness/2 - RectModifier.topOffset - RectModifier.height/2, 0);

    separatorMesh.userData = {
        uuid: modifier.uuid,
        type: modifier.type,
        sActive: false,
        sAvailableToRaycast: true,
        modifier: true,
    };

    if (!editMode) {
        raycastObjects.push(separatorMesh);
    }

    scene.add(separatorMesh);
    templateObjects.push(separatorMesh);
}

// Union functionality
// -------------------
function Union(fColumn, fRow, sColumn, sRow) {
    if (fColumn === sColumn && fRow !== sRow) {
        if (fRow < sRow) {
            let Cell = FindCell(fColumn, fRow);
            Cell.bottomUnion = !Cell.bottomUnion;
        } else {
            let Cell = FindCell(sColumn, sRow);
            Cell.bottomUnion = !Cell.bottomUnion;
        }
    } else if (fColumn !== sColumn && fRow === sRow) {
        if (fColumn < sColumn) {
            let Cell = FindCell(fColumn, fRow);
            Cell.rightUnion = !Cell.rightUnion;
        } else {
            let Cell = FindCell(sColumn, sRow);
            Cell.rightUnion = !Cell.rightUnion;
        }
    }

    BuildTemplate();
}

function BuildAvailableUnionHandlers(column=1, row=1) {
    let unionHandlers = raycastObjects.filter(object => object.userData.type === IObjectTypes.UnionHandler);

    // Disable all union handlers, exclude middle handler
    let middleCell = FindCell(column, row);
    for (let i = 0; i < unionHandlers.length; i++) {
        if (unionHandlers[i].userData.dColumn === column && unionHandlers[i].userData.dRow === row) {
            unionHandlers[i].userData.sAvailableToRaycast = true;
            continue;
        }

        unionHandlers[i].userData.sAvailableToRaycast = false;
    }

    // Left handler
    let leftHandler = FindUnionHandler(column-1, row);
    if (leftHandler !== null) {
        let Cell = FindCell(column-1, row);

        if (((Cell.width+Cell.additiveWidth) + (middleCell.width+middleCell.additiveWidth) <= maxCellWidth) && (CheckILeftLine(column-1, row)) || (Cell.rightUnion)) {
            leftHandler.userData.sAvailableToRaycast = true;
        } else if (Cell.rightUnion) {
            leftHandler.userData.sAvailableToRaycast = true;
        }
    }

    // Right handler
    let rightHandler = FindUnionHandler(column+1, row);
    if (rightHandler !== null) {
        let Cell = FindCell(column+1, row);

        if (((Cell.width+Cell.additiveWidth) + (middleCell.width+middleCell.additiveWidth) <= maxCellWidth) && (CheckIRightLine(column+1, row)) || (middleCell.rightUnion)) {
            rightHandler.userData.sAvailableToRaycast = true;
        } else if (middleCell.rightUnion) {
            rightHandler.userData.sAvailableToRaycast = true;
        }
    }

    // Top handler
    let topHandler = FindUnionHandler(column, row-1);
    if (topHandler !== null) {
        let Cell = FindCell(column, row-1);

        if (((Cell.height+Cell.additiveHeight) + (middleCell.height+middleCell.additiveHeight) <= maxCellHeight) && (CheckITopLine(column, row-1)) || (Cell.bottomUnion)) {
            topHandler.userData.sAvailableToRaycast = true;
        }
    }

    // Bottom handler
    let bottomHandler = FindUnionHandler(column, row+1);
    if (bottomHandler !== null) {
        let Cell = FindCell(column, row+1);

        if (((Cell.height+Cell.additiveHeight) + (middleCell.height+middleCell.additiveHeight) <= maxCellHeight) && (CheckIBottomLine(column, row+1)) || (middleCell.bottomUnion)) {
            bottomHandler.userData.sAvailableToRaycast = true;
        }
    }
}

// Проверка верхней линии на соблюдение прямоугольной (I) формы
function CheckITopLine(column, row) {
    let middleCell = FindCell(column, row);
    let leftCell, rightCell;

    // Check Source Cell
    leftCell = FindCell(column-1, row+1);
    rightCell = FindCell(column+1, row+1);
    if (rightCell && FindCell(column, row+1).rightUnion || leftCell && leftCell.rightUnion) {
        return false;
    }

    // Check Middle Cell
    leftCell = FindCell(column-1, row);
    rightCell = FindCell(column+1, row);
    if (rightCell && middleCell.rightUnion || leftCell && leftCell.rightUnion) {
        return false;
    }

    // Check top line
    let topCell = FindCell(column, row-1);
    while (topCell) {
        if (!topCell.bottomUnion) {
            break;
        }

        leftCell = FindCell(topCell.column-1, topCell.row);
        rightCell = FindCell(topCell.column+1, topCell.row);
        if (rightCell && topCell.rightUnion || leftCell && leftCell.rightUnion) {
            return false;
        }

        topCell = FindCell(column, topCell.row-1);
    }

    return true;
}

// Проверка нижней линии на соблюдение прямоугольной (I) формы
function CheckIBottomLine(column, row) {
    let middleCell = FindCell(column, row);
    let leftCell, rightCell;

    // Check Source Cell
    leftCell = FindCell(column-1, row-1);
    rightCell = FindCell(column+1, row-11);
    if (rightCell && FindCell(column, row-1).rightUnion || leftCell && leftCell.rightUnion) {
        return false;
    }

    // Check Middle Cell
    leftCell = FindCell(column-1, row);
    rightCell = FindCell(column+1, row);
    if (rightCell && middleCell.rightUnion || leftCell && leftCell.rightUnion) {
        return false;
    }

    // Check bottom line
    let bottomCell = FindCell(column, row+1);
    while (bottomCell) {
        let prevCell = FindCell(bottomCell.column, bottomCell.row-1);
        if (!prevCell.bottomUnion) {
            break;
        }

        leftCell = FindCell(bottomCell.column-1, bottomCell.row);
        rightCell = FindCell(bottomCell.column+1, bottomCell.row);
        if (rightCell && bottomCell.rightUnion || leftCell && leftCell.rightUnion) {
            return false;
        }

        bottomCell = FindCell(column, bottomCell.row-1);
    }

    return true;
}

// Проверка левой линии на соблюдение прямоугольной (I) формы
function CheckILeftLine(column, row) {
    let middleCell = FindCell(column, row);
    let topCell, bottomCell;

    // Check Source Cell
    topCell = FindCell(column+1, row-1);
    bottomCell = FindCell(column+1, row+1);
    if (bottomCell && FindCell(column+1, row).bottomUnion || topCell && topCell.bottomUnion) {
        return false;
    }

    // Check Middle Cell
    topCell = FindCell(column, row-1);
    bottomCell = FindCell(column, row+1);
    if (bottomCell && middleCell.bottomUnion || topCell && topCell.bottomUnion) {
        return false;
    }

    // Check left line
    let leftCell = FindCell(column-1, row);
    while (leftCell) {
        if (!leftCell.rightUnion) {
            break;
        }

        topCell = FindCell(leftCell.column, leftCell.row-1);
        bottomCell = FindCell(leftCell.column, leftCell.row+1);
        if (bottomCell && leftCell.bottomUnion || topCell && topCell.bottomUnion) {
            return false;
        }

        leftCell = FindCell(leftCell.column-1, row);
    }

    return true;
}

// Проверка правой линии на соблюдение прямоугольной (I) формы
function CheckIRightLine(column, row) {
    let middleCell = FindCell(column, row);
    let topCell, bottomCell;

    // Check Source Cell
    topCell = FindCell(column-1, row-1);
    bottomCell = FindCell(column-1, row+1);
    if (bottomCell && FindCell(column-1, row).bottomUnion || topCell && topCell.bottomUnion) {
        return false;
    }

    // Check Middle Cell
    topCell = FindCell(column, row-1);
    bottomCell = FindCell(column, row+1);
    if (bottomCell && middleCell.bottomUnion || topCell && topCell.bottomUnion) {
        return false;
    }

    // Check left line
    let rightCell = FindCell(column+1, row);
    while (rightCell) {
        let prevCell = FindCell(rightCell.column-1, row);
        if (!prevCell.rightUnion) {
            break;
        }

        topCell = FindCell(rightCell.column, rightCell.row-1);
        bottomCell = FindCell(rightCell.column, rightCell.row+1);
        if (bottomCell && rightCell.bottomUnion || topCell && topCell.bottomUnion) {
            return false;
        }

        rightCell = FindCell(rightCell.column+1, row);
    }

    return true;
}

function FindUnionHandler(column, row) {
    let handler = raycastObjects.filter(object => object.userData.type === IObjectTypes.UnionHandler
        && object.userData.dColumn === column && object.userData.dRow === row);

    if (handler === undefined || handler === null || handler[0] === undefined || handler[0] === null) {
        return null;
    }

    return handler[0];
}

function EnableAllUnionHandlers() {
    let unionHandlers = raycastObjects.filter(object => object.userData.type === IObjectTypes.UnionHandler);

    for (let i = 0; i < unionHandlers.length; i++) {
        unionHandlers[i].userData.sAvailableToRaycast = true;
        unionHandlers[i].material.color.setHex( 0xffffff );
        unionHandlers[i].userData.sActive = false;
    }
}

function DisableAllUnionHandlers() {
    let unionHandlers = raycastObjects.filter(object => object.userData.type === IObjectTypes.UnionHandler);

    for (let i = 0; i < unionHandlers.length; i++) {
        unionHandlers[i].userData.sAvailableToRaycast = false;
        unionHandlers[i].material.color.setHex( 0xa8a8a8 );
        unionHandlers[i].userData.sActive = false;
    }
}

// Edit mode
function EditMode() {
    if (!editMode) { return; }

    BuildModifierHandlers();
}

// JSON Import/Export
function JSONExport() {
    let json;

    let JSONParams = params;
    let JSONGrid = Grid;
    let JSONModifiers = Modifiers;
    let JSONModes = {
        EditMode: editMode,
        DebugMode: debugMode,
        DeleteMode: deleteMode,
    };

    json = {
        Params: JSONParams,
        Grid: JSONGrid,
        Modifiers: JSONModifiers,
        Modes: JSONModes,
    }

    return JSON.stringify(json);
}

function JSONImport(json) {
    let config = JSON.parse(json);

    let prm
    try {
        prm = config.Params;
        Grid = config.Grid;
        Modifiers = config.Modifiers;
        debugMode = config.Modes.DebugMode;
        editMode = config.Modes.EditMode;
        deleteMode = config.Modes.DeleteMode;
    } catch (e) {
        console.log("Import JSON Failed!");
        console.log(e);
    }

    params["param-width"] = prm["param-width"];
    params["param-height"] = prm["param-height"];
    params["param-depth"] = prm["param-depth"];
    params["thickness"] = prm["thickness"];
    params["param-vsection"] = prm["param-vsection"];
    params["param-hsection"] = prm["param-hsection"];
    params["param-sections"] = prm["param-sections"];
    params["param-material"] = prm["param-material"];
    params["param-bg"] = prm["param-bg"];
    params["param-edge"] = prm["param-edge"];
    params["param-plinth"] = prm["param-plinth"];
    params["param-template-2d"] = prm["param-template-2d"];

    ChangeMaterial();
    ChangeBGMaterial();

    window.Modifiers = Modifiers;

    window.dispatchEvent(new CustomEvent("RecalculateSliders", {}));
    SafetyChecks();
    BuildTemplate();
}

window.addEventListener("ExportJSON", () => {
    document.getElementById("JSONTextarea").value = JSONExport();
});
window.addEventListener("ImportJSON", () => {
    let json = document.getElementById("JSONTextarea").value;
    JSONImport(json);
});
window.addEventListener("EnableEditMode", () => {
    editMode = true;
    CloseContextMenu();
    DisableAllModifierObjects();
    BuildTemplate();
});
window.addEventListener("DisableEditMode", () => {
    editMode = false;
    CloseContextMenu();
    EnableAllModifierObjects();
    BuildTemplate();
});
window.addEventListener("ContextMenuAction", (event) => {
    if (!window.context) { return; }

    let ActionType = event.detail.type;

    switch (ActionType) {
        case "open":
            OpenCloseModifier(window.context.uuid);
            break;
        case "delete":
            DeleteModifier(window.context.uuid);
            break;
    }

    BuildTemplate();
});
window.addEventListener("AddModifier", (event) => {
    let ModifierType = event.detail.ModifierType;

    switch (ModifierType) {
        case "DoorIn":
            AddDoorModifier(ModifierTypes.DoorIn);
            break;
        case "DoorOut":
            AddDoorModifier(ModifierTypes.DoorOut);
            break;
        case "BoxIn":
            AddBoxModifier(ModifierTypes.BoxIn);
            break;
        case "BoxOut":
            AddBoxModifier(ModifierTypes.BoxOut);
            break;
        case "VerticalSeparator":
            AddSeparatorModifier(ModifierTypes.VerticalSeparator);
            break;
        case "HorizontalSeparator":
            AddSeparatorModifier(ModifierTypes.HorizontalSeparator);
            break;
    }

    BuildTemplate();
});

// Debug Switcher
function SwitchDebug(value) {
    debugMode = value;

    BuildTemplate();
}

window.SwitchDebug = SwitchDebug;