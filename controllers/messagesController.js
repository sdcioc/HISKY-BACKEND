var MongoClient = require('mongodb').MongoClient
var ObjectId = require('mongodb').ObjectID
var Settings = require('../settings/settings')
var moment = require('moment')
var async = require('async')


var url = Settings.mongoAdd()
var dbcon;
MongoClient.connect(url, function(err, database) {
  if (!err){
    dbcon = database
  }
});


function generateRoom(people) {
    console.log("MES ---- before sort:", people)
    people.sort()
    console.log("MES ---- after sort:", people)
    return people[0].valueOf() + people[1].valueOf()
}


exports.addSocketMessage = (user, message) => {
    return new Promise( (resolve, reject) => {
        console.log(message);
        var users_collection = dbcon.collection('users');
        users_collection.findOne({username: message.to}, (err, myResult) => {
            if(err) {
                reject(err);
            } else {
                message.from = user.username;
                message.sentAt = new Date(message.sentAt);
                message.from_uid  = ObjectId (user._id);
                message.to_uid  = ObjectId (myResult._id);
                var roomId = generateRoom([ message.from_uid, message.to_uid])
                message.roomId = roomId;
                var messagesCollection = dbcon.collection('messages')
                messagesCollection.insertOne(message, (err, resultMessage) => {
                    if(err) {
                        reject(err);
                    } else {
                        message.result = resultMessage;
                        resolve(message);
                    }
                });
            }
        });
    });
}

exports.addMessage = (message) => {
    console.log(message);
    message.sentAt = new Date(message.sentAt);
    message.from_uid  = ObjectId (message.from_uid)
    message.to_uid  = ObjectId (message.to_uid)
    var roomId = generateRoom([ message.from_uid, message.to_uid])
    message.roomId = roomId;
    messagesCollection = dbcon.collection('messages')
    return messagesCollection.insertOne(message)
}




function fromUIDToObjectID(array) {
    var results = [];
    array.forEach((uid) => {
        results.push(ObjectId(uid));
    })
    return results
}

exports.getMessages = (uids,skip,limit) => {
    // uids este un array de id-uri din conversatie....
    var uidsObjects = fromUIDToObjectID(uids)
    messagesCollection = dbcon.collection('messages')
    return messagesCollection.find({from_uid:  {$in : uidsObjects}, to_uid: {$in : uidsObjects} }).sort({sentAt:-1}).skip(skip).limit(limit).toArray();
}

exports.getSocketMessages = (user, req) => {
    return new Promise( (resolve, reject) => {
        var users_collection = dbcon.collection('users');
        users_collection.findOne({username: req.to}, (err, myResult) => {
            if(err) {
                reject(err);
            } else {
                var uids = [user._id, myResult._id];
                var uidsObjects = fromUIDToObjectID(uids);
                messagesCollection = dbcon.collection('messages');
                var messageArray = messagesCollection.find({from_uid:  {$in : uidsObjects}, to_uid: {$in : uidsObjects} }).sort({sentAt:-1}).skip(req.skip).limit(req.limit).toArray();
                resolve(messageArray);
            }
        });
    });
}

var q = async.queue(function (uid, callback) {
        callback(uid)
}, Infinity);


exports.getConversations = (req,res) => {
    console.log("A intrat unde trebuie")
    if(!req.user_id) {
        console.log("a dat nasoala")
        res.json({operation:"failure", reason:"No id provided"});
    } else {
        messagesCollection = dbcon.collection('messages')
        var cursor = messagesCollection.aggregate([
            {$match: { $or: [  {from_uid: ObjectId(req.user_id) }, {to_uid: ObjectId(req.user_id) }] } },
            { $sort : { sentAt : -1} },
            {$group : { _id : "$roomId", count: { $sum: 1 }, last_message: {$first: "$text"}, "from_uid":{$first: "$from_uid"}, to_uid:{$first: "$to_uid"} ,
            "from":{$first: "$from"}, to:{$first: "$to"} , "last_sentAt": {$first:"$sentAt"}}}
        ], { cursor: { batchSize: 1 } });
        // Get all the aggregation results
        console.log(" a ajuns undeva")
        var array = []
        cursor.forEach((conv) => {
            console.log(" ======Start========")
            console.log("raw cursor :", conv)
            conv.last_sentAt = moment(conv.last_sentAt).format('MMMM Do YYYY, h:mm:ss a');
            console.log("the from_uid is:", conv.from_uid)
            console.log("the to_uid is:", conv.to_uid)
            q.push({}, (user)=> {
                array.push(conv);
            })
            console.log(" ======End========")
        })
        q.drain = function() {
            console.log("test ----@@@@")
            console.log("%%%%%%%%%%%%%%%  the array:", array);
            var sort_function = function(a,b) {
              return moment(b.last_sentAt,'MMMM Do YYYY, h:mm:ss a')._d - moment(a.last_sentAt,'MMMM Do YYYY, h:mm:ss a')._d;
            };
            array = array.sort(sort_function);
            res.json({operation: "success", result: array});
        }
    }
}
