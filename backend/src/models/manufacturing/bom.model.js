const db = require("../../config/db");
const moment = require("moment");

module.exports = {
  /**
   * Get all Bill of Materials (paginated)
   */
  getAll: async (req) => {
    const { start = 0, length = 10, global } = req.query;
    const companyId = req.user?.companyId || req.user?.companyid || 0;

    let sql = `
      SELECT b.bomid, b.bomname, b.productid, b.quantity, b.uom,
             i.itemname as productname, i.itemcode
      FROM bill_of_materials b
      JOIN itemmaster i ON b.productid = i.itemid
      WHERE b.isdeleted = 0 AND b.companyid = ?
    `;
    let params = [companyId];

    if (global) {
      sql += ` AND (b.bomname LIKE ? OR i.itemname LIKE ? OR i.itemcode LIKE ?)`;
      const g = `%${global}%`;
      params.push(g, g, g);
    }

    sql += ` ORDER BY b.createdon DESC LIMIT ?, ?`;
    params.push(parseInt(start), parseInt(length));

    const data = await db.getResults(sql, params);

    // Count
    let countSql = `
      SELECT COUNT(*) as total 
      FROM bill_of_materials b
      JOIN itemmaster i ON b.productid = i.itemid
      WHERE b.isdeleted = 0 AND b.companyid = ?
    `;
    let countParams = [companyId];
    if (global) {
      countSql += ` AND (b.bomname LIKE ? OR i.itemname LIKE ? OR i.itemcode LIKE ?)`;
      countParams.push(`%${global}%`, `%${global}%`, `%${global}%`);
    }

    const countResult = await db.getResults(countSql, countParams);
    const totalRecords = countResult[0]?.total || 0;

    return {
      data,
      totalRecords
    };
  },

  /**
   * Get BoM by ID (includes components and operations)
   */
  getById: async (bomid, companyId) => {
    // 1. Get BoM header
    const sql = `
      SELECT b.*, i.itemname as productname, i.itemcode
      FROM bill_of_materials b
      JOIN itemmaster i ON b.productid = i.itemid
      WHERE b.bomid = ? AND b.companyid = ? AND b.isdeleted = 0
    `;
    const bomResult = await db.getResults(sql, [bomid, companyId]);
    if (!bomResult || bomResult.length === 0) return null;
    
    const bom = bomResult[0];

    // 2. Get components
    const compSql = `
      SELECT bc.*, i.itemname as componentname, i.itemcode as componentcode
      FROM bom_components bc
      JOIN itemmaster i ON bc.componentid = i.itemid
      WHERE bc.bomid = ? AND bc.isdeleted = 0
    `;
    bom.components = await db.getResults(compSql, [bomid]) || [];

    // 3. Get operations
    const opSql = `
      SELECT *
      FROM bom_operations
      WHERE bomid = ? AND isdeleted = 0
      ORDER BY sequence ASC
    `;
    bom.operations = await db.getResults(opSql, [bomid]) || [];

    return bom;
  },

  /**
   * Get BoMs for a specific product
   */
  getByProductId: async (productid, companyId) => {
    const sql = `
      SELECT bomid, bomname, quantity, uom
      FROM bill_of_materials
      WHERE productid = ? AND companyid = ? AND isdeleted = 0
    `;
    return await db.getResults(sql, [productid, companyId]);
  },

  /**
   * Create BoM with components and operations
   */
  create: async (data, req) => {
    return await db.runInTransaction(async (connection) => {
      const companyId = req.user?.companyId || req.user?.companyid || 0;
      const userId = req.user?.userId || 0;
      const now = moment().format("YYYY-MM-DD HH:mm:ss");

      // 1. Insert Header
      const headerSql = `
        INSERT INTO bill_of_materials 
        (bomname, productid, quantity, uom, companyid, createdby, createdon, modifiedby, modifiedon)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const headerResult = await connection.execute(headerSql, [
        data.bomname, data.productid, data.quantity, data.uom || '',
        companyId, userId, now, userId, now
      ]);
      const newBomId = headerResult[0].insertId;

      // 2. Insert Components
      if (data.components && data.components.length > 0) {
        const compSql = `
          INSERT INTO bom_components 
          (bomid, componentid, quantity, uom)
          VALUES ?
        `;
        const compValues = data.components.map(c => [
          newBomId, c.componentid, c.quantity, c.uom || ''
        ]);
        await connection.query(compSql, [compValues]);
      }

      // 3. Insert Operations
      if (data.operations && data.operations.length > 0) {
        const opSql = `
          INSERT INTO bom_operations 
          (bomid, operationname, workcenter, duration, sequence)
          VALUES ?
        `;
        const opValues = data.operations.map((o, index) => [
          newBomId, o.operationname, o.workcenter || '', o.duration || 0, o.sequence || index
        ]);
        await connection.query(opSql, [opValues]);
      }

      await connection.execute(
        `INSERT INTO manufacturing_audit_logs (referenceid, referencetype, action, userid, createdon) VALUES (?, 'BOM', 'Created BoM', ?, ?)`,
        [newBomId, userId, now]
      );
      return newBomId;
    });
  },

  update: async (bomid, data, companyId, userId) => {
    return db.runInTransaction(async (connection) => {
      const [existing] = await connection.execute(
        `SELECT bomid FROM bill_of_materials WHERE bomid = ? AND companyid = ? AND isdeleted = 0 FOR UPDATE`,
        [bomid, companyId]
      );
      if (!existing.length) return false;

      await connection.execute(
        `UPDATE bill_of_materials SET bomname = ?, productid = ?, quantity = ?, uom = ?, modifiedby = ?, modifiedon = NOW() WHERE bomid = ?`,
        [data.bomname, data.productid, data.quantity, data.uom || "", userId, bomid]
      );
      await connection.execute(`UPDATE bom_components SET isdeleted = 1 WHERE bomid = ?`, [bomid]);
      await connection.execute(`UPDATE bom_operations SET isdeleted = 1 WHERE bomid = ?`, [bomid]);

      if (data.components?.length) {
        await connection.query(
          `INSERT INTO bom_components (bomid, componentid, quantity, uom) VALUES ?`,
          [data.components.map((component) => [bomid, component.componentid, component.quantity, component.uom || ""])]
        );
      }
      if (data.operations?.length) {
        await connection.query(
          `INSERT INTO bom_operations (bomid, operationname, workcenter, duration, sequence) VALUES ?`,
          [data.operations.map((operation, index) => [bomid, operation.operationname, operation.workcenter || "", operation.duration || 0, operation.sequence ?? index])]
        );
      }
      await connection.execute(
        `INSERT INTO manufacturing_audit_logs (referenceid, referencetype, action, userid) VALUES (?, 'BOM', 'Updated BoM', ?)`,
        [bomid, userId]
      );
      return true;
    });
  },

  /**
   * Soft Delete BoM
   */
  delete: async (bomid, companyId, userId) => {
    const sql = `
      UPDATE bill_of_materials 
      SET isdeleted = 1, modifiedby = ?, modifiedon = NOW()
      WHERE bomid = ? AND companyid = ?
    `;
    return db.runInTransaction(async (connection) => {
      const [result] = await connection.execute(sql, [userId, bomid, companyId]);
      if (!result.affectedRows) return false;
      await connection.execute(
        `INSERT INTO manufacturing_audit_logs (referenceid, referencetype, action, userid) VALUES (?, 'BOM', 'Deleted BoM', ?)`,
        [bomid, userId]
      );
      return true;
    });
  }
};
