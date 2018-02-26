tinymce.PluginManager.add("weavy_image", function (editor, url) {
    
    editor.addMenuItem("weavy_image", {
        icon: "image",
        text: "Insert/edit image",
        context: "insert",
        cmd: "weavy_image"
    });

    editor.addButton("weavy_image", {
        tooltip: "Insert/edit image",
        icon: "image",
        cmd: "weavy_image",
        stateSelector: 'img:not([data-mce-object],[data-mce-placeholder]),figure.image'
    });

    editor.addMenuItem("weavy_file", {
        icon: "attachment",
        text: "Insert/edit file",
        context: "insert",
        cmd: "weavy_file"
    });

    editor.addButton("weavy_file", {
        tooltip: "Insert/edit file",
        icon: "attachment",
        cmd: "weavy_file"
    });

    editor.addShortcut("Meta+shift+a", "Insert image", function () {
        editor.execCommand("weavy_image");
    });

    editor.addShortcut("Meta+shift+f", "Insert file", function () {
        editor.execCommand("weavy_file");
    });

    editor.addCommand("weavy_image", function () { weavyInsertFile(true) });
    editor.addCommand("weavy_file", function () { weavyInsertFile(false) });

    function weavyInsertFile(isImage) {
        var params = "";

        // get attributes if current element is an img.
        var attrs;
        var elm = editor.selection.getNode();
        if (elm != null && (elm.nodeName == "IMG" || elm.nodeName == "A")) {
            attrs = editor.dom.getAttribs(elm);
            for (var i = 0; i < attrs.length; i++) {
                if (attrs[i].nodeName.indexOf('_') != 0) {
                    params += (params.length > 0 ? "&" : "") + encodeURIComponent(attrs[i].nodeName) + "=" + encodeURIComponent(editor.dom.getAttrib(elm, attrs[i].nodeName, ""));
                }
            }
        }
        var itemid = $("#ItemId").val();
        if (itemid) {
            params += (params.length > 0 ? "&" : "") + "id=" + itemid;
        }

        if (!isImage) {
            params += (params.length > 0 ? "&" : "") + "isImage=false";
        }

        // get attachments
        $("#attachments input[type='hidden']").each(function (i, item) {
            params += (params.length > 0 ? "&" : "") + "att=" + $(item).val();
        });

        editor.windowManager.open({
            title: isImage ? "Insert/edit image" : "Insert/edit file",
            file: weavy.url.resolve("ui/insertimage?" + params),
            width: 800,
            height: 600,
            resizable: true,
            maximizable: true,
            inline: 1,
            onclose: function () {                
                var attachmentsRoot = $("#attachments", window.document).empty();                               
                $("iframe[src*='ui/insertimage']").contents().find(".result").find("input[type='hidden']").each(function (i, item) {                
                    attachmentsRoot.append($("<input type='hidden' name='attachmentids' value='" + $(item).val() + "' />"));
                });
            }
        }, {
                insertImageOrDocument: function (url, description, original, filename, isImage) {                
                var elm = editor.selection.getNode();
                var dom = editor.dom;
                var isThumbnail = url !== original;                
                    
                editor.execCommand("mceBeginUndoLevel");

                if (isImage && /.(jpg|jpeg|gif|png)$/i.test(url)) {
                    // image

                    if (elm != null && elm.nodeName == "IMG") {
                        // update existing

                        dom.setAttrib(elm, "src", url);
                        dom.setAttrib(elm, "alt", description);

                        var parentNode = elm.parentNode;

                        if (parentNode != null && parentNode.nodeName == "A" && parentNode.hasAttribute("rel") && parentNode.getAttribute("rel") == "lightbox") {
                            // update anchor
                            dom.setAttrib(parentNode, "href", original);
                        }
                    } else {
                        // create new
                        elm = editor.dom.create('img', { src: url, alt: '' });
                        dom.setAttrib(elm, "alt", description);
                        dom.setAttrib(elm, "src", url);

                        var a = dom.create('a', { href: original, "rel": "lightbox" });
                        dom.add(a, elm);
                        editor.selection.setNode(a);
                    }

                } else {
                    // document

                    if (elm != null && elm.nodeName == 'A') {
                        // update existing
                        dom.setAttrib(elm, "href", url);
                        dom.setAttrib(elm, "title", description);
                    } else {
                        // create new
                        var text = editor.selection.getContent({ format: 'text' });

                        if (text.length == 0) {
                            text = filename;
                        }
                        elm = editor.dom.create('a', { href: url, title: '' }, text);
                        dom.setAttrib(elm, "title", description);
                        dom.setAttrib(elm, "href", url);
                        editor.selection.setNode(elm);
                    }
                }
                editor.execCommand("mceEndUndoLevel");
            }
        });
    }
});
