// helper for document state
var weavy = weavy || {};
weavy.document = (function () {

    // print state changes (for debugging purposes), see https://javascript.info/onload-ondomcontentloaded
    //console.debug("document:" + document.readyState);
    //document.addEventListener("readystatechange", function () { console.debug("document:" + document.readyState); });
    //document.addEventListener("DOMContentLoaded", function () { console.debug("document:ready"); });
    //document.addEventListener("turbolinks:click", function (e) { console.debug(e.type); });
    //document.addEventListener("turbolinks:before-visit", function (e) { console.debug(e.type); });
    //document.addEventListener("turbolinks:request-start", function (e) { console.debug(e.type); });
    //document.addEventListener("turbolinks:visit", function (e) { console.debug(e.type); });
    //document.addEventListener("turbolinks:request-end", function (e) { console.debug(e.type); });
    //document.addEventListener("turbolinks:before-cache", function (e) { console.debug(e.type); });
    //document.addEventListener("turbolinks:before-render", function (e) { console.debug(e.type); });
    //document.addEventListener("turbolinks:render", function (e) { console.debug(e.type); });
    //document.addEventListener("turbolinks:load", function (e) { console.debug(e.type); });
    //window.addEventListener("load", function (e) { console.debug("window:" + e.type); });
    //window.addEventListener("beforeunload", function (e) { console.debug("window:" + e.type); });
    //window.addEventListener("unload", function (e) { console.debug("window:" + e.type); });

    // gets a value indicating whether turbolinks is enabled or not
    var turbolinks = typeof Turbolinks !== "undefined" && Turbolinks !== undefined && Turbolinks.supported !== undefined && Turbolinks.supported;

    return {
        turbolinks : turbolinks
    };
})();
