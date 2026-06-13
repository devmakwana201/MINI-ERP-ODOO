import { Page } from "components/shared/Page";
import { Toast } from "primereact/toast";
import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router";
import { BOMService } from "services/master-records/bom";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Dropdown } from "primereact/dropdown";
import { AutoComplete } from "primereact/autocomplete";
import { InputNumber } from "primereact/inputnumber";
import { Calendar } from "primereact/calendar";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import { Tag } from "primereact/tag";
import { Divider } from "primereact/divider";
import { Checkbox } from "primereact/checkbox";

const BOM_TYPE_OPTIONS = [
  { label: "Manufacturing", value: "manufacturing" },
  { label: "Kit", value: "kit" },
  { label: "Subcontracting", value: "subcontracting" },
  { label: "Phantom", value: "phantom" },
];

const STATUS_OPTIONS = [
  { label: "Active", value: "active" },
  { label: "Draft", value: "draft" },
  { label: "Obsolete", value: "obsolete" },
];

const emptyComponent = () => ({
  _tempId: Math.random(),
  componentitemid: null,
  componentname: "",
  quantity: 1,
  uomid: null,
  uomname: "",
  scrap_percentage: 0,
  notes: "",
  isoptional: false,
  sortorder: 0,
  _itemObj: null,
});

export default function BOMMaster() {
  const toast = useRef(null);
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  // Header fields
  const [bomname, setBomname] = useState("");
  const [bomcode, setBomcode] = useState("");
  const [bomtype, setBomtype] = useState("manufacturing");
  const [finishedItem, setFinishedItem] = useState(null);
  const [finishedItemSearch, setFinishedItemSearch] = useState("");
  const [finishedItemSuggestions, setFinishedItemSuggestions] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [status, setStatus] = useState("active");
  const [description, setDescription] = useState("");
  const [effectivedate, setEffectivedate] = useState(null);
  const [expirydate, setExpirydate] = useState(null);

  // Components list
  const [components, setComponents] = useState([emptyComponent()]);

  // Component item search (per-row)
  const [compItemSuggestions, setCompItemSuggestions] = useState([]);

  const [saving, setSaving] = useState(false);
  const [pageLoading, setPageLoading] = useState(isEdit);

  // ── Load existing BOM for edit ──────────────────────────────────────────
  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      setPageLoading(true);
      try {
        const res = await BOMService.getBOMById(id);
        if (res.success && res.data) {
          const bom = res.data;
          setBomname(bom.bomname || "");
          setBomcode(bom.bomcode || "");
          setBomtype(bom.bomtype || "manufacturing");
          setFinishedItem({ itemid: bom.finisheditemid, itemname: bom.finisheditemname, itemcode: bom.finisheditemcode });
          setFinishedItemSearch(bom.finisheditemname || "");
          setQuantity(parseFloat(bom.quantity) || 1);
          setStatus(bom.status || "active");
          setDescription(bom.description || "");
          setEffectivedate(bom.effectivedate ? new Date(bom.effectivedate) : null);
          setExpirydate(bom.expirydate ? new Date(bom.expirydate) : null);

          // Map components
          if (bom.components && bom.components.length > 0) {
            setComponents(
              bom.components.map((c, i) => ({
                _tempId: Math.random(),
                bomcomponentid: c.bomcomponentid,
                componentitemid: c.componentitemid,
                componentname: c.componentname,
                quantity: parseFloat(c.quantity) || 1,
                uomid: c.uomid,
                uomname: c.uomname,
                scrap_percentage: parseFloat(c.scrap_percentage) || 0,
                notes: c.notes || "",
                isoptional: Boolean(c.isoptional),
                sortorder: c.sortorder ?? i + 1,
                _itemObj: { itemid: c.componentitemid, itemname: c.componentname, itemcode: c.componentcode },
              }))
            );
          }
        } else {
          toast.current?.show({ severity: "error", summary: "Error", detail: "BOM not found", life: 3000 });
          navigate("/master-records/bom/bom-list");
        }
      } catch (error) {
        toast.current?.show({ severity: "error", summary: "Error", detail: "Failed to load BOM", life: 3000 });
      } finally {
        setPageLoading(false);
      }
    })();
  }, [id, isEdit, navigate]);

  // ── Item Search (finished product & components) ─────────────────────────
  const searchItems = useCallback(async (query) => {
    try {
      const res = await BOMService.searchItems(query);
      if (res.success) {
        return res.data || [];
      }
    } catch {
      // silently fail
    }
    return [];
  }, []);

  const onFinishedItemSearch = async (e) => {
    const items = await searchItems(e.query);
    setFinishedItemSuggestions(items.map((i) => ({ ...i, label: `${i.itemname}${i.itemcode ? ` (${i.itemcode})` : ""}` })));
  };

  const onCompItemSearch = async (e) => {
    const items = await searchItems(e.query);
    setCompItemSuggestions(items.map((i) => ({ ...i, label: `${i.itemname}${i.itemcode ? ` (${i.itemcode})` : ""}` })));
  };

  // ── Component CRUD ────────────────────────────────────────────────────────
  const addComponent = () => {
    setComponents((prev) => [...prev, emptyComponent()]);
  };

  const removeComponent = (tempId) => {
    setComponents((prev) => prev.filter((c) => c._tempId !== tempId));
  };

  const updateComponent = (tempId, field, value) => {
    setComponents((prev) =>
      prev.map((c) => (c._tempId === tempId ? { ...c, [field]: value } : c))
    );
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    // Basic validation
    if (!bomname.trim()) {
      toast.current.show({ severity: "warn", summary: "Validation", detail: "BOM Name is required", life: 3000 });
      return;
    }
    if (!finishedItem?.itemid) {
      toast.current.show({ severity: "warn", summary: "Validation", detail: "Finished Product is required", life: 3000 });
      return;
    }
    if (components.length === 0) {
      toast.current.show({ severity: "warn", summary: "Validation", detail: "Add at least one component", life: 3000 });
      return;
    }
    for (const c of components) {
      if (!c.componentitemid) {
        toast.current.show({ severity: "warn", summary: "Validation", detail: "Each component must have an item selected", life: 3000 });
        return;
      }
      if (!c.quantity || c.quantity <= 0) {
        toast.current.show({ severity: "warn", summary: "Validation", detail: "Each component quantity must be > 0", life: 3000 });
        return;
      }
    }

    const payload = {
      bomname: bomname.trim(),
      bomcode: bomcode.trim() || null,
      bomtype,
      finisheditemid: finishedItem.itemid,
      quantity,
      status,
      description: description.trim() || null,
      effectivedate: effectivedate ? effectivedate.toISOString().split("T")[0] : null,
      expirydate: expirydate ? expirydate.toISOString().split("T")[0] : null,
      components: components.map((c, i) => ({
        componentitemid: c.componentitemid,
        quantity: c.quantity,
        uomid: c.uomid || null,
        scrap_percentage: c.scrap_percentage || 0,
        notes: c.notes || null,
        isoptional: c.isoptional ? 1 : 0,
        sortorder: i + 1,
      })),
    };

    setSaving(true);
    try {
      let res;
      if (isEdit) {
        res = await BOMService.updateBOM(id, payload);
      } else {
        res = await BOMService.createBOM(payload);
      }

      if (res.success) {
        toast.current.show({
          severity: "success",
          summary: "Success",
          detail: isEdit ? "BOM updated successfully" : "BOM created successfully",
          life: 3000,
        });
        setTimeout(() => navigate("/master-records/bom/bom-list"), 1200);
      } else {
        toast.current.show({
          severity: "error",
          summary: "Error",
          detail: res.error?.message || "Failed to save BOM",
          life: 4000,
        });
      }
    } catch (error) {
      toast.current.show({ severity: "error", summary: "Error", detail: error.message || "Unexpected error", life: 4000 });
    } finally {
      setSaving(false);
    }
  };

  // ── Component row editors ─────────────────────────────────────────────────
  const renderComponentRow = (comp) => (
    <tr key={comp._tempId} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
      {/* Drag handle / sort order */}
      <td className="py-2 px-2 text-center text-gray-400 cursor-grab w-10">
        <i className="pi pi-bars" />
      </td>

      {/* Component Item */}
      <td className="py-2 px-2" style={{ minWidth: "220px" }}>
        <AutoComplete
          value={comp._itemObj}
          suggestions={compItemSuggestions}
          completeMethod={onCompItemSearch}
          field="label"
          placeholder="Search component..."
          className="w-full"
          inputClassName="w-full p-inputtext-sm"
          dropdown
          forceSelection
          onChange={(e) => {
            const val = e.value;
            if (val && typeof val === "object" && val.itemid) {
              updateComponent(comp._tempId, "_itemObj", val);
              updateComponent(comp._tempId, "componentitemid", val.itemid);
              updateComponent(comp._tempId, "componentname", val.itemname);
            } else if (!val) {
              updateComponent(comp._tempId, "_itemObj", null);
              updateComponent(comp._tempId, "componentitemid", null);
              updateComponent(comp._tempId, "componentname", "");
            }
          }}
        />
      </td>

      {/* Quantity */}
      <td className="py-2 px-2 w-28">
        <InputNumber
          value={comp.quantity}
          onValueChange={(e) => updateComponent(comp._tempId, "quantity", e.value)}
          min={0.0001}
          minFractionDigits={2}
          maxFractionDigits={4}
          className="w-full"
          inputClassName="w-full p-inputtext-sm"
        />
      </td>

      {/* Scrap % */}
      <td className="py-2 px-2 w-28">
        <InputNumber
          value={comp.scrap_percentage}
          onValueChange={(e) => updateComponent(comp._tempId, "scrap_percentage", e.value ?? 0)}
          suffix="%"
          min={0}
          max={100}
          minFractionDigits={0}
          maxFractionDigits={2}
          className="w-full"
          inputClassName="w-full p-inputtext-sm"
        />
      </td>

      {/* Optional */}
      <td className="py-2 px-2 w-20 text-center">
        <Checkbox
          checked={comp.isoptional}
          onChange={(e) => updateComponent(comp._tempId, "isoptional", e.checked)}
        />
      </td>

      {/* Notes */}
      <td className="py-2 px-2">
        <InputText
          value={comp.notes}
          onChange={(e) => updateComponent(comp._tempId, "notes", e.target.value)}
          placeholder="Notes..."
          className="w-full p-inputtext-sm"
        />
      </td>

      {/* Remove */}
      <td className="py-2 px-2 w-12 text-center">
        <Button
          icon="pi pi-trash"
          rounded
          text
          severity="danger"
          size="small"
          onClick={() => {
            if (components.length === 1) {
              toast.current.show({ severity: "warn", summary: "Warning", detail: "At least one component is required", life: 3000 });
              return;
            }
            removeComponent(comp._tempId);
          }}
        />
      </td>
    </tr>
  );

  if (pageLoading) {
    return (
      <Page title={isEdit ? "Edit BOM" : "Create BOM"}>
        <div className="flex h-64 items-center justify-center">
          <i className="pi pi-spin pi-spinner text-3xl text-primary-500" />
        </div>
      </Page>
    );
  }

  return (
    <Page title={isEdit ? "Edit BOM" : "Create BOM"}>
      <Toast ref={toast} />
      <ConfirmDialog />

      <div className="w-full px-(--margin-x) pt-5 lg:pt-6 pb-10">
        {/* ── Page Header ── */}
        <div className="mb-6 flex items-center gap-3">
          <Button
            icon="pi pi-arrow-left"
            text
            rounded
            size="small"
            onClick={() => navigate("/master-records/bom/bom-list")}
          />
          <div>
            <h2 className="text-xl font-bold text-gray-800">{isEdit ? "Edit Bill of Materials" : "New Bill of Materials"}</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {isEdit ? `Editing BOM: ${bomname}` : "Define the components required to manufacture or assemble a product"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-5">
          {/* ── BOM Header Section ── */}
          <div className="col-span-12">
            <div className="prime-card">
              <div className="mb-4 flex items-center gap-2">
                <i className="pi pi-info-circle text-primary-500" />
                <h3 className="font-semibold text-gray-700">BOM Details</h3>
              </div>

              <div className="grid grid-cols-12 gap-4">
                {/* BOM Name */}
                <div className="col-span-12 md:col-span-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    BOM Name <span className="text-red-500">*</span>
                  </label>
                  <InputText
                    value={bomname}
                    onChange={(e) => setBomname(e.target.value)}
                    placeholder="e.g. BOM - Product A v1"
                    className="w-full"
                  />
                </div>

                {/* BOM Code */}
                <div className="col-span-12 md:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">BOM Code</label>
                  <InputText
                    value={bomcode}
                    onChange={(e) => setBomcode(e.target.value)}
                    placeholder="e.g. BOM-001"
                    className="w-full"
                  />
                </div>

                {/* BOM Type */}
                <div className="col-span-12 md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">BOM Type</label>
                  <Dropdown
                    value={bomtype}
                    options={BOM_TYPE_OPTIONS}
                    onChange={(e) => setBomtype(e.value)}
                    className="w-full"
                  />
                </div>

                {/* Status */}
                <div className="col-span-12 md:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <Dropdown
                    value={status}
                    options={STATUS_OPTIONS}
                    onChange={(e) => setStatus(e.value)}
                    className="w-full"
                    itemTemplate={(opt) => (
                      <Tag value={opt.label} severity={opt.value === "active" ? "success" : opt.value === "draft" ? "warning" : "danger"} rounded />
                    )}
                    valueTemplate={(opt) => opt && (
                      <Tag value={opt.label} severity={opt.value === "active" ? "success" : opt.value === "draft" ? "warning" : "danger"} rounded />
                    )}
                  />
                </div>

                {/* Finished Product */}
                <div className="col-span-12 md:col-span-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Finished Product <span className="text-red-500">*</span>
                  </label>
                  <AutoComplete
                    value={finishedItem}
                    suggestions={finishedItemSuggestions}
                    completeMethod={onFinishedItemSearch}
                    field="label"
                    placeholder="Search product..."
                    className="w-full"
                    inputClassName="w-full"
                    dropdown
                    forceSelection
                    onChange={(e) => {
                      const val = e.value;
                      if (val && typeof val === "object" && val.itemid) {
                        setFinishedItem(val);
                        setFinishedItemSearch(val.itemname);
                      } else if (!val) {
                        setFinishedItem(null);
                        setFinishedItemSearch("");
                      }
                    }}
                  />
                  {finishedItem && (
                    <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
                      {finishedItem.imgpath && (
                        <img src={finishedItem.imgpath} alt="" className="h-6 w-6 rounded-full object-contain border" onError={(e) => { e.target.style.display = "none"; }} />
                      )}
                      <span>Code: {finishedItem.itemcode || "N/A"}</span>
                    </div>
                  )}
                </div>

                {/* Output Quantity */}
                <div className="col-span-12 md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Output Quantity</label>
                  <InputNumber
                    value={quantity}
                    onValueChange={(e) => setQuantity(e.value || 1)}
                    min={0.0001}
                    minFractionDigits={2}
                    maxFractionDigits={4}
                    className="w-full"
                    inputClassName="w-full"
                  />
                </div>

                {/* Effective Date */}
                <div className="col-span-12 md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Effective Date</label>
                  <Calendar value={effectivedate} onChange={(e) => setEffectivedate(e.value)} dateFormat="dd/mm/yy" className="w-full" showButtonBar />
                </div>

                {/* Expiry Date */}
                <div className="col-span-12 md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                  <Calendar value={expirydate} onChange={(e) => setExpirydate(e.value)} dateFormat="dd/mm/yy" className="w-full" showButtonBar />
                </div>

                {/* Description */}
                <div className="col-span-12">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <InputTextarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    placeholder="Optional description or notes about this BOM..."
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── Components Section ── */}
          <div className="col-span-12">
            <div className="prime-card">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <i className="pi pi-list text-primary-500" />
                  <h3 className="font-semibold text-gray-700">
                    Components
                    <span className="ml-2 text-xs font-normal text-gray-400">({components.length})</span>
                  </h3>
                </div>
                <Button
                  label="Add Component"
                  icon="pi pi-plus"
                  size="small"
                  outlined
                  onClick={addComponent}
                />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-gray-200 bg-gray-50 text-gray-600">
                      <th className="py-2 px-2 w-10" />
                      <th className="py-2 px-2 text-left">Component Item *</th>
                      <th className="py-2 px-2 text-left w-28">Quantity *</th>
                      <th className="py-2 px-2 text-left w-28">Scrap %</th>
                      <th className="py-2 px-2 text-center w-20">Optional</th>
                      <th className="py-2 px-2 text-left">Notes</th>
                      <th className="py-2 px-2 w-12" />
                    </tr>
                  </thead>
                  <tbody>
                    {components.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-gray-400">
                          <i className="pi pi-inbox text-3xl mb-2 block" />
                          No components added yet. Click "Add Component" to start.
                        </td>
                      </tr>
                    ) : (
                      components.map(renderComponentRow)
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* ── Action Buttons ── */}
          <div className="col-span-12 flex justify-end gap-3">
            <Button
              label="Cancel"
              icon="pi pi-times"
              outlined
              severity="secondary"
              onClick={() => navigate("/master-records/bom/bom-list")}
              disabled={saving}
            />
            <Button
              label={saving ? "Saving..." : isEdit ? "Update BOM" : "Create BOM"}
              icon={saving ? "pi pi-spin pi-spinner" : "pi pi-check"}
              onClick={handleSave}
              disabled={saving}
            />
          </div>
        </div>
      </div>
    </Page>
  );
}
