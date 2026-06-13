import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Page } from "components/shared/Page";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { Toast } from "primereact/toast";
import { ManufacturingService } from "services/manufacturing";

export default function BomList() {
  const navigate = useNavigate();
  const toast = useRef(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [global, setGlobal] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await ManufacturingService.listBoms({ start: 0, length: 100, global }));
    } catch (error) {
      toast.current?.show({ severity: "error", detail: error.message || "Unable to load BoMs" });
    } finally {
      setLoading(false);
    }
  }, [global]);
  useEffect(() => { load(); }, [load]);

  return <Page title="Bills of Materials">
    <Toast ref={toast} />
    <div className="card">
      <div className="mb-4 flex justify-between gap-3">
        <span className="p-input-icon-left"><i className="pi pi-search" /><InputText value={global} onChange={(e) => setGlobal(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load()} placeholder="Search BoMs" /></span>
        <Button label="Create BoM" icon="pi pi-plus" onClick={() => navigate("/manufacturing/boms/new")} />
      </div>
      <DataTable value={rows} loading={loading} paginator rows={10} emptyMessage="No BoMs found">
        <Column field="bomname" header="BoM" sortable />
        <Column field="productname" header="Finished Product" sortable />
        <Column field="quantity" header="Quantity" />
        <Column field="uom" header="UOM" />
        <Column body={(row) => <Button text icon="pi pi-pencil" onClick={() => navigate(`/manufacturing/boms/${row.bomid}`)} />} />
      </DataTable>
    </div>
  </Page>;
}
