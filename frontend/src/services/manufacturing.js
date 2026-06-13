import axios from "utils/axios";

const data = (response) => response.data?.data ?? response.data;

export const ManufacturingService = {
  listBoms: async (params = {}) => axios.get("/manufacturing/boms", { params }).then(data),
  getBom: async (id) => axios.get(`/manufacturing/boms/${id}`).then(data),
  createBom: async (payload) => axios.post("/manufacturing/boms", payload).then(data),
  updateBom: async (id, payload) => axios.put(`/manufacturing/boms/${id}`, payload).then(data),
  deleteBom: async (id) => axios.delete(`/manufacturing/boms/${id}`).then(data),
  listOrders: async (params = {}) => axios.get("/manufacturing/orders", { params }).then(data),
  getOrder: async (id) => axios.get(`/manufacturing/orders/${id}`).then(data),
  createOrder: async (payload) => axios.post("/manufacturing/orders", payload).then(data),
  updateStatus: async (id, status) => axios.patch(`/manufacturing/orders/${id}/status`, { status }).then(data),
  produce: async (id, components) => axios.post(`/manufacturing/orders/${id}/produce`, { components }).then(data),
};
