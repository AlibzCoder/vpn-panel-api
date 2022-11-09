module.exports = (app,mongoClient) =>{
    app.use(require('./auth')(mongoClient));
    app.use(require('./panel')(mongoClient));
}