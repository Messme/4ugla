let BasicParams = {
    "param-width": {
        minValue: 300,
        maxValue: 2700,
        defaultValue: 1430,
        currentValue: 1430,
        step: 10,
    },
    "param-height": {
        minValue: 750,
        maxValue: 2400,
        defaultValue: 1430,
        currentValue: 1430,
        step: 10,
    },
    "param-depth": {
        minValue: 300,
        maxValue: 600,
        defaultValue: 300,
        currentValue: 300,
        step: 10,
    },
    "thickness": {
        value: 16,
    },
    "param-vsection": {
        minValue: 1,
        maxValue: 15,
        defaultValue: 4,
        currentValue: 4,
        step: 1,
        perc: 1,
    },
    "param-hsection": {
        minValue: 1,
        maxValue: 15,
        defaultValue: 4,
        currentValue: 4,
        step: 1,
        perc: 1,
    },
    "param-sections": {
        minWidth: 300,
        maxWidth: 900,
        minHeight: 300,
        maxHeight: 900,
    },
    "param-material": {
        material: 'white-ldsp',
    },
    "param-bg": {
        enabled: false,
        width: 3,
        material: 'bg-white-mdf',
    },
    "param-edge": {
        edge: "wide",
    },
    "param-plinth": {
        minValue: 30,
        maxValue: 120,
        currentValue: 60,
        defaultValue: 60,
        step: 10,
        type: "none",
    },
    "param-template-2d": {
        view: "front",
    }
};

window.BasicParams = BasicParams;