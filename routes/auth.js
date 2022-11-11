const bcrypt = require('bcryptjs');
const { secret, refreshSecret, expiresIn, refreshExpiresIn } = require('../consts');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const checkAuthMiddleware = require('../checkAuthMiddleware')

//Initializes an instance of the Router class.
const router = require('express').Router()

module.exports = (mongoClient)=>{
    const PRITUNL_DB = mongoClient.db("pritunl");
    const AUTH_COLLECTION = PRITUNL_DB.collection('panel_auth');

    router.post('/register', (req, res) => {
        const newUser = {
            userName: req.body.userName,
            password: req.body.password
        }
        bcrypt.genSalt(10, (err, salt) => {
            if (err) throw err;
            bcrypt.hash(newUser.password, salt,
                (err, hash) => {
                    if (err) throw err;
                    newUser.password = hash;
                    AUTH_COLLECTION.insertOne(newUser, function(err, r) {
                        if (err) {
                            res.status(400).json(err)
                            throw err
                        }
                        res.status(200).json({});
                    });
                });
        });
    });

    router.get('/', (req, res) => {
        res.status(200).json({message:"nothing here"});
    });


    router.post('/login',
        body('userName').notEmpty().isString().trim().escape(),
        body('password').notEmpty().isString().trim().escape(),
        (req, res) => {

            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array({ onlyFirstError: true }) });
            }

            const userName = req.body.userName;
            const password = req.body.password;

            AUTH_COLLECTION.findOne({userName:userName}).then(user=>{
                if (!user) {
                    return res.status(404).json({ errorCode: 'USER_NOT_FOUND', errorMessage: "No Account Found" });
                }
                bcrypt.compare(password, user.password)
                    .then(isMatch => {
                        if (isMatch) {
                            const payload = {
                                id: user._id,
                                userName: user.userName
                            };
    
                            var token = jwt.sign({ exp: Math.floor(Date.now() / 1000) + expiresIn, data: payload }, secret);
                            var refreshToken = jwt.sign({ exp: Math.floor(Date.now() / 1000) + refreshExpiresIn, data: payload }, refreshSecret);
    
                            res.json({
                                Authorization: token,
                                RefreshToken: refreshToken
                            });
                        } else {
                            res.status(400).json({ errorCode: 'INCORRECT_PASSWORD', errorMessage: "Password is incorrect" });
                        }
                    });
            }).catch(err=>{
                if (err){
                    res.status(400).json(err);
                    throw err;
                }
            });
        });

    router.post('/refreshToken', (req, res) => {
        var refreshToken = req.headers['refreshtoken'];
        jwt.verify(refreshToken, refreshSecret, (err, payload) => {
            if (err) {
                return res.sendStatus(401);
            }
            payload.exp = Math.floor(Date.now() / 1000) + expiresIn
            const token = jwt.sign(payload, secret);
            return res.status(200).json({ Authorization: token });
        });

    });


    return router;
};