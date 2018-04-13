// makes en entire row clickable like <a href=""></a>
$(function () {
    $(document).on("click", "tr[data-href]:not([data-photoswipe], [data-preview], [data-modal])", function (evt) {
        var $target = $(evt.target);
        if ($target.is("a, :button, :submit") || $target.parents("a, :button, :submit").length) {
            return;
        }

        // if href is a cross-origin URL, or falls outside of the specified root, or if the value of Turbolinks.supported is false, 
        // Turbolinks performs a full page load by setting window.location
        var href = $(this).attr("data-href");

        if (href.length > 0) {
            Turbolinks.visit(href);
        }        
    });
});

