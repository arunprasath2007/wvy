var weavy = weavy || {};
weavy.notes = (function ($) {

    document.addEventListener("turbolinks:before-cache", function () {
        $(".weavy-editor").next("textarea[data-editor-location='note']").weavyEditor("destroy");
    });

    // trash note
    $(document).on("click", "[data-trash=note]", function (e) {
        e.preventDefault();
        var id = $(this).data("id");
        weavy.api.trashNote(id).then(function () {
            $(".note[data-id='" + id + "']").slideUp("fast");
            weavy.alert.alert("success", "Note was trashed. <button class='btn btn-link alert-link' data-restore='note' data-id='" + id + "'>Undo</button>", 5000, "alert-note-" + id);
        });
    });

    // restore note
    $(document).on("click", "[data-restore=note]", function (e) {
        e.preventDefault();
        var id = $(this).data("id");
        weavy.api.restoreNote(id).then(function () {
            $(".note[data-id='" + id + "']").slideDown("fast");
            weavy.alert.alert("success", "Note was restored.", 5000, "alert-note-" + id);
        });
    });

    // load insert/edit form
    $(document).on("show.bs.modal", "#note-modal", function (e) {

        var target = $(e.relatedTarget);
        var path = target.data("path");
        var color = target.data("color") || "gray";
        var title = target.attr("title");

        // clear show and start spinner
        var $modal = $(this);
        var $form = $("form.modal-content", $modal).addClass("d-none");
        var $div = $("div.modal-content", $modal).addClass("note-" + color);
        var $title = $(".modal-title", $div).text(title);
        var $spinner = $(".spinner", $div).addClass("spin");
        $div.removeClass("d-none");

        // fetch modal content from server
        $.ajax({
            url: path,
            type: "GET"
        }).then(function (html) {
            $form.replaceWith(html);

            var $editor = $("[data-editor-location='note']").weavyEditor({                
                placeholder: "Text",
                textonly: true,                
                submitButton: $form.find("button[type=submit]"),
                onSubmit: function (e, d) {
                    e.preventDefault();
                    $(this).closest("form").submit();
                }
            });

            $div.addClass("d-none");
        }).always(function () {
            // stop spinner
            $spinner.removeClass("spin");
        });
    });

    // change bg color on modal according to selected note type
    $(document).on("change", "#note-modal input[name=NoteType]", function (e) {
        var $label = $(this).closest("label");
        var $content = $(this).closest(".modal-content");
        var css = "note-" + $label.attr("title").toLowerCase();
        $content.removeClass("note-gray note-green note-blue note-yellow note-red").addClass(css);
    });

})($);
