/**
 * Created by dancioc on 19/03/2017.
 */
var jwt = require('jsonwebtoken');
var moment = require('moment');
var MongoClient = require('mongodb').MongoClient
var Settings = require('../settings/settings')
var ObjectId = require('mongodb').ObjectID
var url = Settings.mongoAdd()
var bcrypt = require('bcrypt-nodejs');
var dbcon;

MongoClient.connect(url, function (err, database) {
    if (!err) {
        dbcon = database
    } else {
        console.log("loginController.js connect to DB failed");
    }
});

verifyPassword = function(password,password_hash, cb) {
    bcrypt.compare(password, password_hash, function(err, isMatch) {
        if (err)
            return cb(err);
        cb(null, isMatch);
    });
};

generateHash = function(password, callback) {
    bcrypt.genSalt(5, function(err, salt) {
        if (err)
            return callback(err);
        bcrypt.hash(password, salt, null, function(err, hash) {
            if (err)
                return callback(err);
            password = hash;
            callback(password);
        });
    });
};

createCredentials = function (credentials) {
    var promise = new Promise( (resolve, reject) =>{
        console.log("the credentials before", credentials)
        generateHash(credentials.password, (hashedPassword) => {
            credentials.password  = hashedPassword;
            console.log("the credentials after", credentials)
            var credentials_collection = dbcon.collection('users')
            credentials_collection.insertOne(credentials).then((creds)=> {
                resolve(creds);
            }).catch((err) =>{
                reject(err);
            })
        })
    })
    return promise
}

createUserinfo = function(userInfo) {
    console.log("The user info is", userInfo);
    var promise = new Promise( (resolve, reject) =>{
        var users_collection = dbcon.collection("users")
        users_collection.insertOne(userInfo).then((user)=>{
            console.log("am adaugat datele despre user");
            resolve(user);
        }).catch((err)=>{
            err.issue = "eroare la adaugat date despre user"
            reject(err)
        })
    })
    return promise
}

createUserConnectionsList = function(userInfo) {
    console.log("The user info is", userInfo);
    var ToAdd = {
        _id : userInfo._id,
        username : userInfo.username,
        connections_list : []
    };
    var promise = new Promise( (resolve, reject) =>{
        var connectionsList_collection = dbcon.collection("connections_list")
        connectionsList_collection.insertOne(ToAdd).then((user)=>{
            console.log("am adaugat datele despre user");
            resolve(user);
        }).catch((err)=>{
            err.issue = "eroare la adaugat date despre user"
            reject(err)
        })
    })
    return promise
}


validateUsername = function (username) {
    var promise = new Promise( (resolve, reject) =>{
        var credentials = dbcon.collection('credentials')
        credentials.findOne({"username":username}).then((found) => {
            if(found) {
                console.log("the user exists, ", found)
                reject()
            } else {
                console.log("the user does not exists, ", found)
                resolve()
            }
        })
    })
    return promise
}

exports.signup = function (req, res) {
    if (!req.body.username || !req.body.password || !req.body.email ||
        !req.body.type ) {
        res.status(400).json({success: false, result: "Not all fields provided"});
    } else {
        // validare daca nu exista deja email-ul!!!
        validateUsername(req.body.username).then(() => {
            console.log("in customer.js - trec mai departe, utilizatorul nu exista")
            // daca nu exista pot face utilizatoril
            // variabila care e trimisa mai departe pentru a forma credentials
            var credentialsToCreate = {
                password: req.body.password,
                username: req.body.username,
                email : req.body.email,
                type : req.body.type,
                createdAt: Date.now()
            }
            createCredentials(credentialsToCreate).then((credentials) => {
                //daca utilizatorul a fost creat cu success si acum are acces la app ->
                console.log("the inserted user id is,", credentials.insertedId);
            }).catch((err) => {
                res.json({success: false, result: err})
            })
        }).catch(() => {
            // utilizatorul deja exista;
            console.log("in login.js - nu pot sa  trec mai departe, utilizatorul exista")
            res.json({success: false, result: "user exists"})
        })
    }
}


exports.login = function (req, res) {
    console.log("username: ", req.body.username)
    var credentials_collection = dbcon.collection('users');
    var users_collection = dbcon.collection('users');
    credentials_collection.findOne({username: req.body.username}, function (err, user_credentials) {
        if (err) {
            res.json({success: false, message: 'Authentication failed. Fatal'});
        }
        // No user found with that username
        if (!user_credentials) {
            res.json({success: false, message: 'Authentication failed. User not found.'});
        } else {
            // Make sure the password is correct
            verifyPassword(req.body.password, user_credentials.password, function (err, isMatch) {
                if (err) {
                    res.json({success: false, message: 'Authentication failed. Fatal'});
                }
                // Password did not match
                if (!isMatch) {
                    res.json({success: false, message: 'Authentication failed. Wrong password.'});
                } else {
                    var user = {};
                    user._id = user_credentials._id;
                    user.username = user_credentials.username;
                    user.user_type = user_info.user_type;
                    // Success
                    var token = jwt.sign(user, "thesecrettoken", {
                        expiresIn: "10 days" // expires in 24 hours,
                    });
                    // return the information including token as JSON
                    res.json({
                        success: true,
                        message: 'Enjoy your token!',
                        token: token,
                        uid: user._id,
                        type: user.user_type,
                        username : user.username
                    });
                }
            });
        }
    });
};



exports.authMiddle = function(req, res, next) {
    // check header or url parameters or post parameters for token
    var token = req.body.token || req.query.token || req.headers['x-access-token'];
    // decode token
    if (token) {
        // verifies secret and checks exp
        jwt.verify(token, 'thesecrettoken', function(err, decoded) {
            if (err) {
                return res.status(403).json({ success: false, message: 'Failed to authenticate token.' });
            } else {
                // if everything is good, save to request for use in other routes
                req.decoded = decoded;
                req.user_id = decoded._id;
                req.user_type = decoded.user_type;
                req.username = decoded.username;
                console.log("autentificare");
                console.log(req.user_id);
                next();
            }
        });
    } else {
        // if there is no token
        // return an error
        return res.status(403).send({
            success: false,
            message: 'No token provided.'
        });
    }
};


exports.authSocketMiddle2 = function(token) {
        var user = {};
        console.log("token", token);
        try {
            var decoded = jwt.verify(token, 'thesecrettoken');
            user.decoded = decoded;
            user.user_id = decoded._id;
            user.user_type = decoded.user_type;
            user.username = decoded.username;
        } catch(err) {
            console.log("Erorr:", err);
            user = null;
        }
        return user;
};

exports.authSocketMiddle = function(token) {

    var promise = new Promise( (resolve, reject) => {
        jwt.verify(token, 'thesecrettoken', (err, decoded) => {
            if (err) {
                reject(err);
            } else {
                resolve(decoded);
            }
        });
    })
    return promise
};
