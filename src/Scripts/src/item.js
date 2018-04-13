var weavy = weavy || {};
weavy.item = (function ($) {

    // attach click event handler to subscribe toggler
    $(document).on("click", "[data-toggle=subscribe][data-entity=item]", function (e) {
        if ($(this).hasClass("on")) {
            unsubscribe(this.dataset.id);
        } else {
            subscribe(this.dataset.id);
        }
    });

    // subscribe to specified item
    function subscribe(id) {
        weavy.api.follow("item", id).then(function () {
            updateSubscribers(id);
        });
    }

    // unsubscribe from specified item
    function unsubscribe(id) {
        weavy.api.unfollow("item", id).then(function () {
            updateSubscribers(id);
        });
    }

    // get subscribers partial from server and update ui
    function updateSubscribers(id) {
        var $subscribers = $("[data-entity=item][data-id='" + id + "'] .subscribers");
        if (!$subscribers.length) {
            return;
        }

        $.ajax({
            url: weavy.url.resolve("/items/" + id + "/subscribers"),
            method: "GET",
            contentType: "application/json"
        }).then(function (html) {
            $subscribers.replaceWith(html);
        });
    }

    return {
        subscribe: subscribe,
        unsubscribe: unsubscribe
    };

})($);

