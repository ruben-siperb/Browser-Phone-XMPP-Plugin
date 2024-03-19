# XMPP (Extensible Messaging and Presence Protocol)
XMPP, which stands for Extensible Messaging and Presence Protocol, is an open-source communication protocol widely used for real-time messaging, presence information, and online collaboration. Initially developed by the Jabber open-source community in the late 1990s, XMPP has evolved into a standardized protocol governed by the Internet Engineering Task Force (IETF) and is widely adopted across various instant messaging (IM) and chat applications.

Learn more here: https://xmpp.org/
More in depth: https://xmpp.org/rfcs/rfc6120.html#streams-negotiation-basics


Key Features

- Real-Time Messaging: XMPP enables real-time exchange of messages between users, allowing for instant communication over the Internet. Messages can be text-based, multimedia, or even command-driven, providing flexibility in communication.
- Presence Information: XMPP includes built-in support for presence information, allowing users to see the online status of their contacts in real-time. Presence information indicates whether a user is available, away, busy, or offline, enhancing communication efficiency.
- Decentralized Architecture: XMPP follows a decentralized architecture, meaning there is no central server controlling the communication network. Instead, XMPP operates on a federated model, where multiple servers communicate with each other to facilitate message exchange.
- Extensibility: One of the core principles of XMPP is its extensibility, allowing developers to extend and customize the protocol to meet specific application requirements. This extensibility enables the integration of additional features such as file sharing, group chat, and encryption.
- Open Standards: XMPP is built on open standards and specifications, ensuring interoperability among different XMPP-compliant servers and clients. This openness promotes innovation and collaboration within the XMPP ecosystem.

* `roster`: refers to a contact list.



----

### Key aspects of `presence` in XMPP:

- `Status Information`: Presence includes information about a user's current status, which can be represented using textual or symbolic indicators. Common statuses include "online," "offline," "away," "busy," "extended away," and custom statuses.
- `Availability`: Presence indicates whether a user is currently available for communication or not. This availability information helps other users know when they can reach out to someone and when they should expect a response.
- `Presence Stanzas`: Presence information in `XMPP is communicated using XML-based` messages called "presence stanzas." These stanzas contain metadata about the user's presence, such as their status, availability, and additional details.
- `Subscription`: XMPP allows users to subscribe to each other's presence updates. This means that users can receive notifications when the presence status of a subscribed user changes. Subscription mechanisms enable features like buddy lists and contact rosters.
- `Presence Priorities`: XMPP allows users to set presence priorities to indicate the importance or urgency of their presence information. Higher priority presence updates may override lower priority ones in certain clients or systems.
- `Presence Probes`: XMPP clients can send presence probes to inquire about the availability and status of other users without subscribing to their presence updates. Presence probes help retrieve real-time presence information without continuous subscription.
- `Presence Notifications`: When a user's presence changes, XMPP sends notifications to subscribed users to inform them about the update. These notifications enable real-time awareness of changes in the availability and status of contacts.





#### pres_request
```javascript
var iq_request = $iq({
            "type": "get",
            "id": MyMessagingService.XMPP.getUniqueId(),
            "from": MyMessagingService.XMPP.jid
        });
        iq_request.c("vCard", {
            "xmlns": "vcard-temp"
        });

        MyMessagingService.XMPP.sendIQ(iq_request, function (result)
```

 the pres_request variable refers to a presence stanza request, which is used to communicate a user's online status, availability, and other presence-related information. The type attribute of the presence stanza indicates the purpose or context of the presence update. Here's an explanation of different type values for pres_request:

- `Available (type="available")`:
This presence type indicates that the entity (user) is available for communication.
It's typically sent when a user logs in or becomes available after being offline.
- `Unavailable (type="unavailable")`:
This presence type indicates that the entity (user) is no longer available for communication.
It's sent when a user logs out or goes offline.
- `Subscribe (type="subscribe")`:
This presence type is used to request permission to subscribe to another entity's presence updates.
It's sent when a user wants to receive notifications about another user's presence changes.
- `Subscribed (type="subscribed")`:
This presence type indicates that the subscription request has been accepted.
It's sent in response to a subscription request to confirm that the subscription is now active.
- `Unsubscribe (type="unsubscribe")`:
This presence type is used to cancel a subscription to another entity's presence updates.
It's sent when a user no longer wants to receive notifications about another user's presence changes.
- `Unsubscribed (type="unsubscribed")`:
This presence type indicates that the subscription cancellation request has been accepted.
It's sent in response to an unsubscribe request to confirm that the subscription has been canceled.
- `Probe (type="probe")`:
This presence type is used to query the presence status of another entity without subscribing to updates.
It's sent when a user wants to check the presence status of another user without initiating a subscription.
- `Error (type="error")`:
This presence type indicates an error condition in the presence stanza.
It's sent when there's an issue processing the presence update request.


Each of these presence types serves a specific purpose in managing presence information and communication between entities in an XMPP network. The choice of type depends on the desired action or interaction with the presence system.

---

### XMPP Send Delivery and Display Receipts
The SendDeliveryReceipt and SendDisplayReceipt functions are essential components of XMPP (Extensible Messaging and Presence Protocol) messaging systems. They enable the delivery and acknowledgment of message receipts, providing users with valuable feedback on the status of their messages.

- `SendDeliveryReceipt`: This function is responsible for sending delivery receipts to notify the sender that their message has been successfully delivered to the recipient's device or client. It ensures message reliability by confirming that the message reached its intended destination.
- `SendDisplayReceipt`: Similar to delivery receipts, the SendDisplayReceipt function sends display receipts to indicate when a message has been successfully displayed or viewed by the recipient. It enhances user experience by providing confirmation that the message has been read or accessed.

### XMPP On Ping and Version Requests
The `OnPingRequest` and `OnVersionRequest` functions are integral components of XMPP (Extensible Messaging and Presence Protocol) systems. They handle incoming ping and version requests, providing essential information and maintaining communication integrity.

- `OnPingRequest`: This function handles incoming ping requests, also known as XMPP Ping, which are used to check the connectivity status between XMPP entities. It responds with a pong message to confirm the connection and ensure its stability.
- `OnVersionRequest`: The OnVersionRequest function processes version requests from XMPP clients, which solicit information about the software version and capabilities of the XMPP server. It responds with details such as the server name, software version, and supported features.

### XMPP On Info Query Handlers
The `OnInfoQuery`, `OnInfoQueryRequest`, and `OnInfoQueryCommand` functions are essential handlers in XMPP (Extensible Messaging and Presence Protocol) systems. They manage information queries and responses, facilitating communication and data exchange between XMPP entities.

- `OnInfoQuery`: This function processes incoming info query requests initiated by XMPP clients or servers. It handles queries related to retrieving metadata, service capabilities, or other information. Upon receiving a query, it formulates an appropriate response containing the requested data.
- `OnInfoQueryRequest`: The OnInfoQueryRequest function specifically handles info query requests received by the XMPP server. It extracts relevant details from the query, such as the requested information's namespace or parameters, and generates a suitable response based on the server's configuration or capabilities.
- `OnInfoQueryCommand`: This function deals with specialized info query commands or directives received within XMPP systems. It interprets the command parameters, executes the corresponding actions or operations, and produces an informative response or performs the required tasks as specified by the command.

### Vcard Managment
- `GetMyVcard`: The GetMyVcard function retrieves the vcard (virtual business card) associated with the current XMPP user. It fetches personal profile information such as display name, avatar, contact details, and other metadata stored in the user's vcard.
- `SetMyVcard`: The SetMyVcard function allows the XMPP user to update or modify their vcard information. It accepts new profile data as input and updates the user's vcard accordingly, ensuring that the latest information is reflected in the XMPP system.

### XMPP Roster Management
The `AddBuddyToRoster` and `RemoveBuddyFromRoster` functions are essential for managing the roster, also known as the contact list, in XMPP (Extensible Messaging and Presence Protocol) systems.
- `AddBuddyToRoster`: This function adds a new contact or buddy to the user's roster. It creates a roster entry with the specified contact details, including the JID (Jabber Identifier) and display name, allowing the user to establish communication with the added contact.
- `RemoveBuddyFromRoster`: The RemoveBuddyFromRoster function removes a contact or buddy from the user's roster. It deletes the roster entry associated with the specified contact, effectively removing them from the user's contact list and discontinuing communication.

### XMPP OnMessage
The `OnMessage` function is a critical component of XMPP client applications, responsible for handling incoming messages exchanged between users.

#### **Functionality**

- `Message Reception`: The OnMessage function receives XMPP messages delivered to the user's client application. It parses and processes the incoming message data to extract relevant information such as the sender, recipient, message content, and delivery status.
- `Message Parsing`: Upon receiving a message, the function parses the XML-based message structure to extract key elements such as the sender's JID (Jabber Identifier), message content, message ID, and delivery status indicators.
- `Message Handling`: After extracting message details, the function performs various tasks based on the message content and metadata. These tasks may include displaying the message to the user, handling message corrections, managing message delivery events, and updating message status.
- `Message Receipt Acknowledgment`: The function acknowledges message receipt by sending delivery receipts and display receipts to the message sender, indicating that the message has been successfully received and/or displayed by the recipient.


#### Importance

- `Real-Time Communication`: The OnMessage function facilitates real-time communication by handling incoming messages promptly, ensuring that users receive messages from their contacts without delay.
- `Message Integrity`: By parsing and processing incoming messages, the function helps maintain message integrity by ensuring that messages are correctly interpreted and displayed to the user, preserving the intended communication context.
- `User Engagement`: Effective message handling enhances user engagement by providing a seamless messaging experience, allowing users to interact with their contacts and exchange messages effortlessly within the XMPP application.

#### Implementation

- `XMPP Message Protocol`: The OnMessage function adheres to the XMPP message protocol specifications, which define the structure and semantics of XMPP messages. It utilizes XML parsing and processing techniques to extract message data and metadata from incoming XML-based message stanzas.
- `Event-Driven Architecture`: Implemented within an event-driven architecture, the function is triggered automatically upon receiving an incoming message event from the XMPP server. It responds to message events asynchronously, ensuring responsiveness and scalability in message handling.
- `Error Handling`: The function includes error handling mechanisms to address potential issues such as message parsing errors, network disruptions, and message delivery failures. It logs errors and may notify users of any communication failures or inconsistencies.


#### Usage

- `Message Display:` Upon receiving a message, the OnMessage function displays the message content to the user within the XMPP client interface, providing a seamless messaging experience.
- `Message Correction`: If the incoming message includes correction indicators, such as the "replace" element, the function handles message corrections by updating or replacing the original message content as appropriate.
- `Delivery Receipts`: The function sends delivery receipts and display receipts to the message sender, acknowledging successful message receipt and display by the recipient. This enhances message delivery tracking and ensures message accountability.
