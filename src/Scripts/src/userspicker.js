var weavy = weavy || {};
weavy.userspicker = (function ($) {

    function validateEmail(email) {
        var re = /^([a-zA-Z0-9_\-\.]+)@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.)|(([a-zA-Z0-9\-]+\.)+))([a-zA-Z]{2,4}|[0-9]{1,3})(\]?)$/;
        return re.test(email);
    }

    function formatUser(user) {
        if (user.loading) return user.text;
        if (user.invite) return user.email + " <span class='badge badge-info'>invite</span>";
        return "<img class='avatar-32' src='" + weavy.url.thumb(user.thumb_url, "32x32-crop,both") + "'/> " + user.title + (user.is_external ? " <span class='badge badge-warning'>external</span>" : "");
    }

    function formatUserSelection(user) {
        if (user.invite) return user.title + " <span class='badge badge-info'>invite</span>";
        return user.title;
    }

    // init picker
    document.addEventListener("turbolinks:load", function () {
        //console.debug("userspicker.js:init");
        $("select[data-role=users]").select2({
            ajax: {
                url: weavy.url.resolve("api/users"),
                dataType: 'json',
                delay: 250,
                data: function (params) {
                    return {
                        q: params.term,
                        status: "active",
                        top: 10,
                        skip: (params.page - 1) * 10,
                        count: true,
                        filter: true
                    };
                },
                processResults: function (data, params) {
                    // allow user invite with attribute data-user-invite
                    if (this.$element.data("userInvite") !== undefined) {
                        if (data.count === 0 && validateEmail(params.term)) {                            
                            return {
                                results: [{ id: params.term, invite: true, title: params.term, email: params.term }]
                            }
                        }
                    }

                    return {
                        results: data.data,
                        pagination: {
                            more: data.next ? true : false
                        }
                    };
                },
                cache: false
            },
            escapeMarkup: function (markup) { return markup; }, // let our custom formatter work
            minimumInputLength: 1,
            templateResult: formatUser,
            templateSelection: formatUserSelection,
            selectOnClose: true
        });
    });

    // destroy picker
    document.addEventListener("turbolinks:before-cache", function () {
        //console.debug("userspicker.js:destroy");
        $('select[data-role=users]').select2('destroy');
    });
})($);
