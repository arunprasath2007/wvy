var weavy = weavy || {};
weavy.presence = (function ($) {
    // variable for keeping track of idleness of current user
    var _idle = true;

    // ping the server every 3 minutes as long as we are active
    var _delay = 3 * 60 * 1000;
    var _timer = window.setInterval(weavy.realtime.invoke("rtm", "SetActive"), _delay);

    // register callback for server presence event
    weavy.realtime.on("presence", function (event, data) {
        console.debug("server said user " + data.user_id + " is " + data.presence);
        // update presence indicator
        if (data.presence === "away") {
            $(".presence[data-active=" + data.user_id + "]").removeAttr("data-active").attr("data-away", data.user_id);
        } else {
            $(".presence[data-away=" + data.user_id + "]").removeAttr("data-away").attr("data-active", data.user_id);
        }
    });

    // track idleness
    $(document).idle({
        idle: 1 * 60 * 1000, // idle after 1 minute of no activity
        onIdle: function () {
            weavy.presence.idle = true;
            console.debug("client said user " + weavy.context.user + " is " + (weavy.presence.idle ? "idle" : "active"));

            // stop pinging the server
            window.clearInterval(_timer);
        },
        onActive: function () {
            weavy.presence.idle = false;
            console.debug("client said user " + weavy.context.user + " is " + (weavy.presence.idle ? "idle" : "active"));

            // tell server that connection is active
            weavy.realtime.invoke("rtm", "SetActive");

            // also re-configure periodic calls to setActive
            _timer = window.setInterval(weavy.realtime.invoke("rtm", "SetActive"), _delay);
        }
    });

    return {
        idle: _idle
    };
})($);
