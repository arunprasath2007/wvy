var weavy = weavy || {};
weavy.app = (function ($) {

    // cleanup before cache (needed when clicking back in the browser)
    $(document).on("turbolinks:before-cache", function () {
       
    });

    // load modal for adding apps
    $(document).on("show.bs.modal", "#add-app-modal", function (e) {

        var target = $(e.relatedTarget);
        var path = target.data("path");
        var title = target.data("title");

        // clear modal content and show spinner
        var $modal = $(this);
        var $title = $(".modal-title", $modal).text(title);
        var $spinner = $(".spinner", $modal).addClass("spin").show();
        var $body = $(".modal-body", $modal).empty();

        $.ajax({
            url: weavy.url.resolve(path),
            type: "GET"
        }).then(function (html) {
            $body.html(html);            
        }).always(function () {
            // hide spinner
            $spinner.removeClass("spin").hide();
        });
    });
   

    return {
   
    };

})($);
