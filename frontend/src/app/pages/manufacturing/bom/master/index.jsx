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
import { Checkbox } from "primereact/checkbox";
import { Tag } from "primereact/tag";
import { Divider } from "primereact/divider";
import { ConfirmDialog } from "primereact/confirmdialog";
import "./bom-master.css";

const BOM_TYPE_OPTIONS = [
  { label: "Manufacturing", value: "manufacturing", icon: "pi-cog", color: "#2563eb" },
  { label: "Kit", value: "kit", icon: "pi-box", color: "#7c3aed" },
  { label: "Subcontracting", value: "subcontracting", icon: "pi-truck", color: "#d97706" },
  { label: "Phantom", value: "phantom", icon: "pi-eye-slash", color: "#6b7280" },
];

const STATUS_OPTIONS = [
  { label: "Active", value: "active", severity: "success" },
  { label: "Draft", value: "draft", severity: "warning" },
  { label: "Obsolete", value: "obsolete", severity: "danger" },
];

const emptyComponent = () => ({
  _tempId: `${Date.now()}_${Math.random()}`,
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

  // Header
  const [bomname, setBomname] = useState("");
  const [bomcode, setBomcode] = useState("");
  const [bomtype, setBomtype] = useState("manufacturing");
  const [finishedItem, setFinishedItem] = useState(null);
  const [finishedItemSuggestions, setFinishedItemSuggestions] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [status, setStatus] = useState("active");
  const [description, setDescription] = useState("");
  const [effectivedate, setEffectivedate] = useState(null);
  const [expirydate, setExpirydate] = useState(null);

  // Components
  const [components, setComponents] = useState([emptyComponent()]);
  const [compItemSuggestions, setCompItemSuggestions] = useState([]);

  const [saving, setSaving] = useState(false);
  const [pageLoading, setPageLoading] = useState(isEdit);

  // ── Load existing BOM ─────────────────────────────────────────────────────
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
          setFinishedItem({ itemid: bom.finisheditemid, itemname: bom.finisheditemname, itemcode: bom.finisheditemcode, label: bom.finisheditemname });
          setQuantity(parseFloat(bom.quantity) || 1);
          setStatus(bom.status || "active");
          setDescription(bom.description || "");
          setEffectivedate(bom.effectivedate ? new Date(bom.effectivedate) : null);
          setExpirydate(bom.expirydate ? new Date(bom.expirydate) : null);
          if (bom.components?.length) {
            setComponents(
              bom.components.map((c, i) => ({
                _tempId: `${Date.now()}_${i}`,
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
                _itemObj: { itemid: c.componentitemid, itemname: c.componentname, itemcode: c.componentcode, label: c.componentname },
              }))
            );
          }
        } else {
          toast.current?.show({ severity: "error", summary: "Error", detail: "BOM not found", life: 3000 });
          navigate("/manufacturing/bom/bom-list");
        }
      } catch {
        toast.current?.show({ severity: "error", summary: "Error", detail: "Failed to load BOM", life: 3000 });
      } finally {
        setPageLoading(false);
      }
    })();
  }, [id, isEdit, navigate]);

  // ── Item Search ───────────────────────────────────────────────────────────
  const searchItems = useCallback(async (query) => {
    try {
      const res = await BOMService.searchItems(query);
      if (res.success) return (res.data || []).map((i) => ({ ...i, label: `${i.itemname}${i.itemcode ? ` (${i.itemcode})` : ""}` }));
    } catch { /* silent */ }
    return [];
  }, []);

  const onFinishedItemSearch = async (e) => setFinishedItemSuggestions(await searchItems(e.query));
  const onCompItemSearch = async (e) => setCompItemSuggestions(await searchItems(e.query));

  // ── Component CRUD ────────────────────────────────────────────────────────
  const addComponent = () => setComponents((prev) => [...prev, emptyComponent()]);

  const removeComponent = (tempId) => {
    if (components.length <= 1) {
      toast.current.show({ severity: "warn", summary: "Warning", detail: "At least one component is required", life: 2500 });
      return;
    }
    setComponents((prev) => prev.filter((c) => c._tempId !== tempId));
  };

  const updateComponent = (tempId, field, value) =>
    setComponents((prev) => prev.map((c) => (c._tempId === tempId ? { ...c, [field]: value } : c)));

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
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
      const res = isEdit ? await BOMService.updateBOM(id, payload) : await BOMService.createBOM(payload);
      if (res.success) {
        toast.current.show({
          severity: "success",
          summary: "Success",
          detail: isEdit ? "BOM updated successfully" : "BOM created successfully",
          life: 3000,
        });
        setTimeout(() => navigate("/manufacturing/bom/bom-list"), 1200);
      } else {
        toast.current.show({ severity: "error", summary: "Error", detail: res.error?.message || "Failed to save BOM", life: 4000 });
      }
    } catch (error) {
      toast.current.show({ severity: "error", summary: "Error", detail: error.message || "Unexpected error", life: 4000 });
    } finally {
      setSaving(false);
    }
  };

  const selectedBomType = BOM_TYPE_OPTIONS.find((o) => o.value === bomtype);
  const selectedStatus = STATUS_OPTIONS.find((o) => o.value === status);

  // Calculate effective cost preview
  const componentCount = components.filter((c) => c.componentitemid).length;
  const optionalCount = components.filter((c) => c.isoptional && c.componentitemid).length;

  if (pageLoading) {
    return (
      <Page title={isEdit ? "Edit BOM" : "Create BOM"}>
        <div className="bom-master-loading">
          <i className="pi pi-spin pi-spinner" />
          <span>Loading BOM data...</span>
        </div>
      </Page>
    );
  }

  return (
    <Page title={isEdit ? "Edit BOM" : "Create BOM"}>
      <Toast ref={toast} />
      <ConfirmDialog />

      <div className="bom-master-wrapper">
        {/* ── Sticky Top Bar ─────────────────────────────────────── */}
        <div className="bom-master-topbar">
          <div className="bom-master-topbar-left">
            <Button
              icon="pi pi-arrow-left"
              text
              rounded
              size="small"
              className="bom-back-btn"
              onClick={() => navigate("/manufacturing/bom/bom-list")}
            />
            <div>
              <div className="bom-master-breadcrumb">
                <span onClick={() => navigate("/manufacturing/bom/bom-list")} className="breadcrumb-link">
                  Bill of Materials
                </span>
                <i className="pi pi-angle-right breadcrumb-sep" />
                <span className="breadcrumb-current">{isEdit ? "Edit BOM" : "New BOM"}</span>
              </div>
              <h2 className="bom-master-title">
                {isEdit ? `Editing: ${bomname || "BOM"}` : "Create New Bill of Materials"}
              </h2>
            </div>
          </div>

          <div className="bom-master-topbar-right">
            <Button
              label="Cancel"
              outlined
              severity="secondary"
              size="small"
              onClick={() => navigate("/manufacturing/bom/bom-list")}
              disabled={saving}
            />
            <Button
              label={saving ? "Saving..." : isEdit ? "Update BOM" : "Create BOM"}
              icon={saving ? "pi pi-spin pi-spinner" : "pi pi-check"}
              size="small"
              className="bom-save-btn"
              onClick={handleSave}
              disabled={saving}
            />
          </div>
        </div>

        <div className="bom-master-body">
          {/* ── Left Column ─────────────────────────────────────── */}
          <div className="bom-master-left">
            {/* BOM Details Card */}
            <div className="bom-section-card">
              <div className="bom-section-header">
                <div className="bom-section-icon blue">
                  <i className="pi pi-info-circle" />
                </div>
                <h3 className="bom-section-title">BOM Details</h3>
              </div>

              <div className="bom-form-grid">
                {/* BOM Name */}
                <div className="bom-field bom-field-full">
                  <label className="bom-label">
                    BOM Name <span className="required">*</span>
                  </label>
                  <InputText
                    value={bomname}
                    onChange={(e) => setBomname(e.target.value)}
                    placeholder="e.g. BOM – Agri Product v1.0"
                    className="bom-input"
                  />
                </div>

                {/* BOM Code */}
                <div className="bom-field">
                  <label className="bom-label">Reference Code</label>
                  <InputText
                    value={bomcode}
                    onChange={(e) => setBomcode(e.target.value)}
                    placeholder="e.g. BOM-001"
                    className="bom-input"
                  />
                </div>

                {/* BOM Type */}
                <div className="bom-field">
                  <label className="bom-label">BOM Type</label>
                  <Dropdown
                    value={bomtype}
                    options={BOM_TYPE_OPTIONS}
                    onChange={(e) => setBomtype(e.value)}
                    className="w-full"
                    itemTemplate={(opt) => (
                      <div className="bom-type-option">
                        <i className={`pi ${opt.icon}`} style={{ color: opt.color }} />
                        <span>{opt.label}</span>
                      </div>
                    )}
                    valueTemplate={(opt) =>
                      opt && (
                        <div className="bom-type-option">
                          <i className={`pi ${opt.icon}`} style={{ color: opt.color }} />
                          <span>{opt.label}</span>
                        </div>
                      )
                    }
                  />
                </div>

                {/* Status */}
                <div className="bom-field">
                  <label className="bom-label">Status</label>
                  <Dropdown
                    value={status}
                    options={STATUS_OPTIONS}
                    onChange={(e) => setStatus(e.value)}
                    className="w-full"
                    itemTemplate={(opt) => <Tag value={opt.label} severity={opt.severity} rounded />}
                    valueTemplate={(opt) => opt && <Tag value={opt.label} severity={opt.severity} rounded />}
                  />
                </div>
              </div>
            </div>

            {/* Production Details Card */}
            <div className="bom-section-card">
              <div className="bom-section-header">
                <div className="bom-section-icon green">
                  <i className="pi pi-box" />
                </div>
                <h3 className="bom-section-title">Production Details</h3>
              </div>

              <div className="bom-form-grid">
                {/* Finished Product */}
                <div className="bom-field bom-field-full">
                  <label className="bom-label">
                    Finished Product <span className="required">*</span>
                  </label>
                  <AutoComplete
                    value={finishedItem}
                    suggestions={finishedItemSuggestions}
                    completeMethod={onFinishedItemSearch}
                    field="label"
                    placeholder="Search and select finished product..."
                    className="w-full"
                    inputClassName="bom-input w-full"
                    dropdown
                    forceSelection
                    onChange={(e) => {
                      const val = e.value;
                      if (val && typeof val === "object" && val.itemid) setFinishedItem(val);
                      else if (!val) setFinishedItem(null);
                    }}
                  />
                  {finishedItem && (
                    <div className="bom-selected-item">
                      {finishedItem.imgpath && (
                        <img src={finishedItem.imgpath} alt="" className="selected-item-img" onError={(e) => { e.target.style.display = "none"; }} />
                      )}
                      <span className="selected-item-code">Code: {finishedItem.itemcode || "N/A"}</span>
                    </div>
                  )}
                </div>

                {/* Output Quantity */}
                <div className="bom-field">
                  <label className="bom-label">Output Quantity</label>
                  <InputNumber
                    value={quantity}
                    onValueChange={(e) => setQuantity(e.value || 1)}
                    min={0.0001}
                    minFractionDigits={2}
                    maxFractionDigits={4}
                    className="w-full"
                    inputClassName="bom-input w-full"
                  />
                </div>

                {/* Effective Date */}
                <div className="bom-field">
                  <label className="bom-label">Effective Date</label>
                  <Calendar
                    value={effectivedate}
                    onChange={(e) => setEffectivedate(e.value)}
                    dateFormat="dd/mm/yy"
                    className="w-full"
                    inputClassName="bom-input"
                    showButtonBar
                    showIcon
                  />
                </div>

                {/* Expiry Date */}
                <div className="bom-field">
                  <label className="bom-label">Expiry Date</label>
                  <Calendar
                    value={expirydate}
                    onChange={(e) => setExpirydate(e.value)}
                    dateFormat="dd/mm/yy"
                    className="w-full"
                    inputClassName="bom-input"
                    showButtonBar
                    showIcon
                  />
                </div>

                {/* Description */}
                <div className="bom-field bom-field-full">
                  <label className="bom-label">Description / Notes</label>
                  <InputTextarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    placeholder="Optional notes or production instructions..."
                    className="bom-input w-full"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── Right Column — BOM Summary Card ─────────────────── */}
          <div className="bom-master-right">
            <div className="bom-summary-card">
              <div className="bom-summary-header">
                <i className="pi pi-chart-bar" />
                <span>BOM Summary</span>
              </div>
              <div className="bom-summary-body">
                <div className="bom-summary-row">
                  <span className="summary-label">Type</span>
                  <div className="bom-type-badge" style={{ color: selectedBomType?.color }}>
                    <i className={`pi ${selectedBomType?.icon || "pi-cog"}`} />
                    <span>{selectedBomType?.label || "—"}</span>
                  </div>
                </div>
                <div className="bom-summary-row">
                  <span className="summary-label">Status</span>
                  {selectedStatus && <Tag value={selectedStatus.label} severity={selectedStatus.severity} rounded />}
                </div>
                <div className="bom-summary-row">
                  <span className="summary-label">Finished Item</span>
                  <span className="summary-value">{finishedItem?.itemname || "—"}</span>
                </div>
                <div className="bom-summary-row">
                  <span className="summary-label">Output Qty</span>
                  <span className="summary-value">{quantity}</span>
                </div>
                <Divider className="my-2" />
                <div className="bom-summary-row">
                  <span className="summary-label">Components</span>
                  <span className="summary-value highlight">{componentCount}</span>
                </div>
                <div className="bom-summary-row">
                  <span className="summary-label">Optional</span>
                  <span className="summary-value">{optionalCount}</span>
                </div>
                {effectivedate && (
                  <div className="bom-summary-row">
                    <span className="summary-label">Effective</span>
                    <span className="summary-value">{effectivedate.toLocaleDateString("en-IN")}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Components Section ──────────────────────────────────── */}
        <div className="bom-components-card">
          <div className="bom-components-header">
            <div className="bom-section-header" style={{ marginBottom: 0 }}>
              <div className="bom-section-icon orange">
                <i className="pi pi-list" />
              </div>
              <div>
                <h3 className="bom-section-title" style={{ marginBottom: 0 }}>
                  Components
                  <span className="component-count">{componentCount} of {components.length}</span>
                </h3>
                <p className="bom-section-desc">Raw materials and sub-assemblies needed to produce the finished item</p>
              </div>
            </div>
            <Button
              label="Add Component"
              icon="pi pi-plus"
              size="small"
              outlined
              className="btn-add-component"
              onClick={addComponent}
            />
          </div>

          <div className="bom-components-table-wrapper">
            <table className="bom-components-table">
              <thead>
                <tr>
                  <th className="col-seq">#</th>
                  <th className="col-item">Component Item *</th>
                  <th className="col-qty">Quantity *</th>
                  <th className="col-scrap">Scrap %</th>
                  <th className="col-optional">Optional</th>
                  <th className="col-notes">Notes</th>
                  <th className="col-action" />
                </tr>
              </thead>
              <tbody>
                {components.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="bom-empty-components">
                      <i className="pi pi-inbox" />
                      <span>No components added yet</span>
                      <Button label="Add Component" icon="pi pi-plus" size="small" text onClick={addComponent} />
                    </td>
                  </tr>
                ) : (
                  components.map((comp, idx) => (
                    <tr key={comp._tempId} className={comp.componentitemid ? "comp-row comp-row-filled" : "comp-row"}>
                      <td className="col-seq">
                        <span className="seq-badge">{idx + 1}</span>
                      </td>
                      <td className="col-item">
                        <AutoComplete
                          value={comp._itemObj}
                          suggestions={compItemSuggestions}
                          completeMethod={onCompItemSearch}
                          field="label"
                          placeholder="Search component..."
                          className="w-full"
                          inputClassName="comp-input w-full"
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
                      <td className="col-qty">
                        <InputNumber
                          value={comp.quantity}
                          onValueChange={(e) => updateComponent(comp._tempId, "quantity", e.value)}
                          min={0.0001}
                          minFractionDigits={2}
                          maxFractionDigits={4}
                          className="w-full"
                          inputClassName="comp-input w-full"
                        />
                      </td>
                      <td className="col-scrap">
                        <InputNumber
                          value={comp.scrap_percentage}
                          onValueChange={(e) => updateComponent(comp._tempId, "scrap_percentage", e.value ?? 0)}
                          suffix="%"
                          min={0}
                          max={100}
                          minFractionDigits={0}
                          maxFractionDigits={2}
                          className="w-full"
                          inputClassName="comp-input w-full"
                        />
                      </td>
                      <td className="col-optional">
                        <Checkbox
                          checked={comp.isoptional}
                          onChange={(e) => updateComponent(comp._tempId, "isoptional", e.checked)}
                          className="bom-checkbox"
                        />
                      </td>
                      <td className="col-notes">
                        <InputText
                          value={comp.notes}
                          onChange={(e) => updateComponent(comp._tempId, "notes", e.target.value)}
                          placeholder="Notes..."
                          className="comp-input w-full"
                        />
                      </td>
                      <td className="col-action">
                        <Button
                          icon="pi pi-trash"
                          rounded
                          text
                          severity="danger"
                          size="small"
                          className="comp-delete-btn"
                          onClick={() => removeComponent(comp._tempId)}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {components.length > 0 && (
            <div className="bom-components-footer">
              <Button
                label="Add Another Component"
                icon="pi pi-plus"
                size="small"
                text
                onClick={addComponent}
                className="btn-add-more"
              />
              <span className="components-total">{componentCount} component{componentCount !== 1 ? "s" : ""} added</span>
            </div>
          )}
        </div>

        {/* ── Bottom Action Bar ──────────────────────────────────── */}
        <div className="bom-master-action-bar">
          <Button
            label="Cancel"
            outlined
            severity="secondary"
            onClick={() => navigate("/manufacturing/bom/bom-list")}
            disabled={saving}
          />
          <Button
            label={saving ? "Saving..." : isEdit ? "Update BOM" : "Create BOM"}
            icon={saving ? "pi pi-spin pi-spinner" : "pi pi-check"}
            className="bom-save-btn"
            onClick={handleSave}
            disabled={saving}
          />
        </div>
      </div>
    </Page>
  );
}
