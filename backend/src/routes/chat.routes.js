const { Router } = require("express");
const { chatMessage } = require("../controllers/chat.controller");
const { auth } = require("../middlewares/auth");

const router = Router();

router.post("/message", auth(true), chatMessage);

module.exports = router;