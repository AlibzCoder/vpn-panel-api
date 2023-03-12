const { body, validationResult } = require("express-validator");
const { ObjectId } = require("mongodb");
const checkAuthMiddleware = require("../checkAuthMiddleware");
const ExpireCheck = require("../expireCheck/utills");
//Initializes an instance of the Router class.
const router = require("express").Router();

router.use(checkAuthMiddleware);

var isDate = function (date) {
  return new Date(date) !== "Invalid Date" && !isNaN(new Date(date));
};

module.exports = (mongoClient) => {
  const expireCheck = new ExpireCheck(mongoClient);

  router.get("/users", (req, res) => {
    expireCheck
      .getUsersJoined()
      .then((result) => {
        res.status(200).json(result);
      })
      .catch((err) => {
        console.log(err);
        res
          .status(500)
          .json({ error: "There was an error while listing the users" });
      });
  });

  router.post(
    "/setExpire",
    body("userId").notEmpty().isString().trim().escape(),
    body("date").notEmpty().isString().trim().escape(),
    (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      if (!isDate(req.body.date)) {
        return res.status(400).json({ errors: "Invalid Date" });
      }

      expireCheck
        .setExpire(ObjectId(req.body.userId), new Date(req.body.date))
        .then(() => {
          res.status(200).json({ message: "updated successfully" });
        })
        .catch((err) => {
          console.log(err);
          res
            .status(400)
            .json({
              error: "There was an error while updating expire setting",
            });
        });
    }
  );
  router.post(
    "/setExpireCheckEnabled",
    body("userId").notEmpty().isString().trim().escape(),
    body("checkEnabled").notEmpty().isBoolean(),
    (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      expireCheck
        .setExpireCheckEnabled(ObjectId(req.body.userId), req.body.checkEnabled)
        .then(() => {
          res.status(200).json({ message: "updated successfully" });
        })
        .catch((err) => {
          console.log(err);
          res
            .status(400)
            .json({
              error: "There was an error while updating expire setting",
            });
        });
    }
  );

  return router;
};
