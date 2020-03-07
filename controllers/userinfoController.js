/**
 * Created by dancioc on 19/03/2017.
 */
var moment = require('moment');
var MongoClient = require('mongodb').MongoClient
var Settings = require('../settings/settings')
var ObjectId = require('mongodb').ObjectID
var url = Settings.mongoAdd()
var dbcon;

MongoClient.connect(url, function (err, database) {
    if (!err) {
        dbcon = database;
    } else {
        console.log("loginController.js connect to DB failed");
    }
});

exports.getUserinfo = function (req, res) {
    if(!req.body.username) {
         res.status(400).json({operation: "failure", reason: "Not all fields provided"});
    } else {
        var users_collection = dbcon.collection('users');
        users_collection.findOne({username: req.body.username}, (err, myResult) => {
            if(err) {
                res.json({operation: "failed", result: err});
            } else {
                res.json({operation: "success", result: myResult});
            }
        });
    }
}

exports.getUserPersonalInfo = function (req, res) {
    if(!req.user_id) {
         res.status(400).json({operation: "failure", reason: "Not all fields provided"});
    } else {
        var users_collection = dbcon.collection('users');
        users_collection.findOne({username: req.user_id}, (err, myResult) => {
            if(err) {
                res.json({operation: "failed", result: err});
            } else {
                res.json({operation: "success", result: myResult});
            }
        });
    }
}


exports.getUserinfoId = function (req, res) {
    if(!req.body.user_id) {
         res.status(400).json({operation: "failure", reason: "Not all fields provided"});
    } else {
        var users_collection = dbcon.collection('users');
        users_collection.findOne({_id: ObjectId(req.body.user_id)}, (err, myResult) => {
            if(err) {
                res.json({operation: "failed", result: err});
            } else {
                res.json({operation: "success", result: myResult});
            }
        });
    }
}