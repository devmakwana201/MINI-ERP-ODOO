import ManufacturingIcon from "assets/dualicons/components.svg?react";
import BomIcon from "assets/nav-icons/box-add.svg?react";
import BomListIcon from "assets/nav-icons/list.svg?react";
import BomAddIcon from "assets/nav-icons/document-add.svg?react";
import { NAV_TYPE_ROOT, NAV_TYPE_ITEM, NAV_TYPE_COLLAPSE } from "constants/app.constant";

const ROOT_MFG = "/manufacturing";

const path = (root, item) => `${root}${item}`;

export const manufacturing = {
  id: "manufacturing",
  type: NAV_TYPE_ROOT,
  path: "manufacturing",
  title: "Manufacturing",
  transKey: "nav.manufacturing.manufacturing",
  Icon: ManufacturingIcon,
  childs: [
    {
      id: "manufacturing.bom",
      type: NAV_TYPE_COLLAPSE,
      path: path(ROOT_MFG, "/bom"),
      title: "Bill of Materials",
      transKey: "nav.manufacturing.bom.bom",
      Icon: BomIcon,
      childs: [
        {
          id: "manufacturing.bom.list",
          type: NAV_TYPE_ITEM,
          path: path(ROOT_MFG, "/bom/bom-list"),
          title: "BOM List",
          transKey: "nav.manufacturing.bom.list",
          Icon: BomListIcon,
        },
        {
          id: "manufacturing.bom.add",
          type: NAV_TYPE_ITEM,
          path: path(ROOT_MFG, "/bom/add"),
          title: "Create BOM",
          transKey: "nav.manufacturing.bom.add",
          Icon: BomAddIcon,
        },
      ],
    },
  ],
};
