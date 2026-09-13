const { Router } = require("express");
const upload = require("../middlewares/upload");
const { uploadStatement, getHistory } = require("../controllers/statement.controller");

const router = Router();

router.post("/upload", upload.single("statement"), uploadStatement);
router.get("/history", getHistory);

module.exports = router;