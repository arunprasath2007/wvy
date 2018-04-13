document.addEventListener("turbolinks:before-cache", function (e) {
    // hide modals
    $('.modal').hide();
    $('.modal-backdrop').remove();
});
