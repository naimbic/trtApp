import { Navigate } from 'react-router'

// The old Company page moved into Settings.
const CompanyRedirect = () => <Navigate to="/crm/settings?group=company" replace />

export default CompanyRedirect
