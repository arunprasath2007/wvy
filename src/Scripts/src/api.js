var weavy = weavy || {};
weavy.api = (function ($) {

    // get file
    function getFile(id) {
        return $.ajax({
            url: "/api/files/" + id,
            type: "GET"
        });
    }

    // TODO: remove these and use trash/restore(entityType, entityId) instead

    // trash user
    function trashUser(id, method) {
        return trash("user", id, method);
    }

    // restore user
    function restoreUser(id, method) {
        return restore("user", id, method);
    }

    // trash note
    function trashNote(id, method) {
        return trash("note", id, method);
    }

    // restore note
    function restoreNote(id, method) {
        return restore("note", id, method);
    }

    // trash post
    function trashPost(id, method) {
        return trash("post", id, method);
    }

    // restore post
    function restorePost(id, method) {
        return restore("post", id, method);
    }

    // trash comment 
    function trashComment(id) {
        return trash("comment", id);
    }

    // restore comment 
    function restoreComment(id) {
        return restore("comment", id);
    }

    // trash the specified entity
    function trash(entityType, entityId, method) {
        return $.ajax({
            url: weavy.url.resolve("/api/" + entityType + "s/" + entityId + "/trash"),
            method: method || "POST",
            contentType: "application/json"
        });
    }

    // restore the specified entity
    function restore(entityType, entityId, method) {
        return $.ajax({
            url: weavy.url.resolve("/api/" + entityType + "s/" + entityId + "/restore"),
            method: method || "POST",
            contentType: "application/json"
        });
    }

    // like the specified entity
    function like(entityType, entityId) {
        return $.ajax({
            url: weavy.url.resolve("/api/" + entityType + "s/" + entityId + "/like"),
            method: "POST",
            contentType: "application/json"
        });
    }

    // unlike the specified entity
    function unlike(entityType, entityId) {
        return $.ajax({
            url: weavy.url.resolve("/api/" + entityType + "s/" + entityId + "/like"),
            method: "DELETE",
            contentType: "application/json"
        });
    }

    // star the specified entity
    function star(entityType, entityId) {
        return $.ajax({
            url: weavy.url.resolve("/api/" + entityType + "s/" + entityId + "/star"),
            method: "POST",
            contentType: "application/json"
        });
    }

    // unstar the specified entity
    function unstar(entityType, entityId) {
        return $.ajax({
            url: weavy.url.resolve("/api/" + entityType + "s/" + entityId + "/star"),
            method: "DELETE",
            contentType: "application/json"
        });
    }

    // follow the specified entity
    function follow(entityType, entityId) {
        return $.ajax({
            url: weavy.url.resolve("/api/" + entityType + "s/" + entityId + "/follow"),
            method: "POST",
            contentType: "application/json"
        });
    }

    // unfollow the specified entity
    function unfollow(entityType, entityId) {
        return $.ajax({
            url: weavy.url.resolve("/api/" + entityType + "s/" + entityId + "/follow"),
            method: "DELETE",
            contentType: "application/json"
        });
    }

    // join the specified space
    function join(id) {
        return $.ajax({
            url: weavy.url.resolve("/api/spaces/" + id + "/members"),
            method: "POST",
            contentType: "application/json"
        });
    }

    // leave the specified space
    function leave(id) {
        return $.ajax({
            url: weavy.url.resolve("/api/spaces/" + id + "/members"),
            method: "DELETE",
            contentType: "application/json"
        });
    }

    // marks the specified notification as read
    function read(notificationId) {
        return $.ajax({
            url: weavy.url.resolve("/api/notifications/" + notificationId + "/read"),
            method: "POST",
            contentType: "application/json"
        });
    }

    // marks the specified notification as unread
    function unread(notificationId) {
        return $.ajax({
            url: weavy.url.resolve("/api/notifications/" + notificationId + "/read"),
            method: "DELETE",
            contentType: "application/json"
        });
    }

    // marks all notifications as read
    function readAll() {
        return $.ajax({
            url: weavy.url.resolve("/api/notifications/read"),
            method: "POST",
            ContentType: "application/json"
        });
    }

    // pin a post
    function pin(postId) {
        return $.ajax({
            url: weavy.url.resolve("/api/posts/" + postId + "/pin"),
            method: "POST",
            ContentType: "application/json"
        });
    }

    // unpin a post
    function unpin(postId) {
        return $.ajax({
            url: weavy.url.resolve("/api/posts/" + postId + "/pin"),
            method: "DELETE",
            ContentType: "application/json"
        });
    }

    return {
        getFile: getFile,
        trashComment: trashComment,
        restoreComment: restoreComment,
        trashPost: trashPost,
        restorePost: restorePost,
        trashNote: trashNote,
        restoreNote: restoreNote,
        trashUser: trashUser,
        restoreUser: restoreUser,
        like: like,
        unlike: unlike,
        follow: follow,
        unfollow: unfollow,
        star: star,
        unstar: unstar,
        join: join,
        leave: leave,
        read: read,
        trash: trash,
        restore: restore,
        unread: unread,
        readAll: readAll,
        pin: pin,
        unpin: unpin
    };
})($);
