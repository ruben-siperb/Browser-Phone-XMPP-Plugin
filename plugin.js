exports.helloworld = function (){
    return "Hello World!";
}

exports.connect = function () {
    return "Connecting...";
};

exports.disconnect = function () {
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