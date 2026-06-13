const Manufacturing = require("../../models/manufacturing/manufacturing.model");
const ResponseFormatter = require("../../utils/responseFormatter");
const { asyncHandler } = require("../../utils/asyncHandler");
const { BadRequestError, NotFoundError } = require("../../utils/customErrors");

const companyId = (req) => req.user?.companyId || req.user?.companyid || 0;
const userId = (req) => req.user?.userId || 0;

module.exports = {
  list: asyncHandler(async (req, res) => {
    const result = await Manufacturing.getAll(req);
    res.json(ResponseFormatter.paginated(result.data, req.query.start || 0, req.query.length || 10, result.totalRecords, "Manufacturing orders retrieved successfully"));
  }),
  get: asyncHandler(async (req, res) => {
    const result = await Manufacturing.getById(req.params.id, companyId(req));
    if (!result) throw new NotFoundError("Manufacturing order");
    res.json(ResponseFormatter.success(result, "Manufacturing order retrieved successfully"));
  }),
  create: asyncHandler(async (req, res) => {
    if (!req.body.productid || !req.body.bomid || !req.body.locationid || Number(req.body.quantity) <= 0) throw new BadRequestError("productid, bomid, locationid and a positive quantity are required");
    res.status(201).json(ResponseFormatter.created(await Manufacturing.create(req.body, req), "Manufacturing order created successfully"));
  }),
  status: asyncHandler(async (req, res) => {
    if (!["confirmed", "in_progress", "cancelled"].includes(req.body.status)) throw new BadRequestError("Invalid manufacturing order status");
    const updated = await Manufacturing.updateStatus(req.params.id, req.body.status, companyId(req), userId(req));
    if (!updated) throw new NotFoundError("Manufacturing order");
    res.json(ResponseFormatter.updated(null, "Manufacturing order status updated"));
  }),
  produce: asyncHandler(async (req, res) => {
    res.json(ResponseFormatter.updated(await Manufacturing.produce(req.params.id, companyId(req), userId(req), req.body.components || []), "Production completed and stock updated"));
  }),
  logs: asyncHandler(async (req, res) => {
    res.json(ResponseFormatter.success(await Manufacturing.getLogs(req.params.id, companyId(req)), "Manufacturing logs retrieved successfully"));
  }),
};
