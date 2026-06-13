import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Page } from "components/shared/Page";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { Tag } from "primereact/tag";
import { Toast } from "primereact/toast";
import { ManufacturingService } from "services/manufacturing";

const severity = { draft: "secondary", confirmed: "info", in_progress: "warning", done: "success", cancelled: "danger" };
export default function ManufacturingOrders() {
  const navigate = useNavigate();
  const toast = useRef(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = async () => { setLoading(true); try { setRows(await ManufacturingService.listOrders({ start: 0, length: 100 })); } catch { toast.current?.show({ severity: "error", detail: "Unable to load manufacturing orders" }); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []);
  const change = async (row, status) => { await ManufacturingService.updateStatus(row.moid, status); load(); };
  return <Page title="Manufacturing Orders"><Toast ref={toast} /><div className="card">
    <div className="mb-4 flex justify-end"><Button label="Create Order" icon="pi pi-plus" onClick={() => navigate("/manufacturing/orders/new")} /></div>
    <DataTable value={rows} loading={loading} paginator rows={10} emptyMessage="No manufacturing orders found">
      <Column field="reference" header="Reference" sortable /><Column field="productname" header="Product" /><Column field="quantity" header="Quantity" /><Column field="scheduledate" header="Schedule" />
      <Column header="Status" body={(row) => <Tag value={row.status.replace("_", " ").toUpperCase()} severity={severity[row.status]} />} />
      <Column header="Actions" body={(row) => <div className="flex gap-1">{row.status === "draft" && <Button text label="Confirm" onClick={() => change(row, "confirmed")} />}{row.status === "confirmed" && <Button text label="Start" onClick={() => change(row, "in_progress")} />}{row.status === "in_progress" && <Button text label="Produce" onClick={async () => { await ManufacturingService.produce(row.moid, []); load(); }} />}</div>} />
    </DataTable>
  </div></Page>;
}
