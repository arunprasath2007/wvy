﻿var weavy = weavy || {};
weavy.posts = (function ($) {

    // init edit post editor
    document.addEventListener("turbolinks:load", function () {
        var $editor = $("[data-editor-location='post-edit']").weavyEditor({
            mode: 'fixed',
            onSubmit: function (e, d) {
                e.preventDefault();
                $(this).closest("form").submit();
            }
        });
        $editor.weavyEditor("focus");
    });

    // destroy edit post editor
    document.addEventListener("turbolinks:before-cache", function () {
        $("[data-editor-location='post-edit']").weavyEditor("destroy");
    });

    // insert post
    function insertPost(e, data, editor) {
        e.preventDefault();
        var $editor = $(editor);
        var $form = $editor.closest("form");
        var $button = $form.find("button[type='submit']");
        var data = $form.serializeObject();
        var method = "POST";
        var url = weavy.url.resolve($form.attr("action"));

        // disable submit button
        $button.prop("disabled", true);

        // fix poll options for ajax post
        var indices = data["options.Index"];

        if (indices) {
            if (!$.isArray(indices)) {
                var optId = indices;
                indices = [];
                indices[0] = optId;
            }

            data["options"] = [];
            indices.map(function (i, index) {
                data["options"].push({ id: 0, text: data["options[" + i + "].Text"] })
                delete data["options[" + i + "].Text"];
                delete data["options[" + i + "].Id"];
            });
            delete data["options.Index"];
        }

        // make sure blobs is an array
        if (data.blobs) {
            if (!$.isArray(data.blobs)) {
                var id = data.blobs;
                data.blobs = [];
                data.blobs[0] = id;
            }
        }

        // insert temporary post
        var $container = $(".posts");
        $("<div class='card post fake-post'>" +
            "<div class='card-header media'>" +
            "<div class='fake-user'></div>" +
            "<div class='media-title'><div class='fake-text fake-text-50'></div>" +
            "<div class='fake-text fake-text-25'></div></div>" +
            "</div>" +
            "<div class='card-body'>" +
            "<div class='fake-text'></div>" +
            "<div class='fake-text fake-text-50'></div>" +
            "<div class='fake-text fake-text-75'></div>" +
            "</div>" +
            "</div> ").prependTo($container);

        // reset form
        $editor.weavyEditor('reset');

        // insert post
        $.ajax({
            contentType: "application/json; charset=utf-8",
            type: method || "POST",
            url: url,
            data: JSON.stringify(data)
        }).then(function (post) {
            // NOTE: insert from rtm for now
            // TODO: find a better solution later...
            //var $container = $(".posts");
            //$(post).prependTo($container);

            // reset form
            $editor.weavyEditor('reset');
        }).fail(function () {
            $(".fake-post").remove();
        }).always(function () {
            $button.prop("disabled", false);
        });
    }

    // update post feedback partial view
    function updateFeedback(id) {
        var $post = $("[data-post-id='" + id + "']");
        if (!$post.length) return;

        $.ajax({
            url: weavy.url.resolve("/posts/" + id + "/feedback"),
            method: "GET",
            contentType: "application/json"
        }).then(function (html) {
            $post.find(".card-feedback").html(html);
        });
    }

    // bind events
    weavy.comments.on("insert", function (e, data) {
        if (data.entityType === "post") {
            updateFeedback(data.entityId);
        }
    });

    weavy.comments.on("get", function (e, data) {
        if (data.entityType === "post") {
            updateFeedback(data.entityId);
        }
    });

    weavy.comments.on("trash", function (e, data) {
        if (data.entityType === "post") {
            updateFeedback(data.entityId);
        }
    });

    weavy.comments.on("restore", function (e, data) {
        if (data.entityType === "post") {
            updateFeedback(data.entityId);
        }
    });

    $(document).on("click", "[data-remove-attachment]", function (e) {
        e.preventDefault();
        var attachmentId = $(this).data("remove-attachment");
        $("#removedAttachments").append("<input type='hidden' name='removedAttachments' value='" + attachmentId + "'/>");
        $(this).parent().parent().remove();
    });

    // like post
    $(document).on("click", "[data-post-like]", function (e) {
        e.preventDefault();
        var $el = $(this);
        var id = $el.data("post-like");

        // REVIEW: show spinner during ajax call?
        weavy.api.like("post", id).then(function () {
            var $post = $el.closest(".post");
            updateFeedback(id);
        });
    });

    // unlike post
    $(document).on("click", "[data-post-unlike]", function (e) {
        e.preventDefault();
        var $el = $(this);
        var id = $el.data("post-unlike");

        // REVIEW: show spinner during ajax call?
        weavy.api.unlike("post", id).then(function () {
            var $post = $el.closest(".post");
            updateFeedback(id);
        });
    });

    // trash post
    $(document).on("click", "[data-trash=post][data-id]", function (e) {
        e.preventDefault();
        var id = this.dataset.id;
        weavy.api.trash("post", id).then(function () {
            $("[data-type=post][data-id=" + id + "]").slideUp("fast");
            weavy.alert.alert("success", "Post was trashed. <button type='button' class='btn btn-link alert-link' data-restore='post' data-id='" + id + "'>Undo</button>.", 5000, "alert-trash-post-" + id);
        });
    });

    // restore post
    $(document).on("click", "[data-restore=post][data-id]", function (e) {
        e.preventDefault();
        var id = this.dataset.id;
        weavy.api.restore("post", id).then(function () {
            $("[data-type=post][data-id=" + id + "]").slideDown("fast");
            weavy.alert.alert("success", "Post was restored.", 5000, "alert-trash-post-" + id);
        });
    });

    // vote for a poll option
    $(document).on("change", ".poll input[type=radio]", function (evt) {
        evt.preventDefault();
        var radio = $(this);
        var form = radio.closest("form");
        var url = weavy.url.resolve(form[0].action + "/" + radio.val());
        var poll = form.closest(".poll");

        if (!poll.hasClass("loading")) {
            $.ajax({
                url: url,
                type: "POST",
                beforeSend: function (xhr, settings) {
                    // animate progressbar(s)
                    poll.addClass("loading");
                    $(".progress-bar", poll).css("width", "100%");
                },
                success: function (html, status, xhr) {
                    poll.replaceWith(html);
                },
                error: function (xhr, status, error) {
                    var json = JSON.parse(xhr.responseText);
                    console.error(json.message);
                }
            });
        }
    });

    // rtm post
    weavy.realtime.on("post", function (e, post) {
        
        var uid = post.created_by.id;

        // do nothing of we are displaying another space
        if (weavy.context.space !== post.space) {
            return;
        }

        // do nothing if no posts on page
        var $posts = $(".posts");
        if (!$posts.length) {
            return;
        }

        // do nothing if already exists
        var $post = $("div[data-type=post][data-id='" + post.id + "']", $posts);
        if ($post.length) {
            return;
        }

        // fetch and display partial post 
        $.ajax({
            contentType: "application/json; charset=utf-8",
            type: "GET",
            url: weavy.url.resolve("/posts/" + post.id)
        }).then(function (post) {
            // remove fake post if rtm post created by current user
            if (weavy.context.user === uid) {
                $(".fake-post:last", $posts).remove()
            }

            $(post).prependTo($posts);
        });

    });

    // rtm like post
    weavy.realtime.on("likepost", function (e, post, user) {
        updateFeedback(post.id)
    });

    // rtm unlike post
    weavy.realtime.on("unlikepost", function (e, post, user) {
        updateFeedback(post.id)
    });

    // feedback details modal (likes, votes etc.)
    $(document).on("show.bs.modal", "#feedback-modal", function (e) {

        var target = $(e.relatedTarget);
        var path = target.data("path");
        var action = target.data("action");
        var title = target.data("modal-title");

        // clear modal content and show spinner
        var $modal = $(this);
        var $title = $(".modal-title", $modal).text(title);
        var $spinner = $(".spinner", $modal).addClass("spin").show();
        var $body = $(".modal-body", $modal).empty();

        $.ajax({
            url: weavy.url.resolve("/" + path),
            type: "GET"
        }).then(function (html) {
            $body.html(html);
        }).always(function () {
            // hide spinner
            $spinner.removeClass("spin").hide();
        });
    });

    // load edit form
    $(document).on("show.bs.modal", "#edit-post-modal", function (e) {

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
            type: "GET"
        }).then(function (html) {
            $form.replaceWith(html);

            var $editor = $("[data-editor-location='post-edit']").weavyEditor({
                collapsed: true,
                pickerCss: 'collapsed-static',
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


    // load move form
    $(document).on("show.bs.modal", "#move-post-modal", function (e) {

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
            type: "GET"
        }).then(function (html) {
            $form.replaceWith(html);

            $div.addClass("d-none");
        }).always(function () {
            // stop spinner
            $spinner.removeClass("spin");
        });
    });

    return {
        insert: insertPost,
        updateFeedback: updateFeedback
    }
})($);
