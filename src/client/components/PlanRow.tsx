import type { Plan } from "../types.ts";
import { formatDate, formatSize } from "../utils/formatters.ts";
import { highlightText } from "../utils/strings.ts";

interface PlanRowProps {
  plan: Plan;
  selected: boolean;
  searchQuery: string;
  onSelect: (plan: Plan) => void;
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
      onMouseDown={() => onSelect(plan)}
    >
      <td className="title-cell">
        <button
          className="title-btn"
          data-filename={plan.filename}
          title={plan.title}
          dangerouslySetInnerHTML={{
            __html: searchQuery
              ? highlightText(plan.title, searchQuery)
              : plan.title,
          }}
        />
      </td>
      <td className="filename-cell">
        <span
          dangerouslySetInnerHTML={{
            __html: searchQuery
              ? highlightText(plan.filename, searchQuery)
              : plan.filename,
          }}
        />
      </td>
      <td className="project-cell">
        {plan.project ? (
          <span
            dangerouslySetInnerHTML={{
              __html: searchQuery
                ? highlightText(plan.project, searchQuery)
                : plan.project,
            }}
          />
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
