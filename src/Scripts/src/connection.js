var weavy = weavy || {};
weavy.connection = (function ($, w) {
    // create a new hub connection
    var connection = $.hubConnection("/signalr", { useDefaultPath: false });        
    var reconnecting = false;
    var hubProxies = { rtm: connection.createHubProxy('rtm'), widget: connection.createHubProxy('widget') };        
    var wins = []; // all windows when in embedded mode
    var _disconnectTimeout, _reconnectTimeout = null;

    //----------------------------------------------------------
    // Init the connection
    // url: the url to the /signalr 
    // windows: initial [] of windows to post incoming events to when embedded
    // force: if to connect event if the user is not logged in
    //----------------------------------------------------------
    var init = function (url, windows, force) {               
        if (url) {
            connection.url = url + "/signalr";
        }

        // init windows collection
        wins = windows || [w];
        
        if ((weavy.context && weavy.context.user > 0) || force) {            
            // connect to the server                
            return connect();
        } else {            
            // disconnect
            return disconnect();
        }        
    }

    // start the connection
    function connect(url) {        
        if (connection.state === $.signalR.connectionState.disconnected) {
            return connection.start();
        }
    }

    // stop connection
    function disconnect() {
        if (connection.state !== $.signalR.connectionState.disconnected) {
            return connection.stop();
        }
    }

    function status() {
        return connection.state;
    }
    
    // configure logging and connection lifetime events
    connection.logging = false;

    connection.stateChanged(function (state) {
        if (state.newState === $.signalR.connectionState.connected) {
            console.debug("connected: " + connection.id + " (" + connection.transport.name + ")");

            // clear timeouts
            window.clearTimeout(_disconnectTimeout);            
            window.clearTimeout(_reconnectTimeout);            

            if (weavy.alert) {
                weavy.alert.close("connection-state");
            } else {
                triggerPostMessage("alert", "close", "connection-state");
            }
        }
    });

    connection.reconnecting(function () {
        reconnecting = true;
        console.info("reconnecting...");

        // wait 2 seconds before showing message
        if (_reconnectTimeout != null) {
            window.clearTimeout(_reconnectTimeout);            
        }

        _reconnectTimeout = setTimeout(function () {
            if (weavy.alert) {
                weavy.alert.alert("warning", "Reconnecting...", null, "connection-state");
            } else {
                triggerPostMessage("alert", "show", { type: "warning", title: "Reconnecting...", id: "connection-state" });
            }
        }, 2000);
        
    });

    connection.reconnected(function () {
        reconnecting = false;
    });

    connection.disconnected(function () {
        
        if (reconnecting) {
            // connection dropped, try to connect again after 5s
            setTimeout(function () {        
                connection.start();
            }, 5000);
        } else {            
            console.warn("Disconnected.");

            // wait 5 seconds before showing message
            if (_disconnectTimeout != null) {
                window.clearTimeout(_disconnectTimeout );
            }
            _disconnectTimeout = setTimeout(function () {
                if (weavy.alert) {
                    weavy.alert.alert("danger", "Connection was lost. <a class='alert-link' href='javascript:weavy.connection.reload(true);'>Reload</a>.", null, "connection-state");
                } else {
                    triggerPostMessage("alert", "show", { type: "danger", title: "Connection was lost. <a class='alert-link' href='javascript:weavy.connection.reload(false)'>Reload</a>.", id: "connection-state" });
                }
            }, 5000);            
        }
    });

    function triggerEvent(name) {
        console.debug("triggering: " + name);
        var event = $.Event(name);
        
        // trigger event (with json object instead of string), handle any number of json objects passed from hub (args)
        var data = _.chain(arguments).rest(1).map(function (a) { return JSON.parse(a) }).value();        
        $(document).triggerHandler(event, data);

        triggerPostMessage("cross-frame-event", name, data);
   
    }

    function triggerPostMessage(name, eventName, data) {
        // trigger a post message on all windows when in ebedded mode
        $(wins).each(function (i, win) {
            // trigger on all except the current one            
            if (win != w) {
                try {
                    win.postMessage({ name: name, eventName: eventName, data: data }, "*")
                } catch (e) {}
                
            }
        });
    }

    function reload(standalone) {
        if (standalone) {
            location.reload(true);
        } else {
            window.parent.postMessage({name: "reload"}, "*");
        }
    }
        
    // generic callback used by server to notify clients that something happened
    hubProxies["rtm"].on("eventReceived", function (name, args) {        
        name = name + ".rtm.weavy";
        triggerEvent(name, args);
    });

    // callback from widget onload
    hubProxies["widget"].on("loaded", function (args) {       
        var name = "loaded.rtmwidget.weavy";        
        triggerEvent(name, args);
    });

    // callback from widget conversation received
    hubProxies["widget"].on("conversationReceived", function (args) {
        var name = "conversationReceived.rtmwidget.weavy";
        triggerEvent(name, args);
    });

    function addWindow(win) {        
        // add window to array if not already added
        if (wins.indexOf(win) === -1)
            wins.push(win)        
    }
    
    return {
        init: init,
        connect: connect, 
        disconnect: disconnect,        
        proxies: hubProxies,
        connection: connection,
        addWindow: addWindow,
        reload: reload,
        status : status
    };

})($, window);
