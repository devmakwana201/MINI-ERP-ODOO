const express = require("express");
const { authMiddleware } = require("../../middlewares/auth.middleware");
const controller = require("../../controllers/manufacturing/bom.controller");
const router = express.Router();

router.use(authMiddleware);
router.get("/", controller.list);
router.get("/product/:productId", controller.byProduct);
router.get("/:id", controller.get);
router.post("/", controller.create);
router.put("/:id", controller.update);
router.delete("/:id", controller.remove);

module.exports = { path: "/manufacturing/boms", router };
