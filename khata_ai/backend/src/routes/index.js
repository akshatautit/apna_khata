const { Router } = require("express");
const statementRouter = require("./statement.routes");

const router = Router();

router.use("/statements", statementRouter);

module.exports = router;