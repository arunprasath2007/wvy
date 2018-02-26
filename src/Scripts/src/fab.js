$(function () {
    // create word, excel, powerpoint document
    $(document).on("show.bs.modal", "#filename-dialog", function (e) {
        var ext = $(e.relatedTarget).data("param");
        $(this).find("#filename-dialog-type").text($(e.relatedTarget).data("type"));
        $(this).find(".input-group-addon").text(ext);
        $(this).find("#ext").val(ext);
        $(this).find("#name").val("");
    });
});
