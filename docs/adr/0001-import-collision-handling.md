# Import collisions warn instead of silently replacing

Imports currently drop and replace any existing table that shares the imported CSV's derived table name, so `My Data.csv` and `my_data.csv` silently destroy each other. We decided an import must never silently destroy data: a name collision warns the user and lets them choose a different table name. `GLOSSARY.md` states this as part of the definition of Import.

Status: accepted (implementation pending)

## Considered options

- **Silent replace** (status quo): convenient for re-importing a corrected file, but destroys data the user cannot foresee, and makes the `includeIfNotExists` option vestigial.
- **Hard failure on collision**: safe, but unhelpful when the only fix needed is a different name.
- **Warn and offer renaming** (chosen): keeps re-imports possible while keeping the destructive choice in the user's hands.

## Consequences

- `createTableFromCSV` loses its unconditional `DROP TABLE IF EXISTS ... CASCADE`; the collision check happens before table creation so the flow can prompt first.
- Until this lands, the code contradicts the glossary's Import definition; treat the glossary as the source of truth.
