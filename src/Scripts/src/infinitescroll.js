var weavy = weavy || {};
weavy.infinitescroll = (function ($) {

    var buffer = 0; // arbitrary value (set to whatever you think is a good distance before triggering automatic click)
    var hasnext = true;
    var loading = false;

    // click on .scroll-more calls a server function that returns HTML that should be appended to the specified target element
    $(document).on("click", ".scroll-more", function (evt) {
        evt.preventDefault();

        if (loading) {
            // already loading...
            return;
        }

        var $more = $(this);
        console.debug($more.attr("data-next"));

        $.ajax({
            type: "GET",
            cache: false,
            url: $more.attr("data-next"),
            beforeSend: function (xhr, settings) {
                loading = true;

                // animate spinner
                $more.find(".spinner").addClass("spin");
            }
        }).done(function (data, status, xhr) {

            // load data into div (why?)
            var $div = $("<div />").html(data);
            var $next = $(".scroll-next", $div).first();

            if ($next.length && $next.attr("data-next")) {
                // set $more[data-next] to url for next page of data
                $more.attr("data-next", $next.attr("data-next"));
            } else {
                // no more items
                hasnext = false;
            }

            // add to target element
            var $target = $($more.attr("data-target"));
            if ($more.attr("data-mode") === "prepend") {
                $target.prepend(data);
            } else {
                $target.append(data);
            }

        }).fail(function (xhr, status, error) {
            // stop loading on error
            $more.remove();
            var json = JSON.parse(xhr.responseText);
            console.error(json);
        }).always(function (xhr, status) {
            if (hasnext) {
                // stop spinner animation
                $more.find(".spinner").removeClass("spin");
            } else {
                // remove if this was the last page
                $more.remove();
            }

            // resume after load
            loading = false;

            // check if we should load more data
            loadMore();
        });
    });

    // throttle window scroll events for better performance
    $(window).on('scroll', _.throttle(function () {
        if (!loading) {
            loadMore();
        }
    }, 250));

    // check if we should load more data directly after page is loaded
    document.addEventListener("turbolinks:load", loadMore);

    // load data if $more is visible
    function loadMore() {
        var $more = $('.scroll-more:not([data-mode=prepend])').first();
        if ($more.length) {
            // calculate distance until $more scrolls into view
            var distance = 0 + $more.offset().top - $(window).scrollTop() - $(window).height();
            if (distance < buffer) {
                $more.click();
            }
        }
    }

})($);
