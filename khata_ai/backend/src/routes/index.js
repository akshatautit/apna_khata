const { Router } = require("express");
const statementRouter = require("./statement.routes");
const chatRouter = require("./chat.routes");

const router = Router();

router.use("/statements", statementRouter);
router.use("/chat", chatRouter);

module.exports = router;