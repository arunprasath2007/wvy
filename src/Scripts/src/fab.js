﻿$(function () {
    // create word, excel, powerpoint document
    $(document).on("show.bs.modal", "#filename-dialog", function (e) {

        $("#o365-modal").modal('toggle')

        var ext = $(e.relatedTarget).data("param");
        var $that = $(this);
        $(this).find("#filename-dialog-type").text($(e.relatedTarget).data("type"));
        $(this).find(".input-group-addon").text(ext);
        $(this).find("#ext").val(ext);
        $(this).find("#name").val("");
        setTimeout(function () { $that.find("#name").focus() }, 1);
    });    

    // create google drive docs
    $(document).on("show.bs.modal", "#google-create-modal", function (e) {

        $("#googledrive-modal").modal('toggle')

        var docType = $(e.relatedTarget).data("param");
        var name = $(e.relatedTarget).data("type");
        var icon = $(e.relatedTarget).data("icon");

        var $that = $(this);
        $(this).find("button").data("type", docType);        
        $(this).find(".docicon")[0].setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', '#google-' + icon);
        $(this).find("#doctype").text(name);        
        $(this).find(".doctitle").val("");
        setTimeout(function () { $that.find(".doctitle").focus() }, 1);
    });    
});
