exports.helloworld = function (){
    console.log("Hello World!");
    return "Hello World!";
}

exports.connect = function () {
    console.log("Connecting...");
    return "Connecting...";
};

exports.disconnect = function () {
    console.log("Disconnecting...");
    return "Disconnecting...";
};

exports.init = function (){
    var settings = {};
    settings.host = "localhost";
    settings.port = 5672;
    settings.username = "guest";
    settings.password = "<PASSWORD>";
    return settings;
};