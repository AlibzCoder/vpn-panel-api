const { MongoClient } = require("mongodb");


module.exports = initDB = callback => {
    var HOST_NAME = '127.0.0.1';
    var DATABASE_NAME = 'admin';
    var DATABASE_USERNAME = '..';
    var DATABASE_PASSWORD = '..';

    const mongoClient = new MongoClient(`mongodb://${DATABASE_USERNAME}:${DATABASE_PASSWORD}@${HOST_NAME}/${DATABASE_NAME}`);
    try{
        mongoClient.db(DATABASE_NAME);
        callback(mongoClient);
    }catch(e){
        console.log('Unable To Connect To Database',e);
    }
}