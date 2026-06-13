import IdIcon from "assets/nav-icons/id.svg?react";
import MasterIcon from "assets/dualicons/prototypes.svg?react";
import {
  NAV_TYPE_ROOT,
  NAV_TYPE_ITEM,
  NAV_TYPE_COLLAPSE,
} from "constants/app.constant";

const ROOT_FORMS = "/master-records";

const path = (root, item) => `${root}${item}`;

export const masterRecords = {
  id: "master-records",
  type: NAV_TYPE_ROOT,
  path: "master-records",
  title: "Master Records",
  transKey: "nav.master-records.master-records",
  Icon: MasterIcon,
  childs: [
    {
      id: "master-records.user",
      type: NAV_TYPE_ITEM,
      path: path(ROOT_FORMS, "/user-list"),
      title: "User",
      transKey: "nav.master-records.user",
      Icon: IdIcon,
    },
    {
      id: "master-records.roles",
      type: NAV_TYPE_COLLAPSE,
      path: path(ROOT_FORMS, "/roles"),
      title: "Roles",
      transKey: "nav.master-records.roles",
      Icon: IdIcon,
      childs: [
        {
          id: "master-records.role",
          type: NAV_TYPE_ITEM,
          path: path(ROOT_FORMS, "/roles/role"),
          title: "Role",
          transKey: "nav.master-records.role",
        },
        {
          id: "master-records.permission",
          type: NAV_TYPE_ITEM,
          path: path(ROOT_FORMS, "/roles/permission"),
          title: "Permission",
          transKey: "nav.master-records.permission",
        },
      ],
    },
  ],
};
