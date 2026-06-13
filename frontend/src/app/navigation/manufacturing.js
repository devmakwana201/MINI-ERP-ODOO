import ManufacturingIcon from "assets/dualicons/manufacturing.svg?react";
import DocumentIcon from "assets/nav-icons/doc.svg?react";
import AddIcon from "assets/nav-icons/document-add.svg?react";
import { NAV_TYPE_ROOT, NAV_TYPE_ITEM } from "constants/app.constant";

export const manufacturing = {
  id: "manufacturing",
  type: NAV_TYPE_ROOT,
  path: "manufacturing",
  title: "Manufacturing",
  transKey: "nav.manufacturing.manufacturing",
  Icon: ManufacturingIcon,
  childs: [
    { id: "manufacturing.orders", type: NAV_TYPE_ITEM, path: "/manufacturing/orders", title: "Manufacturing Orders", transKey: "nav.manufacturing.orders", Icon: DocumentIcon },
    { id: "manufacturing.create-order", type: NAV_TYPE_ITEM, path: "/manufacturing/orders/new", title: "Create Order", transKey: "nav.manufacturing.create-order", Icon: AddIcon },
    { id: "manufacturing.boms", type: NAV_TYPE_ITEM, path: "/manufacturing/boms", title: "Bills of Materials", transKey: "nav.manufacturing.boms", Icon: DocumentIcon },
    { id: "manufacturing.create-bom", type: NAV_TYPE_ITEM, path: "/manufacturing/boms/new", title: "Create BoM", transKey: "nav.manufacturing.create-bom", Icon: AddIcon },
  ],
};
