﻿var weavy = weavy || {};
weavy.user = (function ($) {

    // url to user profile that should be displayed in modal
    var _href = null;

    // regex for matching link to user profile
    var _re = new RegExp("^/people/\\d+$")

    // trash user
    $(document).on("click", "[data-trash=user][data-id]", function (e) {
        e.preventDefault();
        var $el = $(this);
        var id = $el.data("id");

        weavy.api.trash("user", id).then(function () {
            $("[data-type=user][data-id="+id+"]").addClass("d-none");
            weavy.alert.alert("success", "User was trashed. <button type='button' class='btn btn-link alert-link' data-restore='user' data-id='" + id + "'>Undo</button>", 5000, "alert-trash-user-" + id);
        });
    });

    // restore user
    $(document).on("click", "[data-restore=user][data-id]", function (e) {
        e.preventDefault();

        var id = this.dataset.id;

        weavy.api.restore("user", id).then(function () {
            $("[data-type=user][data-id=" + id + "]").removeClass("d-none");
            weavy.alert.alert("success", "User was restored.", 5000, "alert-trash-user-" + id);
        });
    });


    // attach click event handler to buttons [data-toggle=follow]
    $(document).on("click", "button[data-toggle=follow]", function (e) {
        e.stopPropagation();
        var id = this.dataset.id;
        if ($(this).hasClass("btn-success")) {
            unfollow(id).then(function () {
                updateStatus(id, false);
            });
        } else {
            follow(id).then(function () {
                updateStatus(id, true);
            });
        }
    });

    // attach click event handler to a[data-toggle=follow], e.g user menu
    $(document).on("click", "a[data-toggle=follow]", function (e) {
        e.preventDefault();
        var $el = $(this);
        var id = $el.data("id");
        if ($el.data("following")) {
            unfollow(id).then(function () {
                updateStatus(id, false, $el.data("remove-unfollowed"));
                if ($el.data("remove-unfollowed")) {
                    $el.closest("tr[data-type=user][data-id=" + id + "]").remove();
                }
            });
        } else {
            follow(id).then(function () {
                updateStatus(id, true);
            });
        }
    });

    // intercept links to user profile and open modal instead
    $(document).on("click", "a[href^='/people/']:not([data-link]), tr[data-href^='/people/'][data-modal]", function (e) {
        var $target = $(e.target);

        if ($target.parents("[prevent-modal]").length) {
            return;
        }

        // verify that href matches /people/{id}
        _href = $(this).attr("href") || $(this).data("href");
        if (!_re.test(_href)) {
            console.debug(_href + " is not a profile link");
            _href = null;
            return;
        }

        // if clicked from a feedback modal, close that modal first
        if ($target.parents("#feedback-modal").length) {
            $("#feedback-modal").modal("hide");
        }

        // finally open modal with profile info
        e.preventDefault();
        $('#profile-modal').modal();
    });

    $(document).on("show.bs.modal", "#profile-modal", function (e) {
        if (_href == null) {
            return;
        }
        
        // clear modal content and show spinner
        var $modal = $(this);        
        var $content = $(".modal-content:not(.loading)", $modal).addClass("d-none");
        var $loading = $(".modal-content.loading", $modal).removeClass("d-none");
        var $spinner = $(".spinner", $loading).addClass("spin").show();
        
        // get modal content from server
        $.ajax({
            url: weavy.url.resolve(_href),
            type: "GET"
        }).then(function (html) {            
            $loading.addClass("d-none");
            $content.html(html).removeClass("d-none");
        }).always(function () {
            // stop and hide spinner
            $spinner.removeClass("spin").hide();
        });
    });

    function updateStatus(id, following) {
        if (following) {
            // toggle button class
            $("button[data-toggle=follow][data-id=" + id + "]").removeClass("btn-outline-success").addClass("btn-success").text("Following");
            $("a[data-toggle=follow][data-id=" + id + "]").data("following", following).find("div").text("Unfollow");
        } else {
            // toggle button class
            $("button[data-toggle=follow][data-id=" + id + "]").removeClass("btn-success").addClass("btn-outline-success").text("Follow");
            $("a[data-toggle=follow][data-id=" + id + "]").data("following", following).find("div").text("Follow");
        }
    }

    // follow user
    function follow(id) {
        // call api to follow user
        return weavy.api.follow("user", id);
    }

    // unfollow user
    function unfollow(id) {
        // call api to unfollow user
        return weavy.api.unfollow("user", id);
    }

    return {
        follow: follow,
        unfollow: unfollow
    };

})($);

