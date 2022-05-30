let params = window.BasicParams;
let TemplateResizeEvent = new CustomEvent('TemplateResized', {});

let timer;

function OnTemplateResize() {
    clearTimeout(timer);
    EnableLoader();

    timer = setTimeout(TemplateResize, 1000);
}

function TemplateResize() {
    window.dispatchEvent(TemplateResizeEvent);
    DisableLoader();
}

function round(number, increment, offset) {
    return Math.ceil((number - offset) / increment) * increment + offset;
}

let sliders;
let SliderCalculate = function (event, i, lParams, perc) {
    let rect = sliders[i].getBoundingClientRect();
    let xPos = event.clientX - rect.left;
    let width = sliders[i].clientWidth;

    let offset = (xPos / width) * 100;
    let stepCounts = (lParams.maxValue - lParams.minValue) / lParams.step;
    let percCount = 100 / stepCounts;

    lParams.currentValue = round(Math.round(offset * perc + lParams.minValue), lParams.step, lParams.step);
    if (lParams.currentValue < lParams.minValue) {
        lParams.currentValue = lParams.minValue;
    } else if (lParams.currentValue > lParams.maxValue) {
        lParams.currentValue = lParams.maxValue;
    }

    offset = Math.round(offset / percCount) * percCount;

    if (offset > 100) {
        offset = 100;
    } else if (offset < 0) {
        offset = 0;
    }

    let children = sliders[i].children;
    children[0].style.width = offset + "%";
    children[1].style.left = offset - 7 + "%";
    children[1].innerText = lParams.currentValue;

    params[sliders[i].getAttribute("id")] = lParams;
    OnTemplateResize();
}

sliders = document.getElementsByClassName("slider");

for (let i = 0; i < sliders.length; i++) {
    let lParams = params[sliders[i].getAttribute("id")];
    let perc = 1 / 100 * (lParams.maxValue - lParams.minValue);
    let scale = (lParams.defaultValue - lParams.minValue) / perc;
    let sliderName = sliders[i].getAttribute("name");

    let lChildren = sliders[i].children;

    lChildren[0].style.width = scale + "%";
    lChildren[1].style.left = scale - 7 + "%";
    lChildren[1].innerText = lParams.defaultValue;

    if (sliderName === "vertical-sec") {
        params["param-vsection"].perc = perc;
    }

    if (sliderName === "horizontal-sec") {
        params["param-hsection"].perc = perc;
    }

    let handleEvent = function (event) {
        if (sliderName === "vertical-sec") {
            SliderCalculate(event, i, lParams, params["param-vsection"].perc);
        } else if (sliderName === "horizontal-sec") {
            SliderCalculate(event, i, lParams, params["param-hsection"].perc);
        } else {
            SliderCalculate(event, i, lParams, perc);
        }
    }

    let firstHandleEvent = function (event) {
        if (sliderName === "vertical-sec") {
            SliderCalculate(event, i, lParams, params["param-vsection"].perc);
        } else if (sliderName === "horizontal-sec") {
            SliderCalculate(event, i, lParams, params["param-hsection"].perc);
        } else {
            SliderCalculate(event, i, lParams, perc);
        }

        lChildren[2].addEventListener("mousemove", handleEvent, false);
    }

    lChildren[2].addEventListener("click", handleEvent, false);
    lChildren[2].addEventListener("mousedown", firstHandleEvent, false);
    lChildren[2].addEventListener("mouseup", () => {
        lChildren[2].removeEventListener("mousemove", handleEvent, false);
    });
    lChildren[2].addEventListener("mouseover", () => {
        lChildren[2].removeEventListener("mousemove", handleEvent, false);
    });
}

window.addEventListener("RecalculateSliders", () => {
    params["param-hsection"].perc = 1 / 100 * (params["param-hsection"].maxValue - params["param-hsection"].minValue);
    params["param-vsection"].perc = 1 / 100 * (params["param-vsection"].maxValue - params["param-vsection"].minValue);

    let hDelta = params["param-hsection"].maxValue - params["param-hsection"].minValue;
    let vDelta = params["param-vsection"].maxValue - params["param-vsection"].minValue;

    let hOffset = (params["param-hsection"].currentValue - params["param-hsection"].minValue) / params["param-hsection"].perc;
    let vOffset = (params["param-vsection"].currentValue - params["param-vsection"].minValue) / params["param-vsection"].perc;

    let hChildren = document.getElementById("param-hsection").children;
    hChildren[0].style.width = hOffset + "%";
    hChildren[1].style.left = hOffset - 7 + "%";
    hChildren[1].innerText = params["param-hsection"].currentValue;

    let vChildren = document.getElementById("param-vsection").children;
    vChildren[0].style.width = vOffset + "%";
    vChildren[1].style.left = vOffset - 7 + "%";
    vChildren[1].innerText = params["param-vsection"].currentValue;
});

let loaders;
function EnableLoader() {
    loaders = document.getElementsByClassName("loader-bg");

    for (let i = 0; i < loaders.length; i++) {
        loaders[i].style.display = "flex";
    }                        
}
function DisableLoader() {
    loaders = document.getElementsByClassName("loader-bg");

    for (let i = 0; i < loaders.length; i++) {
        loaders[i].style.display = "none";
    }
}

window.addEventListener("load", () => { DisableLoader(); })