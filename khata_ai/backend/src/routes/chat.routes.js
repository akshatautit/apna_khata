const { Router } = require("express");
const { chatMessage } = require("../controllers/chat.controller");

const router = Router();

router.post("/message", chatMessage);

module.exports = router;