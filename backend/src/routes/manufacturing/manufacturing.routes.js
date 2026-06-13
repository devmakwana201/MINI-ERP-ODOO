const express = require("express");
const { authMiddleware } = require("../../middlewares/auth.middleware");
const controller = require("../../controllers/manufacturing/manufacturing.controller");
const router = express.Router();

router.use(authMiddleware);
router.get("/", controller.list);
router.get("/:id/logs", controller.logs);
router.get("/:id", controller.get);
router.post("/", controller.create);
router.patch("/:id/status", controller.status);
router.post("/:id/produce", controller.produce);

module.exports = { path: "/manufacturing/orders", router };
