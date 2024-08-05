// src/components/contexts/OrganizationContext.jsx
import React, { createContext, useState, useContext } from 'react';

const OrganizationContext = createContext();

export const OrganizationProvider = ({ children }) => {
  const [organizationID, setOrganizationID] = useState(null);

  return (
    <OrganizationContext.Provider value={{ organizationID, setOrganizationID }}>
      {children}
    </OrganizationContext.Provider>
  );
};

export const useOrganization = () => useContext(OrganizationContext);
