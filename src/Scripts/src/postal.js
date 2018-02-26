var weavy = weavy || {};

// post messages between widget and weavy
weavy.postal = (function ($) {

    var postMessage = function (message, win) {
        win = (typeof (win) === "undefined" || win === null ? window.parent : win);
        win.postMessage(message, "*");
        console.debug("Posted message", message)
    }

    $(document).on("click", "[data-widget-event]", function (e) {
        e.preventDefault();

        var name = $(this).data("widget-name");

        postMessage({ name: name });

        if (name === "signingOut") {
            var url = $(this).attr("href");
            // give the widget a chance to disconnect from the hub            
            window.setTimeout(function () { window.location.href = url }, 500);
        } 
    });

    return {
        post : postMessage
    }

})($)

