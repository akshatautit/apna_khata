const { Router } = require("express");
const upload = require("../middlewares/upload");
const { uploadStatement, getHistory } = require("../controllers/statement.controller");
const { auth } = require("../middlewares/auth");

const router = Router();

router.post("/upload", auth(true), upload.single("statement"), uploadStatement);
router.get("/history", auth(true), getHistory);

module.exports = router;