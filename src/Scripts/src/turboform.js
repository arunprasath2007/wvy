// submit forms through turbolinks
(function ($) {

    // override turbolinks send function with data enabled send
    Turbolinks.HttpRequest.prototype.send = function () {
        var t;
        return this.xhr && !this.sent ? (this.notifyApplicationBeforeRequestStart(), this.setProgress(0), this.xhr.send(this.xhr.data), this.sent = !0, "function" === typeof (t = this.delegate).requestStarted ? t.requestStarted() : void 0) : void 0;
    }

    // submit form through turbolinks by clicking submit button
    $(document).on("click", "form[data-turboform] [type=submit][name][value]", function (e) {
        e.preventDefault();

        // serialize form
        var $submit = $(this);
        var $form = $submit.closest("form[data-turboform]");
        var data = $form.serialize();

        // add button name and value
        data = data + (data.length === 0 ? "" : "&") + encodeURIComponent($submit.attr("name")) + "=" + encodeURIComponent($submit.attr('value'));

        // submit data
        submitData($form, data);
    });

    // submit form through turbolinks without clicking submit button
    $(document).on("submit", "form[data-turboform]", function (e) {
        e.preventDefault();

        // serialize form
        var $form = $(this);
        var data = $form.serialize();

        // check if we have exactly one submit button, in that case include the name and value of the button
        var $submits = $form.find("[type=submit][name][value]");
        if ($submits.length === 1) {
            var $submit = $($submits[0]);
            data = data + "&" + encodeURIComponent($submit.attr("name")) + "=" + encodeURIComponent($submit.attr('value'));
        }

        // submit data
        submitData($form, data);
    });

    // submit the specified form and data to the server via ajax adding the Turbolinks-Referrer header
    function submitData($form, data) {
        var url = $form.attr("action");
        var method = $form.attr("method")

        if ($form.hasClass("tab-content")) {
            // add active tab to data (so that we can activate the correct tab when the page reloads)
            var $tab = $form.find(".tab-pane.active");
            data = data + "&tab=" + encodeURIComponent($tab.attr('id'));
        }

        if (method === "get") {
            // append data to querystring
            if (url.indexOf('?') === -1) {
                url = url + "?" + data;
            } else {
                url = url + "&" + data;
            }

            // visit url
            Turbolinks.visit(url);
        } else {

            // intercept request so that we can set form data and the Turbolinks-Referrer header
            $(document).one("turbolinks:request-start", function (event) {
                var xhr = event.originalEvent.data.xhr;
                xhr.open(method, url, true);
                xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
                xhr.setRequestHeader("Turbolinks-Referrer", document.location);
                xhr.data = data;
            });

            // visit url, i.e. post data to server
            Turbolinks.visit(url);
        }
    }

})($);
