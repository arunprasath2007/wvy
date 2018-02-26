//// script for the context widget

// open user profile links in context frame in personal frame
$(document).on("click", "html.embedded.strip-context a[href^='/people/']", function (e) {    
        e.preventDefault();

        var url = weavy.url.resolve($(this).attr("href"));
        window.parent.postMessage({ "name": "personal", "url": url }, "*");    
});


