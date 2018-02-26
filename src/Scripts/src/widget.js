(function ($) {
    console.debug("widget.js");

    this.Weavy = function () {
        this.supportsShadowDOM = !!HTMLElement.prototype.attachShadow;

        var self = this;
        var previewingFullscreen = false;

        // dom elements
        this.container = null;
        this.strips = null;
        this.buttons = null;
        this.draggable = null;
        this.notifications = null;

        this.personalStrip = null;
        this.personalFrame = null;
        this.personalButton = null;

        this.contextStrip = null;
        this.contextFrame = null;
        this.contextButton = null

        this.messengerStrip = null;
        this.messengerFrame = null;
        this.messengerButton = null;

        this.unreadConversations = [];

        this.dragData = null;

        this.blocked = false;

        var defaults = {
            init: true,
            button: true,
            close_button: true,
            resize_button: true,
            el: null,
            is_loaded: false,
            className: ''
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
                weavy.realtime.invoke("widget", "load", self.options);
            });
        }

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

        // open specified strip (personal, messenger or context)
        Weavy.prototype.open = function (strip) {
            $(this.container).addClass("weavy-open");

            var $strip = $("#weavy-strip-" + strip, this.strips);
            if (!$strip.hasClass("weavy-open")) {
                $(".weavy-strip", this.strips).removeClass("weavy-open");
                $(".weavy-button", this.buttons).removeClass("weavy-open");
                $(".weavy-button.weavy-" + strip, this.buttons).addClass("weavy-open");
                $("#weavy-strip-" + strip, this.strips).addClass("weavy-open");
                $(".weavy-notification-frame", this.notifications).remove();
                triggerEvent("open", { target: strip });
            }
        }

        // toggle (open/close) specified strip (personal, messenger or context)
        Weavy.prototype.toggle = function (strip) {
            if (this.blocked) {

                // fallback to windows via extension
                this.close();

                // NOTE: remove strip to trigger standalone bahaviour
                var url = removeParameter(this.options[strip + "_url"], "strip");

                // fix for referrer not being set
                if (url.endsWith("/widget/connect")) {
                    url += "?referrer=" + encodeURIComponent(window.location.origin);
                }

                // use the button container to get measurments
                var measure = $(this.buttons);

                // NOTE: update stipWidth if width of strip window changes
                var stripWidth = 375;
                var nudge = $(this.container).hasClass("weavy-left") ? -55 : (stripWidth - 10);
                var offset = measure.offset();
                
                message = {
                    "name": "fallback",
                    "url": url,
                    "key": strip,
                    "left": Math.round(offset.left + window.screenLeft - nudge),
                    "height": measure.height() - 20,
                    "top": Math.round(offset.top + window.screenTop + 100), // NOTE: adding 100 to account for chrome address bar
                    "width": stripWidth
                }          
                chrome.runtime.sendMessage(message, function (response) {});
                return;
            }
            $(".weavy-button.weavy-" + strip, this.container).hasClass("weavy-open") ? this.close() : this.open(strip);
        }

        Weavy.prototype.resize = function () {
            $(this.container).toggleClass("weavy-wide");
            triggerEvent("resize", null);
        }

        Weavy.prototype.on = function (event, cb) {
            $(document).on(event + ".event.weavy", null, null, cb);
        }

        Weavy.prototype.reload = function (options) {
            this.options = extendDefaults(this.options, options);
            this.init();

            triggerEvent("reload", this.options);
        }

        Weavy.prototype.refresh = function (strip) {
            loading.call(this, strip, true);
            var frame = this[strip + "Frame"];
            frame.contentWindow.postMessage({ "name": "reload" }, "*");                                
            triggerEvent("refresh", { 'strip': strip });
        }

        Weavy.prototype.options = this.options;

        function buildOutput() {
            // add container
            if (this.container) {
                this.container.remove();
            }
            this.container = document.createElement("div");
            this.container.className = "weavy-widget " + this.options.className + ' ' + (this.options.el ? 'weavy-custom' : 'weavy-default');
            this.container.id = "weavy-widget";
            this.container.setAttribute("data-version", this.options.weavy_version);

            // strips
            this.strips = document.createElement("div");
            this.strips.className = "weavy-strips";

            // draggable
            this.draggable = document.createElement("div");
            this.draggable.className = "weavy-draggable" + (this.options.is_open ? " weavy-open" : "");
            this.draggable.setAttribute("draggable", "true");

            if (this.options.user_id) {

                // personal strip
                this.personalStrip = document.createElement("div");
                this.personalStrip.className = "weavy-strip weavy-loading" + (this.options.is_open ? " weavy-open" : "");
                this.personalStrip.id = "weavy-strip-personal";
                this.personalStrip.appendChild(renderControls.call(this, "personal"));
                this.strips.appendChild(this.personalStrip);

                // personal frame
                this.personalFrame = document.createElement("iframe");
                this.personalFrame.className = "weavy-strip-frame";
                this.personalFrame.allowFullscreen = 1;
                this.personalFrame.src = this.options.personal_url;
                this.personalFrame.onload = function (a, b, c) {
                    // start testing for blocked iframe
                    self.blocked = true;
                    this.contentWindow.postMessage({ "name": "ping" }, "*");                    
                    loading.call(self, "personal", false);
                    self.personalFrame.contentWindow.postMessage({ "name": "frame", "frameName": "personal" }, "*");

                    // add window to connections
                    weavy.connection.addWindow(self.personalFrame.contentWindow)
                }

                this.personalStrip.appendChild(this.personalFrame);

                // personal button
                this.personalButton = document.createElement("div");
                this.personalButton.className = "weavy-button weavy-personal" + (this.options.notifications_count === 0 ? "" : " weavy-dot");
                this.personalButton.title = this.options.personal_title;
                this.personalButton.setAttribute("data-count", this.options.notifications_count);
                this.personalButton.innerHTML = '<img draggable="false" class="weavy-avatar" src="' + this.options.personal_avatar + '" />';
                this.draggable.appendChild(this.personalButton);

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
                    loading.call(self, "messenger", false);
                    // add window to connections
                    weavy.connection.addWindow(self.messengerFrame.contentWindow)
                }
                this.messengerStrip.appendChild(renderControls.call(this, "messenger"));
                this.messengerStrip.appendChild(this.messengerFrame);

                // messenger button
                this.messengerButton = document.createElement("div");
                this.messengerButton.title = this.options.messenger_title;
                this.messengerButton.className = "weavy-button weavy-messenger" + (this.options.conversations_count === 0 ? "" : " weavy-dot");
                this.messengerButton.setAttribute("data-count", this.options.conversations_count);
                this.messengerButton.innerHTML = '<div class="weavy-icon"><svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2M6 9h12v2H6m8 3H6v-2h8m4-4H6V6h12"></path></svg></div>';
                this.draggable.appendChild(this.messengerButton);

                this.conversations = document.createElement("div");
                this.conversations.className = "weavy-conversations";
                this.conversations.setAttribute("draggable", "false");
                this.messengerButton.appendChild(this.conversations);

                this.unreadConversations = this.options.conversations;
                if (this.unreadConversations) {
                    updateConversations.call(this, this.unreadConversations);
                }

                // context strip
                this.contextStrip = document.createElement("div");
                this.contextStrip.className = "weavy-strip weavy-loading" + (this.options.is_open ? " weavy-open" : "");
                this.contextStrip.id = "weavy-strip-context";
                this.strips.appendChild(this.contextStrip);

                // context frame
                this.contextFrame = document.createElement("iframe");
                this.contextFrame.className = "weavy-strip-frame";
                this.contextFrame.allowFullscreen = 1;
                this.contextFrame.src = this.options.context_url;
                this.contextFrame.onload = function () {
                    loading.call(self, "context", false);
                    self.contextFrame.contentWindow.postMessage({ "name": "frame", "frameName": "context" }, "*");
                    // add window to connections
                    weavy.connection.addWindow(self.contextFrame.contentWindow)
                }
                this.contextStrip.appendChild(renderControls.call(this, "context"));
                this.contextStrip.appendChild(this.contextFrame);

                // context button
                this.contextButton = document.createElement("div");
                this.contextButton.className = "weavy-button weavy-context";

                this.contextButton.title = this.options.context_title;
                if (this.options.always_available && this.options.adding) {
                    // creating new spaces is allowed and we are in an adding process
                    this.contextButton.innerHTML = '<div class="weavy-icon"><svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"></path></svg></div>';
                } else {
                    if (this.options.context_avatar) {
                        this.contextButton.innerHTML = '<img draggable="false" class="weavy-avatar" src="' + this.options.context_avatar + '" />';
                    } else {
                        this.contextButton.innerHTML = '<div class="weavy-icon"><svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M20,18H4V8H20M20,6H12L10,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V8C22,6.89 21.1,6 20,6Z" /></svg></div>';
                    }
                }
                this.draggable.appendChild(this.contextButton);

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
                this.personalFrame.onload = function () { loading.call(self, "personal", false); }
                this.personalStrip.appendChild(this.personalFrame);

                // personal button
                this.personalButton = document.createElement("div");
                this.personalButton.className = "weavy-button weavy-personal";
                this.personalButton.title = this.options.personal_title;
                this.personalButton.innerHTML = '<div class="weavy-icon" style="color:' + this.options.theme_color + '"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="m5.2832 3.5a2.111 2.111 0 0 0 -1.0059 0.2871l-0.0039 0.002a2.128 2.128 0 0 0 -0.7734 2.9101l5.5234 9.5718 2.4626-4.261-4.2985-7.4436a2.133 2.133 0 0 0 -1.8477 -1.0664 2.111 2.111 0 0 0 -0.0566 0zm13.377 0.0645a2.129 2.129 0 0 0 -1.848 1.0703l-1.259 2.1836 2.459 4.2596 2.49-4.3124a2.132 2.132 0 0 0 -1.842 -3.2011zm-6.746 1.0878a2.13 2.13 0 0 0 -1.742 3.2129l4.377 7.5798a2.058 2.058 0 0 0 0.568 0.643 1.919 1.919 0 0 0 0.401 0.234 2.155 2.155 0 0 0 0.878 0.192 2.132 2.132 0 0 0 1.844 -3.202l-4.381-7.5776a2.13 2.13 0 0 0 -1.945 -1.0821zm0.109 8.2757v0.008l-2.523 4.365a2.008 2.008 0 0 0 -0.1797 0.398 2.067 2.067 0 0 0 -0.0996 0.746 2.131 2.131 0 0 0 3.9103 1.086c0.014-0.032 1.521-2.636 1.521-2.636-0.023-0.016-0.043-0.032-0.064-0.049a3.06 3.06 0 0 1 -0.842 -0.938l-1.723-2.98z"/></svg></div>';
                this.draggable.appendChild(this.personalButton);
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

            var refresh = document.createElement("div");
            refresh.className = "weavy-icon";
            refresh.title = "Refresh";
            refresh.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M17.65,6.35C16.2,4.9 14.21,4 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20C15.73,20 18.84,17.45 19.73,14H17.65C16.83,16.33 14.61,18 12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6C13.66,6 15.14,6.69 16.22,7.78L13,11H20V4L17.65,6.35Z" /></svg>';
            refresh.addEventListener("click", this.refresh.bind(this, strip));
            controls.appendChild(refresh);

            var close = document.createElement("div");
            close.className = "weavy-icon";
            close.title = "Close";
            close.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" /></svg>';
            close.addEventListener("click", this.close.bind(this));
            controls.appendChild(close);

            return controls;
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
            this.draggable.addEventListener("dragend", dragEnd, false);

            if (this.contextButton) {
                this.contextButton.addEventListener("click", this.toggle.bind(this, "context"));
            }

            if (this.messengerButton) {
                this.messengerButton.addEventListener("click", this.toggle.bind(this, "messenger"));
            }

            if (this.personalButton) {
                this.personalButton.addEventListener("click", this.toggle.bind(this, "personal"));
            }

        }

        // drag and drop methods
        function dragStart(ev) {
            ev.stopPropagation();
            ev.dataTransfer.effectAllowed = "move";
            ev.dataTransfer.setData("text/plain", ""); // needed to initiate drag

            // store drag offset (where in the draggable did we click) and height of draggable
            var rect = self.draggable.getBoundingClientRect();
            self.dragData = { x: ev.clientX - rect.left, y: ev.clientY - rect.top, h: rect.height };

            // add class inidicating that we are dragging the buttons
            $(self.container).addClass("weavy-drag");

            // HACK: set empty drag image if window is scrolled, otherwise the ghost image will be clipped in chrome :(
            // TODO: figure out a way to prevent clipping instead...
            if (ev.dataTransfer.setDragImage && $(window).scrollTop() > 0) {
                var img = document.createElement("img");
                ev.dataTransfer.setDragImage(img, 0, 0);
            }
        }

        function dragOver(ev) {
            // we need to cancel the event here for the drop event to fire
            ev.preventDefault();
            ev.dataTransfer.dropEffect = "move";
        }

        function drop(ev) {
            ev.preventDefault();

            var $win = $(window);
            var w = $win.width();
            var h = $win.height()
            var top = (ev.clientY < (h / 2));
            var left = ev.clientX < (w / 2);

            // in which quadrant did the drop occur
            // 1 | 2
            // —————
            // 3 | 4
            var q = 2;
            if (top) {
                if (left) {
                    q = 1;
                } else {
                    q = 2;
                }
            } else {
                if (left) {
                    q = 3;
                } else {
                    q = 4;
                }
            }

            // calculate offset from top/bottom
            var offset = 0;
            if (q === 1 || q === 2) {
                offset = ev.clientY - self.dragData.y;
            } else {
                offset = h - (ev.clientY - self.dragData.y + self.dragData.h);
            }
            offset = Math.max(0, offset);

            // set new position
            var pos = { q: q, o: offset };
            setPosition(pos);

            // save position in local storage
            storeItem("position", pos, true);

            // remove class indicating that we are dragging the buttons
            $(self.container).removeClass("weavy-drag");
        }

        function dragEnd(ev) {
            // remove class indicating that we are dragging the buttons
            $(self.container).removeClass("weavy-drag");
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
            var $strip = $("#weavy-strip-" + strip, this.container);

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
                    self.blocked = false;
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
                case "refresh":
                    // page and extension refresh
                    chrome.runtime.sendMessage({ name: "sync" }, function (response) {
                        window.location.reload();
                    });

                    break;
                case "reload":
                    // reload and re-init all widgets
                    self.init();
                    break;
                case "signingOut":
                    // disconnect from signalr
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
                case "minimize-preview":
                case "maximize":
                    self.resize();
                    break;
                case "close-preview":
                    if (previewingFullscreen && $(self.container).hasClass("weavy-wide")) {
                        previewingFullscreen = false;
                        self.resize();
                    }
                    break;
                case "maximize-preview":
                    if (!$(self.container).hasClass("weavy-wide")) {
                        previewingFullscreen = true;
                        self.resize();
                    }
                    break;
                case "content":
                    self.contextFrame.src = self.options.url + e.data.url;
                    loading.call(self, "context", true);
                    self.open("context");

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

        // real-time events
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
            } else {
                self.contextFrame.src = self.options.context_url;
            }

            if (!data.user_id) {
                // NOTE: stop/disconnect directly if we are not authenticated 
                // signalr does not allow the user identity to change in an active connection
                weavy.connection.disconnect();
            }
        }, "rtmwidget");


        weavy.realtime.on("conversationReceived", function (data) {
            appendConversation.call(self, data);
        }, "rtmwidget");

        // init component
        if (this.options.init === true) {
            this.init();
        }
    }

})($);
