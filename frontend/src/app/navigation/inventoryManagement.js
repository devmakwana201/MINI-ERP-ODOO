import InventoryIcon from "assets/dualicons/applications.svg?react";
import ItemIcon from "assets/nav-icons/box-add.svg?react";
import CategoryIcon from "assets/nav-icons/list.svg?react";
import SupplierIcon from "assets/nav-icons/people.svg?react";
import UomIcon from "assets/nav-icons/range.svg?react";
import BrandIcon from "assets/nav-icons/tag.svg?react";
import WarehouseIcon from "assets/nav-icons/truck.svg?react";
import MappingIcon from "assets/nav-icons/swap.svg?react";
import { NAV_TYPE_ITEM, NAV_TYPE_ROOT } from "constants/app.constant";

const ROOT_INVENTORY = "/master-records/inventory";

const path = (item) => `${ROOT_INVENTORY}${item}`;

export const inventoryManagement = {
  id: "inventory-management",
  type: NAV_TYPE_ROOT,
  path: ROOT_INVENTORY,
  title: "Inventory Management",
  transKey: "nav.master-records.inventory-management",
  Icon: InventoryIcon,
  childs: [
    {
      id: "inventory-management.items",
      type: NAV_TYPE_ITEM,
      path: path("/item/item-list"),
      title: "Item Management",
      transKey: "nav.master-records.item-management",
      Icon: ItemIcon,
    },
    {
      id: "inventory-management.item-categories",
      type: NAV_TYPE_ITEM,
      path: path("/item-category/item-category-list"),
      title: "Item Category Management",
      transKey: "nav.master-records.item-category-management",
      Icon: CategoryIcon,
    },
    {
      id: "inventory-management.suppliers",
      type: NAV_TYPE_ITEM,
      path: path("/supplier/supplier-list"),
      title: "Supplier Management",
      transKey: "nav.master-records.supplier-management",
      Icon: SupplierIcon,
    },
    {
      id: "inventory-management.uom",
      type: NAV_TYPE_ITEM,
      path: path("/uom/uom-list"),
      title: "UOM Management",
      transKey: "nav.master-records.uom-management",
      Icon: UomIcon,
    },
    {
      id: "inventory-management.brands",
      type: NAV_TYPE_ITEM,
      path: path("/brand/brand-list"),
      title: "Brand Management",
      transKey: "nav.master-records.brand-management",
      Icon: BrandIcon,
    },
    {
      id: "inventory-management.warehouses",
      type: NAV_TYPE_ITEM,
      path: path("/warehouse/warehouse-list"),
      title: "Warehouse Management",
      transKey: "nav.master-records.warehouse-management",
      Icon: WarehouseIcon,
    },
    {
      id: "inventory-management.warehouse-item-mapping",
      type: NAV_TYPE_ITEM,
      path: path("/warehouse/warehouse-item-mapping"),
      title: "Warehouse Item Mapping",
      transKey: "nav.master-records.warehouse-item-mapping",
      Icon: MappingIcon,
    },
  ],
};
