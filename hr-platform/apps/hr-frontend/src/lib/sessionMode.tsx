"use client";

import React, { createContext, useContext } from "react";

// Whether the browser has a real API session (signed in) or is running the demo persona picker.
// Screens use it to choose between saving through the API and the local demo data.
const RealSessionContext = createContext(false);

export const RealSessionProvider: React.FC<{ value: boolean; children: React.ReactNode }> = ({ value, children }) => (
  <RealSessionContext.Provider value={value}>{children}</RealSessionContext.Provider>
);

export const useRealSession = (): boolean => useContext(RealSessionContext);
