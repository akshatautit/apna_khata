const { Router } = require("express");
const statementRouter = require("./statement.routes");
const chatRouter = require("./chat.routes");
const authRouter = require("./auth.routes");

const router = Router();

router.use("/auth", authRouter);
router.use("/statements", statementRouter);
router.use("/chat", chatRouter);

module.exports = router;