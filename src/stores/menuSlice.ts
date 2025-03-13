import { createSlice } from "@reduxjs/toolkit";
import { RootState } from "./store";
import { type Themes } from "@/stores/themeSlice";
import { icons } from "@/components/Base/Lucide";
import sideMenu from "@/main/side-menu";
import simpleMenu from "@/main/simple-menu";
import simpleMenu2 from "@/main/simple-menu2";
import simpleMenu3 from "@/main/simple-menu3";
import simpleMenuJuta from "@/main/simple-menuJuta";
import simpleMenuRole2 from "@/main/simple-menu-role-2";
import simpleMenuRole3 from "@/main/simple-menu-role-3";
import topMenu from "@/main/top-menu";
import { useConfig } from '../config';

export interface Menu {
  icon: keyof typeof icons;
  title: string;
  badge?: number;
  pathname?: string;
  subMenu?: Menu[];
  ignore?: boolean;
}

export interface MenuState {
  menu: Array<Menu | string>;
}

const initialState: MenuState = {
  menu: [],
};

export const menuSlice = createSlice({
  name: "menu",
  initialState,
  reducers: {},
});

export const selectMenu = (layout: Themes["layout"]) => (state: RootState) => {
  // Get config from state instead of using hook
  const config = state.config;
  const userRole = config?.userRole;

  if (layout == "top-menu") {
    return topMenu;
  }

  if (layout == "simple-menu") {
    if (config?.name === "Infinity Pilates & Physiotherapy") {
      return simpleMenu2;
    } else if (config?.name === "Tatapies") {
      return simpleMenu3;
    } else if (config?.name === "Juta") {
      return simpleMenuJuta;
    } else {
      switch (userRole) {
        case "1":
          return simpleMenu;
        case "2":
          return simpleMenuRole2;
        case "3":
          return simpleMenuRole3;
        default:
          return simpleMenu;
      }
    }
  }

  return simpleMenu;
};

export default menuSlice.reducer;