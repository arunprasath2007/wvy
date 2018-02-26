var weavy = weavy || {};
weavy.fileupload = (function () {

    // event handler for removing existing file from input field
    $(document).on("click", ".file-upload .clear", function (evt) {
        evt.preventDefault();

        var $upload = $(this).closest('.file-upload');
        $upload.find("input[type=hidden]").val("delete");

        var $custom = $upload.find(".custom-file-control");
        $custom.text("");

        var $img = $upload.find("img");
        $img.prop("src", $img.data("thumb"));
        $(this).addClass("d-none");
    });

    // init file uploads
    document.addEventListener("turbolinks:load", function () {
        //console.debug("fileupload.js:init");
        // file upload
        $(".file-upload input[type=file]").fileupload({
            dataType: "json",
            pasteZone: null,
            add: function (e, data) {
                $(this).removeClass("is-invalid");
                var $upload = $(this).closest(".file-upload");
                var $custom = $upload.find(".custom-file-control").text("");
                var $text = $upload.find(".form-text").removeClass("d-none");
                var $feedback = $upload.find(".invalid-feedback").removeClass("d-block");
                var errors = validate(data.files, $(this).data("max-size"), $(this).attr("accept"));
                if (errors.length > 0) {
                    $(this).addClass("is-invalid");
                    $text.addClass("d-none");
                    $feedback.addClass("d-block").text(errors.join(" "));
                } else {
                    // show progressbar
                    $custom.text("Uploading...");
                    $upload.find(".progress").removeClass("invisible");
                    // upload file
                    data.submit();
                }
            },
            progressall: function (e, data) {
                // update progress bar
                $(this).closest(".file-upload").find(".progress-bar").css("width", parseInt(data.loaded / data.total * 100, 10) + "%");
            },
            done: function (e, data) {
                var json = data.result.data[0];
                var $upload = $(this).closest(".file-upload");
                $upload.find("input[type=hidden]").val(json.id);
                $upload.find(".clear").removeClass("d-none");

                var $custom = $upload.find(".custom-file-control");
                $custom.text(json.name);

                var $img = $upload.find("img");
                if ($img.length) {
                    $img.prop("src", json.thumb_url.replace("{options}", "256x256-crop,both"));
                }
                $(this).focus();
            },
            fail: function (e, data) {
                console.error(data.jqXHR.responseJSON.message);
            },
            always: function () {
                // reset progress bar
                var $upload = $(this).closest(".file-upload");
                $upload.find(".progress").addClass("invisible").find(".progress-bar").css("width", "0%");
            }
        });

        $(".fab-upload input[type=file]").fileupload({
            dataType: "json",
            pasteZone: null,
            add: function (e, data) {                
                $("head").after("<div class='turbolinks-progress-bar custom'></div>");

                if (e.delegatedEvent.type !== "drop") {
                    // close dropup
                    $(".main-fab [data-toggle='dropdown']").dropdown("toggle");
                }

                // upload file
                data.submit();
            },
            progressall: function (e, data) {
                // update progress bar            
                $("head").next().css({ "width": parseInt(data.loaded / data.total * 100, 10) + "%", "opacity": 1 });
            },
            done: function (e, data) {
                var ids = null;

                if (data.result.skipped) {
                    ids = $.map(data.result.skipped, function (val) { return val.id; }).join(",");

                    if (data.result.skipped.length === 1) {
                        weavy.alert.warning('There is already a file named ' + data.result.skipped[0].name + '.' +
                            '<form class="alert-form skipped-files">' +
                            '<button type="submit" class="btn btn-icon"><svg class="i"><use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#check"></use></svg> Replace the file</button>' +
                            '<input type="hidden" name="ids" value="' + ids + '" />' +
                            '</form>' +
                            '<button type="button" class="btn btn-icon" data-dismiss="alert"><svg class="i"><use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#close"></use></svg> Skip this file</button>');
                    } else {
                        weavy.alert.warning('There are ' + data.result.skipped.length + ' files with the same names. ' +
                            '<form class="alert-form skipped-files">' +
                            '<button type="submit" class="btn btn-icon"><svg class="i"><use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#check"></use></svg> Replace the files</button>' +
                            '<input type="hidden" name="ids" value="' + ids + '" />' +
                            '</form>' +
                            '<button type="button" class="btn btn-icon" data-dismiss="alert"><svg class="i"><use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#close"></use></svg> Skip these files</button>');
                    }

                    var replaceUrl = weavy.url.resolve($(this).data("url").replace("files", "attach"));

                    $(".skipped-files").on("submit", function (e) {
                        // attach and replace existing files
                        e.preventDefault();
                        var $alert = $(this).closest(".alert");
                        ids = $(this).find("input[name=ids]").val().split(',').map(function (val) { return Number(val); });
                        $.ajax({
                            url: replaceUrl,
                            type: "POST",
                            contentType: "application/json",
                            data: JSON.stringify({ files: ids, replace: true })
                        }).done(function (data, status, xhr) {
                            // reload page
                            Turbolinks.visit(location.toString(), { action: "replace" })
                        }).fail(function (xhr, status, error) {
                            var json = JSON.parse(xhr.responseText);
                            weavy.alert.warning(json.message);
                        }).always(function () {
                            $alert.alert('close');
                        });
                    });
                } else {
                    // reload page
                    Turbolinks.visit(location.toString(), { action: "replace" })
                }
            },
            fail: function (e, data) {
                console.error(data.jqXHR.responseJSON.message);
            },
            always: function () {
                // remove progress bar
                $("html").find(".turbolinks-progress-bar.custom").remove();
            }
        });
    });

    // destroy file uploads
    document.addEventListener("turbolinks:before-cache", function () {
        //console.debug("fileupload.js:destroy");

        $(".file-upload input[type=file]").each(function (i) {
            if ($(this).fileupload("instance") !== undefined) {
                $(this).fileupload("destroy");
            }
        });

        $(".fab-upload input[type=file]").each(function (i) {
            if ($(this).fileupload("instance") !== undefined) {
                $(this).fileupload("destroy");
            }
        });

    });

    // validate filetype and sizes
    function validate(files, maxSize, accept) {
        var errors = [];

        // global settings for accepted file types and size
        var whitelist = $("html").data("whitelist");
        var maxUploadSize = $("html").data("maxuploadsize");

        $.each(files, function (index, file) {

            // globally accepted file types
            if (whitelist && whitelist.length && file["name"].length) {
                var rx = new RegExp("(\.|\/)(" + whitelist + ")$", "i");
                //console.debug("Validating " + file["name"] + " against " + rx.source);
                if (!rx.test(file["name"])) {
                    errors.push("File type is not allowed.");
                }
            }

            // accepted file types for this field
            if (errors.length === 0 && accept && accept.length && file["name"].length) {
                accept = accept.split(", ").join("|");
                var rx = new RegExp("(" + accept + ")$", "i");
                //console.debug("Validating " + file["name"] + " against " + rx.source);
                if (!rx.test(file["name"])) {
                    errors.push("File type is not allowed.");
                }
            }

            // maximum file size for this this field
            var fs = parseInt(file["size"]);
            if (errors.length === 0 && maxSize) {
                if (fs > parseInt(maxSize)) {
                    errors.push("The file is too big.");
                }
            }

            // maximum file size (global)
            if (errors.length === 0 && maxUploadSize) {
                if (fs > parseInt(maxUploadSize)) {
                    errors.push("The file is too big.");
                }
            }
        });
        return errors;
    }

    return {
        validate: validate
    };

})();
