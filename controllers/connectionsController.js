/**
 * Created by dancioc on 19/03/2017.
 */
var moment = require('moment');
var MongoClient = require('mongodb').MongoClient
var Settings = require('../settings/settings')
var ObjectId = require('mongodb').ObjectID
var url = Settings.mongoAdd()
var bcrypt = require('bcrypt-nodejs');
var dbcon;

MongoClient.connect(url, function (err, database) {
    if (!err) {
        dbcon = database;
    } else {
        console.log("loginController.js connect to DB failed");
    }
});

exports.getConnectionsList = function(req, res) {
    if(!req.user_id) {
        res.status(400).json({operation: "failure", reason: "Not all fields provided"});
    } else {
        var connectionsList_collection = dbcon.collection('connections_list');
        connectionsList_collection.findOne({_id: ObjectId(req.user_id)},{connections_list : 1}, (err, myList) => {
            if(err) {
                res.json({operation: "failed", result: err});
            } else {
                res.json({operation: "success", result: myList});
            }
        });
    }
}

exports.getConnectionsRequest = function(req, res) {
    if(!req.user_id) {
        res.status(400).json({operation: "failure", reason: "Not all fields provided"});
    } else {
        var connectionsRequest_collection = dbcon.collection('connections_request');
        connectionsRequest_collection.find({to: ObjectId(req.user_id)}, {from : 1, from_username : 1}).toArray((err, requestArray) => {
            if(err) {
                res.json({operation: "failed", result: err});
            } else {
                res.json({operation: "success", result: requestArray});
            }
        });
    }
}

exports.sentConnectionsRequest = function(req, res) {
    if(!req.user_id || !req.body.username || !req.username) {
        res.status(400).json({operation: "failure", reason: "Not all fields provided"});
    } else {
        var connectionsRequest_collection = dbcon.collection('connections_request');
        var userinfo_collection = dbcon.collection('users');

        userinfo_collection.findOne({username: req.body.username}, {_id : 1}, (err, result) => {
            if(err) {
                res.json({operation: "failure", result: err});
            } else {
                var requestToAdd = {
                    from : ObjectId(req.user_id),
                    to: result._id,
                    from_username : req.username,
                    to_username : req.body.username
                };
                connectionsRequest_collection.insertOne(requestToAdd, (err, result) => {
                    if(err) {
                        res.json({operation: "failure", result: err});
                    } else {
                        res.json({operation: "success", result: result});
                    }
                });
            }
        });
    }
}

exports.acceptConnectionsRequest = function(req, res) {
    if(!req.user_id || !req.body.user_id || !req.username || !req.body.username) {
        res.status(400).json({operation: "failure", reason: "Not all fields provided"});
    } else {
        var connectionsRequest_collection = dbcon.collection('connections_request');
        var connectionsList_collection_1 = dbcon.collection('connections_list');
        var connectionsList_collection_2 = dbcon.collection('connections_list');
        var requestToDelete = {
            from : ObjectId(req.body.user_id),
            to: ObjectId(req.user_id)
        };
        connectionsRequest_collection.deleteOne(requestToDelete, (err, result) => {
            if(err) {
                res.json({operation: "failure", result: err});
            } else {
                console.log("sending success of deletion")
                connectionsList_collection_1.update({"_id" : ObjectId(req.user_id)}, 
                        {"$push" : {"connections_list" : req.body.username}}, (err, result) => {
                        if(err) {
                            res.json({operation: "failure", result: err});
                        } else {
                            connectionsList_collection_2.update({"_id" : ObjectId(req.body.user_id)}, 
                                    {"$push" : {"connections_list" : req.username}}, (err, result) => {
                                    if(err) {
                                        res.json({operation: "failure", result: err});
                                    } else {
                                        res.json({operation: "success", result: result});
                                    }
                            });
                        }
                });
            }

        })
    }
}


exports.getSocketConnectionsList = function(user) {

    var promise = new Promise( (resolve, reject) => {
        if(!user._id) {
            reject({operation: "failure", reason: "Not all fields provided"});
        } else {
            var connectionsList_collection = dbcon.collection('connections_list');
            connectionsList_collection.findOne({_id: ObjectId(user._id)},{connections_list : 1}, (err, myList) => {
                if(err) {
                    reject(err);
                } else {
                    resolve(myList);
                }
            });
        }
    })
    return promise;
}


exports.getSocketConnectionsList2 = function(user) {
    var promise = new Promise( (resolve, reject) => {
        if(!user.username) {
            console.log("e cam promisiune", user);
            reject({operation: "failure", reason: "Not all fields provided"});
        } else {
            var connectionsList_collection = dbcon.collection('connections_list');
            connectionsList_collection.findOne({"username": user.username},{connections_list : 1}, (err, myList) => {
                if(err) {
                    reject(err);
                } else {
                    resolve(myList);
                }
            });
        }
    })
    return promise;
}


exports.getSocketConnectionRequest = function(user) {
    var promise = new Promise( (resolve, reject) => {
        if(!user._id) {
            reject({operation: "failure", reason: "Not all fields provided"});
        } else {
            var connectionsRequest_collection = dbcon.collection('connections_request');
            connectionsRequest_collection.find({to: ObjectId(user.user_id)}, {from : 1, from_username : 1}).toArray((err, requestArray) => {
                if(err) {
                    reject(err);
                } else {
                    resolve(requestArray);
                }
            });
        }
    });
    return promise;
}



exports.addSocketConnection = function(firstuser, seconduser) {
    var promise = new Promise( (resolve, reject) => {
        console.log("firstuser", firstuser);
        console.log("seconduser", seconduser);

        if(!firstuser._id || !seconduser.user_id || !firstuser.username || !seconduser.username) {
            reject({operation: "failure", reason: "Not all fields provided"});
        } else {
            var connectionsList_collection_1 = dbcon.collection('connections_list');
            var connectionsList_collection_2 = dbcon.collection('connections_list');
            connectionsList_collection_1.update({"_id" : ObjectId(firstuser._id)}, 
                    {"$push" : {"connections_list" : seconduser.username}}, (err, result) => {
                    if(err) {
                        reject({operation: "failure", result: err});
                    } else {
                        connectionsList_collection_2.update({"_id" : ObjectId(seconduser.user_id)}, 
                                {"$push" : {"connections_list" : firstuser.username}}, (err, result) => {
                                if(err) {
                                    reject({operation: "failure", result: err});
                                } else {
                                    resolve({operation: "success", result: result});
                                }
                        });
                    }
            });
        }
    });
    return promise;
}