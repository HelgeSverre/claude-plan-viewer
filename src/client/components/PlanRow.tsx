import type { PlanMetadata } from "../types.ts";
import { formatDate, formatSize } from "../utils/formatters.ts";
import { Highlight } from "./Highlight.tsx";

interface PlanRowProps {
  plan: PlanMetadata;
  selected: boolean;
  searchQuery: string;
  onSelect: (plan: PlanMetadata) => void;
}

export function PlanRow({
  plan,
  selected,
  searchQuery,
  onSelect,
}: PlanRowProps) {
  return (
    <tr
      className={selected ? "selected" : ""}
      data-filename={plan.filename}
      data-row-id={plan.filename}
      onMouseDown={() => onSelect(plan)}
    >
      <td className="title-cell">
        <button
          className="title-btn"
          data-filename={plan.filename}
          title={plan.title}
        >
          <Highlight text={plan.title} query={searchQuery} />
        </button>
      </td>
      <td className="filename-cell">
        <span>
          <Highlight text={plan.filename} query={searchQuery} />
        </span>
      </td>
      <td className="project-cell">
        {plan.project ? (
          <span>
            <Highlight text={plan.project} query={searchQuery} />
          </span>
        ) : (
          "—"
        )}
      </td>
      <td className="num-cell">{formatSize(plan.size)}</td>
      <td className="num-cell">{plan.lineCount}</td>
      <td className="meta-cell">{formatDate(plan.modified)}</td>
      <td className="meta-cell">{formatDate(plan.created)}</td>
    </tr>
  );
}
