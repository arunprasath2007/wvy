var weavy = weavy || {};
weavy.discuss = (function ($) {

    // init post editor
    document.addEventListener("turbolinks:load", function () {
        $("[data-editor-location='discuss']").weavyEditor({
            minimized: true,
            onClick: function (e, wrapper) {
                $(".post-form").addClass("focused");
                wrapper.addClass("active");
            },
            onSubmit: function (e, data) {
                $(".post-form").removeClass("focused");
                data.wrapper.removeClass("active");
                weavy.posts.insert(e, data, this);
            }
        });
    });

    // destroy editors
    document.addEventListener("turbolinks:before-cache", function () {
        $("[data-editor-location='discuss']").weavyEditor("destroy");
        $(".post-form").removeClass("focused");
    });

    // backdrop click
    $(document).on("click touchend", ".post-backdrop", function (e) {
        e.preventDefault();
        $(".post-form").removeClass("focused");
    });

})($);
