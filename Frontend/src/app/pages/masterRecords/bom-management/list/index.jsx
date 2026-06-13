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

const BOM_TYPE_LABELS = {
  manufacturing: "Manufacturing",
  kit: "Kit",
  subcontracting: "Subcontracting",
  phantom: "Phantom",
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

  const [selectedRow, setSelectedRow] = useState(null);
  const actionOverlayRef = useRef(null);

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
        toast.current?.show({
          severity: "error",
          summary: "Error",
          detail: response.error?.message || "Failed to load BOM data",
          life: 3000,
        });
        setBomList([]);
        setTotalRecords(0);
      }
    } catch (error) {
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail: error.message || "Failed to load BOM data",
        life: 3000,
      });
      setBomList([]);
      setTotalRecords(0);
    } finally {
      setIsLoading(false);
    }
  }, [filters, lazyParams]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchBOMs();
    }, 500);
    return () => clearTimeout(delayDebounce);
  }, [filters, fetchBOMs]);

  const blankRow = {
    bomname: "",
    bomcode: "",
    bomtype: "",
    finisheditemname: "",
    quantity: "",
    uomname: "",
    status: "",
    effectivedate: "",
  };

  // ─── Export CSV ───────────────────────────────────────────────────────────
  const exportCSV = () => {
    if (!bomList.length) {
      toast.current.show({ severity: "warn", summary: "Warning", detail: "No data to export", life: 3000 });
      return;
    }
    const data = bomList.map((b) => ({
      "BOM Name": b.bomname,
      "BOM Code": b.bomcode || "-",
      "Type": BOM_TYPE_LABELS[b.bomtype] || b.bomtype,
      "Finished Item": b.finisheditemname,
      "Quantity": b.quantity,
      "UOM": b.uomname || "-",
      "Status": b.status,
      "Effective Date": b.effectivedate || "-",
    }));
    const csv = unparse(data);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "bom_list.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.current.show({ severity: "success", detail: "CSV Exported", life: 2000 });
  };

  // ─── Delete ───────────────────────────────────────────────────────────────
  const confirmDelete = (rowData) => {
    setDeleteBOMId(rowData.bomid);
    setDeleteBOMDialog(true);
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      const response = await BOMService.deleteBOM(deleteBOMId);
      if (response.success) {
        toast.current.show({ severity: "success", summary: "Success", detail: "BOM deleted", life: 3000 });
        setDeleteBOMDialog(false);
        fetchBOMs();
      } else {
        toast.current.show({ severity: "error", summary: "Error", detail: response.error?.message || "Failed to delete BOM", life: 3000 });
      }
    } catch (error) {
      toast.current.show({ severity: "error", summary: "Error", detail: error.message || "Failed to delete BOM", life: 3000 });
    } finally {
      setDeleteLoading(false);
    }
  };

  // ─── Templates ───────────────────────────────────────────────────────────
  const bomNameTemplate = (rowData) =>
    isLoading ? <Skeleton width="80%" height="1.4rem" /> : <span className="font-medium">{rowData.bomname}</span>;

  const bomCodeTemplate = (rowData) =>
    isLoading ? <Skeleton width="60%" height="1.4rem" /> : <span>{rowData.bomcode || "-"}</span>;

  const bomTypeTemplate = (rowData) =>
    isLoading ? (
      <Skeleton width="70%" height="1.4rem" />
    ) : (
      <Tag
        value={BOM_TYPE_LABELS[rowData.bomtype] || rowData.bomtype}
        severity={rowData.bomtype === "manufacturing" ? "info" : rowData.bomtype === "kit" ? "secondary" : "contrast"}
        rounded
      />
    );

  const finishedItemTemplate = (rowData) =>
    isLoading ? (
      <Skeleton width="80%" height="1.4rem" />
    ) : (
      <div className="flex items-center gap-2">
        {rowData.finisheditemimg && (
          <img
            src={rowData.finisheditemimg}
            alt=""
            className="h-8 w-8 rounded-full object-contain border border-gray-200"
            onError={(e) => { e.target.style.display = "none"; }}
          />
        )}
        <span>{rowData.finisheditemname || "-"}</span>
      </div>
    );

  const quantityTemplate = (rowData) =>
    isLoading ? (
      <Skeleton width="50%" height="1.4rem" />
    ) : (
      <span>
        {parseFloat(rowData.quantity || 0).toFixed(2)} {rowData.uomname || ""}
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
      <Skeleton shape="circle" size="2.5rem" />
    ) : (
      <div className="flex gap-1 justify-center">
        <Button
          icon="pi pi-eye"
          rounded
          text
          size="small"
          severity="info"
          className="bom-action-tooltip"
          data-pr-tooltip="View Details"
          onClick={() => navigate(`/master-records/bom/view/${rowData.bomid}`)}
        />
        <Button
          icon="pi pi-pencil"
          rounded
          text
          size="small"
          className="bom-action-tooltip"
          data-pr-tooltip="Edit BOM"
          onClick={() => navigate(`/master-records/bom/update/${rowData.bomid}`)}
        />
        <Button
          icon="pi pi-trash"
          rounded
          text
          size="small"
          severity="danger"
          className="bom-action-tooltip"
          data-pr-tooltip="Delete BOM"
          onClick={() => confirmDelete(rowData)}
        />
      </div>
    );

  // ─── Header ───────────────────────────────────────────────────────────────
  const renderHeader = () => (
    <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-center gap-2">
        <i className="pi pi-sitemap text-primary-500 text-xl" />
        <h3 className="text-sm font-semibold sm:text-base lg:text-lg">Bill of Materials</h3>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2 lg:justify-end">
        <IconField iconPosition="left" className="w-full sm:w-64">
          <InputIcon className="pi pi-search" />
          <InputText
            type="search"
            value={filters.global?.value || ""}
            onChange={(e) => setFilters((prev) => ({ ...prev, global: { ...prev.global, value: e.target.value } }))}
            placeholder="Search BOM..."
            className="w-full"
          />
        </IconField>

        <div className="flex gap-1">
          <Button
            className="bom-action-tooltip"
            type="button"
            icon="pi pi-file"
            rounded
            size="small"
            onClick={exportCSV}
            data-pr-tooltip="Export as CSV"
            disabled={isLoading}
          />
        </div>

        <Button
          label="New BOM"
          icon="pi pi-plus"
          size="small"
          onClick={() => navigate("/master-records/bom/add")}
        />

        <Tooltip target=".bom-action-tooltip" position="top" style={{ fontSize: "12px" }} showDelay={100} hideDelay={100} />
      </div>
    </div>
  );

  return (
    <Page title="Bill of Materials">
      <Toast ref={toast} />

      {/* Delete Confirmation */}
      <Dialog
        visible={deleteBOMDialog}
        style={{ width: "400px" }}
        header="Confirm Delete"
        modal
        onHide={() => setDeleteBOMDialog(false)}
        footer={
          <>
            <Button label="Cancel" icon="pi pi-times" outlined onClick={() => setDeleteBOMDialog(false)} disabled={deleteLoading} />
            <Button
              label={deleteLoading ? "Deleting..." : "Delete"}
              icon={deleteLoading ? "pi pi-spin pi-spinner" : "pi pi-trash"}
              severity="danger"
              onClick={handleDelete}
              disabled={deleteLoading}
            />
          </>
        }
      >
        <div className="flex items-center gap-3">
          <i className="pi pi-exclamation-triangle text-3xl text-orange-500" />
          <span>Are you sure you want to delete this BOM? This action cannot be undone.</span>
        </div>
      </Dialog>

      <div className="w-full px-(--margin-x) pt-5 lg:pt-6">
        <div className="grid grid-cols-12 gap-4 sm:gap-5 lg:gap-6">
          <div className="col-span-12">
            <div className="prime-card">
              <DataTable
                value={isLoading ? Array.from({ length: 10 }, () => blankRow) : bomList}
                className="overflow-hidden rounded-lg border border-gray-300"
                header={renderHeader()}
                emptyMessage={
                  <EmptyMessage
                    title="No BOMs found"
                    subtitle="Create your first Bill of Materials by clicking the 'New BOM' button."
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
                rowsPerPageOptions={[10, 25, 50, 100]}
                size="small"
                stripedRows
              >
                <Column
                  field="bomname"
                  header="BOM Name"
                  body={bomNameTemplate}
                  sortable
                  filter
                  filterPlaceholder="Search name"
                  style={{ minWidth: "180px" }}
                />
                <Column
                  field="bomcode"
                  header="BOM Code"
                  body={bomCodeTemplate}
                  sortable
                  filter
                  filterPlaceholder="Search code"
                  style={{ minWidth: "120px" }}
                />
                <Column
                  field="bomtype"
                  header="Type"
                  body={bomTypeTemplate}
                  sortable
                  filter
                  filterPlaceholder="Search type"
                  style={{ minWidth: "120px" }}
                />
                <Column
                  field="finisheditemname"
                  header="Finished Product"
                  body={finishedItemTemplate}
                  sortable
                  filter
                  filterPlaceholder="Search product"
                  style={{ minWidth: "180px" }}
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
                  filterPlaceholder="Status"
                  style={{ minWidth: "100px" }}
                />
                <Column
                  header="Actions"
                  body={actionTemplate}
                  style={{ minWidth: "120px", textAlign: "center" }}
                />
              </DataTable>
            </div>
          </div>
        </div>
      </div>
    </Page>
  );
}
