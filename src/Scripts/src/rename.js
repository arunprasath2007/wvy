var weavy = weavy || {};
weavy.rename = (function ($) {

    // load modal content
    $(document).on("show.bs.modal", "#rename-modal", function (e) {
               
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
            $body.find("input").filter(':visible:first').focus();
        }).always(function () {
            // hide spinner
            $spinner.removeClass("spin").hide();
        });
    });

})($);

