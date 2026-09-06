const { Router } = require("express");
const upload = require("../middlewares/upload");
const { uploadStatement } = require("../controllers/statement.controller");

const router = Router();

router.post("/upload", upload.single("statement"), uploadStatement);

module.exports = router;