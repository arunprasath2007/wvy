var weavy = weavy || {};
weavy.attach = (function () {

    document.addEventListener("turbolinks:load", function () {
        if (!weavy.browser.embedded) {
            $("#filebrowser").attr("src", "https://filebrowser.weavycloud.com?origin=" + window.location.origin);
        } else {
            // request current origin from weavy widget
            window.parent.postMessage({ name: 'requestOrigin' }, "*")
        }
    });

    // submit new google drive doc to filebrowser.weavycloud.com
    $(document).on("click", "#google-create-modal button[type='submit']", function (e) {
        
        var type = $(this).data("type");
        var title = $("#google-create-modal input.doctitle").val() || "New Google " + type;
        $(this).prop("disabled", true);

        $("#filebrowser")[0].contentWindow.postMessage({ name: 'create', title: title, type: type }, "*");

        return false;
    });

    // handle click on each provider when selecting adding new file from cloud provider
    $(document).on("click", "a.list-group-item[data-provider]", function (e) {
        e.preventDefault();

        var provider = $(this).data("provider");
        var action = $(this).data("action");

        switch (action) {

            case "custom-link":
                $("#attach-modal .custom-link").removeClass("d-none");
                $("#attach-modal .modal-footer").removeClass("d-none");
                break;
            default:
                // maximize window if Google Drive picker
                if (provider === "google-drive") {
                    $("#filebrowser").show();
                    window.parent.postMessage({ name: 'maximize' }, "*")
                }

                // send message to filebrowser.weavycloud.com to open up correct picker
                $("#filebrowser")[0].contentWindow.postMessage({ name: 'open', provider: provider }, "*");
        }

        return false;
    });

    // handle custom link
    $(document).on("click", "#attach-form button[type=submit]", function (e) {
        e.preventDefault();
        var url = $("#attach-form input[name=url]").val();
        var title = $("#attach-form input[name=linktitle]").val() || url;
        var embedded = $("#attach-form input[name=linkembedded]").is(":checked");

        if (url !== "") {
            attach([{ url: url, title: title, embedded: embedded }], 'custom');
        }
    });

    // hide show custom link properties
    $(document).on("change keyup input", "#attach-form input[name=url]", function (e) {
        if ($(this).val() != "") {
            $("#attach-form input[name=linktitle]").parent().removeClass("d-none");
            $("#attach-form input[name=linkembedded]").parent().removeClass("d-none");
            $("#attach-form button[type=submit]").prop("disabled", false);
        } else {
            $("#attach-form input[name=linktitle]").parent().addClass("d-none");
            $("#attach-form input[name=linkembedded]").parent().addClass("d-none");
            $("#attach-form button[type=submit]").prop("disabled", true);
        }
    })

    // listen to messages from filebrowser.weavycloud.com and widget
    window.addEventListener("message", function (e) {
        
        if (e.data.name === "insert") {
            // insert new link entity
            var links = e.data.links;
            var provider = e.data.provider;
            var open = e.data.open;

            $("#attach-form button[type=submit]").prop("disabled", true);

            attach(links, provider, open);

        } else if (e.data.name === "closePicker") {
            // close Google Drive picker
            $("#filebrowser").hide();
        } else if (e.data.name === "origin") {
            // set correct origin to filebrowser.weavycloud.com. Required by Google Drive picker!
            $("#filebrowser").attr("src", "https://filebrowser.weavycloud.com?origin=" + e.data.url);
        }
    });

    var attach = function (links, provider, open) {
        
        var $overlaySpinner = $("#attach-modal-spinner");
        $overlaySpinner.removeClass("d-none");
        
        $.ajax({
            url: weavy.url.resolve($("#attach-form").attr("action")),
            method: "POST",
            contentType: "application/json",
            data: JSON.stringify({ links: links, provider: provider })
        }).always(function (response) {
            if (open) {                
                var href = response.links[0].item_url;
                // redirect to new item
                Turbolinks.visit(href, { action: "replace" });
                window.parent.postMessage({ name: 'maximize' }, "*")
            } else {
                // reload page
                Turbolinks.visit(location.toString(), { action: "replace" })
            }

            $overlaySpinner.addClass("d-none");

        }).fail(function (xhr, status, error) {
            setTimeout(function () {
                var json = JSON.parse(xhr.responseText);
                weavy.alert.warning(json.message);
            }, 1000);

        });
    }
})();
