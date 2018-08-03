var weavy = weavy || {};
weavy.content = (function ($) {

    // load move content form
    $(document).on("show.bs.modal", "#move-content-modal", function (e) {

        var $target = $(e.relatedTarget);
        var path = $target.data("path");
        var title = $target.attr("title");

        // clear show and start spinner
        var $modal = $(this);
        var $form = $("form.modal-content", $modal).addClass("d-none");
        var $div = $("div.modal-content", $modal);
        var $title = $(".modal-title", $div).text(title);
        var $spinner = $(".spinner", $div).addClass("spin");
        $div.removeClass("d-none");

        // fetch modal content from server
        $.ajax({
            url: path,
            type: "GET"
        }).then(function (html) {
            $form.replaceWith(html);

            $div.addClass("d-none");
        }).always(function () {
            // stop spinner
            $spinner.removeClass("spin");
        });
    });

    // populate folder picker when space is selected
    $(document).on("change", ".space-picker[data-folder-picker]", function (e) {
        var $spacepicker = $(this);
        var $folderpicker = $("#" + $spacepicker.data("folder-picker"));
        var id = $folderpicker.data("id");

        var url = "/ui/" + (id.length > 0 ? $folderpicker.data("type") + "s/" + $folderpicker.data("id") + "/folders?spaceid=" + $spacepicker.val() : $spacepicker.val() + "/folders");

        // fetch select options for folder picker from server
        $.ajax({
            url: weavy.url.resolve(url),
            type: "GET"
        }).then(function (html) {
            $folderpicker.html(html);
        });

    });
})($);

