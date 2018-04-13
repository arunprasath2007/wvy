//// script for signups

document.addEventListener("turbolinks:load", function () {
    $(".weavy-button").filter(":visible").each(function () {
        $(this).css("width", $(this).outerWidth() + 1);
    });

    if (inIframe()) {
        $(".back").removeClass("d-none");
    }    
});

$(document).on("click", "[data-message]", function(e) {    
    weavy.postal.post($(this).data("message"));
});

$(document).on("click", ".button", function (e) {
    var $btn = $(this);
    setTimeout(function () { $btn.attr("disabled", "") }, 1);
    $btn.addClass("button-spin");
    $btn.html("<img src='/img/spinner.svg' />");
});

function inIframe() {
    try {
        return window.self !== window.top;
    } catch (e) {
        return true;
    }
}
