(function ($) {
    console.debug("widget.js");

    this.Weavy = function () {
        this.supportsShadowDOM = !!HTMLElement.prototype.attachShadow;

        var self = this;
        var previewingFullscreen = false;
        var disconnected = false;

        // dom elements
        this.container = null;
        this.strips = null;
        this.buttons = null;
        this.draggable = null;
        this.notifications = null;

        this.personalStrip = null;
        this.personalFrame = null;
        this.personalButton = null;

        this.globalContainer = null;
        this.personalContainer = null;
        this.addContainer = null;
                
        this.addStrip = null;
        this.addFrame = null;
        this.addButton = null

        this.messengerStrip = null;
        this.messengerFrame = null;
        this.messengerButton = null;

        this.toolTipTimout = null;
        this.toolTip = null;

        this.notificationSound = null;

        this.bubbles = [];

        this.unreadConversations = [];

        this.dragData = null;

        this.isBlocked = false;

        var defaults = {
            init: true,
            button: true,
            close_button: true,
            resize_button: true,
            el: null,
            is_loaded: false,
            className: 'weavy-middle',
            add_title: 'Open',
            snappingY: 4,
            snappingX: 12
        }

        this.options = defaults;

        // extend default options with the passed in arugments
        if (arguments[0] && typeof arguments[0] === "object") {
            this.options = extendDefaults(defaults, arguments[0]);
        }

        // public methods
        Weavy.prototype.init = function () {
            connect.call(this).then(function () {
                self.options.conversations = null;
                self.options.is_loaded = false;
                self.options.origin = window.location.origin;
                weavy.realtime.invoke("widget", "load", self.options);
            });
        }

        // open a conversation
        Weavy.prototype.openConversation = function (conversationId, event) {
            event.preventDefault();
            event.cancelBubble = true;
            this.messengerFrame.contentWindow.postMessage({ "name": "openConversation", "id": conversationId }, "*");
            this.open("messenger");
        }

        // close open strip
        Weavy.prototype.close = function () {
            $(this.container).removeClass("weavy-open");
            $(".weavy-strip", this.strips).removeClass("weavy-open");
            $(".weavy-button", this.buttons).removeClass("weavy-open");
            $(".weavy-notification-frame", this.container).remove();
            triggerEvent("close", null);
        }

        // open specified strip (personal, messenger or bubble)
        Weavy.prototype.open = function (strip, destination) {

            if (this.isBlocked) {                
                fallback(strip, destination);
            } else {
                $(this.container).addClass("weavy-open");

                var $strip = $("#weavy-strip-" + strip, this.strips);
                if (!$strip.hasClass("weavy-open")) {
                    $(".weavy-strip", this.strips).removeClass("weavy-open");
                    $(".weavy-button", this.buttons).removeClass("weavy-open");
                    $(".weavy-button.weavy-" + strip, this.buttons).addClass("weavy-open");
                    $("#weavy-strip-" + strip, this.strips).addClass("weavy-open");
                    $(".weavy-notification-frame", this.notifications).remove();

                    if (destination) {
                        var $frame = $("iframe", $strip);
                                                
                        loading.call(self, "weavy-strip-" + strip, true);
                        $frame.attr("src", destination);
                        
                    }
                    triggerEvent("open", { target: strip });
                }
            }
        }

        // toggle (open/close) specified strip (personal, messenger or bubble)
        Weavy.prototype.toggle = function (strip, event, force) {
            if (this.isBlocked) {
                // NOTE: prevent incorrect fallback when result from pong has not yet been recieved. 
                // If blocked: wait 100ms and call the method again to allow the test to be concluded before opening a fallback window
                if (force) {
                    fallback(strip, null);
                } else {
                    // call toggle after 100ms with force = true
                    setTimeout(self.toggle.bind(this, strip, null, true), 100);
                }
            } else {
                $(".weavy-button.weavy-" + strip, this.container).hasClass("weavy-open") ? this.close() : this.open(strip);
            }            
        }

        // remove a bubble
        Weavy.prototype.removeBubble = function (id, type, event) {            

            event.preventDefault();
            event.stopPropagation();
                        
            return $.ajax({
                url: self.options.url + "api/widget/bubbles/remove",
                type: "POST",
                data: JSON.stringify({ space_id: id, type: type, url: self.options.origin }),
                contentType: "application/json",
                xhrFields: {
                    withCredentials: true
                },
                crossDomain: true
            });            
        }

        // add a bubble
        Weavy.prototype.connectBubble = function (id, event) {

            event.preventDefault();
            event.stopPropagation();

            // remove as personal if existing bubble
            setTimeout(function () {
                self.removeBubble(id, 1, event).then(function () {
                    setTimeout(function () {
                        $.ajax({
                            url: self.options.url + "api/widget/bubbles",
                            type: "POST",
                            data: JSON.stringify({ space_id: id, type: 0, url: self.options.origin }),
                            contentType: "application/json",
                            xhrFields: {
                                withCredentials: true
                            },
                            crossDomain: true
                        });
                    }, 250);
                });
            }, 250);
        }

        // resize the panel
        Weavy.prototype.resize = function () {            
            $(this.container).toggleClass("weavy-wide");
            triggerEvent("resize", null);
        }

        // toggle preview window
        Weavy.prototype.togglePreview = function () {
            $(this.container).toggleClass("weavy-preview");
            triggerEvent("resize", null);
        }

        Weavy.prototype.on = function (event, cb) {
            $(document).on(event + ".event.weavy", null, null, cb);
        }

        // reload the page
        Weavy.prototype.reload = function (options) {
            this.options = extendDefaults(this.options, options);
            this.init();

            triggerEvent("reload", this.options);
        }

        // refresh a panel
        Weavy.prototype.refresh = function (strip) {
            
            loading.call(this, strip, true);

            var $strip = $("#" + strip, this.container);

            var frame = $strip.find("iframe");
            
            frame[0].contentWindow.postMessage({ "name": "reload" }, "*");                                
            triggerEvent("refresh", { 'strip': strip });
        }

        // get the options
        Weavy.prototype.options = this.options;

        function buildOutput() {
            // add container
            if (this.container) {
                this.container.remove();
            }
            this.container = document.createElement("div");
            this.container.className = "weavy-widget " + this.options.className + ' ' + (this.options.el ? 'weavy-custom' : 'weavy-default');
            this.container.id = "weavy-widget";
            this.container.setAttribute("data-version", this.options.version);
            
            // strips
            this.strips = document.createElement("div");
            this.strips.className = "weavy-strips";

            // draggable
            this.draggable = document.createElement("div");
            this.draggable.className = "weavy-draggable" + (this.options.is_open ? " weavy-open" : "");
            this.draggable.setAttribute("draggable", "true");

            // draggable transparent image
            this.dragImage = document.createElement("div");
            this.dragImage.className = "weavy-dragimage";
            this.container.appendChild(this.dragImage);

            if (this.options.user_id) {

                // personal strip
                this.personalStrip = document.createElement("div");
                this.personalStrip.className = "weavy-strip weavy-loading" + (this.options.is_open ? " weavy-open" : "");
                this.personalStrip.id = "weavy-strip-personal";
                this.personalStrip.appendChild(renderControls.call(this, "weavy-strip-personal"));
                this.strips.appendChild(this.personalStrip);

                // personal frame
                this.personalFrame = document.createElement("iframe");
                this.personalFrame.className = "weavy-strip-frame";
                this.personalFrame.allowFullscreen = 1;
                this.personalFrame.src = this.options.personal_url;
                this.personalFrame.onload = function (a, b, c) {
                    // start testing for blocked iframe                    
                    this.contentWindow.postMessage({ "name": "ping" }, "*");                    
                    self.isBlocked = true;
                    loading.call(self, "weavy-strip-personal", false);

                    // add window to connections
                    weavy.connection.addWindow(self.personalFrame.contentWindow)
                }

                this.personalStrip.appendChild(this.personalFrame);

                // personal button container
                this.personalButtonContainer = document.createElement("div");
                this.personalButtonContainer.className = "weavy-bubble-item weavy-bubble-personal";
                this.draggable.appendChild(this.personalButtonContainer);
                
                // personal button
                this.personalButton = document.createElement("div");
                this.personalButton.className = "weavy-button weavy-personal weavy-button-transparent" + (this.options.notifications_count === 0 ? "" : " weavy-dot");
                this.personalButton.setAttribute("data-count", this.options.notifications_count);
                this.personalButton.innerHTML = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12,19.2C9.5,19.2 7.29,17.92 6,16C6.03,14 10,12.9 12,12.9C14,12.9 17.97,14 18,16C16.71,17.92 14.5,19.2 12,19.2M12,5A3,3 0 0,1 15,8A3,3 0 0,1 12,11A3,3 0 0,1 9,8A3,3 0 0,1 12,5M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12C22,6.47 17.5,2 12,2Z"></path></svg>'
                this.personalButtonContainer.appendChild(this.personalButton);

                // tooltip
                this.personalTooltip = document.createElement("div");
                this.personalTooltip.id = "weavy-bubble-tooltip-personal";
                this.personalTooltip.className = "weavy-bubble-tooltip";

                var personalTooltipText = document.createElement("span");
                personalTooltipText.className = "weavy-bubble-tooltip-text";
                personalTooltipText.innerHTML = this.options.personal_title;

                this.personalTooltip.appendChild(personalTooltipText);
                this.personalButtonContainer.appendChild(this.personalTooltip);

                // messenger strip
                this.messengerStrip = document.createElement("div");
                this.messengerStrip.className = "weavy-strip weavy-loading" + (this.options.is_open ? " weavy-open" : "");
                this.messengerStrip.id = "weavy-strip-messenger";
                this.strips.appendChild(this.messengerStrip);

                // messenger frame
                this.messengerFrame = document.createElement("iframe");
                this.messengerFrame.className = "weavy-strip-frame";
                this.messengerFrame.allowFullscreen = 1;
                this.messengerFrame.src = this.options.messenger_url;
                this.messengerFrame.onload = function () {
                    loading.call(self, "weavy-strip-messenger", false);
                    // add window to connections
                    weavy.connection.addWindow(self.messengerFrame.contentWindow)
                }
                this.messengerStrip.appendChild(renderControls.call(this, "weavy-strip-messenger"));
                this.messengerStrip.appendChild(this.messengerFrame);

                // Messenger button container
                this.messengerButtonContainer = document.createElement("div");
                this.messengerButtonContainer.className = "weavy-bubble-item weavy-bubble-messenger";
                this.draggable.appendChild(this.messengerButtonContainer);

                // messenger button
                this.messengerButton = document.createElement("div");
                this.messengerButton.className = "weavy-button weavy-messenger weavy-button-transparent" + (this.options.conversations_count === 0 ? "" : " weavy-dot");
                this.messengerButton.setAttribute("data-count", this.options.conversations_count);
                this.messengerButton.innerHTML = '<div class="weavy-icon"><svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2M6 9h12v2H6m8 3H6v-2h8m4-4H6V6h12"></path></svg></div>';
                this.messengerButtonContainer.appendChild(this.messengerButton);

                this.conversations = document.createElement("div");
                this.conversations.className = "weavy-conversations";
                this.conversations.setAttribute("draggable", "false");
                this.messengerButton.appendChild(this.conversations);

                this.unreadConversations = this.options.conversations;
                if (this.unreadConversations) {
                    updateConversations.call(this, this.unreadConversations);
                }

                // tooltip
                this.messengerTooltip = document.createElement("div");
                this.messengerTooltip.id = "weavy-bubble-tooltip-messenger";
                this.messengerTooltip.className = "weavy-bubble-tooltip";

                var messengerTooltipText = document.createElement("span");
                messengerTooltipText.className = "weavy-bubble-tooltip-text";
                messengerTooltipText.innerHTML = this.options.messenger_title;

                this.messengerTooltip.appendChild(messengerTooltipText);
                this.messengerButtonContainer.appendChild(this.messengerTooltip);
                

                // global bubbles container
                this.globalContainer = document.createElement("div");
                this.globalContainer.id = "weavy-global-container";                
                this.draggable.appendChild(this.globalContainer);

                // personal bubbles container
                this.personalContainer = document.createElement("div");
                this.personalContainer.id = "weavy-personal-container";
                this.personalContainer.className = "weavy-personal-container";                
                this.personalContainer.innerHTML = "<hr/>";
                this.draggable.appendChild(this.personalContainer);

                // add bubble container
                this.addContainer = document.createElement("div");
                this.addContainer.id = "weavy-add-container";
                this.draggable.appendChild(this.addContainer);

                // bubbles, global and user added
                self.bubbles = _.filter(self.options.bubbles, function (data) {
                    return true;
                    //return data.type === 'personal';
                });                
                addBubbles();

                // add strip
                this.addStrip = document.createElement("div");
                this.addStrip.className = "weavy-strip weavy-loading" + (this.options.is_open ? " weavy-open" : "");
                this.addStrip.id = "weavy-strip-add";
                this.strips.appendChild(this.addStrip);

                // add frame
                this.addFrame = document.createElement("iframe");
                this.addFrame.className = "weavy-strip-frame";
                this.addFrame.allowFullscreen = 1;
                this.addFrame.src = this.options.add_url;
                this.addFrame.onload = function () {
                    loading.call(self, "weavy-strip-add", false);
                    // add window to connections
                    weavy.connection.addWindow(self.addFrame.contentWindow)
                }
                this.addStrip.appendChild(renderControls.call(this, "weavy-strip-add"));
                this.addStrip.appendChild(this.addFrame);

                // add button container
                this.addButtonContainer = document.createElement("div");
                this.addButtonContainer.className = "weavy-bubble-item weavy-bubble-add";
                this.addContainer.appendChild(this.addButtonContainer);

                // add button
                this.addButton = document.createElement("div");
                this.addButton.className = "weavy-button weavy-add weavy-button-transparent";
                this.addButton.innerHTML = '<div class="weavy-icon"><svg style="transform: rotate(45deg);" viewBox="0 0 24 24"><path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" /></svg></div>';
                this.addButtonContainer.appendChild(this.addButton);
                
                // tooltip
                this.addTooltip = document.createElement("div");
                this.addTooltip.id = "weavy-bubble-tooltip-personal";
                this.addTooltip.className = "weavy-bubble-tooltip";

                var addTooltipText = document.createElement("span");
                addTooltipText.className = "weavy-bubble-tooltip-text";
                addTooltipText.innerHTML = this.options.add_title;

                this.addTooltip.appendChild(addTooltipText);
                this.addButtonContainer.appendChild(this.addTooltip);

                // notification sound                
                this.notificationSound = document.createElement("audio");
                this.notificationSound.className = "weavy-notification-sound";
                this.notificationSound.src = this.options.url + "/media/notification.mp3";
                this.container.appendChild(this.notificationSound);


            } else {

                // personal strip
                this.personalStrip = document.createElement("div");
                this.personalStrip.className = "weavy-strip weavy-loading" + (this.options.is_open ? " weavy-open" : "");
                this.personalStrip.id = "weavy-strip-personal";
                this.strips.appendChild(this.personalStrip);

                // personal frame
                this.personalFrame = document.createElement("iframe");
                this.personalFrame.className = "weavy-strip-frame";
                this.personalFrame.allowFullscreen = 1;
                this.personalFrame.src = this.options.personal_url;
                this.personalFrame.onload = function () {
                    // start testing for blocked iframe
                    self.isBlocked = true;
                    this.contentWindow.postMessage({ "name": "ping" }, "*");
                    loading.call(self, "weavy-strip-personal", false);
                }
                this.personalStrip.appendChild(this.personalFrame);

                // personal button container
                this.personalButtonContainer = document.createElement("div");
                this.personalButtonContainer.className = "weavy-bubble-item weavy-bubble-personal";
                this.draggable.appendChild(this.personalButtonContainer);

                // personal button
                this.personalButton = document.createElement("div");
                this.personalButton.className = "weavy-button weavy-personal";
                this.personalButton.innerHTML = '<img draggable="false" class="weavy-avatar" src="' + this.options.personal_avatar + '" />';
                this.personalButtonContainer.appendChild(this.personalButton);
                
                // tooltip
                this.personalTooltip = document.createElement("div");
                this.personalTooltip.id = "weavy-bubble-tooltip-personal";
                this.personalTooltip.className = "weavy-bubble-tooltip";

                var personalTooltipText = document.createElement("span");
                personalTooltipText.className = "weavy-bubble-tooltip-text";
                personalTooltipText.innerHTML = this.options.personal_title;

                this.personalTooltip.appendChild(personalTooltipText);
                this.personalButtonContainer.appendChild(this.personalTooltip);

            }

            // set draggable position
            var position = retrieveItem("position", true);
            if (position) {
                setPosition(position);
            }

            // append strips
            this.container.appendChild(this.strips);

            // append buttons
            this.buttons = document.createElement("div");
            this.buttons.className = "weavy-buttons";
            this.buttons.appendChild(this.draggable);
            this.container.appendChild(this.buttons);

            // append notifications
            this.notifications = document.createElement("div");
            this.notifications.className = "weavy-notifications";
            this.container.appendChild(this.notifications);

            // version mismatch
            if (self.options.should_update) {
                chrome.runtime.sendMessage(null, { name: "sync" }, function (response) {
                    // show message
                    var message = document.createElement("div");
                    message.className = "weavy-alert-message";
                    message.innerHTML = "<strong>Weavy has been upgraded</strong><br/>Reload page to get the latest version.";
                    self.container.insertBefore(message, self.container.firstChild);                  
                });
            }

            // add styles
            var style = document.getElementById("weavy-styles");
            if (style) {
                if (style.styleSheet) {
                    style.styleSheet.cssText = this.options.widget_css;
                } else {
                    style.removeChild(style.firstChild);
                    style.appendChild(document.createTextNode(this.options.widget_css));
                }
            } else {
                style = document.createElement("style");
                style.type = "text/css";
                style.id = "weavy-styles";
                style.styleSheet ? style.styleSheet.cssText = this.options.widget_css : style.appendChild(document.createTextNode(this.options.widget_css));

                if (this.supportsShadowDOM) {
                    this.container.appendChild(style);
                } else {
                    document.getElementsByTagName("head")[0].appendChild(style);
                }
            }

            // append container to target element || body
            var target = this.options.el || document.getElementsByTagName("body")[0];
            if (this.supportsShadowDOM) {
                var div = document.createElement("div");
                div.className = "weavy-shadow";
                target.appendChild(div);
                target = div.attachShadow({ mode: "open" });
            }
            target.appendChild(this.container);
        }

        function addBubbles(open) {
            
            _.each(self.bubbles, function (bubble) {

                // add new bubble if not already added
                if ($(self.strips).find("#weavy-strip-bubble-" + bubble.id).length === 0) {

                    // strip
                    var strip = document.createElement("div");
                    strip.setAttribute("data-type", bubble.type);
                    strip.className = "weavy-strip weavy-loading";
                    strip.id = "weavy-strip-bubble-" + bubble.id;
                    $(self.strips).prepend(strip);

                    // frame
                    var frame = document.createElement("iframe");
                    frame.className = "weavy-strip-frame";
                    frame.allowFullscreen = 1;
                    frame.src = bubble.url;
                    frame.onload = function () {
                        loading.call(self, "weavy-strip-bubble-" + bubble.id, false);
                        // add window to connections
                        weavy.connection.addWindow(frame.contentWindow)
                    };

                    strip.appendChild(renderControls.call(self, "weavy-strip-bubble-" + bubble.id));
                    strip.appendChild(frame);

                    // button container
                    var buttonContainer = document.createElement("div");
                    buttonContainer.className = "weavy-bubble-item weavy-collapsed weavy-bubble-" + bubble.id;

                    // button
                    var button = document.createElement("div");
                    button.setAttribute('data-name', bubble.name);
                    button.setAttribute('data-type', bubble.type);
                    button.setAttribute('data-id', bubble.id);
                    button.className = "weavy-button weavy-bubble-" + bubble.id;
                    button.innerHTML = '<img draggable="false" class="weavy-avatar" src="' + self.options.url + bubble.icon + '" />';
                    buttonContainer.appendChild(button);

                    // tooltip
                    var tooltip = document.createElement("div");
                    tooltip.id = "weavy-bubble-tooltip-" + bubble.id;
                    tooltip.className = "weavy-bubble-tooltip";

                    var text = document.createElement("span");
                    text.className = "weavy-bubble-tooltip-text";
                    text.innerHTML = bubble.name;

                    tooltip.appendChild(text);

                    if (bubble.type == 'global') {
                        if (bubble.is_admin) {
                            var disconnect = document.createElement("a");
                            disconnect.className = "weavy-bubble-action weavy-bubble-connect";
                            disconnect.title = "Disconnect";
                            //link: disconnect.innerHTML = '<svg viewBox="0 0 24 24"><path d="M2,5.27L3.28,4L20,20.72L18.73,22L14.73,18H13V16.27L9.73,13H8V11.27L5.5,8.76C4.5,9.5 3.9,10.68 3.9,12C3.9,14.26 5.74,16.1 8,16.1H11V18H8A6,6 0 0,1 2,12C2,10.16 2.83,8.5 4.14,7.41L2,5.27M16,6A6,6 0 0,1 22,12C22,14.21 20.8,16.15 19,17.19L17.6,15.77C19.07,15.15 20.1,13.7 20.1,12C20.1,9.73 18.26,7.9 16,7.9H13V6H16M8,6H11V7.9H9.72L7.82,6H8M16,11V13H14.82L12.82,11H16Z" /></svg>'
                            disconnect.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12,20C7.59,20 4,16.41 4,12C4,7.59 7.59,4 12,4C16.41,4 20,7.59 20,12C20,16.41 16.41,20 12,20M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M7,13H17V11H7" /></svg>';
                            disconnect.addEventListener("click", self.removeBubble.bind(self, bubble.id, 0));
                            buttonContainer.appendChild(disconnect);
                        }                        
                    } else {
                        if (bubble.is_admin) {
                            var connect = document.createElement("a");
                            connect.className = "weavy-bubble-action weavy-bubble-connect";
                            connect.title = "Connect";
                            connect.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12,20C7.59,20 4,16.41 4,12C4,7.59 7.59,4 12,4C16.41,4 20,7.59 20,12C20,16.41 16.41,20 12,20M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M13,7H11V11H7V13H11V17H13V13H17V11H13V7Z" /></svg>';
                            //link: connect.innerHTML = '<svg viewBox="0 0 24 24"><path d="M16,6H13V7.9H16C18.26,7.9 20.1,9.73 20.1,12A4.1,4.1 0 0,1 16,16.1H13V18H16A6,6 0 0,0 22,12C22,8.68 19.31,6 16,6M3.9,12C3.9,9.73 5.74,7.9 8,7.9H11V6H8A6,6 0 0,0 2,12A6,6 0 0,0 8,18H11V16.1H8C5.74,16.1 3.9,14.26 3.9,12M8,13H16V11H8V13Z" /></svg>';
                            connect.addEventListener("click", self.connectBubble.bind(self, bubble.id));
                            buttonContainer.appendChild(connect);
                        }

                        var close = document.createElement("a");
                        close.className = "weavy-bubble-action weavy-bubble-close";
                        close.title = "Close";
                        close.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12,2C17.53,2 22,6.47 22,12C22,17.53 17.53,22 12,22C6.47,22 2,17.53 2,12C2,6.47 6.47,2 12,2M15.59,7L12,10.59L8.41,7L7,8.41L10.59,12L7,15.59L8.41,17L12,13.41L15.59,17L17,15.59L13.41,12L17,8.41L15.59,7Z" /></svg>';
                        close.addEventListener("click", self.removeBubble.bind(self, bubble.id, 1));
                        buttonContainer.appendChild(close);
                    }


                    buttonContainer.appendChild(tooltip);

                    button.addEventListener("click", self.toggle.bind(self, "bubble-" + bubble.id));
                    //button.addEventListener("mouseenter", showTooltip);

                    if (bubble.type === "personal") {
                        self.personalContainer.appendChild(buttonContainer)
                    } else {
                        self.globalContainer.appendChild(buttonContainer)
                    }

                        setTimeout(function () {
                            buttonContainer.classList.remove("weavy-collapsed");
                        }, 0);


                    // if should the bubble be opened up                
                    if (open) {
                        setTimeout(function () {
                        self.open("bubble-" + bubble.id, bubble.destination);
                        }, 100);
                    }

                } 
            });
        }
        
        function renderControls(strip) {
            var controls = document.createElement("div");
            controls.className = "weavy-controls";

            var expand = document.createElement("div");
            expand.className = "weavy-icon weavy-expand";
            expand.title = "Expand";
            expand.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="m12.199 4.8008v2h3.5898l-4.4883 4.4883-0.01172 0.01172-4.4883 4.4883v-3.5898h-2v7h7v-2h-3.5898l4.4883-4.4883 0.01172-0.01172 4.4883-4.4883v3.5898h2v-7h-7z"/></svg>';
            expand.addEventListener("click", this.resize.bind(this));
            controls.appendChild(expand);

            var collapse = document.createElement("div");
            collapse.className = "weavy-icon weavy-collapse";
            collapse.title = "Collapse";
            collapse.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="m18.5 4.0898l-4.5 4.5v-3.5898h-2v7h7v-2h-3.59l4.5-4.5-1.41-1.4102zm-6.5 7.9102h-7v2h3.5898l-4.5 4.5 1.4102 1.41 4.5-4.5v3.59h2v-7z"/></svg>';
            collapse.addEventListener("click", this.resize.bind(this));
            controls.appendChild(collapse);

            //var refresh = document.createElement("div");
            //refresh.className = "weavy-icon";
            //refresh.title = "Refresh";
            //refresh.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M17.65,6.35C16.2,4.9 14.21,4 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20C15.73,20 18.84,17.45 19.73,14H17.65C16.83,16.33 14.61,18 12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6C13.66,6 15.14,6.69 16.22,7.78L13,11H20V4L17.65,6.35Z" /></svg>';
            //refresh.addEventListener("click", this.refresh.bind(this, strip));
            //controls.appendChild(refresh);

            var close = document.createElement("div");
            close.className = "weavy-icon";
            close.title = "Close";
            close.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" /></svg>';
            close.addEventListener("click", this.close.bind(this));
            controls.appendChild(close);

            return controls;
        }

        // open in a normal window when iframes are not allowed
        function fallback(strip, destination) {
            // fallback to windows via extension
            self.close();

            var url = destination;

            if (!url) {
                if (strip.startsWith("bubble-")) {
                    // get url for bubble
                    url = $(self.strips).find("#weavy-strip-" + strip).find("iframe")[0].src;
                } else {
                    // NOTE: remove strip param to trigger standalone bahaviour
                    url = removeParameter(self.options[strip + "_url"], "strip");
                }

                // fix for referrer not being set
                if (url.endsWith("/widget/connect")) {
                    url += "?referrer=" + encodeURIComponent(window.location.origin);
                }
            }

            // use the button container to get measurments
            var measure = $(self.buttons);

            // NOTE: update if width of strip changes
            var stripWidth = 384;
            var nudge = $(self.container).hasClass("weavy-left") ? -55 : (stripWidth - 10);
            var offset = measure.offset();

            message = {
                "name": "fallback",
                "url": url,
                "key": strip,
                "left": Math.round(offset.left + window.screenLeft - nudge),
                "height": measure.height() - 20,
                "top": Math.round(offset.top + window.screenTop + 100), // NOTE: adding 100 to account for chrome address bar
                "width": stripWidth,
                "force": destination ? true : false
            };
            chrome.runtime.sendMessage(null, message, function (response) { });
        }

        function triggerEvent(name, json) {
            name = name + ".event.weavy";
            var event = $.Event(name);
            //var data = (json && typeof json === "object") ? json : JSON.parse(json);
            var isObject = json && typeof json === "object";
            var data = isObject ? json : JSON.parse(json);

            $(document).triggerHandler(event, data);
        }

        function extendDefaults(source, properties) {
            var property;
            for (property in properties) {
                if (properties.hasOwnProperty(property)) {
                    source[property] = properties[property];
                }
            }
            return source;
        }

        function initializeEvents() {

            this.container.addEventListener("drop", drop, false);
            this.container.addEventListener("dragover", dragOver, false);

            this.draggable.addEventListener("dragstart", dragStart, false);
            this.draggable.addEventListener("dragend", drop, false);
                        
            if (this.messengerButton) {
                this.messengerButton.addEventListener("click", this.toggle.bind(this, "messenger"));
            }

            if (this.personalButton) {
                this.personalButton.addEventListener("click", this.toggle.bind(this, "personal"));
            }

            if (this.addButton) {
                this.addButton.addEventListener("click", this.toggle.bind(this, "add"));
            }

        }

        // drag and drop methods
        function setPosition(position) {
            if (position.q === 1 || position.q === 2) {
                $(self.container).removeClass("weavy-bottom");
                $(self.draggable).css("top", position.o + "px").css("bottom", "");
            } else {
                $(self.container).addClass("weavy-bottom");
                $(self.draggable).css("top", "").css("bottom", position.o + "px");
            }
            if (position.q === 1 || position.q === 3) {
                $(self.container).addClass("weavy-left");
            } else {
                $(self.container).removeClass("weavy-left");
            }
            if (position.m) {
                $(self.container).addClass("weavy-middle");
            } else {
                $(self.container).removeClass("weavy-middle");
            }
        }

        function setDragPosition(x, y, forceEdge) {
            // set snapping with options.snappingX or CSS --weavy-snapping-x
            var draggableStyles = getComputedStyle(self.draggable);
            var weavyRem = parseFloat(draggableStyles.getPropertyValue("--weavy-rem")) || 16;
            var snappingX = weavyRem * (parseFloat(draggableStyles.getPropertyValue("--weavy-snapping-x")) || self.options.snappingX);
            var snappingY = weavyRem * (parseFloat(draggableStyles.getPropertyValue("--weavy-snapping-y")) || self.options.snappingY);

            var $win = $(window);
            var w = $win.width();
            var h = $(self.buttons).outerHeight();
            var dt = self.draggable.offsetTop;
            var dh = $(self.draggable).outerHeight();
            var dw = $(self.draggable).outerWidth(true)
            var mt = parseInt($(self.draggable).css("margin-top")) || 0;
            var mb = parseInt($(self.draggable).css("margin-bottom")) || 0;

            var adjustedX = x;
            var adjustedY = y;

            var isLeft = $(self.container).hasClass("weavy-left");
            var left = isLeft ? 0 : -w + dw;
            var right = isLeft ? w - dw : 0;
            var middle = h / 2  - dt - dh / 2;

            if (forceEdge) {
                snappingX = w / 2;
            }

            adjustedX = adjustedX < left + snappingX ? left : adjustedX; // Snap to left
            adjustedX = adjustedX >= right - snappingX ? right : adjustedX; // Snap to right

            adjustedY = Math.max(-1 * dt + mt, Math.min(h - dt - dh - mb, adjustedY)); // Screen restricted
            adjustedY = adjustedY > middle - snappingY && adjustedY < middle + snappingY ? middle : adjustedY; // Snap to middle

            if (adjustedX !== x || adjustedY !== y) {
                $(self.draggable).addClass("weavy-snap");
            } else {
                if (!self.clearDragSnap && $(self.draggable).hasClass("weavy-snap")) {
                    self.clearDragSnap = setTimeout(function () { $(self.draggable).removeClass("weavy-snap"); self.clearDragSnap = null; }, 150);
                }
            }
            $(self.draggable).css("transform", "translate(" + adjustedX + "px, " + adjustedY + "px)");
        }

        function getDragPos(ev) { 
            // set snapping with options.snappingX or CSS --weavy-snapping-x
            var $draggable = $(self.draggable);
            var weavyRem = parseInt($draggable.css("--weavy-rem")) || 16;
            var snappingX = weavyRem * (parseFloat($draggable.css("--weavy-snapping-x")) || self.options.snappingX);
            var snappingY = weavyRem * (parseFloat($draggable.css("--weavy-snapping-y")) || self.options.snappingY);

            var $win = $(window);
            var w = $win.width();
            var h = $win.height()
            var top = ev.clientY - self.dragData.cy < (h / 2);
            var left = ev.clientX - self.dragData.cx < (w / 2);
            var middle = ev.clientY - self.dragData.cy < (h / 2 + snappingY) && ev.clientY - self.dragData.cy > (h / 2 - snappingY);

            // in which quadrant did the drop occur
            // 1 | 2
            // —————
            // 3 | 4
            var q = 2;
            if (top) {
                q = left ? 1 : 2;
            } else {
                q = left ? 3 : 4;
            }

            // calculate offset from top/bottom
            var offsetY = 0;
            if (q === 1 || q === 2) {
                offsetY = ev.clientY - self.dragData.y - parseInt($draggable.css("margin-top"));
            } else {
                offsetY = h - (ev.clientY - self.dragData.y + self.dragData.h + parseInt($draggable.css("margin-bottom")));
            }
            offsetY = Math.max(0, offsetY);

            // set new position
            var pos = { q: q, o: offsetY, m: middle };

            return pos;
        }

        function dragStart(ev) {
            ev.stopPropagation();
            ev.dataTransfer.effectAllowed = "move";
            ev.dataTransfer.setData("text/plain", ""); // needed to initiate drag
            ev.dataTransfer.dropEffect = "move";

            // store drag offset (where in the draggable did we click) and height of draggable
            var rect = self.draggable.getBoundingClientRect();
            self.dragData = { 
                x: ev.clientX - rect.left,
                cx: ev.clientX - rect.left - rect.width / 2,
                y: ev.clientY - rect.top, 
                cy: ev.clientY - rect.top - rect.height / 2,
                h: rect.height, 
                w: rect.width, 
                startX: ev.clientX, 
                startY: ev.clientY 
            };

            // add class inidicating that we are dragging the buttons
            $(self.container).addClass("weavy-drag");

            // Chrome/Mac needs a reasonably big drag-image to not set an extra dragging icon
            // We set it to the self.dragImage which has opacity 0
            if (ev.dataTransfer.setDragImage) {
                ev.dataTransfer.setDragImage(self.dragImage, 0, 0);
            } else {
                // IE/Edge
                $(self.draggable).css("opacity", 0).css("transition", "none");
            }

            var pos = getDragPos(ev);
            setPosition(pos);
        }

        function dragOver(ev) {
            // we need to cancel the event here for the drop event to fire
            ev.preventDefault();
            
            // IE/Edge
            $(self.draggable).css("opacity", "");
            
            ev.dataTransfer.dropEffect = "move";
            setDragPosition(ev.clientX - self.dragData.startX, ev.clientY - self.dragData.startY);
        }

        function drop(ev) {
            ev.preventDefault();
            if ($(self.container).hasClass("weavy-drag")) {
                var pos = getDragPos(ev);
                
                setDragPosition(ev.clientX - self.dragData.startX, ev.clientY - self.dragData.startY, true);

                var finishDrag = function () {
                    setPosition(pos);
                    // remove class indicating that we are dragging the buttons
                    $(self.container).removeClass("weavy-drag");
                    $(self.draggable).removeClass("weavy-snap").css("transform", "").css("transition", "");
                };

                if ($(self.draggable).hasClass("weavy-snap")) {
                    // Wait for transition
                    setTimeout(finishDrag, 150);
                } else {
                    finishDrag();
                }

                // save position in local storage
                storeItem("position", pos, true);
            }
 
        }


        function trimUrl(url) {
            return url.replace(/\/$/, "");
        }

        function removeParameter(url, parameter) {
            var urlparts = url.split("?");
            if (urlparts.length >= 2) {

                var prefix = encodeURIComponent(parameter) + "=";
                var pars = urlparts[1].split(/[&;]/g);

                for (var i = pars.length; i-- > 0;) {
                    if (pars[i].lastIndexOf(prefix, 0) !== -1) {
                        pars.splice(i, 1);
                    }
                }
                url = urlparts[0] + (pars.length > 0 ? "?" + pars.join("&") : "");
                return url;
            } else {
                return url;
            }
        }

        function connect() {
            return weavy.connection.init(self.options.url, null, true);
        }

        function updateConversations(conversations) {
            $(".weavy-conversations", this.container).empty();

            for (var i = 0; i < conversations.length; i++) {
                var conversation = document.createElement("a");
                conversation.className = "weavy-conversation";
                conversation.href = "javascript:;";
                conversation.setAttribute("draggable", "false");
                conversation.title = conversations[i].title;
                conversation.setAttribute("data-id", conversations[i].id);
                conversation.addEventListener("click", this.openConversation.bind(this, conversations[i].id));

                var avatar = document.createElement("img");
                avatar.className = "weavy-avatar";
                avatar.setAttribute("draggable", "false");

                avatar.src = trimUrl(self.options.url) + conversations[i].thumb_url.replace("{options}", "96x96-crop");
                conversation.appendChild(avatar);
                this.conversations.appendChild(conversation);

                if (i === 2 && conversations.length > 3) {
                    var more = document.createElement("a");
                    more.className = "weavy-icon";
                    more.href = "javascript:;";
                    more.title = "More...";
                    more.addEventListener("click", this.openConversation.bind(this, null));
                    more.innerHTML = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M16,12A2,2 0 0,1 18,10A2,2 0 0,1 20,12A2,2 0 0,1 18,14A2,2 0 0,1 16,12M10,12A2,2 0 0,1 12,10A2,2 0 0,1 14,12A2,2 0 0,1 12,14A2,2 0 0,1 10,12M4,12A2,2 0 0,1 6,10A2,2 0 0,1 8,12A2,2 0 0,1 6,14A2,2 0 0,1 4,12Z"/></svg>';
                    this.conversations.appendChild(more);
                    break;
                }
            }
        }

        function conversationRead(id) {
            this.unreadConversations = _.without(this.unreadConversations, _.findWhere(this.unreadConversations, { id: id }));
            updateConversations.call(this, this.unreadConversations);
        }

        function appendConversation(conversation) {
            // remove if already in list - will be added again
            this.unreadConversations = _.without(this.unreadConversations, _.findWhere(this.unreadConversations, { id: conversation.id }));
            this.unreadConversations.unshift(conversation);
            updateConversations.call(this, this.unreadConversations);
        }

        function showNotification(notification) {
                        
            $(".weavy-notification-sound", self.container)[0].play();;

            if (!$(".weavy-strip.weavy-open", self.container).length) {
                var notificationFrame = document.createElement("iframe");
                notificationFrame = document.createElement("iframe");
                notificationFrame.className = "weavy-notification-frame";
                notificationFrame.id = "weavy-notification-frame-" + notification.id;

                if ($(this.notifications).children().length > 0) {
                    notificationFrame.setAttribute("style", "display:none");
                    notificationFrame.setAttribute("data-src", trimUrl(self.options.url) + "/notifications/" + notification.id + "/preview");
                } else {
                    notificationFrame.src = trimUrl(self.options.url) + "/notifications/" + notification.id + "/preview";
                }

                this.notifications.appendChild(notificationFrame);
            }
        }

        function closeNotification(id) {

            var $notification = $("#weavy-notification-frame-" + id, self.container);

            if ($notification.length) {
                $notification.fadeOut("normal", function () {
                    var $next = $notification.next();
                    $(this).remove();

                    if ($next.length) {
                        $next.attr("src", $next.data("src"));
                        $next.onload = function () {
                            $notification.fadeIn("normal");
                        };
                    }
                });
            }
        }

        function loading(strip, isloading) {

            var $strip = $("#" + strip, this.container);

            if (isloading) {
                $strip.addClass("weavy-loading");
            } else {
                $strip.removeClass("weavy-loading");
            }
        }

        function badgeChanged(badge) {
            var prev = $(self.personalButton).attr("data-count");
            $(self.personalButton).attr("data-count", badge.notifications);
            if (badge.notifications === 0) {
                // no notifications, remove dot and animation class
                $(self.personalButton).removeClass("weavy-dot");
            } else if (badge.notifications > prev) {
                // new notifications, animate dot
                $(self.personalButton).removeClass("weavy-pulse");
                setTimeout(function () {
                    // we need a small delay here for the browser to notice that the weavy-pulse class was toggled
                    $(self.personalButton).addClass("weavy-dot weavy-pulse");
                }, 100);
            }

            prev = $(self.messengerButton).attr("data-count");
            $(self.messengerButton).attr("data-count", badge.conversations);
            if (badge.conversations === 0) {
                // no conversations, remove dot and animation class
                $(self.messengerButton).removeClass("weavy-dot");
            } else if (badge.conversations > prev) {
                // new conversations, animate dot
                $(self.messengerButton).removeClass("weavy-pulse");
                setTimeout(function () {
                    // we need a small delay here for the browser to notice that the weavy-pulse class was toggled
                    $(self.messengerButton).addClass("weavy-dot weavy-pulse");
                }, 100);
            }

        }

        function onMessageReceived(e) {
            switch (e.data.name) {
                case "pong":
                    self.isBlocked = false;
                    break;
                case "invoke":
                    if (weavy.connection.connection.state === $.signalR.connectionState.connected) {                        
                        var proxy = weavy.connection.proxies[e.data.hub];                        
                        proxy.invoke.apply(proxy, e.data.args).fail(function (error) {
                            console.error(error)
                        });
                    }
                    break;
                case "ready":
                    // page loaded
                    loading.call(self, e.data.which, false);
                    break;
                case "reload":
                    // reload and re-init all widgets
                    self.init();
                    break;
                case "signingOut":
                    // disconnect from signalr
                    self.options.user_id = null;
                    weavy.connection.disconnect();
                    self.close();
                    break;
                case "signedIn":
                case "signedOut":
                    // force gui refresh
                    self.options.is_loaded = false;
                    self.options.user_id = null;
                    self.init();
                    break;
                case "close":
                    self.close();
                    break;
                case "maximize":
                    self.resize();
                    break;
                case "close-preview":
                    if (previewingFullscreen && $(self.container).hasClass("weavy-preview")) {
                        previewingFullscreen = false;
                        self.togglePreview();
                    }
                    break;
                case "open-preview":
                    if (!$(self.container).hasClass("weavy-preview")) {
                        previewingFullscreen = true;
                        self.togglePreview();
                    }
                    break;                
                case "personal":
                    self.personalFrame.src = self.options.url + e.data.url;
                    loading.call(self, "personal", true);
                    self.open("personal");
                    break;
                case "messenger":
                    self.messengerFrame.src = self.options.url + e.data.url;
                    loading.call(self, "messenger", true);
                    self.open("messenger");
                    break;
                case "notificationLoaded":
                case "notificationLayoutChanged":
                    var notification = $("#weavy-notification-frame-" + e.data.id, self.container);

                    notification.show();
                    notification.css("height", e.data.height + "px");
                    // show set height
                    break;
                case "notificationClosed":
                    closeNotification.call(self, e.data.id);
                    break;
            }
        }

        function storeItem(key, value, isJson) {
            localStorage.setItem('weavy_' + window.location.hostname + "_" + key, isJson ? JSON.stringify(value) : value);
        }

        function retrieveItem(key, isJson) {
            var value = localStorage.getItem('weavy_' + window.location.hostname + "_" + key);
            if (value && isJson) {
                return JSON.parse(value)
            }

            return value;
        }
                        
        // listen for dispatched messages from weavy (close/resize etc.)
        window.addEventListener("message", onMessageReceived, false);

        // signalR connection state has changed
        weavy.connection.on("statechanged", function (e, data) {

            if (disconnected && data.state.newState === 1 && self.options.user_id) {
                disconnected = false;

                // reload widget                
                weavy.connection.reload();
            }
        });

        // signalR connection disconnected
        weavy.connection.on("disconnected", function (e, data) {
            disconnected = true;
        });

        // real-time events
        weavy.realtime.on("bubbleadded", function (e, data) {            
            
            if (data.origin && data.origin !== self.options.origin) {
                return;
            }
            var shouldOpen = document.hasFocus();

            if (!_.find(self.bubbles, function (b) { return b.id == data.id })) {
                self.bubbles.push(data);
                
                // update ui
                addBubbles(shouldOpen);
            } else {

                // already exist, then just open the bubble
                if (shouldOpen) {
                    self.open("bubble-" + data.id, data.destination);
                }                
            }

        });

        weavy.realtime.on("bubbleremoved", function (e, data) {
            
            if (data.origin !== self.options.origin && data.type !== "personal") {
                return;
            }
            
            // remove from array of added bubbles
            self.bubbles = _.filter(self.bubbles, function (bubble) {                
                if (data.id === bubble.id && bubble.type === data.type) {
                    return false;
                }
                return true;
            });
            
            var $strip = $("#weavy-strip-bubble-" + data.id + "[data-type='" + data.type + "']", self.container);
            if ($strip.length) {
                var $frame = $(".weavy-strip-frame", $strip);
                var $button = $(".weavy-bubble-item.weavy-bubble-" + data.id, self.container);

                // remove from signalR connections
                weavy.connection.removeWindow($frame[0].contentWindow)

                $button.addClass("weavy-disabled");
                $strip[0].id = "";
                
                if ($strip.hasClass("weavy-open")) {
                    $strip.removeClass("weavy-open");
                    $button.find(".weavy-button").removeClass("weavy-open");

                    setTimeout(function () {
                        $button.addClass("weavy-collapsed");
                    }, 250);
                    setTimeout(function () {
                        // remove dom elements
                        $strip.remove();
                        $button.remove();
                    }, 450);
                } else {
                    $button.addClass("weavy-collapsed");
                    setTimeout(function () {
                        // remove dom elements
                        $strip.remove();
                        $button.remove();
                    }, 200);
                }
            }            
        })

        weavy.realtime.on("trashedspace", function (e, data) {
            
            // remove from array of added bubbles
            self.bubbles = _.filter(self.bubbles, function (bubble) {
                if (data.id === bubble.id ) {
                    return false;
                }
                return true;
            });

            var $strip = $("#weavy-strip-bubble-" + data.id, self.container);
            if ($strip.length) {
                var $frame = $(".weavy-strip-frame", $strip);
                var $button = $(".weavy-bubble-item.weavy-bubble-" + data.id, self.container);

                // remove from signalR connections
                weavy.connection.removeWindow($frame[0].contentWindow)

                $button.addClass("weavy-disabled");
                $strip[0].id = "";
                
                if ($strip.hasClass("weavy-open")) {
                    $strip.removeClass("weavy-open");
                    $button.find(".weavy-button").removeClass("weavy-open");

                    setTimeout(function () {
                        $button.addClass("weavy-collapsed");
                    }, 250);
                    setTimeout(function () {
                        // remove dom elements
                        $strip.remove();
                        $button.remove();
                    }, 450);
                } else {
                    $button.addClass("weavy-collapsed");
                    setTimeout(function () {
                        // remove dom elements
                        $strip.remove();
                        $button.remove();
                    }, 200);
                }

            }
        })

        weavy.realtime.on("conversationread", function (e, data) {
            if (data.user.id === self.options.user_id) {
                conversationRead.call(self, data.conversation.id);
                triggerEvent("conversationread", data);
            }
        });

        weavy.realtime.on("message", function (e, data) {
            var message = data;
            if (message.attached_to.type === "conversation" && (message.created_by.id !== self.options.user_id && message.created_by.id > 0)) {
                weavy.realtime.invoke("widget", "getConversation", message.attached_to.id);
                triggerEvent("message", data);
            }
        });

        weavy.realtime.on("badge", function (e, data) {
            badgeChanged.call(self, data);
            triggerEvent("badge", data);
        });

        weavy.realtime.on("notification", function (e, data) {
            showNotification.call(self, data);
        });

        weavy.realtime.on("notificationupdated", function (e, data) {
            triggerEvent("notificationupdated", data);
        });

        weavy.realtime.on("notificationreadall", function (e, data) {
            triggerEvent("notificationreadall", data);
        });

        weavy.realtime.on("loaded", function (e, data) {

            self.options = extendDefaults(self.options, data);

            if (self.options.is_loaded === false) {
                buildOutput.call(self);
                initializeEvents.call(self);
                self.options.is_loaded = true;
            } 

            if (!data.user_id) {
                // NOTE: stop/disconnect directly if we are not authenticated 
                // signalr does not allow the user identity to change in an active connection
                weavy.connection.disconnect();
            }
        }, "rtmwidget");

        weavy.realtime.on("conversationReceived", function (e, data) {
            appendConversation.call(self, data);
        }, "rtmwidget");

        // init component
        if (this.options.init === true) {
            this.init();
        }
    }

})($);
