var weavy = weavy || {};
weavy.user = (function ($) {

    // trash user
    $(document).on("click", "[data-trash=user][data-id]", function (e) {
        e.preventDefault();
        var $el = $(this);
        var id = $el.data("id");

        weavy.api.trashUser(id).then(function () {
            $("[data-type=user][data-id="+id+"]").addClass("d-none");
            weavy.alert.alert("success", "User was trashed. <button type='button' class='btn btn-link alert-link' data-restore='user' data-id='" + id + "'>Undo</button>", 5000, "alert-trash-user-" + id);
        });
    });

    // restore user
    $(document).on("click", "[data-restore=user][data-id]", function (e) {
        e.preventDefault();

        var id = this.dataset.id;

        weavy.api.restoreUser(id).then(function () {
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

    // follow specified user
    function follow(id) {
        // call api to follow user
        return weavy.api.follow(id);
    }

    // unstar specified entity
    function unfollow(id) {
        // call api to unfollow user
        return weavy.api.unfollow(id);
    }

    return {
        follow: follow,
        unfollow: unfollow
    };

})($);

