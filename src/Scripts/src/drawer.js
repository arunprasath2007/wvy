var weavy = weavy || {};
weavy.drawer = (function ($) {

    function open(drawer) {
        // close other drawers
        $(".drawer:not(" + drawer + ")").removeClass("drawer-in");

        $("html").addClass("drawer-open");
        $(drawer).addClass("drawer-in");
    }

    function close() {
        $("html").removeClass("drawer-open");
        $(".drawer").removeClass("drawer-in");
    }

    function toggle(drawer) {
        if ($(drawer).hasClass("drawer-in")) {
            close();
        } else {
            open(drawer);
        }
    }

    $(document).on("click", "[data-open=drawer][data-target]", function () {
        var target = $(this).data("target");
        open(target);
    });

    $(document).on("click", "[data-close=drawer]", function () {
        close();
    });

    $(document).on("click", "[data-toggle=drawer][data-target]", function () {
        var target = $(this).data("target");
        console.debug(target);
        toggle(target);
    });

    $(document).on("click touchend", ".drawer-backdrop", function (e) {
        e.preventDefault();
        e.stopPropagation();
        close();
    });

    // close drawer on turbolinks:beforecache
    document.addEventListener("turbolinks:before-cache", function () {
        close();
    });

    // close drawer when toggling starred/followed
    $(document).on("click", "#drawer-space [data-toggle!=dropdown]", function () {
        window.setTimeout("weavy.drawer.close();", 500);
    });

    //// close drawer on ESC
    //$(document).on("keydown", "body.drawer-open", function (ev) {
    //    if (ev.which === 27) {
    //        close();
    //    }
    //});

    // load active tab when drawer opens
    $(document).on("click", "[data-toggle=drawer][data-target='#drawer-user']", function (e) {
        var $drawer = $("#drawer-user");
        var $active = $("[data-toggle=tab].active", $drawer);
        weavy.tab.load($active.attr("href"));
    });

    // configure remote loading of tabs in #drawer-user
    $(document).on("click", "#drawer-user [data-toggle=tab]", function (e) {
        weavy.tab.load($(this).attr("href"));
    });


    return {
        open: open,
        close: close,
        toggle: toggle
    }
})($);
