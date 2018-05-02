var weavy = weavy || {};
weavy.turbolinks = (function ($) {
    // gets a value indicating whether turbolinks is enabled or not
    var enabled = typeof Turbolinks !== "undefined" && Turbolinks !== undefined && Turbolinks.supported !== undefined && Turbolinks.supported;

    if (enabled) {

        // monkey patch turbolinks to render error pages, see https://github.com/turbolinks/turbolinks/issues/179
        Turbolinks.HttpRequest.prototype.requestLoaded = function () {
            return this.endRequest(function (t) {
                return function () {
                    var e;
                    return 200 <= (e = t.xhr.status) && 300 > e || t.xhr.getResponseHeader("Turbolinks-Status") === "OK" ? t.delegate.requestCompletedWithResponse(t.xhr.responseText, t.xhr.getResponseHeader("Turbolinks-Location")) : (t.failed = !0, t.delegate.requestFailedWithStatusCode(t.xhr.status, t.xhr.responseText))
                }
            }(this));
        };

        // monkey patch turbolinks send function with data enabled send
        Turbolinks.HttpRequest.prototype.send = function () {
            var t;
            return this.xhr && !this.sent ? (this.notifyApplicationBeforeRequestStart(), this.setProgress(0), this.xhr.send(this.xhr.data), this.sent = !0, "function" === typeof (t = this.delegate).requestStarted ? t.requestStarted() : void 0) : void 0;
        }

        // print state changes (for debugging purposes), see https://javascript.info/onload-ondomcontentloaded
        //console.debug("document:" + document.readyState);
        //document.addEventListener("readystatechange", function () { console.debug("document:" + document.readyState); });
        //document.addEventListener("DOMContentLoaded", function () { console.debug("document:ready"); });
        //document.addEventListener("turbolinks:click", function (e) { console.debug(e.type); });
        //document.addEventListener("turbolinks:before-visit", function (e) {console.debug(e.type);});
        //document.addEventListener("turbolinks:request-start", function (e) { console.debug(e.type); });
        //document.addEventListener("turbolinks:visit", function (e) { console.debug(e);  });
        //document.addEventListener("turbolinks:request-end", function (e) { console.debug(e.type); });
        //document.addEventListener("turbolinks:before-cache", function (e) { console.debug(e.type); });
        //document.addEventListener("turbolinks:before-render", function (e) {console.debug(e.type); });
        //document.addEventListener("turbolinks:render", function (e) { console.debug(e.type); });
        //document.addEventListener("turbolinks:load", function (e) {console.debug(e.type);});
        //window.addEventListener("load", function (e) { console.debug("window:" + e.type); });
        //window.addEventListener("beforeunload", function (e) { console.debug("window:" + e.type); });
        //window.addEventListener("unload", function (e) { console.debug("window:" + e.type); });

        // submit form through turbolinks by clicking submit button
        $(document).on("click", "form[data-turboform] [type=submit][name][value]", function (e) {
            e.preventDefault();

            // serialize form
            var $submit = $(this);
            var $form = $submit.closest("form[data-turboform]");
            var data = $form.serialize();

            // add button name and value
            data = data + (data.length === 0 ? "" : "&") + encodeURIComponent($submit.attr("name")) + "=" + encodeURIComponent($submit.attr('value'));

            // submit form with data
            submitFormWithData($form, data);
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

            // submit form with data
            submitFormWithData($form, data);
        });
    }

    // submit the specified form and data to the server via ajax adding the Turbolinks-Referrer header
    function submitFormWithData($form, data) {
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

    return {
        enabled: enabled
    };
})($);