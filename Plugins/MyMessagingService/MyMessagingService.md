# MyMessagingService XMPP Plugin
- Built using XMPP. 
- Configuration options required:
    ```javascript
    MessagingService.Init({
            XmppServer: "xmpp-eu-west-1.siperb.com",
            XmppWebsocketPort: "7443",
            XmppWebsocketPath: "/ws",
            XmppDomain: "siperb.com",
            XmppChatGroupService: XmppChatGroupService,

        });
    ```
