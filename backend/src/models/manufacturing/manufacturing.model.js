const db = require("../../config/db");
const moment = require("moment");
const { BadRequestError, ConflictError, NotFoundError } = require("../../utils/customErrors");

const now = () => moment().format("YYYY-MM-DD HH:mm:ss");
const companyIdFrom = (req) => req.user?.companyId || req.user?.companyid || 0;
const userIdFrom = (req) => req.user?.userId || 0;

module.exports = {
  getAll: async (req) => {
    const { start = 0, length = 10, global, status } = req.query;
    const companyId = companyIdFrom(req);
    let where = `m.isdeleted = 0 AND m.companyid = ?`;
    const params = [companyId];
    if (global) {
      where += ` AND (m.reference LIKE ? OR i.itemname LIKE ? OR i.itemcode LIKE ?)`;
      params.push(...Array(3).fill(`%${global}%`));
    }
    if (status) {
      where += ` AND m.status = ?`;
      params.push(status);
    }
    const data = await db.getResults(
      `SELECT m.*, i.itemname productname, i.itemcode, u.username assignee_name, b.bomname
       FROM manufacturing_orders m
       JOIN itemmaster i ON i.itemid = m.productid
       LEFT JOIN usermaster u ON u.userid = m.assigneeid
       LEFT JOIN bill_of_materials b ON b.bomid = m.bomid
       WHERE ${where} ORDER BY m.createdon DESC LIMIT ?, ?`,
      [...params, Number(start), Number(length)]
    );
    const count = await db.getResults(
      `SELECT COUNT(*) total FROM manufacturing_orders m JOIN itemmaster i ON i.itemid = m.productid WHERE ${where}`,
      params
    );
    return { data, totalRecords: count[0]?.total || 0 };
  },

  getById: async (moid, companyId) => {
    const rows = await db.getResults(
      `SELECT m.*, i.itemname productname, i.itemcode, u.username assignee_name, b.bomname
       FROM manufacturing_orders m JOIN itemmaster i ON i.itemid = m.productid
       LEFT JOIN usermaster u ON u.userid = m.assigneeid LEFT JOIN bill_of_materials b ON b.bomid = m.bomid
       WHERE m.moid = ? AND m.companyid = ? AND m.isdeleted = 0`,
      [moid, companyId]
    );
    if (!rows.length) return null;
    const order = rows[0];
    order.components = await db.getResults(
      `SELECT mc.*, i.itemname componentname, i.itemcode componentcode
       FROM mo_components mc JOIN itemmaster i ON i.itemid = mc.componentid WHERE mc.moid = ? AND mc.isdeleted = 0`,
      [moid]
    );
    order.work_orders = await db.getResults(`SELECT * FROM mo_work_orders WHERE moid = ? AND isdeleted = 0 ORDER BY sequence`, [moid]);
    return order;
  },

  create: async (data, req) => db.runInTransaction(async (connection) => {
    const companyId = companyIdFrom(req);
    const userId = userIdFrom(req);
    const timestamp = now();
    const [bomRows] = await connection.execute(
      `SELECT * FROM bill_of_materials WHERE bomid = ? AND productid = ? AND companyid = ? AND isdeleted = 0`,
      [data.bomid, data.productid, companyId]
    );
    if (!bomRows.length) throw new BadRequestError("Selected BoM does not belong to this product");
    const bom = bomRows[0];
    const multiplier = Number(data.quantity) / Number(bom.quantity);
    const [refRows] = await connection.execute(
      `SELECT MAX(CAST(SUBSTRING(reference, 4) AS UNSIGNED)) max_ref FROM manufacturing_orders WHERE companyid = ?`,
      [companyId]
    );
    const reference = `MO-${String((refRows[0]?.max_ref || 0) + 1).padStart(6, "0")}`;
    const [header] = await connection.execute(
      `INSERT INTO manufacturing_orders
       (reference, productid, quantity, uom, bomid, assigneeid, locationid, scheduledate, status, companyid, createdby, createdon, modifiedby, modifiedon)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?)`,
      [reference, data.productid, data.quantity, data.uom || bom.uom || "", data.bomid, data.assigneeid || null, data.locationid, data.scheduledate || null, companyId, userId, timestamp, userId, timestamp]
    );
    const moid = header.insertId;
    const [components] = await connection.execute(`SELECT * FROM bom_components WHERE bomid = ? AND isdeleted = 0`, [data.bomid]);
    const [operations] = await connection.execute(`SELECT * FROM bom_operations WHERE bomid = ? AND isdeleted = 0 ORDER BY sequence`, [data.bomid]);
    if (components.length) {
      await connection.query(
        `INSERT INTO mo_components (moid, componentid, to_consume, consumed, uom, availability) VALUES ?`,
        [components.map((item) => [moid, item.componentid, Number(item.quantity) * multiplier, 0, item.uom || "", "not_available"])]
      );
    }
    if (operations.length) {
      await connection.query(
        `INSERT INTO mo_work_orders (moid, operationname, workcenter, expected_duration, sequence) VALUES ?`,
        [operations.map((item) => [moid, item.operationname, item.workcenter || "", Math.ceil(Number(item.duration) * multiplier), item.sequence])]
      );
    }
    await connection.execute(
      `INSERT INTO manufacturing_audit_logs (referenceid, referencetype, action, userid, createdon) VALUES (?, 'MO', 'Created draft MO', ?, ?)`,
      [moid, userId, timestamp]
    );
    return { moid, reference };
  }),

  updateStatus: async (moid, status, companyId, userId) => db.runInTransaction(async (connection) => {
    const [rows] = await connection.execute(`SELECT status FROM manufacturing_orders WHERE moid = ? AND companyid = ? AND isdeleted = 0 FOR UPDATE`, [moid, companyId]);
    if (!rows.length) return false;
    const transitions = { draft: ["confirmed", "cancelled"], confirmed: ["in_progress", "cancelled"], in_progress: ["cancelled"] };
    if (!transitions[rows[0].status]?.includes(status)) throw new ConflictError(`Cannot change status from ${rows[0].status} to ${status}`);
    await connection.execute(`UPDATE manufacturing_orders SET status = ?, modifiedby = ?, modifiedon = NOW() WHERE moid = ?`, [status, userId, moid]);
    await connection.execute(`INSERT INTO manufacturing_audit_logs (referenceid, referencetype, action, userid) VALUES (?, 'MO', ?, ?)`, [moid, `Status changed to ${status}`, userId]);
    return true;
  }),

  produce: async (moid, companyId, userId, suppliedComponents) => db.runInTransaction(async (connection) => {
    const [orders] = await connection.execute(
      `SELECT m.*, i.uniquekey productkey FROM manufacturing_orders m JOIN itemmaster i ON i.itemid = m.productid
       WHERE m.moid = ? AND m.companyid = ? AND m.isdeleted = 0 FOR UPDATE`,
      [moid, companyId]
    );
    if (!orders.length) throw new NotFoundError("Manufacturing order");
    const order = orders[0];
    if (order.status !== "in_progress") throw new ConflictError("Only an in-progress manufacturing order can be produced");
    const [components] = await connection.execute(
      `SELECT mc.*, i.uniquekey componentkey FROM mo_components mc JOIN itemmaster i ON i.itemid = mc.componentid WHERE mc.moid = ? AND mc.isdeleted = 0`,
      [moid]
    );
    const supplied = new Map(suppliedComponents.map((item) => [Number(item.mocomponentid), Number(item.consumed)]));
    for (const component of components) {
      const consumed = supplied.has(component.mocomponentid) ? supplied.get(component.mocomponentid) : Number(component.to_consume);
      if (!Number.isFinite(consumed) || consumed < 0) throw new BadRequestError("Consumed quantities must be zero or greater");
      const [stock] = await connection.execute(
        `SELECT id, quantity FROM currentstockmaster WHERE pmuniquekey = ? AND companyid = ? AND locationid = ? AND isdeleted = 0 FOR UPDATE`,
        [component.componentkey, companyId, order.locationid]
      );
      const total = stock.reduce((sum, row) => sum + Number(row.quantity || 0), 0);
      if (total < consumed) throw new ConflictError(`Insufficient stock for component ${component.componentid}`);
      let remaining = consumed;
      for (const row of stock) {
        const deduction = Math.min(remaining, Number(row.quantity || 0));
        if (deduction > 0) await connection.execute(`UPDATE currentstockmaster SET quantity = quantity - ?, modifiedby = ?, modifieddate = NOW() WHERE id = ?`, [deduction, userId, row.id]);
        remaining -= deduction;
        if (remaining <= 0) break;
      }
      await connection.execute(`UPDATE mo_components SET consumed = ?, availability = 'available' WHERE mocomponentid = ?`, [consumed, component.mocomponentid]);
    }
    const [finishedRows] = await connection.execute(
      `SELECT id FROM currentstockmaster WHERE pmuniquekey = ? AND companyid = ? AND locationid = ? AND isdeleted = 0 ORDER BY id LIMIT 1 FOR UPDATE`,
      [order.productkey, companyId, order.locationid]
    );
    if (!finishedRows.length) throw new ConflictError("Finished product must already be mapped to the selected stock location");
    await connection.execute(`UPDATE currentstockmaster SET quantity = quantity + ?, modifiedby = ?, modifieddate = NOW() WHERE id = ?`, [order.quantity, userId, finishedRows[0].id]);
    await connection.execute(`UPDATE manufacturing_orders SET status = 'done', modifiedby = ?, modifiedon = NOW() WHERE moid = ?`, [userId, moid]);
    await connection.execute(`INSERT INTO manufacturing_audit_logs (referenceid, referencetype, action, userid) VALUES (?, 'MO', 'Production completed', ?)`, [moid, userId]);
    return { moid, status: "done" };
  }),

  getLogs: (moid, companyId) => db.getResults(
    `SELECT l.*, u.username FROM manufacturing_audit_logs l
     JOIN manufacturing_orders m ON m.moid = l.referenceid AND l.referencetype = 'MO'
     LEFT JOIN usermaster u ON u.userid = l.userid
     WHERE l.referenceid = ? AND m.companyid = ? ORDER BY l.createdon DESC`,
    [moid, companyId]
  ),
};
