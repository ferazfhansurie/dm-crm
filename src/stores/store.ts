import { configureStore, ThunkAction, Action } from "@reduxjs/toolkit";
import darkModeReducer from "./darkModeSlice";
import colorSchemeReducer from "./colorSchemeSlice";
import menuReducer from "./menuSlice";
import themeReducer from "./themeSlice";
import configReducer from "./configSlice";

export interface Config {
  name?: string;
  userRole?: string;
  // Add other config properties as needed
}

export interface RootState {
  darkMode: ReturnType<typeof darkModeReducer>;
  colorScheme: ReturnType<typeof colorSchemeReducer>;
  menu: ReturnType<typeof menuReducer>;
  theme: ReturnType<typeof themeReducer>;
  config: ReturnType<typeof configReducer>;
}

export const store = configureStore({
  reducer: {
    darkMode: darkModeReducer,
    colorScheme: colorSchemeReducer,
    menu: menuReducer,
    theme: themeReducer,
    config: configReducer,
  },
});

export type AppDispatch = typeof store.dispatch;
export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  Action<string>
>;
