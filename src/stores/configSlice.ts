import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Config } from "./store";

const initialState: Config = {
  name: undefined,
  userRole: undefined,
};

export const configSlice = createSlice({
  name: "config",
  initialState,
  reducers: {
    setConfig: (state, action: PayloadAction<Config>) => {
      return { ...state, ...action.payload };
    },
  },
});

export const { setConfig } = configSlice.actions;

export default configSlice.reducer; 