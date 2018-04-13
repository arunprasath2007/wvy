var weavy = weavy || {};
weavy.comments = (function ($) {

    // edit comment editor
    document.addEventListener("turbolinks:load", function () {
        $("[data-editor-location='comment-edit']").weavyEditor({
            polls: false,
            mode: 'fixed',
            onSubmit: function (e, data) {
                e.preventDefault();
                $(this).closest("form").submit();
            }
        });

        // any visible comment editors
        initCommentEditor($("textarea.comments-form:visible"));
    });

    // destroy editors
    document.addEventListener("turbolinks:before-cache", function () {
        $("[data-editor-location='comment-edit']").weavyEditor("destroy");                
        $(".weavy-editor").next("textarea.comments-form").weavyEditor("destroy");
    });

    // init comment editor
    function initCommentEditor($el) {
        if ($el.length === 0) return;

        $el.weavyEditor({
            collapsed: true,
            embeds: false,
            polls: false,
            placeholder: 'Your comment...',
            onSubmit: function (e, d) {
                insertComment(e, d, this);
            }
        });
    }

    // insert comment
    var insertComment = function (e, d, editor) {
        e.preventDefault();
        var $editor = $(editor);

        var $form = $editor.closest("form");
        var $button = $form.find("button[type='submit']");

        // entity specific
        var entityType = $form.data("entity-type");
        var entityId = $form.data("entity-id");
        var $commentsContainer = $form.parent().find($form.data("comments-container"));

        var data = $form.serializeObject();
        data["text"] = d.text;

        var method = "POST";
        var url = weavy.url.resolve($form.attr("action"));

        // disable submit button
        $button.prop("disabled", true);

        // make sure attachments is an array
        if (data.attachments) {
            if (!$.isArray(data.attachments)) {
                var id = data.attachments;
                data.attachments = [];
                data.attachments[0] = id;
            }
        }

        var type = data.type;
        data.attached_to = { type: type, id: data.id };
        delete data.type;
        delete data.id;

        // insert temporary comment

        $("<div class='list-group-item comment fake-comment'>" + 
            "<div class='media'>" + 
                "<div class='fake-user'></div>" +
                "<div class='media-body'>" +
                    "<div class='fake-text fake-text-75'></div>" +
                    "<div class='fake-text fake-text-25'></div>" +
                "</div>" +
            "</div>" + 
            "</div>").appendTo($commentsContainer);

        // reset form
        $editor.weavyEditor('reset');

        // insert comment
        $.ajax({
            contentType: "application/json; charset=utf-8",
            type: method,
            url: url,
            data: JSON.stringify(data)
        }).then(function () {
            // update comment list
            $.ajax({
                url: weavy.url.resolve("/" + entityType + "s/" + entityId + "/comments"),
                method: "GET",
                cache: false,
                contentType: "application/json"
            }).then(function (html) {
                triggerEvent("insert", { entityType: entityType, entityId: entityId });
            });            
        }).fail(function () {
            $(".fake-comment").remove();
        }).always(function () {
            $button.prop("disabled", false);
        });

    };

    // update comment feedback partial view
    var updateCommentFeedback = function (id) {
        
        var $comment = $("[data-comment-id='" + id + "']");
        if (!$comment.length) return;
        
        $.ajax({
            url: weavy.url.resolve("/comments/" + id + "/feedback"),
            method: "GET",
            cache: false,
            contentType: "application/json"
        }).then(function (html) {            
            $comment.find(".comment-feedback").html(html);
        });
    };

    // get comments for a post
    function getComments(id, type, expand) {

        // check if the comments parent entity is present on the page
        var $entity = $("[data-" + type + "-id='" + id + "']")
        if ($entity.length === 0) {
            return false;
        }
        
        var $div = $("." + type + "-comments", $entity);
        var $spinner = $(".spinner", $div);

        // init weavy editor (if needed)               
        if (!$(".comments-form.emojionearea", $entity).length) {
            initCommentEditor($entity.find(".comments-form"));
            if (focus) {
                $entity.find("textarea.comments-form").weavyEditor("focus");
            }
        }

        // start and show spinner
        if (expand) {
            $spinner.addClass("spin");
            $div.removeClass("d-none");
        }
        
        $.ajax({
            url: weavy.url.resolve("/" + type + "s/" + id + "/comments"),
            method: "GET",
            contentType: "application/json",
            cache: false
        }).then(function (html) {
            // remove spinner
            $spinner.remove();

            // replace comments
            $(".comments", $div).html(html);
            triggerEvent("get", { entityType: type, entityId: id });
        });
                
    }

    // attach an event handler
    function on(event, handler) {
        $(document).on(event + ".comments.weavy", null, null, handler);
    }

    function triggerEvent(name, json) {
        name = name + ".comments.weavy";
        var event = $.Event(name);

        $(document).triggerHandler(event, json);
    }


    // get comments on a post (maybe move this post specific function to posts.js?)
    $(document).on("click", "[data-toggle=comments]", function (e) {
        e.preventDefault();

        var $post = $(this).closest(".post");
        var $comments = $post.find(".post-comments");
        var id = $post.data("post-id");

        if ($comments.find(".comment").length) {
            // show/hide existing comments
            $comments.toggleClass("d-none");
        } else {
            if ($comments.hasClass("d-none")) {
                getComments(id, "post", true);
            } else {
                $comments.addClass("d-none");
            }
        }
    });

    // like comment
    $(document).on("click", "[data-comment-like]", function (e) {
        e.preventDefault();
        var $el = $(this);
        var id = $el.data("comment-like");

        // REVIEW: show spinner during ajax call?
        weavy.api.like("comment", id).then(function () {
            var $comment = $el.closest(".card-comment");
            updateCommentFeedback(id);
        });
    });

    // unlike comment
    $(document).on("click", "[data-comment-unlike]", function (e) {
        e.preventDefault();
        var $el = $(this);
        var id = $el.data("comment-unlike");

        // REVIEW: show spinner during ajax call?
        weavy.api.unlike("comment", id).then(function () {
            var $comment = $el.closest(".card-comment");
            updateCommentFeedback(id);
        });
    });

    // trash comment
    $(document).on("click", "[data-comment-trash]", function (e) {
        e.preventDefault();
        var $el = $(this);
        var id = $el.data("comment-trash");
        var $comment = $("[data-comment-id='" + id + "']")
        var parentId = $comment.data("parent-id");
        var parentEntity = $comment.data("parent-entity");

        weavy.api.trashComment(id).then(function () {
            $comment.slideUp("fast")
            weavy.alert.alert("success", "Comment was trashed. <a class='alert-link' href='#' data-comment-restore='" + id + "' data-parent-id='" + parentId + "' data-parent-entity='" + parentEntity + "'>Undo</a>", 5000, "alert-comment-trash-" + id);

            triggerEvent("trash", { entityType: parentEntity, entityId: parentId });

        });
    });

    // restore comment
    $(document).on("click", "[data-comment-restore]", function (e) {
        e.preventDefault();
        var $el = $(this);
        var id = $el.data("comment-restore");
        var $comment = $("[data-comment-id='" + id + "']")
        var parentId = $el.data("parent-id");
        var parentEntity = $el.data("parent-entity");

        weavy.api.restoreComment(id).then(function () {
            $comment.slideDown("fast")
            weavy.alert.alert("success", "Comment was restored.", 5000, "alert-comment-trash-" + id);

            triggerEvent("restore", { entityType: parentEntity, entityId: parentId });

        });
    });

    // rtm comment
    weavy.realtime.on("comment", function (e, comment) {

        // do nothing if already exists
        if ($("div[data-comment-id='" + comment.id + "']").length !== 0) return;

        // todo: get specific comment and add it instead of reloading all.
        getComments(comment.attached_to.id, comment.attached_to.type, false);
    });

    // rtm like comment
    weavy.realtime.on("likecomment", function (e, comment, user) {        
        updateCommentFeedback(comment.id)
    });

    // rtm unlike comment
    weavy.realtime.on("unlikecomment", function (e, comment, user) {        
        updateCommentFeedback(comment.id)
    });

    // load edit form
    $(document).on("show.bs.modal", "#edit-comment-modal", function (e) {

        var target = $(e.relatedTarget);
        var path = target.data("path");
        var title = target.attr("title");

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
            type: "GET",
            cache: false
        }).then(function (html) {
            
            $form.replaceWith(html);

            var $editor = $("[data-editor-location='comment-edit']").weavyEditor({
                collapsed: true,
                embeds: false,
                polls: false,
                pickerCss: 'collapsed-static',
                placeholder: 'Your comment...',
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

    return {
        on: on
    }

})($)
