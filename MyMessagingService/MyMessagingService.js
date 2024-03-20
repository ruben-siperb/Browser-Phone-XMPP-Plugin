/**
 * MyMessagingService is a plugin written for XMPP communications.
 * It provides functionalities for handling XMPP messaging and related operations.
 * 
 * @description MyMessagingService is a plugin written for XMPP communications
 * @author Ruben van Bread - ruben@siperb.com
 * Date Modified: 15 March  2024
 */
let MyMessagingService = {
    pluginName: "XMPPService",
    description: "Messaging Service built using XMPP protocol.",
    options: {
        XmppDomain: "undefined",
        // other options my plugin expects
    },
    isDefaultMessagingService: false,
    protocol: "XMPP",
    XMPP: undefined,
    verbose: false,
    logLevel: "info",



    /**
     * @description Initialise the Plugin with the needed configuration options
     * @param {*} options 
     */
    Init: function (options) {

        MyMessagingService.log("Initialising with options.");
        MyMessagingService.options = options;
        // console.log(MyMessagingService.options);
        MyMessagingService.XMPP = null;

        // Display the Configurations for the Plugin Options //
        MyMessagingService.debug(`OPTIONS -----------------`);
        MyMessagingService.debug(MyMessagingService.options);
        MyMessagingService.debug(`ProfileUser: ${profileUser}`);
        MyMessagingService.debug(`SipPassword: ${SipPassword}`);
        MyMessagingService.debug('---------------------------');
    },

    /**
     * @description Connects MessagingService to server
     */
    Connect: function () {
        // NOTE: SipPassword, profileUser needs to accessable.

        MyMessagingService.log("Connect/Reconnect XMPP connection...");

        if (MyMessagingService.XMPP) MyMessagingService.XMPP.disconnect("");
        if (MyMessagingService.XMPP) MyMessagingService.XMPP.reset();




        // Initialise the endpoints and xmpp_username  //
        var xmpp_websocket_uri = "wss://" + MyMessagingService.options.XmppServer + ":" + MyMessagingService.options.XmppWebsocketPort + "" + MyMessagingService.options.XmppWebsocketPath;
        var xmpp_username = profileUser + "@" + MyMessagingService.options.XmppDomain; // Xmpp Doesnt like Uppercase 

        if (MyMessagingService.options.XmppRealm != "" && MyMessagingService.options.XmppRealmSeparator) xmpp_username = MyMessagingService.options.XmppRealm + MyMessagingService.options.XmppRealmSeparator + xmpp_username;
        // may need to add /instanceID
        xmpp_username = xmpp_username.toLowerCase();
        var xmpp_password = SipPassword;

        // Log the newly created configurations variables //
        MyMessagingService.debug("Initalised Variables -----------------");
        MyMessagingService.debug(`XMPP WebSocket URI: ` + xmpp_websocket_uri);
        MyMessagingService.debug('Xmpp Username: ' + xmpp_username);
        MyMessagingService.debug('---------------------------------------');



        MyMessagingService.XMPP = null;
        if (MyMessagingService.options.XmppDomain == "" || MyMessagingService.options.XmppServer == "" || MyMessagingService.options.XmppWebsocketPort == "" || MyMessagingService.options.XmppWebsocketPath == "") {
            console.log("Cannot connect to XMPP: ", MyMessagingService.options.XmppDomain, MyMessagingService.options.XmppServer, MyMessagingService.options.XmppWebsocketPort, MyMessagingService.options.XmppWebsocketPath);
            return;
        }


        // Strophe Connection
        MyMessagingService.XMPP = new Strophe.Connection(xmpp_websocket_uri);
        // Adding Handlers //
        MyMessagingService.XMPP.addHandler(MyMessagingService.OnPingRequest, "urn:xmpp:ping", "iq", "get");
        MyMessagingService.XMPP.addHandler(MyMessagingService.OnVersionRequest, "jabber:iq:version", "iq", "get");
        // Presence
        MyMessagingService.XMPP.addHandler(MyMessagingService.OnPresenceChange, null, "presence", null);
        // Message
        MyMessagingService.XMPP.addHandler(MyMessagingService.OnMessage, null, "message", null);

        // XMPP Connect //
        MyMessagingService.XMPP.connect(xmpp_username, xmpp_password, MyMessagingService.OnStatusChange);

        if (MyMessagingService.XMPP) {


            MyMessagingService.log("XMPP IS CONNECTED");
            MyMessagingService.debug("XMPP Object: ", MyMessagingService.XMPP);
        }


    },

    /**
     * @description Disconnect the XMPP service.
     */
    Disconnect: function () {
        if (MyMessagingService.XMPP) {
            MyMessagingService.XMPP.disconnect();
        }
        return;
    },



    /**
     * @description Handles incoming messages received from the XMPP server.
     * 
     * This function is responsible for processing incoming XMPP messages. It first checks the XMPP connection status,
     * then extracts essential message attributes such as sender, recipient, and message ID. It also handles message
     * composition states, message correction, and delivery events. If the message is a correction or delivery event, 
     * it marks the respective message accordingly. If the message is a regular text message, it adds the message to 
     * the conversation stream, updates the buddy's activity, and sends delivery and display receipts if required. 
     * Finally, it refreshes and activates the conversation stream in the UI.
     * 
     * @param {Element} message - The XMPP message element received from the server.
     * @returns {boolean} - Returns true to signal that the message has been successfully processed.
     */
    OnMessage: function (message) {
        MyMessagingService.debug("OnMessage recieved");

        if (!MyMessagingService.CheckXmppConnection) return;




        MyMessagingService.debug("MESSAGE: ", message);

        // Extract attributes //
        var from = message.getAttribute("from");
        var fromJid = Strophe.getBareJidFromJid(from);
        var to = message.getAttribute("to");
        var messageId = message.getAttribute("id");

        // Determine Buddy //
        var buddyObj = FindBuddyByJid(fromJid);
        MyMessagingService.debug("BuddyObj: ", buddyObj);
        if (buddyObj == null) {
            // You don't appear to be a buddy of mine
            var infoStr = `from: ${from}\nfromJid: ${fromJid}\nto: ${to}\nmessageId: ${messageId}`

            // TODO: Handle this
            MyMessagingService.warn("Spam! - You don't appear to be a buddy of mine. ", infoStr); // LOL :)
            return true;
        }

        var isDelayed = false;
        var DateTime = utcDateNow();
        Strophe.forEachChild(message, "delay", function (elem) {
            // Delay message received
            if (elem.getAttribute("xmlns") == "urn:xmpp:delay") {
                isDelayed = true;
                DateTime = moment(elem.getAttribute("stamp")).utc().format("YYYY-MM-DD HH:mm:ss UTC");
            }
        });
        var originalMessage = "";
        Strophe.forEachChild(message, "body", function (elem) {
            // For simplicity, this code is assumed to take the last body
            originalMessage = elem.textContent;
        });

        MyMessagingService.debug(`ORGINIANL MESSAGE : ${originalMessage}`);


        // chatstate
        var chatstate = "";
        Strophe.forEachChild(message, "composing", function (elem) {
            if (elem.getAttribute("xmlns") == "http://jabber.org/protocol/chatstates") {
                chatstate = "composing";
            }
        });
        Strophe.forEachChild(message, "paused", function (elem) {
            if (elem.getAttribute("xmlns") == "http://jabber.org/protocol/chatstates") {
                chatstate = "paused";
            }
        });
        Strophe.forEachChild(message, "active", function (elem) {
            if (elem.getAttribute("xmlns") == "http://jabber.org/protocol/chatstates") {
                chatstate = "active";
            }
        });
        if (chatstate == "composing") {
            if (!isDelayed) MyMessagingService.ShowComposing(buddyObj); //XmppShowComposing(buddyObj);
            return true;
        } else {
            // XmppHideComposing(buddyObj);
            MyMessagingService.HideComposing(buddyObj);
        }

        // Message Correction //
        MyMessagingService.debug("Message Correction");
        var isCorrection = false;
        var targetCorrectionMsg = "";
        Strophe.forEachChild(message, "replace", function (elem) {
            if (elem.getAttribute("xmlns") == "urn:xmpp:message-correct:0") {
                isCorrection = true;
                Strophe.forEachChild(elem, "id", function (idElem) {
                    targetCorrectionMsg = idElem.textContent;
                });
            }
        });
        if (isCorrection && targetCorrectionMsg != "") {
            console.log("Message " + targetCorrectionMsg + " for " + buddyObj.CallerIDName + " was corrected");
            CorrectMessage(buddyObj, targetCorrectionMsg, originalMessage);
        }

        // Delivery Events //
        var eventStr = "";
        var targetDeliveryMsg = "";
        Strophe.forEachChild(message, "x", function (elem) {
            if (elem.getAttribute("xmlns") == "jabber:x:event") {
                // One of the delivery events occured
                Strophe.forEachChild(elem, "delivered", function (delElem) {
                    eventStr = "delivered";
                });
                Strophe.forEachChild(elem, "displayed", function (delElem) {
                    eventStr = "displayed";
                });
                Strophe.forEachChild(elem, "id", function (idElem) {
                    targetDeliveryMsg = idElem.textContent;
                });
            }
        });
        if (eventStr == "delivered" && targetDeliveryMsg != "") {
            MyMessagingService.log("Message " + targetDeliveryMsg + " for " + buddyObj.CallerIDName + " was delivered");
            MarkDeliveryReceipt(buddyObj, targetDeliveryMsg, true);


            return true;
        }
        if (eventStr == "displayed" && targetDeliveryMsg != "") {
            MyMessagingService.log("Message " + targetDeliveryMsg + " for " + buddyObj.CallerIDName + " was displayed");
            MarkDisplayReceipt(buddyObj, targetDeliveryMsg, true);

            return true;
        }

        // Messages //
        if (originalMessage == "") {
            // Not a full message
            var errorStr = `Error in recieved message. Not a full message.\ntargetDeliveryMsg: ${targetDeliveryMsg}\nBuddyObj: ${buddyObj}`;
            MyMessagingService.warn(errorStr);
        } else {
            if (messageId) {
                // Although XMPP does not require message ID's, this application does
                // XmppSendDeliveryReceipt(buddyObj, messageId);
                MyMessagingService.SendDeliveryReceipt(buddyObj, messageId);

                AddMessageToStream(buddyObj, messageId, "MSG", originalMessage, DateTime);
                UpdateBuddyActivity(buddyObj.identity);
                var streamVisible = $("#stream-" + buddyObj.identity).is(":visible");
                if (streamVisible) {
                    MarkMessageRead(buddyObj, messageId);
                    MyMessagingService.SendDisplayReceipt(buddyObj, messageId);
                }
                RefreshStream(buddyObj);
                ActivateStream(buddyObj, originalMessage);
            } else {
                var errorStr = `Sorry, messages must have an id.\nmessage: ${message}\nBuddyObj: ${buddyObj}`;
                MyMessagingService.warn(errorStr);
            }
        }

        return true;

    },

    /**
     * @description This calls the UI to display the ShowComposing inidicators.
     * @param {*} buddyObj 
     */
    ShowComposing: function (buddyObj) {
        MyMessagingService.debug("UI please show composing message.");
        UI_ShowComposing(buddyObj);
    },

    /**
     * @description This calls the UI to display the HideComposing indicators.
     * @param {*} buddyObj 
     */
    HideComposing: function (buddyObj) {
        MyMessagingService.debug("UI please hide composing message.");
        UI_HideComposing(buddyObj);

    },

    /**
     * @description Handles changes in presence status for XMPP contacts.
     * 
     * @param {*} presence - The presence stanza received from the XMPP server.
     * @returns {boolean} - Indicates whether the presence change was successfully handled.
     */
    OnPresenceChange: function (presence) {
        MyMessagingService.log("OnPresenceChange: ", presence);


        // Extracting presence attributes //
        var from = presence.getAttribute("from");
        var to = presence.getAttribute("to");

        var subscription = presence.getAttribute("subscription");
        var type = (presence.getAttribute("type")) ? presence.getAttribute("type") : "presence"; // subscribe | subscribed | unavailable
        var pres = "";
        var status = "";
        var xmlns = "";


        // Handling various presence scenarios //
        Strophe.forEachChild(presence, "show", function (elem) {
            pres = elem.textContent;
        });
        Strophe.forEachChild(presence, "status", function (elem) {
            status = elem.textContent;
        });
        Strophe.forEachChild(presence, "x", function (elem) {
            xmlns = elem.getAttribute("xmlns");
        });

        var fromJid = Strophe.getBareJidFromJid(from);

        // Presence notification from me to me
        if (from == to) {
            // Either my vCard updated, or my Presence updated
            return true;
        }

        // Find the buddy this message is coming from //
        MyMessagingService.debug("Finding Buddy by Jid:", fromJid);
        var buddyObj = FindBuddyByJid(fromJid);
        if (buddyObj == null) {

            // TODO: What to do here?
            var errorStr = `Failed to find buddy.\nfromJid: ${fromJid}\ntype: ${type}\nsubscription: ${subscription}\npres: ${pres}\npresence: ${presence}`;

            MyMessagingService.warn(errorStr);
            return true;
        }

        // Check the type //
        if (type == "subscribe") {
            // <presence xmlns="jabber:client" type="subscribe" from="58347g3721h~800@...com" id="1" subscription="both" to="58347g3721h~100@...com"/>
            // <presence xmlns="jabber:client" type="subscribe" from="58347g3721h~800@...com" id="1" subscription="both" to="58347g3721h~100@...com"/>

            // One of your buddies is requestion subscription
            MyMessagingService.log("Presence: " + buddyObj.CallerIDName + " requesting subscrption");
            MyMessagingService.ConfirmSubscription(buddyObj);
            // Also Subscribe to them
            // XmppSendSubscriptionRequest(buddyObj);
            MyMessagingService.SendSubscriptionRequest(buddyObj);

            UpdateBuddyList();
            return true;
        }
        if (type == "subscribed") {
            // One of your buddies has confimed subscription
            MyMessagingService.log("Presence: " + buddyObj.CallerIDName + " confimed subscrption");

            UpdateBuddyList();
            return true;
        }
        if (type == "unavailable") {
            // <presence xmlns="jabber:client" type="unavailable" from="58347g3721h~800@...com/63zy33arw5" to="yas43lag8l@...com"/>
            MyMessagingService.log("Presence: " + buddyObj.CallerIDName + " unavailable");

            UpdateBuddyList();
            return true;
        }

        if (xmlns == "vcard-temp:x:update") {
            // This is a presence update for the picture change
            MyMessagingService.log("Presence: " + buddyObj.ExtNo + " - " + buddyObj.CallerIDName + " vCard change");

            // Should check if the hash is different, could have been a non-picture change..
            // However, either way you would need to update the vCard, as there isnt a awy to just get the picture
            // XmppGetBuddyVcard(buddyObj);
            MyMessagingService.GetBuddyVcard(buddyObj);

            UpdateBuddyList();
        }

        if (pres != "") {
            // This is a regulare 
            MyMessagingService.log("Presence: " + buddyObj.ExtNo + " - " + buddyObj.CallerIDName + " is now: " + pres + "(" + status + ")");

            buddyObj.presence = pres;
            buddyObj.presenceText = (status == "") ? lang.default_status : status;

            UpdateBuddyList();
        }

        return true;
    },

    /**
     * Sets the presence status of the current user and updates the vCard if specified.
     * 
     * @param {string} str - The presence status indicator ("away", "chat", "dnd", "xa").
     * @param {string} desc - The presence status description.
     * @param {boolean} updateVcard - Specifies whether to update the vCard with the current user's profile picture.
     * 
     * @returns {void}
     */
    SetMyPresence: function (str, desc, updateVcard) {


        if (!MyMessagingService.CheckXmppConnection) return;

        // ["away", "chat", "dnd", "xa"] => ["Away", "Available", "Busy", "Gone"]

        MyMessagingService.log("Setting My Own Presence to: " + str + "(" + desc + ")");

        if (desc == "") desc = lang.default_status;
        $("#regStatus").html("<i class=\"fa fa-comments\"></i> " + desc);

        var pres_request = $pres({
            "id": MyMessagingService.XMPP.getUniqueId(),
            "from": MyMessagingService.XMPP.jid
        });
        pres_request.c("show").t(str);
        if (desc && desc != "") {
            pres_request.root();
            pres_request.c("status").t(desc);
        }
        if (updateVcard == true) {
            var base64 = getPicture("profilePicture");
            var imgBase64 = base64.split(",")[1];
            var photoHash = $.md5(imgBase64);

            pres_request.root();
            pres_request.c("x", {
                "xmlns": "vcard-temp:x:update"
            });
            if (photoHash) {
                pres_request.c("photo", {}, photoHash);
            }
        }

        MyMessagingService.XMPP.sendPresence(pres_request, function (result) {
            // console.log("XmppSetMyPresence Response: ", result);
        }, function (e) {
            MyMessagingService.warn("Error in XmppSetMyPresence", e);
        }, 30 * 1000);
    },

    /**
     * @description Sends a message to a specified buddy using XMPP.
     * 
     * @param {object} buddyObj - The buddy object containing information about the recipient.
     * @param {string} message - The message content to be sent.
     * @param {string} messageId - The unique identifier for the message.
     * @param {string} thread - The thread identifier for the message thread.
     * @param {boolean} markable - Specifies whether the message is markable.
     * @param {string} type - The type of message ("chat", "error", "normal", "groupchat", "headline").
     * 
     * @returns {void}
     */
    SendMessage: function (buddyObj, message, messageId, thread, markable, type) {


        MyMessagingService.log(`TO:  ${buddyObj.jid} (xmpp)`);
        MyMessagingService.log(`Message: ${message}`);

        if (!MyMessagingService.CheckXmppConnection) return;


        if (!type) type = "normal"; // chat | error | normal | groupchat | headline
        var msg = $msg({
            "to": buddyObj.jid,
            "type": type,
            "id": messageId,
            "from": MyMessagingService.XMPP.jid
        })
        if (thread && thread != "") {
            msg.c("thread").t(thread);
            msg.up();
        }
        msg.c("body").t(message);
        // XHTML-IM
        msg.up();
        msg.c("active", {
            "xmlns": "http://jabber.org/protocol/chatstates"
        });
        msg.up();
        msg.c("x", {
            "xmlns": "jabber:x:event"
        });
        msg.c("delivered");
        msg.up();
        msg.c("displayed");


        MyMessagingService.log("Sending Message...");
        buddyObj.chatstate = "active";
        if (buddyObj.chatstateTimeout) {
            window.clearTimeout(buddyObj.chatstateTimeout);
        }
        buddyObj.chatstateTimeout = null;

        try {
            MyMessagingService.XMPP.send(msg);
            MyMessagingService.debug("XMPP.send was called\n" + msg);
            MarkMessageSent(buddyObj, messageId, false);
        } catch (e) {


            MyMessagingService.warn("Message failed to send.", e);
            MarkMessageNotSent(buddyObj, messageId, false);
        }
    },


    /**
     * @description Sends a ping request to the XMPP server to check the connection status.
     * If the XMPP connection is not established, it attempts to reconnect.
     * 
     * @returns void
     */
    SendPing: function () {


        if (!MyMessagingService.CheckXmppConnection()) MyMessagingService.Connect();


        var iq_request = $iq({
            "type": "get",
            "id": MyMessagingService.XMPP.getUniqueId(),
            "to": MyMessagingService.options.XmppDomain,
            "from": MyMessagingService.XMPP.jid
        });
        iq_request.c("ping", {
            "xmlns": "urn:xmpp:ping"
        });

        MyMessagingService.XMPP.sendIQ(iq_request, function (result) {}, function (e) {
            var errorStr = `Error in Ping.\niq_request: ${iq_request}\nError: ${e}`;
            MyMessagingService.warn(errorStr);
        }, 30 * 1000);

        MyMessagingService.XMPP.ping = window.setTimeout(function () {
            MyMessagingService.SendPing();
        }, 45 * 1000);
    },

    // SUBSCRIPTIONS //
    /**
     * @description Sends a Subscription request for the XMPP Presence.
     * $pres = shorthand for creating a presence stanza
     * @param {*} buddyObj 
     * @returns 
     */
    ConfirmSubscription: function (buddyObj) {

        if (!MyMessagingService.CheckXmppConnection) return;


        var pres_request = $pres({
            "to": buddyObj.jid,
            "from": MyMessagingService.XMPP.jid,
            "type": "subscribed"
        });

        try {
            MyMessagingService.XMPP.sendPresence(pres_request);
        } catch (e) {
            var errorStr = `Failed to send confirmation presence: BuddyObj: ${buddyObj}\npres_request: ${pres_request}\nError: ${e}`;
            MyMessagingService.warn(errorStr);
        }
    },
    /**
     * @description Sends a subscription request to the buddy contact.
     * Send a subscription request to a specified XMPP contact (buddy).
     * Subscription requests are used to request permission to subscribe to another user's presence updates and receive notifications when the user's presence changes.
     * @param {*} buddyObj 
     * @returns void
     */
    SendSubscriptionRequest: function (buddyObj) {
        MyMessagingService.log("SendSubscriptionRequest. ", buddyObj);

        if (!MyMessagingService.CheckXmppConnection) return;




        var pres_request = $pres({
            "to": buddyObj.jid,
            "from": MyMessagingService.XMPP.jid,
            "type": "subscribe"
        });

        try {
            MyMessagingService.XMPP.sendPresence(pres_request);

        } catch (e) {
            var errorStr = `Failed to send subscription presence: BuddyObj: ${buddyObj} \n pres_request: ${pres_request}\n. Error: ${e}`;
            MyMessagingService.warn(errorStr);
        }
    },

    // STATUS //
    /**
     * @description -  handles various connection status changes in the context of XMPP
     * STATUSES:
     * - CONNECTING
     * - CONNFAIL
     * - DISCONNECTING
     * - DISCONNECTED
     * - CONNECTED
     * @param status - is the current status
     */
    OnStatusChange: function (status) {
        MyMessagingService.log("OnStatusChange. ", status);
        if (status == Strophe.Status.CONNECTING) {
            MyMessagingService.warn('XMPP is connecting...');
        } else if (status == Strophe.Status.CONNFAIL) {
            MyMessagingService.warn('XMPP failed to connect.');
        } else if (status == Strophe.Status.DISCONNECTING) {
            MyMessagingService.warn('XMPP is disconnecting.');
        } else if (status == Strophe.Status.DISCONNECTED) {
            MyMessagingService.warn('XMPP is disconnected.');

            // Keep connected
            window.setTimeout(function () {
                // reconnectXmpp();
            }, 5 * 1000);
        } else if (status == Strophe.Status.CONNECTED) {
            MyMessagingService.log('XMPP is connected!');

            // Re-publish my vCard
            // XmppSetMyVcard();
            MyMessagingService.SetMyVcard();

            // Get buddies
            // XmppGetBuddies();
            MyMessagingService.GetBuddies();


            MyMessagingService.XMPP.ping = window.setTimeout(function () {
                MyMessagingService.SendPing();
            }, 45 * 1000);
        } else {
            MyMessagingService.warn('XMPP is: ', Strophe.Status);
        }
    },

    // XMPP RECEIPTS //
    /**
     * @description  Send a delivery notice in the context of an XMPP 
     * - $msg() : new message stanza.
     * @param {*} buddyObj 
     * @param {*} id 
     * @returns 
     */
    SendDeliveryReceipt: function (buddyObj, id) {
        MyMessagingService.debug("SendDeliveryReceipt.");
        if (!MyMessagingService.CheckXmppConnection) return;

        var msg = $msg({
            "to": buddyObj.jid,
            "from": MyMessagingService.XMPP.jid
        });
        msg.c("x", {
            "xmlns": "jabber:x:event"
        });
        msg.c("delivered");
        msg.up();
        msg.c("id").t(id);

        console.log("sending delivery notice for " + id + "...");

        MyMessagingService.XMPP.send(msg);
    },
    /**
     * @description The function `SendDisplayReceipt` sends a display notice to a specified XMPP buddy with a given
     * message ID.
     * @param buddyObj - The `buddyObj` parameter is an object representing the buddy or contact to
     * whom the message is being sent. It contains information such as the buddy's JID (Jabber ID)
     * and other relevant details needed for sending the message.
     * @param id - The `id` parameter in the `SendDisplayReceipt` function is the unique identifier of
     * the message for which you want to send a display receipt. It is used to track and identify the
     * specific message for which the display receipt is being sent.
     * @returns If the XMPP connection is not established or is not connected, the function will return
     * early and log a warning message "XMPP not connected". Otherwise, the function will construct and
     * send a message to the specified buddy with the display receipt information.
     */
    SendDisplayReceipt: function (buddyObj, id) {
        MyMessagingService.debug("SendDisplayReceipt.");
        if (!MyMessagingService.CheckXmppConnection) return;

        var msg = $msg({
            "to": buddyObj.jid,
            "from": MyMessagingService.XMPP.jid
        });
        msg.c("x", {
            "xmlns": "jabber:x:event"
        });
        msg.c("displayed");
        msg.up();
        msg.c("id").t(id);

        MyMessagingService.log("sending display notice for " + id + "...");

        MyMessagingService.XMPP.send(msg);
    },

    // COMPOSING //
    /**
     * @description The function `StartComposing` is used to notify the XMPP server that a user is composing a message
     * to a specific buddy.
     * @param buddyObj - The `buddyObj` parameter in the `StartComposing` function represents an
     * object that contains information about a chat buddy. It includes properties such as `jid`
     * (Jabber ID) and `chatstateTimeout`. This object is used to manage the chat state of the
     * @param thread - The `thread` parameter in the `StartComposing` function is used to specify the
     * thread ID of the conversation. It is an optional parameter that can be provided to associate the
     * message being composed with a specific thread in the chat. If a thread ID is provided, it is
     * included in the message
     * @returns If the XMPP connection is not established or if the buddy's JID is null or empty, the
     * function will return without performing any further actions.
     */
    StartComposing: function (buddyObj, thread) {
        MyMessagingService.debug("StartComposing.");

        if (!MyMessagingService.CheckXmppConnection) return;


        if (buddyObj.jid == null || buddyObj.jid == "") return;

        if (buddyObj.chatstateTimeout) {
            window.clearTimeout(buddyObj.chatstateTimeout);
        }
        buddyObj.chatstateTimeout = window.setTimeout(function () {
            MyMessagingService.PauseComposing(buddyObj, thread);
        }, 10 * 1000);

        if (buddyObj.chatstate && buddyObj.chatstate == "composing") return;

        var msg = $msg({
            "to": buddyObj.jid,
            "from": MyMessagingService.XMPP.jid
        })
        if (thread && thread != "") {
            msg.c("thread").t(thread);
            msg.up();
        }
        msg.c("composing", {
            "xmlns": "http://jabber.org/protocol/chatstates"
        });

        MyMessagingService.log("you are composing a message...");
        buddyObj.chatstate = "composing";

        MyMessagingService.XMPP.send(msg);

    },
    /**
     * @description The function `PauseComposing` is used to send a chat state notification indicating that the user has
     * paused composing a message to a specified buddy in a chat thread.
     * @param buddyObj - buddyObj is an object representing the buddy or contact with whom the user is
     * communicating. It contains information such as the buddy's JID (Jabber ID), chat state, and
     * chat state timeout.
     * @param thread - The `thread` parameter in the `PauseComposing` function is used to specify the
     * thread ID of the conversation. It is an optional parameter that can be provided to associate the
     * message with a specific thread in the chat. If a thread ID is provided, it will be included in the
     * message being
     * @returns The function `PauseComposing` will return nothing (undefined) if the conditions for XMPP
     * connection, buddy's JID, and chat state are not met. If the function successfully sends the pause
     * message, it will log a message to the console indicating that the message has been paused.
     */
    PauseComposing: function (buddyObj, thread) {
        MyMessagingService.log("TODO: PauseComposing.");

        if (!MyMessagingService.XMPP || MyMessagingService.XMPP.connected == false) {
            MyMessagingService.warn("PauseComposing: XMPP not connected");
            return;
        }


        if (buddyObj.jid == null || buddyObj.jid == "") return;

        if (buddyObj.chatstate && buddyObj.chatstate == "paused") return;

        var msg = $msg({
            "to": buddyObj.jid,
            "from": MyMessagingService.XMPP.jid
        })
        if (thread && thread != "") {
            msg.c("thread").t(thread);
            msg.up();
        }
        msg.c("paused", {
            "xmlns": "http://jabber.org/protocol/chatstates"
        });

        MyMessagingService.log("You have paused your message...");
        buddyObj.chatstate = "paused";
        if (buddyObj.chatstateTimeout) {
            window.clearTimeout(buddyObj.chatstateTimeout);
        }
        buddyObj.chatstateTimeout = null;

        MyMessagingService.XMPP.send(msg);
    },


    // REQUESTS //
    /**
     * @description The function `OnPingRequest` handles a ping request in JavaScript by sending a response back with
     * the same attributes.
     * @param iq - The `iq` parameter in the `onPingRequest` function represents an XMPP IQ (Info/Query)
     * stanza, which is used for exchanging structured data between XMPP entities. In this context, the
     * `iq` parameter contains the incoming IQ stanza that is a ping request.
     * @returns The function `onPingRequest` is returning `true`.
     */
    OnPingRequest: function (iq) {
        if (!MyMessagingService.CheckXmppConnection) return;


        var id = iq.getAttribute("id");
        var to = iq.getAttribute("to");
        var from = iq.getAttribute("from");

        var iq_response = $iq({
            'type': 'result',
            'id': id,
            'to': from,
            'from': to
        });
        MyMessagingService.XMPP.send(iq_response);

        return true;
    },
    /**
     * @description The function `OnVersionRequest` handles a request for version information and responds with details
     * about the browser phone version.
     * @param iq - The `iq` parameter in the `onVersionRequest` function represents an XMPP IQ (Info/Query)
     * stanza that is received by the function. It contains information about the request for version
     * details, such as the ID of the request, the sender (from), and the recipient (to).
     * @returns The function `onVersionRequest` is returning `true` after sending a response to the IQ
     * request for version information.
     */
    OnVersionRequest: function (iq) {
        MyMessagingService.debug("OnVersionRequest, XMPP Object: ", MyMessagingService.XMPP);

        if (!MyMessagingService.CheckXmppConnection) return;

        var id = iq.getAttribute("id");
        var to = iq.getAttribute("to");
        var from = iq.getAttribute("from");

        var iq_response = $iq({
            'type': 'result',
            'id': id,
            'to': from,
            'from': to
        });
        iq_response.c('query', {
            'xmlns': 'jabber:iq:version'
        });
        iq_response.c('name', null, 'Browser Phone');
        iq_response.c('version', null, '0.0.1');
        iq_response.c('os', null, 'Browser');

        try {
            MyMessagingService.XMPP.send(iq_response);

        } catch (e) {
            var errorStr = `OnVersionRequest Failed.\niq_response: ${iq_response}\nError: ${e}`;
            MyMessagingService.warn(errorStr);
        }

        return true;
    },

    // INFO QUERY //

    /**
     * @description Handles information queries (IQ stanzas) received from the XMPP server.
     * 
     * In XMPP (Extensible Messaging and Presence Protocol), an IQ (Info/Query) stanza 
     * is used for exchanging structured information between XMPP entities (clients or servers).
     * This function processes the IQ stanza received, logs it for debugging purposes, 
     * and returns true to indicate successful handling.
     * 
     * @param {object} iq - The IQ stanza received from the XMPP server.
     * @returns {boolean} - Returns true to indicate successful handling of the IQ stanza.
     */
    OnInfoQuery: function (iq) {
        MyMessagingService.log("OnInfoQuery.", iq);
        return true;
    },

    /**
     * @description Handles information query requests (IQ stanzas) received from the XMPP server.
     * 
     * This function processes the IQ stanza received, extracts the XML namespace of the query,
     * and logs it for debugging purposes using MyMessagingService.log. It then returns true 
     * to indicate successful handling of the IQ stanza.
     * 
     * @param {object} iq - The IQ stanza received from the XMPP server.
     * @returns {boolean} - Returns true to indicate successful handling of the IQ stanza.
     */
    OnInfoQueryRequest: function (iq) {

        MyMessagingService.log('OnInfoQueryRequest', iq);

        var query = ""; // xml.find("iq").find("query").attr("xmlns");
        Strophe.forEachChild(iq, "query", function (elem) {
            query = elem.getAttribute("xmlns");
        });
        MyMessagingService.log(query);
        return true;
    },

    /**
     * @description Handles information query commands (IQ stanzas) received from the XMPP server.
     * 
     * This function processes the IQ stanza received, extracts the XML namespace of the query,
     * logs it for debugging purposes using MyMessagingService.log, and returns true to indicate 
     * successful handling of the IQ stanza.
     * 
     * @param {object} iq - The IQ stanza received from the XMPP server.
     * @returns {boolean} - Returns true to indicate successful handling of the IQ stanza.
     */
    OnInfoQueryCommand: function (iq) {

        MyMessagingService.log('OnInfoQueryCommand', iq);

        var query = ""; // xml.find("iq").find("query").attr("xmlns");
        Strophe.forEachChild(iq, "query", function (elem) {
            query = elem.getAttribute("xmlns");
        });
        MyMessagingService.log(query);

        // ??
        return true;
    },


    // VCARD //
    /**
     * @description The function `GetMyVcard` sends an XMPP IQ request to retrieve the vCard information for the current
     * user.
     * @returns If the XMPP connection is not established or if it is not connected, the function will log
     * a warning message "XMPP not connected" and return without further execution.
     */
    GetMyVcard: function () {

        if (!MyMessagingService.CheckXmppConnection) return;
        var iq_request = $iq({
            "type": "get",
            "id": MyMessagingService.XMPP.getUniqueId(),
            "from": MyMessagingService.XMPP.jid
        });
        iq_request.c("vCard", {
            "xmlns": "vcard-temp"
        });

        MyMessagingService.XMPP.sendIQ(iq_request, function (result) {
            MyMessagingService.log("GetMyVcard Response: ", result);
        }, function (e) {
            let errorStr = `Error in GetMyVcard.\niq_request: ${iq_request}\nError: ${e}`
            MyMessagingService.warn(errorStr);
        }, 30 * 1000);
    },
    /**
     * @description The function `SetMyVcard` updates the user's vCard information with profile details and a
     * profile picture in an XMPP client.
     * @returns The function `SetMyVcard` will return either a warning message if XMPP is not connected
     * or if no vCard has been created yet. If the function successfully sends the vCard update, it will
     * log a message saying "Sending vCard update".
     */
    SetMyVcard: function () {
        MyMessagingService.debug("SetMyVCard");

        if (!MyMessagingService.CheckXmppConnection) return;


        // Retrieve the profielVcard from the database. //
        var profileVcard = getDbItem("profileVcard", null);
        if (profileVcard == null || profileVcard == "") {
            MyMessagingService.warn("No vCard created yet");
            return;
        }
        profileVcard = JSON.parse(profileVcard);

        // Convert image to base64 //
        var base64 = getPicture("profilePicture");
        var imgBase64 = base64.split(",")[1];

        // create the iq_request //
        var iq_request = $iq({
            "type": "set",
            "id": MyMessagingService.XMPP.getUniqueId(),
            "from": MyMessagingService.XMPP.jid
        });
        iq_request.c("vCard", {
            "xmlns": "vcard-temp"
        });
        iq_request.c("FN", {}, profileName);
        iq_request.c("TITLE", {}, profileVcard.TitleDesc);
        iq_request.c("TEL");
        iq_request.c("NUMBER", {}, profileUser);
        iq_request.up();
        iq_request.c("TEL");
        iq_request.c("CELL", {}, profileVcard.Mobile);
        iq_request.up();
        iq_request.c("TEL");
        iq_request.c("VOICE", {}, profileVcard.Number1);
        iq_request.up();
        iq_request.c("TEL");
        iq_request.c("FAX", {}, profileVcard.Number2);
        iq_request.up();
        iq_request.c("EMAIL");
        iq_request.c("USERID", {}, profileVcard.Email);
        iq_request.up();
        iq_request.c("PHOTO");
        iq_request.c("TYPE", {}, "image/webp"); // image/png
        iq_request.c("BINVAL", {}, imgBase64);
        iq_request.up();
        iq_request.c("JABBERID", {}, Strophe.getBareJidFromJid(this.XMPP.jid));

        MyMessagingService.log("Sending vCard update");
        MyMessagingService.XMPP.sendIQ(iq_request, function (result) {
            // console.log("XmppSetMyVcard Response: ", result);
        }, function (e) {
            let errorStr = `Error in SetMyVcard.\niq_request: ${iq_request}.\nError: ${e}`;
            console.warn(errorStr);
        }, 30 * 1000);
    },

    // GROUPS //

    /**
     * @description Retrieves the list of groups (chat rooms) from the XMPP server.
     * 
     * This function sends an IQ stanza to the XMPP server requesting the list of groups.
     * Upon receiving the response, it logs the result for debugging purposes using 
     * MyMessagingService.log. If an error occurs during the request, it logs the error 
     * message with relevant information using MyMessagingService.warn.
     * @returns void
     */
    GetGroups: function () {
        MyMessagingService.debug("GetGroups called");
        var iq_request = $iq({
            "type": "get",
            "id": MyMessagingService.XMPP.getUniqueId(),
            "to": MyMessagingService.options.XmppChatGroupService + "." + MyMessagingService.options.XmppDomain,
            "from": MyMessagingService.XMPP.jid
        });
        iq_request.c("query", {
            "xmlns": "http://jabber.org/protocol/disco#items",
            "node": "http://jabber.org/protocol/muc#rooms"
        });

        MyMessagingService.XMPP.sendIQ(iq_request, function (result) {
            MyMessagingService.log("GetGroups Response: ", result);
        }, function (e) {
            var errorStr = `Error getting groups.\niq_request: ${iq_request}\nError: ${e}`
            MyMessagingService.warn(errorStr);
        }, 30 * 1000);

    },


    /**
     * @description Retrieves the list of members from a specific group (chat room) on the XMPP server.
     * 
     * This function sends an IQ stanza to the XMPP server requesting the list of members
     * for a specific group. Upon receiving the response, it logs the result for debugging 
     * purposes using MyMessagingService.log. If an error occurs during the request, it logs 
     * the error message with relevant information using MyMessagingService.warn.
     * @returns void
     */
    GetGroupMembers: function () {
        MyMessagingService.debug("GetGroupMembers called");

        var iq_request = $iq({
            "type": "get",
            "id": MyMessagingService.XMPP.getUniqueId(),
            "to": "directors@" + MyMessagingService.options.XmppChatGroupService + "." + MyMessagingService.options.XmppDomain,
            "from": MyMessagingService.XMPP.jid
        });
        iq_request.c("query", {
            "xmlns": "http://jabber.org/protocol/disco#items"
        });

        MyMessagingService.XMPP.sendIQ(iq_request, function (result) {
            MyMessagingService.log("GetGroupMembers Response: ", result);
        }, function (e) {
            let errorStr = `Error in getting the group members.\niq_request: ${iq_request}\nError: ${e}`;
            MyMessagingService.warn(errorStr);
        }, 30 * 1000);
    },

    /**
     * @description Sends a presence stanza to join a specific group (chat room) on the XMPP server.
     * 
     * This function constructs a presence stanza indicating the intention to join a group
     * and sends it to the XMPP server. The "to" attribute of the stanza specifies the group
     * JID (Jabber Identifier) along with the nickname of the user. Upon receiving the response,
     * it logs the result for debugging purposes using MyMessagingService.log. If an error occurs
     * during the request, it logs the error message with relevant information using MyMessagingService.warn.
     * @returns void
     */
    JoinGroup: function () {
        MyMessagingService.debug("Join Group");
        var pres_request = $pres({
            "id": MyMessagingService.XMPP.getUniqueId(),
            "from": MyMessagingService.XMPP.jid,
            "to": "directors@" + MyMessagingService.options.XmppChatGroupService + "." + MyMessagingService.options.XmppDomain + "/nickname"
        });
        pres_request.c("x", {
            "xmlns": "http://jabber.org/protocol/muc"
        });

        MyMessagingService.XMPP.sendPresence(pres_request, function (result) {
            MyMessagingService.log("JoinGroup Response: ", result);
        }, function (e) {
            var errorStr = `Error occured joining a group.\npres_request: ${pres_request}\nError: ${e}`;
            MyMessagingService.warn(errorStr);
        }, 30 * 1000);
    },

    /**
     * @description Queries the XMPP server for information using the XMPP disco#info protocol.
     * 
     * This function sends an IQ (Info/Query) stanza with the "get" type to the XMPP server,
     * requesting information using the disco#info protocol. Upon receiving the response,
     * it logs the result for debugging purposes using MyMessagingService.log. If an error occurs
     * during the request, it logs the error message with relevant information using MyMessagingService.warn.
     * @returns void
     */
    QueryMix: function () {
        MyMessagingService.debug("QueryMix called");
        var iq_request = $iq({
            "type": "get",
            "id": MyMessagingService.XMPP.getUniqueId(),
            "from": MyMessagingService.XMPP.jid
        });
        iq_request.c("query", {
            "xmlns": "http://jabber.org/protocol/disco#info"
        });

        MyMessagingService.XMPP.sendIQ(iq_request, function (result) {
            MyMessagingService.log("XMPP_QueryMix Response: ", result);
        }, function (e) {
            var errorStr = `Error in QueryMix.\niq_request: ${iq_request}\nError: ${e}`;
            MyMessagingService.warn(errorStr);
        }, 30 * 1000);
    },

    // BUDDY SYSTEM //

    /**
     * @description Adds a buddy to the XMPP roster.
     * 
     * This function constructs an IQ (Info/Query) stanza with the "set" type to add a buddy to the XMPP roster.
     * It includes the buddy's JID and display name in the item element of the roster query. 
     * Upon successful addition, it retrieves the buddy's vCard information and sends a subscription request.
     * If the buddy's JID is missing, it logs an error message.
     * 
     * @param {Object} buddyObj - The buddy object.
     */
    AddBuddyToRoster: function (buddyObj) {
        if (!MyMessagingService.CheckXmppConnection) return;



        var iq_request = $iq({
            "type": "set",
            "id": MyMessagingService.XMPP.getUniqueId(),
            "from": MyMessagingService.XMPP.jid
        });
        iq_request.c("query", {
            "xmlns": "jabber:iq:roster"
        });
        iq_request.c("item", {
            "jid": buddyObj.jid,
            "name": buddyObj.CallerIDName
        });
        if (buddyObj.jid == null) {
            var errorStr = `Error in adding a buddy to roster. Missing JID.\nBuddyObj:${buddyObj}\niq_request: ${iq_request}`;
            MyMessagingService.warn(errorStr);
            return;
        }
        MyMessagingService.log("Adding " + buddyObj.CallerIDName + "  to roster...")

        MyMessagingService.XMPP.sendIQ(iq_request, function (result) {

            MyMessagingService.GetBuddyVcard(buddyObj);
            MyMessagingService.SendSubscriptionRequest(buddyObj);

        });
    },
    /**
     * @description Removes a Buddy from the Roster
     *  The roster is a list of contacts or buddies maintained by an XMPP client, 
     *  and it contains information about the user's contacts, such as their JID (Jabber ID) and subscription status.
     * @param {*} buddyObj 
     * @returns 
     */
    RemoveBuddyFromRoster: function (buddyObj) {
        MyMessagingService.debug(`Called ${MyMessagingService.pluginName} RemoveBuddyFromRoster. `, buddyObj)
        if (!MyMessagingService.CheckXmppConnection) return;

        var iq_request = $iq({
            "type": "set",
            "id": MyMessagingService.XMPP.getUniqueId(),
            "from": MyMessagingService.XMPP.jid
        });
        iq_request.c("query", {
            "xmlns": "jabber:iq:roster"
        });
        iq_request.c("item", {
            "jid": buddyObj.jid,
            "subscription": "remove"
        });
        if (buddyObj.jid == null) {
            var errorStr = `Error in removing a buddy to roster. Missing JID.\nBuddyObj:${buddyObj}\niq_request: ${iq_request}`;
            MyMessagingService.warn(errorStr);
            return;
        }
        MyMessagingService.log("Removing " + buddyObj.CallerIDName + "  from roster...")

        MyMessagingService.XMPP.sendIQ(iq_request, function (result) {
            // console.log(result);
        });
    },
    
    // Depricated.
    AddBuddy: function (buddyObj) {
        MyMessagingService.log("Depricated. Not used");
    },

    // Depricated.
    UpdateBuddyList: function () {
        MyMessagingService.log("Depricated. UpdateBuddyList. Not used.");
    },

    /**
     * @description Retrieves the vCard information of a buddy.
     * 
     * This function constructs an IQ (Info/Query) stanza with the "get" type to retrieve the vCard of a specified buddy.
     * Upon successful retrieval, it updates the buddy's information with the obtained vCard details such as display name,
     * contact numbers, email, and profile picture. It also saves the updated buddy information to the local database.
     * If an image is included in the vCard, it updates the profile picture accordingly in the UI.
     * 
     * @param {Object} buddyObj - The buddy object containing the JID and other details.
     */
    GetBuddyVcard: function (buddyObj) {
        MyMessagingService.debug("GetBuddyVcard");
        if (!MyMessagingService.CheckXmppConnection) return;


        if (buddyObj == null) return;
        if (buddyObj.jid == null) return;

        var iq_request = $iq({
            "type": "get",
            "id": MyMessagingService.XMPP.getUniqueId(),
            "from": MyMessagingService.XMPP.jid,
            "to": buddyObj.jid
        });
        iq_request.c("vCard", {
            "xmlns": "vcard-temp"
        });
        MyMessagingService.XMPP.sendIQ(iq_request, function (result) {

            var jid = result.getAttribute("from");
            MyMessagingService.log("Got vCard for: " + jid);

            var buddyObj = FindBuddyByJid(jid);
            if (buddyObj == null) {
                MyMessagingService.warn("Received a vCard for non-existing buddy", jid)
                return;
            }

            var imgBase64 = "";

            Strophe.forEachChild(result, "vCard", function (vcard) {
                Strophe.forEachChild(vcard, null, function (element) {
                    if (element.tagName == "FN") {
                        buddyObj.CallerIDName = element.textContent;
                    }
                    if (element.tagName == "TITLE") {
                        buddyObj.Desc = element.textContent;
                    }
                    if (element.tagName == "JABBERID") {
                        if (element.textContent != jid) {
                            MyMessagingService.warn("JID does not match: ", element.textContent, jid);
                        }
                    }
                    if (element.tagName == "TEL") {
                        Strophe.forEachChild(element, "NUMBER", function (ExtNo) {
                            // Voip Number (Subscribe)
                            if (ExtNo.textContent != buddyObj.ExtNo) {
                                MyMessagingService.warn("Subscribe Extension does not match: ", ExtNo.textContent, buddyObj.ExtNo);
                            }
                        });
                        Strophe.forEachChild(element, "CELL", function (cell) {
                            // Mobile
                            buddyObj.MobileNumber = cell.textContent;
                        });
                        Strophe.forEachChild(element, "VOICE", function (Alt1) {
                            // Alt1
                            buddyObj.ContactNumber1 = Alt1.textContent;
                        });
                        Strophe.forEachChild(element, "FAX", function (Alt2) {
                            // Alt2
                            buddyObj.ContactNumber2 = Alt2.textContent;
                        });
                    }
                    if (element.tagName == "EMAIL") {
                        Strophe.forEachChild(element, "USERID", function (email) {
                            buddyObj.Email = email.textContent;
                        });
                    }
                    if (element.tagName == "PHOTO") {
                        Strophe.forEachChild(element, "BINVAL", function (base64) {
                            imgBase64 = "data:image/webp;base64," + base64.textContent; // data:image/png;base64,
                        });
                    }
                });
            });

            // Save To DB //
            var buddyJson = {};
            var itemId = -1;
            var json = JSON.parse(localDB.getItem(profileUserID + "-Buddies"));
            $.each(json.DataCollection, function (i, item) {
                if (item.uID == buddyObj.identity) {
                    buddyJson = item;
                    itemId = i;
                    return false;
                }
            });

            if (itemId != -1) {

                buddyJson.MobileNumber = buddyObj.MobileNumber;
                buddyJson.ContactNumber1 = buddyObj.ContactNumber1;
                buddyJson.ContactNumber2 = buddyObj.ContactNumber2;
                buddyJson.DisplayName = buddyObj.CallerIDName;
                buddyJson.Description = buddyObj.Desc;
                buddyJson.Email = buddyObj.Email;

                json.DataCollection[itemId] = buddyJson;
                localDB.setItem(profileUserID + "-Buddies", JSON.stringify(json));
            }

            if (imgBase64 != "") {
                // console.log(buddyObj);
                console.log("Buddy: " + buddyObj.CallerIDName + " picture updated");

                localDB.setItem("img-" + buddyObj.identity + "-" + buddyObj.type, imgBase64);
                $("#contact-" + buddyObj.identity + "-picture-main").css("background-image", 'url(' + getPicture(buddyObj.identity, buddyObj.type, true) + ')');
            }
            UpdateBuddyList();

        }, function (e) {
            var errorStr = `Error in getting buddy Vcard.\nBuddyObj: ${buddyObj}\niq_request: ${iq_request}\nError: ${e}`;
            console.warn(errorStr);
        }, 30 * 1000);
    },

    /**
     * @description Retrieves the buddy list (roster) from the XMPP server.
     * 
     * This function constructs an IQ (Info/Query) stanza with the "get" type to retrieve the buddy list from the XMPP server.
     * Upon successful retrieval, it processes each roster item, updating the buddy information and retrieving their vCard details.
     * If a buddy is not found in the local cache, it creates a new buddy object and retrieves their vCard information.
     * If the buddy is already cached, it updates the existing buddy information and retrieves the vCard details.
     * After processing all roster items, it updates the user's own presence status and populates the buddy list in the UI.
     * @returns void
     */
    GetBuddies: function () {
        MyMessagingService.debug("Handling the 'GetBuddies' functionality");
        if (!MyMessagingService.CheckXmppConnection) return;


        var iq_request = $iq({
            "type": "get",
            "id": MyMessagingService.XMPP.getUniqueId(),
            "from": MyMessagingService.XMPP.jid
        });
        iq_request.c("query", {
            "xmlns": "jabber:iq:roster"
        });
        MyMessagingService.log("Getting Buddy List (roster)...");

        MyMessagingService.XMPP.sendIQ(iq_request, function (result) {
            Strophe.forEachChild(result, "query", function (query) {
                Strophe.forEachChild(query, "item", function (buddyItem) {

                    // console.log("Register Buddy", buddyItem);

                    // <item xmlns="jabber:iq:roster" jid="58347g3721h~800@xmpp-eu-west-1.innovateasterisk.com" name="Alfredo Dixon" subscription="both"/>
                    // <item xmlns="jabber:iq:roster" jid="58347g3721h~123456@conference.xmpp-eu-west-1.innovateasterisk.com" name="Some Group Name" subscription="both"/>

                    var jid = buddyItem.getAttribute("jid");
                    var displayName = buddyItem.getAttribute("name");
                    var node = Strophe.getNodeFromJid(jid);
                    var buddyDid = node;
                    if (MyMessagingService.options.XmppRealm != "" && MyMessagingService.options.XmppRealmSeparator != "") {
                        buddyDid = node.split(MyMessagingService.options.XmppRealmSeparator, 2)[1];
                    }
                    var ask = (buddyItem.getAttribute("ask")) ? buddyItem.getAttribute("ask") : "none";
                    var sub = (buddyItem.getAttribute("subscription")) ? buddyItem.getAttribute("subscription") : "none";
                    var isGroup = (jid.indexOf("@" + MyMessagingService.options.XmppChatGroupService + ".") > -1);
                    // MyMessagingService.log("Update XmppChatGroupService to options : ", MyMessagingService.options.XmppChatGroupService);

                    var buddyObj = FindBuddyByJid(jid);
                    if (buddyObj == null) {
                        // Create Cache
                        if (isGroup == true) {
                            MyMessagingService.log("Adding roster (group):", buddyDid, "-", displayName);
                            buddyObj = MakeBuddy("group", false, false, false, displayName, buddyDid, jid, false, buddyDid, false, false);
                        } else {
                            MyMessagingService.log("Adding roster (xmpp):", buddyDid, "-", displayName);
                            buddyObj = MakeBuddy("xmpp", false, false, true, displayName, buddyDid, jid, false, buddyDid, false, false);
                        }

                        // RefreshBuddyData(buddyObj);

                        MyMessagingService.GetBuddyVcard(buddyObj);
                    } else {
                        // Buddy cache exists
                        MyMessagingService.log("Existing roster item:", buddyDid, "-", displayName);

                        // RefreshBuddyData(buddyObj);
                        MyMessagingService.GetBuddyVcard(buddyObj);
                    }

                });
            });

            // Update your own status, and get the status of others
            // XmppSetMyPresence(getDbItem("XmppLastPresence", "chat"), getDbItem("XmppLastStatus", ""), true);
            MyMessagingService.SetMyPresence(getDbItem("XmppLastPresence", "chat"), getDbItem("XmppLastStatus", ""), true);

            // Populate the buddy list
            UpdateBuddyList();

        }, function (e) {
            var errorStr = `Error getting roster.\niq_request: ${iq_request}\nError: ${e}`;
            MyMessagingService.warn(errorStr);
        }, 30 * 1000);
    },

    // VALIDATION //
    ValidateFields: function (args) {
        this.log("TODO: ValidateFields")
    },



    // UTILS //
    /**
     * @description Get ths function that called this.
     * @returns the calling function
     */
    getCallerFunctionName: function () {
        try {
            throw new Error();
        } catch (e) {
            // Extract the caller function name from the stack trace
            var stackLines = e.stack.split('\n');
            // The caller function name is typically at index 3
            // Adjust this index based on the stack trace format in your environment
            var callerLine = stackLines[3];
            var functionNameMatch = callerLine.match(/at\s+([^(]+)/);
            if (functionNameMatch) {
                return functionNameMatch[1].trim();
            } else {
                return 'Unknown'; // Unable to determine caller function name
            }
        }
    },

    /**
     *  @description  `CheckXmppConnection` that checks if the XMPP connection is established.
     *  @returns true if connected, false if not
     */
    CheckXmppConnection: function () {
        if (!MyMessagingService.XMPP || MyMessagingService.XMPP.connected == false) {
            var callerFunction = MyMessagingService.GetCallerFunctionName();
            MyMessagingService.warn(` ${callerFunction} XMPP not connected`);
            return false;
        }
        return true;
    },

    debug: function (...args) {
        if (MyMessagingService.verbose || MyMessagingService.logLevel.toLowerCase() === "debug") {
            var callerFunction = MyMessagingService.getCallerFunctionName();
            console.debug(`${MyMessagingService.pluginName}:${callerFunction}:`, ...args);
        }
    },
    log: function (...args) {
        if (MyMessagingService.logLevel.toLowerCase() === "info" || MyMessagingService.verbose === true) {
            var callerFunction = MyMessagingService.getCallerFunctionName();
            console.log(`${MyMessagingService.pluginName}:${callerFunction}:`, ...args);
        }

    },

    warn: function (...args) {
        var callerFunction = MyMessagingService.getCallerFunctionName();
        console.warn(`${MyMessagingService.pluginName}:${callerFunction}: `, ...args);
    }







}

module.exports = MyMessagingService;