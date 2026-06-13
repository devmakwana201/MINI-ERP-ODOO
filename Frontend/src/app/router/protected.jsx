// router/useProtectedRoutes.js
import { Navigate } from "react-router";
import { useAuthContext } from "app/contexts/auth/context";
import AuthGuard from "middleware/AuthGuard";
import { AppLayout } from "app/layouts/AppLayout";
import { DynamicLayout } from "app/layouts/DynamicLayout";
import { useSelector } from "react-redux";
import { useEffect } from "react";

export const useProtectedRoutes = () => {
  const { user } = useAuthContext();
  const roleid = user?.roleid;

  return {
    id: "protected",
    Component: AuthGuard,
    children: [
      {
        Component: DynamicLayout,
        children: [
          {
            index: true,
            element: <Navigate to="/dashboards/home" />,
          },
          {
            path: "dashboards",
            children: [
              {
                index: true,
                element: <Navigate to="/dashboards/home" />,
              },
              {
                path: "home",
                lazy: async () => ({
                  Component: (await import("app/pages/dashboards/home"))
                    .default,
                }),
              },
              {
                path: "sales-dashboard",
                lazy: async () => ({
                  Component: (
                    await import("app/pages/dashboards/salesDashboard")
                  ).default,
                }),
              },
              {
                path: "purchase-dashboard",
                lazy: async () => ({
                  Component: (
                    await import("app/pages/dashboards/purchaseDashboard")
                  ).default,
                }),
              },
            ],
          },
          {
            path: "master-records",
            children: [
              {
                index: true,
                element: <Navigate to="/master-records/user-list" />,
              },
              {
                path: "user-list",
                lazy: async () => ({
                  Component: (await import("app/pages/masterRecords/user/list"))
                    .default,
                }),
              },
              {
                path: "user",
                lazy: async () => ({
                  Component: (
                    await import("app/pages/masterRecords/user/master")
                  ).default,
                }),
              },
              {
                path: "user/:id",
                lazy: async () => ({
                  Component: (
                    await import("app/pages/masterRecords/user/master")
                  ).default,
                }),
              },
              {
                path: "roles/role",
                lazy: async () => ({
                  Component: (
                    await import("app/pages/masterRecords/roles/role")
                  ).default,
                }),
              },
              {
                path: "roles/permission",
                lazy: async () => ({
                  Component: (
                    await import("app/pages/masterRecords/roles/permission")
                  ).default,
                }),
              },
              {
                path: "inventory/item/item-list",
                lazy: async () => ({
                  Component: (
                    await import("app/pages/masterRecords/inventory-management/item-management/list")
                  ).default,
                }),
              },
              {
                path: "inventory/item/add",
                lazy: async () => ({
                  Component: (
                    await import("app/pages/masterRecords/inventory-management/item-management/master")
                  ).default,
                }),
              },
              {
                path: "inventory/item/import-item",
                lazy: async () => ({
                  Component: (
                    await import("app/pages/masterRecords/inventory-management/item-management/import-item")
                  ).default,
                }),
              },
              {
                path: "inventory/item/update/:id",
                lazy: async () => ({
                  Component: (
                    await import("app/pages/masterRecords/inventory-management/item-management/master")
                  ).default,
                }),
              },
              {
                path: "inventory/item-category/item-category-list",
                lazy: async () => ({
                  Component: (
                    await import("app/pages/masterRecords/inventory-management/item-category-management/list")
                  ).default,
                }),
              },
              {
                path: "inventory/item-category/add",
                lazy: async () => ({
                  Component: (
                    await import("app/pages/masterRecords/inventory-management/item-category-management/master")
                  ).default,
                }),
              },
              {
                path: "inventory/item-category/update/:id",
                lazy: async () => ({
                  Component: (
                    await import("app/pages/masterRecords/inventory-management/item-category-management/master")
                  ).default,
                }),
              },
              {
                path: "inventory/supplier/supplier-list",
                lazy: async () => ({
                  Component: (
                    await import("app/pages/masterRecords/inventory-management/supplier-management/list")
                  ).default,
                }),
              },
              {
                path: "inventory/supplier/add",
                lazy: async () => ({
                  Component: (
                    await import("app/pages/masterRecords/inventory-management/supplier-management/master")
                  ).default,
                }),
              },
              {
                path: "inventory/supplier/update/:id",
                lazy: async () => ({
                  Component: (
                    await import("app/pages/masterRecords/inventory-management/supplier-management/master")
                  ).default,
                }),
              },
              {
                path: "inventory/uom/uom-list",
                lazy: async () => ({
                  Component: (
                    await import("app/pages/masterRecords/inventory-management/uom-management")
                  ).default,
                }),
              },
              {
                path: "inventory/brand/brand-list",
                lazy: async () => ({
                  Component: (
                    await import("app/pages/masterRecords/inventory-management/brand-management")
                  ).default,
                }),
              },
              {
                path: "inventory/warehouse/warehouse-list",
                lazy: async () => ({
                  Component: (
                    await import("app/pages/masterRecords/inventory-management/warehouse-management")
                  ).default,
                }),
              },
              {
                path: "inventory/warehouse/warehouse-item-mapping",
                lazy: async () => ({
                  Component: (
                    await import("app/pages/masterRecords/inventory-management/warehouse-item-mapping")
                  ).default,
                }),
              },
            ],
          },
          // ── Manufacturing Module ──────────────────────────────────────────
          {
            path: "manufacturing",
            children: [
              {
                index: true,
                element: <Navigate to="/manufacturing/bom/bom-list" />,
              },
              {
                path: "bom/bom-list",
                lazy: async () => ({
                  Component: (
                    await import("app/pages/manufacturing/bom/list")
                  ).default,
                }),
              },
              {
                path: "bom/add",
                lazy: async () => ({
                  Component: (
                    await import("app/pages/manufacturing/bom/master")
                  ).default,
                }),
              },
              {
                path: "bom/update/:id",
                lazy: async () => ({
                  Component: (
                    await import("app/pages/manufacturing/bom/master")
                  ).default,
                }),
              },
            ],
          },
          {
            path: "agro-dot",
            children: [
              {
                index: true,
                element: <Navigate to="/agro-dot/dispatch" />,
              },
              {
                path: "dispatch",
                lazy: async () => ({
                  Component: (await import("app/pages/agroDot/dispatch"))
                    .default,
                }),
              },
              {
                path: "offers",
                lazy: async () => ({
                  Component: (await import("app/pages/agroDot/offers"))
                    .default,
                }),
              },
              {
                path: "price-policy",
                lazy: async () => ({
                  Component: (await import("app/pages/agroDot/pricePolicy"))
                    .default,
                }),
              },
            ],
          },
          {path: "sales/invoice",
            lazy: async () => ({
              Component: (await import("app/pages/sales/invoice")).default,
            }),
          },
          {
            path: "procurement",
            children: [
              {
                index: true,
                element: <Navigate to="/procurement/purchase-order" />,
              },
              {
                path: "purchase-order",
                lazy: async () => ({
                  Component: (
                    await import("app/pages/procurement/purchase-order")
                  ).default,
                }),
              },
              {
                path: "create-po",
                lazy: async () => ({
                  Component: (await import("app/pages/procurement/create-po"))
                    .default,
                }),
              },
            ],
          },
          {
            path: "incoming-goods",
            children: [
              {
                index: true,
                element: <Navigate to="/incoming-goods/delivery-receipt" />,
              },
              {
                path: "delivery-receipt",
                lazy: async () => ({
                  Component: (
                    await import("app/pages/incomingGoods/deliveryReceipt")
                  ).default,
                }),
              },
              {
                path: "grn",
                lazy: async () => ({
                  Component: (await import("app/pages/incomingGoods/grn"))
                    .default,
                }),
              },
              {
                path: "credit-notes-received",
                lazy: async () => ({
                  Component: (
                    await import("app/pages/incomingGoods/creditNotesReceived")
                  ).default,
                }),
              },
            ],
          },
          {
            path: "agro-dot",
            children: [
              {
                index: true,
                element: <Navigate to="/agro-dot/customer-issues/grn-issues" />,
              },
              {
                path: "customer-issues/grn-issues",
                lazy: async () => ({
                  Component: (
                    await import("app/pages/agroDot/customer-issues/grn-issues")
                  ).default,
                }),
              },
              {
                path: "customer-issues/credit-notes",
                lazy: async () => ({
                  Component: (
                    await import("app/pages/agroDot/customer-issues/credit-notes")
                  ).default,
                }),
              },
            ],
          },
          {
            path: "approvals",
            lazy: async () => ({
              Component: (await import("app/pages/approvals")).default,
            }),
          },
        ],
      },
      {
        Component: AppLayout,
        children: [
          {
            path: "settings",
            lazy: async () => ({
              Component: (await import("app/pages/settings/Layout")).default,
            }),
            children: [
              {
                index: true,
                element: <Navigate to="/settings/general" />,
              },
              {
                path: "general",
                lazy: async () => ({
                  Component: (
                    await import("app/pages/settings/sections/General")
                  ).default,
                }),
              },
            ],
          },
        ],
      },
    ],
  };
};
