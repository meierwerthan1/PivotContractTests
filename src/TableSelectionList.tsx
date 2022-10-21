import React from "react";

export function TableSelectionList(props: { type: string; values: string[] }) {
  const { type, values } = props;

  return (
    <div style={{ textAlign: "center" }}>
      <h4>{`${type}: `}</h4>
      {values.map((value: string, index: number) =>
        index !== values.length - 1 ? `${value}, ` : value
      )}
    </div>
  );
}
