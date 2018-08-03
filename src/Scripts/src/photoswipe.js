﻿(function ($) {

    // open photoswipe on click
    $(document).on("click", "[data-photoswipe]", function (e) {
        // open widget preview
        if (weavy.browser.embedded) {
            document.documentElement.classList.add("pswp-transparent");
            weavy.postal.post({ name: "open-preview" });
        }

        var $target = $(e.target);
        e.preventDefault();

        if (weavy.browser.embedded) {
            // embedded: let widget apply styles before photoswipe init
            var $that = $(this);
            $(window).one("resize", function () { photoswipe($that, true); });

        } else {
            photoswipe($(this));
        }
    });



    // cleanup before cache (needed when clicking back in the browser)
    $(document).on("turbolinks:before-cache", function () {
        // close photoswipe
        $(".pswp--open").removeClass("pswp--open pswp--animate_opacity pswp--notouch pswp--css_animation pswp--svg pswp--animated-in pswp--has_mouse");
        document.documentElement.classList.remove("pswp-transparent");
    });

    function photoswipe(element, noZoomAnimation) {
        var $element = $(element);
        var photoswipeId = $element.data("photoswipe");

        var $elements = $("[data-photoswipe=" + photoswipeId + "]");
        var slides = getSlides($elements);

        var index = 0;
        $elements.each(function (i, item) {
            var $item = $(item);
            // which image did we click
            if ($item[0] === $element[0]) {
                index = i;
            }
        });

        // define options
        var options = {
            index: index,
            shareButtons: [
                { id: 'details', label: 'Details', url: '{{image_page_url}}', target: '_self' },
                { id: 'download', label: 'Download', url: '{{raw_image_url}}', download: true, target: '_blank' }
            ],
            history: false,
            showHideOpacity: true,
            getThumbBoundsFn: function (index) {
                var thumb = slides[index].thumb;
                if (thumb) {

                    var rect = slides[index].thumb.getBoundingClientRect();

                    return { x: rect.left, y: rect.top + (window.pageYOffset || document.documentElement.scrollTop), w: rect.width };
                }
                return false;
            },
            getImageURLForShare: function (shareButtonData) {
                return pswp.currItem.href || '';
            }
        };

        if (noZoomAnimation) {
            delete options.getThumbBoundsFn;
        }

        // init and open PhotoSwipe
        var pswpelement = document.querySelectorAll('.pswp')[0];
        var pswp = new PhotoSwipe(pswpelement, PhotoSwipeUI_Default, slides, options);

        // create variable that will store real size of viewport
        var realViewportMax,
            useLargeImages = false,
            firstResize = true,
            imageSrcWillChange;

        document.documentElement.classList.add("pswp-open");

        pswp.listen('destroy', function () {
            document.documentElement.classList.remove("pswp-open");
        });

        // Gallery unbinds events (triggers before closing animation)
        pswp.listen('unbindEvents', function () {
            // close widget preview
            if (weavy.browser.embedded) {
                weavy.postal.post({ name: "close-preview" });
                $(window).one("resize", function () { requestAnimationFrame(function () { document.documentElement.classList.remove("pswp-transparent"); }) });
            }
        });

        // beforeResize event fires each time size of gallery viewport updates
        pswp.listen('beforeResize', function () {
            // gallery.viewportSize.x - width of PhotoSwipe viewport
            // gallery.viewportSize.y - height of PhotoSwipe viewport
            // window.devicePixelRatio - ratio between physical pixels and device independent pixels (Number)
            //                          1 (regular display), 2 (@2x, retina) ...


            // calculate real pixels when size changes
            realViewportMax = Math.max(pswp.viewportSize.x * window.devicePixelRatio, pswp.viewportSize.y * window.devicePixelRatio);

            // Code below is needed if you want image to switch dynamically on window.resize

            // Find out if current images need to be changed
            if (useLargeImages && realViewportMax <= 1920) {
                useLargeImages = false;
                imageSrcWillChange = true;
            } else if (!useLargeImages && realViewportMax > 1920) {
                useLargeImages = true;
                imageSrcWillChange = true;
            }

            // Invalidate items only when source is changed and when it's not the first update
            if (imageSrcWillChange && !firstResize) {
                // invalidateCurrItems sets a flag on slides that are in DOM,
                // which will force update of content (image) on window.resize.
                pswp.invalidateCurrItems();
            }

            if (firstResize) {
                firstResize = false;
            }

            imageSrcWillChange = false;

        });

        // gettingData event fires each time PhotoSwipe retrieves image source & size
        pswp.listen('gettingData', function (index, item) {
            // It doesn't really matter what will you do here, 
            // as long as item.src, item.w and item.h have valid values.
            // 
            // Just avoid http requests in this listener, as it fires quite often

            // Set image source & size based on real viewport width
            var maxedSize, fullscreenTriggerSize = 1024;
            if (useLargeImages) {
                item.src = item.largeImage.src;
                maxedSize = { width: item.largeImage.w, height: item.largeImage.h };
                if (Math.max(item.largeImage.w, item.largeImage.h) >= fullscreenTriggerSize) {
                    maxedSize = resizeLimit(item.largeImage.w, item.largeImage.h, realViewportMax, realViewportMax, true);
                }
            } else {
                item.src = item.mediumImage.src;
                maxedSize = { width: item.mediumImage.w, height: item.mediumImage.h };
                if (Math.max(item.mediumImage.w, item.mediumImage.h) >= fullscreenTriggerSize) {
                    maxedSize = resizeLimit(item.mediumImage.w, item.mediumImage.h, realViewportMax, realViewportMax, true);
                }
            }
            item.w = maxedSize.width;
            item.h = maxedSize.height;
        });

        // inject custom header
        pswp.listen('beforeChange', function () {

            $(".pswp .navbar-preview").remove();
            var header = $("<nav class='navbar fixed-top navbar-preview' />");

            if (pswp.currItem.name) {
                var left = $('<div class="navbar-nav" />');

                left.append('<a class="nav-item nav-link" href="' + pswp.currItem.href + '">' + pswp.currItem.name + '</a>');

                if (weavy.context.area !== "messenger") {

                    var star = $("<button type='button' class='btn btn-icon' data-toggle='star' data-entity='file' data-id='" + pswp.currItem.id + "' />");
                    if (pswp.currItem.starred) {
                        star.addClass("on");
                    }
                    star.html('<svg class="i d-block"><use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#star-outline"></use></svg><svg class="i d-none"><use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#star"></use></svg>');
                    star.on("click", function () {
                        if (star.hasClass("on")) {
                            // unstar
                            pswp.currItem.starred = false;
                            $("[data-photoswipe][data-id='" + pswp.currItem.id + "'][data-entity='file']").removeAttr("data-starred");
                        } else {
                            //star
                            pswp.currItem.starred = true;
                            $("[data-photoswipe][data-id='" + pswp.currItem.id + "'][data-entity='file']").attr("data-starred", "");
                        }
                    });
                    left.append(star);
                }

                header.append(left);
            }

            var right = $('<div class="navbar-icons" />');

            if (weavy.context.area !== "messenger") {
                var comments = $('<a class="btn btn-icon" href="' + pswp.currItem.details + '#comments" title="' + pswp.currItem.comments + (pswp.currItem.comments !== 1 ? ' comments' : ' comment') + '"><svg class="i"><use xlink:href="' + (pswp.currItem.comments > 0 ? '#comment' : '#comment-outline') + '" /></svg></a>');
                comments.on("click", function () {
                    pswp.close();
                });
                right.append(comments);
            }

            if (pswp.currItem.download) {
                right.append('<a href="' + pswp.currItem.download + '" class="btn btn-icon" title="Download"><svg class="i"><use xlink:href="#download" /></svg></a>');
            }

            var close = $('<button type="button" class="btn btn-icon" title="Close preview" />');
            close.html('<svg class="i"><use xlink:href="#close" /></svg>');
            close.on("click", function () {
                pswp.close();
            });

            right.append(close);

            right.appendTo(header);
            header.appendTo(".pswp");
        });

        pswp.init();
    }

    function getSlides($elements) {
        // build slides
        var slides = [];
        $elements.each(function (i, item) {
            var $item = $(item);

            // create slide
            var urlMatch = /\/files\/([0-9]+)\/(?:([0-9]+)[x]([0-9]+)\/)?/;
            var src = $item.data("src") || $item.attr("href");
            var thumb = $item.data("thumb-src") || $item.find("> img").attr("src") || src.replace(urlMatch, "/files/$1/512/");
            var urlProps = src.match(urlMatch);
            var size = $item.data("size") && $item.data("size").split("x") || urlProps[2] && urlProps[3] && [urlProps[2], urlProps[3]] || [0, 0];
            size[0] = parseInt(size[0]);
            size[1] = parseInt(size[1]);
            var mediumSize = resizeLimit(size[0], size[1], 1920, 1920);
            var slide = {
                largeImage: {
                    src: src,
                    w: size[0],
                    h: size[1]
                },
                mediumImage: {
                    src: urlProps[2] && urlProps[3] ? src.replace(urlMatch, "/files/$1/1920x1920/") : src,
                    w: mediumSize.width,
                    h: mediumSize.height
                },
                id: urlProps[1],
                details: weavy.url.resolve("/files/" + urlProps[1]),
                download: weavy.url.resolve("/files/" + urlProps[1] + "/" + $item.data("name") + "?dl=1"),
                href: $item.data("href") || $item.attr("href"),
                starred: typeof $item.attr("data-starred") === 'undefined' ? false : true,
                comments: $item.attr("data-comments"),
                name: $item.data("name"),
                msrc: thumb,
                thumb: $item.find("> img")[0] || $('<img src="' + thumb + '" />').css({ position: "absolute", top: 0, left: 0, zIndex: -1000, opacity: 0, display: "none" }).appendTo(item)[0]
            };
            slides.push(slide);
        });

        return slides;
    }

    function resizeLimit(width, height, limitWidth, limitHeight, useMinimum) {
        var ratio;
        if (useMinimum ? width < limitWidth : width > limitWidth) {
            ratio = limitWidth / width;
            width *= ratio;
            height *= ratio;
        }
        if (useMinimum ? height < limitHeight : height > limitHeight) {
            ratio = limitHeight / height;
            width *= ratio;
            height *= ratio;
        }
        return {
            width: width,
            height: height
        };
    }

})($);
