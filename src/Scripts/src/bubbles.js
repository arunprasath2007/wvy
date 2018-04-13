var weavy = weavy || {};
weavy.bubbles = (function ($) {
    var visitUrl = null;

    //-------------------------------------------------------
    // open a bubble
    // * spaceId - the space to open
    // * type: 0 (global) or 1 (personal)
    // * if type = 0 (global), the origin url to connect the space to
    // * openUrl - optional url to open up in the space
    //-------------------------------------------------------
    function open(spaceId, type, origin, openUrl) {
        console.debug("open bubble");

        return $.ajax({
            url: "/api/widget/bubbles",
            type: "POST",
            data: JSON.stringify({ space_id: spaceId, type: type, url: origin, destination: openUrl }),
            contentType: "application/json"            
        });
    }


    document.addEventListener("turbolinks:visit", function (e) {
        visitUrl = e.data.url;
    });

    document.addEventListener("turbolinks:before-render", function (e) {
    
        if (!weavy.browser.embedded) return;

        var $body = $(e.data.newBody);
        var $oldBody = $("body");
        var currentSpaceId = $oldBody.get(0).getAttribute("data-space");
        var newSpaceId = $body.data("space");

        if (newSpaceId && newSpaceId != currentSpaceId) {
            // restore page and open bubble 
            open(newSpaceId, 1, "", visitUrl);

            // update 
            $body.html($oldBody.html());

            // transfer attributes
            $body.removeAttr("data-space"); // remove data-space since it's note present on all views
            $.each($oldBody.get(0).attributes, function (i, attrib) {
                $body.attr(attrib.name, attrib.value);
            });

            e.data.newBody = $body[0];

            visitUrl = null;
        }

    });

    return {
        open: open
    };

})($);
