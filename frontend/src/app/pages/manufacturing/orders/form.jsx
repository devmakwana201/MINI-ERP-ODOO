import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Page } from "components/shared/Page";
import { Button } from "primereact/button";
import { Calendar } from "primereact/calendar";
import { Dropdown } from "primereact/dropdown";
import { InputNumber } from "primereact/inputnumber";
import { InputText } from "primereact/inputtext";
import { Toast } from "primereact/toast";
import { CommonApi } from "services/common/commonapi";
import { ManufacturingService } from "services/manufacturing";
import { UserService } from "services/master-records/users";

const formatQuantity = (value) =>
  new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const formatDuration = (minutes) => {
  const totalMinutes = Math.ceil(Number(minutes) || 0);
  const hours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;

  if (!hours) return `${remainingMinutes} min`;
  if (!remainingMinutes) return `${hours} hr`;
  return `${hours} hr ${remainingMinutes} min`;
};

export default function ManufacturingOrderForm() {
  const navigate = useNavigate();
  const toast = useRef(null);
  const [saving, setSaving] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loadingBom, setLoadingBom] = useState(false);
  const [boms, setBoms] = useState([]);
  const [locations, setLocations] = useState([]);
  const [assignees, setAssignees] = useState([]);
  const [selectedBom, setSelectedBom] = useState(null);
  const [form, setForm] = useState({
    productid: null,
    bomid: null,
    locationid: null,
    assigneeid: null,
    quantity: 1,
    uom: "",
    scheduledate: null,
  });

  useEffect(() => {
    const loadOptions = async () => {
      setLoadingOptions(true);
      try {
        const [bomRows, locationRows, userResult] = await Promise.all([
          ManufacturingService.listBoms({ start: 0, length: 500 }),
          CommonApi.getLocationList(),
          UserService.getFormattedUsers({
            filters: {},
            start: 0,
            length: 500,
          }),
        ]);

        setBoms(Array.isArray(bomRows) ? bomRows : []);
        setLocations(Array.isArray(locationRows) ? locationRows : []);
        setAssignees(
          (userResult?.data || []).map((user) => ({
            label:
              [user.firstname, user.lastname].filter(Boolean).join(" ") ||
              user.username,
            value: user.userid,
          })),
        );
      } catch (error) {
        toast.current?.show({
          severity: "error",
          summary: "Unable to load form",
          detail:
            error.response?.data?.error?.message ||
            "Manufacturing order options could not be loaded",
        });
      } finally {
        setLoadingOptions(false);
      }
    };

    loadOptions();
  }, []);

  const productOptions = useMemo(() => {
    const products = new Map();

    boms.forEach((bom) => {
      if (!products.has(bom.productid)) {
        products.set(bom.productid, {
          label: bom.itemcode
            ? `${bom.productname} (${bom.itemcode})`
            : bom.productname,
          value: bom.productid,
          name: bom.productname,
        });
      }
    });

    return Array.from(products.values());
  }, [boms]);

  const bomOptions = useMemo(
    () =>
      boms
        .filter((bom) => bom.productid === form.productid)
        .map((bom) => ({
          label: `${bom.bomname} - ${formatQuantity(bom.quantity)} ${
            bom.uom || ""
          }`.trim(),
          value: bom.bomid,
        })),
    [boms, form.productid],
  );

  const multiplier = useMemo(() => {
    const outputQuantity = Number(selectedBom?.quantity) || 0;
    return outputQuantity ? (Number(form.quantity) || 0) / outputQuantity : 0;
  }, [form.quantity, selectedBom]);

  const materials = useMemo(
    () =>
      (selectedBom?.components || []).map((component) => ({
        ...component,
        requiredQuantity: Number(component.quantity) * multiplier,
      })),
    [multiplier, selectedBom],
  );

  const operations = useMemo(
    () =>
      (selectedBom?.operations || []).map((operation) => ({
        ...operation,
        requiredDuration: Math.ceil(Number(operation.duration) * multiplier),
      })),
    [multiplier, selectedBom],
  );

  const totalDuration = useMemo(
    () =>
      operations.reduce(
        (total, operation) => total + operation.requiredDuration,
        0,
      ),
    [operations],
  );

  const hasCompletedHeader = Boolean(
    form.productid &&
      form.bomid &&
      form.locationid &&
      Number(form.quantity) > 0 &&
      form.uom,
  );
  const hasBomRequirements = Boolean(selectedBom && materials.length);
  const isReadyToCreate = hasCompletedHeader && hasBomRequirements;

  const progressSteps = [
    {
      step: 1,
      label: "MO Details",
      active: true,
      complete: hasCompletedHeader,
    },
    {
      step: 2,
      label: "BoM & Materials",
      active: hasCompletedHeader,
      complete: hasBomRequirements,
    },
    {
      step: 3,
      label: "Create Draft",
      active: isReadyToCreate,
      complete: false,
    },
  ];

  const set = (key, value) =>
    setForm((current) => ({ ...current, [key]: value }));

  const handleProductChange = (productid) => {
    const matchingBoms = boms.filter((bom) => bom.productid === productid);
    setSelectedBom(null);
    setForm((current) => ({
      ...current,
      productid,
      bomid: matchingBoms.length === 1 ? matchingBoms[0].bomid : null,
      uom: matchingBoms.length === 1 ? matchingBoms[0].uom || "" : "",
    }));
  };

  useEffect(() => {
    if (!form.bomid) {
      setSelectedBom(null);
      return;
    }

    const loadBom = async () => {
      setLoadingBom(true);
      try {
        const bom = await ManufacturingService.getBom(form.bomid);
        setSelectedBom(bom);
        setForm((current) => ({
          ...current,
          productid: bom.productid,
          uom: current.uom || bom.uom || "",
        }));
      } catch (error) {
        setSelectedBom(null);
        toast.current?.show({
          severity: "error",
          summary: "Unable to load BoM",
          detail:
            error.response?.data?.error?.message ||
            "The selected BoM requirements could not be loaded",
        });
      } finally {
        setLoadingBom(false);
      }
    };

    loadBom();
  }, [form.bomid]);

  const save = async () => {
    if (!isReadyToCreate) return;

    setSaving(true);
    try {
      const payload = {
        ...form,
        scheduledate: form.scheduledate
          ? form.scheduledate.toISOString().slice(0, 10)
          : null,
      };
      await ManufacturingService.createOrder(payload);
      toast.current?.show({
        severity: "success",
        summary: "Draft Created",
        detail: "Manufacturing order and material requirements were created",
        life: 2000,
      });
      navigate("/manufacturing/orders");
    } catch (error) {
      toast.current?.show({
        severity: "error",
        summary: "Unable to create order",
        detail:
          error.response?.data?.error?.message ||
          "The manufacturing order could not be created",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Page title="Manufacturing - Create MO">
      <Toast ref={toast} />

      <div className="w-full px-(--margin-x) pt-5 lg:pt-6">
        <div className="grid grid-cols-12 gap-4 sm:gap-5 lg:gap-6">
          <div className="col-span-12">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-slate-800">
                Create Manufacturing Order
              </h2>
            </div>

            <div className="prime-card mb-4">
              <div className="flex flex-wrap items-center gap-3 text-sm">
                {progressSteps.map((item, index) => (
                  <div key={item.step} className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                          item.complete
                            ? "bg-emerald-600 text-white"
                            : item.active
                              ? "bg-primary-700 text-white"
                              : "border border-slate-200 bg-slate-50 text-slate-500"
                        }`}
                      >
                        {item.step}
                      </span>
                      <span
                        className={
                          item.complete
                            ? "font-medium text-emerald-700"
                            : item.active
                              ? "font-medium text-slate-700"
                              : "text-slate-400"
                        }
                      >
                        {item.label}
                      </span>
                    </div>
                    {index < progressSteps.length - 1 && (
                      <span className="text-slate-300">-</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="prime-card mb-4">
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <i className="pi pi-file-edit text-xs text-primary-700" />
                <span>MO Details</span>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Finished Product <span className="text-red-500">*</span>
                  </label>
                  <Dropdown
                    value={form.productid}
                    options={productOptions}
                    onChange={(event) => handleProductChange(event.value)}
                    placeholder="Select product..."
                    filter
                    loading={loadingOptions}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Bill of Materials <span className="text-red-500">*</span>
                  </label>
                  <Dropdown
                    value={form.bomid}
                    options={bomOptions}
                    onChange={(event) => set("bomid", event.value)}
                    placeholder={
                      form.productid ? "Select BoM..." : "Select product first"
                    }
                    disabled={!form.productid}
                    loading={loadingBom}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Production Location <span className="text-red-500">*</span>
                  </label>
                  <Dropdown
                    value={form.locationid}
                    options={locations}
                    onChange={(event) => set("locationid", event.value)}
                    placeholder="Select location..."
                    loading={loadingOptions}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Responsible Person
                  </label>
                  <Dropdown
                    value={form.assigneeid}
                    options={assignees}
                    onChange={(event) => set("assigneeid", event.value)}
                    placeholder="Select assignee..."
                    showClear
                    filter
                    loading={loadingOptions}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Quantity To Produce <span className="text-red-500">*</span>
                  </label>
                  <InputNumber
                    value={form.quantity}
                    onValueChange={(event) => set("quantity", event.value)}
                    min={0.01}
                    minFractionDigits={0}
                    maxFractionDigits={2}
                    className="w-full"
                    inputClassName="w-full"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    UOM <span className="text-red-500">*</span>
                  </label>
                  <InputText
                    value={form.uom}
                    onChange={(event) => set("uom", event.target.value)}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Schedule Date
                  </label>
                  <Calendar
                    value={form.scheduledate}
                    onChange={(event) => set("scheduledate", event.value)}
                    dateFormat="mm/dd/yy"
                    showIcon
                    minDate={new Date()}
                    placeholder="mm/dd/yyyy"
                    className="w-full"
                    inputClassName="w-full"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    MO Reference
                  </label>
                  <InputText
                    value="Generated automatically on save"
                    disabled
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
              Required materials and operation times are calculated from the
              selected BoM for the production quantity.
            </div>

            <div className="prime-card mb-4">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <i className="pi pi-box text-xs text-primary-700" />
                  <span>Required Materials</span>
                </div>
                {selectedBom && (
                  <div className="text-xs text-slate-500">
                    BoM output: {formatQuantity(selectedBom.quantity)}{" "}
                    {selectedBom.uom} | Multiplier:{" "}
                    {formatQuantity(multiplier)}x
                  </div>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-0 overflow-hidden rounded-lg border border-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-3 py-3">#</th>
                      <th className="px-3 py-3">Material</th>
                      <th className="px-3 py-3">Item Code</th>
                      <th className="px-3 py-3">BoM Qty</th>
                      <th className="px-3 py-3">Required Qty</th>
                      <th className="px-3 py-3">UOM</th>
                    </tr>
                  </thead>
                  <tbody>
                    {materials.length ? (
                      materials.map((material, index) => (
                        <tr
                          key={material.bomcomponentid || material.componentid}
                          className="border-t border-slate-200"
                        >
                          <td className="px-3 py-3 text-slate-600">
                            {index + 1}
                          </td>
                          <td className="px-3 py-3 font-medium text-slate-800">
                            {material.componentname}
                          </td>
                          <td className="px-3 py-3 text-slate-600">
                            {material.componentcode || "-"}
                          </td>
                          <td className="px-3 py-3 text-slate-600">
                            {formatQuantity(material.quantity)}
                          </td>
                          <td className="px-3 py-3 font-semibold text-emerald-700">
                            {formatQuantity(material.requiredQuantity)}
                          </td>
                          <td className="px-3 py-3 text-slate-600">
                            {material.uom || "-"}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-4 py-8 text-center text-slate-400"
                        >
                          {loadingBom
                            ? "Loading BoM materials..."
                            : "Select a finished product and BoM to see required materials"}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr_1fr]">
                <div className="min-h-20 rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-500">
                  Materials are copied into the MO when the draft is created.
                  Actual consumption is recorded when production is completed.
                </div>
                <div className="flex min-h-20 flex-col items-center justify-center border-l border-slate-200 px-4 text-center">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Material Lines
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-slate-800">
                    {materials.length}
                  </div>
                </div>
                <div className="flex min-h-20 flex-col items-center justify-center rounded-lg bg-emerald-50 px-4 text-center">
                  <div className="text-xs font-semibold uppercase tracking-wide text-emerald-500">
                    Quantity To Produce
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-emerald-700">
                    {formatQuantity(form.quantity)} {form.uom}
                  </div>
                </div>
              </div>
            </div>

            <div className="prime-card">
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <i className="pi pi-cog text-xs text-primary-700" />
                <span>Operations</span>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-0 overflow-hidden rounded-lg border border-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-3 py-3">Sequence</th>
                      <th className="px-3 py-3">Operation</th>
                      <th className="px-3 py-3">Work Center</th>
                      <th className="px-3 py-3">BoM Time</th>
                      <th className="px-3 py-3">Expected Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {operations.length ? (
                      operations.map((operation, index) => (
                        <tr
                          key={operation.bomoperationid || index}
                          className="border-t border-slate-200"
                        >
                          <td className="px-3 py-3 text-slate-600">
                            {index + 1}
                          </td>
                          <td className="px-3 py-3 font-medium text-slate-800">
                            {operation.operationname}
                          </td>
                          <td className="px-3 py-3 text-slate-600">
                            {operation.workcenter || "-"}
                          </td>
                          <td className="px-3 py-3 text-slate-600">
                            {formatDuration(operation.duration)}
                          </td>
                          <td className="px-3 py-3 font-semibold text-slate-800">
                            {formatDuration(operation.requiredDuration)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-6 text-center text-slate-400"
                        >
                          No operations defined for the selected BoM
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex justify-end text-sm">
                <span className="rounded-lg bg-slate-50 px-4 py-3 text-slate-600">
                  Total expected production time:{" "}
                  <strong className="text-slate-800">
                    {formatDuration(totalDuration)}
                  </strong>
                </span>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button
                label="Cancel"
                outlined
                onClick={() => navigate("/manufacturing/orders")}
              />
              <Button
                label="Create Draft MO"
                icon="pi pi-check"
                loading={saving}
                disabled={!isReadyToCreate || loadingBom}
                onClick={save}
              />
            </div>

            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              <div className="font-semibold text-slate-700">
                Backend-ready preview
              </div>
              <div className="mt-2">
                Product: {selectedBom?.productname || "Not selected"} | BoM:{" "}
                {selectedBom?.bomname || "Not selected"} | Materials:{" "}
                {materials.length} | Operations: {operations.length} | Status:
                Draft
              </div>
            </div>
          </div>
        </div>
      </div>
    </Page>
  );
}
