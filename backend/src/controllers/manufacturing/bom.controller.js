const Bom = require("../../models/manufacturing/bom.model");
const ResponseFormatter = require("../../utils/responseFormatter");
const { asyncHandler } = require("../../utils/asyncHandler");
const { BadRequestError, NotFoundError } = require("../../utils/customErrors");

const companyId = (req) => req.user?.companyId || req.user?.companyid || 0;
const userId = (req) => req.user?.userId || 0;

module.exports = {
  list: asyncHandler(async (req, res) => {
    const result = await Bom.getAll(req);
    res.json(ResponseFormatter.paginated(result.data, req.query.start || 0, req.query.length || 10, result.totalRecords, "BoMs retrieved successfully"));
  }),
  get: asyncHandler(async (req, res) => {
    const result = await Bom.getById(req.params.id, companyId(req));
    if (!result) throw new NotFoundError("BoM");
    res.json(ResponseFormatter.success(result, "BoM retrieved successfully"));
  }),
  byProduct: asyncHandler(async (req, res) => {
    res.json(ResponseFormatter.success(await Bom.getByProductId(req.params.productId, companyId(req)), "BoMs retrieved successfully"));
  }),
  create: asyncHandler(async (req, res) => {
    if (!req.body.bomname || !req.body.productid || Number(req.body.quantity) <= 0) throw new BadRequestError("bomname, productid and a positive quantity are required");
    const id = await Bom.create(req.body, req);
    res.status(201).json(ResponseFormatter.created({ bomid: id }, "BoM created successfully"));
  }),
  update: asyncHandler(async (req, res) => {
    const updated = await Bom.update(req.params.id, req.body, companyId(req), userId(req));
    if (!updated) throw new NotFoundError("BoM");
    res.json(ResponseFormatter.updated({ bomid: Number(req.params.id) }, "BoM updated successfully"));
  }),
  remove: asyncHandler(async (req, res) => {
    const deleted = await Bom.delete(req.params.id, companyId(req), userId(req));
    if (!deleted) throw new NotFoundError("BoM");
    res.json(ResponseFormatter.deleted("BoM deleted successfully"));
  }),
};
