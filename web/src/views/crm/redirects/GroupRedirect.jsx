import { Navigate } from 'react-router'

/** The pages of the item groups, the expense categories and the contract types are gone: the groups are managed on the Items, Expenses and Contracts pages themselves. */
export const ToItems = () => <Navigate to="/crm/items" replace />
export const ToExpenses = () => <Navigate to="/crm/expenses" replace />
export const ToContracts = () => <Navigate to="/crm/contracts" replace />
