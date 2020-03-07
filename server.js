/**
 * Created by dancioc on 19/03/2017.
 * contains urls and specifications
 */
// Load required packages

var cluster = require('cluster');
var schedule = require('node-schedule');
var moment = require('moment');
var express = require('express');
var mongoose = require('mongoose');
var bodyParser = require('body-parser');
var MongoClient = require('mongodb').MongoClient
var fs = require('fs')
var morgan = require('morgan')
var fs = require('fs');
var https = require('https');
var http = require('http');
var path = require('path')
var hostname = require('os').hostname();

// controllers
var loginController = require('./controllers/loginController');
var connectionsController = require('./controllers/connectionsController');
var userinfoController = require('./controllers/userinfoController');
var messagesController = require('./controllers/messagesController');
var interceptor = require('express-interceptor');

// helpers
var Settings = require('./settings/settings')
var url = Settings.mongoAdd()
mongoose.connect(url);

// Create our Express application
var app = express();
var http_app_express = express();



app.use(bodyParser.urlencoded({
    extended: true
}), bodyParser.json());
app.use(function (req, res, next) {

    console.log("a venit macar cererea https")
    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', 'https://www.xn--ciocrlan-o2a.ro');

    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

    // Request headers you wish to allow/**
    res.setHeader('Access-Control-Allow-Headers', 'Origin, Accept, x-access-token, X-Requested-With, content-type, X-Requested-By');

    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Max-Age', "86400");
    res.setHeader('Access-Control-Expose-Headers', 'Cache-Control, Content-Language, Content-Type, Expires, Last-Modified, Pragma');


    // Pass to next layer of middleware
    next();
});



http_app_express.use(bodyParser.urlencoded({
    extended: true
}), bodyParser.json());
http_app_express.use(function (req, res, next) {

    console.log("a venit macar cererea http")
    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

    // Request headers you wish to allow/**
    res.setHeader('Access-Control-Allow-Headers', 'Origin, Accept, x-access-token, X-Requested-With, content-type, X-Requested-By');

    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Max-Age', "86400");
    res.setHeader('Access-Control-Expose-Headers', 'Cache-Control, Content-Language, Content-Type, Expires, Last-Modified, Pragma');


    // Pass to next layer of middleware
    next();
});



var router = express.Router();


// ======================================
// Customers API
// ======================================

// SIGNUP AND LOGIN
router.route('/login').post(loginController.login);
router.route('/signup').post(loginController.signup);
// SIGNUP AND LOGIN - end

//USER
router.route('/user/personal').get(loginController.authMiddle, userinfoController.getUserPersonalInfo);

router.route('/user/basic').get(loginController.authMiddle, userinfoController.getUserBasicInfo);
//USER - end

// USERINFO
router.route('/userinfo').post(loginController.authMiddle, userinfoController.getUserinfo);
router.route('/userinfoId').post(loginController.authMiddle, userinfoController.getUserinfoId);
// USERINFO - end


// CONNECTIONS
router.route('/connectionsList').get(loginController.authMiddle, connectionsController.getConnectionsList);
router.route('/connectionsRequest').get(loginController.authMiddle, connectionsController.getConnectionsRequest);
router.route('/connectionsReuqest/send').post(loginController.authMiddle, connectionsController.sentConnectionsRequest);
router.route('/connectionsReuqest/accept').post(loginController.authMiddle, connectionsController.acceptConnectionsRequest);
// CONNECTIONS - end
console.log("merge")

router.route('/messages/conversations').get(loginController.authMiddle, messagesController.getConversations);


// Register all our routes with /api
app.use('/api', router);
http_app_express.use('/api', router);



var privateKey  = fs.readFileSync('sslcert/key.pem', 'utf8');
var certificate = fs.readFileSync('sslcert/cert.pem', 'utf8');
var cachain = fs.readFileSync('sslcert/chain.pem', 'utf8');

var cors = require('cors');
app.use(cors());
http_app_express.use(cors());

var credentials = {key: privateKey, cert: certificate, ca : cachain};

var httpsServer = https.createServer(credentials, app);

var httpServer = http.createServer(http_app_express);

var server = require('https').Server(app);

var ioServer = require('socket.io');
var io = new ioServer();
//var io = require('socket.io')(httpsServer);

httpsServer.listen(443, function () {
    console.log("https server");
    console.log("Server started at port 433");
});

httpServer.listen(80, function () {
    console.log("http server");
    console.log("Server started at port 80");
});
// definesc SOCKET.IO

io.attach(httpServer);
io.attach(httpsServer);

var peopleSocketsID = {};
var socketsUser = {};


io.on('connection', (socket) => {
    console.log('SOCKET ----- A user connected');

    socket.on('disconnect', () => {
        console.log('SOCKET ----- user disconnected username: ', socketsUser[socket.id]);
        console.log('SOCKET ----- user disconnected socke.id: ', socket.id);
        if(socketsUser[socket.id] != undefined) {
            var username = socketsUser[socket.id];
            peopleSocketsID[socketsUser[socket.id]] = undefined;
            socketsUser[socket.id] = undefined;
            console.log("peoplesockket", peopleSocketsID);
            console.log("socket user", socketsUser);
            /*
            TODO:
            anutam prietenii ca este offline
            */
            var user = {};
            user.username = username;
            connectionsController.getSocketConnectionsList2(user).then( (userConnections) => {
                connectionsList = userConnections.connections_list;
                for (var index in connectionsList) {
                    var connection = connectionsList[index];
                    if (connection in peopleSocketsID) {
                        socket.to(peopleSocketsID[connection]).emit("connection/offline", user.username);
                    }
                }
            }, (err) => {
                console.log("Erorr", err);
            });
        }
    });
    /*
    socket.on('online', (data, ack) => {
        console.log('SOCKET ----- the user go online :', data);
        loginController.authSocketMiddle(data.token).then( (user) => {
            peopleSocketsID[user.username] = String(socket.id);
            socketsUser[socket.id] = String(user.username);
            console.log('SOCKET ----- the user go online - peopleSocketsID :',peopleSocketsID);
            console.log('SOCKET ----- the user go online - socketsUser:', socketsUser);
            connectionsController.getSocketConnectionsList(user).then( (userConnections) => {
                var responseData = {};
                connectionsList = userConnections.connections_list;
                for (var index in connectionsList) {
                    var connection = connectionsList[index];
                    if (peopleSocketsID[connection] != undefined) {
                        responseData[connection] = true;
                        socket.to(peopleSocketsID[connection]).emit("connection/online", user.username);
                    } else {
                        responseData[connection] = false;
                    }
                }
                console.log("date de return", responseData);
                ack(responseData);
            }, (err) => {
                console.log("Erorr", err);
                ack("Erorr");
            });
        }, (err) => {
            console.log("Erorr", err);
                ack("Erorr");
        });
    });
    */

    socket.on('online', (data, ack) => {
        console.log('SOCKET ----- the user go online :', data);
        loginController.authSocketMiddle(data.token).then( (user) => {
            peopleSocketsID[user.username] = String(socket.id);
            socketsUser[socket.id] = String(user.username);
            console.log('SOCKET ----- the user go online - peopleSocketsID :',peopleSocketsID);
            console.log('SOCKET ----- the user go online - socketsUser:', socketsUser);
            connectionsController.getSocketConnectionsList(user).then( (userConnections) => {
                //var responseData = {};
                connectionsList = userConnections.connections_list;
                for (var index in connectionsList) {
                    var connection = connectionsList[index];
                    if (peopleSocketsID[connection] != undefined) {
                        //responseData[connection] = true;
                        socket.to(peopleSocketsID[connection]).emit("connection/online", user.username);
                    } else {
                        //responseData[connection] = false;
                    }
                }
                console.log("a intrat online");
                ack("success");
            }, (err) => {
                console.log("Erorr", err);
                ack("Erorr");
            });
        }, (err) => {
            console.log("Erorr", err);
                ack("Erorr");
        });
    });

    socket.on('getConnections', (data, ack) => {
        console.log('SOCKET ----- the user want connections :', data);
        loginController.authSocketMiddle(data.token).then( (user) => {
            peopleSocketsID[user.username] = socket.id;
            socketsUser[socket.id] = user.username;
            connectionsController.getSocketConnectionsList(user).then( (userConnections) => {
                var responseData = {};
                connectionsList = userConnections.connections_list;
                for (var index in connectionsList) {
                    var connection = connectionsList[index];
                    if (peopleSocketsID[connection] != undefined) {
                        responseData[connection] = true;
                    } else {
                        responseData[connection] = false;
                    }
                }
                console.log("date de return", responseData);
                ack(responseData);
            }, (err) => {
                console.log("Erorr", err);
                ack("Erorr");
            });
        }, (err) => {
            console.log("Erorr", err);
                ack("Erorr");
        });
    });


    socket.on('addConnection', (data, ack) => {
        console.log('SOCKET ----- the user add connection :', data);
        loginController.authSocketMiddle(data.token).then( (user) => {
            connectionsController.addSocketConnection(user, data.connectionUser).then( (userResponse) => {
                console.log("Cereri de prietenie", userResponse);
                var responseData = {};
                responseData = userResponse;
                console.log("date de return", responseData);
                ack(responseData);
            }, (err) => {
                console.log("Erorr", err);
                ack("Erorr");
            });
        }, (err) => {
            console.log("Erorr", err);
                ack("Erorr");
        });
    });
    /*
    socket.on('message/post', (messageObject, ack) => {
        console.log("the room is", messageObject.room)
        messagesController.addMessage(messageObject.message).then((data) => {
            if (peopleSocketsID[messageObject.to] != undefined) {
                socket.to(peopleSocketsID[messageObject.to]).emit('message/receive', messageObject);
                console.log('SOCKET -----  real sent');
            }
            console.log('SOCKET -----  sent the message further');
            ack(messageObject);
        })

    });
    */
    socket.on('message/post', (messageObject, ack) => {
        console.log("the room is", messageObject)
        loginController.authSocketMiddle(messageObject.token).then( (user) => {
            messagesController.addSocketMessage(user, messageObject).then((data) => {
                messageObject.from = user.username;
                if (peopleSocketsID[messageObject.to] != undefined) {
                    socket.to(peopleSocketsID[messageObject.to]).emit('message/receive', messageObject);
                    console.log('SOCKET -----  real sent');
                }
                console.log('SOCKET -----  sent the message further');
                ack(data);
            })
        }, (err) => {
            console.log("Erorr", err);
            ack("Erorr");
        });
    });
    /*
    socket.on('message/get', (req, ack) => {
        console.log(req)
        loginController.authSocketMiddle(req.token).then( (user) => {
            req.uids = [user._id, req.to];
            console.log("a intrat aici", req);
            messagesController.getMessages(req.uids, req.skip, req.limit).then((messages) => {
                console.log('SOCKET ----- the user got :', messages);
                ack(messages.reverse());
            }).catch((err)=> {
                console.log("!!!!ceva nu e ok", err)
            })
         }, (err) => {
            console.log("Erorr", err);
            ack("Erorr");
        });
    });
    */
    socket.on('message/get', (req, ack) => {
        console.log(req)
        loginController.authSocketMiddle(req.token).then( (user) => {
            console.log("a intrat aici", req);
            messagesController.getSocketMessages(user, req).then((messages) => {
                console.log('SOCKET ----- the user got :', messages);
                ack(messages.reverse());
            }).catch((err)=> {
                console.log("!!!!ceva nu e ok", err)
            })
         }, (err) => {
            console.log("Erorr", err);
            ack("Erorr");
        });
    });


    socket.on('videoCall/startCall', (messageObject, ack) => {
        messageObject.from = socketsUser[socket.id];
        console.log('SOCKET ----- the user sent a message :', messageObject);
        if (peopleSocketsID[messageObject.to] != undefined) {
            socket.to(peopleSocketsID[messageObject.to]).emit('videoCall/startCall', messageObject);
        }

        console.log('SOCKET -----  sent the message further');
        ack(messageObject);

    });

    socket.on('videoCall/startForceCall', (messageObject, ack) => {
        messageObject.from = socketsUser[socket.id];
        console.log('SOCKET ----- the user sent a message :', messageObject);
        if (peopleSocketsID[messageObject.to] != undefined) {
            socket.to(peopleSocketsID[messageObject.to]).emit('videoCall/startForceCall', messageObject);
        }

        console.log('SOCKET -----  sent the message further');
        ack(messageObject);

    });
    
    socket.on('videoCall/acceptCall', (messageObject, ack) => {
        messageObject.from = socketsUser[socket.id];
        console.log('SOCKET ----- the user sent a message :', messageObject);
        if (peopleSocketsID[messageObject.to] != undefined) {
            socket.to(peopleSocketsID[messageObject.to]).emit('videoCall/acceptCall', messageObject);
        }

        console.log('SOCKET -----  sent the message further');
        ack(messageObject);

    });
    socket.on('videoCall/stopCall', (messageObject, ack) => {
        messageObject.from = socketsUser[socket.id];
        console.log('SOCKET ----- the user sent a message :', messageObject);
        if (peopleSocketsID[messageObject.to] != undefined) {
            socket.to(peopleSocketsID[messageObject.to]).emit('videoCall/stopCall', messageObject);
        }

        console.log('SOCKET -----  sent the message further');
        ack(messageObject);

    });
    socket.on('videoCall/iceCandidate', (messageObject, ack) => {
        messageObject.from = socketsUser[socket.id];
        console.log('SOCKET ----- the user sent a message :', messageObject);
        if (peopleSocketsID[messageObject.to] != undefined) {
            socket.to(peopleSocketsID[messageObject.to]).emit('videoCall/iceCandidate', messageObject);
        }

        console.log('SOCKET -----  sent the message further');
        ack(messageObject);

    });
    socket.on('videoCall/restartIceOffer', (messageObject, ack) => {
        messageObject.from = socketsUser[socket.id];
        console.log('SOCKET ----- the user sent a message :', messageObject);
        if (peopleSocketsID[messageObject.to] != undefined) {
            socket.to(peopleSocketsID[messageObject.to]).emit('videoCall/restartIceOffer', messageObject);
        }

        console.log('SOCKET -----  sent the message further');
        ack(messageObject);

    });
    socket.on('videoCall/restartIceAnswer', (messageObject, ack) => {
        messageObject.from = socketsUser[socket.id];
        console.log('SOCKET ----- the user sent a message :', messageObject);
        if (peopleSocketsID[messageObject.to] != undefined) {
            socket.to(peopleSocketsID[messageObject.to]).emit('videoCall/restartIceAnswer', messageObject);
        }

        console.log('SOCKET -----  sent the message further');
        ack(messageObject);

    });
    socket.on('videoCall/rejectCall', (messageObject, ack) => {
        messageObject.from = socketsUser[socket.id];
        console.log('SOCKET ----- the user sent a message :', messageObject);
        if (peopleSocketsID[messageObject.to] != undefined) {
            socket.to(peopleSocketsID[messageObject.to]).emit('videoCall/rejectCall', messageObject);
        }

        console.log('SOCKET -----  sent the message further');
        ack(messageObject);

    });
    socket.on('videoCall/forceRejectCall', (messageObject, ack) => {
        messageObject.from = socketsUser[socket.id];
        console.log('SOCKET ----- the user sent a message :', messageObject);
        if (peopleSocketsID[messageObject.to] != undefined) {
            socket.to(peopleSocketsID[messageObject.to]).emit('videoCall/forceRejectCall', messageObject);
        }

        console.log('SOCKET -----  sent the message further');
        ack(messageObject);

    });
});
