import {
  NAV_TYPE_ROOT,
  NAV_TYPE_ITEM,
} from "constants/app.constant";
import SalesIcon from "assets/dualicons/stats-up.svg?react";
import FinanceIcon from "assets/dualicons/table.svg?react";
import IdIcon from "assets/nav-icons/id.svg?react";

const ROOT_SALES = "/sales";
const ROOT_FINANCE = "/finance";

const path = (root, item) => `${root}${item}`;

export const salesPanel = {
  id: "sales-panel",
  type: NAV_TYPE_ROOT,
  path: ROOT_SALES,
  title: "Sales",
  transKey: "nav.sales-panel.sales",
  Icon: SalesIcon,
  childs: [
    {
      id: "sales-panel.invoice",
      type: NAV_TYPE_ITEM,
      path: path(ROOT_SALES, "/invoice"),
      title: "Invoice",
      transKey: "nav.sales-panel.invoice",
      Icon: IdIcon,
    },
  ],
};

export const financePanel = {
  id: "finance-panel",
  type: NAV_TYPE_ROOT,
  path: ROOT_FINANCE,
  title: "Finance",
  transKey: "nav.finance-panel.finance",
  Icon: FinanceIcon,
  childs: [
    {
      id: "finance-panel.invoice",
      type: NAV_TYPE_ITEM,
      path: path(ROOT_FINANCE, "/invoice"),
      title: "Invoice",
      transKey: "nav.finance-panel.invoice",
      Icon: IdIcon,
    },
    {
      id: "finance-panel.payment-tracking",
      type: NAV_TYPE_ITEM,
      path: path(ROOT_FINANCE, "/payment-tracking"),
      title: "Payment Tracking",
      transKey: "nav.finance-panel.payment-tracking",
      Icon: IdIcon,
    },
  ],
};
