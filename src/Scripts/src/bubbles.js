var weavy = weavy || {};
weavy.bubbles = (function ($) {
    var visitUrl = null;

    //-------------------------------------------------------
    // open a bubble
    // * spaceId - the space to open
    // * type: 0 (global) or 1 (personal)
    // * if type = 0 (global), the origin url to connect the space to
    // * url - optional url to open up in the space
    //-------------------------------------------------------
    function open(spaceId, destination) {
        console.debug("open space");

        return $.ajax({
            url: "/api/bubble",
            type: "POST",
            data: JSON.stringify({ space_id: spaceId, url: destination, type: 1 }),
            contentType: "application/json"
        });
    }

    function openBubble(bubbleTarget, destination) {
        console.debug("open bubble");

        if (weavy.browser.embedded) {
            weavy.postal.post({ name: 'send', bubbleTarget: bubbleTarget, url: destination });
        }
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

        // Intercept global search
        var urlBase = $body.data("path").indexOf("http") === 0 ? $body.data("path") : document.location.origin + $body.data("path");
        var redirSpaceId = visitUrl.indexOf(urlBase + "search") === 0 ? -1 : newSpaceId;

        if (redirSpaceId && newSpaceId != currentSpaceId) {

            if (redirSpaceId === -1) {
                openBubble("add", visitUrl);
            } else {
                // restore page and open bubble 
                open(newSpaceId, visitUrl);
            }

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
