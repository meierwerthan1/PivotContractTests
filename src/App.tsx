import { Formik } from "formik";
import React, { useState } from "react";
import { PivotParser } from "./PivotParser";
import "./styles.css";
import { TableSelectionList } from "./TableSelectionList";

const TABLE_COLUMNS = ["month"];
const TABLE_ROWS = ["region", "package"];
const TABLE_VALUES = ["revenue", "salaries"];

// stub out the graphql contract
const fp = new PivotParser(TABLE_COLUMNS, TABLE_ROWS, TABLE_VALUES);

export default function App() {
  const [formulaJson, setFormulaJson] = useState("");

  function save(values): void {
    const response = Object.entries(values).reduce(
      (accumulation, [valueName, aggregation]) => ({
        [valueName]: fp.parseApiRequest(aggregation || `SUM(${valueName})`),
        ...accumulation
      }),
      {}
    );
    setFormulaJson(JSON.stringify(response, null, 2));
  }

  return (
    <div className="App">
      <h1 style={{ textAlign: "center" }}>Pivot Contracts</h1>
      <TableSelectionList type={"Columns"} values={TABLE_COLUMNS} />
      <TableSelectionList type={"Rows"} values={TABLE_ROWS} />
      <TableSelectionList type={"Values"} values={TABLE_VALUES} />
      <Formik
        initialValues={TABLE_VALUES.reduce(
          (accumulation, value) => ({ ...accumulation, [value]: "" }),
          {}
        )}
        onSubmit={save}
      >
        {({ values, handleChange, submitForm }) => (
          <React.Fragment>
            {TABLE_VALUES.map((value) => (
              <div style={{ marginTop: 50, textAlign: "center" }}>
                <div>{value} aggregation: </div>
                <input
                  value={values[value]}
                  style={{ width: 450 }}
                  onChange={handleChange}
                  name={value}
                />
              </div>
            ))}
            <div style={{ marginTop: 20, textAlign: "center" }}>
              <button onClick={submitForm} style={{ cursor: "pointer" }}>
                generate
              </button>
            </div>
          </React.Fragment>
        )}
      </Formik>
      <div style={{ width: "100%" }}>
        <pre>{formulaJson}</pre>
      </div>
    </div>
  );
}
