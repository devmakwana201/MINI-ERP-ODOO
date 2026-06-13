import { dashboards } from "./dashboards";
import { masterRecords } from "./masterRecords";
import { inventoryManagement } from "./inventoryManagement";
import { procurement } from "./procurement";
import { manufacturing } from "./manufacturing";
import { incomingGoods } from "./incomingGoods";
import { approvals } from "./approvals";
import { agroDot } from "./agroDot";
import { salesPanel } from "./sales";

const hasFeatureFlag = (userOrFlags, key) => {
  const flags =
    userOrFlags?.flags && typeof userOrFlags.flags === "object"
      ? userOrFlags.flags
      : userOrFlags && typeof userOrFlags === "object"
        ? userOrFlags
        : null;

  if (!flags) return true;
  if (!(key in flags)) return true;
  return Boolean(flags[key]);
};

// Role-based navigation + optional feature flags
export const getNavigation = (roleid, userOrFlags) => {
  const nav = [
    dashboards,
    inventoryManagement,
    masterRecords,
    procurement,
    manufacturing,
    agroDot,
  ];

  if (hasFeatureFlag(userOrFlags, "incomingGoods.view")) {
    nav.push(incomingGoods);
  }

  nav.push(
    approvals,
    salesPanel,
  );
  return nav;
};

export { baseNavigation } from "./baseNavigation";
