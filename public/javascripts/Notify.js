'use strict';

function NotifyTemplate(msg="", type="") {
    return  `<div data-role="notification" class="notify ${type}"><button type="button" class="close-notify">×</button><p class="msg">${msg}</p></div>`;
}

function Notify(msg, type) {
    let root = document.getElementById("notify-wrapper");

    let notification = htmlToElement(NotifyTemplate(msg, type));
    notification.className = "notifyTemplate";
    root.appendChild(notification);
}

function htmlToElement(html) {
    let template = document.createElement('div');
    template.innerHTML = html;
    return template;
}