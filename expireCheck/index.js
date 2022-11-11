const ExpireCheck = require('./utills');
module.exports = (mongoClient) =>{
    let expireCheck = new ExpireCheck(mongoClient);

    expireCheck.updateExpireCollection();
    setInterval(()=>expireCheck.updateExpireCollection(),30*60*1000); // every 30 minutes

    expireCheck.checkExpired();
    setInterval(()=>expireCheck.checkExpired(),10*60*1000); // every 10 minutes
}