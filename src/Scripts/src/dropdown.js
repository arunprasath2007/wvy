﻿document.addEventListener("turbolinks:before-cache", function (e) {
    // close all dropdown menus
    $('.dropdown-menu').removeClass("show");
});
