import * as THREE from "three";
import {FontLoader} from "three/examples/jsm/loaders/FontLoader";

let WIDTH = 500;
let HEIGHT = 500;

let templateObjects = [];
let textObjects = [];

let params = window.BasicParams;

// THREE.JS Init
let renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(WIDTH, HEIGHT);
renderer.setPixelRatio( window.devicePixelRatio );
renderer.setClearColor(0xf7f7f7, 1);
document.getElementById("template-2d-canvas-placement").appendChild(renderer.domElement);

// Init Scene
const scene = new THREE.Scene();

const camera = new THREE.OrthographicCamera();
camera.position.set(0, 0, 0);
scene.add(camera);

let basicMaterial = new THREE.MeshBasicMaterial( { "color": 0x000000 } );
let basicBGMaterial = new THREE.MeshBasicMaterial( { "color": 0xffffff } );
let lineMaterial = new THREE.LineBasicMaterial( { "color": 0x808080 } );
let basicOutlineMaterial = new THREE.LineBasicMaterial( { "color": 0x808080 } );
let metricLineMaterial = new THREE.LineBasicMaterial( { "color": 0xff2626 } );
let outlineMaterial = new THREE.LineBasicMaterial( { "color": 0x000000 } );
let legsMaterial = new THREE.MeshBasicMaterial( { "color": 0x000000 } );

// Font Init
const matLite = new THREE.MeshBasicMaterial( {
    color: 0xff2626,
    transparent: true,
    opacity: 0.75,
    side: THREE.DoubleSide
} );
const loader = new FontLoader();
let fontFace;
loader.load('fonts/helvetiker_regular.typeface.json', function (font) {
    fontFace = font;
    RenderTemplate2D();
});

let grid2d = window.Grid;
let modifiers = window.Modifiers;

function RenderFrontView() {
    camera.position.set(0, 0, 3);

    let columnCount = params["param-vsection"].currentValue;
    let rowCount = params["param-hsection"].currentValue;
    let x = params["param-width"].currentValue / 1000;
    let y = params["param-height"].currentValue / 1000;
    let z = params["param-depth"].currentValue / 1000;
    let thickness = params["thickness"].value / 1000;

    let xCopy = x;
    let yCopy = y;
    let thicknessCopy = thickness;

    let plinthType = params["param-plinth"].type;
    let plinthLength = params["param-plinth"].currentValue / 1000;
    let lengthOffset = 0;

    if (plinthType !== "none") {
        lengthOffset = plinthLength;
    }

    let lengthOffsetCopy = lengthOffset;

    let offset = 0.04;

    let scale = 1.5;
    if (y >= x) {
        scale /= y;
    } else {
        scale /= x;
    }

    x *= scale;
    y *= scale;
    z *= scale;
    thickness *= scale;
    lengthOffset *= scale;
    offset *= scale;

    let leftBorder = AddCubeEdges(thickness, y - 2*thickness - lengthOffset, z, outlineMaterial);
    leftBorder.position.set(-(x / 2) + (thickness / 2), lengthOffset / 2, 0);

    let rightBorder = AddCubeEdges(thickness, y - 2*thickness - lengthOffset, z, outlineMaterial);
    rightBorder.position.set((x / 2) - (thickness / 2), lengthOffset / 2, 0);

    let topBorder = AddCubeEdges(x, thickness, z, outlineMaterial);
    topBorder.position.set(0, (y / 2) - (thickness / 2), 0);

    let bottomBorder = AddCubeEdges(x, thickness, z, outlineMaterial);
    bottomBorder.position.set(0, -(y / 2) + (thickness / 2) + lengthOffset, 0);

    // Width
    let lineOffset;

    lineOffset = (offset * 3)/scale;

    AddText(Math.trunc((x/scale)*1000) + "", 0, y/2 + lineOffset*1.15, 0,
        Deg2Rad(0), Deg2Rad(0), Deg2Rad(0), 0.045);
    MetricsLine(Point(-x/2, y/2, 0), Point(-x/2, y/2 + lineOffset, 0),
        Point(x/2, y/2 + lineOffset, 0), Point(x/2, y/2, 0), metricLineMaterial);

    // Height
    AddText(Math.trunc((y/scale)*1000) + "", x/2 + lineOffset*1.15, 0, 0,
        Deg2Rad(0), Deg2Rad(0), Deg2Rad(-90), 0.045);
    MetricsLine(Point(x/2, y/2, 0), Point(x/2+lineOffset, y/2, 0),
        Point(x/2+lineOffset, -y/2, 0), Point(x/2, -y/2, 0), metricLineMaterial);

    if (plinthType !== "none") {
        AddText(Math.trunc(plinthLength*1000) + "", x/2 + lineOffset*1.15, -y/2 + lengthOffset/2, 0,
            Deg2Rad(0), Deg2Rad(0), Deg2Rad(-90), 0.045);
        MetricsLine(Point(x/2, -y/2 + lengthOffset, 0), Point(x/2 + lineOffset, -y/2 + lengthOffset, 0),
            Point(x/2 + lineOffset, -y/2, 0), Point(x/2, -y/2, 0), metricLineMaterial);
    }

    if (plinthType === "normal") {
        let leftPlinthBorder = AddCubeEdges(thickness, lengthOffset, z - 0.03, outlineMaterial);
        leftPlinthBorder.position.set(-x/2 + thickness/2, -y/2 + lengthOffset/2, 0.015);

        let rightPlinthBorder = AddCubeEdges(thickness, lengthOffset, z - 0.03, outlineMaterial);
        rightPlinthBorder.position.set(x/2 - thickness/2, -y/2 + lengthOffset/2, 0.015);

        let forwardPlinthBorder = AddCubeEdges(x - 2*thickness, lengthOffset, thickness, outlineMaterial);
        forwardPlinthBorder.position.set(0, -y/2 + lengthOffset/2, z/2 - 0.03);

        let backPlinthBorder = AddCubeEdges(x - 2*thickness, lengthOffset, thickness, outlineMaterial);
        backPlinthBorder.position.set(0, -y/2 + lengthOffset/2, -z/2 + 0.05);
    }

    if (plinthType === "legs") {
        let legsRadius = 0.02*scale;
        let depthLength = (z - 4*legsRadius - 0.02) * scale;
        let pairsCount = 0;

        if (x >= 1.2) {
            pairsCount += Math.trunc(x / (0.6 * scale)) - 1;
        }

        // Create side legs
        let leftFLeg = AddCylinder(legsRadius, lengthOffset, 12, legsMaterial);
        leftFLeg.position.set(-x/2 + 0.02 + legsRadius, -y/2 + lengthOffset/2, z/2 - (0.02 + legsRadius));

        let rightFLeg = AddCylinder(legsRadius, lengthOffset, 12, legsMaterial);
        rightFLeg.position.set(x/2 - (0.02 + legsRadius), -y/2 + lengthOffset/2, z/2 - (0.02 + legsRadius));

        // Create inner legs
        let xLen = (x - (0.02+legsRadius*2)*2) / (pairsCount+1);
        for (let i = 0; i < pairsCount; i++) {
            let legForward = AddCylinder(legsRadius, lengthOffset, 12, legsMaterial);

            let xPos = -x/2 + 0.02 + legsRadius*2 + xLen * (i + 1);

            legForward.position.set(xPos, -y/2 + lengthOffset/2, z/2 - (0.02 + legsRadius));
        }
    }

    ////////////////
    /// Sections ///
    ////////////////

    if (!grid2d) {
        return;
    }

    let leftOffset = thickness;
    let topOffset = 0;
    let plOffset = lengthOffset/rowCount;

    // Build Vertical boards
    for (let i = 1; i < columnCount; i++) {
        let Cells = GetColumnByIndex(i);
        let additiveOffset = -thickness/columnCount;
        leftOffset += (Cells[0].width + Cells[0].additiveWidth)*scale + thickness/2;

        let len = 0;

        for (let j = 0; j < Cells.length; j++) {
            if (!(j === Cells.length-1) && !(Cells[j].rightUnion)) {
                len += (Cells[j].height+Cells[j].additiveHeight)*scale + thickness + additiveOffset - plOffset;
            } else {
                if ((j === Cells.length-1) && !(Cells[j].rightUnion)) {
                    len += (Cells[j].height+Cells[j].additiveHeight)*scale + additiveOffset + thickness - plOffset;
                }

                if (len !== 0) {
                    let rightBorder = AddCubeEdges(thickness, len, z, outlineMaterial);
                    rightBorder.position.set(-x/2 + leftOffset, y/2 - thickness - len/2 - topOffset, 0);
                }

                if (Cells[j].rightUnion) {
                    topOffset += len + (Cells[j].height+Cells[j].additiveHeight)*scale - additiveOffset;
                } else {
                    topOffset += len + (Cells[j].height+Cells[j].additiveHeight)*scale + thickness;
                }

                len = 0;
            }
        }

        leftOffset += thickness/2;
        topOffset = 0;
    }

    // Build Horizontal boards
    topOffset = 0;
    leftOffset = 0;

    topOffset = thickness;
    for (let i = 1; i < rowCount; i++) {
        let Cells = GetRowByIndex(i);
        let additiveOffsetY = -thickness/columnCount;

        topOffset += (Cells[0].height+Cells[0].additiveHeight)*scale + thickness/2 - plOffset;

        let len = 0;
        for (let j = 0; j < Cells.length; j++) {
            let bBuild = false;
            len += (Cells[j].width+Cells[j].additiveWidth)*scale;

            if (Cells[j].bottomUnion) {
                leftOffset += len + thickness;
                len = 0;
                continue;
            }

            if (!Cells[j].rightUnion || j+1 === Cells.length) {
                let bottomBorder = AddCubeEdges(len, thickness, z, outlineMaterial);
                bottomBorder.position.set(-x/2 + thickness + leftOffset + len/2, y/2 - topOffset, 0);
                leftOffset += thickness;
                bBuild = true;
            }

            if (!Cells[j].rightUnion) {
                leftOffset += len;
            } else {
                len += thickness;
            }

            if (bBuild) {
                len = 0;
            }
        }

        topOffset += thickness/2;

        leftOffset = 0;
    }

    // Build Separators
    let modifiers = window.Modifiers;
    for (let i = 0; i < modifiers.length; i++) {
        if (modifiers[i].type === window.mTypes.HorizontalSeparator || modifiers[i].type === window.mTypes.VerticalSeparator) {
            let RectModifier = CalculateRectModifier(modifiers[i]);

            let separatorMesh;

            if (modifiers[i].type === window.mTypes.VerticalSeparator) {
                separatorMesh = AddCubeEdges(thickness, RectModifier.height*scale - thickness/2, z, outlineMaterial);
            } else {
                separatorMesh = AddCubeEdges(RectModifier.width*scale - thickness/2, thickness, z, outlineMaterial);
            }

            separatorMesh.position.set(-x/2 + thickness/2 + (RectModifier.leftOffset + RectModifier.width/2)*scale,
                y/2 - thickness/2 - (RectModifier.topOffset + RectModifier.height/2)*scale, 0);
        }
    }

    // Metrics
    let mCells = GetRowByIndex(1);

    leftOffset = thickness;
    for (let i = 0; i < mCells.length; i++) {
        AddText(Math.ceil((mCells[i].width+mCells[i].additiveWidth)*1000) + "", -x/2 + leftOffset + (mCells[i].width + mCells[i].additiveWidth)*scale/2, y/2 + lineOffset/2, 0,
            Deg2Rad(0), Deg2Rad(0), Deg2Rad(0), 0.045);
        MetricsLine(
            Point(-x/2 + leftOffset, y/2, 0),
            Point(-x/2 + leftOffset, y/2 + lineOffset/3, 0),
            Point(-x/2 + leftOffset + (mCells[i].width+mCells[i].additiveWidth)*scale, y/2 + lineOffset/3, 0),
            Point(-x/2 + leftOffset + (mCells[i].width+mCells[i].additiveWidth)*scale, y/2, 0), metricLineMaterial
        );
        leftOffset += (mCells[i].width + mCells[i].additiveWidth)*scale + thickness;
    }

    mCells = GetColumnByIndex(1);

    topOffset = thickness;
    for (let i = 0; i < mCells.length; i++) {
        AddText(Math.ceil((mCells[i].height+mCells[i].additiveHeight-plOffset/scale)*1000) + "", x/2 + lineOffset/2, y/2 - topOffset - (mCells[i].height+mCells[i].additiveHeight)*scale/2 + plOffset/2, 0,
            Deg2Rad(0), Deg2Rad(0), Deg2Rad(-90), 0.045);
        MetricsLine(
            Point(x/2, y/2 - topOffset, 0),
            Point(x/2 + lineOffset/3, y/2 - topOffset, 0),
            Point(x/2 + lineOffset/3, y/2 - topOffset - (mCells[i].height+mCells[i].additiveHeight)*scale + plOffset, 0),
            Point(x/2, y/2 - topOffset - (mCells[i].height+mCells[i].additiveHeight)*scale + plOffset, 0), metricLineMaterial
        );
        topOffset += (mCells[i].height + mCells[i].additiveHeight-plOffset/scale)*scale + thickness;
    }

    renderer.render( scene, camera );
}

function RenderSideView() {
    camera.position.set(0, 0, 2);

    let rowCount = params["param-hsection"].currentValue;
    let y = params["param-height"].currentValue / 1000;
    let z = params["param-depth"].currentValue / 1000;
    let thickness = params["thickness"].value / 1000;
    let offset = 0.05;

    let plinthType = params["param-plinth"].type;
    let plinthLength = params["param-plinth"].currentValue / 1000;
    let lengthOffset = 0;

    if (plinthType !== "none") {
        lengthOffset = plinthLength;
    }

    let scale = 1.5;
    if (z >= y) {
        scale /= z;
    } else {
        scale /= y;
    }

    y *= scale;
    z *= scale;
    offset *= scale;
    thickness *= scale;
    lengthOffset *= scale;

    let frame = AddCubeEdges(z, y-lengthOffset-2*thickness, 0.1, outlineMaterial);
    frame.position.set(0, lengthOffset/2, 0);

    let topFrame = AddCubeEdges(z, thickness, 0.1, outlineMaterial);
    topFrame.position.set(0, y/2-thickness/2, 0);

    let bottomFrame = AddCubeEdges(z, thickness, 0.1, outlineMaterial);
    bottomFrame.position.set(0, -y/2+lengthOffset+thickness/2, 0);

    let lineOffset;

    lineOffset = (offset * 3)/scale;

    // Depth
    AddText(Math.trunc((z/scale)*1000) + "", 0, y/2+lineOffset*1.15, 0,
        Deg2Rad(0), Deg2Rad(0), Deg2Rad(0), 0.045);
    MetricsLine(Point(-z/2, y/2, 0), Point(-z/2, y/2 + lineOffset, 0),
        Point(z/2, y/2 + lineOffset, 0), Point(z/2, y/2, 0), metricLineMaterial);

    // Height
    AddText(Math.trunc((y/scale)*1000) + "", z/2 + lineOffset*1.15, lengthOffset/2, 0,
        Deg2Rad(0), Deg2Rad(0), Deg2Rad(-90), 0.045);
    MetricsLine(Point(z/2, y/2, 0), Point(z/2 + lineOffset, y/2, 0),
        Point(z/2 + lineOffset, -y/2+lengthOffset, 0), Point(z/2, -y/2+lengthOffset, 0), metricLineMaterial);

    if (plinthType !== "none") {
        AddText(Math.trunc(plinthLength*1000) + "", z/2 + lineOffset*1.15, -y/2+lengthOffset/2, 0,
            Deg2Rad(0), Deg2Rad(0), Deg2Rad(-90), 0.045);
        MetricsLine(Point(z/2, -y/2+lengthOffset, 0), Point(z/2 + lineOffset, -y/2+lengthOffset, 0),
            Point(z/2 + lineOffset, -y/2, 0), Point(z/2, -y/2, 0), metricLineMaterial);
    }

    if (plinthType === "normal") {
        let rightPlinthBorder = AddCubeEdges(z-0.03*scale, lengthOffset,0.1, outlineMaterial);
        rightPlinthBorder.position.set(-0.015*scale, -y/2 + lengthOffset/2, 0);

        let forwardPlinthBorder = AddCubeEdges(thickness, lengthOffset, 0.1, basicOutlineMaterial);
        forwardPlinthBorder.position.set(z/2 - 0.05*scale, -y/2 + lengthOffset/2, 0);

        let backPlinthBorder = AddCubeEdges(thickness, lengthOffset, 0.1, basicOutlineMaterial);
        backPlinthBorder.position.set(-z/2 + 0.03*scale, -y/2 + lengthOffset/2, 0);
    }

    if (plinthType === "legs") {
        let legsRadius = 0.02*scale;
        let depthLength = (z - 4*legsRadius - 0.02) * scale;

        // Create side legs
        let leftFLeg = AddCylinder(legsRadius, lengthOffset, 12, legsMaterial);
        leftFLeg.position.set(z/2 - (0.02 + legsRadius), -y/2 + lengthOffset/2, 0);

        let rightFLeg = AddCylinder(legsRadius, lengthOffset, 12, legsMaterial);
        rightFLeg.position.set(-z/2 + (0.02 + legsRadius), -y/2 + lengthOffset/2, 0);
    }

    ////////////////
    /// Sections ///
    ////////////////

    if (!grid2d) {
        return;
    }

    let plOffset = lengthOffset / rowCount;

    let topOffset = thickness;
    let mCells = GetColumnByIndex(1);
    for (let i = 0; i < mCells.length-1; i++) {
        topOffset += (mCells[i].height+mCells[i].additiveHeight)*scale + thickness - plOffset;

        if (GetRowByIndex(1).length === 1 && mCells[i].bottomUnion) {
            continue;
        }

        let shelf = AddCubeEdges(z, thickness, 1, basicOutlineMaterial);
        shelf.position.set(0, y/2 - topOffset + thickness/2, -1);
    }

    topOffset = 0;
    for (let i = 0; i < mCells.length; i++) {
        AddText(Math.ceil((mCells[i].height+mCells[i].additiveHeight-plOffset/scale)*1000) + "",
            z/2 + lineOffset/2,
            y/2 - topOffset - (mCells[i].height+mCells[i].additiveHeight)*scale/2 + plOffset/2,
            0,
            Deg2Rad(0),
            Deg2Rad(0),
            Deg2Rad(-90),
            0.045);

        MetricsLine(
            Point(z/2, y/2 - thickness - topOffset, 0),
            Point(z/2 + lineOffset/3, y/2 - thickness - topOffset, 0),
            Point(z/2 + lineOffset/3, y/2 - thickness - (mCells[i].height+mCells[i].additiveHeight)*scale - topOffset + plOffset, 0),
            Point(z/2, y/2 - thickness - (mCells[i].height+mCells[i].additiveHeight)*scale - topOffset + plOffset, 0),
            metricLineMaterial
        );

        topOffset += thickness + (mCells[i].height+mCells[i].additiveHeight)*scale - plOffset;
    }

    renderer.render( scene, camera );
}

function RenderTopView() {
    camera.position.set(0, 0, 2);

    let x = params["param-width"].currentValue / 1000;
    let z = params["param-depth"].currentValue / 1000;
    let thickness = params["thickness"].value / 1000;
    let lineWidth = 0.007;
    let offset = 0.05;

    let xCopy = x;
    let thicknessCopy = thickness;

    let scale = 1.5;
    if (z >= x) {
        scale /= z;
    } else {
        scale /= x;
    }

    x *= scale;
    z *= scale;
    offset *= scale;

    let lineOffset;

    lineOffset = (offset * 3)/scale;

    AddCubeEdges(x, z, 0.1, outlineMaterial);
    let leftBorder = AddCubeEdges(thickness, z, 0.1, basicOutlineMaterial);
    leftBorder.position.set(-x/2 + thickness/2, 0, 0);

    let rightBorder = AddCubeEdges(thickness, z, 0.1, basicOutlineMaterial);
    rightBorder.position.set(x/2 - thickness/2, 0, 0);

    // Horizontal Metric
    AddText(Math.trunc((x/scale)*1000) + "", 0, z/2 + lineOffset*1.15, 0,
        Deg2Rad(0), Deg2Rad(0), Deg2Rad(0), 0.045);
    MetricsLine(Point(-x/2, z/2, 0), Point(-x/2, z/2 + lineOffset, 0),
        Point(x/2, z/2 + lineOffset, 0), Point(x/2, z/2, 0), metricLineMaterial);

    // Vertical Metric
    AddText(Math.trunc((z/scale)*1000) + "", x/2 + lineOffset*1.15, 0, 0,
        Deg2Rad(0), Deg2Rad(0), Deg2Rad(-90), 0.045);
    MetricsLine(Point(x/2, z/2, 0), Point(x/2 + lineOffset, z/2, 0),
        Point(x/2 + lineOffset, -z/2, 0), Point(x/2, -z/2, 0), metricLineMaterial);

    ////////////////
    /// Sections ///
    ////////////////

    let leftOffset = thickness;
    let mCells = GetRowByIndex(1);
    for (let i = 0; i < mCells.length-1; i++) {
        leftOffset += (mCells[i].width+mCells[i].additiveWidth)*scale + thickness;

        if (GetColumnByIndex(1).length === 1 && mCells[i].rightUnion) {
            continue;
        }

        let shelf = AddCubeEdges(thickness, z, 1, basicOutlineMaterial);
        shelf.position.set(-x/2 - thickness/2 + leftOffset, 0, -1);
    }

    leftOffset = thickness;
    for (let i = 0; i < mCells.length; i++) {
        AddText(
            Math.ceil((mCells[i].width+mCells[i].additiveWidth)*1000) + "",
            -x/2 + leftOffset + (mCells[i].width + mCells[i].additiveWidth)*scale/2,
            z/2 + lineOffset/2,
            0,
            Deg2Rad(0),
            Deg2Rad(0),
            Deg2Rad(0),
            0.045
        );

        MetricsLine(
            Point(-x/2 + leftOffset, z/2, 0),
            Point(-x/2 + leftOffset, z/2 + lineOffset/3, 0),
            Point(-x/2 + leftOffset + (mCells[i].width+mCells[i].additiveWidth)*scale, z/2 + lineOffset/3, 0),
            Point(-x/2 + leftOffset + (mCells[i].width+mCells[i].additiveWidth)*scale, z/2, 0),
            metricLineMaterial
        );

        leftOffset += (mCells[i].width + mCells[i].additiveWidth)*scale + thickness;
    }

    renderer.render( scene, camera );
}

window.addEventListener("RenderTemplate2D", RenderTemplate2D);

function RenderTemplate2D() {
    grid2d = window.Grid;

    ClearScene();
    switch (params["param-template-2d"].view) {
        case "front":
            RenderFrontView();
            break;
        case "side":
            RenderSideView();
            break;
        case "top":
            RenderTopView();
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
}

// Grid functionality
function FindCell(column, row) {
    for (let i = 0; i < grid2d.length; i++) {
        if (grid2d[i].column === column && grid2d[i].row === row) {
            return grid2d[i];
        }
    }

    return undefined;
}

function GetRowByIndex(index) {
    return grid2d.filter(function (value) {
        return value.row === index;
    });
}

function GetColumnByIndex(index) {
    return grid2d.filter(function (value) {
        return value.column === index;
    });
}

// Modifiers functionality
function CalculateRectModifier(modifier) {
    let width = 0;
    let height = 0;
    let leftOffset = 0, topOffset = 0;

    let thickness = params["thickness"].value / 1000;
    let rowCount = params["param-hsection"].currentValue;

    let plinthType = params["param-plinth"].type;
    let plinthLength = params["param-plinth"].currentValue / 1000;
    let lengthOffset = 0;

    if (plinthType !== "none") {
        lengthOffset = plinthLength;
    }

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


    return {
        width, height, leftOffset, topOffset,
    };
}

// Addition functions
function Point(x, y, z) {
    return new THREE.Vector3(x, y, z)
}

function Vector2(x, y) {
    return new THREE.Vector2(x, y);
}

function MetricsLine(a, b, c, d, material=lineMaterial) {
    let points = [];
    points.push(a);
    points.push(b);
    points.push(c);
    points.push(d);

    let geometry = new THREE.BufferGeometry().setFromPoints(points);

    let line = new THREE.Line(geometry, material);
    templateObjects.push(line);
    scene.add(line);
}

function AddText(str="", x=0, y=0, z=0,
                 yaw=0, pitch=0, roll=0, fontSize=0.1, direction="horizontal") {
    if (fontFace == null) { return; }

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

    return text;
}

function Deg2Rad(deg=0) {
    return deg*(Math.PI/180);
}

function AddCube(width, height, depth, material) {
    let geometry = new THREE.BoxGeometry(width, height, depth);
    let mesh = new THREE.Mesh(geometry, material);

    scene.add(mesh);
    templateObjects.push(mesh);

    return mesh;
}

function AddCubeEdges(width, height, depth, material) {
    let geometry = new THREE.BoxGeometry(width, height, depth);
    let geo = new THREE.EdgesGeometry(geometry);
    let edges = new THREE.LineSegments(geo, material);

    scene.add(edges);
    templateObjects.push(edges);

    return edges;
}

function AddCylinder(radius, height, segments, material) {
    let geometry = new THREE.CylinderGeometry(radius, radius, height, segments);
    let mesh = new THREE.Mesh(geometry, material);

    scene.add(mesh);
    templateObjects.push(mesh);

    return mesh;
}