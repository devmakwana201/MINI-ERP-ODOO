import axios from "utils/axios";
import { responseHandler } from "utils/responseHandler";

export const BOMService = {
  /**
   * Get paginated BOM list
   */
  getBOMs: async ({ filters, start = 0, length = 10, sortField, sortOrder } = {}) => {
    try {
      const response = await axios.get("/bom", {
        params: {
          filters: JSON.stringify(filters || {}),
          start,
          length,
          ...(sortField && sortOrder ? { sortField, sortOrder } : {}),
        },
      });
      return responseHandler.handleListResponse(response, (bom) => ({
        bomid: bom.bomid,
        bomname: bom.bomname,
        bomcode: bom.bomcode,
        bomtype: bom.bomtype,
        finisheditemid: bom.finisheditemid,
        finisheditemname: bom.finisheditemname,
        finisheditemcode: bom.finisheditemcode,
        finisheditemimg: bom.finisheditemimg,
        quantity: bom.quantity,
        uomid: bom.uomid,
        uomname: bom.uomname,
        status: bom.status,
        description: bom.description,
        effectivedate: bom.effectivedate,
        expirydate: bom.expirydate,
        createddate: bom.createddate,
      }));
    } catch (error) {
      return responseHandler.handleListError(error);
    }
  },

  /**
   * Get single BOM by ID (with components)
   */
  getBOMById: async (bomid) => {
    try {
      const response = await axios.get(`/bom/${bomid}`);
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  /**
   * Create a new BOM
   */
  createBOM: async (data) => {
    try {
      const response = await axios.post("/bom", data);
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  /**
   * Update an existing BOM
   */
  updateBOM: async (bomid, data) => {
    try {
      const response = await axios.put(`/bom/${bomid}`, data);
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  /**
   * Delete a BOM
   */
  deleteBOM: async (bomid) => {
    try {
      const response = await axios.delete(`/bom/${bomid}`);
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  /**
   * Search items for BOM dropdowns
   */
  searchItems: async (search = "") => {
    try {
      const response = await axios.get("/bom/items/search", {
        params: { search },
      });
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  /**
   * Get BOM cost analysis
   */
  getBOMCost: async (bomid) => {
    try {
      const response = await axios.get(`/bom/${bomid}/cost`);
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },
};
