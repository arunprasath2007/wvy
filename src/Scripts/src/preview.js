// preview files in fullscreen overlay
var weavy = weavy || {};
weavy.preview = (function ($) {

    // default options
    var options = {
        locale: 'en-US',
        workerSrc: weavy.url.resolve("/scripts/vendor/pdfjs-dist/pdf.worker.min.js"),
        cMapUrl: weavy.url.resolve("/scripts/vendor/pdfjs-dist/cmaps/"),
        cMapPacked: true,
        pdfThumbnailViewer: null,
        isThumbnailViewEnabled: false,
        thumbnailContainer: null
    };

    // open pdf viewer on click
    $(document).on("click", "[data-preview]", function (e) {
        var $target = $(e.target);
        if ($target.hasClass("dropdown") || $target.parents(".dropdown").length) {
            return;
        }
        e.preventDefault();

        // get parameters for the open() function
        var previewUrl = $(this).data("preview");
        var href = $(this).data("href") || $(this).attr("href");
        var fileId = $(this).data("id");

        open(previewUrl, href, fileId);
    });

    // close pdf viewer when clicking the close button
    $(document).on("click", "[data-preview-close]", function (e) {
        e.preventDefault();
        close();
    });

    // close pdf viewer when clicking the backdrop
    $(document).on("click", ".preview-container", function (e) {
        var $target = $(e.target);
        if ($target.attr("id") == "pdfViewer" || $target.hasClass("preview-container") || $target.hasClass("preview-document")) {
            close();
        }
    });

    // init/destroy pdf viewer
    if (weavy.document.turbolinks) {
        document.addEventListener("turbolinks:load", init);
        // REVIEW: we should probably do more to cleanup the pdf viewer here, do some research and figure out what...
        document.addEventListener("turbolinks:before-cache", close);
    } else {
        $(document).ready(init);
    }

    // init pdf viewer
    function init() {
        if (!document.getElementById('preview')) {
            // exit if no preview container
            return;
        }
        //console.debug("preview.js:init");
        weavy.pdf.pdfjsWebApp.PDFViewerApplication.initialize(options);
    }

    // open file preview for the specified file
    function open(previewUrl, href, fileId) {
        // add event handle for closing preview on ESC
        $(document).on("keyup", keyup);

        // open up the document with pdf.js
        weavy.pdf.pdfjsWebApp.PDFViewerApplication.open(previewUrl);

        // show container
        $("html").addClass("preview-open");
        $(".preview-container").show();

        // then apply nice header with document title etc.
        applyHeader(href || previewUrl, fileId);

        // maximize widget window
        weavy.postal.post({ name: "maximize-preview" });
    }

    // close file preview
    function close() {
        if (!document.getElementById('preview')) {
            // exit if no preview container
            return;
        }

        // remove event handler for ESC
        $(document).off("keyup", keyup);

        // hide container
        $("html").removeClass("preview-open");
        $(".preview-container").hide();

        // clear selection
        window.getSelection().removeAllRanges();

        // REVIEW: is this the correct way to close the viewer?
        weavy.pdf.pdfjsWebApp.PDFViewerApplication.cleanup();
        weavy.pdf.pdfjsWebApp.PDFViewerApplication.close();
        $(weavy.pdf.pdfjsWebApp.PDFViewerApplication.pdfViewer.viewer).find(".page:not(.loading)").remove();
    }

    // close preview on ESC
    function keyup(e) {
        if (e.keyCode == 27) {
            close();
        }
    }

    // get filename from url
    function getFileName(url) {
        // remove #anchor
        url = url.substring(0, (url.indexOf("#") == -1) ? url.length : url.indexOf("#"));
        // remove ?querystring
        url = url.substring(0, (url.indexOf("?") == -1) ? url.length : url.indexOf("?"));
        // remove everything before the last slash in the path
        url = url.substring(url.lastIndexOf("/") + 1, url.length);
        // return
        return url;
    }

    // add header with document title etc.
    function applyHeader(href, fileId) {
        var $previewContainer = $(".preview-container");

        // remove existing header and create new
        $previewContainer.find(".navbar-preview").remove();
        var header = $('<nav class="navbar fixed-top navbar-preview" />');
        var left = $('<div class="navbar-nav" />');

        if (fileId == null) {
            // add header with only name and button since we don't have any file meta data
            left.append('<a class="nav-item nav-link" href="' + href + '">' + getFileName(href) + '</a>');
            header.append(left);
            header.append('<div class="navbar-icons"><button type="button" class="btn btn-icon" title="Close" data-preview-close data-widget-event data-widget-name="close-preview"><svg class="i"><use xlink:href="#close" /></svg></button></div>');
            header.appendTo($previewContainer);
        } else {
            // get meta data from server and render nice header with filename, star, download etc.
            weavy.api.getFile(fileId).done(function (data, textStatus, jqXHR) {
                left.append('<a class="nav-item nav-link" href="' + href + '">' + data.name + '</a>');
                if (data.permissions.includes("star") && weavy.context.area !== "messenger") {
                    // add star
                    var star = $('<button type="button" class="btn btn-icon" data-toggle="star" data-entity="' + data.type + '" data-id="' + data.id + '"><svg class="i d-block"><use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#star-outline"></use></svg><svg class="i d-none"><use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#star"></use></svg></button>');
                    if (data.is_starred) {
                        star.addClass("active");
                    }
                    left.append(star);
                }
                header.append(left);
                var comments = data.comments || [];
                var right = $('<div class="navbar-icons" />');
                if (weavy.context.area !== "messenger") {
                    right.append('<a class="btn btn-icon" href="' + href + '#comments" title="' + comments.length + (comments.length != 1 ? ' comments' : ' comment') + '"><svg class="i"><use xlink:href="' + (comments.length ? '#comment' : '#comment-outline') + '" /></svg></a>');
                }
                right.append('<a class="btn btn-icon" href="' + data.content_url + '?dl=1" title="Download"><svg class="i"><use xlink:href="#download" /></svg></a>');
                right.append('<button type="button" class="btn btn-icon" title="Close" data-preview-close data-widget-event data-widget-name="close-preview"><svg class="i"><use xlink:href="#close" /></svg></button>');
                right.appendTo(header);

                header.appendTo($previewContainer);
            });
        }
    }

    return {
        options: options,
        open: open,
        close: close
    };

})($);
