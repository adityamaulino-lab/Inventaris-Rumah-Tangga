# Existing spreadsheet schema
The script uses the existing spreadsheet ID and these tabs:
Users, Departments, Assets, Loans, LoanItems, Vehicles, Maintenance, Activity.
`setupDatabase()` only creates missing tabs and appends missing header columns; it does not clear existing rows.
