import {
  NAV_TYPE_ROOT,
  NAV_TYPE_ITEM,
} from "constants/app.constant";
import SalesIcon from "assets/dualicons/stats-up.svg?react";
import IdIcon from "assets/nav-icons/id.svg?react";

const ROOT_SALES = "/sales";

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
