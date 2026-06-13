import { Page } from "components/shared/Page";
import { Toast } from "primereact/toast";
import { useCallback, useEffect, useRef, useState } from "react";
import { BOMService } from "services/master-records/bom";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { Button } from "primereact/button";
import { useNavigate } from "react-router";
import { Dialog } from "primereact/dialog";
import { Skeleton } from "primereact/skeleton";
import { FilterMatchMode } from "primereact/api";
import { Tag } from "primereact/tag";
import { Tooltip } from "primereact/tooltip";
import { scrollToTop } from "utils/scrollToTop";
import EmptyMessage from "components/shared/EmptyMessage";
import { unparse } from "papaparse";
import "./bom-list.css";

const BOM_TYPE_LABELS = {
  manufacturing: "Manufacturing",
  kit: "Kit",
  subcontracting: "Subcontracting",
  phantom: "Phantom",
};

const BOM_TYPE_SEVERITY = {
  manufacturing: "info",
  kit: "secondary",
  subcontracting: "warning",
  phantom: "contrast",
};

const STATUS_SEVERITY = {
  active: "success",
  draft: "warning",
  obsolete: "danger",
};

export default function BOMList() {
  const toast = useRef(null);
  const navigate = useNavigate();

  const [bomList, setBomList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalRecords, setTotalRecords] = useState(0);

  const [deleteBOMDialog, setDeleteBOMDialog] = useState(false);
  const [deleteBOMId, setDeleteBOMId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [lazyParams, setLazyParams] = useState({
    first: 0,
    rows: 10,
    sortField: null,
    sortOrder: null,
  });

  const [filters, setFilters] = useState({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    bomname: { value: null, matchMode: FilterMatchMode.CONTAINS },
    bomcode: { value: null, matchMode: FilterMatchMode.CONTAINS },
    finisheditemname: { value: null, matchMode: FilterMatchMode.CONTAINS },
    bomtype: { value: null, matchMode: FilterMatchMode.CONTAINS },
    status: { value: null, matchMode: FilterMatchMode.CONTAINS },
  });

  const fetchBOMs = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await BOMService.getBOMs({
        filters,
        start: lazyParams.first,
        length: lazyParams.rows,
        sortField: lazyParams.sortField,
        sortOrder: lazyParams.sortOrder === 1 ? "asc" : "desc",
      });

      if (response.success) {
        setBomList(response.data);
        setTotalRecords(response.totalRecords);
      } else {
        toast.current?.show({ severity: "error", summary: "Error", detail: response.error?.message || "Failed to load BOM data", life: 3000 });
        setBomList([]);
        setTotalRecords(0);
      }
    } catch (error) {
      toast.current?.show({ severity: "error", summary: "Error", detail: error.message || "Failed to load BOM data", life: 3000 });
      setBomList([]);
      setTotalRecords(0);
    } finally {
      setIsLoading(false);
    }
  }, [filters, lazyParams]);

  useEffect(() => {
    const t = setTimeout(fetchBOMs, 500);
    return () => clearTimeout(t);
  }, [filters, fetchBOMs]);

  const blankRow = { bomname: "", bomcode: "", bomtype: "", finisheditemname: "", quantity: "", uomname: "", status: "" };

  // ── Export ────────────────────────────────────────────────────────────────
  const exportCSV = () => {
    if (!bomList.length) {
      toast.current.show({ severity: "warn", summary: "Warning", detail: "No data to export", life: 3000 });
      return;
    }
    const data = bomList.map((b) => ({
      "BOM Name": b.bomname,
      "BOM Code": b.bomcode || "-",
      Type: BOM_TYPE_LABELS[b.bomtype] || b.bomtype,
      "Finished Product": b.finisheditemname,
      "Output Qty": b.quantity,
      UOM: b.uomname || "-",
      Status: b.status,
    }));
    const csv = unparse(data);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.setAttribute("download", "bom_list.csv");
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.current.show({ severity: "success", detail: "CSV exported", life: 2000 });
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const confirmDelete = (rowData) => {
    setDeleteBOMId(rowData.bomid);
    setDeleteBOMDialog(true);
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      const res = await BOMService.deleteBOM(deleteBOMId);
      if (res.success) {
        toast.current.show({ severity: "success", summary: "Success", detail: "BOM deleted", life: 3000 });
        setDeleteBOMDialog(false);
        fetchBOMs();
      } else {
        toast.current.show({ severity: "error", summary: "Error", detail: res.error?.message || "Failed to delete", life: 3000 });
      }
    } catch (error) {
      toast.current.show({ severity: "error", summary: "Error", detail: error.message || "Failed to delete", life: 3000 });
    } finally {
      setDeleteLoading(false);
    }
  };

  // ── Stats ─────────────────────────────────────────────────────────────────
  const totalActive = bomList.filter((b) => b.status === "active").length;
  const totalDraft = bomList.filter((b) => b.status === "draft").length;
  const totalObsolete = bomList.filter((b) => b.status === "obsolete").length;

  // ── Cell Templates ────────────────────────────────────────────────────────
  const bomNameTemplate = (rowData) =>
    isLoading ? (
      <Skeleton width="80%" height="1.4rem" />
    ) : (
      <div className="bom-name-cell">
        <span className="bom-name-text">{rowData.bomname}</span>
        {rowData.bomcode && <span className="bom-code-badge">{rowData.bomcode}</span>}
      </div>
    );

  const bomTypeTemplate = (rowData) =>
    isLoading ? (
      <Skeleton width="70%" height="1.4rem" />
    ) : (
      <Tag
        value={BOM_TYPE_LABELS[rowData.bomtype] || rowData.bomtype}
        severity={BOM_TYPE_SEVERITY[rowData.bomtype] || "info"}
        rounded
      />
    );

  const finishedItemTemplate = (rowData) =>
    isLoading ? (
      <Skeleton width="80%" height="1.4rem" />
    ) : (
      <div className="finished-item-cell">
        {rowData.finisheditemimg ? (
          <img
            src={rowData.finisheditemimg}
            alt=""
            className="finished-item-img"
            onError={(e) => { e.target.style.display = "none"; }}
          />
        ) : (
          <div className="finished-item-placeholder">
            <i className="pi pi-box" />
          </div>
        )}
        <div className="finished-item-info">
          <span className="finished-item-name">{rowData.finisheditemname || "-"}</span>
          {rowData.finisheditemcode && (
            <span className="finished-item-code">{rowData.finisheditemcode}</span>
          )}
        </div>
      </div>
    );

  const quantityTemplate = (rowData) =>
    isLoading ? (
      <Skeleton width="50%" height="1.4rem" />
    ) : (
      <span className="quantity-cell">
        <strong>{parseFloat(rowData.quantity || 0).toFixed(2)}</strong>
        {rowData.uomname && <span className="uom-label"> {rowData.uomname}</span>}
      </span>
    );

  const statusTemplate = (rowData) =>
    isLoading ? (
      <Skeleton width="60%" height="1.4rem" />
    ) : (
      <Tag value={rowData.status} severity={STATUS_SEVERITY[rowData.status] || "info"} rounded className="capitalize" />
    );

  const actionTemplate = (rowData) =>
    isLoading ? (
      <Skeleton shape="circle" size="2rem" />
    ) : (
      <div className="action-cell">
        <Button
          icon="pi pi-pencil"
          rounded
          text
          size="small"
          className="bom-tooltip action-edit"
          data-pr-tooltip="Edit BOM"
          onClick={() => navigate(`/manufacturing/bom/update/${rowData.bomid}`)}
        />
        <Button
          icon="pi pi-trash"
          rounded
          text
          size="small"
          severity="danger"
          className="bom-tooltip action-delete"
          data-pr-tooltip="Delete BOM"
          onClick={() => confirmDelete(rowData)}
        />
      </div>
    );

  // ── Header ────────────────────────────────────────────────────────────────
  const renderHeader = () => (
    <div className="bom-table-header">
      <div className="bom-table-header-left">
        <IconField iconPosition="left" className="bom-search-field">
          <InputIcon className="pi pi-search" />
          <InputText
            type="search"
            value={filters.global?.value || ""}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, global: { ...prev.global, value: e.target.value } }))
            }
            placeholder="Search BOM, product..."
          />
        </IconField>
      </div>

      <div className="bom-table-header-right">
        <Button
          icon="pi pi-file"
          text
          size="small"
          className="bom-tooltip"
          data-pr-tooltip="Export CSV"
          onClick={exportCSV}
          disabled={isLoading}
        />
        <Button
          label="New BOM"
          icon="pi pi-plus"
          size="small"
          className="btn-new-bom"
          onClick={() => navigate("/manufacturing/bom/add")}
        />
        <Tooltip target=".bom-tooltip" position="top" style={{ fontSize: "12px" }} showDelay={100} hideDelay={100} />
      </div>
    </div>
  );

  return (
    <Page title="Bill of Materials">
      <Toast ref={toast} />

      {/* Delete Dialog */}
      <Dialog
        visible={deleteBOMDialog}
        style={{ width: "420px" }}
        header={
          <div className="delete-dialog-header">
            <i className="pi pi-exclamation-triangle" />
            <span>Confirm Delete</span>
          </div>
        }
        modal
        onHide={() => setDeleteBOMDialog(false)}
        footer={
          <div className="delete-dialog-footer">
            <Button label="Cancel" outlined onClick={() => setDeleteBOMDialog(false)} disabled={deleteLoading} />
            <Button
              label={deleteLoading ? "Deleting..." : "Delete"}
              icon={deleteLoading ? "pi pi-spin pi-spinner" : "pi pi-trash"}
              severity="danger"
              onClick={handleDelete}
              disabled={deleteLoading}
            />
          </div>
        }
      >
        <p className="delete-dialog-body">
          Are you sure you want to delete this BOM? All associated component data will also be removed. This action cannot be undone.
        </p>
      </Dialog>

      <div className="bom-page-wrapper">
        {/* ── Page Hero ──────────────────────────────────────────────── */}
        <div className="bom-page-hero">
          <div className="bom-hero-content">
            <div className="bom-hero-icon">
              <i className="pi pi-sitemap" />
            </div>
            <div>
              <h1 className="bom-hero-title">Bill of Materials</h1>
              <p className="bom-hero-subtitle">
                Define the components and raw materials required to manufacture your products
              </p>
            </div>
          </div>
          <Button
            label="New BOM"
            icon="pi pi-plus"
            className="btn-new-bom-hero"
            onClick={() => navigate("/manufacturing/bom/add")}
          />
        </div>

        {/* ── Stats Cards ───────────────────────────────────────────── */}
        <div className="bom-stats-grid">
          <div className="bom-stat-card bom-stat-total">
            <div className="bom-stat-icon">
              <i className="pi pi-sitemap" />
            </div>
            <div className="bom-stat-body">
              <span className="bom-stat-label">Total BOMs</span>
              <span className="bom-stat-value">{isLoading ? "—" : totalRecords}</span>
            </div>
          </div>
          <div className="bom-stat-card bom-stat-active">
            <div className="bom-stat-icon">
              <i className="pi pi-check-circle" />
            </div>
            <div className="bom-stat-body">
              <span className="bom-stat-label">Active</span>
              <span className="bom-stat-value">{isLoading ? "—" : totalActive}</span>
            </div>
          </div>
          <div className="bom-stat-card bom-stat-draft">
            <div className="bom-stat-icon">
              <i className="pi pi-file-edit" />
            </div>
            <div className="bom-stat-body">
              <span className="bom-stat-label">Draft</span>
              <span className="bom-stat-value">{isLoading ? "—" : totalDraft}</span>
            </div>
          </div>
          <div className="bom-stat-card bom-stat-obsolete">
            <div className="bom-stat-icon">
              <i className="pi pi-ban" />
            </div>
            <div className="bom-stat-body">
              <span className="bom-stat-label">Obsolete</span>
              <span className="bom-stat-value">{isLoading ? "—" : totalObsolete}</span>
            </div>
          </div>
        </div>

        {/* ── Data Table ────────────────────────────────────────────── */}
        <div className="bom-table-card">
          <DataTable
            value={isLoading ? Array.from({ length: 10 }, () => blankRow) : bomList}
            header={renderHeader()}
            className="bom-datatable"
            emptyMessage={
              <EmptyMessage
                title="No BOMs found"
                subtitle="Create your first Bill of Materials to get started with manufacturing management."
              />
            }
            paginator
            lazy
            filterDisplay="row"
            filters={filters}
            globalFilterFields={["bomname", "bomcode", "finisheditemname", "bomtype", "status"]}
            onFilter={(e) => {
              setIsLoading(true);
              setFilters(e.filters);
              setLazyParams((prev) => ({ ...prev, first: 0 }));
              scrollToTop();
            }}
            onPage={(e) => {
              setIsLoading(true);
              setLazyParams((prev) => ({ ...prev, first: e.first, rows: e.rows }));
              scrollToTop();
            }}
            onSort={(e) => {
              setIsLoading(true);
              setLazyParams((prev) => ({ ...prev, sortField: e.sortField, sortOrder: e.sortOrder }));
              scrollToTop();
            }}
            first={lazyParams.first}
            rows={lazyParams.rows}
            totalRecords={totalRecords}
            sortField={lazyParams.sortField}
            sortOrder={lazyParams.sortOrder}
            rowsPerPageOptions={[10, 25, 50]}
            size="small"
            stripedRows
            rowHover
          >
            <Column
              field="bomname"
              header="BOM Name"
              body={bomNameTemplate}
              sortable
              filter
              filterPlaceholder="Search..."
              style={{ minWidth: "200px" }}
            />
            <Column
              field="bomtype"
              header="Type"
              body={bomTypeTemplate}
              sortable
              filter
              filterPlaceholder="Type..."
              style={{ minWidth: "130px" }}
            />
            <Column
              field="finisheditemname"
              header="Finished Product"
              body={finishedItemTemplate}
              sortable
              filter
              filterPlaceholder="Product..."
              style={{ minWidth: "200px" }}
            />
            <Column
              field="quantity"
              header="Output Qty"
              body={quantityTemplate}
              sortable
              style={{ minWidth: "110px" }}
            />
            <Column
              field="status"
              header="Status"
              body={statusTemplate}
              sortable
              filter
              filterPlaceholder="Status..."
              style={{ minWidth: "100px" }}
            />
            <Column
              header="Actions"
              body={actionTemplate}
              style={{ minWidth: "100px", textAlign: "center" }}
            />
          </DataTable>
        </div>
      </div>
    </Page>
  );
}
