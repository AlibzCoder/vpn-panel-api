const e = require("express");

class ExpireCheck{

    constructor(mongoClient){
        this.DB = mongoClient.db("pritunl");
        this.USERS = this.DB.collection("users");
        this.USERS_EXPIRE = this.DB.collection("users_expire");
        this.SERVERS = this.DB.collection("servers");
        this.ORGANIZATIONS = this.DB.collection("organizations");
    }


    
    updateExpireCollection = async () => {
        let pritnlUsers = await getUsers(this.USERS);
        let usersExpire = await getUsersExpire(this.USERS_EXPIRE);


        let deletedPritnlUsers = pritnlUsers.filter(u=>(!u.name||typeof u.name !== 'string'||u.name.trim().length === 0));
        let existingPritunlUsers = pritnlUsers.filter(u=>(u.name&&typeof u.name === 'string'&&u.name.trim().length > 0));


        let cpUsersIdsToDelete = usersExpire.reduce((arr,u) => {
            if(deletedPritnlUsers.find(us=>us._id.toString()===u._id.toString())){
                arr.push(u._id);
            }
            return arr;
        },[]);
        if(cpUsersIdsToDelete.length > 0){
            this.USERS_EXPIRE.deleteMany({ _id : { $in: cpUsersIdsToDelete } } , (err) => {
                if(err) throw err;
            });
        }

        let usersToAdd = existingPritunlUsers.reduce((arr,u) => {
            if(!usersExpire.map(us=>us._id.toString()).includes(u._id.toString())){
                let creationDate = u._id.getTimestamp();
                creationDate.setMonth(creationDate.getMonth() + 1); // add 1 month to date;
                arr.push({
                    _id : u._id,
                    expire_date: creationDate
                });
            }
            return arr;
        },[]);

        if(usersToAdd.length > 0){
            this.USERS_EXPIRE.insertMany(usersToAdd, function(err, res) {
                if (err) throw err;
            });
        }
    }

    getUsers(){
        return new Promise((resolve,reject)=>{
            this.USERS.find().toArray(function(err, result) {
                if (err) reject(err);
                resolve(result.reduce((r,u)=>{
                    if(!u.name.includes("server_")){
                        r.push({
                            _id:u._id,
                            name:u.name,
                            disabled:u.disabled,
                            org_id:u.org_id,
                        });
                    }
                    return r;
                },[]));
            });
        });
    }

    getServers(){
        return new Promise((res,rej)=>{
            this.SERVERS.find().toArray(function(err, result) {
                if (err) rej(err);
                if(result){
                    res(result.map(ser=>({
                        _id : ser._id,
                        name : ser.name,
                        organizations : ser.organizations.map(org=>org.toString()),
                    })))
                }else {
                    rej(err);
                }
            });
        });
    }
    getOrganizations(){
        return new Promise((res,rej)=>{
            this.ORGANIZATIONS.find().toArray(function(err, result) {
                if (err) rej(err);
                res(result.reduce((obj,org)=>{
                    obj[org._id.toString()] = org.name;
                    return obj;
                },{}))
            });
        });
    }
    getUsersExpire(){
        return new Promise((resolve,reject)=>{
            this.USERS_EXPIRE.find().toArray(function(err, result) {
                if (err) reject(err);
                resolve(result);
            });
        });
    }
    getUsersJoined(){
        return new Promise(async (resolve,reject)=>{
            const s = await this.getServers();
            const orgs = await this.getOrganizations();
            this.USERS_EXPIRE.aggregate(
                [{$lookup:{
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'user'
                }}]
            ).toArray(function(err, res) {
                if (err) reject(err);
                if(res){
                    resolve(res.reduce((r,e)=>{
                        if(e.user.length > 0){
                            const ser = s.find(se=>se.organizations.includes(e.user[0].org_id.toString()));
                            const u = {
                                _id:e.user[0]._id,
                                name:e.user[0].name,
                                disabled:e.user[0].disabled,
                                org_id:e.user[0].org_id,
                                org_name:orgs[e.user[0].org_id.toString()],
                                expire_date:e.expire_date,
                                creation_date:e.user[0]._id.getTimestamp(),
                            };
                            if(ser){
                                u["server_id"] = ser._id;
                                u["server_name"] = ser.name;
                            }
                            r.push(u);
                        }
                        return r;
                    },[]));
                }else{
                    rej()
                }
            });
        });
    }

    checkExpired(){
        this.getUsersJoined().then(usersExpire=>{
            usersExpire.forEach(u => {
                if(u.expire_date < new Date()){
                    if(!u.disabled) this.disableUser(u._id);
                }else{
                    if(u.disabled) this.disableUser(u._id,false);
                }
            });
        })
    }

    disableUser(UserId,disabled = true){
        this.USERS.updateOne({_id:UserId}, {$set:{disabled:disabled}}, function(err, res) {
            if (err) throw err;
        });
    }


    setExpire(UserId,Date){
        return new Promise((res,rej)=>{
            this.USERS_EXPIRE.updateOne({_id:UserId}, {$set:{expire_date:Date}}, function(err, r) {
                if (err) rej(err);
                res();
            });
        })
    }

}

module.exports = ExpireCheck;