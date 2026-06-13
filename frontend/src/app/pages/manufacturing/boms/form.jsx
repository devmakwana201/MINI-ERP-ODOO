import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Page } from "components/shared/Page";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { InputNumber } from "primereact/inputnumber";
import { Toast } from "primereact/toast";
import { ManufacturingService } from "services/manufacturing";

const emptyComponent = { componentid: "", quantity: 1, uom: "" };
const emptyOperation = { operationname: "", workcenter: "", duration: 0 };

export default function BomForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useRef(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ bomname: "", productid: "", quantity: 1, uom: "", components: [{ ...emptyComponent }], operations: [] });
  useEffect(() => { if (id) ManufacturingService.getBom(id).then(setForm); }, [id]);
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const updateLine = (key, index, field, value) => set(key, form[key].map((line, i) => i === index ? { ...line, [field]: value } : line));
  const save = async () => {
    setSaving(true);
    try {
      if (id) await ManufacturingService.updateBom(id, form); else await ManufacturingService.createBom(form);
      navigate("/manufacturing/boms");
    } catch (error) {
      toast.current?.show({ severity: "error", detail: error.response?.data?.error?.message || "Unable to save BoM" });
    } finally { setSaving(false); }
  };
  return <Page title={id ? "Edit BoM" : "Create BoM"}><Toast ref={toast} /><div className="card space-y-5">
    <div className="grid gap-4 md:grid-cols-4">
      <label>BoM Name<InputText className="mt-1 w-full" value={form.bomname} onChange={(e) => set("bomname", e.target.value)} /></label>
      <label>Finished Product ID<InputNumber className="mt-1 w-full" value={Number(form.productid) || null} onValueChange={(e) => set("productid", e.value)} useGrouping={false} /></label>
      <label>Output Quantity<InputNumber className="mt-1 w-full" value={Number(form.quantity)} onValueChange={(e) => set("quantity", e.value)} min={0.01} /></label>
      <label>UOM<InputText className="mt-1 w-full" value={form.uom || ""} onChange={(e) => set("uom", e.target.value)} /></label>
    </div>
    <h3 className="text-lg font-semibold">Components</h3>
    {form.components.map((line, index) => <div className="grid gap-3 md:grid-cols-4" key={index}>
      <InputNumber placeholder="Component item ID" value={Number(line.componentid) || null} onValueChange={(e) => updateLine("components", index, "componentid", e.value)} useGrouping={false} />
      <InputNumber placeholder="Quantity" value={Number(line.quantity)} onValueChange={(e) => updateLine("components", index, "quantity", e.value)} min={0.01} />
      <InputText placeholder="UOM" value={line.uom || ""} onChange={(e) => updateLine("components", index, "uom", e.target.value)} />
      <Button text severity="danger" icon="pi pi-trash" onClick={() => set("components", form.components.filter((_, i) => i !== index))} />
    </div>)}
    <Button outlined label="Add Component" icon="pi pi-plus" onClick={() => set("components", [...form.components, { ...emptyComponent }])} />
    <h3 className="text-lg font-semibold">Operations</h3>
    {form.operations.map((line, index) => <div className="grid gap-3 md:grid-cols-4" key={index}>
      <InputText placeholder="Operation" value={line.operationname} onChange={(e) => updateLine("operations", index, "operationname", e.target.value)} />
      <InputText placeholder="Work center" value={line.workcenter || ""} onChange={(e) => updateLine("operations", index, "workcenter", e.target.value)} />
      <InputNumber placeholder="Minutes" value={Number(line.duration)} onValueChange={(e) => updateLine("operations", index, "duration", e.value)} min={0} />
      <Button text severity="danger" icon="pi pi-trash" onClick={() => set("operations", form.operations.filter((_, i) => i !== index))} />
    </div>)}
    <Button outlined label="Add Operation" icon="pi pi-plus" onClick={() => set("operations", [...form.operations, { ...emptyOperation }])} />
    <div className="flex justify-end gap-2"><Button outlined label="Cancel" onClick={() => navigate("/manufacturing/boms")} /><Button label="Save BoM" loading={saving} onClick={save} /></div>
  </div></Page>;
}
